"""
Deterministic Unit Tests: Strategy Optimization (tests/test_strategy.py).
Validates FIA two-compound constraints, lap partitioning, and pit window bounds.
"""

import pytest
from testDaksh.numerical_schemas import (
    FrozenCalibrationRecord,
    RacePredictionRecord,
    StrategyOptimizationRecord,
)
from testDaksh.pre_race_forecaster import PreRaceForecaster
from testDaksh.strategy_optimizer import StrategyOptimizer


@pytest.fixture
def dummy_forecast():
    forecaster = PreRaceForecaster()
    frozen = FrozenCalibrationRecord(
        circuit="Spain",
        year=2024,
        calibration_status="FROZEN_PRE_RACE",
        source_provenance="Test",
        timestamp_hash="abcd1234",
        compounds={
            "SOFT": {"t_opt": 95.0, "t_window": 15.0, "base_mu0": 1.55, "calibrated_w_p1": 0.045, "calibrated_w_p2": 1.15},
            "MEDIUM": {"t_opt": 105.0, "t_window": 18.0, "base_mu0": 1.45, "calibrated_w_p1": 0.032, "calibrated_w_p2": 1.15},
            "HARD": {"t_opt": 112.0, "t_window": 20.0, "base_mu0": 1.35, "calibrated_w_p1": 0.022, "calibrated_w_p2": 1.15},
        },
        nominal_session_weights={},
        effective_session_weights={},
        session_qualities={},
    )
    return forecaster.forecast_race_weekend(frozen, total_race_laps=66)


def test_fia_two_compound_mandate(dummy_forecast):
    """Verifies strategy uses at least two distinct dry compounds."""
    optimizer = StrategyOptimizer()
    plan = optimizer.optimize_race_strategy(dummy_forecast, enforce_two_compounds=True)

    unique_compounds = set(plan.compound_sequence)
    assert len(unique_compounds) >= 2
    assert plan.constraints_satisfied == 1


def test_total_lap_distance_coverage(dummy_forecast):
    """Verifies sum of stint lengths matches total race distance."""
    optimizer = StrategyOptimizer()
    plan = optimizer.optimize_race_strategy(dummy_forecast)

    total_stint_laps = sum(plan.stint_lengths)
    assert total_stint_laps == dummy_forecast.total_race_laps


def test_pit_window_bounds(dummy_forecast):
    """Verifies pit windows are formatted as [lap - 2, lap + 2]."""
    optimizer = StrategyOptimizer()
    plan = optimizer.optimize_race_strategy(dummy_forecast)

    for i, p_lap in enumerate(plan.pit_laps):
        w_start, w_end = plan.pit_windows[i]
        assert w_start <= p_lap <= w_end
        assert (w_end - w_start) <= 4
