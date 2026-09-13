# Modeling All 4 Tyres from Whole-Car Telemetry: In-Depth Engineering & Physical Derivation

> **Document Status**: Complete Engineering Blueprint & Mathematical Architecture  
> **Target Module**: `src/dep/degradation.py` (`AsymmetricLoadAllocator`, `FourWheelState`, `TriMechanismWearModel`)  
> **Related Documentation**: [`docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md`](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md) (Formulas 6, 7, 8, 47)  

---

## 1. The Fundamental Problem: Why We Must Model 4 Tyres

In Formula 1, **teams never pit because the "average" tyre is worn out**. A Grand Prix pit stop is triggered the moment the **single most stressed tyre** (the "limiting tyre") falls off its performance cliff.

### The Real-World Telemetry Barrier
In public timing and telemetry feeds (such as FastF1, Ergast, and OpenF1):
- We receive **only whole-car telemetry**: speed, throttle, braking pressure, gear, engine RPM, GPS coordinates, and vehicle-level accelerations.
- F1 teams keep their **individual wheel-hub strain gauges** (measuring $F_z$ on each wheel), **internal tyre pressure telemetry**, and **high-speed multi-zone infrared cameras** (measuring 8 temperature zones across each tyre face) strictly confidential and encrypted.

```text
WHAT WE RECEIVE (Whole-Car Telemetry):
[ Speed v, Throttle, Brake, a_lat, a_lon, Steering, GPS (x,y,z) ]
                          │
                          ▼
            TRACKSHIFT 4-CORNER DECOMPOSITION ENGINE
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
  [ FL Wheel ]       [ FR Wheel ]       [ RL Wheel ]       [ RR Wheel ]
  • Normal Load Fz   • Normal Load Fz   • Normal Load Fz   • Normal Load Fz
  • Slip Energy Q    • Slip Energy Q    • Slip Energy Q    • Slip Energy Q
  • Tread Temp T     • Tread Temp T     • Tread Temp T     • Tread Temp T
  • Wear D_FL        • Wear D_FR        • Wear D_RL        • Wear D_RR
```

If a tyre model simply assumes that all 4 tyres experience 25% of the total workload, it will fail catastrophically:
- At **Circuit de Barcelona-Catalunya** ($65\%$ right-hand turns), the **Front-Left (FL)** tyre sustains massive lateral cornering forces through Turn 3 and Turn 9, wearing out **more than twice as fast** as the Front-Right tyre.
- At **Bahrain**, traction-limited exits onto long straights brutally overwork the **Rear tyres (RL & RR)**, causing rear thermal blistering while front tyres remain healthy.

To predict pit stops with sub-lap precision, TrackShift reconstructs the physical state of **all 4 wheels independently** using classical vehicle dynamics and FIA regulatory constraints.

---

## 2. Mathematical Architecture: The 4 Decomposition Steps

To split whole-car data into 4 independent wheel states, TrackShift resolves 4 coupled physical mechanisms:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      STEP 1: STATIC BALANCE & FUEL                      │
│      FIA Tech Regs 4.1, 4.2 & 6.1.2: 45% Front / 55% Rear Base          │
│       + Dynamic forward weight migration as 100 kg fuel burns off       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   STEP 2: LONGITUDINAL PITCH TRANSFER                   │
│         Braking transfers normal load forward to front axle             │
│        Acceleration transfers normal load rearward to rear axle         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 3: LATERAL ROLL LOAD TRANSFER                   │
│     Centrifugal force transfers load across track width to outer wheels  │
│   Front/rear roll stiffness ratio (K_phi) splits lateral load by axle   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     STEP 4: 4-CORNER WORKLOAD & WEAR                    │
│   Each wheel receives its individual frictional energy Q_i and temp T_i │
│      Tri-mechanism wear (abrasion, graining, blistering) evaluated      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step 1: Base Static Weight Distribution & Fuel Mass Migration

