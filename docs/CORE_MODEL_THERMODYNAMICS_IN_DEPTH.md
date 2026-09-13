# Component 5: Thermodynamic & Wear Core Model (CMP / Physics-Informed State-Space Core)

> **Module Location**: `core_model/code/thermal_wear_model.py` and `src/cmp/`  
> **Related Documentation**: [`docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md`](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md) (Formulas 10, 15–26, 29–32)  
> **Primary Literature Sources**:  
> 1. **Farroni, F., Giordano, D., Russo, M., & Timpone, F. (2014)**. *TRT: Thermo Racing Tyre: a physical model to predict the tyre temperature distribution*, *Meccanica*, 49(3), 707–729.  
> 2. **West, G., & Limebeer, D. J. N. (2020)**. *Optimal Tyre Management of a Formula One Car*, *IEEE Transactions on Control Systems Technology*, 28(6), 2133–2147.  
> 3. **Tremlett, A. J., & Limebeer, D. J. N. (2016)**. *Optimal Tyre Usage for a Formula One Car*, *Vehicle System Dynamics*, 54(10), 1448–1473.  

---

## 1. Executive Summary: What Is Component 5?

While previous components isolated green-flag racing laps (PIP), calculated chassis kinematics (IEP), and fitted empirical polynomial degradation curves (DEP), **Component 5 is the physical engine room of TrackShift**.

It asks the fundamental physical question:
> *"Given the speed, steering angle, braking deceleration, track temperature, and weather across a Grand Prix stint, what are the exact inner and outer temperatures of the tyres, how much rubber is being destroyed by abrasion, cold graining, and thermal blistering, and how many tenths of a second of grip does the driver lose on every single lap?"*

Component 5 implements a **5-stage deterministic physical evidence chain**:
```text
[ Car Telemetry & Weather ]
            │
            ▼
┌───────────────────────────────────────────────┐
│ STAGE 1: Interfacial Frictional Sliding Power │ (Farroni TRT 2014 & West 2020)
└───────────────────────┬───────────────────────┘
                        │ Q_frict
                        ▼
┌───────────────────────────────────────────────┐
│ STAGE 2: Coupled 2-Node Thermodynamic ODEs    │ (First Law of Thermodynamics)
│ • Tread Surface Layer (T_tread)               │ Fast thermal response (~seconds)
│ • Internal Deep Carcass (T_carcass)           │ Slow thermal inertia (~laps)
└───────────────────────┬───────────────────────┘
                        │ T_tread, T_carcass
                        ▼
┌───────────────────────────────────────────────┐
│ STAGE 3: Tri-Mechanism Wear Superposition     │ (West & Limebeer 2020)
│ • Mechanical Surface Abrasion  (w_p)          │ Proportional to scrub power
│ • Sub-Optimal Cold Graining    (w_g)          │ Active below T_grain
│ • Super-Optimal Blistering     (w_b)          │ Active above T_blister
└───────────────────────┬───────────────────────┘
                        │ Damage State D(t)
                        ▼
┌───────────────────────────────────────────────┐
│ STAGE 4: Separable Dynamic Grip Decay         │ (TrackShift Grip Surrogate)
│ mu_eff = mu_0 * (1 - lambda * D) * Phi_thermal│
└───────────────────────┬───────────────────────┘
                        │ Effective Grip mu_eff
                        ▼
┌───────────────────────────────────────────────┐
│ STAGE 5: Observational Lap Time Mapping       │ (Linear Taylor Sensitivity)
│ Delta t_pred = k_pace * (1 - mu_eff / mu_0)   │
└───────────────────────────────────────────────┘
```

---

## 2. Stage 1: Interfacial Frictional Sliding Power ($Q_{\text{frict}}$)

### Glossary Reference: Formulas 10 & 11
* **Source**: Farroni et al. (2014), *TRT: Thermo Racing Tyre*, Section 2.1; West & Limebeer (2020), Eq. (12); Jaeger, J. C. (1942), *Moving Sources of Heat and the Temperature at Sliding Contacts*, *Proc. Roy. Soc. NSW*, 76, 203–224.
* **Location in Code**: `core_model/code/thermal_wear_model.py:164-198`.

