"""
Deterministic Unit Tests: Tri-Mechanism Wear Model (tests/test_wear_model.py).
Validates mechanical abrasion, cold graining, thermal blistering, and damage integration.
"""

import pytest
from backend.physical_tyre_model import DEFAULT_COMPOUND_PARAMS, PhysicalTyreModel


@pytest.fixture
def model():
    return PhysicalTyreModel()


def test_mechanical_abrasion_power_law(model):
    """Verifies abrasion wear scales with (Q_frict / Q_ref)^w_p2."""
    comp = DEFAULT_COMPOUND_PARAMS["MEDIUM"]
    q1 = 15000.0  # Exactly Q_ref
    q2 = 30000.0  # 2 * Q_ref

    wp1, _, _, _ = model.compute_wear_rates(q1, comp.t_opt, comp)
    wp2, _, _, _ = model.compute_wear_rates(q2, comp.t_opt, comp)

    assert wp1 == pytest.approx(comp.w_p1, rel=1e-5)
    assert wp2 == pytest.approx(comp.w_p1 * (2.0 ** comp.w_p2), rel=1e-4)


def test_cold_graining_activation(model):
    """Verifies graining activates only below cold threshold t_tp_grain."""
    comp = DEFAULT_COMPOUND_PARAMS["SOFT"]  # t_tp_grain = 85°C

    # Cold tyre: 75°C (< 85°C) -> graining active
    _, wg_cold, _, _ = model.compute_wear_rates(10000.0, 75.0, comp)
    assert wg_cold > 0.0

    # Hot tyre: 95°C (> 85°C) -> graining strictly zero
    _, wg_hot, _, _ = model.compute_wear_rates(10000.0, 95.0, comp)
    assert wg_hot == 0.0


def test_thermal_blistering_activation(model):
    """Verifies blistering activates only above blister threshold t_tp_blister."""
    comp = DEFAULT_COMPOUND_PARAMS["SOFT"]  # t_tp_blister = 118°C

    # Hot tyre: 125°C (> 118°C) -> blistering active
    _, _, wb_hot, _ = model.compute_wear_rates(10000.0, 125.0, comp)
    assert wb_hot > 0.0

    # Normal tyre: 100°C (< 118°C) -> blistering strictly zero
    _, _, wb_normal, _ = model.compute_wear_rates(10000.0, 100.0, comp)
    assert wb_normal == 0.0


def test_damage_monotonicity(model):
    """Verifies cumulative damage D(t) is strictly monotonically increasing."""
    comp = DEFAULT_COMPOUND_PARAMS["MEDIUM"]
    t_tread = comp.t_opt
    t_carc = comp.t_opt - 5.0
    damage = 0.0

    damage_history = []
    for _ in range(10):
        t_tread, t_carc, damage, _, _ = model.simulate_lap_wear(
            t_tread, t_carc, damage, comp, track_temp_c=40.0, air_temp_c=25.0
        )
        damage_history.append(damage)

    for i in range(len(damage_history) - 1):
        assert damage_history[i + 1] > damage_history[i]
