"""
Deterministic Unit Tests: Continual Learning Acceptance (tests/test_learning_acceptance.py).
Validates the second continual learning loop, evidence thresholds, and step size clamping.
"""

import pytest
from testDaksh.learning_acceptance import LearningAcceptanceGatekeeper
from testDaksh.numerical_schemas import (
    LearningStatus,
    ParameterLearningUpdateRecord,
    PostRaceScorecardRecord,
)
from testDaksh.post_race_learner import PostRaceLearner


@pytest.fixture
def learner():
    return PostRaceLearner(learning_gain_k=0.25, min_evidence_stints=1)


@pytest.fixture
def gatekeeper():
    return LearningAcceptanceGatekeeper(max_shift_pct=0.30, min_evidence_stints=1)


def test_parameter_learning_update_accepted(learner, gatekeeper):
    """Verifies that an empirical discrepancy produces a bounded accepted parameter update."""
    scorecard = PostRaceScorecardRecord(
        circuit="Spain",
        year=2024,
        driver="27",
        stint_number=1,
        compound="SOFT",
        stint_length=15,
        centered_shape_mae_s=0.110,
        physical_mae_s=0.350,
        slope_error_ms_per_lap=90.0,
        predicted_pit_lap=14,
        actual_pit_lap=14,
        pit_window_error_laps=0,
        pit_captured_within_2l=True,
    )

    prop = learner.propose_parameter_update(
        target_circuit="Austria",
        source_circuit="Spain",
        compound="SOFT",
        parameter_name="w_p1",
        current_prior_value=0.045,
        scorecards=[scorecard],
    )

    accepted = gatekeeper.evaluate_acceptance(prop, [scorecard])

    assert accepted.acceptance_status == LearningStatus.UPDATE_ACCEPTED.value
    assert accepted.updated_value > accepted.old_value
    assert accepted.updated_value <= accepted.old_value * 1.30


def test_parameter_learning_insufficient_evidence(learner, gatekeeper):
    """Verifies that zero matching stints rejects the update with INSUFFICIENT_REPEATABILITY."""
    prop = learner.propose_parameter_update(
        target_circuit="Austria",
        source_circuit="Spain",
        compound="HARD",
        parameter_name="w_p1",
        current_prior_value=0.021,
        scorecards=[],  # Zero evidence
    )

    assert prop.acceptance_status == LearningStatus.INSUFFICIENT_REPEATABILITY.value
    assert prop.updated_value == prop.old_value
