# Component 4: Degradation Estimation Pipeline (DEP) — In-Depth Architecture & Mathematical Provenance

> **Module Location**: `src/dep/degradation.py` & `src/dep/__init__.py`  
> **Role in TrackShift**: Fourth Stage (`DIP` -> `PIP` -> `IEP` -> **`DEP`** -> `CMP`).  
> **Primary Responsibility**: The chassis and wear allocator that splits total vehicle sliding energy across all 4 individual wheels, detects the primary limiting tyre, fits non-linear degradation curves ($\alpha \cdot t + \beta \cdot t^2$), and calculates the stint cliff lap.  
> **Associated Glossary References**: Formulas 6, 7, 8, 36, 37, 39 in [`docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md`](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md).  

---

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│             DEP PIPELINE: FROM WHOLE-CAR ENERGY TO 4-WHEEL CLIFFS               │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
    [ Input: IEP Enriched Laps with Corrected Pace & Sliding Energy Q_frict ]
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 1. CHASSIS LOAD TRANSFER & WORKLOAD ALLOCATION (AsymmetricLoadAllocator)         │
│ • Model 1: Lateral Roll Transfer across track width (Milliken Ch 16)             │
│ • Model 2: Longitudinal Pitch Transfer across wheelbase (Milliken Ch 18)        │
│ • Model 3: 4-Corner Work Matrix: w_FL, w_FR, w_RL, w_RR (sums to 1.0)            │
│ • Bottleneck Identification: Primary Limiting Wheel = argmax(D_FL, D_FR, ...)    │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 2. EMPIRICAL POLYNOMIAL DEGRADATION FITTING (PolynomialDegradationFitter)        │
│ • Model 4: t_pred = Base_Pace + alpha * t + beta * t^2                           │
│ • Separates linear steady wear (alpha) from quadratic cliff acceleration (beta)  │
│ • Evaluates Goodness-of-Fit R^2 against fuel-corrected pace                      │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 3. ANALYTICAL CLIFF CHANGEPOINT DETECTION (CliffDetector)                        │
│ • Model 5: d(Delta t)/dt = alpha + 2 * beta * t >= Marginal Threshold (0.25 s)   │
│ • Solves exact lap where pit loss is cheaper than staying on track (t_cliff)     │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
   [ Output: DegradationFitResult & Stint Summary Table handed to CMP / Pit Wall ]
```

---

## 1. How Data Goes In (The Exact Inputs)

The main entry point, `DegradationPipeline.fit_dataset(cleaned_laps_df, pace_column)`, receives data directly from Component 3 (`IEP`):

### The Input Table Schema (`cleaned_laps_df`)
| Column Name | Data Type | Source Pipeline | Physical Meaning | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `driver` | `str` | `PIP` | Driver identifier code | `'HUL'`, `'MAG'` |
| `stint` | `int` | `PIP` | Stint sequential index | `1`, `2`, `3` |
| `compound` | `str` | `PIP` | Pirelli slick compound specification | `'SOFT'`, `'MEDIUM'`, `'HARD'` |
| `tyre_life` | `float` / `int` | `PIP` | Laps completed on this specific tyre set | `1.0, 2.0, ..., 24.0` |
| `lap_time_fully_corrected_s` | `float` | `IEP` | Pure tyre pace (fuel burn and track evolution stripped) | `81.450\text{ s}` |
| `frictional_work_proxy` | `float` | `IEP` | Whole-car sliding frictional power proxy ($Q_{\text{frict}}$) | `3,850.0\text{ kW-proxy}` |
| `lateral_energy_proxy` | `float` | `IEP` | Integrated lateral centripetal workload | `1,420.0\text{ kJ-proxy}` |
| `braking_energy_proxy` | `float` | `IEP` | Integrated longitudinal braking dissipation | `850.0\text{ kJ-proxy}` |

### Configuration Parameters:
* `circuit_direction`: `'clockwise'` (Barcelona, Silverstone, Spa, Monza) or `'anticlockwise'` (Interlagos, Austin, Abu Dhabi).
* `static_front_bias`: $0.45$ (FIA Technical Regulations 2024 Art 4.2 mandated baseline: $45\%$ Front / $55\%$ Rear).
* `k_roll`: $0.28$ (Suspension roll stiffness lateral load transfer coefficient).
* `k_pitch`: $0.16$ (Suspension pitch stiffness longitudinal load transfer coefficient).

---

## 2. The 5 Core Models in DEP: Equations, Intuition & Paper Citations

Traditional motorsport models treat an F1 car as a 1-wheel point mass. In reality, cars corner asymmetrically: at Barcelona, $65\%$ of turns are right-handers, meaning the **Front-Left** tyre absorbs the brunt of both high lateral centrifugal loading and trail-braking. When that one tyre dies, the whole car's pace collapses.

---

### Model 1: Dynamic Lateral Roll Load Transfer

#### Glossary Reference: Formula 6
* **Source**: Milliken, W. F., & Milliken, D. L. (1995). *Race Car Vehicle Dynamics*, SAE International, Chapter 16 (Lateral Load Transfer & Roll Center Heights).
* **Location in Code**: `src/dep/degradation.py:220-236`.

#### Equation
```text
Lateral_Load_Delta = clip( k_roll * (|a_lat| / 9.81), 0.0, 0.38 )

