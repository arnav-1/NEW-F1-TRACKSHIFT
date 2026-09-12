# TrackShift: Product Requirements Document (PRD)
## AI Motorsport Intelligence: Physics-Informed F1 Tyre Degradation Engine

*Document Version: 2.0.0*  
*Target System: TrackShift v2.0*  
*Calibrated Focus: Haas F1 Team (Nico Hülkenberg) | Circuit de Barcelona-Catalunya & Silverstone*  

---

## 1. Product Overview & Strategic Objective

### 1.1 The Core Problem Statement
In Formula 1 race engineering, practice session (FP1, FP2, FP3) lap times are heavily confounded by non-tyre external variables:
1. **Fuel Mass Burn**: Cars burn ~1.65 kg of fuel per lap, becoming ~0.054 s/lap faster naturally.
2. **Track Rubbering-In Evolution**: Asphalt grip improves by 1.0s to 1.5s over a weekend as rubber embeds into micro-asperities.
3. **Operational Noise & Traffic**: ERS recharge laps, driver lift-and-coast, and dirty air distort true tyre performance.
4. **Stint Length Deficits**: Teams rarely run full race-distance stints in practice; Hard compound data is frequently sparse or absent.

Naive statistical regression or unconstrained polynomials (e.g., fitting $y = a \cdot t^2 + b \cdot t + c$ on observed lap times) fail catastrophically: they extrapolate wildly on unobserved compounds, resulting in slope errors exceeding 1000%.

### 1.2 Product Objective: The Dual-Horizon Prediction System
TrackShift delivers an enterprise-grade motorsport intelligence platform that solves the prediction dilemma by implementing a **Dual-Horizon Hybrid Architecture**:

1. **Horizon A: Pre-Race Baseline Prior (Saturday Night Simulation)**:
   - Trained on Free Practice (FP1, FP2, FP3) long runs and qualifying telemetry.
   - Decouples confounders to establish the global strategy plan, compound allocation, and expected fuel-corrected prior degradation curves.
2. **Horizon B: Live Lap-by-Lap State Estimator (Sunday Afternoon Primary Engine)**:
   - Operates live on the pit wall during the Grand Prix.
   - Runs a closed-loop Extended Kalman Filter (EKF) on the 85-second timing transponder feed.
   - Continuously corrects latent tyre damage D_k and effective friction mu_k in real time, dynamically recalibrating the optimal pit window and tyre cliff horizon lap.

By combining both, TrackShift bridges the gap between **strategic preparation** (the baseline plan) and **tactical execution** (real-time telemetry adaptation).

---

## 2. System Architecture: The Dual-Layer & Dual-Horizon Framework

TrackShift is structured around two intersecting structural axes: physical vs. observational reality, and pre-race vs. live-race operational horizons:

```text
+===================================================================================================+
|                                    TRACKSHIFT DUAL-HORIZON ENGINE                                 |
+===================================================================================================+
|  HORIZON A: PRE-RACE STRATEGY SIMULATION (Saturday Baseline Prior)                                 |
|  - Inputs: FP1, FP2, FP3 Long Runs, Asphalt Geometry, Weather Forecast                           |
|  - Engine: Deterministic Forward State-Space ODE Integration                                      |
|  - Output: Strategic Tyre Allocation, Nominal Pit Laps, Prior Degradation Slopes                 |
+---------------------------------------------------------------------------------------------------+
                                                  │  Provides Prior Belief (x_0, P_0)
                                                  ▼
+---------------------------------------------------------------------------------------------------+
|  HORIZON B: LIVE LAP-BY-LAP STATE ESTIMATOR (Sunday Primary Prediction Engine)                    |
|  - Inputs: Real-Time Timing Transponder Feed, Instantaneous Tyre Age, Micro-Sector Speeds         |
|  - Engine: Closed-Loop Extended Kalman Filter (EKF) / Bayesian Recursive State Estimator          |
|  - Output: Latent Damage State (D_k +/- 1.96 sigma), Real-Time Pace (y_post), Dynamic Pit Window  |
+===================================================================================================+

+---------------------------------------------------------------------------------------------------+
| 1. PHYSICAL TRUTH (Unobserved Mechanical & Thermal States)                                        |
|    Vehicle Kinematics -> Contact Patch Shear -> Sliding Power -> Coupled Thermal ODE -> Wear     |
|    (West & Limebeer 2020, Farroni TRT 2014, Tremlett & Limebeer 2016)                             |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼  Physical-to-Observational Mapping
+---------------------------------------------------------------------------------------------------+
| 2. OBSERVATIONAL TRUTH (Telemetry Sensors & FIA Timing Feeds)                                     |
|    Raw Lap Time confounded by Fuel Weight, Track Rubbering, Traffic Spikes, and Weather Shifts   |
|    (Decoupled Lap Residuals -> Live Innovation Update -> Dynamic Cliff Horizon Forecast)         |
+---------------------------------------------------------------------------------------------------+
```

