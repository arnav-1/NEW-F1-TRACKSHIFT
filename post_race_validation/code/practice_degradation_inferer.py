"""
testDaksh: Practice Degradation Inference Engine.

Extracts latent tyre degradation parameters (beta_1, beta_2) from Friday practice long runs
(FP1/FP2/FP3) after fuel confounder correction, calibrates the physical wear model (w_p1, w_p2),
and FREEZES the model parameters before Sunday race day.

Zero data leakage: Sunday race observations are never used for calibration.
"""

from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import json
import logging
from typing import Dict, List, Optional, Tuple, Any

import fastf1
import numpy as np
import pandas as pd

from core_model.code.thermal_wear_model import COMPOUND_PARAMS, CompoundThermalParameters, PhysicalThermalWearEngine

logger = logging.getLogger("post_race_validation.practice_inferer")
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] [PracticeInferer] %(message)s")

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = WORKSPACE_ROOT / "core_model" / "data" / "cache" / "fastf1"
if not CACHE_DIR.exists():
    CACHE_DIR = Path(r"C:\Users\daksh\AppData\Local\Temp\fastf1")
CACHE_DIR.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(str(CACHE_DIR))

DATA_DIR = WORKSPACE_ROOT / "core_model" / "data" / "frozen_calibrations"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class PracticeDegradationInferer:
    """
    Infers latent degradation rates from practice long runs and calibrates the physical model.
    """

    def __init__(self, beta_fuel: float = 0.033, fuel_burn_per_lap: float = 1.6):
        self.beta_fuel = beta_fuel
        self.fuel_burn_per_lap = fuel_burn_per_lap
        self.engine = PhysicalThermalWearEngine()

    def load_practice_session(self, year: int, circuit: str, session_name: str = "FP2") -> pd.DataFrame:
        """
        Loads clean practice session laps using FastF1.
        """
        logger.info("Loading %d %s [%s] for practice degradation inference...", year, circuit, session_name)
        session = fastf1.get_session(year, circuit, session_name)
        session.load(telemetry=False, weather=True)

        laps = session.laps.pick_wo_box().copy()
        laps = laps[laps["LapTime"].notna()].copy()
        laps["lap_time_s"] = laps["LapTime"].dt.total_seconds()
        laps["compound"] = laps["Compound"].str.upper().fillna("UNKNOWN")
        laps["stint"] = laps["Stint"].fillna(1).astype(int)
        laps["tyre_age"] = laps["TyreLife"].fillna(1.0).astype(float)
        laps["lap_number"] = laps["LapNumber"].astype(int)
        laps["driver"] = laps["Driver"].astype(str)
        laps["circuit"] = circuit
        laps["air_temp_c"] = session.weather_data["AirTemp"].mean()
        laps["track_temp_c"] = session.weather_data["TrackTemp"].mean()

        return laps

    def extract_clean_practice_stints(
        self,
        laps_df: pd.DataFrame,
        min_flying_laps: int = 5,
        max_delta_outlier_s: float = 2.5,
    ) -> List[pd.DataFrame]:
        """
        Filters practice laps into valid, representative long runs.
        Discards installation laps, short runs (quali sims), and extreme traffic laps.
        """
        clean_stints = []
        grouped = laps_df.groupby(["driver", "stint"])

        for (drv, stint_no), s_df in grouped:
            s_df = s_df.sort_values("lap_number").copy()
            if len(s_df) < min_flying_laps:
                continue

            comp = s_df["compound"].iloc[0]
            if comp not in ["SOFT", "MEDIUM", "HARD"]:
                continue

            # Base pace: best lap in first 3 laps
            base_pace = s_df["lap_time_s"].iloc[:3].min()

            # Filter traffic outliers (> 2.5s off base pace)
            clean_mask = (s_df["lap_time_s"] - base_pace) < max_delta_outlier_s
            s_clean = s_df[clean_mask].copy()

            if len(s_clean) < min_flying_laps:
                continue

            s_clean["base_pace"] = base_pace
            n_laps = len(s_clean)
            s_clean["stint_length"] = n_laps

            # Normalized stint age a in [0.0, 1.0]
            s_clean["stint_lap_idx"] = np.arange(n_laps)
            if n_laps > 1:
                s_clean["normalized_age"] = s_clean["stint_lap_idx"] / (n_laps - 1.0)
            else:
                s_clean["normalized_age"] = 0.0

            # Fuel mass confounder correction (practice long runs start ~40 kg, burning ~1.6 kg/lap)
            fuel_rem = np.maximum(5.0, 40.0 - self.fuel_burn_per_lap * s_clean["stint_lap_idx"])
            fuel_burned = 40.0 - fuel_rem
            fuel_correction = self.beta_fuel * fuel_burned

            # Inferred latent tyre degradation target
            # Note: Track evolution is unmodelled and absorbed into residual epsilon(k)
            s_clean["degradation_obs"] = s_clean["lap_time_s"] - base_pace + fuel_correction
            clean_stints.append(s_clean)

        logger.info("Extracted %d valid practice long-run stints across all drivers.", len(clean_stints))
        return clean_stints

    def infer_compound_degradation_parameters(
        self,
        clean_stints: List[pd.DataFrame],
    ) -> Dict[str, Dict[str, float]]:
        """
        Estimates latent degradation rate (beta_1) and non-linear curvature (beta_2)
        for each compound using orthogonal quadratic projection on normalized stint age a:
            D_obs(a) = beta_0 + beta_1 * a + beta_2 * a^2
        """
        compound_fits: Dict[str, List[Dict[str, float]]] = {"SOFT": [], "MEDIUM": [], "HARD": []}

        for s_df in clean_stints:
            comp = s_df["compound"].iloc[0]
            if comp not in compound_fits:
                continue

            a = s_df["normalized_age"].values
            d = s_df["degradation_obs"].values
            n = len(a)

            if n < 4:
                continue

            # Fit D(a) = beta_0 + beta_1 * a + beta_2 * a^2
            poly_coefs = np.polyfit(a, d, deg=2)  # [beta_2, beta_1, beta_0]
            beta_2 = float(poly_coefs[0])
            beta_1 = float(poly_coefs[1])
            beta_0 = float(poly_coefs[2])

            # Convert to per-lap degradation rate: beta_1_lap = beta_1 / (n - 1)
            beta_1_per_lap = beta_1 / max(1.0, float(n - 1))

            compound_fits[comp].append({
                "driver": s_df["driver"].iloc[0],
                "stint_length": n,
                "beta_0": beta_0,
                "beta_1": beta_1,
                "beta_2": beta_2,
                "beta_1_per_lap": beta_1_per_lap,
                "air_temp_c": float(s_df["air_temp_c"].iloc[0]),
                "track_temp_c": float(s_df["track_temp_c"].iloc[0]),
            })

        # Aggregate compound summary
        inferred_parameters = {}
        for comp, fits in compound_fits.items():
            if not fits:
                # Fallback to physical compound prior if compound was not run in long runs
                prior = COMPOUND_PARAMS.get(comp, COMPOUND_PARAMS["MEDIUM"])
                inferred_parameters[comp] = {
                    "beta_0": 0.0,
                    "beta_1": 1.20,
                    "beta_2": 0.35,
                    "beta_1_per_lap": 0.075 if comp == "MEDIUM" else (0.110 if comp == "SOFT" else 0.050),
                    "stints_analyzed": 0,
                    "sample_variance": 0.0,
                    "source": "Physical Compound Prior (Unobserved in FP long runs)",
                }
                continue

            b0_vals = [x["beta_0"] for x in fits]
            b1_vals = [x["beta_1"] for x in fits]
            b2_vals = [x["beta_2"] for x in fits]
            b1_lap_vals = [x["beta_1_per_lap"] for x in fits]

            inferred_parameters[comp] = {
                "beta_0": float(np.median(b0_vals)),
                "beta_1": float(np.median(b1_vals)),
                "beta_2": float(np.median(b2_vals)),
                "beta_1_per_lap": float(np.median(b1_lap_vals)),
                "stints_analyzed": len(fits),
                "sample_variance": float(np.var(b1_lap_vals)),
                "source": "Inferred from Practice Long Runs (FP2)",
            }
            logger.info(
                "Compound %s Inferred: beta_1=%.3f s/stint (%.4f s/lap) | beta_2=%.3f (from %d stints)",
                comp,
                inferred_parameters[comp]["beta_1"],
                inferred_parameters[comp]["beta_1_per_lap"],
                inferred_parameters[comp]["beta_2"],
                len(fits),
            )

        return inferred_parameters

    def calibrate_and_freeze_physical_model(
        self,
        inferred_params: Dict[str, Dict[str, float]],
        circuit: str,
        output_path: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """
        Calibrates the physical wear parameters (w_p1, w_p2) in the thermal-wear ODE
        so that simulated wear matches the inferred practice degradation rate beta_1_per_lap.
        Freezes parameters into JSON before Sunday race start.
        """
        frozen_calibrations = {
            "circuit": circuit,
            "calibration_status": "FROZEN_PRE_RACE",
            "source_provenance": "FP2 Practice Long-Run Latent Parameter Estimation",
            "compounds": {},
        }

        for comp, p in inferred_params.items():
            comp_param = COMPOUND_PARAMS.get(comp, COMPOUND_PARAMS["MEDIUM"])
            target_deg_rate = p["beta_1_per_lap"]

            # Calibrate w_p1 so that base mechanical wear generates target_deg_rate at nominal Q_frict
            # Analytical relation: Delta t_pred = k_pace_loss * lambda_wear * D
            calibrated_w_p1 = max(0.005, target_deg_rate / (self.engine.k_pace_loss * self.engine.lambda_wear))

            frozen_calibrations["compounds"][comp] = {
                "inferred_beta_0": p["beta_0"],
                "inferred_beta_1": p["beta_1"],
                "inferred_beta_2": p["beta_2"],
                "inferred_beta_1_per_lap": p["beta_1_per_lap"],
                "stints_analyzed": p["stints_analyzed"],
                "calibrated_w_p1": float(calibrated_w_p1),
                "calibrated_w_p2": float(self.engine.wp2),
                "t_opt": float(comp_param.t_opt),
                "t_window": float(comp_param.t_window),
                "source": p["source"],
            }

        if output_path is None:
            output_path = DATA_DIR / f"frozen_practice_calibration_{circuit.lower()}.json"

        with open(output_path, "w") as f:
            json.dump(frozen_calibrations, f, indent=2)

        logger.info("Physical wear parameters FROZEN successfully to: %s", output_path)
        return frozen_calibrations


if __name__ == "__main__":
    inferer = PracticeDegradationInferer()
    # Test on Barcelona 2024 FP2
    fp2_laps = inferer.load_practice_session(2024, "Spain", "FP2")
    stints = inferer.extract_clean_practice_stints(fp2_laps)
    params = inferer.infer_compound_degradation_parameters(stints)
    frozen = inferer.calibrate_and_freeze_physical_model(params, "Spain")
    print("\nFROZEN PRE-RACE CALIBRATION SUMMARY:")
    for c, v in frozen["compounds"].items():
        print(f"  [{c}]: Inferred Rate = {v['inferred_beta_1_per_lap']:.4f} s/lap | w_p1 = {v['calibrated_w_p1']:.5f} ({v['source']})")
