"""
Deterministic Unit Tests: Vehicle Dynamics & Frictional Power (tests/test_physics.py).
Validates TIER 1 and TIER 2 physical equations against analytical baselines.
"""

import math
import numpy as np
import pytest

from backend.physical_tyre_model import PhysicalTyreModel


@pytest.fixture
def model():
    return PhysicalTyreModel()


def test_curvature_circle(model):
    """Verifies curvature of a perfect circle of radius R=200m is exactly 1/R = 0.005 m^-1."""
    theta = np.linspace(0, 2 * np.pi, 500)
    r = 200.0
    x = r * np.cos(theta)
    y = r * np.sin(theta)

    kappa = model.compute_curvature(x, y)
    # Exclude boundary points of numerical gradient
    inner_kappa = kappa[10:-10]
    expected = 1.0 / r
    np.testing.assert_allclose(inner_kappa, expected, rtol=1e-2)


def test_lateral_acceleration(model):
    """Verifies a_y = v^2 * kappa."""
    v = 50.0  # m/s
    kappa = 0.004  # 1/m (R=250m)
    a_y = model.compute_lateral_acceleration(v, kappa)
    assert a_y == pytest.approx(10.0, rel=1e-5)


def test_normal_load(model):
    """Verifies F_z = mg + 0.5 * rho * C_L * A * v^2."""
    v = 60.0  # m/s
    # Gravity: 798 * 9.81 = 7828.38 N
    # Aero: 0.5 * 1.184 * 3.80 * 3600 = 8103.84 N
    # Total: ~15932.22 N
    f_z = model.compute_normal_load(v, fuel_mass_kg=0.0)
    expected_gravity = 798.0 * 9.81
    expected_aero = 0.5 * 1.184 * 3.80 * (60.0 ** 2)
    assert f_z == pytest.approx(expected_gravity + expected_aero, rel=1e-5)


def test_slip_angle_linearity(model):
    """Verifies linear slip angle pre-saturation."""
    f_y = 4000.0  # N
    c_alpha = 145000.0
    v = 50.0
    alpha = model.compute_slip_angle(f_y, c_alpha, v)
    assert 0.0 < alpha < 0.20


def test_sliding_velocity(model):
    """Verifies v_slip,lat = v * sin(alpha)."""
    v = 60.0
    alpha = 0.05
    v_slip = model.compute_sliding_velocity(v, alpha)
    assert v_slip == pytest.approx(v * math.sin(alpha), rel=1e-6)


def test_frictional_power(model):
    """Verifies Q_frict = p1 * v * (|Fx * kappa| + |Fy * tan(alpha)|)."""
    v = 50.0
    f_y = 5000.0
    alpha = 0.04
    q_frict = model.compute_frictional_power(v, 0.0, f_y, 0.002, alpha)
    expected = 0.50 * 50.0 * (5000.0 * math.tan(alpha))
    assert q_frict == pytest.approx(expected, rel=1e-4)