1. **The Physical Truth**: Governed by contact patch sliding shear. Kinetic friction generates thermal energy flux Q_frict, driving tread, carcass, and wheel rim heat exchange and triggering mechanical abrasion, cold graining, and thermal blistering.
2. **The Observational Truth**: In public Formula 1 data, tyre mass loss and internal temperatures are unobserved. The system isolates the clean observational residual:
   ```text
   Pace_Corrected = Raw_LapTime - Fuel_Time_Penalty + Track_Evolution_Gain
   ```

---

## 3. Data Governance & Feature Taxonomy

### 3.1 Strict Data Classification
To preserve absolute integrity and avoid data leakage, all telemetry and timing channels are partitioned into three regulatory categories:

```text
+------------------+--------------------------------------------------------------------------------+
| CLASSIFICATION   | CHANNELS & VARIABLES                                                          |
+------------------+--------------------------------------------------------------------------------+
| AVAILABLE        | LapTime, LapNumber, TyreLife, Compound, TrackTemp, AirTemp, TrackStatus,       |
| (Direct Inputs)  | Deleted, Speed_kmh, Throttle, Brake, RPM, X_coord, Y_coord.                   |
+------------------+--------------------------------------------------------------------------------+
| APPROXIMATED     | Curvature (kappa), Lateral Force (F_lat), Dynamic Slip Angle (alpha),          |
| (Engineered)     | Sliding Velocity (v_slip), Frictional Power (Q_frict), 4-Wheel Shares (D_vec), |
|                  | Fuel Mass, Fuel Penalty, Track Evolution, Thermal States, Damage Integral D.   |
+------------------+--------------------------------------------------------------------------------+
| EXCLUDED         | Internal Tyre Pressure (TPMS cold/hot), 16-Channel IR Surface Carcass Temps,  |
| (Strict Rule)    | Direct Contact Patch Vertical Load (Fz), True Direct Friction Coefficient.     |
+------------------+--------------------------------------------------------------------------------+
```

### 3.2 Comprehensive Independent vs. Dependent Feature Matrix

