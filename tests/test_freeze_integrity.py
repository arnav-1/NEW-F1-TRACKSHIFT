"""
Deterministic Unit Tests: Freeze Integrity & Zero Sunday Leakage (tests/test_freeze_integrity.py).
Enforces the core scientific requirement: the pre-race model is strictly frozen before Sunday.
"""

import json
from pathlib import Path
import pytest

from testDaksh.numerical_schemas import FrozenCalibrationRecord
from testDaksh.parameter_calibrator import ParameterCalibrator
from testDaksh.pre_race_forecaster import PreRaceForecaster


@pytest.fixture
def temp_calib_file(tmp_path):
    calibrator = ParameterCalibrator(output_dir=tmp_path)
    fused_params = {
        "SOFT": {"beta_1_per_lap": 0.105, "beta_1": 1.575, "beta_2": 0.20, "beta_0": 0.05},
        "MEDIUM": {"beta_1_per_lap": 0.072, "beta_1": 1.080, "beta_2": 0.18, "beta_0": 0.04},
        "HARD": {"beta_1_per_lap": 0.045, "beta_1": 0.675, "beta_2": 0.15, "beta_0": 0.03},
    }
    nom_w = {"FP1": 0.15, "FP2": 0.70, "FP3": 0.15}
    eff_w = {"FP1": 0.12, "FP2": 0.76, "FP3": 0.12}
    qualities = {"FP1": 0.80, "FP2": 0.95, "FP3": 0.80}

    record = calibrator.freeze_pre_race_calibration(
        circuit="Spain",
        year=2024,
        fused_parameters=fused_params,
        nominal_weights=nom_w,
        effective_weights=eff_w,
        session_qualities=qualities,
        custom_filename="test_frozen.json",
    )
    return tmp_path / "test_frozen.json", record


def test_frozen_record_structure(temp_calib_file):
    """Verifies frozen file adheres strictly to numerical schema without LLM text."""
    path, record = temp_calib_file
    assert path.exists()

    with open(path) as f:
        data = json.load(f)

    assert data["calibration_status"] == "FROZEN_PRE_RACE"
    assert "timestamp_hash" in data
    assert len(data["timestamp_hash"]) > 0
    assert "compounds" in data
    assert "SOFT" in data["compounds"]
    assert "MEDIUM" in data["compounds"]
    assert "HARD" in data["compounds"]


def test_zero_sunday_leakage_audit(temp_calib_file):
    """
    CRITICAL LEAKAGE TEST:
    Verifies that no Sunday race keywords, targets, or race telemetry keys exist in the frozen calibration.
    """
    path, _ = temp_calib_file
    with open(path) as f:
        content_str = f.read().lower()

    forbidden_leakage_keys = [
        "race_lap_time",
        "sunday_telemetry",
        "actual_pit_stop",
        "winning_strategy",
        "post_race_inferred",
        "track_rubber_evolution",
        "driver_push_level",
        "actual_race_degradation",
    ]

    for key in forbidden_leakage_keys:
        assert key not in content_str, f"LEAKAGE DETECTED: {key} found in frozen calibration!"


def test_frozen_immutability_under_simulation(temp_calib_file, tmp_path):
    """Verifies that running pre-race forecasting does NOT modify the frozen calibration file."""
    path, record = temp_calib_file
    with open(path) as f:
        before_content = f.read()

    forecaster = PreRaceForecaster(output_dir=tmp_path)
    _ = forecaster.forecast_race_weekend(record, total_race_laps=66)

    with open(path) as f:
        after_content = f.read()

    assert before_content == after_content, "MUTATION DETECTED: Frozen calibration was modified during simulation!"
