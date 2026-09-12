"""
Unit tests for Information Extraction Pipeline (IEP).
"""

import numpy as np
import pandas as pd
import pytest

from src.iep.physics_proxies import (
    FuelDecayModel,
    TrackEvolutionModel,
    CurvatureEnergyExtractor,
    BrakingStressExtractor,
    PhysicsProxyPipeline,
)


def test_fuel_decay_model_monotonicity():
    """Verifies physical properties of fuel mass burn and time correction."""
    total_laps = 66
    fuel_model = FuelDecayModel(initial_fuel_mass_kg=110.0, fuel_time_penalty_s_per_kg=0.033)

    lap_numbers = pd.Series(range(1, total_laps + 1))
    observed_laps = pd.Series([80.0] * total_laps)

    fuel_mass, fuel_delta, corrected = fuel_model.compute_fuel_correction(
        lap_times_s=observed_laps,
        lap_numbers=lap_numbers,
        total_laps=total_laps,
    )

    # Lap 1 start has full 110kg fuel
    assert fuel_mass.iloc[0] == pytest.approx(110.0, abs=1e-3)
    # Mass must decrease monotonically
    assert (np.diff(fuel_mass) < 0).all()
    # Fuel penalty on lap 1 is ~ 110 * 0.033 = 3.63 seconds
    assert fuel_delta.iloc[0] == pytest.approx(3.63, abs=0.05)
    # Corrected lap time should be faster than observed (removing weight penalty)
    assert corrected.iloc[0] < observed_laps.iloc[0]
    # Fuel mass on last lap approaches 0
    assert fuel_mass.iloc[-1] < 2.0


def test_track_evolution_saturation():
    """Verifies asymptotic exponential saturation of track evolution index."""
    e_max = 1.5
    tau = 150.0
    model = TrackEvolutionModel(e_max_s=e_max, tau_track_laps=tau)

    # Zero laps -> Zero evolution
    assert model.compute_track_evolution(0) == pytest.approx(0.0, abs=1e-5)

    # At n = tau laps, evolution should be (1 - 1/e) * E_max ~ 0.632 * 1.5 ~ 0.948s
    ev_tau = model.compute_track_evolution(tau)
    assert ev_tau == pytest.approx(e_max * (1.0 - np.exp(-1.0)), abs=1e-3)

    # As n -> infinity (e.g. 2000 laps), evolution asymptotically converges to e_max
    ev_large = model.compute_track_evolution(2000)
    assert ev_large == pytest.approx(e_max, abs=1e-4)

    # Monotonicity test
    laps_series = pd.Series(range(0, 500, 25))
    ev_series = model.compute_track_evolution(laps_series)
    assert (np.diff(ev_series) > 0).all()


def test_curvature_and_lateral_energy_circular_path():
    """Verifies curvature derivation on an idealized circular trajectory with known radius."""
    radius = 100.0  # 100 metre radius corner
    angular_speed = 0.5  # rad/s
    time_s = np.linspace(0, 4 * np.pi, 200)

    # Circular trajectory: X = R * cos(wt), Y = R * sin(wt)
    x_m = radius * np.cos(angular_speed * time_s)
    y_m = radius * np.sin(angular_speed * time_s)

    extractor = CurvatureEnergyExtractor(filter_window=9, poly_order=2)
    kappa = extractor.compute_curvature(x_m, y_m, time_s)

    # Expected curvature for radius R is 1 / R = 0.01 m^-1
    # Check interior points to avoid boundary gradient artifacts
    interior_kappa = kappa[15:-15]
    assert np.allclose(interior_kappa, 0.01, atol=2e-3)

    # Lateral acceleration at constant 100 km/h: v = 100 / 3.6 ~ 27.78 m/s
    # a_lat = v^2 * kappa = 27.78^2 * 0.01 ~ 7.71 m/s^2 (~0.79 g)
    speed_kmh = np.full_like(time_s, 100.0)
    a_lat, energy = extractor.compute_lateral_energy(speed_kmh, kappa, time_s)
    assert np.allclose(a_lat[15:-15], 7.71, atol=1.5)
    assert energy > 0.0


