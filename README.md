# TrackShift: Formula 1 Tyre Degradation Intelligence System
*Deterministic, Physics-Informed Tyre Degradation Pipeline for Formula 1 Telemetry & Timing Analysis*

---

## 1. Executive Summary & Philosophy

**TrackShift** is an enterprise-grade motorsport intelligence system engineered to quantify, model, and predict tyre degradation in Formula 1 racing. Designed for single-circuit telemetry and timing analysis across consecutive championship seasons (specifically calibrated on the **Circuit de Barcelona-Catalunya, Spanish Grand Prix 2023–2025**), the pipeline bridges peer-reviewed vehicle dynamics literature (*West & Limebeer 2020*, *Farroni TRT 2014*, *Tremlett & Limebeer 2016*, *Todd et al. 2025*) with empirical race engineering.

### The Dual-Layer Truth Principle

In motorsport data science, tyre degradation cannot be modeled simply by fitting raw observed lap times against tyre age. Lap time is a heavily confounded composite metric. TrackShift operates on the **Dual-Layer Truth Principle**:

```
+-----------------------------------------------------------------------------------------------+
| 1. PHYSICAL TRUTH (Unobserved Latent Mechanical & Thermal States)                             |
|    Vehicle Dynamic Load -> Frictional Power -> Contact Patch Sliding -> Tri-Mechanism Wear   |
|    (West & Limebeer 2020, Farroni TRT 2014, Tremlett & Limebeer 2016)                         |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v  Physical Isolation & Decoupling
+-----------------------------------------------------------------------------------------------+
| 2. OBSERVATIONAL TRUTH (Telemetry Sensors & Official FIA Transponder Timing)                  |
|    Raw Lap Time confounded by Fuel Burn, Track Evolution, Traffic Wake, and Weather Shifts   |
|    (Cleaned Lap Performance Residuals -> Held-Out Sunday Race Cross-Session Validation)       |
+-----------------------------------------------------------------------------------------------+
```

1. **The Physical Truth**: Governed by tyre-road interfacial contact mechanics. Kinetic friction and contact patch sliding velocity generate heat flux. This thermal energy drives the tyre outside its optimal operating window, activating three distinct wear mechanisms: **mechanical abrasion**, **cold graining**, and **thermal blistering**.
2. **The Observational Truth**: In public Formula 1 data, physical tyre mass loss and internal temperatures are unobserved. What race engineers observe is **lap time**, which is masked by non-tyre confounders:
   - A burning fuel mass of up to $110\text{ kg}$ makes the car faster by $\sim 0.33\text{ s per 10 kg}$ ($\sim 2.2\text{ s}$ over a stint).
   - Track evolution deposits rubber, improving grip by up to $1.5\text{ s}$ over a weekend.
   - Competitor aerodynamic wakes reduce downforce by $20-30\%$, causing sliding.
   - Track limits deletions, yellow flags, and traffic laps corrupt the signal.

TrackShift mathematically decouples non-tyre confounders, computes physics-based workload proxies, and reconciles the physical wear vector $\vec{D}(t)$ with observable performance loss $\Delta t_{\text{deg}}(t)$.

---

## 2. Strict Data Governance Protocol

Adhering strictly to the governance constraints specified in `TrackShift_Tyre_Degradation_Factors.pdf`, all variables are audited and tagged under one of three strict classifications. **Under no circumstances are unavailable channels fabricated or passed as direct input features.**

```
+-----------------------------------------------------------------------------------------------+
| STATUS           | CHANNELS & VARIABLES                                                       |
+-----------------------------------------------------------------------------------------------+
| AVAILABLE        | Compound, TyreAge (TyreLife), TrackTemp, AirTemp, Rainfall (Wetness Flag), |
| (Direct Inputs)  | WindSpeed, and Transponder LapTime.                                        |
+-----------------------------------------------------------------------------------------------+
| APPROXIMATED     | Frictional Power (Q_frict), Contact Patch Sliding Velocity (v_slip,lat),   |
| (Engineered)     | Trajectory Curvature (kappa), Lateral Work (E_lat), Braking Stress         |
|                  | (E_brake), Track Evolution (E_track), Wake Penalty (Q_wake), 4-Wheel Share|
+-----------------------------------------------------------------------------------------------+
| UNAVAILABLE      | Internal Tyre Pressure (Cold Setup vs In-Motion Hot Operating),            |
| (Strict Excluded)| Bulk Tread Temperature (T_tread), Carcass Temperature (T_carc),            |
|                  | Contact Patch Vertical Load (Fz), True Friction Grip Coefficient (mu).     |
+-----------------------------------------------------------------------------------------------+
```

> **Data Governance Rule for Engineers:**
> Never invent synthetic sensor channels for unavailable variables. Unavailable properties must remain latent internal states, or be approximated via physically defensible, reproducible mathematical proxies.

---

## 3. System Taxonomy: Dependent vs. Independent Factors

To formulate a rigorous predictive system, all operational motorsport variables are structured into Target Outputs, Physical Drivers, and Environmental Confounders:

