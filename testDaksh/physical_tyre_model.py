"""
TrackShift Physics-Informed Tyre State-Space Model (testDaksh/physical_tyre_model.py).

Rigorous implementation of vehicle dynamics, interfacial frictional heating,
coupled thermodynamic state-space ODEs, and tri-mechanism wear.

Scientific Provenance Classification:
- Curvature, Normal Load, Lateral Accel, Sliding Velocity: TIER 1 (First Principles Mechanics)
- Linear Slip Angle, Frictional Power, Mechanical Abrasion, Graining, Blistering: TIER 2 (West & Limebeer 2020)
- Thermal ODEs: TIER 2 (Farroni TRT 2014 & West & Limebeer 2020)
- Reduced-Order Grip Decay mu_eff: TIER 3A (TrackShift Engineering Approximation)
- Pace Loss Sensitivity k_pace_loss: TIER 3B (TrackShift Calibrated Observation Prior)
"""

from __future__ import annotations

import math
from typing import Dict, Tuple

import numpy as np

from testDaksh.numerical_schemas import (
    CompoundParametersRecord,
    ProvenanceTier,
    ThermalStateRecord,
    WearStateRecord,
)

# Baseline Pirelli compound parameters (Spain / Silverstone C1=Hard, C2=Medium, C3=Soft)
DEFAULT_COMPOUND_PARAMS: Dict[str, CompoundParametersRecord] = {
    "SOFT": CompoundParametersRecord(
        compound="SOFT",
        t_opt=95.0,
        t_window=15.0,
        t_tp_grain=85.0,
        t_tp_blister=118.0,
        base_mu0=1.55,
        c_alpha_front=140000.0,
        w_p1=0.045,
        w_p2=1.15,
        w_g1=0.0008,
        w_g2=1.40,
        w_b1=0.0012,
        w_b2=1.50,
        provenance=ProvenanceTier.TIER_2.value,
    ),
    "MEDIUM": CompoundParametersRecord(
        compound="MEDIUM",
        t_opt=105.0,
        t_window=18.0,
        t_tp_grain=92.0,
        t_tp_blister=126.0,
        base_mu0=1.45,
        c_alpha_front=145000.0,
        w_p1=0.032,
        w_p2=1.15,
        w_g1=0.0006,
        w_g2=1.40,
        w_b1=0.0009,
        w_b2=1.50,
        provenance=ProvenanceTier.TIER_2.value,
    ),
    "HARD": CompoundParametersRecord(
        compound="HARD",
        t_opt=112.0,
        t_window=20.0,
        t_tp_grain=98.0,
        t_tp_blister=134.0,
        base_mu0=1.35,
        c_alpha_front=150000.0,
        w_p1=0.022,
        w_p2=1.15,
        w_g1=0.0004,
        w_g2=1.40,
        w_b1=0.0006,
        w_b2=1.50,
        provenance=ProvenanceTier.TIER_2.value,
    ),
}


