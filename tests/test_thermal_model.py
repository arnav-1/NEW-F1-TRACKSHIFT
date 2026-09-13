"""
Deterministic Unit Tests: Tyre Thermodynamics (tests/test_thermal_model.py).
Validates coupled thermodynamic ODE integration, conduction, convection, and stability.
"""

import pytest
from testDaksh.physical_tyre_model import PhysicalTyreModel


@pytest.fixture
def model():
    return PhysicalTyreModel()


def test_thermal_ode_cooling(model):
    """Verifies that with zero frictional heat, a hot tyre cools towards track/air temperatures."""
    t_tread = 120.0
    t_carc = 110.0
    q_frict = 0.0
    track_temp = 30.0
    air_temp = 20.0
    dt = 1.0

    # Step ODE 10 seconds
    for _ in range(10):
        t_tread, t_carc, rec = model.step_thermal_ode(
            t_tread, t_carc, q_frict, velocity_ms=0.0, f_z_n=0.0,
            track_temp_c=track_temp, air_temp_c=air_temp, dt_s=dt
        )

    # Temperatures must drop monotonically
    assert t_tread < 120.0
    assert t_carc < 110.0
    assert rec.q_cond_w > 0  # Heat flowing out into track
    assert rec.q_conv_w > 0  # Heat flowing out into air


def test_thermal_ode_heating(model):
    """Verifies that high frictional dissipation heats the tread layer."""
    t_tread = 60.0
    t_carc = 60.0
    q_frict = 25000.0  # High sliding shear
    track_temp = 40.0
    air_temp = 25.0
    dt = 0.5

    for _ in range(20):
        t_tread, t_carc, rec = model.step_thermal_ode(
            t_tread, t_carc, q_frict, velocity_ms=50.0, f_z_n=10000.0,
            track_temp_c=track_temp, air_temp_c=air_temp, dt_s=dt
        )

    assert t_tread > 60.0
    assert t_carc > 60.0
    assert t_tread > t_carc  # Tread surface heats faster than inner carcass


def test_thermal_stability_bounds(model):
    """Verifies physical safety clamping prevents thermal divergence even under extreme inputs."""
    t_tread = 150.0
    t_carc = 140.0
    extreme_q = 500000.0  # Pathological input

    t_tread_new, t_carc_new, _ = model.step_thermal_ode(
        t_tread, t_carc, extreme_q, velocity_ms=70.0, f_z_n=20000.0,
        track_temp_c=50.0, air_temp_c=35.0, dt_s=10.0
    )

    assert 20.0 <= t_tread_new <= 180.0
    assert 20.0 <= t_carc_new <= 160.0
