"""
testDaksh: Non-Circular Telemetric Lateral Grip Validation.

Validates the physical grip degradation model against independent vehicle cornering telemetry:
- Mid-corner steady-state apex lateral acceleration: a_y / g
- Corrected for dynamic aerodynamic downforce: Gamma_aero(v) = 1 + 0.5 * rho * C_L * A * v^2 / (m * g)
- Completely independent of lap times (eliminates circular validation).
"""

from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import logging
from typing import Any, Dict, List, Optional, Tuple

import fastf1
import numpy as np
import pandas as pd

logger = logging.getLogger("post_race_validation.telemetric_grip")
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] [GripValidator] %(message)s")

CACHE_DIR = Path(__file__).resolve().parents[2] / "core_model" / "data" / "cache" / "fastf1"
if not CACHE_DIR.exists():
    CACHE_DIR = Path(r"C:\Users\daksh\AppData\Local\Temp\fastf1")
CACHE_DIR.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(str(CACHE_DIR))


class TelemetricGripValidator:
    """
    Validates mu_eff(T, D) against independent corner apex lateral acceleration telemetry.
    """

    def __init__(self, c_l_a: float = 3.8, air_density: float = 1.184):
        self.c_l_a = c_l_a
        self.air_density = air_density

    def extract_apex_lateral_grip(
        self,
        year: int,
        circuit: str,
        driver: str,
        corner_dist_window_m: Tuple[float, float] = (1150.0, 1450.0),  # Barcelona Turn 3
        stint_number: int = 2,
    ) -> pd.DataFrame:
        """
        Extracts mid-corner apex lateral acceleration (a_y) across each lap of a stint.
        Barcelona Turn 3 (Renault Carousel) is a long-radius, high-speed steady-state right hander (4.0g).
        """
        logger.info("Extracting corner apex telemetry for Driver %s in %d %s Stint %d...", driver, year, circuit, stint_number)
        session = fastf1.get_session(year, circuit, "R")
        session.load(telemetry=True, weather=False)

        drv_laps = session.laps.pick_drivers(driver)
        stint_laps = drv_laps[drv_laps["Stint"] == stint_number].copy()
        # Filter pit laps
        stint_laps = stint_laps[stint_laps["PitOutTime"].isna() & stint_laps["PitInTime"].isna()]
        stint_laps = stint_laps[stint_laps["LapTime"].notna()].sort_values("LapNumber")

        apex_records = []
        c_start, c_end = corner_dist_window_m

        for _, row in stint_laps.iterrows():
            lap_no = int(row["LapNumber"])
            try:
                tel = row.get_telemetry()
                if tel is None or len(tel) == 0:
                    continue

                # Filter within corner spatial window
                c_tel = tel[(tel["Distance"] >= c_start) & (tel["Distance"] <= c_end)]
                if len(c_tel) < 5:
                    continue

                # Apex is minimum speed in corner
                apex_pt = c_tel.loc[c_tel["Speed"].idxmin()]
                v_apex_ms = float(apex_pt["Speed"] / 3.6)

                # Estimate lateral acceleration from speed and curvature or gyro if present
                # FastF1 telemetry provides Speed, X, Y
                dx = np.gradient(c_tel["X"].values)
                dy = np.gradient(c_tel["Y"].values)
                ddx = np.gradient(dx)
                ddy = np.gradient(dy)
                denom = (dx ** 2 + dy ** 2) ** 1.5
                denom[denom == 0] = 1e-6
                curvature = np.abs(dx * ddy - dy * ddx) / denom
                idx_mid = len(c_tel) // 2
                curv_apex = float(np.median(curvature[max(0, idx_mid - 2):min(len(curvature), idx_mid + 3)]))
                curv_apex = max(0.0020, min(0.0050, curv_apex))

                a_y_ms2 = (v_apex_ms ** 2) * curv_apex
                a_y_g = a_y_ms2 / 9.81

                # Fuel mass estimate
                fuel_rem = max(5.0, 105.0 - (105.0 / 66.0) * lap_no)
                veh_mass = 798.0 + fuel_rem

                # Aero downforce factor
                downforce_n = 0.5 * self.air_density * self.c_l_a * (v_apex_ms ** 2)
                f_z_total = veh_mass * 9.81 + downforce_n
                gamma_aero = f_z_total / (veh_mass * 9.81)

                # Measured friction capacity: mu_apex = (m * a_y) / F_z = (a_y / g) / gamma_aero
                mu_measured = a_y_g / max(1.0, gamma_aero)

                apex_records.append({
                    "lap_number": lap_no,
                    "v_apex_kmh": float(apex_pt["Speed"]),
                    "a_y_g": a_y_g,
                    "gamma_aero": gamma_aero,
                    "mu_measured": mu_measured,
                })
            except Exception as e:
                continue

        df_apex = pd.DataFrame(apex_records)
        if len(df_apex) > 3:
            # Normalize to fresh tyre baseline (first 2 laps)
            base_mu = df_apex["mu_measured"].iloc[:2].mean()
            df_apex["normalized_telemetry_mu"] = df_apex["mu_measured"] / base_mu
            logger.info("Successfully extracted %d apex telemetry points. Peak a_y = %.2f g.", len(df_apex), df_apex["a_y_g"].max())
        return df_apex

    def compute_grip_validation_metrics(
        self,
        predicted_mu: np.ndarray,
        measured_mu: np.ndarray,
    ) -> Dict[str, float]:
        """
        Computes non-circular telemetric grip validation metrics:
        - Pearson correlation coefficient (r)
        - Magnitude error: MAE_mu = mean(|predicted_mu - measured_mu|)
        - Calibration slope (alpha_1) and offset (alpha_0) via OLS: measured_mu = alpha_0 + alpha_1 * predicted_mu
        - Lin's Concordance Correlation Coefficient (CCC)
        """
        p = np.array(predicted_mu)
        m = np.array(measured_mu)
        n = min(len(p), len(m))
        p = p[:n]
        m = m[:n]

        if n < 4:
            return {"r": 0.0, "mae_mu": 0.0, "calib_slope": 1.0, "calib_intercept": 0.0, "ccc": 0.0}

        # Pearson r
        corr = float(np.corrcoef(p, m)[0, 1])

        # Magnitude MAE
        mae_mu = float(np.mean(np.abs(p - m)))

        # Calibration slope and intercept
        poly = np.polyfit(p, m, deg=1)  # [slope, intercept]
        slope = float(poly[0])
        intercept = float(poly[1])

        # Lin's Concordance Correlation Coefficient (CCC)
        mean_p, mean_m = np.mean(p), np.mean(m)
        var_p, var_m = np.var(p), np.var(m)
        cov = np.cov(p, m)[0, 1]
        ccc = float((2 * cov) / (var_p + var_m + (mean_p - mean_m) ** 2)) if (var_p + var_m + (mean_p - mean_m) ** 2) > 0 else 0.0

        return {
            "r": corr,
            "mae_mu": mae_mu,
            "calib_slope": slope,
            "calib_intercept": intercept,
            "ccc": ccc,
            "points_evaluated": n,
        }


if __name__ == "__main__":
    validator = TelemetricGripValidator()
    # Test on Hamilton (44) Barcelona Turn 3 in Stint 2 (Medium)
    res = validator.extract_apex_lateral_grip(2024, "Spain", "44", corner_dist_window_m=(1150.0, 1450.0), stint_number=2)
    if not res.empty:
        print("\nTELEMETRIC APEX GRIP DEGRADATION IN BARCELONA TURN 3 (HAMILTON STINT 2):")
        print(res[["lap_number", "v_apex_kmh", "a_y_g", "gamma_aero", "normalized_telemetry_mu"]].head(10))