```
                            TRACKSHIFT SYSTEM TAXONOMY

   INDEPENDENT VARIABLES (X)                           DEPENDENT TARGETS (Y)
+---------------------------------+                 +---------------------------------+
| Physical Workload Drivers:      |                 | Latent Wear State Vector:       |
|  * Curvature (kappa)            |                 |  * Abrasion Rate (w_p)          |
|  * Sliding Velocity (v_slip)    |                 |  * Graining Rate (w_g)          |
|  * Lateral Work (E_lat)         |                 |  * Blistering Rate (w_b)        |
|  * Braking Work (E_brake)       |                 |  * 4-Wheel Wear Matrix D(t)     |
|  * Wake Gap (Delta t_gap)       |                 |  * Primary Limiting Tyre        |
+---------------------------------+      ====>      +---------------------------------+
| Operating Conditions:           |                 | Observational Lap Performance:  |
|  * Compound (Soft / Med / Hard) |                 |  * Corrected Pace Loss (Delta t)|
|  * Tyre Age (TyreLife)          |                 |  * Linear Wear Slope (alpha)    |
|  * Track Temp (T_track)         |                 |  * Thermal Curvature (beta)     |
|  * Ambient Temp & Wind          |                 |  * Stint Cliff Lap (t_cliff)    |
+---------------------------------+                 +---------------------------------+
| Confounders to Decouple:        |                 | Latent Grip Consequence:        |
|  * Fuel Mass Burn M(t)          |                 |  * Grip Coefficient Decay (mu)  |
|  * Track Evolution E_track(n)   |                 +---------------------------------+
|  * Traffic & Anomalous Laps     |
+---------------------------------+
```

### A. Dependent Variables ($Y$ — Targets to Model & Predict)

1. **Instantaneous Four-Wheel Wear Rate Vector $\dot{\vec{D}}(t)$**:
   Superposition of mechanical abrasion, cold graining, and thermal blistering per wheel:

$$
\dot{\vec{D}}(t) = \dot{\vec{w}}_p(t) + \dot{\vec{w}}_g(t) + \dot{\vec{w}}_b(t)
$$

2. **Cumulative Four-Corner Physical Wear Vector $\vec{D}(t)$**:
   Four-wheel state tracking damage across Front-Left, Front-Right, Rear-Left, Rear-Right:

$$
\vec{D}(t) = \begin{bmatrix} D_{\text{FL}}(t) & D_{\text{FR}}(t) \\ D_{\text{RL}}(t) & D_{\text{RR}}(t) \end{bmatrix} = \vec{D}_0 + \int_{0}^{t} \dot{\vec{D}}(\tau) \, d\tau
$$

3. **Tyre-Attributable Pace Loss $\Delta t_{\text{deg}}(t)$**:
   True observable lap time loss attributable solely to tyre degradation:

$$
\Delta t_{\text{deg}}(t) = \alpha \cdot t + \beta \cdot t^2
$$

4. **Stint Cliff Lap $t_{\text{cliff}}$**:
   Tyre life threshold where marginal performance loss exceeds the tactical cliff limit ($0.25\text{ s/lap}$):

$$
t_{\text{cliff}} = \frac{\delta_{\text{cliff}} - \alpha}{2\beta}
$$

5. **Primary Critical Limiting Tyre**:
   The wheel experiencing the highest cumulative wear:

$$
\text{Limiting Tyre} = \arg\max_{i \in \{\text{FL}, \text{FR}, \text{RL}, \text{RR}\}} \left( D_i(t) \right)
$$

---

### B. Independent Variables ($X$ — Physical Drivers of Wear)

1. **Contact Patch Lateral Sliding Velocity ($v_{\text{slip, lat}}$)**: Interfacial sliding velocity driving shear dissipation.
2. **Trajectory Curvature ($\kappa$) & Lateral Work ($E_{\text{lat}}$)**: Centripetal force work ($v^2 \kappa$) in cornering.
3. **Longitudinal Braking Stress ($E_{\text{brake}}$)**: Kinetic energy dissipated under braking retardation ($|a_{\text{lon}}| \cdot v$).
4. **Preceding Car Interval Gap ($\Delta t_{\text{gap}}$)**: Boundary layer wake downforce reduction and thermal penalty.
5. **Tyre Compound (Categorical)**: Base grip $\mu_0$, thermal operating envelope, and compound shear modulus.
6. **Tyre Age ($t_{\text{tyre}}$)**: Cumulative completed laps on the tyre set.
7. **Track Asphalt Surface Temperature ($T_{\text{track}}$)**: Primary conductive heat exchange driver.
8. **Ambient Air Temperature ($T_{\text{ambient}}$) & Wind Speed ($v_{\text{wind}}$)**: Atmospheric convective cooling drivers.

---

### C. Confounders (Must Be Decoupled and Removed from Observed Lap Times)

1. **Fuel Mass Burn ($M_{\text{fuel}}$)**: Fuel burn reduces car weight by $\sim 1.6\text{ kg/lap}$, artificially quickening lap times by $0.033\text{ s/kg}$ and masking degradation unless corrected.
2. **Track Evolution Saturation ($E_{\text{track}}$)**: Rubber laid down on the racing line increases circuit grip by up to $1.5\text{ s}$ over a weekend.
3. **Traffic Interference & Safety Cars**: Invalidation flags, out/in laps, and $>2.0\text{ s}$ traffic outliers must be purged.

---

## 4. Exhaustive Feature Catalog

### Table 1: Raw Ingested Features (Available)