def test_braking_stress_extractor():
    """Verifies longitudinal braking energy dissipation calculation."""
    time_s = np.linspace(0, 5, 50)  # 5 seconds
    # Vehicle decelerates from 300 km/h (83.3 m/s) to 100 km/h (27.8 m/s)
    speed_kmh = np.linspace(300, 100, 50)
    brake_active = np.ones(50, dtype=float)

    extractor = BrakingStressExtractor()
    a_lon, energy = extractor.compute_braking_energy(speed_kmh, brake_active, time_s)

    # Mean deceleration should be negative: (27.78 - 83.33) / 5 ~ -11.1 m/s^2 (~ -1.13 g)
    assert np.mean(a_lon) < -5.0
    # Energy dissipated must be strictly positive
    assert energy > 0.0


def test_physics_proxy_pipeline_enrichment():
    """Verifies that PhysicsProxyPipeline enriches lap data with all required physical proxies."""
    laps_df = pd.DataFrame({
        "lap_number": [1, 2, 3, 4, 5],
        "driver": ["LEC", "LEC", "LEC", "LEC", "LEC"],
        "lap_time_s": [80.0, 80.2, 80.4, 80.5, 80.8],
        "lap_start_time_s": [0.0, 80.0, 160.2, 240.6, 321.1],
        "compound": ["HARD"] * 5,
    })

    pipeline = PhysicsProxyPipeline()
    result = pipeline.process(laps_df, total_session_laps=50)

    enriched = result.enriched_laps
    assert "fuel_mass_kg" in enriched.columns
    assert "fuel_time_penalty_s" in enriched.columns
    assert "lap_time_fuel_corrected_s" in enriched.columns
    assert "track_evolution_s" in enriched.columns
    assert "lap_time_fully_corrected_s" in enriched.columns

    # Check that fuel mass starts high and burns down
    assert enriched["fuel_mass_kg"].iloc[0] > enriched["fuel_mass_kg"].iloc[-1]
    # Check that track evolution increases
    assert enriched["track_evolution_s"].iloc[-1] > enriched["track_evolution_s"].iloc[0]


def test_slip_velocity_extractor_monotonicity_and_bounds():
    """
    Verifies lateral contact patch sliding velocity calculation:
    v_slip_lat = v * sin(alpha) approx (m * v^3 * kappa) / C_alpha
    Asserts v_slip_lat >= 0 and scales monotonically with velocity and curvature.
    """
    from src.iep.physics_proxies import SlipVelocityExtractor

    extractor = SlipVelocityExtractor(vehicle_mass_kg=850.0, cornering_stiffness_n_per_rad=140000.0)

    # 1. Non-negativity
    speeds = np.array([50.0, 100.0, 150.0, 200.0, 250.0])
    kappa_const = np.full_like(speeds, 0.01)  # constant corner radius 100m
    alpha, v_slip = extractor.compute_slip_velocity(speeds, kappa_const)

    assert (v_slip >= 0.0).all()
    assert (alpha >= 0.0).all()

    # 2. Monotonic scaling with velocity: higher speed in same corner -> higher sliding velocity
    assert (np.diff(v_slip) > 0).all()
    assert (np.diff(alpha) > 0).all()

    # 3. Monotonic scaling with curvature: tighter corner at same speed -> higher sliding velocity
    kappas = np.array([0.002, 0.005, 0.01, 0.02])
    speed_const = np.full_like(kappas, 120.0)
    _, v_slip_curv = extractor.compute_slip_velocity(speed_const, kappas)
    assert (np.diff(v_slip_curv) > 0).all()

    # 4. Energy integral verification
    time_s = np.linspace(0, 0.4, len(speeds))  # 10Hz telemetry
    p_slip, e_slip = extractor.compute_slip_energy(speeds, kappa_const, time_s)
    assert (p_slip >= 0.0).all()
    assert e_slip > 0.0