### Glossary Reference: Formula 47
* **Source**: FIA Formula 1 Technical Regulations 2024, Articles 4.1 ($798\text{ kg}$ minimum dry mass), 4.2 ($44.5\%\text{--}46.0\%$ front dry axle weight limit), and Article 6.1.2 (Fuel cell located behind driver cockpit).
* **Location in Code**: `post_race_validation/code/post_race_validator.py:105-113` & `src/dep/degradation.py:180-195`.

### Formula
```text
W_dist(t) = 1.0 + gamma_axle * (m_fuel(t) / m_fuel,init - 0.5)

Q_frict,scaled(t) = Q_frict,raw(t) * W_dist(t)
```

| Symbol | Meaning | Value / Unit |
| :--- | :--- | :--- |
| `W_dist(t)` | Limiting axle normal load scaling factor | Dimensionless ($0.98\text{ to }1.02$) |
| `gamma_axle`| Axle balance sensitivity coefficient to fuel mass | $0.040$ ($4\%$ balance swing) |
| `m_fuel(t)` | Instantaneous fuel mass remaining on board | $5.0\text{ to }105.0\text{ kg}$ |
| `m_fuel,init`| Initial starting fuel load at race start | $\approx 105.0\text{ kg}$ |

### Plain-English Explanation: Why It Works
Formula 1 Technical Regulations Article 6.1.2 mandates that the fuel cell must sit inside the carbon survival cell, directly **behind the driver's back and ahead of the engine**. 

Because this location is behind the car's dry center of gravity, approximately **$58\%\text{ to }60\%$ of the initial $100\text{ kg}$ fuel load rests on the rear axle**:
1. **Full Fuel (Start of Race, $100\text{ kg}$)**: The rear axle is heavily loaded. The rear tyres carry higher normal force $F_z$, generating more frictional scrub and higher thermal strain.
2. **Low Fuel (End of Race, $5\text{ kg}$)**: The car sheds $100\text{ kg}$, but the rear axle loses $\approx 60\text{ kg}$ while the front axle loses only $\approx 40\text{ kg}$. This causes the car's effective weight distribution to **migrate forward by $\approx 2.4\%$ across the race**, naturally taking load off the rear tyres and shifting cornering scrub onto the front tyres.

---

## 4. Step 2: Dynamic Longitudinal Pitch Load Transfer

### Glossary Reference: Formula 7
* **Source**: Milliken, W. F., & Milliken, D. L. (1995). *Race Car Vehicle Dynamics*, SAE International, Chapter 18 (Longitudinal Load Transfer); Guiggiani, M. (2014). *The Science of Vehicle Dynamics*, Springer.
* **Location in Code**: `src/dep/degradation.py:237-250`.

### Formula
```text
Delta Fz,lon = m(t) * a_lon * (h_cg / L_wheelbase)
```

| Symbol | Meaning | Nominal F1 Value |
| :--- | :--- | :--- |
| `Delta Fz,lon` | Total longitudinal vertical load transferred between axles | $\text{N}$ (up to $5,000\text{ N}$) |
| `m(t)` | Instantaneous car mass (dry mass + remaining fuel) | $798\text{ kg} + m_{\text{fuel}} \approx 850\text{ kg}$ |
| `a_lon` | Longitudinal acceleration channel from telemetry | $\text{m/s}^2$ ($-50\text{ m/s}^2$ braking, $+15\text{ m/s}^2$ traction) |
| `h_cg` | Center of gravity height above track reference plane | $\approx 0.31\text{ m}$ ($310\text{ mm}$) |
| `L_wheelbase`| Wheelbase distance between front and rear axle centers | $\approx 3.60\text{ m}$ ($3600\text{ mm}$) |