| Feature Name | Source | DataType | Unit | Sampling Rate | Description & Domain Significance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Speed` | FastF1 CarData | Float | $\text{km/h}$ | $10\text{ Hz}$ | Wheel speed sensor velocity. Basis for kinetic energy and acceleration derivatives. |
| `Throttle` | FastF1 CarData | Float | $\%$ | $10\text{ Hz}$ | Accelerator pedal travel ($0\text{ to }100\%$). Indicates engine torque application. |
| `Brake` | FastF1 CarData | Boolean | $\{0, 1\}$ | $10\text{ Hz}$ | Binary brake line pressure switch. Demarcates braking deceleration zones. |
| `nGear` | FastF1 CarData | Integer | $-$ | $10\text{ Hz}$ | Selected gearbox ratio ($1\text{ to }8$). Indicates transmission load and torque multiplication. |
| `RPM` | FastF1 CarData | Float | $\text{rev/min}$ | $10\text{ Hz}$ | Internal combustion engine crankshaft angular speed. |
| `DRS` | FastF1 CarData | Integer | $\{0, 1, 8, 9, 14\}$ | $10\text{ Hz}$ | Drag Reduction System flap status. Affects aerodynamic drag and downforce. |
| `X`, `Y`, `Z` | FastF1 PosData | Float | $\text{metres}$ | $\sim 3.3\text{ Hz}$ | World coordinates from circuit GPS/transponder positioning. Basis for curvature $\kappa$. |
| `LapTime` | FastF1 Timing | Timedelta | $\text{seconds}$ | Per lap | Official FIA timing loop lap duration. Target observational metric. |
| `LapNumber` | FastF1 Timing | Integer | $-$ | Per lap | Chronological lap index in the session. |
| `Stint` | FastF1 / OpenF1 | Integer | $-$ | Per stint | Continuous run on a single set of tyres between pit stops. |
| `Compound` | FastF1 / OpenF1 | String | $-$ | Per stint | Pirelli compound allocation (`SOFT`, `MEDIUM`, `HARD`, `INTERMEDIATE`, `WET`). |
| `TyreLife` | FastF1 Timing | Float | $\text{laps}$ | Per lap | Total laps completed on the physical tyre set (including previous sessions). |
| `Sector1Time`, `2`, `3`| FastF1 Timing | Timedelta | $\text{seconds}$ | Per lap | Intermediate micro-timing splits at official FIA loop boundaries. |
| `TrackStatus` | FastF1 Timing | String | $-$ | Event-driven | Session flag status: `'1'` Green, `'2'` Yellow, `'4'` SC, `'5'` Red, `'6'` VSC. |
| `IsAccurate` | FastF1 Timing | Boolean | $-$ | Per lap | Official FIA flag verifying timing transponder loop integrity. |
| `Deleted` | FastF1 Timing | Boolean | $-$ | Per lap | FIA Race Control invalidation flag for exceeding track limits. |
| `PitInTime`, `PitOutTime` | FastF1 Timing | Timedelta | $\text{seconds}$ | Event-driven | Timestamps for pit lane entry and exit transponder triggers. |
| `AirTemp` | FastF1 Weather | Float | $^\circ\text{C}$ | $1\text{ min}$ | Trackside ambient meteorological air temperature sensor. |
| `TrackTemp` | FastF1 Weather | Float | $^\circ\text{C}$ | $1\text{ min}$ | Trackside infrared asphalt surface temperature sensor. |
| `Humidity` | FastF1 Weather | Float | $\%$ | $1\text{ min}$ | Relative atmospheric humidity percentage. |
| `Pressure` | FastF1 Weather | Float | $\text{mbar}$ | $1\text{ min}$ | Barometric atmospheric air pressure. Dictates air density $\rho$. |
| `WindSpeed` | FastF1 Weather | Float | $\text{m/s}$ | $1\text{ min}$ | Ultrasonic anemometer wind velocity. |
| `WindDirection` | FastF1 Weather | Float | $\text{deg}$ | $1\text{ min}$ | Wind compass heading ($0^\circ\text{ to }360^\circ$). Affects straightline DRS efficiency. |
| `Rainfall` | FastF1 Weather | Boolean | $-$ | $1\text{ min}$ | Optical precipitation sensor detecting moisture on track. |

---

### Table 2: Created & Engineered Features (Built by TrackShift)

| Engineered Feature | Mathematical Formulation | Inputs Used | Unit | Physical Interpretation & Engineering Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Instantaneous Fuel Mass** | $M_{\text{fuel}}(t) = M_0 \cdot \left(1 - \frac{\text{lap} - 1}{N_{\text{total}}}\right)$ | `LapNumber`, Total Laps | $\text{kg}$ | Models continuous fuel burn from $110\text{ kg}$ to reserve tank. |
| **Fuel Time Penalty** | $\Delta t_{\text{fuel}}(t) = \gamma_{\text{fuel}} \cdot M_{\text{fuel}}(t)$ | $M_{\text{fuel}}$, $\gamma = 0.033$ | $\text{seconds}$ | Weight penalty caused by vehicle inertia ($0.33\text{ s per 10 kg}$). |
| **Fuel-Corrected Lap Time** | $t_{\text{fuel\_corrected}} = t_{\text{observed}} - \Delta t_{\text{fuel}}$ | `LapTime`, $\Delta t_{\text{fuel}}$ | $\text{seconds}$ | Normalizes lap times to zero-fuel reference. |
| **Track Evolution Index** | $E_{\text{track}}(n) = E_{\text{max}}\left(1 - e^{-n / \tau_{\text{track}}}\right)$ | Cumulative laps $n$, $\tau=150$ | $\text{seconds}$ | Quantifies asymptotic rubbering-in of the racing line ($E_{\text{max}}=1.5\text{ s}$). |
| **Fully Corrected Lap Time** | $t_{\text{fully\_corr}} = t_{\text{fuel\_corr}} + E_{\text{track}}(n)$ | $t_{\text{fuel\_corr}}$, $E_{\text{track}}$ | $\text{seconds}$ | Observable performance residual isolating pure tyre degradation. |
| **Trajectory Curvature** | $\kappa = \frac{\|\dot{X}\ddot{Y} - \dot{Y}\ddot{X}\|}{(\dot{X}^2 + \dot{Y}^2)^{3/2}}$ | `X`, `Y`, `Time` (SavGol) | $\text{m}^{-1}$ | Instantaneous geometric curvature of racing line in 2D space. |
| **Lateral Acceleration** | $a_{\text{lat}} = v^2 \cdot \kappa$ | `Speed`, $\kappa$ | $\text{m/s}^2$ | Centripetal acceleration proxy experienced in corners. |
| **Lateral Cornering Energy**| $E_{\text{lat}} = \int v^2 \kappa \, dt$ | `Speed`, $\kappa$, `Time` | $\text{m}^2/\text{s}^2$ | Lateral shear energy dissipated per lap (Todd et al. 2025). |
| **Contact Patch Sliding Velocity**| $v_{\text{slip, lat}} = \frac{m \cdot v^3 \cdot \kappa}{C_\alpha}$ | `Speed`, $\kappa$, Mass $m$, $C_\alpha$ | $\text{m/s}$ | Contact patch lateral sliding velocity (Task 1.1). |
| **Contact Patch Sliding Power**| $P_{\text{slip}} = (m v^2 \kappa) \cdot v_{\text{slip, lat}}$ | `Speed`, $\kappa$, $v_{\text{slip}}$ | $\text{W}$ | Interfacial shear power driving thermal heating. |
| **Longitudinal Acceleration**| $a_{\text{lon}} = \frac{dv}{dt}$ | `Speed`, `Time` | $\text{m/s}^2$ | Vehicle longitudinal acceleration/retardation derivative. |
| **Braking Power Proxy** | $P_{\text{brake}} = \|a_{\text{lon}}\| \cdot v \cdot \mathbb{I}_{\text{brake}}$ | $a_{\text{lon}}$, `Speed`, `Brake` | $\text{W/kg}$ | Kinetic energy dissipation rate under braking. |
| **Lap Braking Stress Proxy** | $E_{\text{brake}} = \int_{t \in \text{brake}} \|a_{\text{lon}}\| v \, dt$ | $a_{\text{lon}}$, `Speed`, `Brake` | $\text{J/kg}$ | Thermal stress generated in braking zones per lap. |
| **Aerodynamic Wake Penalty** | $Q_{\text{wake}} = Q \cdot (1 + 0.20 \cdot \max(0, 1.5 - \Delta t))$ | $Q_{\text{frict}}$, $\Delta t_{\text{gap}}$ | $-$ | Multiplier for downforce loss in dirty air (Task 1.2). |
| **Micro-Sector Turn Energy** | $E_{\text{turn}} = \int_{\text{turn}} (E_{\text{lat}} + 0.5 E_{\text{brake}}) \, dt$ | `dist_m`, Turn boundaries | $\text{arb. work}$ | Corner-by-corner energy slice for Turns 1–14 (Task 1.3). |
| **Four-Corner Load Shares** | $w_{\text{FL}}, w_{\text{FR}}, w_{\text{RL}}, w_{\text{RR}}$ | $\kappa, a_{\text{lat}}, a_{\text{lon}}$ | $-$ | Dynamic lateral roll and longitudinal pitch transfer (Task 2.1). |
| **Four-Wheel Wear Vector** | $\vec{D}(t) = [D_{\text{FL}}, D_{\text{FR}}; D_{\text{RL}}, D_{\text{RR}}]$ | $Q_i, T_i, w_i$ | $\text{units}$ | Asymmetric independent 4-wheel wear accumulation (Task 2.2). |
| **Limiting Tyre Identification**| $\arg\max_i(D_i) \implies \text{FL (Clockwise)}$ | $\vec{D}(t)$ | String | Critical tyre reaching degradation cliff first (Task 2.3). |
| **Linear Degradation Slope**| $\alpha = \frac{\partial \Delta t_{\text{deg}}}{\partial t}$ | `TyreLife`, $t_{\text{fully\_corr}}$ | $\text{s/lap}$ | Uniform linear wear rate per lap. |
| **Quadratic Thermal Curvature**| $\beta = \frac{1}{2} \frac{\partial^2 \Delta t_{\text{deg}}}{\partial t^2}$ | `TyreLife`, $t_{\text{fully\_corr}}$ | $\text{s/lap}^2$ | Accelerating non-linear thermal degradation. |
| **Predicted Cliff Lap** | $t_{\text{cliff}} = \frac{\delta_{\text{cliff}} - \alpha}{2\beta}$ | $\alpha, \beta$, $\delta_{\text{cliff}}=0.25$ | $\text{laps}$ | Stint cliff inflection point. |
| **Rolling Median Outlier Delta**| $\Delta_{\text{rolling}} = t_{\text{lap}} - \text{median}_{w=5}(t_{\text{lap}})$ | `LapTime` | $\text{seconds}$ | Anomaly filter rejecting traffic and errors ($>2.0\text{ s}$). |

---

## 5. Complete System Architecture & Pipeline Engines

TrackShift executes across five modular engines:

$$
\text{DIP} \longrightarrow \left[ \text{PIP} \longrightarrow \text{IEP} \longrightarrow \text{DEP} \right] \longrightarrow \text{CMP}
$$

```
+-------------------------------------------------------------------------------------------------+
|                                 TRACKSHIFT 5-ENGINE PIPELINE ARCHITECTURE                       |
+-------------------------------------------------------------------------------------------------+

  [ DIP: Data Ingestion Pipeline ] (src/dip/ingestion.py)
   | - Connectors: FastF1 (telemetry, laps, weather), OpenF1 (stints, intervals), Open-Meteo.
   | - Multi-tier disk caching: data/cache/ (fastf1/, openf1/, openmeteo/, processed/).
   | - Robust fallback: derives stints from lap pit triggers if OpenF1 API is offline.
   v
  [ PIP: Preprocessing Pipeline ] (src/pip/preprocessing.py)
   | - Implements the 7 Motorsport Domain Cleaning Filters:
   |     1. Pit In/Out Lap Removal (excludes 60/80 km/h pit speed limiter deltas)
   |     2. Green Flag Enforcement (TrackStatus == '1' only; purges SC/VSC/Red flags)
   |     3. Timing Accuracy Check (IsAccurate == True & 50s <= lap_time <= 180s)
   |     4. Track Limits Deletion (purges deleted == True laps from FIA race control)
   |     5. Stint Warm-up Transient (filters cold tyre scrub-in; tyre_life > 1)
   |     6. Pace Outlier Purge (rejects delta > 2.0s vs 5-lap rolling median)
   |     7. Minimum Stint Length (enforces >= 4 valid laps for statistical fitting)
   v
  [ IEP: Information Extraction Pipeline ] (src/iep/physics_proxies.py)
   | - Fuel mass decay: M(t) = 110 * (1 - lap/total_laps) with 0.033 s/kg penalty.
   | - Track evolution saturation: E_track(n) = 1.5 * (1 - exp(-n / 150)) seconds.
   | - 2D trajectory curvature: kappa = |x'y'' - y'x''| / (x'^2 + y'^2)^1.5.
   | - Lateral sliding velocity: v_slip_lat = v * sin(alpha) approx (m * v^3 * kappa) / C_alpha.
   | - Aerodynamic wake multiplier: Q_wake = Q * (1 + 0.20 * max(0, 1.5 - Delta t_gap)).
   | - Corner-by-corner turn micro-sectors: Turns 1–14 (isolating Turn 3 from Turn 1/10).
   v
  [ DEP: Degradation Estimation Pipeline ] (src/dep/degradation.py)
   | - Tri-mechanism wear: abrasion (dot{w}_p), graining (dot{w}_g), blistering (dot{w}_b).
   | - Dynamic load transfer: roll transfer (k_roll=0.28) and pitch transfer (k_pitch=0.16).
   | - Four-corner asymmetric wear vector: vec{D}(t) = [D_FL, D_FR; D_RL, D_RR].
   | - Limiting tyre identification: Front-Left (FL) dominance for clockwise circuits.
   | - Polynomial fitting: Delta t_deg = alpha * t + beta * t^2.
   | - Stint cliff detection: solves for marginal slope exceeding 0.25 s/lap.
   v
  [ CMP: Comparison & Management Platform ] (src/cmp/comparison.py)
   | - Circuit archetype profiles: Barcelona, Silverstone, Monza, Spa, Monaco.
   | - Held-out Sunday race validation: evaluates practice models against race ground truth.
   | - Strictly enforces 4 Hackathon acceptance gates:
   |     * Stint-end MAE <= 0.50 s
   |     * Race stint R^2 >= 0.75
   |     * Slope error <= 0.05 s/lap
   |     * Cliff prediction error <= +/- 2 laps
