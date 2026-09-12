"""
TrackShift Data Ingestion Pipeline (DIP).

This module manages multi-source ingestion of Formula 1 telemetry, lap timing,
stint metadata, and microclimatic weather from FastF1, OpenF1, and Open-Meteo.
It enforces schema normalization, unit consistency, and disk-backed caching
for offline execution and reproducible analytics.

References:
    - West, E., & Limebeer, D. J. N. (2020). Optimal Tyre Management of a Formula One Car.
    - Farroni, F., et al. (2014). TRT: Thermo Racing Tyre - A physical model.
    - TrackShift Specification & Architecture: Outer Shell Data Ingestion Pipeline (DIP).
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
import requests

try:
    import fastf1
    import fastf1.core
    FASTF1_AVAILABLE = True
except ImportError:
    FASTF1_AVAILABLE = False

logger = logging.getLogger("trackshift.dip")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [DIP] %(message)s", datefmt="%H:%M:%S"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


# Circuit geographic coordinates for external weather re-analysis (Open-Meteo)
CIRCUIT_COORDINATES: Dict[str, Tuple[float, float]] = {
    "barcelona": (41.5700, 2.2611),
    "catalunya": (41.5700, 2.2611),
    "circuit de barcelona-catalunya": (41.5700, 2.2611),
    "montmelo": (41.5700, 2.2611),
    "spa": (50.4372, 5.9714),
    "silverstone": (52.0786, -1.0169),
    "monza": (45.6156, 9.2811),
}


@dataclass(frozen=True)
class SessionIdentifier:
    """
    Unique identifier for a Formula 1 session.

    Attributes:
        year: Championship season year (e.g., 2023, 2024, 2025).
        circuit: Circuit identifier or city name (e.g., 'Barcelona', 'Catalunya').
        session_type: FIA session abbreviation ('FP1', 'FP2', 'FP3', 'Q', 'S', 'SQ', 'R').
    """
    year: int
    circuit: str
    session_type: str

    @property
    def cache_key(self) -> str:
        """Returns a standardized filesystem-safe identifier string."""
        clean_circuit = self.circuit.lower().replace(" ", "_").replace("-", "_")
        clean_session = self.session_type.upper()
        return f"{self.year}_{clean_circuit}_{clean_session}"


@dataclass
class SessionDataset:
    """
    Normalized, self-contained dataset container for a single session.

    Attributes:
        session_id: SessionIdentifier object.
        laps: Canonical normalized DataFrame containing lap-by-lap timing and context.
        telemetry: Mapping from driver code to concatenated lap telemetry DataFrame.
        weather: Normalized weather time-series DataFrame from trackside sensors.
        stints: DataFrame detailing tyre stints, compound allocations, and lap intervals.
        external_weather: Optional DataFrame from external meteorology reanalysis (Open-Meteo).
    """
    session_id: SessionIdentifier
    laps: pd.DataFrame
    telemetry: Dict[str, pd.DataFrame]
    weather: pd.DataFrame
    stints: pd.DataFrame
    external_weather: Optional[pd.DataFrame] = None


class DiskCacheManager:
    """
    Manages local Parquet and JSON serialization for raw and processed session data.
    """

    def __init__(self, base_cache_dir: Union[str, Path] = "data/cache"):
        """
        Initializes disk cache directories.

        Args:
            base_cache_dir: Base directory for storing session caches.
        """
        self.base_cache_dir = Path(base_cache_dir)
        self.processed_dir = self.base_cache_dir / "processed"
        self.fastf1_cache_dir = self.base_cache_dir / "fastf1"
        self.openf1_cache_dir = self.base_cache_dir / "openf1"
        self.openmeteo_cache_dir = self.base_cache_dir / "openmeteo"

        for directory in [
            self.processed_dir,
            self.fastf1_cache_dir,
            self.openf1_cache_dir,
            self.openmeteo_cache_dir,
        ]:
            directory.mkdir(parents=True, exist_ok=True)

    def get_processed_paths(self, session_id: SessionIdentifier) -> Dict[str, Path]:
        """Returns file paths for cached components of a session."""
        prefix = self.processed_dir / session_id.cache_key
        return {
            "laps": prefix.with_name(f"{session_id.cache_key}_laps.parquet"),
            "weather": prefix.with_name(f"{session_id.cache_key}_weather.parquet"),
            "stints": prefix.with_name(f"{session_id.cache_key}_stints.parquet"),
            "metadata": prefix.with_name(f"{session_id.cache_key}_meta.json"),
        }

    def has_cached_session(self, session_id: SessionIdentifier) -> bool:
        """Checks if a processed session exists in local disk cache."""
        paths = self.get_processed_paths(session_id)
        return paths["laps"].exists() and paths["stints"].exists()

    def save_dataset(self, dataset: SessionDataset) -> None:
        """Serializes normalized dataset tables to disk."""
        paths = self.get_processed_paths(dataset.session_id)
        try:
            dataset.laps.to_parquet(paths["laps"], index=False)
            dataset.weather.to_parquet(paths["weather"], index=False)
            dataset.stints.to_parquet(paths["stints"], index=False)

            meta = {
                "session_id": asdict(dataset.session_id),
                "saved_at_utc": datetime.now(timezone.utc).isoformat(),
                "lap_count": len(dataset.laps),
                "driver_count": dataset.laps["driver"].nunique() if "driver" in dataset.laps else 0,
            }
            with open(paths["metadata"], "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2)

            logger.info("Saved session %s to local cache: %s", dataset.session_id.cache_key, self.processed_dir)
        except Exception as exc:
            logger.warning("Failed to write Parquet cache for %s: %s", dataset.session_id.cache_key, exc)

    def load_dataset(self, session_id: SessionIdentifier) -> Optional[SessionDataset]:
        """Loads a cached dataset from disk if present."""
        if not self.has_cached_session(session_id):
            return None

        paths = self.get_processed_paths(session_id)
        try:
            laps = pd.read_parquet(paths["laps"])
            weather = (
                pd.read_parquet(paths["weather"])
                if paths["weather"].exists()
                else pd.DataFrame()
            )
            stints = pd.read_parquet(paths["stints"])
            logger.info("Loaded session %s from cache", session_id.cache_key)
            return SessionDataset(
                session_id=session_id,
                laps=laps,
                telemetry={},
                weather=weather,
                stints=stints,
            )
        except Exception as exc:
            logger.warning("Error loading cached dataset %s: %s", session_id.cache_key, exc)
            return None


class FastF1Ingestor:
    """
    Ingests official timing, lap, and sensor telemetry using the FastF1 library.
    """

    def __init__(self, cache_dir: Union[str, Path] = "data/cache/fastf1"):
        """
        Initializes FastF1 with local caching enabled.

        Args:
            cache_dir: Directory where FastF1 caches raw API responses.
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        if FASTF1_AVAILABLE:
            fastf1.Cache.enable_cache(str(self.cache_dir))
            logger.info("FastF1 cache configured at: %s", self.cache_dir)
        else:
            logger.warning("FastF1 library is not installed or available.")

    def load_session(
        self,
        session_id: SessionIdentifier,
        load_telemetry: bool = True,
        load_weather: bool = True,
    ) -> Tuple[pd.DataFrame, Dict[str, pd.DataFrame], pd.DataFrame]:
        """
        Downloads and normalizes FastF1 session data.

        Args:
            session_id: Target session metadata.
            load_telemetry: Whether to load high-frequency car and positional telemetry.
            load_weather: Whether to load trackside meteorological data.

        Returns:
            Tuple of (normalized_laps, telemetry_dict, normalized_weather).
        """
        if not FASTF1_AVAILABLE:
            raise RuntimeError("FastF1 is not installed. Cannot ingest session data.")

        logger.info(
            "Requesting FastF1 session: Year %d, Circuit '%s', Session '%s'",
            session_id.year,
            session_id.circuit,
            session_id.session_type,
        )

        session = fastf1.get_session(
            session_id.year, session_id.circuit, session_id.session_type
        )
        session.load(
            laps=True,
            telemetry=load_telemetry,
            weather=load_weather,
            messages=False,
        )

        normalized_laps = self._normalize_laps(session.laps)
        normalized_weather = (
            self._normalize_weather(session.weather_data)
            if load_weather and hasattr(session, "weather_data")
            else pd.DataFrame()
        )

        telemetry_dict: Dict[str, pd.DataFrame] = {}
        if load_telemetry:
            telemetry_dict = self._extract_telemetry(session)

        return normalized_laps, telemetry_dict, normalized_weather

    def _normalize_laps(self, raw_laps: pd.DataFrame) -> pd.DataFrame:
        """
        Normalizes FastF1 Laps DataFrame into canonical TrackShift schema.

        Units:
            - Lap times and sector times: seconds (float)
            - Tyre life: integer / float laps
            - Pit times: seconds relative to session start or NaN
        """
        if raw_laps is None or raw_laps.empty:
            return pd.DataFrame()

        df = raw_laps.copy()

        def td_to_sec(series: pd.Series) -> pd.Series:
            """Converts pandas Timedelta, Datetime, or numeric series to float seconds."""
            if series is None or series.empty or series.isna().all():
                return pd.Series(np.nan, index=series.index if series is not None else [], dtype=float)
            if pd.api.types.is_timedelta64_dtype(series):
                return series.dt.total_seconds().astype(float)
            elif pd.api.types.is_datetime64_any_dtype(series):
                valid_ts = series.dropna()
                if valid_ts.empty:
                    return pd.Series(np.nan, index=series.index, dtype=float)
                # Return seconds relative to start of session/first timestamp
                t0 = valid_ts.iloc[0].value / 1e9
                return (series.astype("int64") / 1e9 - t0).astype(float)
            else:
                return pd.to_numeric(series, errors="coerce")

        col_map = {
            "LapNumber": "lap_number",
            "Driver": "driver",
            "Team": "team",
            "Stint": "stint",
            "Compound": "compound",
            "TyreLife": "tyre_life",
            "TrackStatus": "track_status",
            "IsAccurate": "is_accurate",
        }

        result = pd.DataFrame()
        for src_col, dst_col in col_map.items():
            if src_col in df.columns:
                result[dst_col] = df[src_col]
            else:
                result[dst_col] = None

        # Timing columns conversion
        result["lap_time_s"] = td_to_sec(df["LapTime"]) if "LapTime" in df else np.nan
        result["sector1_time_s"] = (
            td_to_sec(df["Sector1Time"]) if "Sector1Time" in df else np.nan
        )
        result["sector2_time_s"] = (
            td_to_sec(df["Sector2Time"]) if "Sector2Time" in df else np.nan
        )
        result["sector3_time_s"] = (
            td_to_sec(df["Sector3Time"]) if "Sector3Time" in df else np.nan
        )
        result["lap_start_time_s"] = (
            td_to_sec(df["LapStartTime"]) if "LapStartTime" in df else np.nan
        )
        result["pit_in_time_s"] = (
            td_to_sec(df["PitInTime"]) if "PitInTime" in df else np.nan
        )
        result["pit_out_time_s"] = (
            td_to_sec(df["PitOutTime"]) if "PitOutTime" in df else np.nan
        )

        # Boolean and string standards
        if "Deleted" in df.columns:
            result["deleted"] = df["Deleted"].fillna(False).astype(bool)
        else:
            result["deleted"] = False

        result["compound"] = (
            result["compound"].astype(str).str.upper().replace({"NAN": "UNKNOWN", "NONE": "UNKNOWN"})
        )
        result["driver"] = result["driver"].astype(str).str.upper()
        result["team"] = result["team"].astype(str)
        result["track_status"] = result["track_status"].astype(str)
        result["is_accurate"] = result["is_accurate"].fillna(False).astype(bool)

        # Sort logically
        result = result.sort_values(by=["driver", "lap_number"]).reset_index(drop=True)
        return result

    def _normalize_weather(self, raw_weather: pd.DataFrame) -> pd.DataFrame:
        """
        Normalizes trackside weather sensors.

        Units:
            - air_temp_c, track_temp_c: degrees Celsius (°C)
            - humidity_pct: relative percentage (0-100%)
            - pressure_mbar: atmospheric pressure in mbar/hPa
            - wind_speed_ms: wind velocity in metres per second (m/s)
            - wind_direction_deg: compass heading (0-360°)
            - rainfall_bool: boolean flag
        """
        if raw_weather is None or raw_weather.empty:
            return pd.DataFrame()

        df = raw_weather.copy()
        result = pd.DataFrame()

        if "Time" in df.columns:
            result["time_s"] = df["Time"].dt.total_seconds().astype(float)
        else:
            result["time_s"] = np.arange(len(df), dtype=float)

        result["air_temp_c"] = df.get("AirTemp", pd.Series(np.nan)).astype(float)
        result["track_temp_c"] = df.get("TrackTemp", pd.Series(np.nan)).astype(float)
        result["humidity_pct"] = df.get("Humidity", pd.Series(np.nan)).astype(float)
        result["pressure_mbar"] = df.get("Pressure", pd.Series(np.nan)).astype(float)
        result["wind_speed_ms"] = df.get("WindSpeed", pd.Series(np.nan)).astype(float)
        result["wind_direction_deg"] = df.get("WindDirection", pd.Series(np.nan)).astype(float)
        result["rainfall_bool"] = df.get("Rainfall", pd.Series(False)).astype(bool)

        return result

    def _extract_telemetry(self, session: Any) -> Dict[str, pd.DataFrame]:
        """
        Extracts merged car telemetry and coordinates for all drivers.

        Units:
            - time_s: float seconds from session start
            - distance_m: cumulative lap distance in metres
            - speed_kmh: vehicle velocity in km/h
            - throttle_pct: pedal application 0 to 100%
            - brake_bool: binary brake pedal switch (0 or 1)
            - x_m, y_m, z_m: world Cartesian coordinates in metres
        """
        telemetry_map: Dict[str, pd.DataFrame] = {}
        drivers = session.drivers if hasattr(session, "drivers") else []

        for drv in drivers:
            try:
                drv_laps = session.laps.pick_driver(drv)
                if drv_laps.empty:
                    continue

                drv_abbr = drv_laps.iloc[0]["Driver"]
                tel = drv_laps.get_telemetry()
                if tel is None or tel.empty:
                    continue

                tel_df = pd.DataFrame({
                    "driver": drv_abbr,
                    "time_s": tel["Time"].dt.total_seconds().astype(float) if "Time" in tel else np.nan,
                    "distance_m": tel.get("Distance", pd.Series(np.nan)).astype(float),
                    "speed_kmh": tel.get("Speed", pd.Series(np.nan)).astype(float),
                    "throttle_pct": tel.get("Throttle", pd.Series(np.nan)).astype(float),
                    "brake_bool": tel.get("Brake", pd.Series(0)).astype(float) > 0,
                    "gear": tel.get("nGear", pd.Series(0)).astype(int),
                    "rpm": tel.get("RPM", pd.Series(np.nan)).astype(float),
                    "drs": tel.get("DRS", pd.Series(0)).astype(int),
                    "x_m": tel.get("X", pd.Series(np.nan)).astype(float),
                    "y_m": tel.get("Y", pd.Series(np.nan)).astype(float),
                    "z_m": tel.get("Z", pd.Series(np.nan)).astype(float),
                })
                telemetry_map[drv_abbr] = tel_df
            except Exception as exc:
                logger.debug("Could not extract full telemetry for driver %s: %s", drv, exc)

        return telemetry_map