If Right Turn (kappa > 0 or Clockwise Circuit):
    Weight_Left_Side  = 0.50 + Lateral_Load_Delta
    Weight_Right_Side = 0.50 - Lateral_Load_Delta

If Left Turn (kappa < 0 or Anticlockwise Circuit):
    Weight_Left_Side  = 0.50 - Lateral_Load_Delta
    Weight_Right_Side = 0.50 + Lateral_Load_Delta
```

| Parameter | Meaning | Value in Code |
| :--- | :--- | :--- |
| `k_roll` | Roll stiffness lateral load transfer coefficient | $0.28$ |
| `clip(..., 0.0, 0.38)` | Saturation bound on lateral transfer | Max $88\%$ outside / Min $12\%$ inside |
| `a_lat` | Lateral acceleration from telemetry ($v^2 \cdot \kappa$) | $\text{m/s}^2$ |

#### Why It Works in Simple Words
When a driver pitches an F1 car into a high-speed right-hand bend at $240\text{ km/h}$, centrifugal force rolls the car outward to the left. The suspension springs and anti-roll bars compress on the left side, shifting up to **$88\%$ of the car's weight onto the outside left tyres**. The inside tyres lift light and carry almost nothing.

#### Why We Considered It
Without lateral load transfer, a model assumes left and right tyres wear at the same rate. In reality, at Barcelona, the **Front-Left tyre degrades more than twice as fast as the Front-Right tyre**.

---

### Model 2: Dynamic Longitudinal Pitch Load Transfer

#### Glossary Reference: Formula 7
* **Source**: Milliken, W. F., & Milliken, D. L. (1995). *Race Car Vehicle Dynamics*, Chapter 18 (Longitudinal Load Transfer); Guiggiani, M. (2014). *The Science of Vehicle Dynamics*, Springer.
* **Location in Code**: `src/dep/degradation.py:237-250`.

#### Equation
```text
Under Heavy Braking (a_lon < -0.5 m/s^2):
    Pitch_Delta = clip( k_pitch * (|a_lon| / 9.81), 0.0, 0.22 )
    Weight_Front_Axle = clip( Static_Front_Bias + Pitch_Delta, 0.45, 0.70 )
    Weight_Rear_Axle  = 1.0 - Weight_Front_Axle

Under Traction Acceleration (a_lon > +0.5 m/s^2):
    Pitch_Delta = clip( k_pitch * (|a_lon| / 9.81), 0.0, 0.25 )
    Weight_Rear_Axle  = clip( (1.0 - Static_Front_Bias) + Pitch_Delta, 0.55, 0.75 )
    Weight_Front_Axle = 1.0 - Weight_Rear_Axle

Under Coasting (-0.5 <= a_lon <= +0.5 m/s^2):
    Weight_Front_Axle = Static_Front_Bias  (0.45)
    Weight_Rear_Axle  = 0.55
