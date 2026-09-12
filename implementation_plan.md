# Phase 2 & Mentor Recommendations Implementation Plan: TrackShift F1 Tyre Degradation System

## 1. Executive Summary & Architecture
TrackShift is an enterprise-grade motorsport intelligence system engineered to quantify, model, and predict tyre degradation in Formula 1 racing. The pipeline bridges published vehicle dynamics research (West & Limebeer, Farroni TRT, Tremlett & Limebeer) with empirical race engineering across single-circuit telemetry and timing analysis (Circuit de Barcelona-Catalunya).

The architecture follows a modular, 5-engine pipeline:

$$
\text{DIP} \longrightarrow \left[ \text{PIP} \longrightarrow \text{IEP} \longrightarrow \text{DEP} \right] \longrightarrow \text{CMP}
$$

This plan documents the completed implementation of the **5 Mentor Recommendations** across the Information Extraction Pipeline (`IEP`), the Degradation Estimation Pipeline (`DEP`), and the Comparison & Management Platform (`CMP`), conforming to strict data governance constraints.

---

## 2. Strict Data Governance Protocol
Adhering to `TrackShift_Tyre_Degradation_Factors.pdf`, every variable in the system is classified under one of three governance statuses. Under no circumstances are unavailable channels invented as dummy sensors or passed as direct model inputs:

