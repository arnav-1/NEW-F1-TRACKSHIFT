# TrackShift Feature Taxonomy & Provenance Glossary

## 1. Governance Classification
Every variable and signal in the TrackShift pipeline is categorized by availability and mathematical role:

```text
+---------------------------------------------------------------------------------------+
| 1. AVAILABLE OBSERVABLES (Direct Inputs from Official Telemetry & Timing)             |
|    Compound, LapNumber, LapTime, TyreLife, TrackTemp, AirTemp, WindSpeed, RainState   |
+---------------------------------------------------------------------------------------+
                                           |
                                           v  Physics-Informed Transformations
+---------------------------------------------------------------------------------------+
| 2. PHYSICAL INTERMEDIATES (Calculated from First Principles & Vehicle Dynamics)       |
|    Curvature (kappa), Lateral Accel (a_y), Dynamic Load (F_z), Slip Angle (alpha),    |
|    Sliding Velocity (v_slip), Frictional Power (Q_frict)                              |
+---------------------------------------------------------------------------------------+
                                           |
                                           v  Coupled ODE State-Space Propagation
+---------------------------------------------------------------------------------------+
| 3. LATENT PHYSICAL STATES (Unobserved Variables Inferred via ODE Integration)         |
|    Tread Temperature (T_tread), Carcass Temperature (T_carc), Abrasion Rate (w_p),    |
|    Graining Rate (w_g), Blistering Rate (w_b), Damage Integral D(t), Effective Grip mu |
+---------------------------------------------------------------------------------------+
                                           |
                                           v  Observation Decoupling
+---------------------------------------------------------------------------------------+
| 4. OBSERVATION CORRECTIONS (Confounders Decoupled from Lap Time Observations)         |
|    Fuel Mass Burn Delta t_fuel (-0.033 s/kg), Measured Dirty-Air Wake Delta t_wake   |
+---------------------------------------------------------------------------------------+
```

---

## 2. Master Variable Taxonomy

### A. Observables (Public Telemetry & Timing)
- `compound` [Categorical: SOFT, MEDIUM, HARD]: Pirelli tyre compound specification.
- `lap_number` [Integer]: Current lap number of the session.
- `tyre_age` [Integer]: Number of completed laps on current tyre set.
- `lap_time_s` [Float, s]: Completed flying lap time.
- `track_temp_c` [Float, °C]: Track surface temperature.
- `air_temp_c` [Float, °C]: Ambient air temperature.

### B. Physical Intermediates
- `kappa` [Float, $\text{m}^{-1}$]: Path curvature, $\kappa = \frac{X' Y'' - Y' X''}{((X')^2 + (Y')^2)^{3/2}}$ (Tier 1).
- `a_y` [Float, $\text{m/s}^2$]: Lateral centripetal acceleration, $a_y = v^2 \kappa$ (Tier 1).
- `F_z` [Float, N]: Total vertical normal load, $F_z = m g + \frac{1}{2} \rho C_L A v^2$ (Tier 1).
- `alpha` [Float, rad]: Linear cornering slip angle pre-saturation, $\alpha = \frac{F_y}{C_\alpha \Gamma_{\text{aero}}}$ (Tier 2).
- `v_slip` [Float, m/s]: Lateral sliding velocity, $v_{\text{slip,lat}} = v \sin\alpha$ (Tier 1).
- `Q_frict` [Float, W]: Frictional power dissipation, $Q_{\text{frict}} = p_1 v (|F_x \kappa| + |F_y \tan\alpha|)$ (Tier 2/3B).

### C. Latent Physical States
- `T_tread` [Float, °C]: Tread contact layer temperature (Tier 2 Farroni TRT / West ODE).
- `T_carcass` [Float, °C]: Internal tyre carcass and belt temperature (Tier 2 ODE).
- `dot_w_p` [Float, $\text{s}^{-1}$]: Mechanical abrasion wear rate, $w_{p1} (Q_{\text{frict}} / Q_{\text{ref}})^{w_{p2}}$ (Tier 2).
- `dot_w_g` [Float, $\text{s}^{-1}$]: Cold graining shear rate (Tier 2).
- `dot_w_b` [Float, $\text{s}^{-1}$]: Thermal blistering rate (Tier 2).
- `D` [Float, dimensionless $\in [0, 1]$]: Cumulative physical wear damage, $D(t) = D_0 + \int \dot{D} dt$ (Tier 2).
- `mu_eff` [Float, dimensionless]: Dynamic friction grip capacity, $\mu_{\text{eff}} = \mu_0 (1 - \lambda_{\text{wear}} D) \Phi_{\text{thermal}}(T)$ (Tier 3A).

### D. Observation Layer & Decoupling
- `delta_t_fuel` [Float, s]: Fuel burn lap time benefit, $-0.033\text{ s/kg} \times \Delta m_{\text{fuel}}$ (Tier 3B Calibrated Prior).
- `delta_t_wake` [Float, s]: Aerodynamic downforce deficit in turbulent wake (Tier 3B).
- `delta_t_tyre` [Float, s]: Tyre-attributable pace loss, $k_{\text{pace\_loss}} (1 - \mu_{\text{eff}} / \mu_0)$ (Tier 3B).

---

## 3. Explicitly Removed & Excluded Circular Features

To guarantee strict scientific integrity and eliminate target leakage, the following features are permanently excluded from model inputs:

1. **`track_rubber_evolution` (REMOVED)**:
   - *Reason*: No direct track friction sensor exists on public timing feeds. Fabricating an artificial exponential rubbering curve creates circular compensation for unmodelled tyre effects.
   - *Handling*: Track evolution is absorbed into the unmodelled residual $\varepsilon(k)$.
2. **`driver_push_level` (REMOVED)**:
   - *Reason*: Deriving driver push from lap-time residuals is target leakage (using the prediction target to predict itself).
   - *Handling*: Driver pace is represented strictly through telemetry observables (throttle/brake traces) or absorbed into residual $\Delta t_{\text{driver}}$.
3. **`grip_drop_ratio` (REMOVED)**:
   - *Reason*: Redundant with $\mu_{\text{eff}}$. Using both creates collinearity and inflated condition numbers.
4. **`thermal_excess_temp` (REMOVED)**:
   - *Reason*: Redundant with the non-linear Gaussian operating window $\Phi_{\text{thermal}}(T_{\text{tread}})$.
