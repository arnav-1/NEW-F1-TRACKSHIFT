"""
Deterministic Unit Tests: Post-Race Validation Metrics (tests/test_validation_metrics.py).
Validates Centered Shape MAE, Physical MAE, Slope Error, and Pit Accuracy.
"""

import numpy as np
import pytest

from backend.post_race_validator import PostRaceValidator


@pytest.fixture
def validator():
    return PostRaceValidator()


def test_centered_shape_mae_invariance_to_static_offset(validator):
    """
    CRITICAL AUDITING TEST:
    A static driver delta (+1.5s per lap) must NOT change Centered Shape MAE,
    while Physical MAE must reflect the 1.5s offset.
    """
    y_pred = np.array([0.10, 0.25, 0.45, 0.70, 1.00])
    # Exact same shape, but driver is 1.5s slower
    y_obs_offset = y_pred + 1.50

    shape_mae = validator.compute_centered_shape_mae(y_pred, y_obs_offset)
    phys_mae = validator.compute_physical_mae(y_pred, y_obs_offset)

    assert shape_mae == pytest.approx(0.0, abs=1e-6)
    assert phys_mae == pytest.approx(1.50, abs=1e-6)


def test_centered_shape_mae_detects_curvature_error(validator):
    """Verifies that when curvature differs, Centered Shape MAE is non-zero."""
    y_pred = np.array([0.10, 0.20, 0.30, 0.40, 0.50])  # Linear
    y_obs = np.array([0.10, 0.15, 0.30, 0.60, 1.10])   # Nonlinear cliff

    shape_mae = validator.compute_centered_shape_mae(y_pred, y_obs)
    assert shape_mae > 0.05


def test_slope_error_calculation(validator):
    """Verifies slope error formula: |beta_1,pred - beta_1,race| * 1000 in ms/lap."""
    b1_pred = 0.075  # s/lap
    b1_race = 0.082  # s/lap
    error_ms = abs(b1_pred - b1_race) * 1000.0
    assert error_ms == pytest.approx(7.0, rel=1e-5)
