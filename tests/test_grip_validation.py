"""
Deterministic Unit Tests: Telemetric Grip Validation (tests/test_grip_validation.py).
Validates non-circular lateral grip extraction and aerodynamic downforce normalization.
"""

import pytest
from backend.telemetric_grip_validator import TelemetricGripValidator


@pytest.fixture
def validator():
    return TelemetricGripValidator()


def test_aero_normalization_factor(validator):
    """Verifies Gamma_aero increases quadratically with speed."""
    gamma_slow = validator.compute_aero_normalization(velocity_ms=30.0)
    gamma_fast = validator.compute_aero_normalization(velocity_ms=60.0)

    assert gamma_slow > 1.0
    assert gamma_fast > gamma_slow
    # At 60 m/s: downforce ~8100 N, gravity ~7828 N -> Gamma ~2.03
    assert gamma_fast == pytest.approx(2.035, rel=1e-2)


def test_telemetry_grip_trajectory_correlation(validator):
    """Verifies correlation is high when telemetry grip decays alongside model grip."""
    # Simulated 10-lap stint
    model_mus = [1.45, 1.43, 1.40, 1.38, 1.35, 1.32, 1.28, 1.25, 1.20, 1.15]
    # Telemetry apex speeds decaying from 62 m/s to 58 m/s
    apex_speeds = [62.0, 61.8, 61.4, 61.1, 60.7, 60.2, 59.6, 59.1, 58.6, 58.0]

    record = validator.validate_grip_trajectory(
        circuit="Spain",
        year=2024,
        driver="27",
        stint_number=1,
        compound="SOFT",
        model_mu_trajectory=model_mus,
        telemetry_apex_speeds_ms=apex_speeds,
    )

    assert record.status_code == 0
    assert record.correlation > 0.85
    assert record.rmse < 0.15


def test_insufficient_telemetry_handling(validator):
    """Verifies status_code=1 when fewer than 4 telemetry points are available."""
    record = validator.validate_grip_trajectory(
        circuit="Spain",
        year=2024,
        driver="27",
        stint_number=1,
        compound="SOFT",
        model_mu_trajectory=[1.45, 1.40],
        telemetry_apex_speeds_ms=[62.0, 61.0],
    )
    assert record.status_code == 1
    assert record.sample_points_count == 2
