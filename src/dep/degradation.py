"""
TrackShift Degradation Estimation Pipeline (DEP).

This module implements Engine 3 of the TrackShift system:
1. Tri-mechanism tyre wear dynamics (mechanical abrasion, cold graining, thermal blistering)
   derived from West & Limebeer (2020) and Tremlett & Limebeer (2016).
2. Four-corner asymmetric dynamic load allocation (FL, FR, RL, RR):
   vec{D}(t) = [D_FL, D_FR; D_RL, D_RR]
   allocating lateral load transfer to outside wheels and longitudinal pitch to front/rear axles.
3. Primary limiting tyre identification (e.g. Front-Left at Barcelona).
4. Empirical polynomial degradation fitting: Delta t = alpha * t + beta * t^2.
5. Analytical and empirical stint cliff detection driven by the limiting tyre.

Strict Data Governance:
    - Excludes unobserved bulk tread/carcass temperature sensors and direct vertical load (Fz).
    - Allocates wear based on physically defensible telemetry kinematics and dynamic load transfer proxies.

References:
    - West, E., & Limebeer, D. J. N. (2020). Optimal Tyre Management of a Formula One Car.
    - Tremlett, A. J., & Limebeer, D. J. N. (2016). Optimal Tyre Usage for a Formula One Car.
    - Farroni, F., et al. (2014). TRT: Thermo Racing Tyre - A Physical Model.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
from scipy.optimize import curve_fit

logger = logging.getLogger("trackshift.dep")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [DEP] %(message)s", datefmt="%H:%M:%S"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


@dataclass(frozen=True)
class CompoundThermalWindow:
    """
    Thermal characteristics and operating envelopes for Pirelli tyre compounds.

    Attributes:
        compound: Name of compound ('SOFT', 'MEDIUM', 'HARD').
        t_opt: Optimal tread operating temperature (°C).
        t_transition_grain: Lower boundary below which cold graining occurs (°C).
        t_blister_threshold: Upper boundary above which thermal blistering accelerates (°C).
    """
    compound: str
    t_opt: float
    t_transition_grain: float
    t_blister_threshold: float


# Default Pirelli operating windows for Circuit de Barcelona-Catalunya
DEFAULT_THERMAL_WINDOWS: Dict[str, CompoundThermalWindow] = {
    "SOFT": CompoundThermalWindow("SOFT", t_opt=95.0, t_transition_grain=85.0, t_blister_threshold=120.0),
    "MEDIUM": CompoundThermalWindow("MEDIUM", t_opt=105.0, t_transition_grain=95.0, t_blister_threshold=128.0),
    "HARD": CompoundThermalWindow("HARD", t_opt=112.0, t_transition_grain=102.0, t_blister_threshold=135.0),
    "INTERMEDIATE": CompoundThermalWindow("INTERMEDIATE", t_opt=75.0, t_transition_grain=60.0, t_blister_threshold=100.0),
    "WET": CompoundThermalWindow("WET", t_opt=65.0, t_transition_grain=50.0, t_blister_threshold=90.0),
}


@dataclass
class WearMechanisms:
    """Instantaneous breakdown of wear rate components for a single tyre."""
    abrasion_rate: float
    graining_rate: float
    blistering_rate: float
    total_wear_rate: float


@dataclass
class FourWheelState:
    """
    Four-corner independent wear state vector:
        vec{D}(t) = [ D_FL, D_FR; D_RL, D_RR ]

    Attributes:
        fl: Front-Left wear state (cumulative or rate).
        fr: Front-Right wear state.
        rl: Rear-Left wear state.
        rr: Rear-Right wear state.
    """
    fl: float
    fr: float
    rl: float
    rr: float

    def as_matrix(self) -> np.ndarray:
        """Returns wear state as a (2, 2) NumPy matrix [[FL, FR], [RL, RR]]."""
        return np.array([[self.fl, self.fr], [self.rl, self.rr]], dtype=float)

    def as_vector(self) -> np.ndarray:
        """Returns wear state as a (4,) NumPy vector [FL, FR, RL, RR]."""
        return np.array([self.fl, self.fr, self.rl, self.rr], dtype=float)

    @property
    def limiting_wheel(self) -> str:
        """Identifies the primary critical tyre bearing highest degradation."""
        mapping = {"FL": self.fl, "FR": self.fr, "RL": self.rl, "RR": self.rr}
        return max(mapping, key=mapping.get)

    @property
    def max_wear(self) -> float:
        """Returns highest wear value across all four corners."""
        return max(self.fl, self.fr, self.rl, self.rr)


@dataclass
class DegradationFitResult:
    """Parameter estimation results for polynomial degradation curve."""
    compound: str
    driver: str
    stint: int
    n_laps: int
    base_pace_s: float
    alpha: float
    beta: float
    r_squared: float
    predicted_cliff_lap: Optional[float] = None
    limiting_wheel: str = "FL"
    four_wheel_state: Optional[FourWheelState] = None
    residuals: np.ndarray = field(default_factory=lambda: np.array([]))

    def predict(self, tyre_age_laps: Union[float, np.ndarray]) -> Union[float, np.ndarray]:
        """Evaluates model pace: t_pred = base_pace + alpha * t + beta * t^2."""
        t = np.asarray(tyre_age_laps, dtype=float)
        pred = self.base_pace_s + self.alpha * t + self.beta * (t ** 2)
        return float(pred) if isinstance(tyre_age_laps, (int, float)) else pred

    def predict_degradation_delta(self, tyre_age_laps: Union[float, np.ndarray]) -> Union[float, np.ndarray]:
        """Evaluates pure degradation pace loss: Delta t = alpha * t + beta * t^2."""
        t = np.asarray(tyre_age_laps, dtype=float)
        delta = self.alpha * t + self.beta * (t ** 2)
        return float(delta) if isinstance(tyre_age_laps, (int, float)) else delta


@dataclass
class CliffDetectionResult:
    """Stint performance cliff identification metrics."""
    cliff_detected: bool
    cliff_lap: Optional[float]
    limiting_wheel: str
    marginal_rate_at_cliff_s_per_lap: float
    detection_method: str  # 'analytical' or 'empirical'


class AsymmetricLoadAllocator:
    """
    Allocates total vehicle frictional workload to the 4 individual tyres (FL, FR, RL, RR)
    based on dynamic lateral and longitudinal load transfer proxies.

    Formulation:
        1. Lateral Load Transfer:
           Right turn (kappa > 0): Dynamic weight transfers to outer Left wheels (FL, RL).
           Left turn (kappa < 0): Dynamic weight transfers to outer Right wheels (FR, RR).
           Delta w_lat = clip(k_roll * |a_lat| / g, 0.0, 0.35)

        2. Longitudinal Pitch Transfer:
           Braking (a_lon < 0): Weight transfers forward -> Front axle bias ~ 60-65%.
           Traction (a_lon > 0): Weight transfers rearward -> Rear axle bias ~ 65-70%.

        3. Four-Wheel Shares:
           w_FL = w_front * w_left
           w_FR = w_front * w_right
           w_RL = w_rear * w_left
           w_RR = w_rear * w_right
           sum_i w_i = 1.0
    """

    def __init__(
        self,
        static_front_bias: float = 0.45,
        k_roll: float = 0.28,
        k_pitch: float = 0.16,
    ):
        """
        Initializes Asymmetric Load Allocator.

        Args:
            static_front_bias: Static front axle weight distribution (default: 45%).
            k_roll: Roll stiffness lateral load transfer coefficient (default: 0.28).
            k_pitch: Pitch stiffness longitudinal load transfer coefficient (default: 0.16).
        """
        self.static_front_bias = static_front_bias
        self.k_roll = k_roll
        self.k_pitch = k_pitch

    def compute_wheel_work_shares(
        self,
        kappa: float,
        a_lat_ms2: float,
        a_lon_ms2: float,
        circuit_direction: str = "clockwise",
    ) -> Dict[str, float]:
        """
        Computes the fractional work distribution across the 4 wheels.

        Args:
            kappa: Signed or unsigned curvature (1/m). If unsigned, uses circuit_direction prior.
            a_lat_ms2: Lateral acceleration in m/s^2.
            a_lon_ms2: Longitudinal acceleration in m/s^2.
            circuit_direction: 'clockwise' (dominant right turns) or 'anticlockwise'.

        Returns:
            Dictionary with keys 'FL', 'FR', 'RL', 'RR' summing to 1.0.
        """
        g = 9.81
        abs_lat = abs(a_lat_ms2)

        # 1. Lateral Load Distribution
        delta_lat = np.clip(self.k_roll * (abs_lat / g), 0.0, 0.38)

        # Determine if turning right or left
        if kappa != 0:
            is_right_turn = kappa > 0
        else:
            # Fallback to circuit default (Barcelona is 65% right-hand corners)
            is_right_turn = (circuit_direction.lower() == "clockwise")

        if is_right_turn:
            w_left = 0.50 + delta_lat
            w_right = 0.50 - delta_lat
        else:
            w_left = 0.50 - delta_lat
            w_right = 0.50 + delta_lat

        # 2. Longitudinal Load Distribution
        if a_lon_ms2 < -0.5:
            # Braking: pitch forward
            delta_lon = np.clip(self.k_pitch * (abs(a_lon_ms2) / g), 0.0, 0.22)
            w_front = np.clip(self.static_front_bias + delta_lon, 0.45, 0.70)
            w_rear = 1.0 - w_front
        elif a_lon_ms2 > 0.5:
            # Traction acceleration: pitch rearward
            delta_lon = np.clip(self.k_pitch * (abs(a_lon_ms2) / g), 0.0, 0.25)
            w_rear = np.clip((1.0 - self.static_front_bias) + delta_lon, 0.55, 0.75)
            w_front = 1.0 - w_rear
        else:
            w_front = self.static_front_bias
            w_rear = 1.0 - self.static_front_bias

        w_fl = w_front * w_left
        w_fr = w_front * w_right
        w_rl = w_rear * w_left
        w_rr = w_rear * w_right

        total = w_fl + w_fr + w_rl + w_rr
        return {
            "FL": float(w_fl / total),
            "FR": float(w_fr / total),
            "RL": float(w_rl / total),
            "RR": float(w_rr / total),
        }

    def allocate_frictional_work(
        self,
        q_frict_total: float,
        kappa: float,
        a_lat_ms2: float,
        a_lon_ms2: float,
        circuit_direction: str = "clockwise",
    ) -> Dict[str, float]:
        """Allocates total frictional power proxy among the 4 wheels."""
        shares = self.compute_wheel_work_shares(kappa, a_lat_ms2, a_lon_ms2, circuit_direction)
        return {k: q_frict_total * v for k, v in shares.items()}


class TriMechanismWearModel:
    """
    Computes instantaneous and accumulated tyre wear using the tri-mechanism
    superposition model defined by West & Limebeer (2020) and Tremlett & Limebeer (2016),
    with full support for four-corner independent wear vectors.

    Formulation:
        dot{D}(t) = dot{w}_p(t) + dot{w}_g(t) + dot{w}_b(t)

        dot{w}_p = w_{p1} * (Q_frict / Q_ref)^(w_{p2})  [Mechanical Abrasion]
        dot{w}_g = w_{g1} * [max(T_trans - T_tread, 0)]^(w_{g2})  [Cold Graining]
        dot{w}_b = w_{b1} * [max(T_tread - T_blister, 0)]^(w_{b2})  [Thermal Blistering]

    Four-Corner Vector:
        vec{D}(t) = [ D_FL, D_FR; D_RL, D_RR ]
    """

    def __init__(
        self,
        wp1: float = 1e-4,
        wp2: float = 1.2,
        wg1: float = 5e-5,
        wg2: float = 1.5,
        wb1: float = 8e-5,
        wb2: float = 1.8,
        q_ref: float = 1000.0,
        thermal_windows: Optional[Dict[str, CompoundThermalWindow]] = None,
        load_allocator: Optional[AsymmetricLoadAllocator] = None,
    ):
        """
        Initializes the Tri-Mechanism Wear Model.

        Args:
            wp1: Mechanical abrasion baseline coefficient.
            wp2: Mechanical abrasion workload exponent (default: 1.2).
            wg1: Graining sensitivity coefficient.
            wg2: Graining thermal deficit exponent (default: 1.5).
            wb1: Blistering sensitivity coefficient.
            wb2: Blistering thermal excess exponent (default: 1.8).
            q_ref: Normalizing reference frictional power proxy.
            thermal_windows: Compound thermal operating thresholds.
            load_allocator: AsymmetricLoadAllocator instance for 4-wheel decomposition.
        """
        self.wp1 = wp1
        self.wp2 = wp2
        self.wg1 = wg1
        self.wg2 = wg2
        self.wb1 = wb1
        self.wb2 = wb2
        self.q_ref = max(1.0, q_ref)
        self.thermal_windows = thermal_windows or DEFAULT_THERMAL_WINDOWS
        self.load_allocator = load_allocator or AsymmetricLoadAllocator()

    def compute_wear_rate(
        self,
        q_frict: float,
        t_tread_c: float,
        compound: str = "MEDIUM",
    ) -> WearMechanisms:
        """Computes wear rate for a single wheel/workload."""
        window = self.thermal_windows.get(compound.upper(), self.thermal_windows["MEDIUM"])

        # 1. Mechanical Abrasion
        q_ratio = max(0.0, q_frict) / self.q_ref
        w_p = self.wp1 * (q_ratio ** self.wp2)

        # 2. Cold Graining (active below t_transition_grain)
        delta_cold = max(0.0, window.t_transition_grain - t_tread_c)
        w_g = self.wg1 * (delta_cold ** self.wg2)

        # 3. Thermal Blistering (active above t_blister_threshold)
        delta_hot = max(0.0, t_tread_c - window.t_blister_threshold)
        w_b = self.wb1 * (delta_hot ** self.wb2)

        total_rate = w_p + w_g + w_b

        return WearMechanisms(
            abrasion_rate=float(w_p),
            graining_rate=float(w_g),
            blistering_rate=float(w_b),
            total_wear_rate=float(total_rate),
        )

    def compute_four_wheel_wear_rates(
        self,
        q_frict_total: float,
        t_tread_c: float,
        kappa: float,
        a_lat_ms2: float,
        a_lon_ms2: float,
        compound: str = "MEDIUM",
        circuit_direction: str = "clockwise",
    ) -> FourWheelState:
        """
        Computes instantaneous wear rates for all 4 corners independently.

        Returns:
            FourWheelState containing instantaneous wear rates for FL, FR, RL, RR.
        """
        wheel_work = self.load_allocator.allocate_frictional_work(
            q_frict_total=q_frict_total,
            kappa=kappa,
            a_lat_ms2=a_lat_ms2,
            a_lon_ms2=a_lon_ms2,
            circuit_direction=circuit_direction,
        )

        rates = {}
        for wheel, q_w in wheel_work.items():
            # Estimate thermal shift based on corner load (higher load = slightly hotter tyre)
            load_factor = q_w / max(1e-3, q_frict_total * 0.25)
            t_wheel = t_tread_c + 5.0 * (load_factor - 1.0)
            wear = self.compute_wear_rate(q_frict=q_w, t_tread_c=t_wheel, compound=compound)
            rates[wheel] = wear.total_wear_rate

        return FourWheelState(
            fl=rates["FL"],
            fr=rates["FR"],
            rl=rates["RL"],
            rr=rates["RR"],
        )

    def accumulate_stint_wear(
        self,
        q_frict_series: pd.Series,
        t_tread_series: pd.Series,
        compound: str = "MEDIUM",
    ) -> pd.DataFrame:
        """
        Integrates scalar wear rate across a stint series.

        Returns:
            DataFrame with instantaneous wear components and accumulated_D.
        """
        records = []
        d_accum = 0.0
        for q_val, t_val in zip(q_frict_series, t_tread_series):
            wear = self.compute_wear_rate(q_frict=q_val, t_tread_c=t_val, compound=compound)
            d_accum += wear.total_wear_rate
            records.append({
                "abrasion_rate": wear.abrasion_rate,
                "graining_rate": wear.graining_rate,
                "blistering_rate": wear.blistering_rate,
                "total_wear_rate": wear.total_wear_rate,
                "accumulated_D": d_accum,
            })
        return pd.DataFrame(records, index=q_frict_series.index)

    def accumulate_four_wheel_stint_wear(
        self,
        q_frict_series: pd.Series,
        t_tread_series: pd.Series,
        a_lat_series: pd.Series,
        a_lon_series: pd.Series,
        compound: str = "MEDIUM",
        circuit_direction: str = "clockwise",
    ) -> pd.DataFrame:
        """
        Integrates four-wheel wear states across a stint series.

        Returns:
            DataFrame with D_FL, D_FR, D_RL, D_RR and primary limiting wheel.
        """
        records = []
        d_fl, d_fr, d_rl, d_rr = 0.0, 0.0, 0.0, 0.0

        for q_val, t_val, alat_val, alon_val in zip(
            q_frict_series, t_tread_series, a_lat_series, a_lon_series
        ):
            # Curvature proxy from a_lat
            kappa_proxy = 0.01 if circuit_direction == "clockwise" else -0.01
            wheel_rates = self.compute_four_wheel_wear_rates(
                q_frict_total=q_val,
                t_tread_c=t_val,
                kappa=kappa_proxy,
                a_lat_ms2=alat_val,
                a_lon_ms2=alon_val,
                compound=compound,
                circuit_direction=circuit_direction,
            )

            d_fl += wheel_rates.fl
            d_fr += wheel_rates.fr
            d_rl += wheel_rates.rl
            d_rr += wheel_rates.rr

            state = FourWheelState(fl=d_fl, fr=d_fr, rl=d_rl, rr=d_rr)
            records.append({
                "D_FL": d_fl,
                "D_FR": d_fr,
                "D_RL": d_rl,
                "D_RR": d_rr,
                "limiting_wheel": state.limiting_wheel,
                "max_wear": state.max_wear,
            })

        return pd.DataFrame(records, index=q_frict_series.index)


class PolynomialDegradationFitter:
    """
    Fits empirical polynomial degradation models to fuel- and track-corrected lap times:
        Delta t_deg(t) = alpha * t + beta * t^2

    Combined with baseline pace t_0:
        t_predicted(t) = t_0 + alpha * t + beta * t^2
    """

    def __init__(self, max_beta: float = 0.05):
        """Initializes Polynomial Fitter."""
        self.max_beta = max_beta

    @staticmethod
    def _poly2_func(t: np.ndarray, base_pace: float, alpha: float, beta: float) -> np.ndarray:
        """Quadratic pace function."""
        return base_pace + alpha * t + beta * (t ** 2)

    def fit_stint(
        self,
        tyre_age_laps: np.ndarray,
        corrected_lap_times_s: np.ndarray,
        compound: str = "UNKNOWN",
        driver: str = "UNKNOWN",
        stint: int = 1,
        limiting_wheel: str = "FL",
        four_wheel_state: Optional[FourWheelState] = None,
    ) -> Optional[DegradationFitResult]:
        """
        Fits polynomial degradation model to a single stint's lap data.
        """
        t = np.asarray(tyre_age_laps, dtype=float)
        y = np.asarray(corrected_lap_times_s, dtype=float)

        if len(t) < 3:
            return None

        p0 = [float(np.min(y)), 0.05, 0.002]
        bounds = (
            [float(np.min(y) - 5.0), 0.0, 0.0],
            [float(np.max(y) + 5.0), 1.5, self.max_beta],
        )

        try:
            popt, _ = curve_fit(self._poly2_func, t, y, p0=p0, bounds=bounds, maxfev=2000)
            base_pace, alpha, beta = popt

            y_pred = self._poly2_func(t, *popt)
            residuals = y - y_pred
            ss_res = float(np.sum(residuals ** 2))
            ss_tot = float(np.sum((y - np.mean(y)) ** 2))
            r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 1e-6 else 0.0

            cliff_lap = None
            if beta > 1e-5:
                t_cliff = (0.25 - alpha) / (2.0 * beta)
                if t_cliff > 0:
                    cliff_lap = float(t_cliff)

            return DegradationFitResult(
                compound=compound,
                driver=driver,
                stint=stint,
                n_laps=len(t),
                base_pace_s=float(base_pace),
                alpha=float(alpha),
                beta=float(beta),
                r_squared=float(r2),
                predicted_cliff_lap=cliff_lap,
                limiting_wheel=limiting_wheel,
                four_wheel_state=four_wheel_state,
                residuals=residuals,
            )
        except Exception as exc:
            logger.debug("Polynomial curve fit fallback for %s stint %d: %s", driver, stint, exc)
            try:
                poly1 = np.polyfit(t, y, deg=1)
                alpha = max(0.0, float(poly1[0]))
                base_pace = float(poly1[1])
                y_pred = base_pace + alpha * t
                residuals = y - y_pred
                ss_res = float(np.sum(residuals ** 2))
                ss_tot = float(np.sum((y - np.mean(y)) ** 2))
                r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 1e-6 else 0.0
                return DegradationFitResult(
                    compound=compound,
                    driver=driver,
                    stint=stint,
                    n_laps=len(t),
                    base_pace_s=base_pace,
                    alpha=alpha,
                    beta=0.0,
                    r_squared=float(r2),
                    predicted_cliff_lap=None,
                    limiting_wheel=limiting_wheel,
                    four_wheel_state=four_wheel_state,
                    residuals=residuals,
                )
            except Exception:
                return None


class CliffDetector:
    """
    Detects the onset of the performance cliff in a tyre stint driven
    by the primary limiting wheel.
    """

    def __init__(self, marginal_threshold_s_per_lap: float = 0.25):
        """Initializes Cliff Detector."""
        self.marginal_threshold = marginal_threshold_s_per_lap

    def detect_cliff(
        self,
        fit_result: Optional[DegradationFitResult] = None,
        tyre_age_laps: Optional[np.ndarray] = None,
        observed_pace_s: Optional[np.ndarray] = None,
    ) -> CliffDetectionResult:
        """Evaluates analytical and empirical cliff criteria."""
        limiting = fit_result.limiting_wheel if fit_result else "FL"

        # 1. Analytical Evaluation from Fitted Model
        if fit_result and fit_result.beta > 1e-5:
            t_cliff = (self.marginal_threshold - fit_result.alpha) / (2.0 * fit_result.beta)
            if 0 < t_cliff <= 60:
                marginal_rate = fit_result.alpha + 2.0 * fit_result.beta * t_cliff
                return CliffDetectionResult(
                    cliff_detected=True,
                    cliff_lap=float(t_cliff),
                    limiting_wheel=limiting,
                    marginal_rate_at_cliff_s_per_lap=float(marginal_rate),
                    detection_method="analytical",
                )

        # 2. Empirical Evaluation from Pace Series
        if tyre_age_laps is not None and observed_pace_s is not None and len(observed_pace_s) >= 4:
            pace_diff = np.diff(observed_pace_s)
            for idx in range(len(pace_diff) - 1):
                if pace_diff[idx] > 0.35 and pace_diff[idx + 1] > 0.25:
                    cliff_lap = float(tyre_age_laps[idx + 1])
                    return CliffDetectionResult(
                        cliff_detected=True,
                        cliff_lap=cliff_lap,
                        limiting_wheel=limiting,
                        marginal_rate_at_cliff_s_per_lap=float(pace_diff[idx]),
                        detection_method="empirical",
                    )

        return CliffDetectionResult(
            cliff_detected=False,
            cliff_lap=None,
            limiting_wheel=limiting,
            marginal_rate_at_cliff_s_per_lap=0.0,
            detection_method="none",
        )


class DegradationPipeline:
    """
    Engine 3: Degradation Estimation Pipeline (DEP).

    Fits four-corner asymmetric degradation models and identifies primary limiting tyres.
    """

    def __init__(
        self,
        wear_model: Optional[TriMechanismWearModel] = None,
        fitter: Optional[PolynomialDegradationFitter] = None,
        cliff_detector: Optional[CliffDetector] = None,
        circuit_direction: str = "clockwise",
    ):
        """Initializes Degradation Pipeline components."""
        self.wear_model = wear_model or TriMechanismWearModel()
        self.fitter = fitter or PolynomialDegradationFitter()
        self.cliff_detector = cliff_detector or CliffDetector()
        self.circuit_direction = circuit_direction

    def fit_dataset(
        self,
        cleaned_laps_df: pd.DataFrame,
        pace_column: str = "lap_time_fully_corrected_s",
    ) -> Dict[str, Any]:
        """
        Fits degradation models for each compound across all stints in the dataset.
        """
        if cleaned_laps_df.empty or pace_column not in cleaned_laps_df.columns:
            return {"stint_fits": [], "compound_models": {}, "summary_table": pd.DataFrame()}

        df = cleaned_laps_df.copy()
        stint_fits: List[DegradationFitResult] = []

        # Determine limiting wheel based on track direction
        # Clockwise (Barcelona) -> Front-Left (FL); Anticlockwise -> Front-Right (FR)
        default_limiting = "FL" if self.circuit_direction == "clockwise" else "FR"

        # Fit individual stints
        for (drv, stint_no, comp), group in df.groupby(["driver", "stint", "compound"], sort=False):
            if len(group) < 4:
                continue

            # Compute four-corner wear state proxy if energy is present
            q_mean = float(group.get("frictional_work_proxy", pd.Series(1000.0, index=group.index)).mean())
            lat_mean = float(group.get("lateral_energy_proxy", pd.Series(500.0, index=group.index)).mean())
            lon_mean = float(group.get("braking_energy_proxy", pd.Series(300.0, index=group.index)).mean())

            wheel_shares = self.wear_model.load_allocator.compute_wheel_work_shares(
                kappa=0.01 if self.circuit_direction == "clockwise" else -0.01,
                a_lat_ms2=np.sqrt(max(0.0, lat_mean)),
                a_lon_ms2=-1.0,
                circuit_direction=self.circuit_direction,
            )
            n_laps_stint = len(group)
            four_wheel = FourWheelState(
                fl=wheel_shares["FL"] * q_mean * n_laps_stint * 1e-4,
                fr=wheel_shares["FR"] * q_mean * n_laps_stint * 1e-4,
                rl=wheel_shares["RL"] * q_mean * n_laps_stint * 1e-4,
                rr=wheel_shares["RR"] * q_mean * n_laps_stint * 1e-4,
            )

            fit_res = self.fitter.fit_stint(
                tyre_age_laps=group["tyre_life"].to_numpy(),
                corrected_lap_times_s=group[pace_column].to_numpy(),
                compound=str(comp),
                driver=str(drv),
                stint=int(stint_no),
                limiting_wheel=four_wheel.limiting_wheel,
                four_wheel_state=four_wheel,
            )
            if fit_res:
                stint_fits.append(fit_res)

        # Fit compound-level aggregate models
        compound_models: Dict[str, DegradationFitResult] = {}
        for comp, group in df.groupby("compound", sort=False):
            if len(group) < 6:
                continue

            comp_fit = self.fitter.fit_stint(
                tyre_age_laps=group["tyre_life"].to_numpy(),
                corrected_lap_times_s=group[pace_column].to_numpy(),
                compound=str(comp),
                driver="ALL",
                stint=0,
                limiting_wheel=default_limiting,
            )
            if comp_fit:
                compound_models[str(comp)] = comp_fit

        summary_records = []
        for fit in stint_fits:
            summary_records.append({
                "driver": fit.driver,
                "stint": fit.stint,
                "compound": fit.compound,
                "n_laps": fit.n_laps,
                "base_pace_s": round(fit.base_pace_s, 3),
                "alpha_deg_s_per_lap": round(fit.alpha, 4),
                "beta_deg_s_per_lap2": round(fit.beta, 5),
                "r_squared": round(fit.r_squared, 3),
                "limiting_wheel": fit.limiting_wheel,
                "predicted_cliff_lap": round(fit.predicted_cliff_lap, 1) if fit.predicted_cliff_lap else None,
            })

        summary_df = pd.DataFrame(summary_records)
        logger.info(
            "DEP complete: Fitted %d asymmetric stint models and %d compound models (Limiting: %s)",
            len(stint_fits),
            len(compound_models),
            default_limiting,
        )

        return {
            "stint_fits": stint_fits,
            "compound_models": compound_models,
            "summary_table": summary_df,
        }