### Equation
```text
v_ms = speed_kmh / 3.6
F_lat = vehicle_mass_kg * (v_ms^2) * |curvature|
alpha_rad = clip(F_lat / (C_alpha * aero_downforce_factor), 0.0, 0.22)

v_slip_lat = v_ms * sin(alpha_rad)
v_slip_lon = 0.03 * v_ms   (under heavy braking/traction |a_lon| > 1.0 m/s^2)

Q_frict = p1 * (F_lat * v_slip_lat + F_lon * v_slip_lon)
```

| Symbol | Meaning | Value / Unit |
| :--- | :--- | :--- |
| `Q_frict` | Total frictional heat power flowing into the tyre rubber | Watts ($\text{W}$, up to $45,000\text{ W}$) |
| `p1` | Thermal partition fraction entering tyre (Jaeger 1942) | $0.65$ ($65\%$ into tyre, $35\%$ into road) |
| `alpha_rad` | Tyre lateral slip angle | Radians ($0.0\text{ to }0.22\text{ rad} \approx 12.6^\circ$) |
| `C_alpha` | Axle cornering stiffness | $\text{N/rad}$ ($140,000\text{ to }150,000\text{ N/rad}$) |
| `v_slip_lat`| Lateral scrub sliding velocity across asphalt aggregate | $\text{m/s}$ |
| `v_slip_lon`| Longitudinal micro-slip velocity under braking/power | $\text{m/s}$ |

### Why It Works in Simple Words
A rolling tyre does not produce heat just by rolling down a smooth straight. Heat is generated when the tyre **micro-slides** across the jagged microscopic stones of the asphalt. 
1. In high-speed corners, the car's momentum tries to fling it outward. The driver turns the steering wheel, creating an angle between where the wheel is pointing and where the car is traveling (the **slip angle $\alpha$**).
2. Because of this angle, the rubber contact patch scrubs sideways at velocity $v_{\text{slip,lat}} = v \sin(\alpha)$.
3. Multiplying the cornering force ($F_{\text{lat}}$) by the sliding speed ($v_{\text{slip}}$) gives the total mechanical friction power being dissipated.
4. Based on Jaeger's classic 1942 heat partition theory (and validated by Farroni's TRT experiments in 2014), **$65\%$ of this friction energy conducts into the tyre rubber ($p_1 = 0.65$)**, while $35\%$ conducts away into the asphalt roadbed.

### Why We Considered It
Without calculating sliding power, a model has to guess tyre temperatures from GPS speeds. Calculating $Q_{\text{frict}}$ physically ties the tyre's thermal energy directly to the driver's aggression, cornering radius, and downforce level.

---

## 3. Stage 2: Coupled 2-Node Thermodynamic ODEs

A Formula 1 tyre is **not a single lump of rubber**. It consists of a thin outer tread layer ($\approx 3.2\text{ kg}$) that touches the track, and a massive internal carcass ($\approx 6.8\text{ kg}$) composed of Kevlar, nylon cords, and steel belts.

TrackShift models these as two coupled ordinary differential equations (ODEs):

```text
       SURFACE TREAD NODE (3.2 kg)
┌──────────────────────────────────────────────┐
│  HEAT IN:                                    │
│  • Q_effective = Q_frict * duty_cycle        │
│                                              │
│  HEAT OUT:                                   │
│  • Q_cond = h_track * A_cp * (T_tread - T_track)
│  • Q_conv = h_air(v) * A_exp * (T_tread - T_amb)
│  • Q_int  = k_tc * (T_tread - T_carcass)     │
└──────────────────────┬───────────────────────┘
                       │ Q_int (Internal Conduction)
                       ▼
       DEEP CARCASS NODE (6.8 kg)
┌──────────────────────────────────────────────┐
│  HEAT IN:                                    │
│  • Q_int (received from hot tread)           │
│  • Q_deflect = 0.02 * Q_effective (flexing)  │
│                                              │
│  HEAT OUT:                                   │
│  • Q_rim = h_rim * (T_carcass - T_ambient)   │
└──────────────────────────────────────────────┘
```