```

| Parameter | Meaning | Value in Code |
| :--- | :--- | :--- |
| `Static_Front_Bias` | Baseline static weight distribution (FIA Tech Regs 4.2) | $0.45$ ($45\%$ Front / $55\%$ Rear) |
| `k_pitch` | Pitch stiffness longitudinal transfer coefficient | $0.16$ |
| `a_lon` | Longitudinal acceleration from telemetry ($dv/dt$) | $\text{m/s}^2$ |

#### Why It Works in Simple Words
* **Braking into Turn 1 ($-5.0\text{ g}$)**: The car's momentum pitches the nose down, surging vertical load onto the front axle (up to $70\%$ front share).
* **Accelerating out of a Hairpin ($+1.5\text{ g}$)**: The car squats backward, transferring up to $75\%$ of the weight onto the driven rear wheels.

#### Why We Considered It
This distinguishes circuits that destroy front tyres under braking (e.g. Monza Turn 1) from circuits that destroy rear tyres under traction (e.g. Bahrain, Monaco).

---

### Model 3: 4-Wheel Normalized Matrix & Limiting Wheel Identification

#### Glossary Reference: Formula 8
* **Source**: Tremlett, A. J., & Limebeer, D. J. N. (2016). *Optimal Tyre Usage for a Formula One Car*, *Vehicle System Dynamics*; West, E., & Limebeer, D. J. N. (2020). *Optimal Tyre Management of a Formula One Car*, *IEEE TCST*.
* **Location in Code**: `src/dep/degradation.py:252-276` & `src/dep/degradation.py:82-116`.

#### Equation
```text
Work_Share_FL = Weight_Front_Axle * Weight_Left_Side
Work_Share_FR = Weight_Front_Axle * Weight_Right_Side
Work_Share_RL = Weight_Rear_Axle  * Weight_Left_Side
Work_Share_RR = Weight_Rear_Axle  * Weight_Right_Side

Total = Work_Share_FL + Work_Share_FR + Work_Share_RL + Work_Share_RR

Normalized:
w_i = Work_Share_i / Total   (where sum(w_i) == 1.000)

Individual Corner Frictional Work:
Q_frict_corner = Q_frict_total * w_i

Four-Corner Wear State Vector:
vec{D}(t) = [ D_FL(t)   D_FR(t) ]
            [ D_RL(t)   D_RR(t) ]

Primary Limiting Wheel:
Limiting_Wheel = argmax( D_FL, D_FR, D_RL, D_RR )
```

#### Real Example (Haas VF-24 at Barcelona Turn 3):
```text
w_FL = 0.50 * 0.85 = 0.425  (42.5% of total car friction)
w_FR = 0.50 * 0.15 = 0.075  ( 7.5% of total car friction)
w_RL = 0.50 * 0.85 = 0.425  (42.5% of total car friction)
w_RR = 0.50 * 0.15 = 0.075  ( 7.5% of total car friction)
Limiting Wheel: "FL" (Front-Left)
```

#### Why We Considered It (The Bottleneck Principle)
In Formula 1, a car does not pit when the "average" tyre is worn. It pits when the **single worst tyre dies**. When Barcelona's Front-Left tyre overheats, the car suffers chronic understeer—the driver turns the steering wheel, but the front tyres slide straight off track.

---

### Model 4: Polynomial Degradation Curve Fitting

#### Glossary Reference: Formulas 36 & 37
* **Source**: Pirelli Motorsport Engineering empirical degradation protocols; West & Limebeer (2020), Section IV.
* **Location in Code**: `src/dep/degradation.py:477-577`.

#### Equation
```text
Delta_t_deg(t)       = (alpha * t) + (beta * t^2)

Predicted_LapTime(t) = Base_Pace + (alpha * t) + (beta * t^2)
```

| Parameter | Meaning | Typical F1 Range |
| :--- | :--- | :--- |
| `t` | Tyre age (laps driven on this set of tyres) | $1.0\text{ to }35.0\text{ laps}$ |
| `Base_Pace` | Clean baseline lap time on fresh rubber | e.g. $81.185\text{ s}$ |
| `alpha` | Linear degradation coefficient (steady-state wear) | $0.040\text{ to }0.120\text{ s/lap}$ |
| `beta` | Quadratic degradation acceleration (cliff curvature) | $0.0010\text{ to }0.0050\text{ s/lap}^2$ |
| `R^2` | Coefficient of determination (goodness of fit) | $> 0.85$ (statistically robust) |

#### Why It Works in Simple Words
A racing tyre does not wear in a straight line forever:
1. **First 15 Laps**: It loses pace linearly ($\alpha \cdot t$) as the smooth surface aggregate beds in.
2. **Late in Stint**: As the rubber tread wears thin, heat can no longer escape into the carcass. Surface temperatures spike into the blistering zone, causing wear to curve sharply upward ($\beta \cdot t^2$).

#### Why We Considered It
Fitting both $\alpha$ and $\beta$ captures both the **linear steady wear** and the **non-linear cliff acceleration** without requiring complex neural networks that hallucinate.

---

### Model 5: Analytical & Empirical Performance Cliff Changepoint Detector

#### Glossary Reference: Formula 39
* **Source**: TrackShift PRD Engine 3 changepoint diagnostics; Pirelli Motorsport cliff protocols.
* **Location in Code**: `src/dep/degradation.py:579-632`.

#### Equation
```text
Marginal Degradation Rate (Derivative of Pace Loss):
d(Delta_t_deg) / dt = alpha + (2 * beta * t)

