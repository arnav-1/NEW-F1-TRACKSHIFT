# Component 08: Four-Wheel Dynamics & Asymmetric Load Modeling

> **Document Status**: Complete Engineering Blueprint & Vehicle Dynamics Derivation  
> **Source Modules**: [`src/dep/degradation.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/dep/degradation.py) (`AsymmetricLoadAllocator`, `FourWheelState`), [`core_model/code/thermal_wear_model.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/core_model/code/thermal_wear_model.py)  
> **Related Formulas**: Formula 6 (Normal Load), Formula 7 (Lateral Weight Transfer), Formula 8 (Frictional Energy), Formula 47 (Dynamic Weight Distribution)  
> **Primary Purpose**: Reconstruct independent normal loads ($F_z$), frictional energy dissipation ($Q$), surface/bulk temperatures ($T$), and wear rates ($w$) for all four individual wheel positions (`FL`, `FR`, `RL`, `RR`) from single-stream whole-car telemetry.

---

## 1. Engineering Motivation: Why Whole-Car Averages Fail

In Formula 1, **teams never pit because the "average" tyre is worn out**. A pit stop is triggered the moment the **single most stressed tyre** (the "limiting tyre") falls off its performance cliff.

### The Telemetry Barrier
In public timing and telemetry feeds (FastF1, OpenF1):
- We receive **only whole-car telemetry**: vehicle speed $v(t)$, throttle pedal %, braking line pressure, gear, engine RPM, GPS coordinates $(X, Y, Z)$, and chassis accelerations ($a_{\text{lat}}, a_{\text{long}}$).
- F1 teams keep their **individual wheel-hub strain gauges** (measuring $F_z$ per corner), **internal tyre pressure telemetry**, and **multi-zone thermal infrared cameras** (measuring 8 temperature zones across each tyre face) strictly confidential and encrypted.

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

If a tyre model simply assumes that all 4 tyres experience 25% of the total workload, it fails catastrophically:
- At **Circuit de Barcelona-Catalunya** (65% right-hand turns), the **Front-Left (FL)** tyre sustains massive lateral cornering forces through Turn 3 and Turn 9, wearing out **more than twice as fast** as the Front-Right tyre.
- At **Bahrain**, traction-limited exits onto long straights brutally overwork the **Rear tyres (RL & RR)**, causing rear thermal blistering while front tyres remain healthy.

To predict pit stops with sub-lap precision, TrackShift reconstructs the physical state of **all 4 wheels independently**.

---

## 2. Mathematical Architecture: The 4-Step Decomposition

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

## 3. Step-by-Step Mathematical Formulations

### Step 1: Base Static Weight Distribution & Fuel Mass Migration
```text
Total Vehicle Mass:
    m_total(lap) = m_dry + m_fuel(lap)
    Where: m_dry >= 798.0 kg (FIA Tech Regs Art 4.1)
           m_fuel(lap) = max(0.0, m_fuel,init - beta_burn * (lap - 1))

Center of Gravity (CG) Position:
    x_cg(lap) = ( m_dry * x_cg,dry + m_fuel(lap) * x_fuel ) / m_total(lap)

Dynamic Front Axle Weight Proportion:
    w_front(lap) = 1.0 - ( x_cg(lap) / L_wheelbase )
```
- **Regulatory Reality**: Under FIA Technical Regulations Article 4.2, dry front axle mass distribution must lie strictly between **44.5% and 46.0%**. The fuel tank is located behind the monocoque (aft of the dry CG). As fuel burns off, the rear axle lightens, shifting weight forward by ~1.2% over a Grand Prix.

---

