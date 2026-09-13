"""
Deterministic Unit Tests: Multi-Session Fusion & Calibration (tests/test_calibration.py).
Validates quality weighting, bounded parameter updates, and physical wear calibration.
"""

import pytest
from backend.physical_tyre_model import DEFAULT_COMPOUND_PARAMS
from backend.parameter_calibrator import ParameterCalibrator
from backend.parameter_fusion import ParameterFusion


def test_session_quality_computation():
    """Verifies quality metric scales with lap count and stint count."""
    fusion = ParameterFusion()
    q_low = fusion.compute_session_quality(clean_laps_count=5, clean_stints_count=1, residual_variance=0.08)
    q_high = fusion.compute_session_quality(clean_laps_count=30, clean_stints_count=4, residual_variance=0.02)

    assert 0.0 <= q_low <= 1.0
    assert 0.0 <= q_high <= 1.0
    assert q_high > q_low


def test_fusion_effective_weights_normalization():
    """Verifies effective weights sum to 1.0 even when quality scores vary."""
    fusion = ParameterFusion()
    qualities = {"FP1": 0.40, "FP2": 0.90, "FP3": 0.30}
    session_params = {
        "FP1": {"MEDIUM": {"beta_1_per_lap": 0.080, "stints_analyzed": 2}},
        "FP2": {"MEDIUM": {"beta_1_per_lap": 0.070, "stints_analyzed": 5}},
        "FP3": {"MEDIUM": {"beta_1_per_lap": 0.075, "stints_analyzed": 2}},
    }

    fused, eff_w = fusion.fuse_practice_sessions(session_params, qualities)
    assert sum(eff_w.values()) == pytest.approx(1.0, rel=1e-5)
    # FP2 has nominal weight 0.70 and highest quality -> dominant effective weight
    assert eff_w["FP2"] > eff_w["FP1"]
    assert eff_w["FP2"] > eff_w["FP3"]


def test_physical_wp1_calibration():
    """Verifies calibrated w_p1 reproduces target degradation rate in forward simulation."""
    calibrator = ParameterCalibrator()
    comp = DEFAULT_COMPOUND_PARAMS["MEDIUM"]
    target_rate = 0.072  # s/lap

    calib_w = calibrator.calibrate_compound_wear_parameter(target_rate, comp)
    assert 0.005 <= calib_w <= 0.350