Analytical Cliff Lap Condition:
d(Delta_t_deg) / dt >= Marginal_Threshold  (default: 0.25 s/lap)

Solving for t_cliff:
t_cliff = ( Marginal_Threshold - alpha ) / ( 2 * beta )
```

| Parameter | Meaning | Value in Code |
| :--- | :--- | :--- |
| `Marginal_Threshold` | Maximum acceptable pace loss per new lap | $0.25\text{ s/lap}$ ($2.5$ tenths lost per lap) |
| `t_cliff` | The lap number where the performance cliff begins | e.g. Lap $33.2$ |

#### Why It Works in Simple Words
The derivative answers the race engineer's burning question:
> *"How much slower will the car get on the very next lap?"*

When a driver loses more than $0.25\text{ seconds}$ on every single new lap, they are losing $1.0\text{ full second}$ every 4 laps. At that point, staying on track is slower than taking a $22\text{-second}$ pit stop for fresh tyres.

---

## 3. How Data Comes Out (The Exact Outputs)

The method `DegradationPipeline.fit_dataset()` returns a structured dictionary containing:
1. `stint_fits`: List of `DegradationFitResult` objects for every valid driver stint.
2. `compound_models`: Aggregated `DegradationFitResult` models for Soft, Medium, and Hard compounds.
3. `summary_table`: Clean `pd.DataFrame` summarizing parameters for pit-wall strategists.

### The `DegradationFitResult` Dataclass (`src/dep/degradation.py:119-146`)
```python
@dataclass
class DegradationFitResult:
    compound: str                 # "SOFT", "MEDIUM", "HARD"
    driver: str                   # "HUL" (#27), "MAG" (#20)
    stint: int                    # Stint index (e.g. 1)
    n_laps: int                   # Number of clean laps analyzed (e.g. 18)
    base_pace_s: float            # Fresh tyre baseline pace (e.g. 81.185 s)
    alpha: float                  # Linear degradation rate (e.g. 0.0642 s/lap)
    beta: float                   # Quadratic cliff curvature (e.g. 0.0028 s/lap^2)
    r_squared: float              # Fit quality (e.g. 0.884)
    predicted_cliff_lap: float    # Forecasted cliff lap horizon (e.g. 33.2 laps)
    limiting_wheel: str           # Critical bottleneck tyre ("FL")
    four_wheel_state: FourWheelState  # [D_FL, D_FR, D_RL, D_RR]
    residuals: np.ndarray         # Per-lap unexplained variance
```

### The Strategy Summary Output Table:
| Field | Real Haas Example (Barcelona FP2) | Strategist's Takeaway |
| :--- | :--- | :--- |
| **`limiting_wheel`** | `'FL'` | The Front-Left tyre is the bottleneck. The right-side tyres are healthy. |
| **`alpha`** | `0.064 s/lap` | The tyre naturally loses $\approx 0.064\text{s}$ of pace every lap. |
| **`beta`** | `0.0028 s/lap^2` | Wear acceleration curvature is moderate. |
| **`predicted_cliff_lap`** | `Lap 33.2` | Box before Lap 33 to prevent disastrous pace collapse. |
| **`r_squared`** | `0.884` | $88.4\%$ of pace variance is physically explained by tyre wear. |

---

## 4. Pipeline Handoff: How DEP Feeds Component 5 (`Core Model`)

```text
[IEP Output: enriched_laps (Corrected Pace + Frictional Work Proxy)]
       │
       ▼
[DEP Engine 3 (degradation.py)]
       │
       ├─► Allocates 4-Wheel Workload: [FL: 42.5%, RL: 42.5%, FR: 7.5%, RR: 7.5%]
       ├─► Identifies Limiting Wheel: "FL"
       ├─► Fits Polynomial Trajectory: alpha = 0.064, beta = 0.0028, R^2 = 0.884
       └─► Detects Cliff Horizon: Lap 33.2
               │
               ▼
[Component 5 (CMP / Core Model & Pit-Wall Console)]
 • Initializes 4-wheel cockpit thermals with FL as limiting corner.
 • Feeds forward stint simulator to evaluate 1-stop vs 2-stop strategies.
 • Drives the pit-wall degradation chart and compound crossover windows.
```