| Feature Identifier | Class | Data Source / Mathematical Derivation | Engineering Role |
| :--- | :--- | :--- | :--- |
| `LapTime` | **Independent** | FIA Official Transponder Feed | Total elapsed lap duration in seconds |
| `LapNumber` | **Independent** | Timing Feed | Session sequential lap counter |
| `TyreLife` | **Independent** | Pirelli / FIA Timing Telemetry | Laps completed on current tyre set |
| `Compound` | **Independent** | FIA Timing Feed | Compound type (`SOFT`, `MEDIUM`, `HARD`, `INTER`, `WET`) |
| `TrackTemp` | **Independent** | Trackside Weather Station | Bulk asphalt surface temperature (°C) |
| `AirTemp` | **Independent** | Trackside Weather Station | Ambient atmospheric air temperature (°C) |
| `TrackStatus` | **Independent** | Race Control Digital Feed | Flag condition (`1` = Green, `4` = SC, `6` = VSC) |
| `Deleted` | **Independent** | Race Control Feed | Lap deletion flag for track limits breaches |
| `Speed_kmh` | **Independent** | Wheel Speed Encoders | Instantaneous chassis longitudinal speed |
| `Throttle` | **Independent** | Throttle Position Sensor | Engine accelerator demand percentage (0-100%) |
| `Brake` | **Independent** | Master Cylinder Hydraulic Sensor | Braking activation percentage (0-100%) |
| `X_coord, Y_coord` | **Independent** | Transponder / High-Precision GPS | Circuit Cartesian planar position (meters) |
| `Fuel_Remaining_kg` | **Dependent** | `InitialFuel - (TyreLife - 1) * BurnRate` | Instantaneous vehicle fuel mass (kg) |
| `Fuel_Penalty_s` | **Dependent** | `0.033 s/kg * Fuel_Remaining_kg` | Lap time delta induced by fuel mass |
| `Track_Evolution_s`| **Dependent** | `1.25s * (1.0 - exp(-Lap / 120.0))` | Grip improvement from deposited rubber |
| `Pace_Corrected_s` | **Dependent** | `LapTime - Fuel_Penalty + Track_Ev` | Confounder-decoupled pace residual |
| `Curvature_kappa` | **Dependent** | `(X'*Y'' - Y'*X'') / (X'^2 + Y'^2)^1.5` | Instantaneous trajectory curvature ($1/\text{m}$) |
| `Force_Lateral_N` | **Dependent** | `VehicleMass * (v_ms ^ 2) * |kappa|` | Centripetal cornering force (Newtons) |
| `Slip_Angle_rad` | **Dependent** | `F_lat / (C_alpha * Aero_Deficit)` | Contact patch lateral slip angle (radians) |
| `Sliding_Velocity` | **Dependent** | `v_ms * sin(alpha)` | Interfacial rubber shear speed (m/s) |
| `Frictional_Power` | **Dependent** | `0.65 * (F_lat*v_lat + F_lon*v_lon)` | Heat energy flux generated at tyre-road (W) |
| `T_tread_C` | **Dependent** | Coupled Thermodynamic ODE Integration | Bulk surface tread temperature (°C) |
| `T_carcass_C` | **Dependent** | Coupled Thermodynamic ODE Integration | Deep tyre carcass core temperature (°C) |
| `Damage_D` | **Dependent** | Tri-Mechanism Wear Rate Integral | Dimensionless cumulative structural damage |
| `mu_effective` | **Dependent** | `mu_base * (1 - lambda*D) * Phi(T)` | Instantaneous tyre-road grip coefficient |
| `Delta_t_deg_s` | **Dependent** | `3.5s * (1 - mu_eff / mu_base)` | Final predicted lap time degradation (s) |

---

## 4. 4-Wheel Dynamic Load & Energy Transfer Mechanics

### 4.1 Physical Grounding
Vehicle dynamics establish that tyre degradation is highly asymmetric across the four corners of a racing car (*Milliken & Milliken, Race Car Vehicle Dynamics*). The pipeline resolves an explicit **4-Wheel Dynamic Workload Vector**:

```text
D_vector = [ D_FL, D_FR, D_RL, D_RR ]
```

### 4.2 Axle Pitch Split (Longitudinal Transfer)
Braking transfers mass to the front axle; traction squats mass to the rear axle:

```text
delta_lon = clip(k_pitch * (|a_lon| / g), 0.0, 0.25)
```
* **Braking ($a_{\text{lon}} < -0.5\text{ m/s}^2$)**:
  ```text
  w_front = clip(0.45 + delta_lon, 0.45, 0.70)
  w_rear  = 1.0 - w_front
  ```
* **Traction Acceleration ($a_{\text{lon}} > +0.5\text{ m/s}^2$)**:
  ```text
  w_rear  = clip(0.55 + delta_lon, 0.55, 0.75)
  w_front = 1.0 - w_rear
  ```
