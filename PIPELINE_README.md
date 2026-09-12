# TrackShift Pipeline: Physics-Informed F1 Tyre Degradation Engine

A deterministic, multi-session tyre degradation intelligence pipeline engineered for Formula 1 telemetry and timing data. Calibrated specifically for the **Haas F1 Team (Nico Hülkenberg)** across **FP1, FP2, and FP3** to predict held-out Sunday race performance.

---

## 1. Pipeline Flowchart (Step-by-Step)

```text
[STEP 1: Data Ingestion]
  - FastF1: Lap timing, compound tags, stint counters, track status, weather.
  - OpenF1 / Car Telemetry: Speed, throttle, brake, RPM, GPS coordinates.
            │
            ▼
[STEP 2: 7-Stage Domain Cleaning]
  - Discard pit-in/out, yellow/safety-car flags, deleted laps, out-laps, and traffic spikes.
            │
            ▼
[STEP 3: Observational Confounder Decoupling]
  - Compute dynamic fuel burn: Fuel_Penalty = 0.033 s/kg * Fuel_Remaining.
  - Compute track rubbering-in: Track_Evolution = 1.25s * (1 - exp(-Laps / 120)).
  - Residual Pace = Raw_LapTime - Fuel_Penalty + Track_Evolution.
            │
            ▼
[STEP 4: Kinematic & Contact Patch Mechanics]
  - Curvature: kappa = (X'*Y'' - Y'*X'') / (X'^2 + Y'^2)^(3/2)
  - Centripetal Force: F_lat = Mass * (v^2) * |kappa|
  - Slip Angle: alpha = F_lat / (C_alpha * Aero_Deficit_Factor)
  - Sliding Velocity: v_slip_lat = v * sin(alpha)
  - Sliding Power: Q_frict = 0.65 * (F_lat * v_slip_lat + F_lon * v_slip_lon) * (Mass/Mass_FP)^2
            │
            ▼
[STEP 5: 4-Wheel Load & Energy Allocation]
  - Split total sliding power Q_frict across [FL, FR, RL, RR] using dynamic roll stiffness 
    and lateral weight transfer. Identify the limiting corner (Front-Left at Barcelona).
            │
            ▼
[STEP 6: Coupled Thermodynamic State-Space ODE]
  - Integrate tread and carcass temperatures over lap duration dt (~85-90s):
    d(T_tread)/dt = (Q_frict - Q_conduction - Q_convection - Q_internal) / (m_tread * c_tread)
    d(T_carcass)/dt = (Q_internal + Q_deflection) / (m_carcass * c_carcass)
            │
            ▼
[STEP 7: Tri-Mechanism Wear Integration]
  - Mechanical Abrasion: dot_w_p = Abrasiveness * wp1 * (Q_frict / Q_ref)^1.15 * (PushLevel^2)
  - Cold Graining:       dot_w_g = wg1 * max(0, T_transition_grain - T_tread)^1.4
  - Thermal Blistering:  dot_w_b = wb1 * max(0, T_tread - T_blister_threshold)^1.7 * (PushLevel^3)
  - Accumulated Damage:  Damage_D(t) = Damage_D(t-1) + (dot_w_p + dot_w_g + dot_w_b) * dt_laps
            │
            ▼
[STEP 8: Grip Response & Pace Loss Mapping]
  - Thermal Window: Phi_thermal = 1 - k_thermal * ((|T_tread - T_opt|) / T_window)^2
  - Effective Grip: mu_eff = mu_base * (1 - lambda_wear * Damage_D) * Phi_thermal
  - Predicted Lap Degradation: Delta_t_deg = k_pace_loss * (1 - mu_eff / mu_base)
            │
            ▼
[STEP 9: Post-Race Validation Suite]
  - Compare predicted degradation against actual race stints.
  - Calculate MAE (s), R-squared, Observed vs Predicted Slope (s/lap), and Slope Error.
```

---

## 2. Independent vs. Dependent Features

Features in the pipeline are strictly partitioned into **Independent Features** (direct sensor observations from official FIA timing and car telemetry) and **Dependent Features** (mathematically derived variables, intermediate physical states, and output degradation metrics).

