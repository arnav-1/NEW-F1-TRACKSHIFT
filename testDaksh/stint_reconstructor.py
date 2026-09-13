"""
TrackShift Stint Reconstructor (testDaksh/stint_reconstructor.py).

Extracts and cleans continuous stints from timing and telemetry data:
- Filters out-laps, in-laps, SC/VSC periods, and yellow flags.
- Decouples vehicle-mass fuel burn confounder (beta_fuel = 0.033 s/kg, Tier 3B prior).
- Normalizes stint age: a = (k - 1) / (N_stint - 1) in [0.0, 1.0].
- Diagnostic segmentation: Phase 1 (a < 0.20), Phase 2 (0.20 <= a <= 0.80), Phase 3 (a > 0.80).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("testDaksh.stint_reconstructor")


class StintReconstructor:
    """
    Reconstructs clean, fuel-corrected stints from raw lap records.
    """

    def __init__(
        self,
        beta_fuel: float = 0.033,
        fuel_burn_per_lap_kg: float = 1.60,
        max_traffic_delta_s: float = 2.50,
        min_stint_laps: int = 5,
    ):
        self.beta_fuel = beta_fuel
        self.fuel_burn_per_lap = fuel_burn_per_lap_kg
        self.max_traffic_delta = max_traffic_delta_s
        self.min_stint_laps = min_stint_laps

    def clean_and_segment_stints(
        self,
        laps_df: pd.DataFrame,
        is_race: bool = False,
        initial_fuel_kg: Optional[float] = None,
    ) -> List[pd.DataFrame]:
        """
        Takes raw lap dataframe, removes non-flying laps, applies fuel correction,
        and computes normalized stint age.
        """
        if laps_df.empty:
            return []

        df = laps_df.copy()

        # Standardize column naming
        col_map = {
            "LapNumber": "lap_number",
            "LapTime": "lap_time",
            "Compound": "compound",
            "Stint": "stint",
            "Driver": "driver",
            "TrackStatus": "track_status",
            "PitInTime": "pit_in_time",
            "PitOutTime": "pit_out_time",
        }
        for old_c, new_c in col_map.items():
            if old_c in df.columns and new_c not in df.columns:
                df[new_c] = df[old_c]

        # 1. Basic filtering of missing lap times
        if "lap_time_s" not in df.columns:
            if "lap_time" in df.columns and pd.api.types.is_timedelta64_dtype(df["lap_time"]):
                df["lap_time_s"] = df["lap_time"].dt.total_seconds()
            else:
                df["lap_time_s"] = pd.to_numeric(df.get("lap_time", np.nan), errors="coerce")

        df = df[df["lap_time_s"].notna() & (df["lap_time_s"] > 50.0)].copy()

        # 2. Filter in-laps and out-laps
        if "pit_out_time" in df.columns:
            df = df[df["pit_out_time"].isna()].copy()
        if "pit_in_time" in df.columns:
            df = df[df["pit_in_time"].isna()].copy()

        # 3. Filter yellow / SC / VSC flags
        if "track_status" in df.columns:
            df = df[df["track_status"].astype(str).str.strip() == "1"].copy()

        if "compound" in df.columns:
            df["compound"] = df["compound"].astype(str).str.upper()
            df = df[df["compound"].isin(["SOFT", "MEDIUM", "HARD"])].copy()

        if df.empty:
            return []

        # Determine fuel parameters
        start_fuel = initial_fuel_kg if initial_fuel_kg is not None else (105.0 if is_race else 40.0)

        clean_stints = []
        group_cols = ["driver", "stint"] if "stint" in df.columns and "driver" in df.columns else ["driver"]

        for _, s_df in df.groupby(group_cols):
            s_df = s_df.sort_values("lap_number").copy()
            if len(s_df) < self.min_stint_laps:
                continue

            # Base pace: minimum of first 3 valid flying laps
            n_check = min(3, len(s_df))
            base_pace = float(s_df["lap_time_s"].iloc[:n_check].min())

            # Filter traffic outliers (> max_traffic_delta off base pace)
            clean_mask = (s_df["lap_time_s"] - base_pace) <= self.max_traffic_delta
            s_clean = s_df[clean_mask].copy()

            if len(s_clean) < self.min_stint_laps:
                continue

            n_laps = len(s_clean)
            s_clean["stint_length"] = n_laps
            s_clean["stint_lap_idx"] = np.arange(n_laps)
            s_clean["base_pace"] = base_pace

            # Normalized stint age a in [0.0, 1.0]
            if n_laps > 1:
                s_clean["normalized_age"] = s_clean["stint_lap_idx"] / (n_laps - 1.0)
            else:
                s_clean["normalized_age"] = 0.0

            # Diagnostic phase assignment
            s_clean["diagnostic_phase"] = pd.cut(
                s_clean["normalized_age"],
                bins=[-0.01, 0.20, 0.80, 1.01],
                labels=["PHASE_1", "PHASE_2", "PHASE_3"],
            )

            # Vehicle-mass fuel correction
            # delta_t_fuel = -beta_fuel * (m_start - m_current)
            fuel_burned = self.fuel_burn_per_lap * s_clean["stint_lap_idx"]
            fuel_correction_s = self.beta_fuel * fuel_burned
            s_clean["fuel_correction_s"] = fuel_correction_s

            # Inferred latent tyre degradation: D_obs = t_lap - base_pace + fuel_correction
            s_clean["degradation_obs_s"] = s_clean["lap_time_s"] - base_pace + fuel_correction_s

            clean_stints.append(s_clean)

        return clean_stints
