# Component 11: Final State-Space ODE Modeling, Live Race Execution & DEP Expansion

> **Document Status**: Production Engineering Blueprint & Live Architecture Specification  
> **Source Modules**:  
> - ODE Thermal-Wear Physics Engine: [`core_model/code/thermal_wear_model.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/core_model/code/thermal_wear_model.py)  
> - Degradation Estimation Pipeline (DEP): [`src/dep/degradation.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/dep/degradation.py)  
> - Live Race Telemetry Export Engine: [`src/export_frontend_data.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/export_frontend_data.py)  
> - Live Strategy React Console: [`frontend/src/context/TelemetryContext.tsx`](file:///c:/Users/daksh/Projects/Trackshiftv2/frontend/src/context/TelemetryContext.tsx) & [`frontend/src/components/FourWheelDynamicsView.tsx`](file:///c:/Users/daksh/Projects/Trackshiftv2/frontend/src/components/FourWheelDynamicsView.tsx)  
> - Practice-to-Race Forward Simulator: [`post_race_validation/code/post_race_validator.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/post_race_validation/code/post_race_validator.py)  

---

## 1. Executive Summary: The Dual Reality of Tyre Modeling

In Formula 1 tyre intelligence, there are two completely different execution regimes:
1. **The Pre-Race Offline Regime (Friday/Saturday)**: We ingest practice laps (FP1, FP2, FP3), filter out noise with PIP, strip away fuel and track evolution with IEP, and fit empirical polynomials ($\beta_1, \beta_2, \beta_3$) with DEP to discover baseline degradation rates.
2. **The Live Sunday Race Regime (Sunday 3:00 PM)**: As the car completes each lap, the system cannot wait for the entire stint to finish before fitting a curve. It must maintain an **instantaneous physical state vector** updated lap-by-lap:
```text
State Vector: x(t) = [ T_tread(FL, FR, RL, RR), T_carcass(FL, FR, RL, RR), D_cum(FL, FR, RL, RR), mu_eff, Delta_t_pace ]
```
This document details the **final ordinary differential equation (ODE) formulation**, the **DEP Expansion (how empirical fitting connects to physical ODEs)**, and **where every line of the live execution system lives in code**.

---

## 2. Where the Live System Lives (Complete Codebase Map)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   LIVE EXECUTION ARCHITECTURE                                    │
└────────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                 │
         ┌───────────────────────────────────────┼───────────────────────────────────────┐
         ▼                                       ▼                                       ▼
┌─────────────────────────────┐       ┌─────────────────────────────┐       ┌─────────────────────────────┐
│  PHYSICAL ODE CORE ENGINE   │       │   LIVE RACE EXPORT ENGINE   │       │   PIT-WALL CONSOLE UI       │
│ core_model/code/            │       │ src/export_frontend_data.py │       │ frontend/src/               │
│ thermal_wear_model.py       │       │                             │       │                             │
│                             │       │ • generate_stint_telemetry()│       │ • TelemetryContext.tsx      │
│ • compute_frictional_power()│       │ • Live fuel burn stepping   │       │   (Real-time State Store)   │
│ • step_thermal_ode()        │ ────► │ • Dynamic 4-wheel thermal   │ ────► │ • FourWheelDynamicsView.tsx │
│ • compute_wear_step()       │       │   integration lap-by-lap    │       │   (Live 4-Corner Heatmap)   │
│ • PhysicalThermalWearEngine │       │ • Tri-mechanism wear        │       │ • PostRaceValidationView.tsx│
│                             │       │ • Limiting corner detection │       │   (10 Mature Pillars)       │
└─────────────────────────────┘       └─────────────────────────────┘       └─────────────────────────────┘
         ▲                                       ▲                                       ▲
         │                                       │                                       │