* **Neutral Cruising**:
  ```text
  w_front = 0.45,  w_rear = 0.55   (FIA Static Weight Baseline)
  ```

### 4.3 Axle Roll Split (Lateral Centripetal Transfer)
Cornering transfers normal load to the outside wheels:

```text
delta_lat = clip(k_roll * (|a_lat| / g), 0.0, 0.38)
```
* **Right-Hand Turn ($\kappa > 0$)**: Dynamic weight rolls to outer **Left** wheels:
  ```text
  w_left  = 0.50 + delta_lat
  w_right = 0.50 - delta_lat
  ```
* **Left-Hand Turn ($\kappa < 0$)**: Dynamic weight rolls to outer **Right** wheels:
  ```text
  w_left  = 0.50 - delta_lat
  w_right = 0.50 + delta_lat
  ```

### 4.4 Four-Corner Allocation & Limiting Tyre Principle
```text
w_FL = w_front * w_left
w_FR = w_front * w_right
w_RL = w_rear  * w_left
w_RR = w_rear  * w_right
```

* **Barcelona Asymmetry**: Circuit de Barcelona-Catalunya has 9 right-hand turns vs. 3 left-hand turns. High-speed right-handers (Turn 3 at 220 km/h and Turn 9 at 245 km/h) subject the **Front-Left (FL)** tyre to peak aerodynamic load and lateral shear:
  * **FL Work Share**: ~36% (Limiting Tyre)
  * **RL Work Share**: ~28%
  * **FR Work Share**: ~18%
  * **RR Work Share**: ~18%
* **Limiting Tyre Rule**: In Formula 1, vehicle lap time is dictated by the **weakest tyre corner** (the limiting tyre that loses grip first and triggers severe understeer or snap oversteer). TrackShift maps the degradation of the limiting corner directly to lap pace loss.

---

## 5. Mathematical Formulations Step-by-Step

### 5.1 Step 1: 7-Stage Domain Data Cleaning
```text
1. No Pit In/Out:     pit_in_time is NaN  AND  pit_out_time is NaN
2. Green Flag:        track_status == "1"
3. Timing Accuracy:   is_accurate == True  AND  (60.0 <= lap_time <= 180.0)
4. Track Limits:      deleted == False
5. Scrubbed In:       tyre_life > 1.0
6. Traffic Outliers:  lap_time - RollingMedian(lap_time, window=5) <= 2.5s
7. Minimum Stint:     count(stint_laps) >= 3
```

### 5.2 Step 2: Confounder Decoupling

#### Fuel Mass & Time Penalty
```text
Fuel_Remaining(t) = Initial_Fuel - (TyreLife - 1) * (Initial_Fuel / Total_Race_Laps)
Fuel_Penalty(t)   = 0.033 s/kg * Fuel_Remaining(t)
```
*(Initial_Fuel = 35 kg in FP, 110 kg at Race Start. Burn rate = 1.65 kg/lap at Barcelona)*

#### Track Evolution Saturation Model
```text
Track_Evolution(n) = 1.25s * (1.0 - exp(-Session_Lap / 120.0))
```

#### Decoupled Observational Pace
```text
Pace_Corrected = Raw_LapTime - Fuel_Penalty + Track_Evolution
```

### 5.3 Step 3: Contact Patch Frictional Power (TRT Mechanics)
```text
F_lat       = Vehicle_Mass * (v_ms ^ 2) * |kappa|
alpha       = F_lat / (C_alpha_front * Aero_Deficit_Factor)
v_slip_lat  = v_ms * sin(alpha)
v_slip_lon  = 0.03 * v_ms (braking > 1.0 m/s^2), else 0.005 * v_ms
Q_frict     = 0.65 * (F_lat * v_slip_lat + F_lon * v_slip_lon) * (Vehicle_Mass / Mass_FP_Nominal)^2
```

