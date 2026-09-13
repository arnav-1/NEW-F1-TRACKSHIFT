"""
TrackShift Multi-Session Parameter Fusion (testDaksh/parameter_fusion.py).

Implements deterministic quality-aware fusion across Friday/Saturday practice sessions:
    W_i^effective = W_i^nominal * Q_i
    theta_fused = sum(W_i^effective * theta_i) / sum(W_i^effective)

Bounded parameter update rules ensure physical bounds and stability:
    theta_new = clip(theta_fused, theta_min, theta_max)
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

from testDaksh.numerical_schemas import ProvenanceTier, SessionStatus

logger = logging.getLogger("testDaksh.parameter_fusion")


class ParameterFusion:
    """
    Deterministic fusion engine for multi-session continual parameter updating.
    """

    def __init__(
        self,
        nominal_weights: Optional[Dict[str, float]] = None,
        max_parameter_shift_pct: float = 0.40,
    ):
        # Default TrackShift calibration weights: FP2 dominant (Tier 3B calibration choice)
        self.nominal_weights = nominal_weights or {
            "FP1": 0.15,
            "FP2": 0.70,
            "FP3": 0.15,
        }
        self.max_shift_pct = max_parameter_shift_pct

        # Physical parameter bounds [min, max]
        self.parameter_bounds = {
            "beta_1_per_lap": (0.010, 0.450),
            "beta_2": (-3.0, 3.0),
            "w_p1": (0.005, 0.350),
            "base_mu0": (1.00, 2.00),
        }

    def compute_session_quality(
        self,
        clean_laps_count: int,
        clean_stints_count: int,
        residual_variance: float = 0.05,
    ) -> float:
        """
        Deterministic, telemetry-based session quality metric Q_i in [0.0, 1.0]:
        Q = min(1.0, laps / 15.0) * min(1.0, stints / 2.0) * exp(-0.5 * res_var / 0.10)
        """
        lap_factor = min(1.0, max(0.0, clean_laps_count / 15.0))
        stint_factor = min(1.0, max(0.0, clean_stints_count / 2.0))
        var_factor = float(np.exp(-0.5 * min(5.0, residual_variance / 0.10)))
        return float(lap_factor * stint_factor * var_factor)

    def fuse_practice_sessions(
        self,
        session_parameters: Dict[str, Dict[str, Dict[str, float]]],
        session_qualities: Dict[str, float],
        prior_parameters: Optional[Dict[str, Dict[str, float]]] = None,
    ) -> Tuple[Dict[str, Dict[str, float]], Dict[str, float]]:
        """
        Fuses parameters across sessions (FP1, FP2, FP3) with nominal and quality weights.
        Returns: (fused_parameters_by_compound, effective_weights)
        """
        effective_weights: Dict[str, float] = {}
        total_eff_weight = 0.0

        for sess_name, w_nom in self.nominal_weights.items():
            q = session_qualities.get(sess_name, 0.0)
            eff_w = w_nom * q
            effective_weights[sess_name] = eff_w
            total_eff_weight += eff_w

        # Normalize effective weights if total > 0
        if total_eff_weight > 1e-6:
            for s in effective_weights:
                effective_weights[s] /= total_eff_weight
        else:
            # Fallback to nominal if all sessions had zero clean quality
            for s, w_nom in self.nominal_weights.items():
                effective_weights[s] = w_nom

        compounds = ["SOFT", "MEDIUM", "HARD"]
        fused_compounds: Dict[str, Dict[str, float]] = {}

        for comp in compounds:
            # Gather parameter values across sessions
            rates: List[float] = []
            weights: List[float] = []

            for sess_name, sess_params in session_parameters.items():
                if comp in sess_params and sess_params[comp].get("stints_analyzed", 0) > 0:
                    rate = sess_params[comp]["beta_1_per_lap"]
                    w = effective_weights.get(sess_name, 0.0)
                    if w > 0:
                        rates.append(rate)
                        weights.append(w)

            if not rates:
                # Use prior baseline
                if prior_parameters and comp in prior_parameters:
                    prior_rate = prior_parameters[comp].get("beta_1_per_lap", 0.075)
                else:
                    prior_rate = 0.075 if comp == "MEDIUM" else (0.110 if comp == "SOFT" else 0.045)
                fused_rate = prior_rate
            else:
                w_norm = np.array(weights) / max(1e-9, sum(weights))
                fused_rate = float(np.sum(np.array(rates) * w_norm))

            # Apply bounded update vs prior
            if prior_parameters and comp in prior_parameters:
                prior_rate = prior_parameters[comp].get("beta_1_per_lap", fused_rate)
                delta = fused_rate - prior_rate
                max_delta = prior_rate * self.max_shift_pct
                delta_clamped = np.clip(delta, -max_delta, max_delta)
                fused_rate = float(prior_rate + delta_clamped)

            # Apply physical bounds
            min_bound, max_bound = self.parameter_bounds["beta_1_per_lap"]
            fused_rate = float(np.clip(fused_rate, min_bound, max_bound))

            fused_compounds[comp] = {
                "beta_1_per_lap": fused_rate,
                "beta_1": fused_rate * 15.0,
                "beta_2": 0.20,
                "beta_0": 0.05,
                "fused_evidence_stints": float(len(rates)),
            }

        return fused_compounds, effective_weights
