"""
Unit tests for Comparison & Management Platform (CMP).
"""

import numpy as np
import pandas as pd
import pytest

from src.dep.degradation import DegradationFitResult
from src.cmp.comparison import (
    StintValidator,
    ComparisonPlatform,
)


def test_stint_validator_metrics():
    """Verifies calculation of MAE, R², slope error, and cliff tolerance check."""
    # Synthetic practice model
    practice_model = DegradationFitResult(
        compound="HARD",
        driver="VER",
        stint=1,
        n_laps=15,
        base_pace_s=80.0,
        alpha=0.06,
        beta=0.003,
        r_squared=0.92,
        predicted_cliff_lap=22.0,
    )

    # Synthetic race stint matching the model closely
    tyre_life = np.arange(1, 16, dtype=float)
    race_laps_df = pd.DataFrame({
        "driver": ["VER"] * 15,
        "stint": [1] * 15,
        "compound": ["HARD"] * 15,
        "tyre_life": tyre_life,
        "lap_time_fully_corrected_s": 80.5 + 0.06 * tyre_life + 0.003 * (tyre_life ** 2),
    })

    validator = StintValidator()
    metrics = validator.validate_stint(practice_model, race_laps_df)

    assert metrics is not None
    # Pace follows exact shape, so MAE should be near 0
    assert metrics.mae_s < 0.05
    # High R²
    assert metrics.r_squared > 0.95
    # Slope error should be minimal
    assert metrics.slope_error_s_per_lap < 0.02


def test_comparison_platform_multi_stint():
    """Verifies orchestrating validation across multiple driver stints."""
    # Practice DEP results mock
    model_med = DegradationFitResult(
        compound="MEDIUM",
        driver="ALL",
        stint=0,
        n_laps=20,
        base_pace_s=79.5,
        alpha=0.07,
        beta=0.002,
        r_squared=0.88,
        predicted_cliff_lap=25.0,
    )
    practice_dep_results = {
        "stint_fits": [],
        "compound_models": {"MEDIUM": model_med},
        "summary_table": pd.DataFrame(),
    }

    # Held-out Sunday race laps across 2 drivers
    records = []
    for drv in ["LEC", "SAI"]:
        for lap in range(1, 13):
            records.append({
                "driver": drv,
                "stint": 1,
                "compound": "MEDIUM",
                "tyre_life": float(lap),
                "lap_time_fully_corrected_s": 80.0 + 0.075 * lap + 0.002 * (lap ** 2),
            })
    race_df = pd.DataFrame(records)

    cmp_platform = ComparisonPlatform()
    report = cmp_platform.compare_sessions(practice_dep_results, race_df)

    assert len(report.metrics) == 2
    assert report.overall_mae_s < 0.15
    assert report.cliff_accuracy_pct >= 50.0

    summary_df = report.summary_table()
    assert len(summary_df) == 2
    assert "mae_s" in summary_df.columns
    assert "r2" in summary_df.columns


def test_circuit_profile_archetypes():
    """
    Verifies canonical circuit profiles and physical archetypes:
    - Barcelona / Silverstone: high_downforce_abrasive (limiting FL)
    - Monza: low_downforce_traction (limiting RR)
    - Monaco: street_circuit (surface abrasiveness 0.65)
    """
    from src.cmp.comparison import CIRCUIT_PROFILES, CircuitProfile

    assert "barcelona" in CIRCUIT_PROFILES
    assert "silverstone" in CIRCUIT_PROFILES
    assert "monza" in CIRCUIT_PROFILES
    assert "spa" in CIRCUIT_PROFILES
    assert "monaco" in CIRCUIT_PROFILES

    # Barcelona
    bcn = CIRCUIT_PROFILES["barcelona"]
    assert bcn.archetype == "high_downforce_abrasive"
    assert bcn.limiting_wheel == "FL"
    assert bcn.surface_abrasiveness > 1.0

    # Monza
    monza = CIRCUIT_PROFILES["monza"]
    assert monza.archetype == "low_downforce_traction"
    assert monza.limiting_wheel == "RR"

    # Monaco
    monaco = CIRCUIT_PROFILES["monaco"]
    assert monaco.archetype == "street_circuit"
    assert monaco.surface_abrasiveness < 1.0


def test_strict_acceptance_criteria_evaluation():
    """
    Verifies enforcement of TrackShift Hackathon strict acceptance criteria:
    - Stint-end lap time MAE <= 0.50s
    - Held-out race stint R² >= 0.75
    - Degradation slope error <= 0.05 s/lap
    - Stint cliff prediction error <= +/- 2 laps
    """
    from src.cmp.comparison import ValidationMetrics

    # 1. Passing all criteria
    pass_metric = ValidationMetrics(
        driver="VER",
        stint=1,
        compound="HARD",
        n_laps=18,
        mae_s=0.28,
        r_squared=0.88,
        observed_slope_s_per_lap=0.065,
        predicted_slope_s_per_lap=0.072,
        slope_error_s_per_lap=0.007,
        predicted_cliff_lap=22.0,
        actual_cliff_lap=23.0,
        cliff_error_laps=1.0,
        cliff_within_tolerance=True,
    )
    assert pass_metric.pass_mae is True
    assert pass_metric.pass_r2 is True
    assert pass_metric.pass_slope is True
    assert pass_metric.cliff_within_tolerance is True
    assert pass_metric.all_criteria_met is True

    # 2. Failing MAE (MAE = 0.65s > 0.50s)
    fail_mae = ValidationMetrics(
        driver="NOR",
        stint=2,
        compound="MEDIUM",
        n_laps=15,
        mae_s=0.65,
        r_squared=0.82,
        observed_slope_s_per_lap=0.080,
        predicted_slope_s_per_lap=0.085,
        slope_error_s_per_lap=0.005,
        predicted_cliff_lap=19.0,
        actual_cliff_lap=19.5,
        cliff_error_laps=0.5,
        cliff_within_tolerance=True,
    )
    assert fail_mae.pass_mae is False
    assert fail_mae.all_criteria_met is False

    # 3. Failing R² (R² = 0.62 < 0.75)
    fail_r2 = ValidationMetrics(
        driver="LEC",
        stint=1,
        compound="SOFT",
        n_laps=12,
        mae_s=0.35,
        r_squared=0.62,
        observed_slope_s_per_lap=0.110,
        predicted_slope_s_per_lap=0.115,
        slope_error_s_per_lap=0.005,
        predicted_cliff_lap=12.0,
        actual_cliff_lap=13.0,
        cliff_error_laps=1.0,
        cliff_within_tolerance=True,
    )
    assert fail_r2.pass_r2 is False
    assert fail_r2.all_criteria_met is False

    # 4. Failing slope error (0.075 > 0.05)
    fail_slope = ValidationMetrics(
        driver="HAM",
        stint=1,
        compound="MEDIUM",
        n_laps=16,
        mae_s=0.32,
        r_squared=0.85,
        observed_slope_s_per_lap=0.040,
        predicted_slope_s_per_lap=0.115,
        slope_error_s_per_lap=0.075,
        predicted_cliff_lap=20.0,
        actual_cliff_lap=21.0,
        cliff_error_laps=1.0,
        cliff_within_tolerance=True,
    )
    assert fail_slope.pass_slope is False
    assert fail_slope.all_criteria_met is False