┌────────┴────────────────────┐       ┌──────────┴──────────────────┐       ┌────────────┴────────────────┐
│   DEP STATISTICAL FITTING   │       │  PRACTICE-TO-RACE FORWARD   │       │ FASTF1 / OPENF1 LIVE FEED   │
│ src/dep/degradation.py      │       │ post_race_validation/code/  │       │ src/dip/ingestion.py        │
│                             │       │ post_race_validator.py      │       │                             │
│ • AsymmetricLoadAllocator   │       │ • simulate_stint_from_      │       │ • OpenF1Ingestor            │
│ • TriMechanismWearModel     │       │   practice()                │       │ • FastF1Ingestor            │
│ • PolynomialDegradationFit  │       │ • Frozen FP3 parameters     │       │ • Parquet cache stream      │
│ • CliffDetector             │       │ • 2024 FIA Blanket Deficit  │       │                             │
└─────────────────────────────┘       └─────────────────────────────┘       └─────────────────────────────┘
```

### Detailed File-by-File Breakdown:
1. **[`core_model/code/thermal_wear_model.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/core_model/code/thermal_wear_model.py)**:
   - Lines 24–83: `CompoundThermalParameters` & `COMPOUND_PARAMS` (Optimal temperatures $T_{\text{opt}}$, graining thresholds $T_{\text{grain}}$, blistering thresholds $T_{\text{blister}}$, base grip $\mu_0$).
   - Lines 164–198: `compute_frictional_power()` (Calculates sliding friction power $Q_{\text{frict}}$ via slip angle $\alpha$).
   - Lines 199–252: `step_thermal_ode()` (Sub-stepped numerical integration of coupled tread and carcass ODEs).
   - Lines 253–304: `compute_wear_step()` (Tri-mechanism wear rates $\dot{w}_p, \dot{w}_g, \dot{w}_b$, cumulative damage $D$, grip multiplier $\mu_{\text{eff}}$, and observational pace loss $\Delta t_{\text{pred}}$).
2. **[`src/dep/degradation.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/dep/degradation.py)**:
   - Lines 210–276: `AsymmetricLoadAllocator` (Translates whole-car speed and lateral acceleration into individual normal loads $F_{z,\text{FL}}, F_{z,\text{FR}}, F_{z,\text{RL}}, F_{z,\text{RR}}$).
   - Lines 320–360: `TriMechanismWearModel` (Evaluates physical wear per corner).
   - Lines 520–550: `PolynomialDegradationFitter` (Fits $\beta_1 \cdot L + \beta_2 \cdot L^2 + \beta_3 \cdot L^3$).
   - Lines 590–615: `CliffDetector` (Calculates analytical cliff lap $L_{\text{cliff}}$).
3. **[`src/export_frontend_data.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/export_frontend_data.py)**:
   - Lines 218–382: `generate_stint_telemetry()` (**The Live Race Simulation Engine**). Steps through race laps $1 \dots N$, integrates fuel decay, track evolution, 2024 FIA blanket exit warm-up, individual corner temperatures, and cumulative damage.