```
+---------------------------------------------------------------------------------------------------+
| 1. AVAILABLE (Direct Inputs from Public Telemetry & Timing)                                       |
|    Compound, TyreAge (TyreLife), TrackTemp, AirTemp, Rainfall (Wet flag), WindSpeed, LapTime.    |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v  Physics-Informed Transformations
+---------------------------------------------------------------------------------------------------+
| 2. APPROXIMATED (Engineered Physics Proxies)                                                      |
|    Sliding Velocity (v_slip), Frictional Work (Q_frict), Lateral Work (E_lat),                    |
|    Braking Stress (E_brake), Track Saturation (E_track), Wake Penalty (Q_wake), 4-Wheel Shares.   |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v  Explicit Physical Isolation
+---------------------------------------------------------------------------------------------------+
| 3. UNAVAILABLE (Strictly Excluded from Direct Model Inputs)                                       |
|    Internal Tyre Pressure, Tread Surface Temp (T_tread), Carcass Temp (T_carc),                  |
|    Contact Patch Vertical Load (Fz), True Friction Grip Coefficient (mu).                         |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Taxonomy of Variables: Dependent vs. Independent Factors

### A. The Dependent Variables ($Y$ — Targets to Model & Predict)
1. **Instantaneous Wear Rate Vector $\dot{\vec{D}}(t)$**:
   Superposition of mechanical abrasion, cold graining, and thermal blistering:

   $$
   \dot{\vec{D}}(t) = \dot{\vec{w}}_p(t) + \dot{\vec{w}}_g(t) + \dot{\vec{w}}_b(t)
   $$

2. **Cumulative Physical Degradation Vector $\vec{D}(t)$**:
   Four-corner state vector tracking accumulated damage:

   $$
   \vec{D}(t) = \begin{bmatrix} D_{\text{FL}}(t) & D_{\text{FR}}(t) \\ D_{\text{RL}}(t) & D_{\text{RR}}(t) \end{bmatrix} = \vec{D}_0 + \int_{0}^{t} \dot{\vec{D}}(\tau) \, d\tau
   $$

3. **Tyre-Attributable Pace Loss $\Delta t_{\text{deg}}(t)$**:
   Observed lap time drop attributable solely to tyre wear:

   $$
   \Delta t_{\text{deg}}(t) = \alpha \cdot t + \beta \cdot t^2
   $$

4. **Stint Performance Cliff Lap $t_{\text{cliff}}$**:
   Tyre age where marginal lap loss exceeds $0.25\text{ s/lap}$:

   $$
   t_{\text{cliff}} = \frac{\delta_{\text{cliff}} - \alpha}{2\beta}
   $$

5. **Grip Coefficient Decay $\mu(t)$**:
   Unobserved latent degradation state:

   $$
   \mu(t) = \mu_0 \cdot f(T) \cdot (1 - \alpha_D \cdot D(t))
   $$

---

### B. The Independent Variables ($X$ — Physical Drivers of Degradation)
1. **Lateral Cornering Work ($E_{\text{lat}}$)**: Work done by centripetal forces and slip angles ($v^2 \cdot \kappa$).
2. **Contact Patch Sliding Velocity ($v_{\text{slip, lat}}$)**: Interfacial sliding velocity driving shear dissipation.
3. **Longitudinal Braking Stress ($E_{\text{brake}}$)**: Kinetic energy dissipated under braking retardation ($|a_{\text{lon}}| \cdot v \cdot \mathbb{I}_{\text{brake}}$).
4. **Tyre Compound (Categorical)**: Base friction $\mu_0$, thermal operating envelope, and compound shear stiffness.
5. **Tyre Age ($t_{\text{tyre}}$)**: Cumulative completed laps on the tyre set.
6. **Track Surface Temperature ($T_{\text{track}}$)**: Direct driver of tyre-to-track conductive heat exchange.
7. **Ambient Air Temperature ($T_{\text{ambient}}$) & Wind Speed ($v_{\text{wind}}$)**: Convective cooling influences.
8. **Preceding Car Interval Gap ($\Delta t_{\text{gap}}$)**: Induces aerodynamic downforce reduction and dirty-air sliding.

---

### C. Confounders (Must be Decoupled and Removed from Observed Lap Times)
1. **Fuel Mass Burn ($M_{\text{fuel}}$)**: Heavier car early in stint masks wear by $\sim 0.033\text{ s/kg}$ ($~2.2\text{ s}$ over race).
2. **Track Evolution Saturation ($E_{\text{track}}$)**: Progressive rubber deposition improves track pace by up to $1.5\text{ s}$.
3. **Pace Outliers & Traffic**: Transponder errors, cool-down laps, and yellow flag phases.

---

## 4. Feature Catalog: Existing Raw Features vs. Engineered Features

### Table 1: Raw Ingested Features (Available)
| Feature Name | Source | DataType | Unit | Sampling Rate | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Speed` | FastF1 CarData | Float | $\text{km/h}$ | $10\text{ Hz}$ | Direct wheel speed sensor velocity. |
| `Throttle` | FastF1 CarData | Float | $\%$ | $10\text{ Hz}$ | Throttle pedal application percentage ($0-100\%$). |
| `Brake` | FastF1 CarData | Boolean | $\{0, 1\}$ | $10\text{ Hz}$ | Binary brake line pressure sensor trigger. |
| `nGear` | FastF1 CarData | Integer | $-$ | $10\text{ Hz}$ | Selected gearbox ratio ($1-8$). |
| `RPM` | FastF1 CarData | Float | $\text{rev/min}$ | $10\text{ Hz}$ | Engine crankshaft angular speed. |
| `DRS` | FastF1 CarData | Integer | $-$ | $10\text{ Hz}$ | Drag Reduction System status flag. |
| `X`, `Y`, `Z` | FastF1 PosData | Float | $\text{metres}$ | $\sim 3.3\text{ Hz}$ | World coordinates from circuit GPS/transponder loop. |
| `LapTime` | FastF1 Timing | Timedelta | $\text{seconds}$ | Per lap | Official FIA timing loop lap duration. |
| `LapNumber` | FastF1 Timing | Integer | $-$ | Per lap | Chronological lap index in session. |
| `Stint` | FastF1 / OpenF1 | Integer | $-$ | Per stint | Stint sequence index on tyre set. |
| `Compound` | FastF1 / OpenF1 | String | $-$ | Per stint | Pirelli compound allocation (`SOFT`, `MEDIUM`, `HARD`). |
| `TyreLife` | FastF1 Timing | Float | $\text{laps}$ | Per lap | Cumulative laps completed on tyre set. |
| `TrackStatus` | FastF1 Timing | String | $-$ | Event-driven | Flag status (`'1'` Green, `'2'` Yellow, `'4'` SC). |
| `IsAccurate` | FastF1 Timing | Boolean | $-$ | Per lap | Official FIA timing transponder integrity flag. |
| `Deleted` | FastF1 Timing | Boolean | $-$ | Per lap | FIA Race Control track limits deletion flag. |
| `TrackTemp` | FastF1 Weather | Float | $^\circ\text{C}$ | $1\text{ min}$ | Trackside infrared asphalt surface sensor. |
| `AirTemp` | FastF1 Weather | Float | $^\circ\text{C}$ | $1\text{ min}$ | Ambient meteorological air temperature. |
| `WindSpeed` | FastF1 Weather | Float | $\text{m/s}$ | $1\text{ min}$ | Ultrasonic anemometer airflow velocity. |
| `Rainfall` | FastF1 Weather | Boolean | $-$ | $1\text{ min}$ | Track wetness precipitation flag. |

---