### 5.4 Step 4: Coupled Thermodynamic State-Space ODE
```text
Q_conduction = h_track * Area_contact * (T_tread - T_track)
Q_convection = (h_air_0 + h_air_v * v_ms^0.8) * Area_exposed * (T_tread - T_ambient)
Q_internal   = k_tread_carcass * (T_tread - T_carcass)
Q_deflection = 0.02 * Q_frict
Q_rim        = h_rim * (T_carcass - T_ambient)

d(T_tread)/dt   = (Q_frict - Q_conduction - Q_convection - Q_internal) / (m_tread * c_tread)
d(T_carcass)/dt = (Q_internal + Q_deflection - Q_rim) / (m_carcass * c_carcass)
```
*(Carcass-to-rim heat transfer Q_rim prevents unphysical thermal accumulation, stabilizing tyre operating temperature inside the 95°C-105°C working window).*

### 5.5 Step 5: Tri-Mechanism Degradation Superposition
```text
dot_w_abrasion    = Surface_Abrasiveness * wp1 * (Q_frict / Q_ref)^1.15 * (PushLevel ^ 2)
dot_w_graining    = wg1 * max(0.0, T_transition_grain - T_tread) ^ 1.4
dot_w_blistering  = wb1 * max(0.0, T_tread - T_blister_threshold) ^ 1.7 * (PushLevel ^ 3)

dot_w_total       = dot_w_abrasion + dot_w_graining + dot_w_blistering
Damage_D(t)       = Damage_D(t - 1) + dot_w_total * dt_laps
```

### 5.6 Step 6: Dynamic Grip & Lap Consequence Mapping (Engineering Surrogates)
> [!NOTE]
> In published literature (*West & Limebeer 2020*, *Pacejka 2012*), grip is represented by non-linear 2D surfaces $\mu(T_{\text{tread}}, w)$ within the Magic Formula. TrackShift implements a **separable reduced-order engineering surrogate** to decouple reversible thermal viscoelasticity from irreversible mechanical surface damage without requiring computationally intensive non-linear Pacejka iterations on timing data. Full derivations are documented in [`docs/MATHEMATICAL_FORMULATIONS_AND_DERIVATIONS.md`](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/MATHEMATICAL_FORMULATIONS_AND_DERIVATIONS.md).

```text
# 1. Reversible Thermal Operating Window (Parabolic Plateau)
Half_Window     = 0.5 * T_window
Excess_Temp     = max(0.0, |T_tread - T_opt| - Half_Window)
Phi_thermal     = max(0.70, 1.0 - k_thermal * (Excess_Temp / Half_Window) ^ 2)

# 2. Irreversible Mechanical Wear Degradation (1st-Order Taylor Expansion)
Psi_wear        = max(0.0, 1.0 - lambda_wear * Damage_D)

# 3. Separable Effective Friction Surrogate (Tier 3)
mu_effective    = mu_base * Psi_wear * Phi_thermal
Grip_Drop_Ratio = max(0.0, 1.0 - (mu_effective / mu_base))

# 4. Quasi-Steady-State Lap-Time Sensitivity (1st-Order Taylor Series Expansion)
Delta_t_deg     = k_pace_loss * Grip_Drop_Ratio
```
*(Here $k_{\text{pace\_loss}}$ is the aggregate cornering time sensitivity of the circuit, derived from $\frac{\partial T_{\text{lap}}}{\partial \mu} \approx -\frac{T_{\text{corners}}}{2\mu_0}\bar{\Gamma}_{\text{aero}}$, yielding $\approx 2.2\text{ s}$ per $10\%$ grip reduction for Circuit de Barcelona-Catalunya).*

### 5.7 Step 7: Live Lap-by-Lap Recursive State Estimator (Extended Kalman Filter)
During the race, the system transitions into closed-loop mode, running an online Extended Kalman Filter (EKF) on the timing transponder stream:

1. **State Vector**:
   ```text
   x_k = [ Damage_D(k), Friction_mu(k) ]^T
   ```