---

### Master ODE 1: Tread Surface Layer Temperature ($T_{\text{tread}}$)

#### Glossary Reference: Formula 15
* **Source**: First Law of Thermodynamics / Farroni et al. (2014), *TRT: Thermo Racing Tyre*, Meccanica 49(3); West & Limebeer (2020), Section III, Eq. (10).
* **Location in Code**: `core_model/code/thermal_wear_model.py:224-242`.

#### Equation
```text
m_tread * c_tread * (d T_tread / dt) = Q_effective - Q_cond - Q_conv - Q_int
```

| Symbol | Meaning | Value / Unit |
| :--- | :--- | :--- |
| `m_tread` | Mass of rubber tread layer | $3.2\text{ kg}$ per tyre |
| `c_tread` | Specific heat capacity of tread compound | $1,750.0\text{ J / (kg} \cdot \text{K)}$ |
| `T_tread` | Instantaneous bulk tread surface temperature | $^\circ\text{C}$ (typical operating range: $90\text{--}130^\circ\text{C}$) |
| `Q_effective`| Sliding heat entering tread during cornering | Watts ($\text{W}$) |
| `Q_cond` | Conductive heat flux into track surface | Watts ($\text{W}$) |
| `Q_conv` | Convective cooling from ambient airflow | Watts ($\text{W}$) |
| `Q_int` | Conduction from outer tread into inner carcass | Watts ($\text{W}$) |

---

### Master ODE 2: Deep Carcass Temperature ($T_{\text{carcass}}$)

#### Glossary Reference: Formula 16
* **Source**: First Law of Thermodynamics / West & Limebeer (2020), Section III, Eq. (11); Farroni (2014).
* **Location in Code**: `core_model/code/thermal_wear_model.py:225-243`.

#### Equation
```text
m_carc * c_carc * (d T_carc / dt) = Q_int + Q_deflect - Q_rim
```

| Symbol | Meaning | Value / Unit |
| :--- | :--- | :--- |
| `m_carc` | Mass of structural carcass skeleton | $6.8\text{ kg}$ per tyre |
| `c_carc` | Specific heat capacity of carcass materials | $1,500.0\text{ J / (kg} \cdot \text{K)}$ |
| `T_carc` | Internal carcass core temperature | $^\circ\text{C}$ (typical operating range: $95\text{--}115^\circ\text{C}$) |
| `Q_deflect`| Internal cyclic flexing & hysteresis heat generation | Watts ($\approx 2\%$ of friction power) |
| `Q_rim` | Convective dissipation into forged magnesium wheel rim | Watts ($\text{W}$) |

---

### The Supporting Heat Flux Equations (Formulas 17, 18, 20, 22)

```text
1. Track Conduction:       Q_cond = h_track * A_contact * (T_tread - T_track)
   - h_track = 120.0 W/(m^2 * K), A_contact = 0.045 m^2
   - Source: Farroni TRT (2014) Eq. (6).

2. Air Convection:         Q_conv = h_air(v) * A_exposed * (T_tread - T_ambient)
   - h_air(v) = 32.0 + 3.2 * (v_ms)^0.8
   - A_exposed = 0.55 m^2
   - Source: Newton's Law of Cooling; Incropera & DeWitt (2007); West & Limebeer (2020).

3. Internal Conduction:    Q_int  = k_tread_carc * (T_tread - T_carcass)
   - k_tread_carc = 85.0 W/K
   - Source: Fourier's Law; Farroni (2014).

4. Rim Dissipation:        Q_rim  = h_rim * (T_carcass - T_ambient)
   - h_rim = 12.0 W/K
   - Source: Lumped boundary heat sink (TrackShift Tier 3 extension to prevent runaway).
```