### Plain-English Explanation: Why It Works
When a driver hits the brakes at the end of a straight at $330\text{ km/h}$, the car experiences massive deceleration of $-5.0\text{ g}$ ($-49\text{ m/s}^2$). 
* Newton's second law dictates that the vehicle's momentum acts forward through its center of gravity ($h_{\text{cg}}$). Because the tyre contact patches are on the ground, this creates a pitching moment that **forces the front nose down and lifts the rear**.
* Dynamic front axle share surges from its static $45\%$ baseline up to **$65\%\text{--}70\%$ under maximum braking**:
  ```text
  w_front,braking = clip(0.45 + k_pitch * (|a_lon| / g), 0.45, 0.70)
  w_rear,braking  = 1.0 - w_front,braking
  ```
* Conversely, when accelerating out of a slow hairpin in 2nd gear ($a_{\text{lon}} > 0$), weight squats onto the rear wheels, increasing rear axle share to **$65\%\text{--}75\%$**:
  ```text
  w_rear,traction = clip(0.55 + k_pitch * (|a_lon| / g), 0.55, 0.75)
  w_front,traction = 1.0 - w_rear,traction
  ```

---

## 5. Step 3: Dynamic Lateral Roll Load Transfer & Roll Stiffness Distribution

### Glossary Reference: Formulas 6 & 8
* **Source**: Milliken & Milliken (1995), Chapter 16 (Lateral Load Transfer & Roll Center Heights); West & Limebeer (2020), *Optimal Control of Formula One Tyres*.
* **Location in Code**: `src/dep/degradation.py:220-236`.

### Formula
```text
Delta Fz,lat,total = m(t) * |a_lat| * (h_cg / t_track)

Delta Fz,lat,front = K_phi,front * Delta Fz,lat,total
Delta Fz,lat,rear  = (1.0 - K_phi,front) * Delta Fz,lat,total
```

| Symbol | Meaning | Nominal F1 Value |
| :--- | :--- | :--- |
| `Delta Fz,lat,total`| Total lateral normal load transferred from inside to outside | $\text{N}$ (up to $11,000\text{ N}$) |
| `a_lat` | Lateral acceleration from telemetry (`v^2 * kappa`) | $\text{m/s}^2$ (up to $50\text{ m/s}^2$ / $5.1\text{ g}$) |
| `t_track` | Average track width between tyre contact patch centerlines | $\approx 1.70\text{ m}$ ($1700\text{ mm}$) |
| `K_phi,front` | Front suspension roll stiffness distribution fraction | $\approx 0.55\text{ to }0.60$ (default: $0.58$) |

### Plain-English Explanation: Why It Works
When cornering at $250\text{ km/h}$ through Barcelona Turn 3:
1. Centrifugal force pushes the chassis toward the outside of the turn. This creates a rolling moment about the chassis roll axis that **unloads the inside tyres and compresses the outside tyres**.
2. **How is this roll resisted?** Through the front and rear anti-roll bars (ARB) and suspension springs. 
3. In Formula 1 cars, the **front suspension is tuned to be stiffer in roll than the rear ($K_{\phi,\text{front}} \approx 0.58$)**. This is intentional: race engineers give the front axle more roll stiffness so that under high cornering loads, the front tyres saturate first, ensuring predictable turn-in understeer rather than dangerous high-speed snap oversteer.
4. As a result, the **outside front tyre carries an even higher percentage of the lateral load transfer** than the outside rear tyre!

```text
RIGHT-HAND TURN (kappa > 0, like Barcelona Turn 3):
Centrifugal force pushes weight to the LEFT:
- Left Tyres (Outside):   w_left  = 0.50 + clip(k_roll * (|a_lat| / g), 0.0, 0.38)  --> Up to 88%
- Right Tyres (Inside):   w_right = 0.50 - clip(k_roll * (|a_lat| / g), 0.0, 0.38)  --> Down to 12%

LEFT-HAND TURN (kappa < 0):
Centrifugal force pushes weight to the RIGHT:
- Right Tyres (Outside):  w_right = 0.50 + clip(k_roll * (|a_lat| / g), 0.0, 0.38)
- Left Tyres (Inside):    w_left  = 0.50 - clip(k_roll * (|a_lat| / g), 0.0, 0.38)
```