2. **Time Update (Physics Prior)**:
   ```text
   x_prior(k) = f(x_post(k-1), u_k)
   P_prior(k) = F * P_post(k-1) * F^T + Q
   y_prior(k) = BasePace + k_pace_loss * (1.0 - mu_prior / mu_0)
   ```
3. **Measurement Innovation**:
   ```text
   innovation(k) = y_obs(k) - y_prior(k)
   S(k)          = H * P_prior(k) * H^T + R
   ```
4. **Kalman Gain & Posterior State Update**:
   ```text
   K(k)      = (P_prior(k) * H^T) / S(k)
   x_post(k) = x_prior(k) + K(k) * innovation(k)
   P_post(k) = (I - K(k) * H) * P_prior(k)
   ```
5. **Dynamic Cliff Horizon Projection**:
   Forward-simulates the remaining stint from the updated posterior state x_post(k) to determine the exact lap where tyre pace falls off the cliff (Delta_t_deg >= 2.2s):
   ```text
   Projected_Cliff_Lap = Current_Lap + Delta_Laps_to_Cliff
   ```

---

## 6. First-Principles Engineering Reasoning: Why a Dual-Horizon Approach is Essential

### 6.1 The Analogy in Simple Terms
* **Pre-Race Simulation is like printing Google Maps directions before starting a road trip**:
  You need it before leaving home. It tells you the overall route, which highways to take, what fuel stops to plan, and your estimated total travel time.
* **Live Lap-by-Lap Estimation is like the GPS navigation app running live on the dashboard**:
  Once you are on the road, an unexpected traffic jam, a sudden storm, or road construction occurs. A printed piece of paper cannot help you. The live GPS senses your actual speed, recalculates your ETA, and tells you: *"Take Exit 14 in 2 miles to save 15 minutes."*
* **Why We Must Use Both**:
  You cannot start a Grand Prix with ONLY a live filter (you would have no starting fuel calculation, no tyre set allocation, and no strategy baseline). But you cannot win a Grand Prix with ONLY a static plan (you will blindly stay out when traffic or graining destroys the rubber). **TrackShift unifies both into a single cohesive pipeline.**

### 6.2 Mathematical Reasoning: Open-Loop Drift vs. Closed-Loop Stability

1. **Open-Loop Error Accumulation (Pre-Race Limitations)**:
   Static forward simulation integrates ordinary differential equations without sensor feedback:
   ```text
   Error(t) ~ Integral[ (model_friction - true_friction) dt ]
   ```
   If baseline grip is off by just 1.5%, that tiny discrepancy integrates linearly and quadratically over 25 laps. By Lap 20, open-loop predictions can drift by +1.5s to +2.5s away from actual race times.

2. **Closed-Loop Telemetry Bounding (Live EKF Advantage)**:
   The Live Kalman Filter closes the control loop every ~85 seconds via the innovation residual:
   ```text
   e_k = y_observed(k) - y_predicted(k)
   ```
   If the driver encounters dirty air or manages pace, the innovation e_k immediately adjusts the latent damage state D_k. Sustained drift becomes mathematically impossible because the model is anchored back to physical reality on every start/finish loop crossing.

3. **Outlier Rejection (Noise vs. State Distinction)**:
   If a driver encounters a single yellow flag or locks up into Turn 1, naive regression overreacts and assumes the tyres are destroyed. The Kalman Gain K_k balances process noise Q (true wear) against measurement noise R (traffic spikes), filtering out high-frequency noise while preserving the true physical wear trend.

---

## 7. Engineering Assumptions & Ablation Framework