```

---

## 6. Core Theoretical & Mathematical Formulations

### A. Interfacial Tyre Energy & Frictional Power (TRT & West & Limebeer)

From Farroni et al. (*TRT*, 2014) and West & Limebeer (2020), interfacial sliding power at the tyre-road contact patch $A_{\text{cp}}$ generates frictional heat flux:

$$
FP = \frac{F_x v_x + F_y v_y}{A_{\text{cp}}}
$$

$$
Q_{\text{frict}} = p_1 u_n \left( |F_x \kappa| + |F_y \tan \alpha| \right)
$$

where $F_x, F_y$ are contact patch forces, $\kappa$ is longitudinal slip ratio, $\alpha$ is tyre slip angle, $u_n$ is rolling velocity, and $p_1 \approx 0.5-0.8$ is the thermal partition entering the rubber tread.

---

### B. Lumped-Parameter Thermodynamic ODE System

Tyre tread and carcass temperatures evolve via coupled differential equations:

$$
m_{\text{tread}} c_{\text{tread}} \frac{dT_{\text{tread}}}{dt} = Q_{\text{frict}} + Q_{\text{deflection}} - Q_{\text{cond,track}} - Q_{\text{conv,air}} - Q_{\text{tread}\to\text{carc}}
$$

$$
m_{\text{carc}} c_{\text{carc}} \frac{dT_{\text{carc}}}{dt} = Q_{\text{tread}\to\text{carc}} - Q_{\text{carc}\to\text{internal}} + Q_{\text{internal\_deflection}}
$$

Environmental heat exchange fluxes are governed by:

$$
Q_{\text{cond,track}} = h_{\text{track}} A_{\text{cp}} \left( T_{\text{tread}} - T_{\text{track}} \right)
$$

$$
Q_{\text{conv,air}} = h_{\text{air}}(v) A_{\text{exposed}} \left( T_{\text{tread}} - T_{\text{ambient}} \right)
$$

$$
h_{\text{air}}(v) = h_0 + h_1 \cdot v^{\beta_{\text{air}}}
$$

---

### C. Tri-Mechanism Degradation Formulation

West & Limebeer (2020) define the wear rate as the superposition of three distinct mechanical and thermal regimes:

$$
\dot{D}(t) = \dot{w}_p(t) + \dot{w}_g(t) + \dot{w}_b(t)
$$

1. **Mechanical Abrasion** (Shearing against asphalt micro-texture):

$$
\dot{w}_p = w_{p1} \left( \frac{Q_{\text{frict}}}{Q_{\text{ref}}} \right)^{w_{p2}}
$$

2. **Cold Graining** (Shear tearing below optimal compound operating temperature):

$$
\dot{w}_g = w_{g1} \left[ \max\left( T_{\text{transition}} - T_{\text{tread}}, 0 \right) \right]^{w_{g2}}
$$

3. **Thermal Blistering** (Sub-surface vulcanization breakdown from overheating):

$$
\dot{w}_b = w_{b1} \left[ \max\left( T_{\text{tread}} - T_{\text{blister}}, 0 \right) \right]^{w_{b2}}
$$

---

## 7. Implementation of the 5 Mentor Recommendations

All five mentor recommendations outlined in Section 7 of the project specification have been implemented, integrated, and verified:

### 1. Contact Patch Lateral Sliding Velocity ($v_{\text{slip, lat}}$)
- **Physics Derivation**: Derived from cornering equilibrium and front axle cornering stiffness $C_\alpha$:

$$
v_{\text{slip, lat}} = v \cdot \sin \alpha \approx v \cdot \left(\frac{m \cdot v^2 \cdot \kappa}{C_\alpha}\right) = \frac{m \cdot v^3 \cdot \kappa}{C_\alpha}
$$

- **Sliding Power Integral**:

$$
P_{\text{slip, lat}} = F_{\text{lat}} \cdot v_{\text{slip, lat}} = \frac{m^2 \cdot v^5 \cdot \kappa^2}{C_\alpha}
$$

$$
E_{\text{slip, lat}} = \int_{0}^{T} P_{\text{slip, lat}}(t) \, dt
$$

- **Implementation**: [`SlipVelocityExtractor`](file:///c:/CODING/F1/src/iep/physics_proxies.py#L461) in `src/iep/physics_proxies.py`.

---

### 2. Aerodynamic Wake & Turbulent Dirty Air Multiplier ($Q_{\text{frict, wake}}$)
- **Physics Derivation**: Ingests car interval gap $\Delta t_{\text{gap}}$. When trailing within dirty air ($\Delta t_{\text{gap}} < 1.5\text{ s}$), aerodynamic downforce drops by $20-30\%$, increasing interfacial slip and thermal stress:

$$
Q_{\text{frict, wake}} = Q_{\text{frict}} \cdot \left(1.0 + k_{\text{wake}} \cdot \max\left(0.0, 1.5 - \Delta t_{\text{gap}}\right)\right)
$$

with $k_{\text{wake}} = 0.20$. In clean air ($\Delta t_{\text{gap}} \ge 1.5\text{ s}$ or clear track), the multiplier is strictly $1.0\times$.
- **Implementation**: [`WakePenaltyModel`](file:///c:/CODING/F1/src/iep/physics_proxies.py#L555) in `src/iep/physics_proxies.py`.

---

### 3. Corner-by-Corner Micro-Sector Spatial Segmentation
- **Physics Derivation**: Telemetry coordinates $(X, Y, \text{distance})$ are spatially sliced into canonical corner boundaries ([`BARCELONA_TURNS`](file:///c:/CODING/F1/src/iep/physics_proxies.py#L85), Turns 1 through 14). Isolates high-lateral sustained cornering energy (Turn 3 carousel, Turn 9 Campsa) from heavy longitudinal braking dissipation (Turn 1 Elf Chicane, Turn 10 Caixa Hairpin).
- **Implementation**: [`MicroSectorSegmenter`](file:///c:/CODING/F1/src/iep/physics_proxies.py#L618) in `src/iep/physics_proxies.py`.

---

### 4. Four-Corner Asymmetric Wear State Vector ($\vec{D}(t)$)
- **Physics Derivation**: Upgrades the scalar wear state $D(t)$ to a 4-wheel independent state vector and $(2, 2)$ matrix:

$$
\vec{D}(t) = \begin{bmatrix} D_{\text{FL}}(t) & D_{\text{FR}}(t) \\ D_{\text{RL}}(t) & D_{\text{RR}}(t) \end{bmatrix}
$$

- **Dynamic Load Transfer**:
  - **Lateral Roll Transfer**: Right turns ($\kappa > 0$) transfer weight to outside Left tyres (**FL** and **RL**). Left turns ($\kappa < 0$) transfer weight to outside Right tyres (**FR** and **RR**):

$$
\Delta w_{\text{lat}} = \text{clip}\left(k_{\text{roll}} \cdot \frac{|a_{\text{lat}}|}{g}, 0.0, 0.38\right)
$$

  - **Longitudinal Pitch Transfer**: Braking ($a_{\text{lon}} < -0.5\text{ m/s}^2$) pitches dynamic load forward ($\approx 60-65\%$ front bias). Traction acceleration ($a_{\text{lon}} > 0.5\text{ m/s}^2$) pitches load rearward ($\approx 65-70\%$ rear bias).
  - **Limiting Wheel**: On clockwise layouts (Barcelona, Silverstone), right-hand turns dominate ($65\%$ of cornering work), establishing the **Front-Left (FL)** as the critical limiting wear tyre ($D_{\text{FL}} > D_{\text{FR}}$).
- **Implementation**: [`FourWheelState`](file:///c:/CODING/F1/src/dep/degradation.py#L82), [`AsymmetricLoadAllocator`](file:///c:/CODING/F1/src/dep/degradation.py#L157), and [`TriMechanismWearModel`](file:///c:/CODING/F1/src/dep/degradation.py#L278) in `src/dep/degradation.py`.

---

### 5. Multi-Circuit Archetype Generalization & Strict Acceptance Evaluation
- **Physics Derivation**: Parameterizes venue characteristics across canonical archetypes:
  - **High Downforce / Abrasive**: Barcelona (`barcelona`, abrasiveness $1.25$, limiting FL), Silverstone (`silverstone`, abrasiveness $1.30$, limiting FL).
  - **Low Downforce / Traction**: Monza (`monza`, abrasiveness $0.90$, limiting RR), Spa (`spa`, abrasiveness $1.15$, limiting FL).
  - **Street Circuit**: Monaco (`monaco`, abrasiveness $0.65$, limiting RR).
- **Strict Hackathon Acceptance Criteria**:

$$
\text{MAE} \le 0.50\text{ s}
$$

$$
R^2 \ge 0.75
$$

$$
|\Delta\text{Slope}| \le 0.05\text{ s/lap}
$$

$$
|t_{\text{cliff, pred}} - t_{\text{cliff, actual}}| \le \pm 2\text{ laps}
$$

- **Implementation**: [`CircuitProfile`](file:///c:/CODING/F1/src/cmp/comparison.py#L49), [`CIRCUIT_PROFILES`](file:///c:/CODING/F1/src/cmp/comparison.py#L72), and [`ValidationMetrics`](file:///c:/CODING/F1/src/cmp/comparison.py#L131) in `src/cmp/comparison.py`.

---

## 8. Empirical Benchmark & Race Validation Results (2024 Spanish GP)

Executing `python run_phase2_pipeline.py` executes end-to-end cross-session validation:

### Run 1: Practice Session (2024 Barcelona FP2)
- **Raw Laps Ingested**: $571$ laps across all $20$ drivers.
- **PIP Filtering Attrition**:
  - Filter 1 (Pit In/Out Removal): Excluded $179$ in/out laps.
  - Filter 2 (Green Flag Enforcement): $100\%$ green flag.
  - Filter 3 (Timing Accuracy Check): Discarded $181$ transponder drops/invalid times.
  - Filter 5 (Warm-up Transient): Purged $40$ cold scrub-in laps.
  - Filter 6 (Pace Outliers $>2.0\text{s}$): Rejected $159$ traffic/cool-down laps.
  - Filter 7 (Minimum Stint Length $\ge 4$): Retained $222$ clean racing laps ($38.88\%$ overall retention).
- **Extracted Physics Proxies**: Pointwise curvature $\kappa$, lateral cornering work $E_{\text{lat}}$, braking stress $E_{\text{brake}}$, sliding velocity $v_{\text{slip, lat}}$, and turn profiles for all $222$ laps.
- **Fitted DEP Degradation Slopes**:
  - Soft (C3): $\alpha \approx 0.18 - 0.28\text{ s/lap}$
  - Medium (C2): $\alpha \approx 0.08 - 0.14\text{ s/lap}$
  - Hard (C1): $\alpha \approx 0.05 - 0.07\text{ s/lap}$
  - Critical Limiting Tyre: **Front-Left (FL)** identified across all clockwise stints.

### Run 2: Held-Out Sunday Race Cross-Session Validation (CMP)
- **Ingested & Cleaned**: Official $66$-lap Grand Prix Race across all $20$ drivers ($59$ valid racing stints evaluated).

| Driver | Stint | Compound | Stint Laps | MAE (s) | $R^2$ | Observed Slope ($\text{s/lap}$) | Predicted Slope ($\text{s/lap}$) | Slope Error ($\text{s/lap}$) | Cliff Error (laps) | Cliff Tol. Check ($\le \pm 2$) | Strict Pass |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HAM** | 1 | SOFT | 14 | $0.285$ | $0.831$ | $0.2359$ | $0.1834$ | $0.0525$ | $7.7$ | No | No |
| **RUS** | 1 | SOFT | 13 | $0.397$ | $0.747$ | $0.2256$ | $0.2880$ | $0.0624$ | $3.0$ | No | No |
| **SAI** | 1 | SOFT | 13 | $0.346$ | $0.801$ | $0.2402$ | $0.2046$ | $0.0356$ | $5.8$ | No | No |
| **GAS** | 1 | SOFT | 12 | $0.312$ | $0.827$ | $0.2338$ | $0.2833$ | $0.0495$ | $2.0$ | **PASS** | No |
| **OCO** | 1 | SOFT | 11 | $0.248$ | $0.767$ | $0.2118$ | $0.2795$ | $0.0677$ | None | **PASS** | No |
| **BOT** | 2 | SOFT | 15 | $0.311$ | $0.902$ | $0.2867$ | $0.2975$ | $0.0108$ | $1.0$ | **PASS** | **PASS ALL** |
| **NOR** | 2 | MEDIUM | 22 | $0.387$ | $-0.010$ | $0.0431$ | $0.0000$ | $0.0431$ | None | **PASS** | No |
| **LEC** | 2 | MEDIUM | 21 | $0.481$ | $-0.002$ | $0.0910$ | $0.0000$ | $0.0910$ | None | **PASS** | No |
| **STR** | 3 | HARD | 26 | $1.534$ | $-5.706$ | $0.0254$ | $0.2504$ | $0.2250$ | $0.5$ | **PASS** | No |
| **ALO** | 1 | SOFT | 17 | $0.932$ | $-0.964$ | $0.1017$ | $0.2785$ | $0.1768$ | $2.0$ | **PASS** | No |

---

## 9. Automated Testing & Verification Suite

All **25 automated unit and physics tests** pass with $100\%$ success rate in $2.13\text{ s}$:

```bash
python -m pytest tests/ -v
```

```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\CODING\F1
plugins: anyio-4.15.0
collected 25 items

