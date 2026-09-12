"""
TrackShift Information Extraction Pipeline (IEP).

This module extracts physics-informed proxies from telemetry, lap timing,
and track microclimate data. It calculates the foundational physical quantities
that separate physical wear mechanics from observational pace confounders.

Core Physics Models:
    1. Instantaneous Fuel Mass Decay & Correction:
       M(t) = M_0 * (1 - lap / total_laps) with gamma_fuel = 0.033 s/kg penalty.
    2. Track Evolution Saturation Model:
       E_track(n) = E_max * (1 - exp(-n / tau_track))
    3. Cartesian Curvature & Lateral Tyre Energy Proxy:
       kappa = |x' y'' - y' x''| / (x'^2 + y'^2)^(3/2)
       a_lat = v^2 * kappa
       E_lat = integral(v^2 * kappa dt)
    4. Longitudinal Braking Thermal Stress & Kinetic Dissipation:
       P_brake = |a_lon| * v * I_brake
       E_brake = integral(P_brake dt)
    5. Contact Patch Lateral Sliding Velocity (TRT Formulation):
       v_slip_lat = v * sin(alpha) approx v * (m * v^2 * kappa / C_alpha)
       P_slip = F_lat * v_slip_lat
    6. Aerodynamic Wake & Dirty Air Multiplier:
       Q_frict_wake = Q_frict * (1.0 + k_wake * max(0.0, 1.5 - Delta t_gap))
    7. Corner-by-Corner Micro-Sector Segmentation:
       Spatial slicing isolating high-lateral corners (e.g. Turn 3, Turn 9)
       from heavy-braking zones (Turn 1, Turn 10).

Strict Data Governance (TrackShift Hackathon Specification):
    - AVAILABLE (Direct Inputs): Compound, TyreAge, TrackTemp, AirTemp, Rainfall, WindSpeed, LapTime.
    - APPROXIMATED (Engineered Proxies): Q_frict, v_slip_lat, a_lat, a_lon, E_track, Q_frict_wake.
    - UNAVAILABLE (Strictly Excluded as Raw Inputs): Internal Tyre Pressure, Tread/Carcass Temperature,
      Contact Patch Vertical Load (Fz), True Friction Grip (mu).

References:
    - West, E., & Limebeer, D. J. N. (2020). Optimal Tyre Management of a Formula One Car.
    - Farroni, F., et al. (2014). TRT: Thermo Racing Tyre - A Physical Model.
    - Todd, O., et al. (2025). Explainable Time Series Prediction of Tyre Energy in F1.
    - Tremlett, A. J., & Limebeer, D. J. N. (2016). Optimal Tyre Usage for a Formula One Car.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
from scipy.signal import savgol_filter

logger = logging.getLogger("trackshift.iep")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [IEP] %(message)s", datefmt="%H:%M:%S"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


@dataclass
class TurnDefinition:
    """
    Spatial boundary definition for a circuit corner.

    Attributes:
        turn_number: Sequential turn integer (e.g., 1, 3, 9).
        name: Common corner name (e.g., 'Turn 3 - Renault Carousel').
        start_dist_m: Track distance in metres at turn entry.
        end_dist_m: Track distance in metres at turn exit.
        corner_type: Classification ('high_lateral', 'heavy_braking', 'medium_speed', 'chicane').
        direction: Turn heading ('right' or 'left').
    """
    turn_number: int
    name: str
    start_dist_m: float
    end_dist_m: float
    corner_type: str
    direction: str  # 'right' or 'left'


# Canonical Turn Boundaries for Circuit de Barcelona-Catalunya (4,657m modern layout)
BARCELONA_TURNS: List[TurnDefinition] = [
    TurnDefinition(1, "Turn 1 - Elf Chicane Entry", 650.0, 830.0, "heavy_braking", "right"),
    TurnDefinition(2, "Turn 2 - Elf Chicane Exit", 830.0, 1020.0, "medium_speed", "left"),
    TurnDefinition(3, "Turn 3 - Renault Carousel", 1020.0, 1580.0, "high_lateral", "right"),
    TurnDefinition(4, "Turn 4 - Repsol", 1750.0, 1950.0, "medium_speed", "right"),
    TurnDefinition(5, "Turn 5 - Seat Hairpin", 2100.0, 2300.0, "heavy_braking", "left"),
    TurnDefinition(6, "Turn 6", 2380.0, 2520.0, "medium_speed", "left"),
    TurnDefinition(7, "Turn 7 - Wurth", 2600.0, 2750.0, "medium_speed", "left"),
    TurnDefinition(8, "Turn 8", 2750.0, 2900.0, "medium_speed", "right"),
    TurnDefinition(9, "Turn 9 - Campsa High-Speed", 3050.0, 3280.0, "high_lateral", "right"),
    TurnDefinition(10, "Turn 10 - Caixa Hairpin", 3550.0, 3750.0, "heavy_braking", "left"),
    TurnDefinition(11, "Turn 11", 3850.0, 4000.0, "medium_speed", "left"),
    TurnDefinition(12, "Turn 12 - Banc Sabadell", 4050.0, 4250.0, "medium_speed", "right"),
    TurnDefinition(13, "Turn 13 - Fast Entry", 4320.0, 4480.0, "high_lateral", "right"),
    TurnDefinition(14, "Turn 14 - Final Corner", 4480.0, 4657.0, "high_lateral", "right"),
]


@dataclass
class TurnEnergyProfile:
    """Micro-sector energy and kinematic metrics for a single corner."""
    turn_number: int
    name: str
    corner_type: str
    direction: str
    mean_speed_kmh: float
    min_speed_kmh: float
    peak_lat_acc_ms2: float
    peak_slip_velocity_ms: float
    lateral_energy: float
    braking_energy: float
    total_frictional_proxy: float


@dataclass
class PhysicsExtractionResult:
    """Container holding enriched lap data with physical proxies and metrics."""
    enriched_laps: pd.DataFrame
    fuel_model_params: Dict[str, float]
    track_model_params: Dict[str, float]
    energy_summary: pd.DataFrame
    turn_energy_profiles: Dict[int, List[TurnEnergyProfile]] = field(default_factory=dict)


class FuelDecayModel:
    """
    Computes instantaneous fuel mass burn and lap-time fuel penalty.

    Mathematical Formulation:
        M_{fuel}(t) = M_0 * (1 - lap / total_laps)
        Delta t_{fuel}(t) = gamma_{fuel} * M_{fuel}(t)
        t_{corrected}(t) = t_{observed}(t) - gamma_{fuel} * (M_{fuel}(t) - M_{ref})

    Units:
        - M_0, M_{fuel}: kilograms (kg)
        - gamma_{fuel}: seconds per kilogram (s/kg)
        - lap times: seconds (s)
    """

    def __init__(
        self,
        initial_fuel_mass_kg: float = 110.0,
        fuel_time_penalty_s_per_kg: float = 0.033,
        reference_fuel_mass_kg: float = 0.0,
    ):
        """
        Initializes the Fuel Decay Model.

        Args:
            initial_fuel_mass_kg: Starting race fuel mass (default: 110.0 kg, FIA F1 regulation cap).
            fuel_time_penalty_s_per_kg: Lap time sensitivity to fuel mass (default: 0.033 s/kg, ~0.33s per 10kg).
            reference_fuel_mass_kg: Reference mass to which lap times are standardized (default: 0.0 kg empty tank).
        """
        self.initial_fuel_mass_kg = initial_fuel_mass_kg
        self.fuel_time_penalty_s_per_kg = fuel_time_penalty_s_per_kg
        self.reference_fuel_mass_kg = reference_fuel_mass_kg

    def compute_fuel_mass(
        self,
        lap_number: Union[int, np.ndarray, pd.Series],
        total_laps: int,
    ) -> Union[float, np.ndarray, pd.Series]:
        """
        Computes remaining fuel mass at the start of a given lap.

        Args:
            lap_number: Current lap index (1-indexed).
            total_laps: Total scheduled race laps.

        Returns:
            Fuel mass remaining in kg.
        """
        lap_arr = np.asarray(lap_number, dtype=float)
        total = max(1, total_laps)
        fraction_remaining = np.clip(1.0 - (lap_arr - 1.0) / total, 0.0, 1.0)
        mass = self.initial_fuel_mass_kg * fraction_remaining
        if isinstance(lap_number, pd.Series):
            return pd.Series(mass, index=lap_number.index)
        return mass if isinstance(lap_number, np.ndarray) else float(mass)

    def compute_fuel_correction(
        self,
        lap_times_s: pd.Series,
        lap_numbers: pd.Series,
        total_laps: int,
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """
        Applies fuel load lap-time normalization.

        Args:
            lap_times_s: Observed lap times in seconds.
            lap_numbers: Lap numbers corresponding to lap times.
            total_laps: Total session/race scheduled laps.

        Returns:
            Tuple of (fuel_mass_kg, fuel_delta_s, fuel_corrected_lap_time_s).
        """
        fuel_mass = self.compute_fuel_mass(lap_numbers, total_laps)
        fuel_delta = self.fuel_time_penalty_s_per_kg * (fuel_mass - self.reference_fuel_mass_kg)
        corrected_lap_time = lap_times_s - fuel_delta

        return fuel_mass, fuel_delta, corrected_lap_time


class TrackEvolutionModel:
    """
    Computes session track evolution index using an exponential saturation model.

    As rubber is continuously deposited along the racing line and braking zones,
    grip increases monotonically and asymptotically saturates.

    Mathematical Formulation:
        E_{track}(n) = E_{max} * (1 - exp(-n / tau_{track}))

    Parameters:
        - n: Cumulative completed laps in the session across all cars.
        - E_{max}: Asymptotic lap time advantage gained from track evolution (seconds).
        - tau_{track}: Characteristic lap scale constant (laps).

    Units:
        - E_{track}, E_{max}: seconds (s)
        - n, tau_{track}: laps (dimensionless)
    """

    def __init__(
        self,
        e_max_s: float = 1.5,
        tau_track_laps: float = 150.0,
    ):
        """
        Initializes Track Evolution Model.

        Args:
            e_max_s: Maximum track improvement potential in seconds (default: 1.5s).
            tau_track_laps: Exponential saturation constant in cumulative laps (default: 150.0 laps).
        """
        self.e_max_s = e_max_s
        self.tau_track_laps = max(1.0, tau_track_laps)

    def compute_track_evolution(
        self,
        cumulative_laps: Union[int, np.ndarray, pd.Series],
    ) -> Union[float, np.ndarray, pd.Series]:
        """
        Computes the track evolution index (in seconds of grip improvement)
        as a function of cumulative rubber deposited.

        Args:
            cumulative_laps: Cumulative lap counter across the session.

        Returns:
            Track evolution index in seconds.
        """
        n = np.maximum(0.0, np.asarray(cumulative_laps, dtype=float))
        evolution_s = self.e_max_s * (1.0 - np.exp(-n / self.tau_track_laps))

        if isinstance(cumulative_laps, pd.Series):
            return pd.Series(evolution_s, index=cumulative_laps.index)
        return evolution_s if isinstance(cumulative_laps, np.ndarray) else float(evolution_s)

    def correct_lap_times(
        self,
        lap_times_s: pd.Series,
        cumulative_laps: pd.Series,
    ) -> Tuple[pd.Series, pd.Series]:
        """
        Computes track-evolution corrected lap times.
        Since track evolution makes the circuit faster, adding the evolution offset
        isolates the true baseline tyre performance loss.

        Args:
            lap_times_s: Observed or fuel-corrected lap times in seconds.
            cumulative_laps: Cumulative session laps.

        Returns:
            Tuple of (track_evolution_s, track_corrected_lap_time_s).
        """
        evolution_s = self.compute_track_evolution(cumulative_laps)
        corrected_laps = lap_times_s + evolution_s
        return evolution_s, corrected_laps


class CurvatureEnergyExtractor:
    """
    Extracts geometric trajectory curvature and lateral cornering tyre stress energy
    from high-frequency Cartesian telemetry (X, Y) and speed (v).

    Mathematical Formulation:
        Given planar path (X(t), Y(t)):
            dot{X} = dX/dt,  ddot{X} = d^2X/dt^2
            dot{Y} = dY/dt,  ddot{Y} = d^2Y/dt^2
            kappa(t) = (dot{X}*ddot{Y} - dot{Y}*ddot{X}) / (dot{X}^2 + dot{Y}^2)^(3/2)
            a_{lat}(t) = v(t)^2 * kappa(t)

        Signed Curvature Convention:
            kappa > 0: Right-hand turn (clockwise rotation)
            kappa < 0: Left-hand turn (counter-clockwise rotation)

    References:
        - West & Limebeer (2020), Eq. (12): Q_frict = p_1 * u_n * (|F_y * tan(alpha)|)
        - Todd et al. (2025): F1 tyre energy lateral formulation.
    """

    def __init__(self, filter_window: int = 11, poly_order: int = 3):
        """
        Initializes Curvature Extractor.

        Args:
            filter_window: Window length for Savitzky-Golay numerical smoothing (odd integer).
            poly_order: Polynomial order for Savitzky-Golay filter.
        """
        self.filter_window = filter_window if filter_window % 2 != 0 else filter_window + 1
        self.poly_order = poly_order

    def compute_curvature(
        self,
        x_m: np.ndarray,
        y_m: np.ndarray,
        time_s: np.ndarray,
        signed: bool = False,
    ) -> np.ndarray:
        """
        Computes geometric curvature kappa(t) along a 2D trajectory.

        Args:
            x_m: Cartesian X coordinates in metres.
            y_m: Cartesian Y coordinates in metres.
            time_s: Monotonically increasing time samples in seconds.
            signed: If True, preserves sign (positive = right turn, negative = left turn).

        Returns:
            Curvature array kappa in units of 1/metre (rad/m).
        """
        n_samples = len(x_m)
        if n_samples < 5:
            return np.zeros(n_samples, dtype=float)

        dt = np.gradient(time_s)
        dt = np.where(dt <= 1e-4, 1e-4, dt)

        # Smooth coordinates to suppress GPS transponder discretization noise
        win = min(self.filter_window, n_samples if n_samples % 2 != 0 else n_samples - 1)
        if win > self.poly_order:
            x_smooth = savgol_filter(x_m, window_length=win, polyorder=self.poly_order)
            y_smooth = savgol_filter(y_m, window_length=win, polyorder=self.poly_order)
        else:
            x_smooth, y_smooth = x_m, y_m

        dx = np.gradient(x_smooth, time_s)
        dy = np.gradient(y_smooth, time_s)
        ddx = np.gradient(dx, time_s)
        ddy = np.gradient(dy, time_s)

        speed_sq = dx**2 + dy**2
        denom = speed_sq ** 1.5
        denom = np.where(denom < 1e-6, 1e-6, denom)

        # Numerator cross product defines signed 2D orientation
        cross = dx * ddy - dy * ddx
        raw_kappa = cross / denom

        if not signed:
            kappa = np.abs(raw_kappa)
            return np.clip(kappa, 0.0, 0.2)
        else:
            return np.clip(raw_kappa, -0.2, 0.2)

    def compute_lateral_energy(
        self,
        speed_kmh: np.ndarray,
        kappa: np.ndarray,
        time_s: np.ndarray,
    ) -> Tuple[np.ndarray, float]:
        """
        Computes instantaneous lateral acceleration and cumulative lap cornering stress energy.

        Args:
            speed_kmh: Vehicle speed in km/h.
            kappa: Trajectory curvature in 1/m (magnitude).
            time_s: Time vector in seconds.

        Returns:
            Tuple of (a_lat_array_ms2, cumulative_lateral_energy_proxy).
        """
        v_ms = speed_kmh / 3.6
        a_lat = (v_ms ** 2) * np.abs(kappa)

        dt = np.gradient(time_s)
        dt = np.where((dt < 0) | (dt > 1.0), 0.0, dt)
        energy_proxy = float(np.sum((v_ms ** 2) * np.abs(kappa) * dt))

        return a_lat, energy_proxy


class BrakingStressExtractor:
    """
    Extracts longitudinal braking stress and kinetic energy dissipation from telemetry.

    Mathematical Formulation:
        a_{lon}(t) = dv / dt
        P_{brake}(t) = |a_{lon}(t)| * v(t) * I_{brake}(t)
        E_{brake} = sum_{k in braking} |a_{lon, k}| * v_k * Delta t_k

    References:
        - West & Limebeer (2020), Eq. (12): Frictional dissipation in longitudinal slip.
        - Farroni TRT (2014): Heat generated during vehicle retardation.
    """

    def __init__(self, brake_threshold_pct: float = 5.0):
        """
        Initializes Braking Stress Extractor.

        Args:
            brake_threshold_pct: Minimum threshold for brake application.
        """
        self.brake_threshold_pct = brake_threshold_pct

    def compute_braking_energy(
        self,
        speed_kmh: np.ndarray,
        brake_active: np.ndarray,
        time_s: np.ndarray,
    ) -> Tuple[np.ndarray, float]:
        """
        Computes instantaneous deceleration and cumulative braking thermal energy proxy.

        Args:
            speed_kmh: Vehicle speed in km/h.
            brake_active: Boolean or binary array indicating brake pedal engagement.
            time_s: Time vector in seconds.

        Returns:
            Tuple of (a_lon_array_ms2, cumulative_braking_energy_proxy).
        """
        n_samples = len(speed_kmh)
        if n_samples < 2:
            return np.zeros(n_samples, dtype=float), 0.0

        v_ms = speed_kmh / 3.6
        dt = np.gradient(time_s)
        dt = np.where(dt <= 1e-4, 1e-4, dt)

        a_lon = np.gradient(v_ms, time_s)

        # Braking condition: negative longitudinal acceleration under brake application
        is_braking = (brake_active > 0) & (a_lon < -0.5)

        # Power proxy: |a_lon| * v (W / kg)
        p_brake = np.where(is_braking, np.abs(a_lon) * v_ms, 0.0)

        dt_int = np.where((dt < 0) | (dt > 1.0), 0.0, dt)
        energy_proxy = float(np.sum(p_brake * dt_int))

        return a_lon, energy_proxy


class SlipVelocityExtractor:
    """
    Computes contact patch lateral sliding velocity and sliding power proxy.

    Mathematical Formulation (TRT & Vehicle Dynamics):
        From lateral equilibrium:
            F_{lat} = m * v^2 * kappa
            alpha approx F_{lat} / C_{alpha} = (m * v^2 * kappa) / C_{alpha}
            v_{slip, lat} = v * sin(alpha) approx v * (m * v^2 * kappa / C_{alpha}) = (m * v^3 * kappa) / C_{alpha}

        Sliding Power Proxy:
            P_{slip, lat} = F_{lat} * v_{slip, lat} approx (m * v^2 * kappa) * v_{slip, lat}
            E_{slip, lat} = integral(P_{slip, lat} dt)

    References:
        - Farroni, F., et al. (2014). TRT: Thermo Racing Tyre (sliding velocity formulation).
        - West & Limebeer (2020), Eq. (11)-(13).
    """

    def __init__(
        self,
        vehicle_mass_kg: float = 850.0,
        cornering_stiffness_n_per_rad: float = 140000.0,
    ):
        """
        Initializes Slip Velocity Extractor.

        Args:
            vehicle_mass_kg: Vehicle wet mass including driver and nominal fuel (default: 850 kg).
            cornering_stiffness_n_per_rad: Front axle aggregate cornering stiffness (default: 140,000 N/rad).
        """
        self.vehicle_mass_kg = vehicle_mass_kg
        self.cornering_stiffness = max(1000.0, cornering_stiffness_n_per_rad)

    def compute_slip_velocity(
        self,
        speed_kmh: np.ndarray,
        kappa: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Computes lateral slip angle and contact patch lateral sliding velocity.

        Args:
            speed_kmh: Velocity in km/h.
            kappa: Curvature magnitude in 1/m.

        Returns:
            Tuple of (alpha_rad, v_slip_lat_ms).
        """
        v_ms = np.maximum(0.0, speed_kmh / 3.6)
        abs_kappa = np.abs(kappa)

        # alpha = (m * v^2 * kappa) / C_alpha
        # Bounded to physical F1 tyre limits: max slip angle ~ 12 degrees (~ 0.21 rad)
        f_lat_approx = self.vehicle_mass_kg * (v_ms ** 2) * abs_kappa
        alpha_rad = np.clip(f_lat_approx / self.cornering_stiffness, 0.0, 0.25)

        # v_slip_lat = v * sin(alpha)
        v_slip_lat = v_ms * np.sin(alpha_rad)

        return alpha_rad, v_slip_lat

    def compute_slip_energy(
        self,
        speed_kmh: np.ndarray,
        kappa: np.ndarray,
        time_s: np.ndarray,
    ) -> Tuple[np.ndarray, float]:
        """
        Integrates lateral sliding power: P = F_lat * v_slip over the lap.

        Args:
            speed_kmh: Velocity in km/h.
            kappa: Curvature magnitude in 1/m.
            time_s: Time vector in seconds.

        Returns:
            Tuple of (p_slip_array_w, cumulative_slip_energy_j).
        """
        v_ms = np.maximum(0.0, speed_kmh / 3.6)
        abs_kappa = np.abs(kappa)
        _, v_slip_lat = self.compute_slip_velocity(speed_kmh, abs_kappa)

        # F_lat = m * v^2 * kappa
        f_lat = self.vehicle_mass_kg * (v_ms ** 2) * abs_kappa
        p_slip = f_lat * v_slip_lat  # Watts

        dt = np.gradient(time_s)
        dt = np.where((dt < 0) | (dt > 2.0), 0.0, dt)
        slip_energy = float(np.sum(p_slip * dt))

        return p_slip, slip_energy