```text
+---------------------------------------------------------------------------------------------------+
| ASSUMPTION 1: Haas Aerodynamic Downforce Deficit (Aero_Deficit_Factor = 0.88)                     |
| Physical Cause: Haas chassis generates ~12% lower peak downforce in mid/high-speed corners.       |
| Direct Effect:  Cornering stiffness C_alpha drops; tyre operates at higher slip angle alpha;      |
|                 sliding power increases, raising steady-state tread temperature by +4.8°C.        |
+---------------------------------------------------------------------------------------------------+
| ASSUMPTION 2: High-Fuel Mass-Squared Sliding Energy Scaling ((Mass_Race / Mass_FP)^2)             |
| Physical Cause: Centripetal force and sliding velocity both scale with vehicle mass.              |
| Direct Effect:  Sliding work scales quadratically with race fuel load (110kg vs 35kg); prevents   |
|                 underpredicting early-stint degradation when the car is heavy.                    |
+---------------------------------------------------------------------------------------------------+
| ASSUMPTION 3: Driver Pace Management / Lift-and-Coast (PushLevel = 0.94)                          |
| Physical Cause: Drivers deliberately cruise at 92-95% pace in race middle stints to save tyres.   |
| Direct Effect:  Lowers mechanical abrasion by ~12% and suppresses thermal blistering; eliminates  |
|                 false-positive tyre cliff predictions.                                            |
+---------------------------------------------------------------------------------------------------+
```

---

## 8. Post-Race Validation System & Next-Race Learning

### 8.1 The Core Post-Race Validation Question
The post-race validation layer answers a single, rigorous engineering question:
> **Did the tyre degradation model calibrated from practice correctly predict what the tyres actually did in the race?**

Unlike live in-race estimation (which is tactical and reactive), post-race validation is an **audit and parameter learning engine**. It reconstructs the ground-truth race stints, validates degradation shapes and mechanisms, and closes the engineering loop for the next race.

### 8.2 The 7 Post-Race Validation Pillars

1. **Reconstruct Every Actual Race Stint**:
   For every tyre set used in the race, reconstruct tyre age `a`, observed lap pace, sector times, and model-predicted degradation. Compare:
   ```text
   D_practice(a)   vs.   D_race(a)
   ```
2. **Compare the Shape, Not Just One MAE**:
   Fits a second-order polynomial on both predicted and observed degradation:
   ```text
   D(a) = beta_0 + beta_1 * a + beta_2 * a^2
   ```
   Reports: initial degradation (beta_0), linear degradation slope (beta_1), and curvature (beta_2).
   ```text
   Slope Error     = |beta_1,pred - beta_1,actual|
   Curvature Error = |beta_2,pred - beta_2,actual|
   ```
3. **Align Latent Tyre States Against Telemetry Performance (Pillar 3)**:
   Validates the physical tyre states without circular model confirmation by decoupling physical capability from lap time sensitivity:
   - **Direct Lateral Capability Audit**: Compares predicted friction state $\mu_{\text{effective}}(a)$ against empirical cornering capability in high-speed benchmark corners (Turn 3, Turn 9 apex $a_y / g$).
   - **Lap Time Sensitivity Residual**: Compares linearized time loss $\Delta t_{\text{pred}}(a) = k_{\text{pace loss}}(1 - \mu_{\text{eff}}/\mu_0)$ against fuel- and track-corrected timing residuals:
     ```text
     Practice Physics ──► mu_model(a) ──► Apex a_y/g (Direct Telemetry Validation)
                               ↓
                       Delta_t_pred(a) ──► Delta_t_observed(a) (Timing Residual Validation)
     ```
4. **Validate Compound Curves Separately**:
   Never collapses compounds into a single score. Evaluates and plots:
   ```text
   D_Soft(a),   D_Medium(a),   D_Hard(a)
   ```
5. **Validate Stint Phases Independently**:
   Divides every stint into three distinct operational regimes:
   - **Phase 1: Early Stint (Laps 1 to 4)**: Warm-up transient & initial graining MAE.
   - **Phase 2: Mid-Stint (Laps 5 to N-4)**: Stable operating plateau & linear mechanical wear MAE.
   - **Phase 3: Late Stint (Final 4 Laps)**: Late-stint degradation & thermal cliff MAE.
6. **Independent Thermal State Validation**:
   Audits tread and carcass equilibrium temperatures against the Pirelli working window, graining transition, and blistering thresholds:
   ```text
   T_tread(a)   vs.   [T_opt - 0.5*T_window,  T_opt + 0.5*T_window]
   ```