---

## 6. Step 4: The Four-Wheel Normal Force & Workload Synthesis

### Glossary Reference: Formula 8
* **Source**: Milliken & Milliken (1995), Chapter 16; RacePhysiX Four-Corner Framework.
* **Location in Code**: `src/dep/degradation.py:252-276`.

### Complete 4-Wheel Normal Load Equations
By superimposing static weight, aerodynamic downforce ($F_{\text{aero}} = \frac{1}{2}\rho v^2 C_L A$), longitudinal pitch transfer ($\Delta F_{z,\text{lon}}$), and lateral roll transfer ($\Delta F_{z,\text{lat}}$), we obtain the exact instantaneous vertical load on every single wheel:

```text
Fz,FL = (0.5 * Fz,front,static) + (0.5 * F_aero,front) - (0.5 * Delta Fz,lon) + (0.5 * K_phi,front * Delta Fz,lat,total)
Fz,FR = (0.5 * Fz,front,static) + (0.5 * F_aero,front) - (0.5 * Delta Fz,lon) - (0.5 * K_phi,front * Delta Fz,lat,total)

Fz,RL = (0.5 * Fz,rear,static)  + (0.5 * F_aero,rear)  + (0.5 * Delta Fz,lon) + (0.5 * (1 - K_phi,front) * Delta Fz,lat,total)
Fz,RR = (0.5 * Fz,rear,static)  + (0.5 * F_aero,rear)  + (0.5 * Delta Fz,lon) - (0.5 * (1 - K_phi,front) * Delta Fz,lat,total)
```

*(Note: Under braking, $\Delta F_{z,\text{lon}} < 0$, so subtracting a negative number adds vertical load onto the front tyres).*

### Workload Partitioning into `AsymmetricLoadAllocator`
In TrackShift's fast forward-simulation engine, the fractional workload shares allocated to each corner are computed by multiplying the longitudinal axle share with the lateral side share:

```text
w_FL = w_front * w_left
w_FR = w_front * w_right
w_RL = w_rear  * w_left
w_RR = w_rear  * w_right

Normalization: w_FL + w_FR + w_RL + w_RR = 1.000
```

Then, the total whole-car frictional power proxy ($Q_{\text{frict,total}}$) is partitioned across the 4 corners:
```text
Q_frict,FL = Q_frict,total * w_FL
Q_frict,FR = Q_frict,total * w_FR
Q_frict,RL = Q_frict,total * w_RL
Q_frict,RR = Q_frict,total * w_RR
```

---

## 7. Concrete Real-World Example: Barcelona Turn 3 (Right-Hand High-Speed Sweeper)

Let's trace actual numbers through the formulas for a 2024 Haas VF-24 driving through **Turn 3 at Circuit de Barcelona-Catalunya** ($v = 245\text{ km/h}$, $a_{\text{lat}} = 3.8\text{ g}$, $a_{\text{lon}} = -0.3\text{ g}$ slight lift/trail):