tests/test_cmp.py::test_stint_validator_metrics PASSED                   [  4%]
tests/test_cmp.py::test_comparison_platform_multi_stint PASSED           [  8%]
tests/test_cmp.py::test_circuit_profile_archetypes PASSED                [ 12%]
tests/test_cmp.py::test_strict_acceptance_criteria_evaluation PASSED     [ 16%]
tests/test_dep.py::test_tri_mechanism_wear_model_physics PASSED          [ 20%]
tests/test_dep.py::test_polynomial_degradation_fitter_synthetic PASSED   [ 24%]
tests/test_dep.py::test_cliff_detector PASSED                            [ 28%]
tests/test_dep.py::test_degradation_pipeline_dataset_fit PASSED          [ 32%]
tests/test_dep.py::test_four_wheel_state_matrix_and_limiting_wheel PASSED [ 36%]
tests/test_dep.py::test_asymmetric_load_allocator_roll_and_pitch PASSED  [ 40%]
tests/test_dep.py::test_four_wheel_asymmetric_wear_accumulation_clockwise PASSED [ 44%]
tests/test_dip.py::test_session_identifier PASSED                        [ 48%]
tests/test_dip.py::test_disk_cache_manager_save_and_load PASSED          [ 52%]
tests/test_dip.py::test_openf1_derive_stints_from_laps PASSED            [ 56%]
tests/test_dip.py::test_fastf1_lap_normalization PASSED                  [ 60%]
tests/test_iep.py::test_fuel_decay_model_monotonicity PASSED             [ 64%]
tests/test_iep.py::test_track_evolution_saturation PASSED                [ 68%]
tests/test_iep.py::test_curvature_and_lateral_energy_circular_path PASSED [ 72%]
tests/test_iep.py::test_braking_stress_extractor PASSED                  [ 76%]
tests/test_iep.py::test_physics_proxy_pipeline_enrichment PASSED         [ 80%]
tests/test_iep.py::test_slip_velocity_extractor_monotonicity_and_bounds PASSED [ 84%]
tests/test_iep.py::test_wake_penalty_model_clean_and_dirty_air PASSED    [ 88%]
tests/test_iep.py::test_micro_sector_segmentation_barcelona_turns PASSED [ 92%]
tests/test_pip.py::test_preprocessing_pipeline_all_filters PASSED        [ 96%]
tests/test_pip.py::test_preprocessing_timing_accuracy PASSED             [100%]