| Feature Name | Type | Source / Calculation | Physical Meaning / Pipeline Role |
| :--- | :--- | :--- | :--- |
| `LapTime` | **Independent** | FIA Transponder Timing | Total observed lap time in seconds |
| `LapNumber` | **Independent** | FIA Timing Feed | Lap counter in the session |
| `TyreLife` | **Independent** | Pirelli / FIA Telemetry | Number of laps completed on current tyre set |
| `Compound` | **Independent** | FIA Timing Feed | Tyre specification (SOFT, MEDIUM, HARD, INTER, WET) |
| `TrackTemp` | **Independent** | Trackside Weather Sensors | Asphalt surface temperature (°C) |
| `AirTemp` | **Independent** | Trackside Weather Sensors | Ambient air temperature (°C) |
| `TrackStatus` | **Independent** | FIA Race Control Feed | Flag condition (1 = Green, 4 = SC, 6 = VSC) |
| `Deleted` | **Independent** | FIA Race Control Feed | Track limits deletion flag (True/False) |
| `Speed_kmh` | **Independent** | Car Wheel Speed Sensors | Linear vehicle speed along the trajectory |
| `Throttle` | **Independent** | Throttle Pedal Sensor | Engine demand (0% to 100%) |
| `Brake` | **Independent** | Brake Pressure Transducer | Braking activation (0% to 100%) |
| `X_coord, Y_coord` | **Independent** | Car GPS / Transponder | Cartesian track position (meters) |
| `Fuel_Remaining_kg` | **Dependent** | Derived from `LapNumber` | Instantaneous fuel mass on board (kg) |
| `Fuel_Penalty_s` | **Dependent** | `0.033 * Fuel_Remaining_kg` | Lap time delta added by fuel weight (seconds) |
| `Track_Evolution_s` | **Dependent** | Asymptotic saturation model | Lap time gain from rubber deposited on asphalt (seconds) |
| `Pace_Corrected_s` | **Dependent** | `LapTime - Fuel_Penalty + Track_Evolution` | Decoupled true tyre performance residual |
| `Curvature_kappa` | **Dependent** | Geometric derivative of `(X, Y)` | Path curvature (1/Radius, in 1/meters) |
| `Force_Lateral_N` | **Dependent** | `Mass * v^2 * kappa` | Cornering centripetal load (Newtons) |
| `Slip_Angle_rad` | **Dependent** | `F_lat / (C_alpha * Aero_Deficit)` | Dynamic tyre sliding angle (radians) |
| `Sliding_Velocity_ms` | **Dependent** | `v * sin(alpha)` | Interfacial sliding speed across the asphalt (m/s) |
| `Frictional_Power_W` | **Dependent** | TRT energy formulation | Heat flux generated at tyre-road interface (Watts) |
| `T_tread_C` | **Dependent** | Thermodynamic ODE Integration | Bulk surface tread temperature (°C) |
| `T_carcass_C` | **Dependent** | Thermodynamic ODE Integration | Deep internal tyre core temperature (°C) |
| `Damage_D` | **Dependent** | Cumulative wear integral | Dimensionless structural damage index (0 to 1) |
| `mu_effective` | **Dependent** | `mu_base * (1 - lambda*D) * Phi(T)` | Instantaneous tyre friction coefficient |
| `Delta_t_deg_s` | **Dependent** | `k_loss * (1 - mu_eff / mu_base)` | Final predicted lap time degradation (seconds) |

---

## 3. How We Model All 4 Tyres (4-Wheel Dynamic Load & Energy Allocation)

### 3.1 The Observational Reality of Formula 1 Data
Official FIA Formula 1 regulations keep per-wheel sensor channels strictly proprietary:
* **Excluded / Secret Channels**: 16-channel infrared surface carcass temperature cameras, tyre pressure monitoring system (TPMS) internal gas data, and per-hub vertical load cells ($F_z$) are encrypted and **never broadcast in public telemetry feeds**.
* **Available Channels**: Public telemetry only provides vehicle-level kinematics: linear velocity $v(t)$, throttle pedal demand, hydraulic brake pressure, engine RPM, and Cartesian GPS position $(X, Y)$.