class OpenF1Ingestor:
    """
    Connects to the OpenF1 REST API (api.openf1.org) to ingest high-level
    stint sequences, tyre compounds, and interval dynamics.
    Includes persistent caching and automatic fallback to FastF1-derived stints.
    """

    BASE_URL = "https://api.openf1.org/v1"

    def __init__(
        self,
        cache_dir: Union[str, Path] = "data/cache/openf1",
        timeout_seconds: int = 10,
    ):
        """
        Initializes OpenF1 connector.

        Args:
            cache_dir: Directory for storing raw JSON responses.
            timeout_seconds: HTTP request timeout limit.
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.timeout = timeout_seconds

    def get_stints(
        self,
        session_id: SessionIdentifier,
        fallback_laps: Optional[pd.DataFrame] = None,
    ) -> pd.DataFrame:
        """
        Fetches stint data for the given session.

        Attempts OpenF1 REST endpoint first. If network unavailable or session not found,
        derives accurate stints directly from lap compound/pit sequences.

        Args:
            session_id: SessionIdentifier.
            fallback_laps: Normalized laps DataFrame used for local derivation if API fails.

        Returns:
            DataFrame with columns: ['driver', 'stint_number', 'compound', 'lap_start', 'lap_end', 'stint_length']
        """
        cache_file = self.cache_dir / f"{session_id.cache_key}_stints.json"

        # Check local cache first
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                if cached_data:
                    logger.info("Loaded OpenF1 stints from local cache: %s", cache_file)
                    return pd.DataFrame(cached_data)
            except Exception as exc:
                logger.warning("Error reading OpenF1 cache: %s", exc)

        # Attempt API query
        stints_df = self._query_openf1_stints(session_id)
        if stints_df is not None and not stints_df.empty:
            try:
                stints_df.to_json(cache_file, orient="records", indent=2)
            except Exception as exc:
                logger.debug("Failed writing OpenF1 cache: %s", exc)
            return stints_df

        # Fallback to derivation from laps
        if fallback_laps is not None and not fallback_laps.empty:
            logger.info("Deriving stints locally from normalized laps for %s", session_id.cache_key)
            return self.derive_stints_from_laps(fallback_laps)

        return pd.DataFrame(
            columns=["driver", "stint_number", "compound", "lap_start", "lap_end", "stint_length"]
        )

    def _query_openf1_stints(self, session_id: SessionIdentifier) -> Optional[pd.DataFrame]:
        """Queries OpenF1 REST API for stint records."""
        try:
            # 1. Resolve session_key from OpenF1 sessions endpoint
            session_url = (
                f"{self.BASE_URL}/sessions?year={session_id.year}"
                f"&circuit_short_name={session_id.circuit}"
            )
            resp = requests.get(session_url, timeout=self.timeout)
            if resp.status_code != 200:
                logger.debug("OpenF1 session query returned status %d", resp.status_code)
                return None

            sessions = resp.json()
            if not sessions:
                return None

            # Match session type (e.g., Practice 1, Practice 2, Race)
            target_key = None
            for sess in sessions:
                sess_name = sess.get("session_name", "").lower()
                req_sess = session_id.session_type.lower()
                if (
                    req_sess in sess_name
                    or (req_sess == "r" and "race" in sess_name)
                    or (req_sess == "fp1" and "practice 1" in sess_name)
                    or (req_sess == "fp2" and "practice 2" in sess_name)
                    or (req_sess == "fp3" and "practice 3" in sess_name)
                ):
                    target_key = sess.get("session_key")
                    break

            if target_key is None:
                target_key = sessions[0].get("session_key")

            # 2. Query stints with session_key
            stints_url = f"{self.BASE_URL}/stints?session_key={target_key}"
            stint_resp = requests.get(stints_url, timeout=self.timeout)
            if stint_resp.status_code != 200:
                return None

            raw_stints = stint_resp.json()
            if not raw_stints:
                return None

            records = []
            for item in raw_stints:
                records.append({
                    "driver": str(item.get("driver_number", "UNKNOWN")),
                    "stint_number": int(item.get("stint_number", 1)),
                    "compound": str(item.get("compound", "UNKNOWN")).upper(),
                    "lap_start": int(item.get("lap_start", 1)),
                    "lap_end": int(item.get("lap_end", 1)),
                    "stint_length": int(item.get("lap_end", 1)) - int(item.get("lap_start", 1)) + 1,
                })
            return pd.DataFrame(records)

        except Exception as exc:
            logger.debug("OpenF1 API query skipped/failed (%s). Switching to fallback.", exc)
            return None

    @staticmethod
    def derive_stints_from_laps(laps_df: pd.DataFrame) -> pd.DataFrame:
        """
        Derives continuous tyre stints from lap telemetry and pit flags.

        Stint transitions occur when:
        1. Explicit 'stint' number changes in input data.
        2. Tyre compound changes.
        3. A pit stop occurs (valid pit_in_time followed by pit_out_time).

        Returns:
            Normalized stints DataFrame.
        """
        if laps_df.empty:
            return pd.DataFrame(
                columns=["driver", "stint_number", "compound", "lap_start", "lap_end", "stint_length"]
            )

        records = []
        for driver, group in laps_df.groupby("driver", sort=False):
            driver_laps = group.sort_values("lap_number").copy()

            # Determine stint boundaries
            if "stint" in driver_laps.columns and driver_laps["stint"].notna().any():
                stint_groups = driver_laps.groupby("stint", sort=False)
                for stint_num, s_laps in stint_groups:
                    compound = (
                        s_laps["compound"].iloc[0]
                        if "compound" in s_laps.columns
                        else "UNKNOWN"
                    )
                    lap_start = int(s_laps["lap_number"].min())
                    lap_end = int(s_laps["lap_number"].max())
                    records.append({
                        "driver": driver,
                        "stint_number": int(stint_num),
                        "compound": str(compound).upper(),
                        "lap_start": lap_start,
                        "lap_end": lap_end,
                        "stint_length": lap_end - lap_start + 1,
                    })
            else:
                # Construct stints from pit in flags and compound changes
                curr_stint = 1
                curr_compound = driver_laps.iloc[0].get("compound", "UNKNOWN")
                lap_start = int(driver_laps.iloc[0]["lap_number"])

                for idx in range(len(driver_laps)):
                    row = driver_laps.iloc[idx]
                    lap_no = int(row["lap_number"])
                    row_comp = row.get("compound", curr_compound)
                    has_pit_in = pd.notna(row.get("pit_in_time_s"))

                    is_last_lap = idx == len(driver_laps) - 1
                    compound_changed = (row_comp != curr_compound) and pd.notna(row_comp)

                    if has_pit_in or compound_changed or is_last_lap:
                        lap_end = lap_no
                        records.append({
                            "driver": driver,
                            "stint_number": curr_stint,
                            "compound": str(curr_compound).upper(),
                            "lap_start": lap_start,
                            "lap_end": lap_end,
                            "stint_length": lap_end - lap_start + 1,
                        })
                        curr_stint += 1
                        curr_compound = row_comp
                        lap_start = lap_no + 1

        return pd.DataFrame(records)


class OpenMeteoIngestor:
    """
    Ingests atmospheric weather reanalysis from the Open-Meteo Historical Archive API.
    Provides independent external verification of ambient temperature, humidity,
    surface pressure, and precipitation at circuit GPS coordinates.
    """

    ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

    def __init__(
        self,
        cache_dir: Union[str, Path] = "data/cache/openmeteo",
        timeout_seconds: int = 10,
    ):
        """Initializes Open-Meteo connector."""
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.timeout = timeout_seconds

    def get_weather(
        self,
        circuit: str,
        start_date: str,
        end_date: str,
    ) -> pd.DataFrame:
        """
        Fetches hourly microclimate reanalysis.

        Args:
            circuit: Circuit name (matched against CIRCUIT_COORDINATES).
            start_date: ISO date string 'YYYY-MM-DD'.
            end_date: ISO date string 'YYYY-MM-DD'.

        Returns:
            Normalized DataFrame with columns:
            ['timestamp', 'air_temp_c', 'humidity_pct', 'surface_pressure_hpa', 'wind_speed_kmh', 'precipitation_mm']
        """
        circ_key = circuit.lower().strip()
        coords = CIRCUIT_COORDINATES.get(circ_key, CIRCUIT_COORDINATES["barcelona"])
        lat, lon = coords

        cache_key = f"{circ_key}_{start_date}_{end_date}.json"
        cache_file = self.cache_dir / cache_key

        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return pd.DataFrame(data)
            except Exception as exc:
                logger.debug("Error reading Open-Meteo cache: %s", exc)

        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,precipitation",
            "timezone": "UTC",
        }

        try:
            resp = requests.get(self.ARCHIVE_URL, params=params, timeout=self.timeout)
            if resp.status_code == 200:
                hourly = resp.json().get("hourly", {})
                if hourly:
                    df = pd.DataFrame({
                        "timestamp": hourly.get("time", []),
                        "air_temp_c": hourly.get("temperature_2m", []),
                        "humidity_pct": hourly.get("relative_humidity_2m", []),
                        "surface_pressure_hpa": hourly.get("surface_pressure", []),
                        "wind_speed_kmh": hourly.get("wind_speed_10m", []),
                        "precipitation_mm": hourly.get("precipitation", []),
                    })
                    try:
                        df.to_json(cache_file, orient="records", indent=2)
                    except Exception:
                        pass
                    return df
        except Exception as exc:
            logger.debug("Open-Meteo API query skipped/failed: %s", exc)

        return pd.DataFrame(
            columns=[
                "timestamp",
                "air_temp_c",
                "humidity_pct",
                "surface_pressure_hpa",
                "wind_speed_kmh",
                "precipitation_mm",
            ]
        )


class DataIngestionPipeline:
    """
    Unified Data Ingestion Pipeline (DIP) Facade.

    Coordinates FastF1, OpenF1, Open-Meteo, and local disk caching to provide
    clean, normalized SessionDataset structures for the TrackShift pipeline.
    """

    def __init__(self, base_cache_dir: Union[str, Path] = "data/cache"):
        """
        Initializes DIP connectors and caching infrastructure.

        Args:
            base_cache_dir: Root cache directory.
        """
        self.cache_mgr = DiskCacheManager(base_cache_dir)
        self.fastf1_ingestor = FastF1Ingestor(self.cache_mgr.fastf1_cache_dir)
        self.openf1_ingestor = OpenF1Ingestor(self.cache_mgr.openf1_cache_dir)
        self.openmeteo_ingestor = OpenMeteoIngestor(self.cache_mgr.openmeteo_cache_dir)

    def load_session(
        self,
        year: int,
        circuit: str = "Barcelona",
        session_type: str = "FP2",
        force_reload: bool = False,
        load_telemetry: bool = True,
    ) -> SessionDataset:
        """
        Loads and normalizes all session data, utilizing disk caches whenever available.

        Args:
            year: Season year (e.g. 2024).
            circuit: Circuit name or identifier (default: 'Barcelona').
            session_type: Session code ('FP1', 'FP2', 'FP3', 'Q', 'R').
            force_reload: If True, bypasses local processed Parquet cache.
            load_telemetry: Whether to load full car telemetry.

        Returns:
            Normalized SessionDataset instance.
        """
        session_id = SessionIdentifier(year=year, circuit=circuit, session_type=session_type)

        # 1. Check disk cache
        if not force_reload:
            cached_dataset = self.cache_mgr.load_dataset(session_id)
            if cached_dataset is not None:
                return cached_dataset

        # 2. Ingest via FastF1
        laps, telemetry, weather = self.fastf1_ingestor.load_session(
            session_id=session_id,
            load_telemetry=load_telemetry,
            load_weather=True,
        )

        # 3. Ingest Stints via OpenF1 (with fallback to FastF1 laps)
        stints = self.openf1_ingestor.get_stints(session_id=session_id, fallback_laps=laps)

        # 4. Synthesize SessionDataset
        dataset = SessionDataset(
            session_id=session_id,
            laps=laps,
            telemetry=telemetry,
            weather=weather,
            stints=stints,
        )

        # 5. Persist to processed cache
        self.cache_mgr.save_dataset(dataset)

        return dataset