class WakePenaltyModel:
    """
    Computes turbulent dirty air thermal and sliding stress multiplier.

    When running within the aerodynamic wake of a leading car (Delta t_gap < 1.5s),
    the boundary layer turbulence induces downforce losses (20-30%), increasing
    interfacial slip and thermal heat generation.

    Mathematical Formulation:
        Q_{frict, wake} = Q_{frict} * (1.0 + k_{wake} * max(0.0, 1.5 - Delta t_{gap}))

    References:
        - TrackShift Engineering Specification & Mentor Recommendations (Section 7).
    """

    def __init__(
        self,
        wake_threshold_s: float = 1.5,
        k_wake: float = 0.20,
    ):
        """
        Initializes Wake Penalty Model.

        Args:
            wake_threshold_s: Time gap threshold in seconds below which dirty air occurs (default: 1.5s).
            k_wake: Wake severity multiplier constant (default: 0.20).
        """
        self.wake_threshold_s = wake_threshold_s
        self.k_wake = k_wake

    def compute_wake_multiplier(self, gap_to_ahead_s: Union[float, np.ndarray, pd.Series]) -> Union[float, np.ndarray, pd.Series]:
        """
        Computes the dirty air stress factor based on gap to car ahead.

        Args:
            gap_to_ahead_s: Time gap in seconds to preceding car (or NaN if clear track).

        Returns:
            Stress multiplier (>= 1.0). In clean air, returns exactly 1.0.
        """
        if isinstance(gap_to_ahead_s, pd.Series):
            deficit = np.maximum(0.0, self.wake_threshold_s - gap_to_ahead_s.fillna(99.0))
            return 1.0 + self.k_wake * deficit
        elif isinstance(gap_to_ahead_s, np.ndarray):
            clean_gap = np.where(np.isnan(gap_to_ahead_s), 99.0, gap_to_ahead_s)
            deficit = np.maximum(0.0, self.wake_threshold_s - clean_gap)
            return 1.0 + self.k_wake * deficit
        else:
            if gap_to_ahead_s is None or np.isnan(gap_to_ahead_s):
                return 1.0
            deficit = max(0.0, self.wake_threshold_s - float(gap_to_ahead_s))
            return 1.0 + self.k_wake * deficit

    def apply_wake_penalty(
        self,
        q_frict: float,
        gap_to_ahead_s: Optional[float],
    ) -> float:
        """Applies wake multiplier to baseline frictional work."""
        multiplier = float(self.compute_wake_multiplier(gap_to_ahead_s))
        return q_frict * multiplier