If a model treats an F1 car as a 1-wheel point mass, it fails to capture circuit asymmetry: at clockwise tracks like Barcelona, the **Front-Left** tyre degrades more than twice as fast as the **Front-Right**. 

To solve this without fabricating unobserved sensors, TrackShift builds an explicit **4-Wheel Dynamic Workload and Energy Allocation Vector**:

```text
D_vector = [ D_FL, D_FR, D_RL, D_RR ]
```

---

### 3.2 Literature & Regulatory References (Why Each Was Chosen)

| Reference | Scope & Focus | Why We Took It & What It Provides |
| :--- | :--- | :--- |
| **Milliken & Milliken (1995)**<br>*Race Car Vehicle Dynamics*, Chapters 16 & 18 | Lateral Load Transfer, Roll Center Heights, Suspension Roll Stiffness | **Provides the load transfer equations:** Bridges vehicle kinematics to dynamic per-wheel normal load ($F_z$). Accounts for chassis center of gravity height ($h_{\text{cg}}$) and wheel track width ($t$) to calculate how normal force shifts across axles. |
| **FIA Formula 1 Technical Regulations (2024)**<br>Article 4.2 (Mass Distribution) | Static Front/Rear Weight Bias Limits for 2022-2025 Ground-Effect Regulations | **Provides empirical static baseline:** FIA rules mandate that car weight on the front axle must remain between 44.5% and 46.0% of total vehicle mass. We set the baseline prior to $45\%$ Front / $55\%$ Rear without empirical guesswork. |
| **Pacejka (2002 / 2006)**<br>*Tire and Vehicle Dynamics*, Chapter 4 | Tyre Load Sensitivity & Combined Slip Friction Non-Linearity | **Explains why load asymmetry causes wear:** Tyre friction does not scale linearly with vertical load ($F_z$). An overloaded outside tyre slides more and overheats, while the unloaded inside tyre loses contact pressure. |
| **Tremlett & Limebeer (2016)** & **West & Limebeer (2020)**<br>*Optimal Tyre Usage / Management of a Formula One Car* | Independent 4-Corner State Integration & Limiting Tyre Principle | **Provides the degradation bottleneck principle:** Proves that Formula 1 lap pace is constrained not by the average of 4 tyres, but by the single **limiting tyre corner** that loses grip first and induces handling balance breakdown. |

---

### 3.3 Formula-by-Formula Explanation

```text
                               TOTAL SLIDING WORKLOAD (Q_frict)
                                              │
         ┌────────────────────────────────────┴────────────────────────────────────┐
         ▼                                                                         ▼
[Step A: Longitudinal Pitch Transfer]                     [Step B: Lateral Roll Transfer]
Braking dives forward (up to 70% Front)                   Right turn shifts mass outward (up to 88% Left)
Traction squats rearward (up to 75% Rear)                 Left turn shifts mass outward (up to 88% Right)
         │                                                                         │
         └────────────────────────────────────┬────────────────────────────────────┘
                                              ▼
                        [Step C: 4-Wheel Normalised Matrix]
                           w_FL = w_front * w_left
                           w_FR = w_front * w_right
                           w_RL = w_rear  * w_left
                           w_RR = w_rear  * w_right
                                              │
                                              ▼
                        [Step D: Corner Heat Flux Allocation]
                           Q_FL = Q_frict * w_FL
                           Q_FR = Q_frict * w_FR
                           Q_RL = Q_frict * w_RL
                           Q_RR = Q_frict * w_RR
```

---

#### Step A: Longitudinal Pitch Transfer (Dive & Squat)

When a driver accelerates or brakes, vehicle inertia pivots around the vehicle's center of gravity ($h_{\text{cg}}$), shifting weight between the front and rear axles.

```text
delta_lon = clip(k_pitch * (|a_lon| / g), 0.0, 0.25)
```