### Table 2: Engineered Physics Features (Created by TrackShift)
| Engineered Feature | Mathematical Formulation | Inputs Used | Unit | Physical Significance |
| :--- | :--- | :--- | :--- | :--- |
| **Instantaneous Fuel Mass** | $$M_{\text{fuel}}(t) = M_0 \left(1 - \frac{\text{lap} - 1}{N_{\text{total}}}\right)$$ | `LapNumber`, Total Laps | $\text{kg}$ | Decouples fuel burn ($110\text{ kg} \to 0\text{ kg}$). |
| **Fuel Time Penalty** | $$\Delta t_{\text{fuel}}(t) = \gamma_{\text{fuel}} \cdot M_{\text{fuel}}(t)$$ | $M_{\text{fuel}}$, $\gamma = 0.033$ | $\text{s}$ | Weight penalty ($0.33\text{ s per 10 kg}$). |
| **Fuel-Corrected Pace** | $$t_{\text{fuel\_corr}} = t_{\text{obs}} - \Delta t_{\text{fuel}}$$ | `LapTime`, $\Delta t_{\text{fuel}}$ | $\text{s}$ | Normalizes lap times to zero-fuel reference. |
| **Track Evolution Index** | $$E_{\text{track}}(n) = E_{\text{max}}(1 - e^{-n/\tau})$$ | Session laps $n$, $\tau=150$ | $\text{s}$ | Asymptotic saturation of circuit macro-grip. |
| **Fully Corrected Pace** | $$t_{\text{fully\_corr}} = t_{\text{fuel\_corr}} + E_{\text{track}}$$ | $t_{\text{fuel\_corr}}$, $E_{\text{track}}$ | $\text{s}$ | True tyre-attributable performance residual. |
| **Trajectory Curvature** | $$\kappa = \frac{\|\dot{X}\ddot{Y} - \dot{Y}\ddot{X}\|}{(\dot{X}^2 + \dot{Y}^2)^{3/2}}$$ | `X`, `Y`, `Time` (SavGol) | $\text{m}^{-1}$ | Racing line 2D trajectory curvature. |
| **Lateral Acceleration** | $$a_{\text{lat}} = v^2 \cdot \kappa$$ | `Speed`, $\kappa$ | $\text{m/s}^2$ | Centripetal acceleration proxy. |
| **Lateral Cornering Energy** | $$E_{\text{lat}} = \int v^2 \kappa \, dt$$ | `Speed`, $\kappa$, `Time` | $\text{m}^2/\text{s}^2$ | Lateral shear energy dissipated per lap. |
| **Contact Patch Sliding Velocity** | $$v_{\text{slip, lat}} = \frac{m \cdot v^3 \cdot \kappa}{C_\alpha}$$ | `Speed`, $\kappa$, Mass $m$, $C_\alpha$ | $\text{m/s}$ | Contact patch sliding velocity (Task 1.1). |
| **Sliding Power Proxy** | $$P_{\text{slip}} = (m v^2 \kappa) \cdot v_{\text{slip, lat}}$$ | `Speed`, $\kappa$, $v_{\text{slip}}$ | $\text{W}$ | Interfacial shear power dissipation. |
| **Longitudinal Braking Stress** | $$E_{\text{brake}} = \int \|a_{\text{lon}}\| v \mathbb{I}_{\text{brake}} \, dt$$ | `Speed`, `Brake`, `Time` | $\text{J/kg}$ | Kinetic energy dissipated under braking. |
| **Aerodynamic Wake Multiplier** | $$Q_{\text{wake}} = Q \cdot (1 + 0.20 \cdot \max(0, 1.5 - \Delta t_{\text{gap}}))$$ | $Q_{\text{frict}}$, $\Delta t_{\text{gap}}$ | $-$ | Dirty air downforce loss multiplier (Task 1.2). |
| **Micro-Sector Turn Energy** | $$E_{\text{turn}} = \int_{\text{turn\_start}}^{\text{turn\_end}} (E_{\text{lat}} + 0.5 E_{\text{brake}}) \, dt$$ | Spatial coordinates, `dist` | $\text{arb. work}$ | Corner-by-corner energy slice (Task 1.3). |
| **Four-Corner Load Shares** | $w_{\text{FL}}, w_{\text{FR}}, w_{\text{RL}}, w_{\text{RR}}$ ($\sum w_i = 1$) | $\kappa, a_{\text{lat}}, a_{\text{lon}}$ | $-$ | Dynamic roll and pitch transfer (Task 2.1). |
| **Four-Wheel Wear Vector** | $\vec{D}(t) = [D_{\text{FL}}, D_{\text{FR}}; D_{\text{RL}}, D_{\text{RR}}]$ | $Q_i, T_i, w_i$ | $\text{units}$ | Asymmetric per-wheel wear state (Task 2.2). |
| **Limiting Tyre Identification** | $\text{argmax}_{i}(D_i) \implies \text{FL (Clockwise)}$ | $\vec{D}(t)$ | String | Critical limiting tyre identification (Task 2.3). |
| **Linear Degradation Rate** | $\alpha = \frac{\partial \Delta t}{\partial t}$ | `TyreLife`, $t_{\text{fully\_corr}}$ | $\text{s/lap}$ | Uniform linear wear rate per lap. |
| **Quadratic Thermal Curvature**| $\beta = \frac{1}{2} \frac{\partial^2 \Delta t}{\partial t^2}$ | `TyreLife`, $t_{\text{fully\_corr}}$ | $\text{s/lap}^2$ | Accelerating thermal degradation rate. |
| **Predicted Cliff Lap** | $$t_{\text{cliff}} = \frac{0.25 - \alpha}{2\beta}$$ | $\alpha, \beta$ | $\text{laps}$ | Stint cliff inflection point. |