### Step 2: Longitudinal Pitch Load Transfer (Braking & Acceleration)
```text
Aerodynamic Downforce:
    F_z,aero = 0.5 * rho_air * C_L_A * (v / 3.6)^2
    
Axle Static + Aero Normal Loads:
    F_z,front,stat = m_total * g * w_front(lap) + F_z,aero * a_front_aero
    F_z,rear,stat  = m_total * g * (1.0 - w_front(lap)) + F_z,aero * (1.0 - a_front_aero)

Longitudinal Weight Transfer:
    Delta_F_z,long = (m_total * a_long * h_cg) / L_wheelbase
```
- **During Heavy Braking** ($a_{\text{long}} = -4.5\text{ G}$ into Turn 1): $\Delta F_{z,\text{long}}$ shifts over 8,000 N of normal force from the rear axle to the front axle.
- **During Traction Acceleration** ($a_{\text{long}} = +1.5\text{ G}$ out of Turn 10): $\Delta F_{z,\text{long}}$ shifts load to the rear tyres.

---

### Step 3: Lateral Roll Load Transfer (Cornering)
```text
Total Lateral Load Transfer:
    Delta_F_z,lat,total = (m_total * a_lat * h_cg) / t_track

Front Axle Lateral Transfer:
    Delta_F_z,lat,front = ( K_phi,front / K_phi,total ) * Delta_F_z,lat,total

Rear Axle Lateral Transfer:
    Delta_F_z,lat,rear  = ( K_phi,rear  / K_phi,total ) * Delta_F_z,lat,total
```
- **Roll Stiffness Distribution**: The mechanical anti-roll bars (ARBs) and suspension springs split lateral transfer:
  - $K_{\phi,\text{front}} / K_{\phi,\text{total}} \approx 0.54$ (Front suspension is stiffer in roll to promote understeer stability).
  - $K_{\phi,\text{rear}} / K_{\phi,\text{total}} \approx 0.46$.

---

### Step 4: Final 4-Wheel Normal Force Synthesis
```text
Left-Front Normal Load:
    F_z,FL = 0.5 * F_z,front,stat - 0.5 * Delta_F_z,long - Delta_F_z,lat,front

Right-Front Normal Load:
    F_z,FR = 0.5 * F_z,front,stat - 0.5 * Delta_F_z,long + Delta_F_z,lat,front

Left-Rear Normal Load:
    F_z,RL = 0.5 * F_z,rear,stat  + 0.5 * Delta_F_z,long - Delta_F_z,lat,rear

Right-Rear Normal Load:
    F_z,RR = 0.5 * F_z,rear,stat  + 0.5 * Delta_F_z,long + Delta_F_z,lat,rear
```

---

## 4. Frictional Energy Dissipation & 4-Wheel Temperatures

Each corner's instantaneous frictional heat generation is governed by its individual normal force:
```text
Contact Patch Workload:
    Q_frict,i = mu_apparent,i * F_z,i * |v_slip,i|
```
- **Barcelona Turn 3 Example (240 km/h Right-Hander, 3.8 G Lateral)**:
  - Left-Front (`FL`): Outside heavily loaded tyre. $F_{z,\text{FL}} \approx 8,450\text{ N}$. $Q_{\text{frict,FL}} \approx 42\text{ kW}$.
  - Right-Front (`FR`): Inside unloaded tyre. $F_{z,\text{FR}} \approx 2,150\text{ N}$. $Q_{\text{frict,FR}} \approx 8\text{ kW}$.
  - Result: `FL` surface temperature spikes to 125°C (overheating), while `FR` cools to 92°C.

This 5:1 energy disparity explains why Nico Hülkenberg's left-front tyre hit the degradation cliff 8 laps before the right-front tyre at the 2024 Spanish GP.

---

## 5. Limiting Tyre Identification & Strategy Trigger

TrackShift monitors all 4 corners and identifies the **governing tyre** on every lap:
```text
Limiting Tyre Condition:
    Limiting_Tyre = argmin_{i in {FL, FR, RL, RR}} ( Remaining_Tread_pct_i )
    
Pit Stop Trigger:
    Call Pit Stop WHEN:
        Remaining_Tread_pct(Limiting_Tyre) <= 15.0%
        OR
        T_bulk(Limiting_Tyre) >= T_crit_overheat
```
Instead of reacting when the whole car slows down, TrackShift warns the pit wall when the limiting tyre enters critical thermal runaway.
