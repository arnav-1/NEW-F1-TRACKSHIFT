"""
testDaksh: Physics-Informed Tyre Thermal and Wear State-Space Model.

Implements the physical evidence chain:
1. Interfacial Frictional Power & Sliding Shear (TRT & Mercedes/Imperial 2025)
2. Coupled Thermodynamic ODEs for Tread & Carcass Temperatures (TRT & West & Limebeer 2020)
3. Tri-Mechanism Mechanical Degradation Superposition (Tremlett & Limebeer -> West)
4. Dynamic Grip Coefficient Response: mu(T_tread, D)
5. Physical-to-Observational Lap Time Consequence Mapping
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

logger = logging.getLogger("core_model.physics")


@dataclass(frozen=True)
class CompoundThermalParameters:
    """Thermodynamic and operating thresholds for Pirelli tyre compounds."""
    compound: str
    t_opt: float                  # Optimal operating temperature (°C)
    t_window: float               # Half-width of optimal operating window (°C)
    t_transition_grain: float     # Temperature below which cold graining occurs (°C)
    t_blister_threshold: float    # Temperature above which blistering triggers (°C)
    base_friction_mu0: float      # Fresh tyre peak friction coefficient
    c_alpha_front: float          # Front axle cornering stiffness (N/rad)


# Pirelli compound benchmarks (C1=Hard, C2=Medium, C3=Soft at Barcelona/Silverstone)
COMPOUND_PARAMS: Dict[str, CompoundThermalParameters] = {
    "SOFT": CompoundThermalParameters(
        compound="SOFT",
        t_opt=95.0,
        t_window=15.0,
        t_transition_grain=85.0,
        t_blister_threshold=118.0,
        base_friction_mu0=1.55,
        c_alpha_front=140000.0,
    ),
    "MEDIUM": CompoundThermalParameters(
        compound="MEDIUM",
        t_opt=105.0,
        t_window=18.0,
        t_transition_grain=92.0,
        t_blister_threshold=126.0,
        base_friction_mu0=1.45,
        c_alpha_front=145000.0,
    ),
    "HARD": CompoundThermalParameters(
        compound="HARD",
        t_opt=112.0,
        t_window=20.0,
        t_transition_grain=98.0,
        t_blister_threshold=134.0,
        base_friction_mu0=1.35,
        c_alpha_front=150000.0,
    ),
    "INTERMEDIATE": CompoundThermalParameters(
        compound="INTERMEDIATE",
        t_opt=75.0,
        t_window=15.0,
        t_transition_grain=60.0,
        t_blister_threshold=100.0,
        base_friction_mu0=1.25,
        c_alpha_front=130000.0,
    ),
    "WET": CompoundThermalParameters(
        compound="WET",
        t_opt=65.0,
        t_window=15.0,
        t_transition_grain=50.0,
        t_blister_threshold=90.0,
        base_friction_mu0=1.15,
        c_alpha_front=120000.0,
    ),
}


@dataclass
class TyreThermalState:
    """Internal thermodynamic state of the tyre."""
    t_tread_c: float
    t_carcass_c: float
    q_frict_w: float
    q_cond_track_w: float
    q_conv_air_w: float
    q_tread_to_carc_w: float


@dataclass
class TyreWearState:
    """Damage state and wear breakdown."""
    dot_w_p: float          # Mechanical abrasion rate
    dot_w_g: float          # Cold graining rate
    dot_w_b: float          # Thermal blistering rate
    dot_w_total: float      # Total instantaneous wear rate
    accumulated_d: float    # Cumulative damage integral
    effective_mu: float     # Instantaneous grip coefficient
    pace_delta_s: float     # Estimated observational lap pace loss (seconds)


class PhysicalThermalWearEngine:
    """
    Simulates coupled tyre thermodynamics, tri-mechanism wear, and grip decay.
    """

    def __init__(
        self,
        # Thermal ODE parameters (West & Limebeer 2020 / TRT 2014)
        m_tread: float = 3.2,            # Tread rubber mass per corner (kg)
        c_tread: float = 1750.0,         # Tread specific heat capacity (J / kg / K)
        m_carc: float = 6.8,             # Carcass mass per corner (kg)
        c_carc: float = 1500.0,          # Carcass specific heat capacity (J / kg / K)
        h_track: float = 120.0,          # Conductive heat transfer coeff to track (W / m^2 / K)
        h_air_0: float = 32.0,           # Convective base cooling to air (W / m^2 / K)
        h_air_v: float = 3.2,            # Speed-dependent convective cooling factor
        a_contact: float = 0.045,        # Contact patch area (m^2)
        a_exposed: float = 0.55,         # Exposed tyre surface area (m^2)
        k_tread_carc: float = 85.0,      # Conduction between tread and carcass (W / K)
        # Tri-mechanism wear parameters (Tremlett & Limebeer -> West & Limebeer)
        wg1: float = 2.0e-5,             # Graining base rate
        wg2: float = 1.4,                # Graining thermal deficit exponent
        wb1: float = 5.0e-5,             # Blistering base rate
        wb2: float = 1.7,                # Blistering thermal excess exponent
        q_ref: float = 15000.0,          # Normalizing reference sliding power (Watts)
        wp1: float = 0.035,              # Progressive mechanical abrasion factor
        wp2: float = 1.15,               # Sliding power exponent
        lambda_wear: float = 0.25,       # Sensitivity of grip to cumulative damage D
        k_thermal_grip: float = 0.35,    # Sensitivity of grip to temperature off-window
        k_pace_loss: float = 6.5,        # Seconds of lap time lost per grip loss ratio
        h_rim: float = 12.0,             # Wheel rim & internal cavity convective cooling (W/K)
    ):
        self.m_tread = m_tread
        self.c_tread = c_tread
        self.m_carc = m_carc
        self.c_carc = c_carc
        self.h_track = h_track
        self.h_air_0 = h_air_0
        self.h_air_v = h_air_v
        self.a_contact = a_contact
        self.a_exposed = a_exposed
        self.k_tread_carc = k_tread_carc
        self.h_rim = h_rim

        self.wp1 = wp1
        self.wp2 = wp2
        self.wg1 = wg1
        self.wg2 = wg2
        self.wb1 = wb1
        self.wb2 = wb2
        self.q_ref = q_ref

        self.lambda_wear = lambda_wear
        self.k_thermal_grip = k_thermal_grip
        self.k_pace_loss = k_pace_loss

    def compute_frictional_power(
        self,
        speed_kmh: float,
        curvature_m_inv: float,
        a_lon_ms2: float,
        vehicle_mass_kg: float,
        c_alpha_front: float,
        aero_downforce_factor: float = 1.0,
    ) -> float:
        """
        Computes interfacial frictional sliding power (TRT formulation).
        """
        v_ms = max(5.0, speed_kmh / 3.6)
        abs_kappa = max(1e-5, abs(curvature_m_inv))

        # Lateral centripetal force
        f_lat = vehicle_mass_kg * (v_ms ** 2) * abs_kappa

        # Slip angle alpha approx F_lat / (C_alpha * aero_downforce_factor)
        effective_c_alpha = max(10000.0, c_alpha_front * aero_downforce_factor)
        alpha_rad = np.clip(f_lat / effective_c_alpha, 0.0, 0.22)

        # Contact patch lateral sliding velocity
        v_slip_lat = v_ms * np.sin(alpha_rad)

        # Longitudinal slip power
        f_lon = vehicle_mass_kg * abs(a_lon_ms2)
        v_slip_lon = 0.03 * v_ms if abs(a_lon_ms2) > 1.0 else 0.005 * v_ms

        # Total sliding power (Thermal partition entering rubber p1 approx 0.65)
        p1 = 0.65
        q_frict = p1 * (f_lat * v_slip_lat + f_lon * v_slip_lon)

        return float(np.clip(q_frict, 0.0, 50000.0))

    def step_thermal_ode(
        self,
        t_tread_c: float,
        t_carc_c: float,
        q_frict_w: float,
        speed_kmh: float,
        t_track_c: float,
        t_ambient_c: float,
        dt_s: float = 85.0,
        n_substeps: int = 10,
        corner_duty_cycle: float = 0.32,
    ) -> TyreThermalState:
        """
        Integrates the coupled thermal ODE using stable sub-stepping over dt_s.
        Accounts for cornering duty cycle (~32% cornering, 68% straights).
        """
        v_ms = max(1.0, speed_kmh / 3.6)
        dt_sub = dt_s / max(1, n_substeps)

        # Average lap sliding heat flux (applied during cornering phase)
        q_effective = q_frict_w * corner_duty_cycle

        # Convective cooling coefficient (higher on straights at high speed)
        h_air = self.h_air_0 + self.h_air_v * (v_ms ** 0.8)

        c_tread_total = self.m_tread * self.c_tread
        c_carc_total = self.m_carc * self.c_carc

        cur_t_tread = t_tread_c
        cur_t_carc = t_carc_c

        for _ in range(n_substeps):
            # Heat fluxes
            q_cond = self.h_track * self.a_contact * (cur_t_tread - t_track_c)
            q_conv = h_air * self.a_exposed * (cur_t_tread - t_ambient_c)
            q_internal = self.k_tread_carc * (cur_t_tread - cur_t_carc)
            q_deflect = 0.02 * q_effective
            q_rim = self.h_rim * (cur_t_carc - t_ambient_c)

            d_tread = (q_effective - q_cond - q_conv - q_internal) / c_tread_total
            d_carc = (q_internal + q_deflect - q_rim) / c_carc_total

            cur_t_tread = np.clip(cur_t_tread + d_tread * dt_sub, t_ambient_c, 145.0)
            cur_t_carc = np.clip(cur_t_carc + d_carc * dt_sub, t_ambient_c, 135.0)

        return TyreThermalState(
            t_tread_c=float(cur_t_tread),
            t_carcass_c=float(cur_t_carc),
            q_frict_w=float(q_effective),
            q_cond_track_w=float(self.h_track * self.a_contact * (cur_t_tread - t_track_c)),
            q_conv_air_w=float(h_air * self.a_exposed * (cur_t_tread - t_ambient_c)),
            q_tread_to_carc_w=float(self.k_tread_carc * (cur_t_tread - cur_t_carc)),
        )

    def compute_wear_step(
        self,
        q_frict_w: float,
        t_tread_c: float,
        current_damage_d: float,
        compound_params: CompoundThermalParameters,
        push_level_factor: float = 1.0,
        surface_abrasiveness: float = 1.0,
        dt_laps: float = 1.0,
    ) -> TyreWearState:
        """
        Computes instantaneous tri-mechanism wear and grip response.
        """
        # 1. Mechanical Abrasion (scaled by asphalt roughness and push level)
        q_norm = max(0.0, q_frict_w) / self.q_ref
        dot_w_p = surface_abrasiveness * self.wp1 * (q_norm ** self.wp2) * (push_level_factor ** 2)

        # 2. Cold Graining (active below t_transition_grain)
        delta_cold = max(0.0, compound_params.t_transition_grain - t_tread_c)
        dot_w_g = self.wg1 * (delta_cold ** self.wg2)

        # 3. Thermal Blistering (active above t_blister_threshold)
        delta_hot = max(0.0, t_tread_c - compound_params.t_blister_threshold)
        dot_w_b = self.wb1 * (delta_hot ** self.wb2) * (push_level_factor ** 3)

        dot_w_total = dot_w_p + dot_w_g + dot_w_b
        new_damage_d = current_damage_d + dot_w_total * dt_laps

        # 4. Thermal plateau grip window (optimal grip within +/- 0.5 * t_window)
        half_window = 0.5 * compound_params.t_window
        excess_temp = max(0.0, abs(t_tread_c - compound_params.t_opt) - half_window)
        phi_thermal = max(0.70, 1.0 - self.k_thermal_grip * ((excess_temp / half_window) ** 2))

        # 5. Irreversible wear grip penalty
        wear_penalty = max(0.0, 1.0 - self.lambda_wear * new_damage_d)

        effective_mu = compound_params.base_friction_mu0 * wear_penalty * phi_thermal
        grip_drop_ratio = max(0.0, 1.0 - (effective_mu / compound_params.base_friction_mu0))

        # 6. Observational lap time drop-off
        pace_delta_s = self.k_pace_loss * grip_drop_ratio

        return TyreWearState(
            dot_w_p=float(dot_w_p),
            dot_w_g=float(dot_w_g),
            dot_w_b=float(dot_w_b),
            dot_w_total=float(dot_w_total),
            accumulated_d=float(new_damage_d),
            effective_mu=float(effective_mu),
            pace_delta_s=float(pace_delta_s),
        )
