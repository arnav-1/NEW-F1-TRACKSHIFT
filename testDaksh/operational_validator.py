"""
testDaksh: Operational Strategy Decision Validation Engine.

Layer 3: Operational Decision Validation (Pillars 7 & 8)
Evaluates whether model forecasts produce correct strategic decisions on the pit wall:
1. Pit Window Recommendation Error (optimal projected pit lap vs actual box lap)
2. Safe Stint Life Margin (projected cliff threshold vs stint length)
3. Compound Selection Preference Ordering (concordance of Soft/Medium/Hard wear rankings)
4. Strategy Decision Attribution ("What would have changed the pit call?")
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("testDaksh.operational")
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] [OperationalValidator] %(message)s")


class OperationalValidator:
    """
    Validates operational strategy usefulness and decision fidelity.
    """

    def __init__(self, pit_stop_loss_s: float = 22.0):
        self.pit_stop_loss_s = pit_stop_loss_s

    def evaluate_pit_window_decision(
        self,
        stint_result: Dict[str, Any],
        deg_pred_traj: np.ndarray,
        deg_obs_traj: np.ndarray,
        crossover_threshold_s: float = 1.8,
    ) -> Dict[str, Any]:
        """
        Pillar 7: Evaluates pit-window recommendation error.
        Optimal pit lap occurs when tyre degradation penalty exceeds the fresh-tyre delta crossover.
        """
        n_laps = len(deg_pred_traj)
        
        # Predicted optimal pit lap: where predicted degradation exceeds threshold
        pred_exceed = np.where(deg_pred_traj >= crossover_threshold_s)[0]
        pred_box_lap = int(pred_exceed[0] + 1) if len(pred_exceed) > 0 else n_laps

        # Observed optimal pit lap from actual degradation
        obs_exceed = np.where(deg_obs_traj >= crossover_threshold_s)[0]
        obs_box_lap = int(obs_exceed[0] + 1) if len(obs_exceed) > 0 else n_laps

        actual_box_lap = n_laps
        pit_window_error = abs(pred_box_lap - obs_box_lap)
        within_tolerance = pit_window_error <= 2

        # Safe stint life margin: remaining laps before cliff / critical decay
        safe_stint_margin = max(0, pred_box_lap - actual_box_lap)

        return {
            "predicted_box_lap": pred_box_lap,
            "observed_box_lap": obs_box_lap,
            "actual_stint_laps": actual_box_lap,
            "pit_window_error_laps": pit_window_error,
            "within_strategic_tolerance": within_tolerance,
            "safe_stint_margin_laps": safe_stint_margin,
            "strategic_verdict": "CALL_MATCHED" if within_tolerance else "PIT_OFFSET_EXCEEDED",
        }

    def evaluate_compound_selection_ranking(
        self,
        compound_deg_rates_pred: Dict[str, float],
        compound_deg_rates_actual: Dict[str, float],
    ) -> Dict[str, Any]:
        """
        Pillar 7: Evaluates whether the model correctly ranks compound degradation hierarchy.
        Expected: Hard degradation < Medium degradation < Soft degradation.
        """
        common_comps = [c for c in ["HARD", "MEDIUM", "SOFT"] if c in compound_deg_rates_pred and c in compound_deg_rates_actual]
        if len(common_comps) < 2:
            return {
                "ranking_concordance": True,
                "spearman_rank_correlation": 1.0,
                "predicted_order": list(compound_deg_rates_pred.keys()),
                "actual_order": list(compound_deg_rates_actual.keys()),
            }

        pred_order = sorted(common_comps, key=lambda c: compound_deg_rates_pred[c])
        actual_order = sorted(common_comps, key=lambda c: compound_deg_rates_actual[c])

        # Exact match of compound preference ordering
        is_exact_match = (pred_order == actual_order)

        # Spearman rank correlation
        pred_ranks = [pred_order.index(c) for c in common_comps]
        actual_ranks = [actual_order.index(c) for c in common_comps]
        r_rank = float(np.corrcoef(pred_ranks, actual_ranks)[0, 1]) if len(common_comps) > 2 else (1.0 if is_exact_match else -1.0)

        return {
            "ranking_concordance": is_exact_match,
            "spearman_rank_correlation": r_rank,
            "predicted_order": pred_order,
            "actual_order": actual_order,
            "recommendation_fidelity": "CORRECT_COMPOUND_HIERARCHY" if is_exact_match else "INVERTED_COMPOUND_HIERARCHY",
        }

    def decompose_decision_attribution(
        self,
        pit_error_laps: int,
        temp_drift_c: float,
        slope_error_lap_s: float,
        initial_state_error_s: float,
        stint_length: int,
    ) -> Dict[str, Any]:
        """
        Pillar 8: "What would have changed the decision?"
        Decomposes pit call timing error into constituent physical mechanisms:
        Delta k_pit = Delta k(T_track) + Delta k(initial_state) + Delta k(wear_rate) + Delta k(residual)
        """
        if pit_error_laps == 0:
            return {
                "total_decision_error_laps": 0,
                "attribution_laps": {
                    "track_temperature_drift": 0.0,
                    "wear_rate_mismatch": 0.0,
                    "initial_tyre_state": 0.0,
                    "unmodelled_residual": 0.0,
                },
                "primary_decision_driver": "PERFECT_TIMING_ALIGNMENT",
            }

        # Sensitivity weighting
        wear_effect = min(float(pit_error_laps), (slope_error_lap_s * stint_length) / 0.12)
        temp_effect = min(float(pit_error_laps - wear_effect), (temp_drift_c * 0.15))
        init_effect = min(float(pit_error_laps - wear_effect - temp_effect), (initial_state_error_s * 1.5))
        residual_effect = max(0.0, float(pit_error_laps) - (wear_effect + temp_effect + init_effect))

        total = max(1e-5, wear_effect + temp_effect + init_effect + residual_effect)
        shares = {
            "track_temperature_drift": float(temp_effect),
            "wear_rate_mismatch": float(wear_effect),
            "initial_tyre_state": float(init_effect),
            "unmodelled_residual": float(residual_effect),
        }

        primary = max(shares.items(), key=lambda x: x[1])[0]

        return {
            "total_decision_error_laps": pit_error_laps,
            "attribution_laps": shares,
            "primary_decision_driver": primary,
            "what_would_change_decision": (
                f"A {temp_drift_c:.1f}°C cooler track would have shifted the pit call by {temp_effect:.1f} laps"
                if primary == "track_temperature_drift" else
                f"Calibrating wear rate within 10 ms/lap would recover {wear_effect:.1f} laps of strategy margin"
            ),
        }