### Why the 2-Node Architecture Works in Simple Words
* **The Tread is a Sprinter**: Because it is thin ($3.2\text{ kg}$), its temperature spikes in just $2\text{ seconds}$ through Turn 3, and plummets in $5\text{ seconds}$ down the back straight.
* **The Carcass is a Marathon Runner**: Because it is thick and heavy ($6.8\text{ kg}$), it takes **3 full laps** to absorb heat and reach thermal equilibrium.
* **Why this matters for racing**: If a driver's tread overheats, they can back off for two corners to cool the surface down. But if their *carcass* overheats, the tyre pressure skyrockets and the hot core continuously pumps heat back into the surface, causing irreversible blistering.

---

## 4. Stage 3: Tri-Mechanism Wear Superposition

### Glossary Reference: Formulas 23, 24, 25, 26
* **Source**: West & Limebeer (2020), *Optimal Tyre Management of a Formula One Car*, IEEE TCST, Section IV, Eqs. (14)–(17); Tremlett & Limebeer (2016).
* **Location in Code**: `core_model/code/thermal_wear_model.py:263-280`.

In modern Formula 1 tyre science, tyre wear is **not a single uniform process**. It is the simultaneous superposition of **3 distinct physical mechanisms**:

```text
Total Wear Rate:  dD/dt = w_p(t) + w_g(t) + w_b(t)
```

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. MECHANICAL SURFACE ABRASION (w_p)                                        │
│    • Driven by: Interfacial sliding work Q_frict                            │
│    • Formula:   w_p = S_asphalt * w_p1 * (Q_frict / Q_ref)^w_p2             │
│    • Constants: w_p1 = 0.035, w_p2 = 1.15, Q_ref = 15,000 W                 │
│    • Physical Meaning: Microscopic rubber particles physically torn away by │
│      the sharp asphalt stones. Always active whenever the car is cornering. │
└─────────────────────────────────────────────────────────────────────────────┘
                                      +
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. SUB-OPTIMAL COLD GRAINING (w_g)                                          │
│    • Driven by: Thermal deficit below graining threshold (T_tread < T_grain)│
│    • Formula:   w_g = w_g1 * [max(T_grain - T_tread, 0)]^w_g2               │
│    • Constants: w_g1 = 2.0e-5, w_g2 = 1.4, T_grain = 92°C (Medium)          │
│    • Physical Meaning: When rubber is cold, it is brittle. Shear stresses   │
│      snap surface polymers, rolling them into loose nodules ("grains") that │
│      destroy grip. Shuts off completely once the tyre warms into its window!│
└─────────────────────────────────────────────────────────────────────────────┘
                                      +
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. SUPER-OPTIMAL THERMAL BLISTERING (w_b)                                   │
│    • Driven by: Thermal excess above blister limit (T_tread > T_blister)    │
│    • Formula:   w_b = w_b1 * [max(T_tread - T_blister, 0)]^w_b2             │
│    • Constants: w_b1 = 5.0e-5, w_b2 = 1.7, T_blister = 126°C (Medium)       │
│    • Physical Meaning: Extreme heat causes localized sub-surface tearing.   │
│      Boiling gas pockets pop craters out of the tread face. Explosive wear. │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cumulative Damage Integral
The total cumulative tyre damage $D(t)$ accumulates continuously:
```text
D(t) = Integral_0^t [ w_p(tau) + w_g(tau) + w_b(tau) ] dtau
```
When $D = 0.0$, the tyre is brand new. When $D \ge 0.70$, the tyre enters the severe performance cliff zone.

---

## 5. Stage 4: Compound Operating Windows & Dynamic Grip Decay

### Glossary Reference: Formulas 29, 30, 31
* **Source**: TrackShift Separable Grip Formulation / West & Limebeer (2020), Section IV; Pacejka, H. B. (2012), *Tire and Vehicle Dynamics*, 3rd ed.
* **Location in Code**: `core_model/code/thermal_wear_model.py:281-291`.

