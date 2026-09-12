"""
Unit tests for Degradation Estimation Pipeline (DEP).
"""

import numpy as np
import pandas as pd
import pytest

from src.dep.degradation import (
    TriMechanismWearModel,
    PolynomialDegradationFitter,
    CliffDetector,
    DegradationPipeline,
)


def test_tri_mechanism_wear_model_physics():
    """Verifies physical behavior of the tri-mechanism wear model."""
    wear_model = TriMechanismWearModel(
        wp1=1e-4, wp2=1.2,
        wg1=5e-5, wg2=1.5,
        wb1=8e-5, wb2=1.8,
        q_ref=1000.0,
    )

    # 1. Mechanical abrasion monotonicity with respect to Q_frict
    wear_low_q = wear_model.compute_wear_rate(q_frict=500.0, t_tread_c=100.0, compound="MEDIUM")
    wear_high_q = wear_model.compute_wear_rate(q_frict=1500.0, t_tread_c=100.0, compound="MEDIUM")
    assert wear_high_q.abrasion_rate > wear_low_q.abrasion_rate

    # 2. Cold graining: active only below t_transition_grain (95°C for Medium)
    wear_cold = wear_model.compute_wear_rate(q_frict=1000.0, t_tread_c=80.0, compound="MEDIUM")
    wear_optimal = wear_model.compute_wear_rate(q_frict=1000.0, t_tread_c=105.0, compound="MEDIUM")
    assert wear_cold.graining_rate > 0.0
    assert wear_optimal.graining_rate == 0.0

    # 3. Thermal blistering: active only above t_blister_threshold (128°C for Medium)
    wear_hot = wear_model.compute_wear_rate(q_frict=1000.0, t_tread_c=135.0, compound="MEDIUM")
    assert wear_hot.blistering_rate > 0.0
    assert wear_optimal.blistering_rate == 0.0

    # 4. Monotonic accumulation of D(t)
    q_series = pd.Series([800.0, 950.0, 1100.0, 1200.0])
    t_series = pd.Series([100.0, 105.0, 110.0, 115.0])
    wear_df = wear_model.accumulate_stint_wear(q_series, t_series, compound="MEDIUM")
    assert (np.diff(wear_df["accumulated_D"]) > 0).all()


def test_polynomial_degradation_fitter_synthetic():
    """Verifies quadratic curve fitting on synthetic pace series."""
    t = np.arange(1, 16, dtype=float)  # 15 laps
    base_true = 78.5
    alpha_true = 0.08
    beta_true = 0.004

    # Perfect quadratic pace + subtle noise
    np.random.seed(42)
    noise = np.random.normal(0, 0.03, size=len(t))
    y = base_true + alpha_true * t + beta_true * (t ** 2) + noise

    fitter = PolynomialDegradationFitter()
    res = fitter.fit_stint(tyre_age_laps=t, corrected_lap_times_s=y, compound="SOFT", driver="VER", stint=1)

    assert res is not None
    assert res.base_pace_s == pytest.approx(base_true, abs=0.2)
    assert res.alpha == pytest.approx(alpha_true, abs=0.03)
    assert res.beta == pytest.approx(beta_true, abs=0.002)
    assert res.r_squared > 0.90


def test_cliff_detector():
    """Verifies analytical and empirical stint cliff identification."""
    detector = CliffDetector(marginal_threshold_s_per_lap=0.25)

    # Analytical test: alpha=0.05, beta=0.005 -> t_cliff = (0.25 - 0.05) / (2 * 0.005) = 20 laps
    t = np.arange(1, 25, dtype=float)
    y = 79.0 + 0.05 * t + 0.005 * (t ** 2)
    fitter = PolynomialDegradationFitter()
    fit_res = fitter.fit_stint(t, y, compound="MEDIUM", driver="NOR")

    cliff_res = detector.detect_cliff(fit_result=fit_res)
    assert cliff_res.cliff_detected
    assert cliff_res.cliff_lap == pytest.approx(20.0, abs=1.0)
    assert cliff_res.detection_method == "analytical"

    # Empirical test on cliff drop
    tyre_age = np.arange(1, 10, dtype=float)
    pace_cliff = np.array([79.0, 79.1, 79.2, 79.3, 79.4, 79.8, 80.3, 80.7, 81.2])
    emp_res = detector.detect_cliff(tyre_age_laps=tyre_age, observed_pace_s=pace_cliff)
    assert emp_res.cliff_detected
    assert emp_res.detection_method == "empirical"
    assert emp_res.cliff_lap in [6.0, 7.0]


def test_degradation_pipeline_dataset_fit():
    """Verifies dataset-level orchestration of DEP across multiple stints."""
    records = []
    for drv in ["HAM", "RUS"]:
        for lap in range(1, 11):
            records.append({
                "driver": drv,
                "stint": 1,
                "compound": "MEDIUM",
                "tyre_life": float(lap),
                "lap_time_fully_corrected_s": 79.0 + 0.07 * lap + 0.002 * (lap ** 2),
            })
    df = pd.DataFrame(records)

    pipeline = DegradationPipeline()
    res = pipeline.fit_dataset(df)

    assert len(res["stint_fits"]) == 2
    assert "MEDIUM" in res["compound_models"]
    assert len(res["summary_table"]) == 2
    assert "alpha_deg_s_per_lap" in res["summary_table"].columns