```text
Input Telemetry:
  Speed v = 68.0 m/s (245 km/h)
  Lateral Accel = +37.3 m/s^2 (+3.8 g, Right Turn)
  Longitudinal Accel = -2.9 m/s^2 (-0.3 g, Trail Braking)
  Total Frictional Power Proxy Q_frict,total = 4,200 kW-proxy

1. Lateral Weight Shift (Right Turn -> Centrifugal force pushes LEFT):
   delta_lat = 0.28 * (3.8 g / 1.0 g) = 0.35 (hits 0.35 roll saturation limit)
   w_left  = 0.50 + 0.35 = 0.85 (85% on Left tyres)
   w_right = 0.50 - 0.35 = 0.15 (15% on Right tyres)

2. Longitudinal Pitch Shift (Slight Trail Braking):
   delta_lon = 0.16 * (0.3 g / 1.0 g) = 0.05
   w_front = 0.45 + 0.05 = 0.50 (50% on Front axle)
   w_rear  = 1.00 - 0.50 = 0.50 (50% on Rear axle)

3. Individual 4-Wheel Workload Shares:
   w_FL = 0.50 * 0.85 = 0.425  (42.5% of car's total friction scrub!)
   w_FR = 0.50 * 0.15 = 0.075  ( 7.5% of car's total friction scrub)
   w_RL = 0.50 * 0.85 = 0.425  (42.5% of car's total friction scrub!)
   w_RR = 0.50 * 0.15 = 0.075  ( 7.5% of car's total friction scrub)

4. Resulting Normal Loads:
   - Front-Left (FL) Tyre:  Fz,FL  ≈ 9,200 N (Heavily loaded, running hot!)
   - Front-Right (FR) Tyre: Fz,FR  ≈ 2,100 N (Unloaded, cooling off)
```

Notice that the **Front-Left tyre bears nearly 6 times more frictional energy than the Front-Right tyre** through this single corner!

---

## 8. Corner-Specific Thermodynamics & Wear Superposition

### The 4-Corner State Vector: `FourWheelState`
TrackShift represents the car's tyre wear as a 4-dimensional state vector:

```text
vec{D}(t) = [ D_FL(t)   D_FR(t) ]
            [ D_RL(t)   D_RR(t) ]
```

### Corner-Specific Temperature Perturbation
Because each tyre receives a different frictional heat flux $Q_{\text{frict}, i}$, their surface tread temperatures deviate from the vehicle mean:
```text
Load Factor: lambda_i = Q_frict,i / (0.25 * Q_frict,total)

T_tread,i = T_tread,mean + 5.0 * (lambda_i - 1.0)
```
- A tyre carrying $42.5\%$ share ($\lambda = 1.70$) runs **$+3.5^\circ\text{C}$ hotter** than the bulk estimate.
- A tyre carrying only $7.5\%$ share ($\lambda = 0.30$) runs **$-3.5^\circ\text{C}$ cooler**.

### Tri-Mechanism Wear Evaluated Independently on Each Corner
Every single tyre runs through the **West & Limebeer (2020)** tri-mechanism equations separately:

```text
d(D_i) / dt = w_p,i(t) + w_g,i(t) + w_b,i(t)

1. Mechanical Abrasion:  w_p,i = w_p1 * (Q_frict,i / Q_ref)^(w_p2)
2. Cold Graining:        w_g,i = w_g1 * [max(T_grain - T_tread,i, 0)]^(w_g2)
3. Thermal Blistering:   w_b,i = w_b1 * [max(T_tread,i - T_blister, 0)]^(w_b2)
```

---

## 9. The Concept of the "Limiting Tyre" (`limiting_wheel`)

In the `FourWheelState` dataclass (`src/dep/degradation.py:107-115`), TrackShift dynamically tracks the most damaged tyre:

```python
@property
def limiting_wheel(self) -> str:
    """Identifies the primary critical tyre bearing highest degradation."""
    mapping = {"FL": self.fl, "FR": self.fr, "RL": self.rl, "RR": self.rr}
    return max(mapping, key=mapping.get)

@property
def max_wear(self) -> float:
    """Returns highest wear value across all four corners."""
    return max(self.fl, self.fr, self.rl, self.rr)
```

### Circuit Direction Dictates the Limiting Tyre