7. **Wear-Mechanism Attribution (Why It Happened)**:
   Decomposes total damage into physical constituents:
   ```text
   D_total(a) = D_abrasion(a) + D_graining(a) + D_blistering(a)
   ```

### 8.3 Empirical Spanish GP Validation Scorecard (Haas #27 Nico Hülkenberg)

```text
+==================================================================================================================================+
|                                    TRACKSHIFT POST-RACE VALIDATION AUDIT (BARCELONA 2024)                                        |
+==================================================================================================================================+
| Stint & Compound | Laps | Linear Slope (Pred vs Act) | Slope Err | Quadratic Curvature (b2) | Early MAE | Mid MAE | Late MAE | MAE   |
+------------------+------+----------------------------+-----------+--------------------------+-----------+---------+----------+-------+
| Stint 1: SOFT    | 10   | +0.084 vs +0.071 s/lap     | 0.013 s/l | -0.0002 vs +0.0124       | 0.28 s    | 0.22 s  | 0.25 s   | 0.25s |
| Stint 2: MEDIUM  | 24   | +0.091 vs +0.077 s/lap     | 0.014 s/l | +0.0011 vs -0.0031       | 0.48 s    | 0.31 s  | 0.38 s   | 0.33s |
| Stint 3: HARD    | 27   | +0.065 vs +0.079 s/lap     | 0.014 s/l | -0.0036 vs +0.0076       | 0.42 s    | 0.54 s  | 0.61 s   | 0.52s |
+==================================================================================================================================+
```

### 8.4 Scientific Nuance & Calibration Assumptions
To ensure scientific integrity, engineering assumptions are explicitly demarcated from fundamental physics:
- **Fuel Mass Time Penalty (0.033 s/kg)**: Calibrated engineering prior derived from circuit mass simulation and Pirelli guidelines; refined post-race via fuel consumption telemetry.
- **Track Rubbering Model (1.25s * (1 - exp(-lap/120)))**: Calibrated empirical prior capturing asymptotic micro-roughness rubber deposition; adjusted post-race based on support-series rubber levels.
- **Haas Aero Deficit Factor (0.88)**: Vehicle dynamics assumption scaling cornering stiffness based on CFD downforce delta; audited post-race by comparing lateral centripetal acceleration against GPS line.
- **Corner Speed Loss vs. Top Speed**: Strong corroborative evidence consistent with tyre friction decay, while acknowledging secondary contributors such as battery SOC management and aero wake disturbances.

### 8.5 Closing the Loop: Next-Race Model Correction
Post-race validation completes the closed-loop engineering cycle:
1. **RTS Backward Smoother**: Re-estimates true latent states (D_k, mu_k) with full race hindsight to compute refined Maximum Likelihood Estimates (MLE) for base abrasion (`wp1`) and rim dissipation (`h_rim`).
2. **Circuit Roughness Library**: If all three compounds degraded slightly slower than predicted, the circuit abrasiveness rating is adjusted (e.g. Barcelona 1.25 -> 1.22) in the knowledge base.
3. **Driver Management Fingerprinting**: Nico Hülkenberg's tyre preservation factor in high-speed turns is updated (`PushLevel` calibrated to 0.935), improving pre-race simulation fidelity for the next race.

---

## 9. Non-Functional Requirements & Performance SLAs

1. **Live Inference Latency**: Extended Kalman Filter update must execute in `< 15 milliseconds` upon receiving timing transponder packets.
2. **Pre-Race Simulation Speed**: Full 66-lap forward simulation must complete in `< 500 milliseconds`.
3. **Data Pipeline Robustness**: Gracefully handles missing sensor channels (e.g. absent wind speed or missing track limits flags) without crashing.
4. **Cross-Circuit Portability**: Zero hardcoded track parameters; all circuit geometry, curvature, and abrasiveness ratings are ingested dynamically from track configs.
5. **Reproducibility**: Fully deterministic execution with zero stochastic seeds or unseeded random initializations.
