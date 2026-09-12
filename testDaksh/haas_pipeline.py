"""
testDaksh: Haas F1 Physical-to-Observational Tyre Degradation Pipeline.

Implements the multi-session (FP1 + FP2 + FP3) learning pipeline specifically
calibrated for the Haas F1 Team (Nico Hülkenberg).

Features:
1. 7-filter motorsport cleaning pipeline.
2. Observational confounder decoupling (Fuel burn 0.033 s/kg & track evolution).
3. State-space thermal ODE (T_tread, T_carc) and tri-mechanism wear integration (D(t)).
4. Dynamic grip degradation mapping: mu(t) -> Delta t_deg(t).
5. Explicit toggles for the 3 key engineering assumptions:
   - Assumption 1: Haas Aerodynamic Downforce Deficit (extra sliding angle).
   - Assumption 2: High-Fuel Mass Scaling on Sliding Power (m^2 energy penalty).
   - Assumption 3: Driver Pace Management / Lift-and-Coast (PLI).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score

from testDaksh.thermal_wear_model import (
    COMPOUND_PARAMS,
    CompoundThermalParameters,
    PhysicalThermalWearEngine,
    TyreThermalState,
    TyreWearState,
)

logger = logging.getLogger("testDaksh.haas_pipeline")


@dataclass
class StintPredictionResult:
    """Evaluation metrics for a single predicted race stint."""
    driver: str
    stint: int
    compound: str
    n_laps: int
    mae_s: float
    r_squared: float
    observed_slope_s_per_lap: float
    predicted_slope_s_per_lap: float
    slope_error_s_per_lap: float
    mean_predicted_tread_temp_c: float
    final_accumulated_damage_d: float
    laps_observed: np.ndarray
    pace_observed: np.ndarray
    pace_predicted: np.ndarray


@dataclass
class PipelineConfig:
    """Configurable assumption toggles for ablation testing."""
    enable_aero_deficit: bool = False       # Assumption 1: Haas lower downforce -> higher slip angle
    enable_fuel_mass_scaling: bool = False  # Assumption 2: (M_race / M_fp)^2 sliding power scaling
    enable_driver_management: bool = False  # Assumption 3: PLI < 1.0 lift-and-coast pace management
    haas_c_alpha_deficit: float = 0.88      # 12% lower cornering stiffness from downforce deficit
    nominal_fp_mass_kg: float = 835.0       # Chassis + driver + FP fuel (~35kg)
    empty_tank_mass_kg: float = 798.0       # FIA minimum weight


class HaasDegradationPipeline:
    """
    Physical-to-observational pipeline calibrated for Haas F1.
    """

    def __init__(
        self,
        config: Optional[PipelineConfig] = None,
        thermal_wear_engine: Optional[PhysicalThermalWearEngine] = None,
    ):
        self.config = config or PipelineConfig()
        self.engine = thermal_wear_engine or PhysicalThermalWearEngine()

    def clean_laps(self, laps_df: pd.DataFrame, min_stint_len: int = 3) -> pd.DataFrame:
        """
        Executes the 7 motorsport domain cleaning filters.
        """
        if laps_df.empty:
            return pd.DataFrame()

        df = laps_df.copy()

        # 1. Pit In / Out removal
        mask_not_pit = df["pit_in_time_s"].isna() & df["pit_out_time_s"].isna()

        # 2. Green Flag enforcement (TrackStatus == '1')
        mask_green = df["track_status"].astype(str).isin(["1", "1.0"])

        # 3. Timing Accuracy & Physical bounds (60s <= lap <= 180s)
        mask_accurate = df["is_accurate"].fillna(False) & (df["lap_time_s"] >= 60.0) & (df["lap_time_s"] <= 180.0)

        # 4. Track limits deletions
        mask_valid = ~df["deleted"].fillna(False)

        # 5. Scrub-in transient (tyre_life > 1)
        mask_warmup = df["tyre_life"] > 1.0

        # Combine base filters
        base_clean = df[mask_not_pit & mask_green & mask_accurate & mask_valid & mask_warmup].copy()

        if base_clean.empty:
            return pd.DataFrame()

        # 6. Pace outlier filter (> 2.5s above 5-lap rolling median)
        clean_stints = []
        for (drv, stint_no), st_group in base_clean.groupby(["driver", "stint"], sort=False):
            if len(st_group) < min_stint_len:
                continue
            st_sorted = st_group.sort_values("tyre_life").copy()
            rolling_med = st_sorted["lap_time_s"].rolling(window=5, min_periods=1, center=True).median()
            pace_delta = st_sorted["lap_time_s"] - rolling_med
            valid_pace = st_sorted[pace_delta <= 2.5].copy()

            # 7. Minimum Stint Length Threshold
            if len(valid_pace) >= min_stint_len:
                clean_stints.append(valid_pace)

        if not clean_stints:
            return pd.DataFrame()

        return pd.concat(clean_stints, ignore_index=True)

    def decouple_confounders(
        self,
        laps_df: pd.DataFrame,
        total_race_laps: int = 66,
        is_practice: bool = True,
    ) -> pd.DataFrame:
        """
        Subtracts fuel weight penalty and track evolution from raw lap times.
        """
        df = laps_df.copy()

        # Fuel burn: Practice starts ~35kg; Race starts 110kg
        initial_fuel = 35.0 if is_practice else 110.0
        fuel_burn_per_lap = initial_fuel / max(1, total_race_laps)
        df["remaining_fuel_kg"] = np.clip(initial_fuel - (df["tyre_life"] - 1.0) * fuel_burn_per_lap, 0.0, initial_fuel)
        df["fuel_time_penalty_s"] = 0.033 * df["remaining_fuel_kg"]

        # Track evolution saturation (1.5s max over weekend)
        session_laps = df["lap_number"].astype(float)
        df["track_evolution_s"] = 1.25 * (1.0 - np.exp(-session_laps / 120.0))

        # Fully corrected observational pace residual
        df["pace_corrected_s"] = df["lap_time_s"] - df["fuel_time_penalty_s"] + df["track_evolution_s"]

        return df

    def calibrate_compound_models(
        self,
        practice_cleaned_df: pd.DataFrame,
    ) -> Dict[str, Dict[str, float]]:
        """
        Learns baseline pace and degradation slope from combined FP1 + FP2 + FP3 laps.
        """
        compound_models = {}
        for comp, group in practice_cleaned_df.groupby("compound"):
            if len(group) < 4:
                continue

            t_laps = group["tyre_life"].to_numpy()
            y_pace = group["pace_corrected_s"].to_numpy()

            # Robust linear fit: y = base_pace + alpha * t
            poly = np.polyfit(t_laps, y_pace, deg=1)
            alpha = max(0.01, float(poly[0]))
            base_pace = float(poly[1])

            compound_models[str(comp).upper()] = {
                "base_pace_s": base_pace,
                "practice_alpha_s_per_lap": alpha,
                "sample_laps": len(group),
            }

        return compound_models

    def predict_and_evaluate_stint(
        self,
        race_stint_df: pd.DataFrame,
        practice_model: Dict[str, float],
        circuit_abrasiveness: float = 1.25,
        total_race_laps: int = 66,
    ) -> Optional[StintPredictionResult]:
        """
        Executes forward physical state-space simulation and evaluates against actual race stint.
        """
        if len(race_stint_df) < 4:
            return None

        comp_name = str(race_stint_df["compound"].iloc[0]).upper()
        comp_params = COMPOUND_PARAMS.get(comp_name, COMPOUND_PARAMS["MEDIUM"])
        driver = str(race_stint_df["driver"].iloc[0])
        stint_no = int(race_stint_df["stint"].iloc[0])

        t_obs = race_stint_df["tyre_life"].to_numpy()
        y_obs = race_stint_df["pace_corrected_s"].to_numpy()

        # Track microclimate
        mean_t_track = float(race_stint_df.get("track_temp_c", pd.Series(40.0)).mean())
        mean_t_air = float(race_stint_df.get("air_temp_c", pd.Series(26.0)).mean())

        # Forward Physical Simulation
        t_tread = mean_t_track + 10.0  # Initial scrubbed temperature
        t_carc = mean_t_track + 5.0
        d_accum = 0.0

        predicted_deg_deltas = []
        simulated_temps = []

        # Assumption 1: Haas Downforce Deficit factor
        aero_factor = self.config.haas_c_alpha_deficit if self.config.enable_aero_deficit else 1.0

        # Assumption 3: Driver Pace Management (PLI)
        # Hülkenberg in race middle stints manages tyres ~ 94% push
        push_level = 0.94 if (self.config.enable_driver_management and stint_no > 1) else 1.0

        for lap_idx, lap_age in enumerate(t_obs):
            # Instantaneous vehicle mass
            race_fuel_remaining = max(0.0, 110.0 * (1.0 - (float(race_stint_df["lap_number"].iloc[lap_idx]) - 1.0) / total_race_laps))
            current_mass = self.config.empty_tank_mass_kg + race_fuel_remaining

            # Assumption 2: High-Fuel Mass Scaling on Sliding Energy
            if self.config.enable_fuel_mass_scaling:
                mass_scaling = (current_mass / self.config.nominal_fp_mass_kg) ** 2
            else:
                mass_scaling = 1.0

            # Kinematics proxy (Barcelona average speed ~ 210 km/h, curvature ~ 0.012 m^-1)
            speed_kmh = 210.0
            curvature = 0.012
            a_lon = -0.8

            q_frict = self.engine.compute_frictional_power(
                speed_kmh=speed_kmh,
                curvature_m_inv=curvature,
                a_lon_ms2=a_lon,
                vehicle_mass_kg=current_mass,
                c_alpha_front=comp_params.c_alpha_front,
                aero_downforce_factor=aero_factor,
            )
            q_frict *= mass_scaling

            # Thermal ODE step
            thermal_state = self.engine.step_thermal_ode(
                t_tread_c=t_tread,
                t_carc_c=t_carc,
                q_frict_w=q_frict,
                speed_kmh=speed_kmh,
                t_track_c=mean_t_track,
                t_ambient_c=mean_t_air,
                dt_s=85.0,
            )
            t_tread = thermal_state.t_tread_c
            t_carc = thermal_state.t_carcass_c
            simulated_temps.append(t_tread)

            # Wear & Grip step
            wear_state = self.engine.compute_wear_step(
                q_frict_w=q_frict,
                t_tread_c=t_tread,
                current_damage_d=d_accum,
                compound_params=comp_params,
                push_level_factor=push_level,
                surface_abrasiveness=circuit_abrasiveness,
                dt_laps=1.0,
            )
            d_accum = wear_state.accumulated_d
            predicted_deg_deltas.append(wear_state.pace_delta_s)

        deg_array = np.array(predicted_deg_deltas)

        # Baseline pace alignment (align start of stint)
        base_offset = float(np.median(y_obs[:3] - deg_array[:3])) if len(y_obs) >= 3 else float(np.median(y_obs - deg_array))
        y_pred = base_offset + deg_array

        # Metrics
        mae = float(mean_absolute_error(y_obs, y_pred))
        try:
            r2 = float(r2_score(y_obs, y_pred))
        except Exception:
            r2 = 0.0

        obs_slope = float(np.polyfit(t_obs, y_obs, 1)[0])
        pred_slope = float(np.polyfit(t_obs, y_pred, 1)[0])
        slope_error = float(abs(pred_slope - obs_slope))

        return StintPredictionResult(
            driver=driver,
            stint=stint_no,
            compound=comp_name,
            n_laps=len(t_obs),
            mae_s=mae,
            r_squared=r2,
            observed_slope_s_per_lap=obs_slope,
            predicted_slope_s_per_lap=pred_slope,
            slope_error_s_per_lap=slope_error,
            mean_predicted_tread_temp_c=float(np.mean(simulated_temps)),
            final_accumulated_damage_d=float(d_accum),
            laps_observed=t_obs,
            pace_observed=y_obs,
            pace_predicted=y_pred,
        )