### Pirelli Compound Thermal Parameter Specifications
TrackShift maintains exact thermodynamic boundaries for all Pirelli dry slick compounds:

| Compound | Optimal Temp ($T_{\text{opt}}$) | Operating Window ($T_{\text{window}}$) | Graining Threshold ($T_{\text{grain}}$) | Blister Limit ($T_{\text{blister}}$) | Peak Grip ($\mu_0$) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **SOFT (C3)** | $95.0^\circ\text{C}$ | $\pm 15.0^\circ\text{C}$ ($80\text{--}110^\circ\text{C}$) | $85.0^\circ\text{C}$ | $118.0^\circ\text{C}$ | $1.55$ |
| **MEDIUM (C2)** | $105.0^\circ\text{C}$ | $\pm 18.0^\circ\text{C}$ ($87\text{--}123^\circ\text{C}$) | $92.0^\circ\text{C}$ | $126.0^\circ\text{C}$ | $1.45$ |
| **HARD (C1)** | $112.0^\circ\text{C}$ | $\pm 20.0^\circ\text{C}$ ($92\text{--}132^\circ\text{C}$) | $98.0^\circ\text{C}$ | $134.0^\circ\text{C}$ | $1.35$ |

### Separable Effective Grip Formula
Instead of running an opaque, multi-parameter Pacejka neural net, TrackShift uses a mathematically transparent **separable grip formulation**:

```text
mu_eff(T, D) = mu_0 * (1.0 - lambda_wear * D) * Phi_thermal(T_tread)
```

Where the **Thermal Plateau Function** ($\Phi_{\text{thermal}}$) is defined as:
```text
half_window = 0.5 * T_window
excess_temp = max(0.0, |T_tread - T_opt| - half_window)

Phi_thermal = max(0.70, 1.0 - k_thermal * (excess_temp / half_window)^2)
```

```text
  Thermal Efficiency Phi
     1.0 ──────────┌──────────────┐──────────  (Optimal Operating Window: 100% Grip)
                   │              │
     0.85        /                  \
                /                    \
     0.70 ─────/                      \──────  (Thermal Floor Clamp)
             Cold Graining          Overheating Blistering
```

* **Inside the window**: $\Phi_{\text{thermal}} = 1.0$. The tyre delivers $100\%$ of its available grip.
* **Outside the window**: Grip drops quadratically at rate $k_{\text{thermal}} = 0.35$, but is capped at a minimum floor of $0.70$ ($70\%$).
* **Wear decay ($\lambda_{\text{wear}} = 0.25$)**: As mechanical damage accumulates ($D \to 0.50$), peak available grip permanently decreases by $12.5\%$, regardless of temperature.

---

## 6. Stage 5: Physical-to-Observational Lap Time Consequence Mapping

### Glossary Reference: Formula 32
* **Source**: Analytical 1st-Order Taylor Series Expansion of Quasi-Steady-State Cornering around a Closed Circuit; TrackShift Vehicle Dynamics Derivation.
* **Location in Code**: `core_model/code/thermal_wear_model.py:292-294`.

### Equation
```text
grip_drop_ratio = 1.0 - (mu_eff / mu_0)

Delta t_pred = k_pace_loss * grip_drop_ratio
```

| Symbol | Meaning | Value / Unit |
| :--- | :--- | :--- |
| `Delta t_pred` | Predicted lap time increase due to tyre degradation | Seconds ($\text{s}$, e.g. $+1.25\text{ s/lap}$) |
| `k_pace_loss` | Circuit cornering pace sensitivity factor | $6.5\text{ s}$ per full unit of grip loss |
| `mu_eff / mu_0`| Current effective grip fraction remaining | Dimensionless ($0.75\text{ to }1.00$) |

