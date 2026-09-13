# Component 05: Thermodynamic & Wear State-Space Core (CMP)

> **Source Location**: [`core_model/code/thermal_wear_model.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/core_model/code/thermal_wear_model.py) & [`src/cmp/`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/cmp/)  
> **Pipeline Position**: Stage 5 (`DIP` -> `PIP` -> `IEP` -> `DEP` -> `CMP` -> `Validation` -> `Console`)  
> **Primary Purpose**: Solve continuous state-space ordinary differential equations (ODEs) for tyre surface and bulk tread temperatures across all four wheels. Incorporates four critical **2024 FIA Technical & Sporting Regulatory mechanics** (70°C blanket thermal deficit, dynamic 44.5%–46.0% mass distribution shift, Lap 2 early DRS wake sliding, and sticker-tyre scrub states) to model non-linear thermal grip decay.

---

## 1. Engineering Motivation & Problem Statement

Tyre degradation in Formula 1 is fundamentally driven by **thermodynamics**:
1. **Flash Surface Temperature vs Bulk Carcass Temperature**: The contact patch surface heats up in fractions of a second during cornering or lockups ($T_{\text{surf}}$ spikes by 30°C in 200 ms). However, the internal carcass ($T_{\text{bulk}}$) has a larger thermal inertia, taking multiple laps to heat up or cool down.
2. **The Thermal Grip Bell Curve**: A Pirelli tyre does not provide constant friction. Its coefficient of grip $\mu(T)$ follows an asymmetric bell curve:
   - Below 90°C (Cold): Polymer is glassy; micro-interlocking is weak; car slides.
   - 100°C–110°C (Optimal Window): Viscoelastic hysteresis peaks; maximum mechanical grip.
   - Above 125°C (Overheating): Polymer melts; rubber shears off into "marbles"; grip falls off a cliff.
3. **2024 Regulatory Disruptions**:
   - FIA capped tyre blanket temperatures to 70°C (from 100°C previously).
   - FIA moved DRS activation forward to **Lap 2** (from Lap 3), creating early aerodynamic wake overheating in traffic.

The **Core Model (CMP)** models these physical and regulatory dynamics using continuous first-principles ODEs.

---

## 2. Component Architecture: Dual-Layer Thermodynamic Engine

```text
                        DUAL-LAYER THERMAL STATE-SPACE
                        
          [Frictional Power: Q_frict = mu * F_z * v_slip]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Surface Layer: T_surf │  (Fast Dynamics: ~0.1 s)
                     │ - Flash heating       │
                     │ - Thermal radiation   │
                     └───────────┬───────────┘
                                 │
              Q_cond (Conduction through tread thickness)
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Bulk Carcass: T_bulk  │  (Slow Dynamics: ~5.0 s)
                     │ - Deep thermal mass   │
                     │ - Heat loss to wheel  │
                     └───────────┬───────────┘
                                 │
                                 ▼
          [Combined Grip Coefficient: mu(T_surf, T_bulk)]
                                 │
                                 ▼
         [Instantaneous Wear Rate & Lap Pace Degradation]
```

---

## 3. Governing Differential Equations

### 1. The Dual-Layer Thermal ODE System
```text
Surface Temperature Differential Equation:
    dT_surf / dt = ( Q_frict - Q_cond - Q_conv,surf - Q_rad ) / C_surf

Bulk Carcass Temperature Differential Equation:
    dT_bulk / dt = ( Q_cond - Q_conv,bulk - Q_rim ) / C_bulk
```

### 2. Thermal Energy Transfer Terms
```text
1. Frictional Heat Generation (Contact Patch):
    Q_frict = mu_apparent * F_z * |v_slip|
    
2. Conductive Heat Transfer (Surface to Bulk):
    Q_cond = (k_rubber * A_contact / Delta_x_tread) * (T_surf - T_bulk)
    
3. Convective Cooling (Chassis Velocity Airflow):
    Q_conv,surf = h_conv(v) * A_surf * (T_surf - T_ambient)
    Where: h_conv(v) = h_0 + h_1 * (v / 3.6)^0.8
    
4. Radiative Cooling (Stefan-Boltzmann Law):
    Q_rad = epsilon_rubber * sigma_SB * A_surf * ( (T_surf + 273.15)^4 - (T_ambient + 273.15)^4 )
    Where: sigma_SB = 5.67037e-8 W/(m^2 K^4), epsilon_rubber = 0.92
    
5. Conductive Dissipation to Wheel Rim:
    Q_rim = (k_rim * A_bead) * (T_bulk - T_rim)
```
- **Physical Intuition**: The surface acts like a fast frying pan: it boils during heavy braking and cools rapidly on straights. The bulk carcass acts like a heavy oven: once it overheats, the tyre remains greasy for multiple corners.
- **Academic Source**: Tremlett & Ebbott (2021), *A Transient Tyre Thermal Model for Motorsport Applications*; Radt & Pacejka (1989).

---

### 3. Asymmetric Temperature-Grip Curve $\mu(T)$
```text
Equation:
    mu(T) = mu_max * exp( - ( (T_surf - T_opt) / (w_temp * (1.0 + alpha_asym * sgn(T_surf - T_opt))) )^2 )
    
Parameters by Compound:
    Compound | T_opt (°C) | Operating Window | mu_max (Base Grip)
    ----------------------------------------------------------
    SOFT     |   100.0    |  90°C - 110°C    |      1.35
    MEDIUM   |   108.0    |  95°C - 120°C    |      1.22
    HARD     |   115.0    | 105°C - 130°C    |      1.10
```
- **Physical Intuition**: If surface temperature drops below `T_opt`, rubber hardens and loses micro-adhesion. If it exceeds `T_opt`, the polymer matrix exceeds its glass transition threshold and loses structural stiffness.

---

## 4. The Four 2024 FIA Regulatory Physics Features

### Feature 1: 70°C Tyre Blanket Thermal Deficit
- **Regulatory Rule**: 2024 FIA Technical Regulations Article 10.8.4.d caps tyre blanket heating to **70°C** (down from 100°C in previous eras). Furthermore, Sporting Regulations Article 44.4.b requires blankets to be disconnected 5 minutes before the formation lap on the grid.
- **Physics Effect**: Tyres cool during the 5-minute unplugged window to ~58°C–62°C. On pit-exit (or race start), tyres enter the track 30°C below their optimal operating window ($T_{\text{opt}} \approx 100^\circ\text{C}$).
- **State Initialization**:
```text
    T_surf,0 = 62.0 °C
    T_bulk,0 = 65.0 °C
    Delta_grip_exit = mu(62.0) / mu(100.0) ≈ 0.82 (-18% grip on out-lap)
```

---

### Feature 2: Dynamic 44.5%–46.0% Front Mass Distribution Shift
- **Regulatory Rule**: FIA Technical Regulations Article 4.1 mandates minimum total car mass of **798.0 kg**. Article 4.2 strictly limits mass distribution:
```text
    Front Axle Mass Proportion: 44.5% <= w_front <= 46.0%
```
- **The Fuel Shift**: Article 6.1.2 requires the fuel cell to be mounted behind the driver cockpit (between driver and engine), aft of the center of gravity.
- **Physics Formulation**:
```text
    m_total(lap) = m_dry (798 kg) + m_fuel(lap)
    
    Center of Gravity Shift:
    w_front(lap) = w_front,init + (m_fuel,init - m_fuel(lap)) * (x_fuel - x_cg) / (m_total(lap) * L_wheelbase)
```
As fuel burns off, the rear of the car lightens faster than the front. Front axle mass proportion shifts from **44.8% at race start to 45.9% at race finish**. This increases front tyre normal load relative to the rears, accelerating front tyre degradation late in the Grand Prix.

---

### Feature 3: Lap 2 Early DRS Wake Sliding & Thermal Runaway
- **Regulatory Rule**: 2024 FIA Sporting Regulations Article 22.1.c.i moved DRS activation forward to **Lap 2** (previously Lap 4, then Lap 3).
- **Physics Effect**: Running 0.8 seconds behind a leading car on Lap 2 strips away 35% of aerodynamic downforce (`C_L_A` drops). To maintain cornering speeds, tyres must operate at higher slip angles $\alpha_{\text{slip}}$.
- **Formulation**:
```text
    F_z,aero,wake = F_z,aero * (1.0 - Delta_downforce_wake(gap))
    alpha_slip,wake = alpha_slip,clean / (1.0 - Delta_downforce_wake(gap))
    Q_frict,wake = mu * F_z * (v * sin(alpha_slip,wake))  --> Generates 25% more heat
```
The tyre enters thermal runaway 3 laps earlier than in clean air.

---

### Feature 4: Sticker Tyre Mold-Release Scrub State
- **Regulatory Rule**: FIA Sporting Regulations Article 30.2 and 30.4 govern tyre set allocations.
- **Physics Effect**: Brand-new ("sticker") tyres have a thin layer of chemical mold-release lubricant from the factory curing press.
- **Formulation**:
```text
    mu_effective(lap_in_stint) = mu_base * (1.0 - 0.12 * exp(-lap_in_stint / 1.2))
```
On Lap 1, available grip is penalized by 12%. By Lap 2, the chemical coating has burned off, restoring 100% nominal compound friction.

---

## 5. Data In / Data Out Specification

### Data In (Inputs to Core Model)

| Parameter | Type | Physical Units | Description |
| :--- | :--- | :--- | :--- |
| `stint_length` | `int` | laps | Projected or actual stint duration |
| `compound` | `str` | `"SOFT"`, `"MEDIUM"`, `"HARD"` | Selected Pirelli compound |
| `track_temp_c` | `float` | °C | Road surface temperature |
| `air_temp_c` | `float` | °C | Ambient dry-bulb air temperature |
| `initial_fuel_kg` | `float` | kg | Starting fuel load (e.g. 105 kg) |
| `enable_2024_blanket_deficit` | `bool` | boolean | Enables 70°C exit cap |
| `enable_2024_mass_distribution` | `bool` | boolean | Enables dynamic 44.5%–46.0% CG shift |
| `enable_2024_drs_lap2_wake` | `bool` | boolean | Enables Lap 2 wake thermal sliding |
| `enable_2024_tyre_scrub_state` | `bool` | boolean | Enables sticker mold-release decay |

---

### Data Out (Outputs from Core Model)

The simulator returns a continuous state-space trajectory dictionary:

```python
{
    "simulated_laps": List[int],           # [1, 2, ..., N]
    "predicted_pace_s": List[float],       # Lap times with thermal & wear effects
    "surface_temp_fl_c": List[float],      # FL surface temperature history (°C)
    "surface_temp_fr_c": List[float],      # FR surface temperature history (°C)
    "bulk_temp_fl_c": List[float],         # FL bulk carcass temperature (°C)
    "bulk_temp_fr_c": List[float],         # FR bulk carcass temperature (°C)
    "remaining_tread_fl_pct": List[float], # FL remaining tread % (100.0 -> 0.0)
    "grip_multiplier_fl": List[float],     # FL instantaneous grip factor mu/mu_0
    "cliff_lap_predicted": float,          # Predicted thermal/wear cliff lap
    "limiting_axle": str                   # "FRONT_LEFT" (governing tyre)
}
```