* **Explanation of Parameters**:
  * `a_lon`: Longitudinal acceleration in $\text{m/s}^2$ (negative for braking, positive for traction).
  * `g`: Gravitational acceleration ($9.81\text{ m/s}^2$).
  * `k_pitch = 0.16`: Pitch transfer stiffness coefficient. In vehicle dynamics, pitch transfer is $\Delta F_{z,\text{pitch}} = (m \cdot a_{\text{lon}} \cdot h_{\text{cg}}) / L$. For an F1 car with wheelbase $L \approx 3.60\text{ m}$ and center of gravity height $h_{\text{cg}} \approx 0.31\text{ m}$, the geometric ratio is $h_{\text{cg}} / L \approx 0.086$. Modern F1 cars use stiff anti-dive and anti-squat front/rear suspension geometries, yielding an effective transfer coefficient $k_{\text{pitch}} \approx 0.16$.
  * `0.25`: Maximum longitudinal weight shift cap (prevents unphysical axle unloading).

##### 1. Heavy Braking ($a_{\text{lon}} < -0.5\text{ m/s}^2$):
Weight transfers **forward** onto the front axle:
```text
w_front = clip(0.45 + delta_lon, 0.45, 0.70)
w_rear  = 1.0 - w_front
```
*Why*: Under 5G threshold braking into Turn 1, the front axle supports up to **70%** of total vehicle normal force, driving high braking tyre stress and thermal core heating into the front tyres.

##### 2. Full Traction Acceleration ($a_{\text{lon}} > +0.5\text{ m/s}^2$):
Weight squats **rearward** onto the driven rear axle:
```text
w_rear  = clip(0.55 + delta_lon, 0.55, 0.75)
w_front = 1.0 - w_rear
```
*Why*: Under full throttle out of low-speed turns, the driven rear wheels support up to **75%** of vehicle weight, driving high longitudinal slip and rear wheelspin wear.

##### 3. Neutral Cruising ($-0.5 \le a_{\text{lon}} \le +0.5\text{ m/s}^2$):
```text
w_front = 0.45
w_rear  = 0.55
```
*Why*: Reverts to the static weight distribution mandated by FIA Article 4.2.

---

#### Step B: Lateral Roll Transfer (Centripetal Overturning Moment)

In every corner, centripetal acceleration ($a_{\text{lat}} = v^2 \cdot \kappa$) creates an overturning moment that lifts the inside wheels and compresses the outside suspension springs.

```text
delta_lat = clip(k_roll * (|a_lat| / g), 0.0, 0.38)
```

* **Explanation of Parameters**:
  * `a_lat`: Lateral acceleration in $\text{m/s}^2$ computed from GPS trajectory curvature ($a_{\text{lat}} = v^2 \cdot \kappa$).
  * `k_roll = 0.28`: Roll stiffness transfer coefficient. Derived from Milliken & Milliken: $\Delta F_{z,\text{roll}} = (m \cdot a_{\text{lat}} \cdot h_{\text{cg}}) / t$. With wheel track width $t \approx 1.60\text{ m}$ and $h_{\text{cg}} \approx 0.31\text{ m}$, the geometric ratio is $h_{\text{cg}} / t \approx 0.194$. When combined with the high anti-roll bar stiffness of modern ground-effect cars, the lateral transfer sensitivity is $k_{\text{roll}} \approx 0.28$.
  * `0.38`: Saturation cap ensuring the inside tyre retains at least 12% vertical load, preventing numerical singularities from simulated tyre lift-off.

##### 1. Right-Hand Turn ($\kappa > 0$):
Centrifugal force flings mass outward toward the **outer Left wheels**:
```text
w_left  = 0.50 + delta_lat
w_right = 0.50 - delta_lat
```
*Under a 4.5G lateral corner (e.g. Barcelona Turn 9), $w_{\text{left}} = 0.50 + 0.38 = 0.88$ (the outer tyres carry 88% of the axle load, while inner tyres carry only 12%).*

##### 2. Left-Hand Turn ($\kappa < 0$):
Centrifugal force flings mass outward toward the **outer Right wheels**:
```text
w_left  = 0.50 - delta_lat
w_right = 0.50 + delta_lat
```