### Why It Works in Simple Words
Race strategists do not talk in friction coefficients ($\mu$); they talk in **lap times**. 
* Taking cornering speed $v = \sqrt{\mu \cdot R \cdot g}$, the time to traverse a corner is $t_{\text{corner}} = L / v \propto \mu^{-1/2}$.
* Differentiating with respect to grip produces a clean linear sensitivity: for every $10\%$ drop in tyre grip ($\mu_{\text{eff}} / \mu_0 = 0.90$), the car loses $6.5 \times 0.10 = \mathbf{0.65\text{ seconds}}$ per lap on a medium-downforce circuit like Barcelona!

---

## 7. Data In and Data Out Specification

### Data In: What Goes In
Component 5 consumes kinematic proxies, ambient weather, and compound specifications:

| Input Variable | Physical Meaning | Source Module | Typical Range |
| :--- | :--- | :--- | :--- |
| `speed_kmh` | Average circuit speed | `IEP: PhysicsProxies` | $180.0\text{--}240.0\text{ km/h}$ |
| `curvature_m_inv` | Track mean cornering curvature ($\kappa$) | `IEP: CurvatureEstimator`| $0.005\text{--}0.025\text{ m}^{-1}$ |
| `a_lon_ms2` | Longitudinal acceleration ($dv/dt$) | `IEP: PhysicsProxies` | $-50.0\text{ to }+15.0\text{ m/s}^2$ |
| `vehicle_mass_kg` | Instantaneous car mass (798 kg + fuel) | `IEP: FuelBurnEstimator` | $803.0\text{--}903.0\text{ kg}$ |
| `t_track_c` | Asphalt surface temperature | FastF1 Weather Stream | $25.0\text{--}52.0^\circ\text{C}$ |
| `t_ambient_c` | Ambient air temperature | FastF1 Weather Stream | $18.0\text{--}35.0^\circ\text{C}$ |
| `compound` | Selected tyre compound | Timing Feeds (`'SOFT'`, `'MEDIUM'`, `'HARD'`) | Categorical |
| `push_level_factor`| Driver aggression multiplier | Strategy State ($0.90 = \text{lift/coast}, 1.15 = \text{quali}$) | $0.90\text{--}1.20$ |

---

### Data Out: What Comes Out
Component 5 returns two rich dataclasses representing the tyre's thermal and wear states on every simulation step:

#### 1. `TyreThermalState` (`core_model/code/thermal_wear_model.py:87-95`)
```python
@dataclass
class TyreThermalState:
    t_tread_c: float          # Instantaneous outer tread temperature (°C)
    t_carcass_c: float        # Instantaneous deep carcass core temperature (°C)
    q_frict_w: float          # Frictional power flux entering tread (W)
    q_cond_track_w: float     # Conductive heat lost to track (W)
    q_conv_air_w: float       # Convective heat lost to ambient air (W)
    q_tread_to_carc_w: float  # Internal heat conducted from tread to carcass (W)
```

#### 2. `TyreWearState` (`core_model/code/thermal_wear_model.py:98-107`)
```python
@dataclass
class TyreWearState:
    dot_w_p: float            # Mechanical surface abrasion rate (damage / lap)
    dot_w_g: float            # Cold graining surface tearing rate (damage / lap)
    dot_w_b: float            # Thermal blistering cratering rate (damage / lap)
    dot_w_total: float        # Total instantaneous wear rate (damage / lap)
    accumulated_d: float      # Cumulative total tyre damage state D(t) [0.0 - 1.0]
    effective_mu: float       # Current dynamic friction coefficient mu_eff
    pace_delta_s: float       # Predicted lap time degradation consequence (seconds)
```

---

## 8. Summary: Why Component 5 Is Unique

Component 5 is what separates TrackShift from generic curve-fitting tools. It does not treat tyre degradation as a black box:
1. **It obeys the First Law of Thermodynamics** ($C \cdot dT/dt = \sum Q_i$), properly accounting for track conduction, airspeed convection, and tyre carcass inertia.
2. **It models the 3 distinct failure modes of Pirelli rubber** (abrasion, cold graining, and thermal blistering) based on peer-reviewed research (*West & Limebeer 2020*).
3. **It translates invisible tyre physics into race-winning strategy**, predicting exactly which lap the tyre will hit its thermal cliff.