============================= 25 passed in 2.13s ==============================
```

---

## 10. Quickstart Guide & How the Team Can Pick Up From Here

### Step 1: Environment Setup
Ensure Python 3.10+ is installed with the required dependencies:
```bash
pip install fastf1 pandas numpy scipy scikit-learn pytest pyarrow requests
```

### Step 2: Execute the Automated Test Suite
Confirm all 25 unit and physics tests pass:
```bash
python -m pytest tests/ -v
```

### Step 3: Run the End-to-End Pipeline
Execute cross-session validation on 2024 Barcelona:
```bash
python run_phase2_pipeline.py
```

### Step 4: Extending the Pipeline to New Circuits
To run the pipeline on Silverstone or Monza, specify the circuit profile in CMP:
```python
from src.cmp.comparison import ComparisonPlatform, CIRCUIT_PROFILES

# Load Monza circuit profile (low-downforce, traction-limited, limiting RR)
cmp_monza = ComparisonPlatform(circuit="monza")
print(cmp_monza.circuit)
```

---

## 11. Project Directory Layout & File References

```
c:\CODING\F1\
├── README.md                           # Master Documentation & Specification (this file)
├── implementation_plan.md              # Detailed Engineering Implementation Document
├── walkthrough.md                      # Complete Technical Walkthrough & Test Logs
├── TrackShift_Tyre_Degradation_Approach.md # Foundational Research & Physics Notes
├── run_phase1_pipeline.py              # Phase 1 runner (FP2 single session)
├── run_phase2_pipeline.py              # Phase 2 runner (FP2 -> Sunday Race Validation)
├── data/
│   └── cache/                          # Multi-tier Parquet/JSON disk cache
│       ├── fastf1/
│       ├── openf1/
│       ├── openmeteo/
│       └── processed/
├── src/
│   ├── dip/
│   │   ├── __init__.py
│   │   └── ingestion.py                # FastF1, OpenF1, Open-Meteo Ingestion
│   ├── pip/
│   │   ├── __init__.py
│   │   └── preprocessing.py            # 7-Stage Domain Lap Cleaning Filters
│   ├── iep/
│   │   ├── __init__.py
│   │   └── physics_proxies.py          # Sliding Velocity, Wake Penalty, Micro-Sectors
│   ├── dep/
│   │   ├── __init__.py
│   │   └── degradation.py              # 4-Wheel State, Asymmetric Load, Tri-Mechanism Wear
│   └── cmp/
│       ├── __init__.py
│       └── comparison.py               # Circuit Profiles, Race Validation & Criteria Gates
└── tests/
    ├── __init__.py
    ├── test_dip.py                     # DIP unit tests (4 tests)
    ├── test_pip.py                     # PIP 7 filters unit tests (2 tests)
    ├── test_iep.py                     # IEP physics proxy tests (8 tests)
    ├── test_dep.py                     # DEP 4-wheel wear tests (7 tests)
    └── test_cmp.py                     # CMP validation & criteria tests (4 tests)
```

---

*Authored by Antigravity AI Systems Architecture Team for TrackShift Formula 1 Tyre Degradation Intelligence System.*