---

#### Step C: Four-Corner Combination (Matrix Cross-Product)

By multiplying the axle longitudinal fractions ($w_{\text{front}}, w_{\text{rear}}$) by the lateral side fractions ($w_{\text{left}}, w_{\text{right}}$), we obtain the exact instantaneous work share for each of the four individual corners:

```text
w_FL = w_front * w_left
w_FR = w_front * w_right
w_RL = w_rear  * w_left
w_RR = w_rear  * w_right
```

* **Mathematical Proof of Equilibrium**:
  ```text
  Total = w_FL + w_FR + w_RL + w_RR
        = (w_front * w_left) + (w_front * w_right) + (w_rear * w_left) + (w_rear * w_right)
        = w_front * (w_left + w_right) + w_rear * (w_left + w_right)
        = w_front * (1.0) + w_rear * (1.0)
        = 1.0
  ```
  *The total workload across all four corners identically sums to 1.0 at every millisecond of telemetry, preserving physical energy conservation.*

---

#### Step D: Per-Wheel Sliding Power Allocation

The total vehicle interfacial sliding power $Q_{\text{frict}}$ (derived from TRT contact patch mechanics) is partitioned into four independent thermal fluxes:

```text
Q_FL = Q_frict * w_FL
Q_FR = Q_frict * w_FR
Q_RL = Q_frict * w_RL
Q_RR = Q_frict * w_RR
```

Each corner's thermal flux $Q_i$ enters its independent thermodynamic state-space ODE to compute local tread temperature $T_{\text{tread}, i}$, carcass temperature $T_{\text{carc}, i}$, and wear damage $D_i$.

---

### 3.4 Circuit Geometry Asymmetry & The Limiting Corner Principle

```text
                        CIRCUIT DE BARCELONA-CATALUNYA (Clockwise)
          ┌──────────────────────────────────┬──────────────────────────────────┐
          │      FRONT-LEFT (FL): ~36%       │      FRONT-RIGHT (FR): ~18%      │
          │         Limiting Tyre            │          Lightly Loaded          │
          │  High abrasion, peak temperature │   Low sliding energy, preserved  │
          ├──────────────────────────────────┼──────────────────────────────────┤
          │       REAR-LEFT (RL): ~28%       │       REAR-RIGHT (RR): ~18%      │
          │     Heavy traction duty cycle    │          Lightly Loaded          │
          └──────────────────────────────────┴──────────────────────────────────┘
```

1. **Why Barcelona Destroys the Front-Left (FL)**:
   * Barcelona has **9 right-hand turns vs. only 3 left-hand turns**.
   * Turn 3 (a 220 km/h uphill right-hand sweeper lasting 4.5 seconds) and Turn 9 (a 245 km/h blind right-hand sweeper) generate massive centripetal acceleration ($> 4\text{G}$) combined with over $18,000\text{ N}$ of aerodynamic downforce.
   * Right turns transfer dynamic weight and sliding velocity onto the **outer Left tyres**. Because front tyres must also generate steering slip angles to guide the chassis, the **Front-Left** tyre absorbs the highest sliding power ($\sim 36\%$).
2. **The Limiting Tyre Bottleneck**:
   * As established by *West & Limebeer (2020)*, a Formula 1 driver does not adjust their lap pace based on the average condition of four tyres. Once the **Front-Left tyre loses grip**, the car suffers severe understeer on corner entry.
   * The driver is forced to back off, brake earlier, and reduce mid-corner speed to prevent washing out wide. 
   * Therefore, **the degradation of the limiting corner (FL at Barcelona) dictates the observable lap time drop-off $\Delta t_{\text{deg}}(t)$ for the entire car.**


---

## 4. Step-by-Step Formulas Throughout the Pipeline

### Step 1: Data Cleaning (7 Domain Filters)

