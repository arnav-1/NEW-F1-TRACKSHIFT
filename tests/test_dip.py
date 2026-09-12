"""
Unit tests for Data Ingestion Pipeline (DIP).
"""

import tempfile
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

from src.dip.ingestion import (
    SessionIdentifier,
    SessionDataset,
    DiskCacheManager,
    OpenF1Ingestor,
    FastF1Ingestor,
)


def test_session_identifier():
    """Verifies SessionIdentifier properties and cache key generation."""
    sess = SessionIdentifier(year=2024, circuit="Barcelona", session_type="FP2")
    assert sess.year == 2024
    assert sess.circuit == "Barcelona"
    assert sess.session_type == "FP2"
    assert sess.cache_key == "2024_barcelona_FP2"

    sess_spaces = SessionIdentifier(year=2023, circuit="Circuit de Barcelona-Catalunya", session_type="R")
    assert sess_spaces.cache_key == "2023_circuit_de_barcelona_catalunya_R"


def test_disk_cache_manager_save_and_load():
    """Verifies dataset serialization and deserialization via Parquet."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        cache_mgr = DiskCacheManager(base_cache_dir=tmp_dir)
        sess = SessionIdentifier(year=2024, circuit="Barcelona", session_type="FP1")

        laps_df = pd.DataFrame({
            "lap_number": [1, 2, 3],
            "driver": ["VER", "VER", "VER"],
            "lap_time_s": [78.5, 78.2, 78.6],
            "compound": ["SOFT", "SOFT", "SOFT"],
            "stint": [1, 1, 1],
        })
        weather_df = pd.DataFrame({
            "time_s": [0.0, 60.0],
            "air_temp_c": [24.5, 24.8],
            "track_temp_c": [38.2, 38.6],
        })
        stints_df = pd.DataFrame({
            "driver": ["VER"],
            "stint_number": [1],
            "compound": ["SOFT"],
            "lap_start": [1],
            "lap_end": [3],
            "stint_length": [3],
        })

        dataset = SessionDataset(
            session_id=sess,
            laps=laps_df,
            telemetry={},
            weather=weather_df,
            stints=stints_df,
        )

        assert not cache_mgr.has_cached_session(sess)
        cache_mgr.save_dataset(dataset)
        assert cache_mgr.has_cached_session(sess)

        loaded = cache_mgr.load_dataset(sess)
        assert loaded is not None
        assert len(loaded.laps) == 3
        assert loaded.laps["driver"].iloc[0] == "VER"
        assert len(loaded.stints) == 1
        assert len(loaded.weather) == 2


def test_openf1_derive_stints_from_laps():
    """Verifies local stint segmentation fallback from lap sequences."""
    laps_df = pd.DataFrame({
        "driver": ["HAM", "HAM", "HAM", "HAM", "HAM"],
        "lap_number": [1, 2, 3, 4, 5],
        "stint": [1, 1, 1, 2, 2],
        "compound": ["MEDIUM", "MEDIUM", "MEDIUM", "HARD", "HARD"],
        "pit_in_time_s": [np.nan, np.nan, 240.0, np.nan, np.nan],
    })

    stints = OpenF1Ingestor.derive_stints_from_laps(laps_df)
    assert len(stints) == 2
    assert stints.iloc[0]["stint_number"] == 1
    assert stints.iloc[0]["compound"] == "MEDIUM"
    assert stints.iloc[0]["lap_start"] == 1
    assert stints.iloc[0]["lap_end"] == 3
    assert stints.iloc[0]["stint_length"] == 3

    assert stints.iloc[1]["stint_number"] == 2
    assert stints.iloc[1]["compound"] == "HARD"
    assert stints.iloc[1]["lap_start"] == 4
    assert stints.iloc[1]["lap_end"] == 5


def test_fastf1_lap_normalization():
    """Verifies schema standardization from raw FastF1 columns."""
    ingestor = FastF1Ingestor(cache_dir="data/cache/fastf1")

    raw_df = pd.DataFrame({
        "LapNumber": [1, 2],
        "Driver": ["ALO", "ALO"],
        "Team": ["Aston Martin", "Aston Martin"],
        "Stint": [1, 1],
        "Compound": ["soft", "soft"],
        "TyreLife": [1.0, 2.0],
        "TrackStatus": ["1", "1"],
        "IsAccurate": [True, True],
        "LapTime": pd.to_timedelta([79.123, 78.945], unit="s"),
        "Sector1Time": pd.to_timedelta([22.1, 22.0], unit="s"),
        "Sector2Time": pd.to_timedelta([29.3, 29.2], unit="s"),
        "Sector3Time": pd.to_timedelta([27.723, 27.745], unit="s"),
        "LapStartTime": pd.to_timedelta([100.0, 179.123], unit="s"),
        "PitInTime": [pd.NaT, pd.NaT],
        "PitOutTime": [pd.NaT, pd.NaT],
        "Deleted": [False, False],
    })

    normalized = ingestor._normalize_laps(raw_df)
    assert "lap_time_s" in normalized.columns
    assert normalized["lap_time_s"].iloc[0] == pytest.approx(79.123, abs=1e-3)
    assert normalized["compound"].iloc[0] == "SOFT"
    assert normalized["is_accurate"].all()
    assert not normalized["deleted"].any()

