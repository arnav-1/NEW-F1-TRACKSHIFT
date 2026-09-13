"""
TrackShift Non-Circular Telemetric Lateral Grip Validator (backend/telemetric_grip_validator.py).

Validates physical grip decay mu_eff(T, D) against independent cornering apex telemetry:
- Mid-corner steady-state apex lateral acceleration: a_y / g
- Aero normalization: Gamma_aero(v) = 1 + (0.5 * rho * C_L * A * v^2) / (m * g)
- Telemetry grip capacity: mu_telemetry = a_y / (g * Gamma_aero)

Completely independent of lap times: eliminates circular validation.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

from backend.numerical_schemas import GripValidationRecord

logger = logging.getLogger("backend.grip_validator")


class TelemetricGripValidator:
    """
    Evaluates correlation and error between physical model grip and apex telemetry.
    """

    def __init__(
        self,
        vehicle_mass_kg: float = 798.0,
        c_l_a: float = 3.80,
        air_density: float = 1.184,
    ):
        self.mass = vehicle_mass_kg
        self.c_l_a = c_l_a
        self.rho = air_density
        self.gravity = 9.81

    def compute_aero_normalization(self, velocity_ms: float) -> float:
        """
        Computes dynamic downforce factor Gamma_aero:
        Gamma_aero = 1 + (0.5 * rho * C_L * A * v^2) / (m * g)
        """
        f_gravity = self.mass * self.gravity
        f_aero = 0.5 * self.rho * self.c_l_a * (velocity_ms ** 2)
        return float(1.0 + f_aero / max(1.0, f_gravity))

    def validate_grip_trajectory(
        self,
        circuit: str,
        year: int,
        driver: str,
        stint_number: int,
        compound: str,
        model_mu_trajectory: List[float],
        telemetry_apex_speeds_ms: List[float],
        corner_curvature: float = 0.0035,
    ) -> GripValidationRecord:
        """
        Compares normalized model grip mu_model(k)/mu_model(0) vs
        telemetry grip mu_tel(k)/mu_tel(0).
        """
        n_points = min(len(model_mu_trajectory), len(telemetry_apex_speeds_ms))

        if n_points < 4:
            # Insufficient telemetry points
            return GripValidationRecord(
                circuit=circuit,
                year=year,
                driver=driver,
                stint_number=stint_number,
                compound=compound,
                sample_points_count=n_points,
                correlation=0.0,
                rmse=0.0,
                mae=0.0,
                relative_bias=0.0,
                trend_agreement_pct=0.0,
                status_code=1,  # INSUFFICIENT_TELEMETRY
            )

        # 1. Compute telemetry grip across laps
        tel_mus: List[float] = []
        for v in telemetry_apex_speeds_ms[:n_points]:
            a_y = (v ** 2) * corner_curvature
            gamma_aero = self.compute_aero_normalization(v)
            mu_tel = a_y / max(0.1, self.gravity * gamma_aero)
            tel_mus.append(mu_tel)

        tel_arr = np.array(tel_mus)
        mod_arr = np.array(model_mu_trajectory[:n_points])

        # Normalize by initial lap
        norm_tel = tel_arr / max(0.1, tel_arr[0])
        norm_mod = mod_arr / max(0.1, mod_arr[0])

        # 2. Pearson correlation
        if np.std(norm_mod) > 1e-6 and np.std(norm_tel) > 1e-6:
            corr = float(np.corrcoef(norm_mod, norm_tel)[0, 1])
        else:
            corr = 0.0

        # 3. Error metrics
        diff = norm_mod - norm_tel
        mae = float(np.mean(np.abs(diff)))
        rmse = float(np.sqrt(np.mean(diff ** 2)))
        bias = float(np.mean(diff))

        # 4. Directional trend agreement
        delta_mod = np.diff(norm_mod)
        delta_tel = np.diff(norm_tel)
        agreements = np.sign(delta_mod) == np.sign(delta_tel)
        trend_agreement_pct = float(np.mean(agreements) * 100.0)

        return GripValidationRecord(
            circuit=circuit,
            year=year,
            driver=driver,
            stint_number=stint_number,
            compound=compound,
            sample_points_count=n_points,
            correlation=corr,
            rmse=rmse,
            mae=mae,
            relative_bias=bias,
            trend_agreement_pct=trend_agreement_pct,
            status_code=0,  # SUCCESS
        )