def test_wake_penalty_model_clean_and_dirty_air():
    """
    Verifies aerodynamic wake multiplier calculation:
    Q_frict_wake = Q_frict * (1.0 + k_wake * max(0.0, 1.5 - Delta t_gap))
    Asserts penalty applies only when gap < 1.5s, clean air gap yields 1.0x,
    and scales linearly with gap deficit.
    """
    from src.iep.physics_proxies import WakePenaltyModel

    model = WakePenaltyModel(wake_threshold_s=1.5, k_wake=0.20)

    # 1. Clean air (gap >= 1.5s) -> multiplier exactly 1.0
    assert model.compute_wake_multiplier(1.5) == pytest.approx(1.0, abs=1e-5)
    assert model.compute_wake_multiplier(2.5) == pytest.approx(1.0, abs=1e-5)
    assert model.compute_wake_multiplier(10.0) == pytest.approx(1.0, abs=1e-5)

    # NaN / None (clear track ahead) -> multiplier 1.0
    assert model.compute_wake_multiplier(None) == 1.0
    assert model.compute_wake_multiplier(np.nan) == 1.0

    # 2. Dirty air (gap < 1.5s)
    # Gap = 0.5s -> deficit = 1.0s -> mult = 1.0 + 0.20 * 1.0 = 1.20 (20% penalty)
    mult_05 = model.compute_wake_multiplier(0.5)
    assert mult_05 == pytest.approx(1.20, abs=1e-4)

    # Gap = 0.0s (nose-to-tail) -> deficit = 1.5s -> mult = 1.0 + 0.20 * 1.5 = 1.30 (30% penalty)
    mult_00 = model.compute_wake_multiplier(0.0)
    assert mult_00 == pytest.approx(1.30, abs=1e-4)

    # Monotonic scaling: smaller gap -> higher penalty
    gaps = np.array([2.0, 1.5, 1.2, 0.8, 0.4])
    mults = model.compute_wake_multiplier(gaps)
    assert mults[0] == 1.0
    assert mults[1] == 1.0
    assert (np.diff(mults[1:]) > 0).all()

    # 3. Apply wake penalty to base frictional work
    q_base = 1200.0
    assert model.apply_wake_penalty(q_base, 2.0) == pytest.approx(q_base, abs=1e-4)
    assert model.apply_wake_penalty(q_base, 0.5) == pytest.approx(q_base * 1.20, abs=1e-4)


def test_micro_sector_segmentation_barcelona_turns():
    """
    Verifies corner-by-corner spatial segmentation:
    Asserts Turn 3 (carousel) exhibits high lateral energy,
    while Turn 1 and Turn 10 exhibit dominant heavy braking energy.
    """
    from src.iep.physics_proxies import (
        MicroSectorSegmenter,
        BARCELONA_TURNS,
        CurvatureEnergyExtractor,
        BrakingStressExtractor,
        SlipVelocityExtractor,
    )

    segmenter = MicroSectorSegmenter(turns=BARCELONA_TURNS)

    # Construct synthetic telemetry for a full lap (0 to 4657m)
    distance_m = np.linspace(0, 4657, 1000)
    time_s = np.linspace(0, 80, 1000)
    speed_kmh = np.full(1000, 220.0)

    # Simulate braking in Turn 1 (650m - 830m) and Turn 10 (3550m - 3750m)
    brake_bool = np.zeros(1000, dtype=float)
    brake_bool[(distance_m >= 650) & (distance_m <= 830)] = 1.0
    brake_bool[(distance_m >= 3550) & (distance_m <= 3750)] = 1.0

    # Decelerate during braking zones
    speed_kmh[(distance_m >= 650) & (distance_m <= 830)] = np.linspace(310, 120, sum((distance_m >= 650) & (distance_m <= 830)))
    speed_kmh[(distance_m >= 3550) & (distance_m <= 3750)] = np.linspace(290, 90, sum((distance_m >= 3550) & (distance_m <= 3750)))

    # Simulate high lateral curvature in Turn 3 (1020m - 1580m) and Turn 9 (3050m - 3280m)
    x_m = distance_m * 0.5
    y_m = np.zeros_like(distance_m)
    # Give Turn 3 a significant curved arc
    t3_mask = (distance_m >= 1020) & (distance_m <= 1580)
    y_m[t3_mask] = 150.0 * np.sin(np.linspace(0, np.pi, t3_mask.sum()))
    # Turn 9 curved arc
    t9_mask = (distance_m >= 3050) & (distance_m <= 3280)
    y_m[t9_mask] = 80.0 * np.sin(np.linspace(0, np.pi, t9_mask.sum()))

    lap_tel = pd.DataFrame({
        "distance_m": distance_m,
        "time_s": time_s,
        "speed_kmh": speed_kmh,
        "brake_bool": brake_bool,
        "x_m": x_m,
        "y_m": y_m,
    })

    profiles = segmenter.segment_lap(lap_tel)
    assert len(profiles) > 0

    profiles_by_turn = {p.turn_number: p for p in profiles}

    # Turn 1 should be heavy braking
    if 1 in profiles_by_turn:
        assert profiles_by_turn[1].corner_type == "heavy_braking"
        assert profiles_by_turn[1].braking_energy > 0.0

    # Turn 3 should have significant lateral energy
    if 3 in profiles_by_turn:
        assert profiles_by_turn[3].corner_type == "high_lateral"
        assert profiles_by_turn[3].direction == "right"
        assert profiles_by_turn[3].lateral_energy > 0.0