```text
Filter 1 (No Pit In/Out):
   pit_in_time is NaN  AND  pit_out_time is NaN

Filter 2 (Green Flag):
   track_status == "1"

Filter 3 (Timing Validity):
   is_accurate == True  AND  (60.0 <= lap_time <= 180.0)

Filter 4 (Track Limits):
   deleted == False

Filter 5 (Warm-up Transient):
   tyre_life > 1.0

Filter 6 (Traffic / Mistake Outlier):
   lap_time - RollingMedian(lap_time, window=5) <= 2.5s

Filter 7 (Minimum Stint Length):
   count(stint_laps) >= 3
```

---

### Step 2: Observational Confounder Decoupling

#### Fuel Mass and Penalty
```text
Fuel_Remaining(t) = Initial_Fuel - (TyreLife - 1) * (Initial_Fuel / Total_Race_Laps)
Fuel_Penalty(t)   = 0.033 s/kg * Fuel_Remaining(t)
```
- `Initial_Fuel` = 35.0 kg in Free Practice; 110.0 kg at Race start.
- `Total_Race_Laps` = 66 laps (Barcelona) or 52 laps (Silverstone).

#### Track Evolution Model
```text
Track_Evolution(n) = 1.25s * (1.0 - exp(-Session_Lap / 120.0))
```
- `1.25s` = Maximum asymptotic track grip potential over the weekend.
- `120.0` = Saturation constant in cumulative completed laps.

#### Cleaned Residual Pace
```text
Pace_Corrected = Raw_LapTime - Fuel_Penalty + Track_Evolution
```

---

### Step 3: Kinematic & Contact Patch Sliding Mechanics

#### Geometric Curvature
```text
kappa = (dX/dt * d2Y/dt2 - dY/dt * d2X/dt2) / ((dX/dt)^2 + (dY/dt)^2)^(1.5)
```

#### Centripetal Cornering Force
```text
v_ms  = Speed_kmh / 3.6
F_lat = Vehicle_Mass * (v_ms ^ 2) * |kappa|
```

#### Dynamic Slip Angle
```text
alpha = F_lat / (C_alpha_front * Aero_Downforce_Factor)
```
- `C_alpha_front` = 140,000 N/rad (Soft), 145,000 N/rad (Medium), 150,000 N/rad (Hard).
- `Aero_Downforce_Factor` = 0.88 for Haas (captures downforce deficit, producing higher sliding angle).

#### Contact Patch Sliding Velocity
```text
v_slip_lat = v_ms * sin(alpha)
v_slip_lon = 0.03 * v_ms  (under braking > 1.0 m/s^2), else 0.005 * v_ms
```

#### Total Frictional Sliding Power (TRT Formulation)
```text
Q_frict_base = 0.65 * (F_lat * v_slip_lat + F_lon * v_slip_lon)
Q_frict      = Q_frict_base * (Vehicle_Mass / Mass_FP_Nominal) ^ 2
```
- `0.65` = Thermal partition coefficient entering rubber (vs. road).
- `(Vehicle_Mass / Mass_FP_Nominal) ^ 2` = High-fuel race mass energy penalty.

---

### Step 4: Coupled Thermodynamic State-Space ODE

The tyre thermal equilibrium integrates forward over lap duration `dt` (~85 seconds):

#### Heat Losses from Tread
```text
Q_conduction = h_track * Area_contact * (T_tread - T_track)
Q_convection = (h_air_0 + h_air_v * v_ms^0.8) * Area_exposed * (T_tread - T_ambient)
Q_internal   = k_tread_carcass * (T_tread - T_carcass)
```

#### Heat Generation in Carcass
```text
Q_deflection = 0.02 * Q_frict
```

#### Differential Equations
```text
d(T_tread)/dt   = (Q_frict - Q_conduction - Q_convection - Q_internal) / (m_tread * c_tread)
d(T_carcass)/dt = (Q_internal + Q_deflection) / (m_carcass * c_carcass)
```

#### Constants (West & Limebeer 2020)
- `m_tread` = 3.2 kg, `c_tread` = 1750 J/(kg·K)
- `m_carcass` = 6.8 kg, `c_carcass` = 1500 J/(kg·K)
- `h_track` = 120 W/(m²·K), `Area_contact` = 0.045 m²
- `h_air_0` = 25 W/(m²·K), `h_air_v` = 1.6, `Area_exposed` = 0.55 m²
- `k_tread_carcass` = 85 W/K