4. **[`frontend/src/context/TelemetryContext.tsx`](file:///c:/Users/daksh/Projects/Trackshiftv2/frontend/src/context/TelemetryContext.tsx)**:
   - Stores the active live session, driver selection (Nico Hülkenberg Car #27), current lap slider index, and publishes real-time 4-wheel states to all dashboard tabs.

---

## 3. The Coupled Thermodynamic ODE System

In high-performance motorsport, a single lumped tyre temperature is physically invalid. The rubber tread contacting the tarmac operates under fast, violent thermal transients ($\tau \approx 0.1\text{ s}$), while the deep structural carcass operates with large thermal inertia ($\tau \approx 5.0\text{ s}$).

### State Equations
```text
1. Outer Rubber Tread Node (T_tread):
    m_tread * c_tread * (d T_tread / dt) = Q_effective - Q_cond - Q_conv - Q_internal

2. Inner Structural Carcass Node (T_carcass):
    m_carc * c_carc * (d T_carcass / dt) = Q_internal + Q_deflect - Q_rim
```

### Physical Parameters (Per Corner)
| Parameter | Symbol | Value | Units | Physical Description |
| :--- | :--- | :--- | :--- | :--- |
| Tread Mass | $m_{\text{tread}}$ | `3.2` | kg | Mass of outer synthetic rubber compound |
| Tread Specific Heat | $c_{\text{tread}}$ | `1750.0` | J / kg / K | Specific heat capacity of polymer matrix |
| Carcass Mass | $m_{\text{carc}}$ | `6.8` | kg | Mass of steel/kevlar belt and bead core |
| Carcass Specific Heat | $c_{\text{carc}}$ | `1500.0` | J / kg / K | Specific heat capacity of carcass belts |
| Track Conduction Coeff | $h_{\text{track}}$ | `120.0` | W / m$^2$ / K | Conduction across contact patch |
| Contact Patch Area | $A_{\text{contact}}$ | `0.045` | m$^2$ | 2024 F1 18-inch tyre contact footprint |
| Exposed Air Area | $A_{\text{exposed}}$ | `0.55` | m$^2$ | Rotating tyre outer boundary area |
| Internal Conductivity | $k_{\text{tread-carc}}$ | `85.0` | W / K | Heat transfer between tread and carcass |
| Rim Heat Sink Coeff | $h_{\text{rim}}$ | `12.0` | W / K | Heat dissipated into magnesium wheel rim |

---

### Thermal Transfer Flux Formulations
```text
1. Effective Frictional Heat Flux (Applied during cornering phase):
    Q_effective = Q_frict * corner_duty_cycle
    Where: corner_duty_cycle approx 0.32 (32% of lap distance spent cornering)

2. Conductive Loss to Asphalt Roadbed (Fourier Law):
    Q_cond = h_track * A_contact * ( T_tread - T_track )

3. Convective Boundary Layer Cooling to Air (Turbulent Flow):
    h_air(v) = h_air_0 + h_air_v * (v / 3.6)^0.8
    Q_conv   = h_air(v) * A_exposed * ( T_tread - T_ambient )
    Where: h_air_0 = 32.0 W/m^2/K, h_air_v = 3.2

4. Internal Conduction to Carcass:
    Q_internal = k_tread_carc * ( T_tread - T_carcass )

5. Cyclic Carcass Deflection Hysteresis Heating:
    Q_deflect = 0.02 * Q_effective

6. Wheel Rim & Air Cavity Convective Dissipation:
    Q_rim = h_rim * ( T_carcass - T_ambient )
```

### Numerical Solution: Sub-Stepped Euler Integration
Because the tread surface experiences high thermal stiffness during cornering, a single lap step ($\Delta t \approx 85\text{ s}$) would cause numerical instability. TrackShift solves the ODE using **10 sub-steps per lap** in [`core_model/code/thermal_wear_model.py:230-243`](file:///c:/Users/daksh/Projects/Trackshiftv2/core_model/code/thermal_wear_model.py#L230-L243):
```text
    dt_sub = dt_lap / 10.0
    For step = 1 to 10:
        dT_tread = (Q_effective - Q_cond - Q_conv - Q_internal) / (m_tread * c_tread)
        dT_carc  = (Q_internal + Q_deflect - Q_rim) / (m_carc * c_carc)
        T_tread  = clip( T_tread + dT_tread * dt_sub, T_ambient, 145.0 °C )
        T_carc   = clip( T_carc  + dT_carc  * dt_sub, T_ambient, 135.0 °C )
```

---

## 4. DEP Expansion: From Physical ODEs to Lap Time Degradation

How does an internal rubber temperature ($T_{\text{tread}}$) turn into **tenths of a second lost on the timing transponder**?

```text
  [ODE Solver: T_tread, T_carcass] ──► [Tri-Mechanism Wear Rates: w_p, w_g, w_b]
                                                        │
                                                        ▼
  [Irreversible Damage State D(t)] ◄── [Discrete Lap Integral Accumulator]
                 │
                 ▼
  [Thermal Window Multiplier: Phi_thermal(T)] + [Wear Penalty: Psi_wear(D)]
                 │
                 ▼
  [Instantaneous Friction Coefficient: mu_eff(t)]
                 │
                 ▼
  [Observational Pace Loss: Delta t_pred = k_pace * (1.0 - mu_eff / mu_0)]
```

### Step 1: Tri-Mechanism Wear Decomposition
The instantaneous wear rate $\dot{w}_{\text{total}}$ is computed as the sum of three independent modes ([`core_model/code/thermal_wear_model.py:266-278`](file:///c:/Users/daksh/Projects/Trackshiftv2/core_model/code/thermal_wear_model.py#L266-L278)):
```text
1. Mechanical Abrasion (Archard Power Law):
    dot_w_p = S_asphalt * w_p1 * ( Q_frict / Q_ref )^w_p2 * (push_level)^2
    Where: w_p1 = 0.035, w_p2 = 1.15, Q_ref = 15,000 W

2. Sub-Optimal Cold Graining (Active when T_tread < T_transition_grain):
    dot_w_g = w_g1 * [ max( 0.0, T_transition_grain - T_tread ) ]^w_g2
    Where: w_g1 = 2.0e-5, w_g2 = 1.4

3. Super-Optimal Thermal Blistering (Active when T_tread > T_blister_threshold):
    dot_w_b = w_b1 * [ max( 0.0, T_tread - T_blister_threshold ) ]^w_b2 * (push_level)^3
    Where: w_b1 = 5.0e-5, w_b2 = 1.7

Total Wear Rate:
    dot_w_total = dot_w_p + dot_w_g + dot_w_b
```

### Step 2: Cumulative Damage State Integration
```text
    D(k) = D(k-1) + dot_w_total * Delta_laps
```
Where $D = 0.0$ represents a fresh sticker tyre, and $D = 1.0$ represents 100% worn tread down to the structural sub-ply.

### Step 3: Dynamic Grip Coefficient Synthesis ($\mu_{\text{eff}}$)
Available grip is the product of fresh peak friction ($\mu_0$), mechanical damage depletion ($\Psi_{\text{wear}}$), and thermal efficiency ($\Phi_{\text{thermal}}$):
```text
Equation:
    mu_eff = mu_0 * Psi_wear(D) * Phi_thermal(T_tread)
    
1. Irreversible Wear Grip Penalty:
    Psi_wear(D) = max( 0.0, 1.0 - lambda_wear * D )
    Where: lambda_wear = 0.25 (Grip drops by 25% at 100% tread loss)
    
2. Thermal Plateau Grip Window Function:
    half_window = 0.5 * T_window
    excess_temp = max( 0.0, |T_tread - T_opt| - half_window )
    Phi_thermal = max( 0.70, 1.0 - k_thermal * ( excess_temp / half_window )^2 )
    Where: k_thermal = 0.35
```

### Step 4: Observational Lap Pace Loss ($\Delta t_{\text{pred}}$)
By conducting a first-order Taylor expansion of cornering lap time sensitivity with respect to tyre grip:
```text
Equation:
    grip_drop_ratio = max( 0.0, 1.0 - ( mu_eff / mu_0 ) )
    Delta t_pred    = k_pace_loss * grip_drop_ratio
    Where: k_pace_loss = 6.50 s (At Barcelona, a 10% grip drop costs ~0.65 s/lap)
```

---

## 5. Live Sunday Execution: Stepping Lap-by-Lap

In [`src/export_frontend_data.py:253-370`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/export_frontend_data.py#L253-L370), the live execution engine steps through the Grand Prix:

```text
FOR EACH LAP (k = 1 to N_laps):
    1. Fuel Burn Calculation:
       m_fuel(k) = max(2.5, m_fuel,init - k * beta_burn)
       Delta_t_fuel(k) = 0.033 s/kg * m_fuel(k)

    2. Track Evolution Grip Gain:
       Delta_t_track(k) = -1.25 s * (1.0 - exp(-k / 120.0))

    3. Four-Wheel Thermal & Load Integration:
       FOR EACH CORNER in [FL, FR, RL, RR]:
           load_factor = workload_share[corner] / 0.25
           
           # 2024 FIA Blanket Exit Warmup (Art 10.8.4.d 70°C Cap):
           warmup_ratio = min(1.0, k / 3.5)
           cold_init_temp = 64.0°C + track_delta * 0.15
           steady_temp = T_opt + track_delta * 0.30 + (load_factor - 1.0) * 16.0 + k * 0.52
           T_tread[corner] = cold_init_temp * (1 - warmup_ratio) + steady_temp * warmup_ratio
           T_carcass[corner] = T_tread[corner] - (8.5 * exp(-k / 4.0) + 4.5)

           # Tri-Mechanism Wear Superposition:
           abrasion = 0.00014 * load_factor * (1.0 + 0.012 * k) * (T_track / 40.0)
           graining = 0.00018 * ( max(0.0, T_grain - T_tread)^1.4 )
           blister  = 0.00015 * ( max(0.0, T_tread - T_blister)^1.7 )
           cumulative_damage[corner] += (abrasion + graining + blister) * 10.5
           remaining_tread_pct[corner] = max(0.0, 100.0 - cumulative_damage[corner] * 100.0)

    4. Primary Limiting Tyre Identification:
       limiting_corner = argmin( remaining_tread_pct[corner] )  # Front-Left at Barcelona

    5. Live Cliff Lap & Pit Call Trigger:
       IF remaining_tread_pct[limiting_corner] <= 15.0% OR d^2(Pace)/dL^2 >= 0.08 s/lap^2:
           STATUS = "CRITICAL_CLIFF_BOX_THIS_LAP"
```

---

## 6. Data In / Data Out Contract for Component 11

### Data In (Inputs to Live Engine)
| Parameter | Source | Type | Example Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `stint_laps` | PIP Cleaned Laps | `pd.DataFrame` | 14 rows | Lap times, sector splits, speed traps |
| `session_weather` | DIP Weather Feed | `Dict[str, float]` | `track_temp: 44.5°C` | Track & air ambient conditions |
| `compound_name` | OpenF1 Stint Marker | `str` | `"SOFT"` | Pirelli compound allocation |
| `workload_shares` | Asymmetric Load Alloc | `Dict[str, float]` | `FL: 0.35, FR: 0.22` | Normalized 4-corner workload matrix |

### Data Out (Outputs to Frontend Console)
```json
{
  "lap_number": 8,
  "tyre_life": 8,
  "raw_lap_time": 81.245,
  "fuel_remaining_kg": 97.0,
  "fuel_penalty_s": 3.201,
  "track_evolution_s": 0.081,
  "pace_corrected_s": 78.125,
  "predicted_pace_s": 78.090,
  "corners": {
    "FL": {
      "workload_share": 0.35,
      "tread_temp_c": 112.4,
      "carcass_temp_c": 104.2,
      "damage": 0.342,
      "abrasion_rate": 0.00021,
      "graining_rate": 0.0,
      "blistering_rate": 0.00008,
      "is_limiting": true,
      "status": "OVERHEATING"
    },
    "FR": {
      "workload_share": 0.22,
      "tread_temp_c": 96.8,
      "carcass_temp_c": 91.5,
      "damage": 0.184,
      "abrasion_rate": 0.00013,
      "graining_rate": 0.0,
      "blistering_rate": 0.0,
      "is_limiting": false,
      "status": "OPTIMAL"
    }
  }
}
```

---

## 7. Summary: How This Completes the TrackShift Architecture

With Component 11, the link between the mathematical foundations and the live pit-wall software is closed:
1. **DIP & PIP**: Clean the raw telemetry.
2. **IEP**: Removes the fuel and track rubber confounders.
3. **DEP**: Computes 4-wheel normal loads and baseline polynomial wear.
4. **CMP / Core Engine (Component 11)**: Solves the continuous sub-stepped ODEs, tracks $T_{\text{tread}}$ and $T_{\text{carcass}}$, calculates tri-mechanism wear accumulation, and drives real-time pit-wall recommendations on the React console.