---

## 5. Architectural Upgrades: The 5 Mentor Recommendations

### Task 1: Information Extraction Pipeline (`src/iep/physics_proxies.py`)
- **Sliding Velocity Extractor**: Computes lateral slip angle $\alpha = \frac{m v^2 \kappa}{C_\alpha}$ and lateral sliding velocity $v_{\text{slip, lat}} = v \sin \alpha \approx \frac{m v^3 \kappa}{C_\alpha}$.
- **Wake Penalty Model**: Ingests preceding car interval $\Delta t_{\text{gap}}$ and applies thermal multiplier $1.0 + 0.20 \cdot \max(0, 1.5 - \Delta t_{\text{gap}})$.
- **Micro-Sector Segmenter**: Isolates high-lateral turns (Turn 3 carousel, Turn 9) from heavy-braking zones (Turn 1, Turn 10) for Circuit de Barcelona-Catalunya.

### Task 2: Degradation Estimation Pipeline (`src/dep/degradation.py`)
- **FourWheelState**: Represents wear as a $(2, 2)$ matrix and $(4,)$ vector. Identifies limiting wheel and maximum corner wear.
- **AsymmetricLoadAllocator**: Allocates total vehicle frictional work dynamically to the 4 corners based on lateral roll transfer ($\kappa > 0 \implies \text{Left outer tyres}$; $\kappa < 0 \implies \text{Right outer tyres}$) and longitudinal pitch transfer (braking forward bias $\approx 60-65\%$; traction rearward bias $\approx 65-70\%$).
- **TriMechanismWearModel**: Superimposes mechanical abrasion, cold graining, and thermal blistering per wheel independently, establishing Front-Left (FL) dominance around clockwise circuits.
- **CliffDetector**: Evaluates analytical and empirical cliff thresholds driven by the limiting tyre.

### Task 3: Comparison & Management Platform (`src/cmp/comparison.py`)
- **Circuit Profiles**: Canonical parameterizations for Barcelona, Silverstone, Monza, Spa, and Monaco.
- **Strict Acceptance Criteria**: Enforces:

  $$
  \text{MAE} \le 0.50\text{ s}, \quad R^2 \ge 0.75, \quad |\Delta\text{Slope}| \le 0.05\text{ s/lap}, \quad |\Delta_{\text{cliff}}| \le \pm 2\text{ laps}
  $$

---

## 6. Verification Plan & Test Execution

### Automated Tests (`pytest`)
All **25 automated unit and physics tests** pass cleanly:
```bash
python -m pytest tests/ -v
# 25 passed in 2.15s
```
- `tests/test_iep.py`: 8 tests verifying fuel burn, track saturation, circular path curvature, braking energy, sliding velocity bounds & monotonicity, wake multiplier, and Barcelona turn micro-sectors.
- `tests/test_dep.py`: 7 tests verifying tri-mechanism physics, polynomial curve fitting, cliff detection, FourWheelState matrix/vector representations, AsymmetricLoadAllocator roll & pitch load transfer, and clockwise 4-wheel wear accumulation ($D_{\text{FL}} > D_{\text{FR}}$).
- `tests/test_cmp.py`: 4 tests verifying stint validation metrics, multi-stint orchestration, circuit profile archetypes, and strict acceptance criteria enforcement.
- `tests/test_dip.py` (4 tests) & `tests/test_pip.py` (2 tests): Baseline ingestion, caching, and 7 domain cleaning filters.

### End-to-End Execution (`run_phase2_pipeline.py`)
- Runs cross-session validation of 2024 Barcelona FP2 models against 59 held-out Sunday Race stints.
- Validates that soft tyre degradation slopes, medium tyre degradation slopes, and limiting wheel identifications align with empirical race telemetry.