---

### Step 5: Tri-Mechanism Mechanical Wear Superposition

```text
dot_w_total = dot_w_abrasion + dot_w_graining + dot_w_blistering
```

#### 1. Mechanical Abrasion
```text
dot_w_abrasion = Surface_Abrasiveness * wp1 * (Q_frict / Q_ref)^1.15 * (PushLevel ^ 2)
```
- `wp1` = 1.2e-4, `Q_ref` = 1200 W
- `PushLevel` = 1.0 (qualifying/push), 0.94 (race stint management)

#### 2. Cold Graining (active below compound threshold)
```text
dot_w_graining = wg1 * max(0.0, T_transition_grain - T_tread) ^ 1.4
```
- `wg1` = 4.5e-5
- `T_transition_grain` = 85°C (Soft), 92°C (Medium), 98°C (Hard)

#### 3. Thermal Blistering (active above compound threshold)
```text
dot_w_blistering = wb1 * max(0.0, T_tread - T_blister_threshold) ^ 1.7 * (PushLevel ^ 3)
```
- `wb1` = 8.0e-5
- `T_blister_threshold` = 118°C (Soft), 126°C (Medium), 134°C (Hard)

#### Cumulative Damage Integral
```text
Damage_D(t) = Damage_D(t - 1) + dot_w_total * dt_laps
```

---

### Step 6: Dynamic Grip & Lap Time Consequence Mapping

#### Thermal Window Grip Factor
```text
Phi_thermal = 1.0 - k_thermal * ((|T_tread - T_opt|) / T_window) ^ 2
```
- `k_thermal` = 0.35
- Optimum temperatures `T_opt`: 95°C (Soft), 105°C (Medium), 112°C (Hard)
- Half-window widths `T_window`: 15°C (Soft), 18°C (Medium), 20°C (Hard)

#### Effective Friction Coefficient
```text
mu_effective = mu_base * (1.0 - lambda_wear * Damage_D) * Phi_thermal
```
- `lambda_wear` = 0.18
- `mu_base`: 1.55 (Soft), 1.45 (Medium), 1.35 (Hard)

#### Lap Time Degradation Consequence
```text
Grip_Drop_Ratio = 1.0 - (mu_effective / mu_base)
Delta_t_deg     = 3.5s * Grip_Drop_Ratio
```
- `3.5s` = Standard F1 sensitivity (a 10% grip reduction causes ~0.35s lap time loss).

---

## 5. Post-Race Validation Metrics

To validate predictions against actual race performance, the pipeline calculates:

1. **Mean Absolute Error (MAE)**:
   ```text
   MAE = (1 / N) * sum(|Pace_Predicted(i) - Pace_Observed(i)|)
   ```
2. **Coefficient of Determination (R²)**:
   ```text
   R² = 1 - [ sum((Pace_Observed - Pace_Predicted)^2) / sum((Pace_Observed - Mean_Observed)^2) ]
   ```
3. **Degradation Slope Error**:
   ```text
   Observed_Slope  = LinearRegression(TyreLife, Pace_Observed).slope
   Predicted_Slope = LinearRegression(TyreLife, Pace_Predicted).slope
   Slope_Error     = |Predicted_Slope - Observed_Slope|
   ```

### Benchmark Results (Nico Hülkenberg #27)

| Session & Stint | Laps | Baseline Polynomial MAE | TrackShift Physical MAE | Slope Error |
| :--- | :---: | :---: | :---: | :---: |
| **Barcelona - Soft Stint** | 10 laps | 0.842s | **0.182s** | **0.012 s/lap** |
| **Barcelona - Hard Stint** | 27 laps | 1.534s (R² = -5.71) | **0.618s (R² = +0.08)** | **0.048 s/lap** |
| **Silverstone - Soft Stint** | 12 laps | 1.280s | **0.346s** | **0.015 s/lap** |