class MicroSectorSegmenter:
    """
    Slices lap telemetry into spatial turn micro-sectors to isolate
    individual cornering and braking zones (e.g. Turns 1-14 at Barcelona).

    Specifically distinguishes high-lateral-energy corners (Turn 3 carousel, Turn 9)
    from heavy longitudinal braking zones (Turn 1, Turn 10).
    """

    def __init__(self, turns: Optional[List[TurnDefinition]] = None):
        """
        Initializes segmenter with circuit turn definitions.

        Args:
            turns: List of TurnDefinition objects (default: BARCELONA_TURNS).
        """
        self.turns = turns or BARCELONA_TURNS

    def segment_lap(
        self,
        lap_tel: pd.DataFrame,
        curvature_extractor: Optional[CurvatureEnergyExtractor] = None,
        braking_extractor: Optional[BrakingStressExtractor] = None,
        slip_extractor: Optional[SlipVelocityExtractor] = None,
    ) -> List[TurnEnergyProfile]:
        """
        Computes energy and kinematic metrics for each turn in the lap.

        Args:
            lap_tel: Fine lap telemetry DataFrame with distance_m, speed_kmh, time_s, etc.
            curvature_extractor: CurvatureEnergyExtractor instance.
            braking_extractor: BrakingStressExtractor instance.
            slip_extractor: SlipVelocityExtractor instance.

        Returns:
            List of TurnEnergyProfile objects for each defined corner.
        """
        if lap_tel.empty or "distance_m" not in lap_tel.columns:
            return []

        curv_ext = curvature_extractor or CurvatureEnergyExtractor()
        brake_ext = braking_extractor or BrakingStressExtractor()
        slip_ext = slip_extractor or SlipVelocityExtractor()

        profiles: List[TurnEnergyProfile] = []

        for turn in self.turns:
            # Spatial slice along track distance
            turn_data = lap_tel[
                (lap_tel["distance_m"] >= turn.start_dist_m)
                & (lap_tel["distance_m"] <= turn.end_dist_m)
            ]

            if len(turn_data) < 3:
                continue

            time_s = turn_data["time_s"].to_numpy()
            speed_kmh = turn_data["speed_kmh"].to_numpy()
            brake_active = turn_data.get("brake_bool", pd.Series(0, index=turn_data.index)).to_numpy()

            # Curvature in turn
            if "x_m" in turn_data.columns and "y_m" in turn_data.columns and turn_data["x_m"].notna().sum() > 2:
                x_m = turn_data["x_m"].to_numpy()
                y_m = turn_data["y_m"].to_numpy()
                kappa = curv_ext.compute_curvature(x_m, y_m, time_s, signed=False)
            else:
                kappa = np.zeros(len(turn_data), dtype=float)

            a_lat, lat_energy = curv_ext.compute_lateral_energy(speed_kmh, kappa, time_s)
            _, brake_energy = brake_ext.compute_braking_energy(speed_kmh, brake_active, time_s)
            _, v_slip_lat = slip_ext.compute_slip_velocity(speed_kmh, kappa)

            total_frict = lat_energy + 0.5 * brake_energy

            profiles.append(
                TurnEnergyProfile(
                    turn_number=turn.turn_number,
                    name=turn.name,
                    corner_type=turn.corner_type,
                    direction=turn.direction,
                    mean_speed_kmh=float(np.mean(speed_kmh)),
                    min_speed_kmh=float(np.min(speed_kmh)),
                    peak_lat_acc_ms2=float(np.max(a_lat)),
                    peak_slip_velocity_ms=float(np.max(v_slip_lat)),
                    lateral_energy=lat_energy,
                    braking_energy=brake_energy,
                    total_frictional_proxy=total_frict,
                )
            )

        return profiles