class PhysicalTyreModel:
    """
    Continuous-discrete tyre state-space engine computing thermal evolution,
    tri-mechanism damage, and grip degradation.
    """

    def __init__(
        self,
        vehicle_mass_kg: float = 798.0,
        c_l_a: float = 3.80,
        air_density: float = 1.184,
        track_width_m: float = 1.60,
        cg_height_m: float = 0.32,
        p1_heat_partition: float = 0.50,
        q_ref_w: float = 15000.0,
        lambda_wear: float = 0.50,
        k_pace_loss: float = 3.20,
    ):
        # Physical constants and vehicle parameters
        self.mass = vehicle_mass_kg
        self.gravity = 9.81
        self.c_l_a = c_l_a
        self.rho = air_density
        self.t_track = track_width_m
        self.h_cg = cg_height_m

        # Interfacial heating & wear parameters
        self.p1 = p1_heat_partition
        self.q_ref = q_ref_w
        self.lambda_wear = lambda_wear
        self.k_pace_loss = k_pace_loss

        # Thermal ODE thermal mass & conductances (West & Limebeer 2020 / Farroni TRT)
        self.m_t = 3.50  # Tread thermal mass (kg)
        self.c_t = 1800.0  # Tread specific heat (J/kg*K)
        self.m_c = 5.50  # Carcass thermal mass (kg)
        self.c_c = 1500.0  # Carcass specific heat (J/kg*K)

        self.h_cond = 120.0  # Conduction heat transfer coefficient (W/m^2*K)
        self.a_cp = 0.045  # Contact patch area (m^2)
        self.a_surf = 0.35  # Tyre convective outer surface area (m^2)
        self.h_conv_base = 25.0  # Base convective coefficient (W/m^2*K)
        self.h_conv_vel = 4.2  # Velocity scaling factor for convection
        self.k_int = 35.0  # Internal tread-carcass conductance (W/K)
        self.h_rim = 18.0  # Rim convective/cavity cooling conductance (W/K)
        self.c_hyst = 0.0018  # Carcass hysteresis loss coefficient (W / (N * m/s))

    # =========================================================================
    # 1. VEHICLE DYNAMICS (TIER 1 FIRST PRINCIPLES)
    # =========================================================================

    def compute_curvature(self, x: np.ndarray, y: np.ndarray) -> np.ndarray:
        """
        Computes path curvature kappa from spatial coordinates:
        kappa = (x'y'' - y'x'') / ((x')^2 + (y')^2)^(3/2)
        """
        dx = np.gradient(x)
        dy = np.gradient(y)
        ddx = np.gradient(dx)
        ddy = np.gradient(dy)

        denom = (dx ** 2 + dy ** 2) ** 1.5
        denom[denom < 1e-9] = 1e-9
        kappa = np.abs(dx * ddy - dy * ddx) / denom
        return kappa

    def compute_lateral_acceleration(self, velocity_ms: float, curvature_m_inv: float) -> float:
        """
        Computes instantaneous centripetal lateral acceleration:
        a_y = v^2 * kappa
        """
        return (velocity_ms ** 2) * curvature_m_inv

    def compute_normal_load(self, velocity_ms: float, fuel_mass_kg: float = 0.0) -> float:
        """
        Computes dynamic normal axle load:
        F_z = m_total * g + 0.5 * rho * C_L * A * v^2
        """
        total_mass = self.mass + fuel_mass_kg
        f_gravity = total_mass * self.gravity
        f_aero = 0.5 * self.rho * self.c_l_a * (velocity_ms ** 2)
        return f_gravity + f_aero

    def compute_lateral_load_transfer(self, a_y_ms2: float, fuel_mass_kg: float = 0.0) -> float:
        """
        Computes dynamic quasi-steady lateral load transfer:
        Delta F_z,lat = m_total * a_y * h_cg / t_track
        """
        total_mass = self.mass + fuel_mass_kg
        return (total_mass * a_y_ms2 * self.h_cg) / self.t_track

    # =========================================================================
    # 2. CONTACT PATCH KINEMATICS & FRICTIONAL POWER (TIER 2 LITERATURE)
    # =========================================================================

    def compute_slip_angle(
        self,
        f_y_n: float,
        c_alpha: float,
        velocity_ms: float,
    ) -> float:
        """
        Computes linear slip angle approximation pre-saturation (West & Limebeer 2020):
        alpha = F_y / (C_alpha * Gamma_aero)
        Gamma_aero = 1 + F_aero / (m * g)
        """
        f_gravity = self.mass * self.gravity
        f_aero = 0.5 * self.rho * self.c_l_a * (velocity_ms ** 2)
        gamma_aero = 1.0 + f_aero / max(1.0, f_gravity)

        alpha_rad = abs(f_y_n) / max(1000.0, c_alpha * gamma_aero)
        # Bounded to pre-saturation operating zone (< 15 degrees = 0.26 rad)
        return min(0.2618, alpha_rad)

    def compute_sliding_velocity(self, velocity_ms: float, slip_angle_rad: float) -> float:
        """
        Computes lateral interfacial sliding velocity (Tier 1):
        v_slip,lat = v * sin(alpha)
        """
        return velocity_ms * math.sin(slip_angle_rad)

    def compute_frictional_power(
        self,
        velocity_ms: float,
        f_x_n: float,
        f_y_n: float,
        curvature: float,
        slip_angle_rad: float,
    ) -> float:
        """
        Frictional heating rate Q_frict (West & Limebeer 2020):
        Q_frict = p_1 * v * (|F_x * kappa| + |F_y * tan(alpha)|)
        p_1: Contact partition ratio (Tier 3B empirical calibration).
        """
        longitudinal_term = abs(f_x_n * curvature)
        lateral_term = abs(f_y_n * math.tan(slip_angle_rad))
        q_frict = self.p1 * velocity_ms * (longitudinal_term + lateral_term)
        return max(0.0, float(q_frict))

    # =========================================================================
    # 3. THERMODYNAMIC ODES (TIER 2 LITERATURE)
    # =========================================================================

    def step_thermal_ode(
        self,
        t_tread_c: float,
        t_carc_c: float,
        q_frict_w: float,
        velocity_ms: float,
        f_z_n: float,
        track_temp_c: float,
        air_temp_c: float,
        dt_s: float,
    ) -> Tuple[float, float, ThermalStateRecord]:
        """
        Advances the coupled tread and carcass thermodynamic state over time step dt_s.
        Tread:   m_t * c_t * dT_tread/dt = Q_eff - Q_cond - Q_conv - Q_int
        Carcass: m_c * c_c * dT_carc/dt  = Q_int + Q_defl - Q_rim
        """
        # Conduction to track surface
        q_cond = self.h_cond * self.a_cp * (t_tread_c - track_temp_c)

        # Convection to ambient airflow
        h_conv = self.h_conv_base + self.h_conv_vel * (velocity_ms ** 0.8)
        q_conv = h_conv * self.a_surf * (t_tread_c - air_temp_c)

        # Internal conduction between tread and carcass
        q_int = self.k_int * (t_tread_c - t_carc_c)

        # Carcass deformation / hysteresis heating
        q_defl = self.c_hyst * f_z_n * velocity_ms

        # Rim / cavity cooling
        t_rim = air_temp_c + 15.0  # Quasi-steady brake-disc radiated rim equilibrium
        q_rim = self.h_rim * (t_carc_c - t_rim)

        # Thermal rate derivatives
        d_tread_dt = (q_frict_w - q_cond - q_conv - q_int) / (self.m_t * self.c_t)
        d_carc_dt = (q_int + q_defl - q_rim) / (self.m_c * self.c_c)

        # Explicit forward Euler step with numerical clamping
        new_tread_c = t_tread_c + d_tread_dt * dt_s
        new_carc_c = t_carc_c + d_carc_dt * dt_s

        # Physical safety clamping [20°C, 180°C]
        new_tread_c = float(np.clip(new_tread_c, 20.0, 180.0))
        new_carc_c = float(np.clip(new_carc_c, 20.0, 160.0))

        record = ThermalStateRecord(
            t_tread_c=new_tread_c,
            t_carcass_c=new_carc_c,
            q_frict_w=q_frict_w,
            q_cond_w=q_cond,
            q_conv_w=q_conv,
            q_int_w=q_int,
            q_defl_w=q_defl,
            q_rim_w=q_rim,
        )
        return new_tread_c, new_carc_c, record

    # =========================================================================
    # 4. TRI-MECHANISM WEAR ACCUMULATION (TIER 2 LITERATURE)
    # =========================================================================

    def compute_wear_rates(
        self,
        q_frict_w: float,
        t_tread_c: float,
        comp_params: CompoundParametersRecord,
    ) -> Tuple[float, float, float, float]:
        """
        Computes instantaneous wear rates for mechanical abrasion, cold graining, and blistering:
        - Mechanical abrasion: dot(w_p) = w_p1 * (Q_frict / Q_ref)^w_p2
        - Cold graining:       dot(w_g) = w_g1 * [max(T_tp_grain - T_tread, 0)]^w_g2
        - Thermal blistering:  dot(w_b) = w_b1 * [max(T_tread - T_tp_blister, 0)]^w_b2
        Total: dot(D) = dot(w_p) + dot(w_g) + dot(w_b)
        """
        # 1. Mechanical abrasion
        dot_w_p = comp_params.w_p1 * ((q_frict_w / self.q_ref) ** comp_params.w_p2)

        # 2. Cold graining
        grain_delta = max(0.0, comp_params.t_tp_grain - t_tread_c)
        dot_w_g = comp_params.w_g1 * (grain_delta ** comp_params.w_g2) if grain_delta > 0 else 0.0

        # 3. Thermal blistering
        blister_delta = max(0.0, t_tread_c - comp_params.t_tp_blister)
        dot_w_b = comp_params.w_b1 * (blister_delta ** comp_params.w_b2) if blister_delta > 0 else 0.0

        dot_w_total = dot_w_p + dot_w_g + dot_w_b
        return dot_w_p, dot_w_g, dot_w_b, dot_w_total

    # =========================================================================
    # 5. GRIP COEFFICIENT & PACE LOSS (TIER 3A EXTENSION)
    # =========================================================================

    def compute_effective_grip(
        self,
        damage_d: float,
        t_tread_c: float,
        comp_params: CompoundParametersRecord,
    ) -> float:
        """
        Reduced-order grip capacity approximation (Tier 3A):
        mu_eff = mu_0 * (1 - lambda_wear * D) * Phi_thermal(T_tread)
        Phi_thermal(T) = exp(- (T - T_opt)^2 / (2 * T_window^2))
        """
        thermal_bell = math.exp(-((t_tread_c - comp_params.t_opt) ** 2) / (2.0 * (comp_params.t_window ** 2)))
        wear_decay = max(0.10, 1.0 - self.lambda_wear * damage_d)
        mu_eff = comp_params.base_mu0 * wear_decay * thermal_bell
        return max(0.20, float(mu_eff))

    def map_grip_to_lap_pace_loss(self, effective_mu: float, base_mu0: float) -> float:
        """
        Maps frictional grip decay to observable lap time pace loss:
        Delta t_tyre = k_pace_loss * (1.0 - mu_eff / mu_0)
        """
        grip_drop = max(0.0, 1.0 - (effective_mu / base_mu0))
        return float(self.k_pace_loss * grip_drop)

    def simulate_lap_wear(
        self,
        t_tread_init_c: float,
        t_carc_init_c: float,
        current_damage_d: float,
        comp_params: CompoundParametersRecord,
        track_temp_c: float,
        air_temp_c: float,
        lap_speed_ms: float = 58.0,
        fuel_mass_kg: float = 50.0,
        lap_length_m: float = 4657.0,
    ) -> Tuple[float, float, float, WearStateRecord, ThermalStateRecord]:
        """
        Simulates 1 flying lap by sub-stepping the ODE over the lap duration.
        Returns: (new_tread_c, new_carc_c, new_damage_d, wear_record, thermal_record)
        """
        lap_time_s = lap_length_m / max(10.0, lap_speed_ms)
        n_substeps = 10
        dt_s = lap_time_s / n_substeps

        t_tread = t_tread_init_c
        t_carc = t_carc_init_c
        f_z = self.compute_normal_load(lap_speed_ms, fuel_mass_kg)

        # Nominal flying lap lateral load and slip angle
        f_y = 0.50 * f_z
        slip_angle = self.compute_slip_angle(f_y, comp_params.c_alpha_front, lap_speed_ms)
        q_frict = self.compute_frictional_power(lap_speed_ms, 0.0, f_y, 0.0035, slip_angle)

        last_thermal_rec = None
        for _ in range(n_substeps):
            t_tread, t_carc, last_thermal_rec = self.step_thermal_ode(
                t_tread, t_carc, q_frict, lap_speed_ms, f_z, track_temp_c, air_temp_c, dt_s
            )

        # Compute wear increment for this lap
        dot_wp, dot_wg, dot_wb, dot_total = self.compute_wear_rates(q_frict, t_tread, comp_params)
        # Lap damage increment scaled by lap duration (damage per lap)
        delta_d = dot_total * (lap_time_s / 100.0)
        new_damage_d = float(current_damage_d + delta_d)

        # Effective grip and lap pace loss
        eff_mu = self.compute_effective_grip(new_damage_d, t_tread, comp_params)
        pace_loss = self.map_grip_to_lap_pace_loss(eff_mu, comp_params.base_mu0)

        wear_rec = WearStateRecord(
            dot_w_p=dot_wp,
            dot_w_g=dot_wg,
            dot_w_b=dot_wb,
            dot_w_total=dot_total,
            accumulated_d=new_damage_d,
            effective_mu=eff_mu,
            pace_loss_s=pace_loss,
        )

        return t_tread, t_carc, new_damage_d, wear_rec, last_thermal_rec
