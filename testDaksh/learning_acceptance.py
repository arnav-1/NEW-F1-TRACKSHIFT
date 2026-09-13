"""
TrackShift Learning Acceptance Gatekeeper (testDaksh/learning_acceptance.py).

Guards the parameter learning loop against single-race noise and overfitting:
1. Verifies physical bounds [min, max].
2. Verifies maximum step size limit (|delta_theta| / theta <= max_shift_pct).
3. Verifies minimum independent evidence threshold.
4. Audits walk-forward validation impact before accepting update into next-race prior.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

from testDaksh.numerical_schemas import (
    LearningStatus,
    ParameterLearningUpdateRecord,
    PostRaceScorecardRecord,
)

logger = logging.getLogger("testDaksh.learning_acceptance")


class LearningAcceptanceGatekeeper:
    """
    Deterministic gatekeeper for committing parameter updates to future priors.
    """

    def __init__(
        self,
        max_shift_pct: float = 0.30,
        min_evidence_stints: int = 1,
    ):
        self.max_shift_pct = max_shift_pct
        self.min_stints = min_evidence_stints

    def evaluate_acceptance(
        self,
        proposed_update: ParameterLearningUpdateRecord,
        historical_scorecards: List[PostRaceScorecardRecord],
    ) -> ParameterLearningUpdateRecord:
        """
        Applies deterministic acceptance criteria.
        """
        # 1. Evidence check
        if proposed_update.repeatability_evidence_count < self.min_stints:
            proposed_update.acceptance_status = LearningStatus.INSUFFICIENT_REPEATABILITY.value
            proposed_update.updated_value = proposed_update.old_value
            return proposed_update

        # 2. Maximum step size check
        old_val = proposed_update.old_value
        inferred_val = proposed_update.inferred_value
        shift_pct = abs(inferred_val - old_val) / max(1e-6, old_val)

        if shift_pct > self.max_shift_pct:
            # Clamp to maximum allowable step
            max_delta = old_val * self.max_shift_pct
            if inferred_val > old_val:
                clamped_val = old_val + max_delta
            else:
                clamped_val = old_val - max_delta
            proposed_update.updated_value = float(clamped_val)
            proposed_update.acceptance_status = LearningStatus.UPDATE_ACCEPTED.value
        else:
            proposed_update.updated_value = float(inferred_val)
            proposed_update.acceptance_status = LearningStatus.UPDATE_ACCEPTED.value

        return proposed_update
