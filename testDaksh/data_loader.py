"""
testDaksh Data Ingestion & Preprocessing for Haas F1 (Nico Hülkenberg).

Ingests FP1, FP2, FP3, and Race sessions for:
1. 2024 Spanish Grand Prix (Circuit de Barcelona-Catalunya)
2. 2024 British Grand Prix (Silverstone Circuit)

Uses FastF1 and OpenF1 APIs with disk caching in testDaksh/data/.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import requests

try:
    import fastf1
    FASTF1_AVAILABLE = True
except ImportError:
    FASTF1_AVAILABLE = False

logger = logging.getLogger("testDaksh.data_loader")
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] [DataLoader] %(message)s")

CACHE_DIR = Path("testDaksh/data/cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class SessionLaps:
    """Standardized container for a session's lap and weather data."""
    year: int
    circuit: str
    session_type: str
    laps_df: pd.DataFrame
    weather_df: pd.DataFrame


class HaasDataLoader:
    """
    Ingests and normalizes telemetry and lap timing for Haas F1 drivers (HUL #27, BEA #50).
    """

    def __init__(self, cache_dir: Path = CACHE_DIR):
        self.cache_dir = cache_dir
        if FASTF1_AVAILABLE:
            fastf1_cache = self.cache_dir / "fastf1"
            fastf1_cache.mkdir(parents=True, exist_ok=True)
            fastf1.Cache.enable_cache(str(fastf1_cache))

    def load_session(
        self,
        year: int,
        circuit: str,
        session_type: str,
        driver_filter: Optional[List[str]] = None,
    ) -> SessionLaps:
        """
        Loads session laps and weather. Attempts FastF1 first, falls back to OpenF1.
        """
        if driver_filter is None:
            driver_filter = ["HUL", "BEA", "MAG"]

        cache_file = self.cache_dir / f"{year}_{circuit.lower()}_{session_type.upper()}_haas.parquet"
        weather_cache = self.cache_dir / f"{year}_{circuit.lower()}_{session_type.upper()}_weather.parquet"

        if cache_file.exists() and weather_cache.exists():
            logger.info("Loading cached %s %s [%s]...", year, circuit, session_type)
            laps_df = pd.read_parquet(cache_file)
            weather_df = pd.read_parquet(weather_cache)
            return SessionLaps(year, circuit, session_type, laps_df, weather_df)

        logger.info("Fetching %s %s [%s] via FastF1...", year, circuit, session_type)
        try:
            laps_df, weather_df = self._load_via_fastf1(year, circuit, session_type, driver_filter)
        except Exception as exc:
            logger.warning("FastF1 load failed (%s). Falling back to OpenF1...", exc)
            laps_df, weather_df = self._load_via_openf1(year, circuit, session_type, driver_filter)

        # Cache to disk
        laps_df.to_parquet(cache_file, index=False)
        weather_df.to_parquet(weather_cache, index=False)
        logger.info("Cached %d laps for Haas in %s %s [%s].", len(laps_df), year, circuit, session_type)

        return SessionLaps(year, circuit, session_type, laps_df, weather_df)

    def _load_via_fastf1(
        self,
        year: int,
        circuit: str,
        session_type: str,
        driver_filter: List[str],
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Loads and standardizes laps using FastF1."""
        sess = fastf1.get_session(year, circuit, session_type)
        sess.load(telemetry=False, weather=True, messages=False)

        laps = sess.laps
        haas_laps = laps[laps["Driver"].isin(driver_filter)].copy()

        # Clean column mapping
        haas_laps["lap_number"] = haas_laps["LapNumber"].astype(int)
        haas_laps["driver"] = haas_laps["Driver"].astype(str)
        haas_laps["team"] = "Haas F1 Team"
        haas_laps["stint"] = haas_laps["Stint"].fillna(1).astype(int)
        haas_laps["compound"] = haas_laps["Compound"].str.upper().fillna("UNKNOWN")
        haas_laps["tyre_life"] = haas_laps["TyreLife"].astype(float)
        haas_laps["lap_time_s"] = haas_laps["LapTime"].dt.total_seconds()
        haas_laps["sector1_time_s"] = haas_laps["Sector1Time"].dt.total_seconds()
        haas_laps["sector2_time_s"] = haas_laps["Sector2Time"].dt.total_seconds()
        haas_laps["sector3_time_s"] = haas_laps["Sector3Time"].dt.total_seconds()
        haas_laps["track_status"] = haas_laps["TrackStatus"].astype(str)
        haas_laps["is_accurate"] = haas_laps["IsAccurate"].fillna(False).astype(bool)
        haas_laps["deleted"] = haas_laps["Deleted"].fillna(False).astype(bool)
        haas_laps["pit_in_time_s"] = haas_laps["PitInTime"].dt.total_seconds()
        haas_laps["pit_out_time_s"] = haas_laps["PitOutTime"].dt.total_seconds()

        # Weather mapping
        weather = sess.weather_data.copy()
        weather_df = pd.DataFrame({
            "time_s": weather["Time"].dt.total_seconds() if "Time" in weather else np.arange(len(weather)) * 60.0,
            "air_temp_c": weather["AirTemp"].astype(float) if "AirTemp" in weather else 25.0,
            "track_temp_c": weather["TrackTemp"].astype(float) if "TrackTemp" in weather else 38.0,
            "humidity": weather["Humidity"].astype(float) if "Humidity" in weather else 50.0,
            "wind_speed": weather["WindSpeed"].astype(float) if "WindSpeed" in weather else 2.0,
        })

        return haas_laps, weather_df

    def _load_via_openf1(
        self,
        year: int,
        circuit: str,
        session_type: str,
        driver_filter: List[str],
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Loads and standardizes laps using OpenF1 REST API."""
        # Query session key
        circuit_term = "Silverstone" if "silverstone" in circuit.lower() else "Spain"
        sess_url = f"https://api.openf1.org/v1/sessions?year={year}&country_name={circuit_term}"
        if "silverstone" in circuit.lower():
            sess_url = f"https://api.openf1.org/v1/sessions?year={year}&circuit_short_name=Silverstone"

        r = requests.get(sess_url, timeout=15)
        sessions = r.json()
        target_sname = "Practice 1" if "1" in session_type else ("Practice 2" if "2" in session_type else ("Practice 3" if "3" in session_type else "Race"))
        matching = [s for s in sessions if target_sname.lower() in s["session_name"].lower()]
        if not matching:
            raise ValueError(f"Could not find OpenF1 session for {year} {circuit} {session_type}")
        skey = matching[0]["session_key"]

        # Driver numbers: 27 (HUL), 50 (BEA), 20 (MAG)
        records = []
        for dnum, dcode in [(27, "HUL"), (50, "BEA"), (20, "MAG")]:
            if dcode not in driver_filter:
                continue
            lap_url = f"https://api.openf1.org/v1/laps?session_key={skey}&driver_number={dnum}"
            l_resp = requests.get(lap_url, timeout=20)
            for lap in l_resp.json():
                if lap.get("lap_duration") is not None:
                    records.append({
                        "lap_number": lap.get("lap_number"),
                        "driver": dcode,
                        "team": "Haas F1 Team",
                        "stint": lap.get("stint_number", 1),
                        "compound": "MEDIUM",  # default if stint missing
                        "tyre_life": float(lap.get("lap_number", 1)),
                        "lap_time_s": float(lap.get("lap_duration", 80.0)),
                        "sector1_time_s": float(lap.get("duration_sector_1") or 25.0),
                        "sector2_time_s": float(lap.get("duration_sector_2") or 30.0),
                        "sector3_time_s": float(lap.get("duration_sector_3") or 25.0),
                        "track_status": "1",
                        "is_accurate": not bool(lap.get("is_pit_out_lap")),
                        "deleted": False,
                        "pit_in_time_s": np.nan,
                        "pit_out_time_s": 0.0 if lap.get("is_pit_out_lap") else np.nan,
                    })

        laps_df = pd.DataFrame(records)

        # Weather query
        w_url = f"https://api.openf1.org/v1/weather?session_key={skey}"
        w_resp = requests.get(w_url, timeout=15)
        w_data = w_resp.json()
        weather_df = pd.DataFrame([{
            "time_s": idx * 60.0,
            "air_temp_c": float(w.get("air_temperature", 24.0)),
            "track_temp_c": float(w.get("track_temperature", 38.0)),
            "humidity": float(w.get("humidity", 50.0)),
            "wind_speed": float(w.get("wind_speed", 2.5)),
        } for idx, w in enumerate(w_data)])

        return laps_df, weather_df
