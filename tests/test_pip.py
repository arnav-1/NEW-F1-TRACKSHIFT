"""
Unit tests for Preprocessing Pipeline (PIP).
"""

import numpy as np
import pandas as pd
import pytest

from src.pip.preprocessing import PreprocessingPipeline


@pytest.fixture
def sample_raw_laps():
    """Generates synthetic lap dataset containing deliberate anomalies across all 7 filters."""
    # Stint 1: 8 laps by VER (includes pit out, deleted lap, yellow flag, pace outlier, and clean laps)
    # Stint 2: 2 laps by PER (too short, fails Filter 7)
    laps_data = [
        # Lap 1: Out-lap with pit_out_time_s -> Should fail Filter 1
        {"lap_number": 1, "driver": "VER", "stint": 1, "compound": "MEDIUM", "tyre_life": 1.0,
         "lap_time_s": 105.0, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": 10.0, "deleted": False},
        # Lap 2: Cold tyre scrub-in -> Should fail Filter 5 if warm-up filter active
        {"lap_number": 2, "driver": "VER", "stint": 1, "compound": "MEDIUM", "tyre_life": 1.0,
         "lap_time_s": 80.5, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        # Lap 3: Clean representative lap -> Should PASS
        {"lap_number": 3, "driver": "VER", "stint": 1, "compound": "MEDIUM", "tyre_life": 2.0,
         "lap_time_s": 79.2, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        # Lap 4: Clean representative lap -> Should PASS
        {"lap_number": 4, "driver": "VER", "stint": 1, "compound": "MEDIUM", "tyre_life": 3.0,
         "lap_time_s": 79.3, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        # Lap 5: Track limits deleted lap -> Should fail Filter 4
        {"lap_number": 5, "driver": "VER", "stint": 1, "compound": "MEDIUM", "tyre_life": 4.0,
         "lap_time_s": 78.9, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": True},
        # Lap 6: Yellow flag / VSC (TrackStatus '4') -> Should fail Filter 2
        {"lap_number": 6, "driver": "VER", "stint": 1, "compound": "MEDIUM", "tyre_life": 5.0,
         "lap_time_s": 95.0, "is_accurate": True, "track_status": "4", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        # Lap 7: Clean representative lap -> Should PASS
        {"lap_number": 7, "driver": "VER", "stint": 1, "compound": "MEDIUM", "tyre_life": 6.0,
         "lap_time_s": 79.5, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        # Lap 8: Huge mistake / traffic (+3.5s vs 79.3s median) -> Should fail Filter 6
        {"lap_number": 8, "driver": "VER", "stint": 1, "compound": "MEDIUM", "tyre_life": 7.0,
         "lap_time_s": 83.2, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        # Lap 9: Clean representative lap -> Should PASS
        {"lap_number": 9, "driver": "VER", "stint": 1, "compound": "MEDIUM", "tyre_life": 8.0,
         "lap_time_s": 79.6, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        # Lap 10: In-lap with pit_in_time_s -> Should fail Filter 1
        {"lap_number": 10, "driver": "VER", "stint": 1, "compound": "MEDIUM", "tyre_life": 9.0,
         "lap_time_s": 98.0, "is_accurate": True, "track_status": "1", "pit_in_time_s": 800.0, "pit_out_time_s": np.nan, "deleted": False},

        # Driver 2 (PER) Stint with only 2 laps (fails Filter 7 minimum stint length >= 4)
        {"lap_number": 1, "driver": "PER", "stint": 1, "compound": "HARD", "tyre_life": 2.0,
         "lap_time_s": 80.1, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        {"lap_number": 2, "driver": "PER", "stint": 1, "compound": "HARD", "tyre_life": 3.0,
         "lap_time_s": 80.2, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
    ]
    return pd.DataFrame(laps_data)


def test_preprocessing_pipeline_all_filters(sample_raw_laps):
    """Verifies that all 7 filters properly isolate valid racing laps and reject anomalies."""
    pip = PreprocessingPipeline(
        pace_outlier_threshold_s=2.0,
        rolling_window_laps=5,
        min_stint_length=4,
        filter_warmup_lap=True,
    )

    result = pip.process(sample_raw_laps)
    clean = result.clean_laps
    rejected = result.rejected_laps
    report = result.report

    assert len(sample_raw_laps) == 12

    # Laps that should survive for VER: Lap 3, Lap 4, Lap 7, Lap 9 (4 laps >= min_stint_length 4)
    assert len(clean) == 4
    assert set(clean["lap_number"]) == {3, 4, 7, 9}
    assert (clean["driver"] == "VER").all()

    # Verify rejected reasons in audit breakdown
    filter_names = [f.filter_name for f in report.filter_breakdown]
    assert any("Pit In/Out" in name for name in filter_names)
    assert any("Green Flag" in name for name in filter_names)
    assert any("Track Limits" in name for name in filter_names)
    assert any("Pace Outliers" in name for name in filter_names)
    assert any("Minimum Stint Length" in name for name in filter_names)

    # PER laps were rejected by minimum stint length
    per_rejected = rejected[rejected["driver"] == "PER"]
    assert len(per_rejected) == 2
    assert not per_rejected["pass_stint_length"].any()


def test_preprocessing_timing_accuracy():
    """Verifies that inaccurate transponder timing laps and non-physical times are purged."""
    laps_data = pd.DataFrame([
        {"lap_number": 1, "driver": "NOR", "stint": 1, "compound": "SOFT", "tyre_life": 2.0,
         "lap_time_s": 78.5, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        # Inaccurate flag
        {"lap_number": 2, "driver": "NOR", "stint": 1, "compound": "SOFT", "tyre_life": 3.0,
         "lap_time_s": 78.6, "is_accurate": False, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        # Implausibly fast (e.g. sensor glitch 25s)
        {"lap_number": 3, "driver": "NOR", "stint": 1, "compound": "SOFT", "tyre_life": 4.0,
         "lap_time_s": 25.0, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        {"lap_number": 4, "driver": "NOR", "stint": 1, "compound": "SOFT", "tyre_life": 5.0,
         "lap_time_s": 78.7, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        {"lap_number": 5, "driver": "NOR", "stint": 1, "compound": "SOFT", "tyre_life": 6.0,
         "lap_time_s": 78.8, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
        {"lap_number": 6, "driver": "NOR", "stint": 1, "compound": "SOFT", "tyre_life": 7.0,
         "lap_time_s": 78.9, "is_accurate": True, "track_status": "1", "pit_in_time_s": np.nan, "pit_out_time_s": np.nan, "deleted": False},
    ])

    pip = PreprocessingPipeline(min_stint_length=4)
    result = pip.process(laps_data)
    assert len(result.clean_laps) == 4
    assert 2 not in result.clean_laps["lap_number"].values
    assert 3 not in result.clean_laps["lap_number"].values