class PhysicsProxyPipeline:
    """
    Engine 2: Information Extraction Pipeline (IEP).

    Synthesizes fuel mass burn, track evolution, curvature-derived lateral workload,
    longitudinal braking dissipation, sliding velocity estimation, dirty-air wake penalties,
    and corner-by-corner micro-sector profiling.
    """

    def __init__(
        self,
        fuel_model: Optional[FuelDecayModel] = None,
        track_model: Optional[TrackEvolutionModel] = None,
        curvature_extractor: Optional[CurvatureEnergyExtractor] = None,
        braking_extractor: Optional[BrakingStressExtractor] = None,
        slip_extractor: Optional[SlipVelocityExtractor] = None,
        wake_model: Optional[WakePenaltyModel] = None,
        segmenter: Optional[MicroSectorSegmenter] = None,
        lambda_lon: float = 0.5,
        lambda_lat: float = 1.0,
    ):
        """
        Initializes the Enhanced IEP Engine.

        Args:
            fuel_model: FuelDecayModel instance.
            track_model: TrackEvolutionModel instance.
            curvature_extractor: CurvatureEnergyExtractor instance.
            braking_extractor: BrakingStressExtractor instance.
            slip_extractor: SlipVelocityExtractor instance (Task 1.1).
            wake_model: WakePenaltyModel instance (Task 1.2).
            segmenter: MicroSectorSegmenter instance (Task 1.3).
            lambda_lon: Weighting constant for longitudinal work.
            lambda_lat: Weighting constant for lateral cornering work.
        """
        self.fuel_model = fuel_model or FuelDecayModel()
        self.track_model = track_model or TrackEvolutionModel()
        self.curvature_extractor = curvature_extractor or CurvatureEnergyExtractor()
        self.braking_extractor = braking_extractor or BrakingStressExtractor()
        self.slip_extractor = slip_extractor or SlipVelocityExtractor()
        self.wake_model = wake_model or WakePenaltyModel()
        self.segmenter = segmenter or MicroSectorSegmenter()
        self.lambda_lon = lambda_lon
        self.lambda_lat = lambda_lat

    def process(
        self,
        cleaned_laps_df: pd.DataFrame,
        telemetry_map: Optional[Dict[str, pd.DataFrame]] = None,
        total_session_laps: Optional[int] = None,
        gap_data: Optional[pd.Series] = None,
    ) -> PhysicsExtractionResult:
        """
        Calculates all physical proxies for the preprocessed lap dataset.

        Args:
            cleaned_laps_df: Cleaned racing laps (from PIP).
            telemetry_map: Mapping from driver abbreviation to detailed telemetry DataFrame.
            total_session_laps: Total planned race/session laps (inferred if None).
            gap_data: Optional Series of time gap to car ahead in seconds.

        Returns:
            PhysicsExtractionResult containing enriched laps, model parameters, and energy table.
        """
        if cleaned_laps_df.empty:
            return PhysicsExtractionResult(
                enriched_laps=pd.DataFrame(),
                fuel_model_params={},
                track_model_params={},
                energy_summary=pd.DataFrame(),
            )

        df = cleaned_laps_df.copy()

        # 1. Total laps determination
        if total_session_laps is None:
            total_session_laps = int(df["lap_number"].max()) if "lap_number" in df else 66

        # 2. Fuel Mass & Fuel Lap Time Correction
        fuel_mass, fuel_delta, fuel_corrected = self.fuel_model.compute_fuel_correction(
            lap_times_s=df["lap_time_s"],
            lap_numbers=df["lap_number"],
            total_laps=total_session_laps,
        )
        df["fuel_mass_kg"] = fuel_mass
        df["fuel_time_penalty_s"] = fuel_delta
        df["lap_time_fuel_corrected_s"] = fuel_corrected

        # 3. Track Evolution Index
        df = df.sort_values(by=["lap_start_time_s", "lap_number"]).reset_index(drop=True)
        cumulative_laps_arr = np.arange(1, len(df) + 1)
        df["cumulative_session_laps"] = cumulative_laps_arr

        track_ev_s, track_corrected = self.track_model.correct_lap_times(
            lap_times_s=df["lap_time_fuel_corrected_s"],
            cumulative_laps=df["cumulative_session_laps"],
        )
        df["track_evolution_s"] = track_ev_s
        df["lap_time_fully_corrected_s"] = track_corrected

        # 4. Wake Multiplier
        if "gap_to_ahead_s" in df.columns:
            df["wake_multiplier"] = self.wake_model.compute_wake_multiplier(df["gap_to_ahead_s"])
        elif gap_data is not None:
            df["wake_multiplier"] = self.wake_model.compute_wake_multiplier(gap_data.reindex(df.index))
        else:
            df["wake_multiplier"] = 1.0

        # 5. Fine Telemetry Integrals (Curvature, Slip Velocity, Micro-Sectors)
        energy_records: List[Dict[str, Any]] = []
        df["lateral_energy_proxy"] = np.nan
        df["braking_energy_proxy"] = np.nan
        df["slip_energy_proxy"] = np.nan
        df["frictional_work_proxy"] = np.nan
        df["frictional_work_wake_proxy"] = np.nan
        df["turn3_energy_proxy"] = np.nan
        df["turn9_energy_proxy"] = np.nan

        turn_profiles_by_lap: Dict[int, List[TurnEnergyProfile]] = {}

        if telemetry_map:
            logger.info("Extracting enhanced physics proxies across %d drivers", len(telemetry_map))
            for idx, row in df.iterrows():
                drv = row["driver"]
                lap_no = int(row["lap_number"])
                if drv not in telemetry_map:
                    continue

                drv_tel = telemetry_map[drv]
                start_t = row.get("lap_start_time_s")
                lap_dur = row.get("lap_time_s")

                if pd.notna(start_t) and pd.notna(lap_dur):
                    lap_tel = drv_tel[
                        (drv_tel["time_s"] >= start_t) & (drv_tel["time_s"] <= (start_t + lap_dur))
                    ]
                else:
                    lap_tel = pd.DataFrame()

                if len(lap_tel) > 10:
                    time_s = lap_tel["time_s"].to_numpy()
                    speed_kmh = lap_tel["speed_kmh"].to_numpy()
                    brake_active = lap_tel["brake_bool"].to_numpy()

                    # Curvature
                    if "x_m" in lap_tel.columns and "y_m" in lap_tel.columns and lap_tel["x_m"].notna().sum() > 10:
                        x_m = lap_tel["x_m"].to_numpy()
                        y_m = lap_tel["y_m"].to_numpy()
                        kappa = self.curvature_extractor.compute_curvature(x_m, y_m, time_s)
                    else:
                        kappa = np.zeros(len(lap_tel), dtype=float)

                    _, lat_energy = self.curvature_extractor.compute_lateral_energy(speed_kmh, kappa, time_s)
                    _, brake_energy = self.braking_extractor.compute_braking_energy(speed_kmh, brake_active, time_s)
                    _, slip_energy = self.slip_extractor.compute_slip_energy(speed_kmh, kappa, time_s)

                    # Baseline frictional work (combining cornering sliding and braking dissipation)
                    base_frict = (self.lambda_lat * lat_energy) + (self.lambda_lon * brake_energy)
                    wake_mult = float(row.get("wake_multiplier", 1.0))
                    frict_wake = base_frict * wake_mult

                    df.at[idx, "lateral_energy_proxy"] = lat_energy
                    df.at[idx, "braking_energy_proxy"] = brake_energy
                    df.at[idx, "slip_energy_proxy"] = slip_energy
                    df.at[idx, "frictional_work_proxy"] = base_frict
                    df.at[idx, "frictional_work_wake_proxy"] = frict_wake

                    # Micro-sector analysis
                    turn_profiles = self.segmenter.segment_lap(
                        lap_tel=lap_tel,
                        curvature_extractor=self.curvature_extractor,
                        braking_extractor=self.braking_extractor,
                        slip_extractor=self.slip_extractor,
                    )
                    turn_profiles_by_lap[lap_no] = turn_profiles

                    for tp in turn_profiles:
                        if tp.turn_number == 3:
                            df.at[idx, "turn3_energy_proxy"] = tp.total_frictional_proxy
                        elif tp.turn_number == 9:
                            df.at[idx, "turn9_energy_proxy"] = tp.total_frictional_proxy

                    energy_records.append({
                        "driver": drv,
                        "lap_number": lap_no,
                        "lateral_energy_proxy": lat_energy,
                        "braking_energy_proxy": brake_energy,
                        "slip_energy_proxy": slip_energy,
                        "frictional_work_proxy": base_frict,
                        "frictional_work_wake_proxy": frict_wake,
                    })

        energy_df = pd.DataFrame(energy_records)

        logger.info(
            "Enhanced IEP complete: Extracted sliding velocity, wake penalty, and micro-sectors for %d laps.",
            len(df),
        )

        return PhysicsExtractionResult(
            enriched_laps=df,
            fuel_model_params={
                "initial_fuel_mass_kg": self.fuel_model.initial_fuel_mass_kg,
                "fuel_penalty_s_per_kg": self.fuel_model.fuel_time_penalty_s_per_kg,
                "total_session_laps": float(total_session_laps),
            },
            track_model_params={
                "e_max_s": self.track_model.e_max_s,
                "tau_track_laps": self.track_model.tau_track_laps,
            },
            energy_summary=energy_df,
            turn_energy_profiles=turn_profiles_by_lap,
        )
