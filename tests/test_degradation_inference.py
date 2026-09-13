"""
Deterministic Unit Tests: Degradation Inference (tests/test_degradation_inference.py).
Validates normalized stint age, WOLS polynomial fitting, and per-lap rate conversion.
"""

import numpy as np
import pandas as pd
import pytest

from testDaksh.practice_degradation_inferer import PracticeDegradationInferer
from testDaksh.stint_reconstructor import StintReconstructor


def test_stint_age_normalization():
    """Verifies a = (k - 1) / (N - 1) maps exactly to [0.0, 1.0]."""
    recon = StintReconstructor()
    n = 20
    laps_data = {
        "lap_number": list(range(1, n + 1)),
        "lap_time_s": [80.0 + 0.05 * i for i in range(n)],
        "compound": ["MEDIUM"] * n,
        "driver": ["27"] * n,
        "stint": [1] * n,
    }
    df = pd.DataFrame(laps_data)
    stints = recon.clean_and_segment_stints(df, is_race=False)
    assert len(stints) == 1
    s_clean = stints[0]

    assert s_clean["normalized_age"].iloc[0] == pytest.approx(0.0, abs=1e-6)
    assert s_clean["normalized_age"].iloc[-1] == pytest.approx(1.0, abs=1e-6)
    assert len(s_clean) == n


def test_wols_exact_polynomial_recovery():
    """Verifies deterministic WOLS recovers known ground truth quadratic parameters."""
    inferer = PracticeDegradationInferer()
    a = np.linspace(0.0, 1.0, 25)
    true_b0 = 0.05
    true_b1 = 1.20
    true_b2 = 0.35
    d = true_b0 + true_b1 * a + true_b2 * (a ** 2)

    b0, b1, b2, res_var = inferer.fit_stint_wols(a, d)
    assert b0 == pytest.approx(true_b0, abs=1e-3)
    assert b1 == pytest.approx(true_b1, abs=1e-3)
    assert b2 == pytest.approx(true_b2, abs=1e-3)
    assert res_var < 1e-5


def test_per_lap_rate_distinction():
    """Verifies beta_1_lap is normalized by (N - 1) and not equal to stint beta_1."""
    inferer = PracticeDegradationInferer()
    n = 21
    a = np.linspace(0.0, 1.0, n)
    d = 0.10 + 2.0 * a  # beta_1 = 2.0 over stint

    b0, b1, b2, _ = inferer.fit_stint_wols(a, d)
    b1_lap = b1 / (n - 1)

    assert b1 == pytest.approx(2.0, abs=1e-3)
    assert b1_lap == pytest.approx(0.10, abs=1e-4)  # 2.0 / 20 = 0.10 s/lap
