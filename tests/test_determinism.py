"""
Deterministic Unit Tests: Bitwise / Numerical Repeatability (tests/test_determinism.py).
Enforces zero stochasticity: successive executions on identical inputs yield numerically identical results.
"""

import json
import numpy as np
import pytest

from testDaksh.parameter_calibrator import ParameterCalibrator
from testDaksh.parameter_fusion import ParameterFusion
from testDaksh.physical_tyre_model import PhysicalTyreModel
from testDaksh.pre_race_forecaster import PreRaceForecaster
from testDaksh.strategy_optimizer import StrategyOptimizer


def test_physical_simulation_determinism():
    """Verifies that simulating 20 laps twice yields identical values to floating point precision."""
    model = PhysicalTyreModel()
    from testDaksh.physical_tyre_model import DEFAULT_COMPOUND_PARAMS
    comp = DEFAULT_COMPOUND_PARAMS["MEDIUM"]

    run1_damages = []
    run2_damages = []

    # Run 1
    t_tread, t_carc, d = comp.t_opt, comp.t_opt - 5.0, 0.0
    for _ in range(20):
        t_tread, t_carc, d, _, _ = model.simulate_lap_wear(t_tread, t_carc, d, comp, 40.0, 25.0)
        run1_damages.append(d)

    # Run 2
    t_tread, t_carc, d = comp.t_opt, comp.t_opt - 5.0, 0.0
    for _ in range(20):
        t_tread, t_carc, d, _, _ = model.simulate_lap_wear(t_tread, t_carc, d, comp, 40.0, 25.0)
        run2_damages.append(d)

    np.testing.assert_array_equal(np.array(run1_damages), np.array(run2_damages))


def test_strategy_optimizer_determinism():
    """Verifies that strategy optimization produces identical pit laps and sequences on successive calls."""
    forecaster = PreRaceForecaster()
    calibrator = ParameterCalibrator()
    optimizer = StrategyOptimizer()

    fused_params = {
        "SOFT": {"beta_1_per_lap": 0.105, "beta_1": 1.575, "beta_2": 0.20, "beta_0": 0.05},
        "MEDIUM": {"beta_1_per_lap": 0.072, "beta_1": 1.080, "beta_2": 0.18, "beta_0": 0.04},
        "HARD": {"beta_1_per_lap": 0.045, "beta_1": 0.675, "beta_2": 0.15, "beta_0": 0.03},
    }
    nom_w = {"FP1": 0.15, "FP2": 0.70, "FP3": 0.15}
    eff_w = {"FP1": 0.12, "FP2": 0.76, "FP3": 0.12}
    qualities = {"FP1": 0.80, "FP2": 0.95, "FP3": 0.80}

    frozen = calibrator.freeze_pre_race_calibration("Spain", 2024, fused_params, nom_w, eff_w, qualities)
    forecast = forecaster.forecast_race_weekend(frozen, total_race_laps=66)

    plan1 = optimizer.optimize_race_strategy(forecast)
    plan2 = optimizer.optimize_race_strategy(forecast)

    assert plan1.compound_sequence == plan2.compound_sequence
    assert plan1.pit_laps == plan2.pit_laps
    assert plan1.predicted_total_race_time_s == pytest.approx(plan2.predicted_total_race_time_s, abs=1e-9)
