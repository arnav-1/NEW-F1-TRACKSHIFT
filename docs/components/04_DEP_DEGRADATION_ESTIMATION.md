# Component 04: Degradation Estimation Pipeline (DEP)

> **Source Location**: [`src/dep/degradation.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/dep/degradation.py)  
> **Pipeline Position**: Stage 4 (`DIP` -> `PIP` -> `IEP` -> `DEP` -> `CMP` -> `Validation` -> `Console`)  
> **Primary Purpose**: Model tyre wear trajectories across all 4 individual wheel positions (`FL`, `FR`, `RL`, `RR`). Computes dynamic 4-wheel normal forces via lateral and longitudinal load transfer, decomposes degradation into 3 distinct physical wear mechanisms, fits polynomial degradation trajectories, and mathematically detects tyre performance cliffs.

---

## 1. Engineering Motivation & Problem Statement

Tyres do not degrade uniformly across a car. In Formula 1:
1. **Circuit Directionality & Asymmetry**: The Circuit de Barcelona-Catalunya has 9 right-hand turns and 5 left-hand turns, including the punishing high-speed Turn 3 and Turn 9. Consequently, the **Left-Front (FL)** tyre sustains up to 2.5x more lateral load and thermal strain than the Right-Front (FR) tyre. Treating the car as a single lumped tyre creates catastrophic strategy errors.
2. **Multi-Mechanism Physics**: Degradation is not a single smooth decay. It is driven by:
   - *Surface abrasion* (mechanical scrubbing against tarmac asperities).
   - *Bulk thermal degradation* (overheating causing chemical bond breakdown).
   - *Carcass fatigue* (internal belt cyclic flexing).
3. **The Degradation "Cliff"**: Modern Pirelli F1 tyres are engineered with high initial grip, a linear degradation plateau, followed by a non-linear "cliff" where grip drops by 0.5 to 1.5 s/lap over 2 laps. Missing this cliff ruins pit-stop timing and track position.

The **Degradation Estimation Pipeline (DEP)** solves this by calculating individual 4-wheel loads, fitting multi-order polynomials to fuel-corrected pace, and predicting the exact cliff lap before it happens on track.

---

## 2. Component Architecture

```text
                                 DEP ARCHITECTURE FLOW
                                 
              [PhysicsProxyDataset from IEP: lap_time_corrected_s]
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
  ┌───────────────────────────┐                   ┌───────────────────────────┐
  │ 1. AsymmetricLoadAlloc    │                   │ 2. TriMechanismWearModel  │
  │    4-Wheel Weight Transfer│                   │    Abrasion, Thermal,     │
  │    FL, FR, RL, RR normal F│                   │    Fatigue Decomposition  │
  └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                │                                               │
                └───────────────────────┬───────────────────────┘
                                        ▼
                         ┌─────────────────────────────┐
                         │ 3. PolynomialDegradationFit │
                         │    beta_1 * L + beta_2 * L^2│
                         │    + beta_3 * L^3           │
                         └──────────────┬──────────────┘
                                        ▼
                         ┌─────────────────────────────┐
                         │ 4. CliffDetector            │
                         │    d^2(pace)/dL^2 > theta   │
                         │    Predicts Cliff Lap       │
                         └──────────────┬──────────────┘
                                        ▼
                         ┌─────────────────────────────┐
                         │ DegradationFitResult        │
                         │ - 4-Wheel Wear States       │
                         │ - Calibrated Coefficients   │
                         │ - Cliff Lap & R^2 Confidence│
                         └─────────────────────────────┘
```

---

## 3. Mathematical Formulations & Engineering Rationale

### 1. Asymmetric 4-Wheel Load Allocation (Milliken Weight Transfer)
```text
Equations:
    F_z,aero(v) = 0.5 * rho_air * C_L_A * (v / 3.6)^2
    
    Total Mass:
    m_total = m_chassis + m_fuel(lap)
    
    Static Normal Loads:
    F_z,front,stat = m_total * g * (1.0 - w_front_dist) + F_z,aero * a_front_aero
    F_z,rear,stat  = m_total * g * w_front_dist + F_z,aero * (1.0 - a_front_aero)
    
    Dynamic Load Transfers:
    Delta_F_z,long = (m_total * a_long * h_cg) / L_wheelbase
    Delta_F_z,lat  = (m_total * a_lat * h_cg)  / t_track
    
Individual Wheel Normal Forces:
    F_z,FL = 0.5 * F_z,front,stat - 0.5 * Delta_F_z,long - (K_phi,f / K_phi,tot) * Delta_F_z,lat
    F_z,FR = 0.5 * F_z,front,stat - 0.5 * Delta_F_z,long + (K_phi,f / K_phi,tot) * Delta_F_z,lat
    F_z,RL = 0.5 * F_z,rear,stat  + 0.5 * Delta_F_z,long - (K_phi,r / K_phi,tot) * Delta_F_z,lat
    F_z,RR = 0.5 * F_z,rear,stat  + 0.5 * Delta_F_z,long + (K_phi,r / K_phi,tot) * Delta_F_z,lat
```
- **Physical Intuition**: When turning right, centrifugal acceleration throws weight onto the left tyres (`FL`, `RL`). When braking, weight transfers to the front tyres (`FL`, `FR`). Downforce multiplies normal force quadratically with speed without adding mass.
- **Engineering Rationale**: In Turn 3 at Barcelona, `F_z,FL` exceeds 8,500 N, while `F_z,FR` drops below 2,200 N. The left-front tyre sustains 4x more frictional work.
- **Academic Source**: Milliken & Milliken (1995), *Race Car Vehicle Dynamics*, Chapter 16; Dixon, J. C. (1996), *Tires, Suspension and Handling*.

---

### 2. Tri-Mechanism Wear Decomposition
Total physical wear rate `w_total` (in mm tread loss per lap) is the sum of three distinct physical modes:

```text
Equation:
    w_total(lap) = w_abrasion + w_thermal + w_fatigue
    
1. Surface Mechanical Abrasion (Schallamach Adhesive Wear):
    w_abrasion = K_abr * F_z * |v_slip| * (1.0 - exp(-s_slip / s_ref))
    
2. Bulk Thermal Degradation (Arrhenius Polymer Kinetics):
    w_thermal = K_therm * exp( -E_act / (R_gas * (T_bulk + 273.15)) ) * (T_bulk / T_opt)^gamma
    
3. Carcass Fatigue & Micro-Tearing (Paris-Erdogan Law):
    w_fatigue = K_fatigue * (F_z / F_z,nom)^beta_fatigue * N_cycles
```
- **Physical Intuition**:
  - *Abrasion* occurs when rubber physically shears off against rough track stones (micro-cutting).
  - *Thermal degradation* occurs when the rubber gets too hot (>115°C for Soft, >125°C for Hard), breaking polymer cross-links and turning rubber soft and greasy.
  - *Fatigue* is caused by internal heat build-up from carcass bending 800 times a minute at 300 km/h.
- **Academic Source**: Grosch, K. A. (1963), *The Relation between the Friction and Abrasion of Rubber*; Schallamach, A. (1954), *Abrasion of Rubber by a Needle*.

---

### 3. Polynomial Degradation Fitting
```text
Equation:
    delta_t_deg(L) = beta_1 * L + beta_2 * L^2 + beta_3 * L^3
    
Where:
    L        = Tyre age (clean laps into stint)
    beta_1   = Linear wear coefficient (baseline mechanical abrasion, ~0.04 to 0.08 s/lap)
    beta_2   = Quadratic coefficient (progressive thermal build-up, ~0.001 to 0.003 s/lap^2)
    beta_3   = Cubic cliff coefficient (exponential tread loss & graining, ~0.0001 s/lap^3)
```
- **Fitting Method**: Weighted Ordinary Least Squares (WOLS) with lap outlier down-weighting.
- **Quality Metrics**: Coefficient of Determination (`R^2`), Root Mean Square Error (`RMSE`), and parameter standard errors (`sigma_beta`).

---

### 4. Mathematical Degradation Cliff Detection
```text
Mathematical Condition:
    The Degradation Cliff Lap (L_cliff) is the smallest tyre age L where:
    
    d^2(delta_t_deg) / dL^2 = 2 * beta_2 + 6 * beta_3 * L >= theta_cliff
    
    Solving for L_cliff:
    L_cliff = max(1.0, (theta_cliff - 2 * beta_2) / (6 * beta_3))
    
Alternative Curvature Metric (Frenet-Serret Curvature kappa_d):
    kappa_d(L) = |d^2(delta_t) / dL^2| / (1 + (d(delta_t) / dL)^2)^(3/2) >= kappa_threshold
```
- **Default Threshold**: `theta_cliff = 0.08 s/lap^2` (indicating pace loss is accelerating by nearly a tenth per lap).
- **Motorsport Intuition**: When a tyre hits the cliff, the tread has worn down to the underlying sub-tread or the carcass has overheated past the thermal window. Lap times blow out exponentially. A pit stop MUST occur 1 to 2 laps before `L_cliff`.

---

## 4. Data In / Data Out Specification

### Data In (Inputs to DEP)

| Input Object | Origin | Key Fields | Description |
| :--- | :--- | :--- | :--- |
| `processed_laps` | Component 03 (IEP) | `lap_time_corrected_s`, `tyre_life`, `compound`, `stint` | Clean laps decoupled from fuel & track |
| `chassis_telemetry` | Component 01 (DIP) | `speed_kmh`, `a_lat`, `a_long` | High-frequency dynamic channels |
| `compound_parameters` | Configuration | `K_abr`, `T_opt`, `gamma`, `theta_cliff` | Compound-specific thermal & wear priors |

---

### Data Out (Outputs from DEP)

The method `DegradationPipeline.process(physics_dataset)` returns a **`DegradationFitResult`**:

```python
@dataclass
class DegradationFitResult:
    compound: str
    stint_id: int
    beta_1: float
    beta_2: float
    beta_3: float
    r_squared: float
    rmse_s: float
    cliff_lap: Optional[float]
    four_wheel_state: FourWheelState
    predicted_pace_curve: List[float]
```

#### Dataclass: `FourWheelState` (4-Wheel Independent Wear)
```python
@dataclass
class FourWheelState:
    wear_fl: float   # Left-Front remaining tread (0.0=worn, 1.0=new)
    wear_fr: float   # Right-Front remaining tread
    wear_rl: float   # Left-Rear remaining tread
    wear_rr: float   # Right-Rear remaining tread
    temp_fl_c: float # Predicted bulk temperature (°C)
    temp_fr_c: float
    temp_rl_c: float
    temp_rr_c: float
    limiting_tyre: str # e.g., "FL" (The critical tyre that triggers the pit stop)
```

---

## 5. Pipeline Handoff to Component 05 (CMP / Core Model)

```text
[PhysicsProxyDataset from IEP]
               │
               ▼
[DEP: 4-Wheel Load Allocator & Polynomial Fitter]
               │
               ├─► Computes FL / FR / RL / RR loads
               ├─► Calibrates beta_1, beta_2, beta_3
               └─► Calculates Cliff Lap L_cliff
               │
               ▼
[Output: DegradationFitResult & FourWheelState]
               │
               ▼
[Component 05 (Core Model) & Component 11 (Live ODE & DEP Expansion)]:
 Feeds State-Space Differential Equations & Drives Live Sunday Lap-by-Lap State Updates
```

---

## 6. Live Race Mode vs Offline Mode (DEP Expansion)

For the comprehensive deep dive on how DEP transitions from offline polynomial fitting into live Sunday state-space ODE stepping, please see:
- [**Component 11: Final State-Space ODE Modeling, Live Race Execution & DEP Expansion**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/11_LIVE_ODE_MODELING_AND_DEP_EXPANSION.md)
  - Details the continuous-time coupled ODEs: $dT_{\text{tread}}/dt$ and $dT_{\text{carcass}}/dt$.
  - Explains the sub-stepped numerical integration across cornering duty cycles.
  - Documents how live damage accumulation $D(t)$ maps to instantaneous grip loss $\Psi_{\text{wear}}(D)$ and lap pace loss $\Delta t_{\text{pred}}$.
  - Maps where every line of live execution lives in the codebase.
