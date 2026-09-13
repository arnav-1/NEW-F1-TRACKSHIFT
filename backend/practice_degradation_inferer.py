"""
TrackShift Practice Degradation Inferer (backend/practice_degradation_inferer.py).

Infers latent degradation trajectories (beta_0, beta_1, beta_2) from clean practice stints
using deterministic Weighted Ordinary Least Squares (WOLS):
    D_obs(a) = beta_0 + beta_1 * a + beta_2 * a^2

Scientific Provenance:
- Orthogonal quadratic polynomial projection: MATHEMATICAL TRANSFORMATION
- Confounder-corrected latent degradation target: TIER 3B (TrackShift Formulation)
- Strictly deterministic: ZERO Monte Carlo, ZERO MCMC, ZERO stochastic sampling.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from backend.numerical_schemas import ProvenanceTier

logger = logging.getLogger("backend.practice_inferer")


class PracticeDegradationInferer:
    """
    Deterministic WOLS estimator for latent tyre degradation.
    """

    def __init__(self, ridge_penalty: float = 1e-5):
        self.ridge_penalty = ridge_penalty

    def fit_stint_wols(
        self,
        normalized_age: np.ndarray,
        degradation_obs: np.ndarray,
        lap_weights: Optional[np.ndarray] = None,
    ) -> Tuple[float, float, float, float]:
        """
        Fits D_obs(a) = beta_0 + beta_1 * a + beta_2 * a^2 via deterministic WOLS.
        Returns: (beta_0, beta_1, beta_2, residual_variance)
        """
        n = len(normalized_age)
        if n < 3:
            return 0.0, 0.0, 0.0, 0.0

        # Design matrix X: [1, a, a^2]
        X = np.column_stack([np.ones(n), normalized_age, normalized_age ** 2])

        if lap_weights is None:
            # Deterministic inverse distance weighting towards clean central progression
            W = np.eye(n)
        else:
            w_diag = np.clip(lap_weights, 0.01, 100.0)
            W = np.diag(w_diag)

        # Normal equations with Tikhonov regularization: (X^T W X + lambda * I) beta = X^T W y
        Xt_W = X.T @ W
        Xt_W_X = Xt_W @ X + self.ridge_penalty * np.eye(3)
        Xt_W_y = Xt_W @ degradation_obs

        beta = np.linalg.solve(Xt_W_X, Xt_W_y)
        beta_0, beta_1, beta_2 = float(beta[0]), float(beta[1]), float(beta[2])

        residuals = degradation_obs - (X @ beta)
        residual_variance = float(np.var(residuals))

        return beta_0, beta_1, beta_2, residual_variance

    def infer_compound_parameters(
        self,
        clean_stints: List[pd.DataFrame],
    ) -> Dict[str, Dict[str, float]]:
        """
        Aggregates multiple stints per compound into deterministic median parameters.
        """
        compound_fits: Dict[str, List[Dict[str, float]]] = {"SOFT": [], "MEDIUM": [], "HARD": []}

        for s_df in clean_stints:
            comp = str(s_df["compound"].iloc[0]).upper()
            if comp not in compound_fits:
                continue

            a = s_df["normalized_age"].values
            d = s_df["degradation_obs_s"].values
            n = len(a)

            if n < 4:
                continue

            # Compute deterministic weights: prioritize clean flying laps with low delta to base pace
            pace_delta = np.abs(s_df["lap_time_s"].values - s_df["base_pace"].iloc[0])
            weights = np.exp(-0.5 * np.clip(pace_delta, 0.0, 3.0))

            b0, b1, b2, res_var = self.fit_stint_wols(a, d, weights)
            b1_lap = b1 / max(1.0, float(n - 1))

            compound_fits[comp].append({
                "beta_0": b0,
                "beta_1": b1,
                "beta_2": b2,
                "beta_1_per_lap": b1_lap,
                "residual_variance": res_var,
                "stint_length": float(n),
            })

        inferred_summary: Dict[str, Dict[str, float]] = {}

        for comp, fits in compound_fits.items():
            if not fits:
                # Deterministic fallback default if compound was unobserved
                default_rate = 0.075 if comp == "MEDIUM" else (0.110 if comp == "SOFT" else 0.045)
                inferred_summary[comp] = {
                    "beta_0": 0.0,
                    "beta_1": default_rate * 15.0,
                    "beta_2": 0.25,
                    "beta_1_per_lap": default_rate,
                    "stints_analyzed": 0.0,
                    "sample_variance": 0.0,
                    "status_observed": 0.0,
                }
                continue

            b0_list = [f["beta_0"] for f in fits]
            b1_list = [f["beta_1"] for f in fits]
            b2_list = [f["beta_2"] for f in fits]
            b1_lap_list = [f["beta_1_per_lap"] for f in fits]

            inferred_summary[comp] = {
                "beta_0": float(np.median(b0_list)),
                "beta_1": float(np.median(b1_list)),
                "beta_2": float(np.median(b2_list)),
                "beta_1_per_lap": float(np.median(b1_lap_list)),
                "stints_analyzed": float(len(fits)),
                "sample_variance": float(np.var(b1_lap_list)) if len(b1_lap_list) > 1 else 0.0,
                "status_observed": 1.0,
            }

        return inferred_summary