def test_four_wheel_state_matrix_and_limiting_wheel():
    """
    Verifies FourWheelState data structures:
    vec{D}(t) = [D_FL, D_FR; D_RL, D_RR]
    Asserts (2, 2) matrix, (4,) vector representations, and limiting wheel identification.
    """
    from src.dep.degradation import FourWheelState

    state = FourWheelState(fl=1.45, fr=0.85, rl=1.20, rr=0.75)

    # Matrix (2, 2)
    mat = state.as_matrix()
    assert isinstance(mat, np.ndarray)
    assert mat.shape == (2, 2)
    assert mat[0, 0] == 1.45  # FL
    assert mat[0, 1] == 0.85  # FR
    assert mat[1, 0] == 1.20  # RL
    assert mat[1, 1] == 0.75  # RR

    # Vector (4,)
    vec = state.as_vector()
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (4,)
    assert np.array_equal(vec, np.array([1.45, 0.85, 1.20, 0.75]))

    # Limiting wheel and max wear
    assert state.limiting_wheel == "FL"
    assert state.max_wear == pytest.approx(1.45, abs=1e-5)


def test_asymmetric_load_allocator_roll_and_pitch():
    """
    Verifies dynamic load transfer proxies across the 4 corners:
    - Right turn (kappa > 0): transfers weight to outer left (FL, RL)
    - Left turn (kappa < 0): transfers weight to outer right (FR, RR)
    - Longitudinal braking (a_lon < 0): transfers weight to front axle
    - Longitudinal traction (a_lon > 0): transfers weight to rear axle
    - Sum across wheels == 1.0
    """
    from src.dep.degradation import AsymmetricLoadAllocator

    allocator = AsymmetricLoadAllocator(static_front_bias=0.45, k_roll=0.28, k_pitch=0.16)

    # 1. Right-hand corner under moderate cornering (a_lat = 25 m/s^2, ~2.5g)
    right_shares = allocator.compute_wheel_work_shares(kappa=0.01, a_lat_ms2=25.0, a_lon_ms2=0.0)
    assert sum(right_shares.values()) == pytest.approx(1.0, abs=1e-5)
    # Outer tyres (left side) bear greater workload than inner tyres (right side)
    assert right_shares["FL"] > right_shares["FR"]
    assert right_shares["RL"] > right_shares["RR"]

    # 2. Left-hand corner
    left_shares = allocator.compute_wheel_work_shares(kappa=-0.01, a_lat_ms2=25.0, a_lon_ms2=0.0)
    assert sum(left_shares.values()) == pytest.approx(1.0, abs=1e-5)
    assert left_shares["FR"] > left_shares["FL"]
    assert left_shares["RR"] > left_shares["RL"]

    # 3. Heavy braking in straight line (a_lon = -15 m/s^2, ~ -1.5g)
    braking_shares = allocator.compute_wheel_work_shares(kappa=0.0, a_lat_ms2=0.0, a_lon_ms2=-15.0)
    assert sum(braking_shares.values()) == pytest.approx(1.0, abs=1e-5)
    front_share = braking_shares["FL"] + braking_shares["FR"]
    rear_share = braking_shares["RL"] + braking_shares["RR"]
    assert front_share > 0.55  # pitch forward bias
    assert front_share > rear_share

    # 4. Heavy traction acceleration out of slow corner (a_lon = +6 m/s^2)
    traction_shares = allocator.compute_wheel_work_shares(kappa=0.0, a_lat_ms2=0.0, a_lon_ms2=6.0)
    assert sum(traction_shares.values()) == pytest.approx(1.0, abs=1e-5)
    front_trac = traction_shares["FL"] + traction_shares["FR"]
    rear_trac = traction_shares["RL"] + traction_shares["RR"]
    assert rear_trac > front_trac  # pitch rearward to drive wheels


def test_four_wheel_asymmetric_wear_accumulation_clockwise():
    """
    Verifies that integrating 4-wheel wear on a clockwise layout (like Barcelona)
    produces higher wear on the Front-Left tyre: D_FL > D_FR.
    """
    from src.dep.degradation import TriMechanismWearModel

    wear_model = TriMechanismWearModel()

    n_laps = 12
    q_series = pd.Series([1100.0] * n_laps)
    t_series = pd.Series([105.0] * n_laps)
    a_lat_series = pd.Series([20.0] * n_laps)  # 2.0g lateral
    a_lon_series = pd.Series([-5.0] * n_laps)  # braking entry

    wear_df = wear_model.accumulate_four_wheel_stint_wear(
        q_frict_series=q_series,
        t_tread_series=t_series,
        a_lat_series=a_lat_series,
        a_lon_series=a_lon_series,
        compound="MEDIUM",
        circuit_direction="clockwise",
    )

    assert len(wear_df) == n_laps
    assert "D_FL" in wear_df.columns
    assert "D_FR" in wear_df.columns
    assert "D_RL" in wear_df.columns
    assert "D_RR" in wear_df.columns

    # On a clockwise layout, Front-Left experiences higher wear than Front-Right
    last_row = wear_df.iloc[-1]
    assert last_row["D_FL"] > last_row["D_FR"]
    assert last_row["limiting_wheel"] == "FL"
    assert last_row["max_wear"] == pytest.approx(last_row["D_FL"], abs=1e-5)

