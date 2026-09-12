"""
testDaksh: Sunday Actual Race Stint Reconstructor.

Reconstructs every actual race stint for each driver from Sunday Grand Prix sessions:
- Decouples fuel mass: Delta t_tyre,obs(k) = t_lap(k) - t_base + beta_fuel * (105 - m_fuel)
- Normalizes stint age: a = (lap - 1) / (N_stint - 1) in [0.0, 1.0]
- Applies domain filters: in-laps, out-laps, Safety Car, VSC, extreme traffic
- Extracts sector times (S1, S2, S3) for sector degradation fingerprinting
- Extracts apex telemetry (a_y, v) in high-lateral corners for non-circular grip validation
"""

from __future__ import annotations

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import logging
from typing import Dict, List, Optional, Tuple

import fastf1
import numpy as np
import pandas as pd

logger = logging.getLogger("post_race_validation.stint_reconstructor")
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] [StintReconstructor] %(message)s")

CACHE_DIR = Path(__file__).resolve().parents[2] / "core_model" / "data" / "cache" / "fastf1"
if not CACHE_DIR.exists():
    CACHE_DIR = Path(r"C:\Users\daksh\AppData\Local\Temp\fastf1")
CACHE_DIR.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(str(CACHE_DIR))


class StintReconstructor:
    """
    Reconstructs clean, fuel-corrected actual race stints from Sunday Grand Prix data.
    """

    def __init__(self, beta_fuel: float = 0.033, max_traffic_delta_s: float = 2.5):
        self.beta_fuel = beta_fuel
        self.max_traffic_delta_s = max_traffic_delta_s

    def reconstruct_race_stints(
        self,
        year: int,
        circuit: str,
        target_drivers: Optional[List[str]] = None,
        min_stint_laps: int = 5,
    ) -> List[pd.DataFrame]:
        """
        Loads Sunday race data and extracts clean reconstructed stints for analysis.
        """
        logger.info("Loading Sunday Race session for %d %s...", year, circuit)
        session = fastf1.get_session(year, circuit, "R")
        session.load(telemetry=False, weather=True)

        laps = session.laps.copy()
        total_race_laps = int(laps["LapNumber"].max())

        # Weather context
        mean_track_temp = float(session.weather_data["TrackTemp"].mean())
        mean_air_temp = float(session.weather_data["AirTemp"].mean())

        clean_stints = []

        if target_drivers is None:
            drivers = laps["Driver"].unique()
        else:
            drivers = target_drivers

        for drv in drivers:
            drv_laps = laps[(laps["Driver"] == drv) | (laps["DriverNumber"].astype(str) == str(drv))].sort_values("LapNumber").copy()
            if len(drv_laps) < min_stint_laps:
                continue

            stints = drv_laps["Stint"].unique()

            for s_idx in stints:
                s_df = drv_laps[drv_laps["Stint"] == s_idx].copy()
                if len(s_df) < min_stint_laps:
                    continue

                comp = str(s_df["Compound"].iloc[0]).upper()
                if comp not in ["SOFT", "MEDIUM", "HARD"]:
                    continue

                # 1. Filter Pit-In and Pit-Out laps
                s_df = s_df[s_df["PitOutTime"].isna()].copy()
                s_df = s_df[s_df["PitInTime"].isna()].copy()

                # 2. Filter Yellow / SC / VSC (TrackStatus != '1')
                if "TrackStatus" in s_df.columns:
                    s_df = s_df[s_df["TrackStatus"].astype(str) == "1"].copy()

                # 3. Filter valid lap times
                s_df = s_df[s_df["LapTime"].notna()].copy()
                s_df["lap_time_s"] = s_df["LapTime"].dt.total_seconds()

                if len(s_df) < min_stint_laps:
                    continue

                # Base pace: best lap in first 4 laps of stint
                base_pace = s_df["lap_time_s"].iloc[:min(4, len(s_df))].min()

                # 4. Traffic filter
                s_clean = s_df[(s_df["lap_time_s"] - base_pace) < self.max_traffic_delta_s].copy()
                if len(s_clean) < min_stint_laps:
                    continue

                n_laps = len(s_clean)
                s_clean["driver"] = drv
                s_clean["team"] = str(s_clean["Team"].iloc[0]) if "Team" in s_clean else "Unknown"
                s_clean["circuit"] = circuit
                s_clean["compound"] = comp
                s_clean["stint_number"] = int(s_idx)
                s_clean["stint_length"] = n_laps
                s_clean["base_pace"] = base_pace
                s_clean["track_temp_c"] = mean_track_temp
                s_clean["air_temp_c"] = mean_air_temp

                # Normalized stint age a in [0.0, 1.0]
                s_clean["stint_lap_idx"] = np.arange(n_laps)
                if n_laps > 1:
                    s_clean["normalized_age"] = s_clean["stint_lap_idx"] / (n_laps - 1.0)
                else:
                    s_clean["normalized_age"] = 0.0

                # Fuel mass calculation (105 kg full tank, linear burn over race distance)
                fuel_burn_rate = 105.0 / max(50, total_race_laps)
                lap_nos = s_clean["LapNumber"].values
                fuel_rem = np.maximum(5.0, 105.0 - fuel_burn_rate * lap_nos)
                
                # IN-STINT FUEL BURN NORMALIZATION:
                # Base pace is measured on fresh tyres at the start of THIS stint.
                # Therefore, fuel correction within the stint must be relative to the stint start lap
                # to prevent accumulating whole-race fuel burn as a multi-second artificial DC offset.
                fuel_burned_in_stint = fuel_burn_rate * s_clean["stint_lap_idx"].values
                fuel_correction = self.beta_fuel * fuel_burned_in_stint

                s_clean["fuel_mass_remaining"] = fuel_rem
                s_clean["fuel_correction_s"] = fuel_correction

                # Isolated tyre degradation target: delta t_tyre,obs
                # Strictly starts at ~0.0s on fresh tyres at stint start
                s_clean["degradation_obs"] = s_clean["lap_time_s"] - base_pace + fuel_correction

                # Micro-sector extraction (S1, S2, S3 in seconds)
                if "Sector1Time" in s_clean and s_clean["Sector1Time"].notna().any():
                    s_clean["s1_s"] = s_clean["Sector1Time"].dt.total_seconds()
                    s_clean["s2_s"] = s_clean["Sector2Time"].dt.total_seconds()
                    s_clean["s3_s"] = s_clean["Sector3Time"].dt.total_seconds()
                else:
                    s_clean["s1_s"] = np.nan
                    s_clean["s2_s"] = np.nan
                    s_clean["s3_s"] = np.nan

                clean_stints.append(s_clean)

        logger.info(
            "Reconstructed %d clean race stints across %d drivers in %s %d.",
            len(clean_stints),
            len(set(x["driver"].iloc[0] for x in clean_stints)),
            circuit,
            year,
        )
        return clean_stints


if __name__ == "__main__":
    reconstructor = StintReconstructor()
    # Test on Spain 2024 (Barcelona) for Haas & Mercedes drivers
    stints = reconstruct_stints = reconstructor.reconstruct_race_stints(
        2024, "Spain", target_drivers=["44", "63", "27", "20"]  # Hamilton, Russell, Hülkenberg, Magnussen
    )
    print(f"\nExtracted {len(stints)} driver stints:")
    for s in stints:
        print(f"  Driver {s['driver'].iloc[0]} ({s['team'].iloc[0]}): Stint {s['stint_number'].iloc[0]} | Compound {s['compound'].iloc[0]} | {s['stint_length'].iloc[0]} laps | Obs Delta Pace: {s['degradation_obs'].max():.2f}s")