| Circuit | Track Direction | Corner Breakdown | Limiting Tyre | Physical Driver |
| :--- | :--- | :--- | :---: | :--- |
| **Circuit de Barcelona-Catalunya** | Clockwise | $65\%$ Right Turns | **FL (Front-Left)** | High-speed right-hand sweepers (T3, T9) overload outer left front tyre. |
| **Silverstone Circuit** | Clockwise | $68\%$ Right Turns | **FL (Front-Left)** | Sustained right-hand aero load (Copse, Becketts, Stowe). |
| **Bahrain International Circuit** | Clockwise | Long Traction Straights | **RR / RL (Rears)** | High longitudinal slip traction exits on rough asphalt overheat rear carcass. |
| **Autodromo Nazionale Monza** | Clockwise | Long Straights + Heavy Chicanes | **FL / RR** | Extreme longitudinal braking into T1 chicanes + Curva Grande load. |
| **Interlagos (São Paulo)** | **Anticlockwise** | $65\%$ Left Turns | **FR (Front-Right)** | Counter-clockwise layout flips centrifugal forces onto outer right tyres! |

---

## 10. Data In / Data Out Specification

### Data In: What Goes In
The 4-wheel allocator consumes whole-car signals produced by PIP and IEP:

| Input Variable | Physical Meaning | Source / Module | Units / Range |
| :--- | :--- | :--- | :--- |
| `a_lat_ms2` | Lateral acceleration ($v^2 \cdot \kappa$) | `IEP: PhysicsProxies` | $\text{m/s}^2$ ($0.0\text{ to }50.0$) |
| `a_lon_ms2` | Longitudinal acceleration ($dv/dt$) | `IEP: PhysicsProxies` | $\text{m/s}^2$ ($-50.0\text{ to }+15.0$) |
| `kappa` | Track curvature ($1 / R$) | `IEP: CurvatureEstimator` | $\text{m}^{-1}$ (signed: $+ =$ right, $- =$ left) |
| `q_frict_total` | Total vehicle frictional scrub power | `IEP: FrictionalPowerProxy` | $\text{kW-proxy}$ ($0\text{ to }12,000$) |
| `t_tread_c` | Bulk tread surface temperature | `Core Model: ThermalODE` | $^\circ\text{C}$ ($60.0\text{ to }135.0$) |
| `m_fuel_kg` | Fuel mass remaining on board | `IEP: FuelBurnEstimator` | $\text{kg}$ ($5.0\text{ to }105.0$) |
| `circuit_direction`| Primary track turn bias | Circuit Metadata | `'clockwise'` or `'anticlockwise'` |

### Data Out: What Comes Out
The allocator outputs independent 4-corner state objects consumed by the strategy and validation engines:

| Output Field | Dataclass / Structure | Type | Meaning |
| :--- | :--- | :--- | :--- |
| `wheel_work_shares` | `Dict[str, float]` | `FL, FR, RL, RR` | Fractional workload split (sums to $1.000$) |
| `four_wheel_state` | `FourWheelState` | Dataclass (`fl, fr, rl, rr`) | Cumulative wear or wear rate for all 4 corners |
| `as_matrix()` | `np.ndarray` | Shape `(2, 2)` | `[[D_FL, D_FR], [D_RL, D_RR]]` |
| `limiting_wheel` | `str` | `'FL'`, `'FR'`, `'RL'`, `'RR'` | Identifies the critical tyre that triggers the pit stop |
| `max_wear` | `float` | Dimensionless | Peak wear value of the limiting tyre |

---

## 11. Summary: Why This Architecture Is Complete

By combining:
1. **FIA Technical Regulations (Articles 4.1, 4.2 & 6.1.2)** for static weight and fuel burn center-of-gravity migration,
2. **Milliken & Milliken (1995) Chapter 18** for longitudinal pitch load transfer under braking/acceleration,
3. **Milliken & Milliken (1995) Chapter 16** for lateral roll load transfer and suspension roll stiffness ($K_\phi$), and
4. **West & Limebeer (2020)** for 4-corner independent tri-mechanism wear superposition,

TrackShift successfully bridges the gap between **confidential encrypted F1 telemetry** and **physical pit-wall reality**—predicting which tyre will hit the performance cliff first without ever needing secret wheel-hub strain gauges.
