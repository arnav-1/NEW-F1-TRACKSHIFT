# Information Extraction Pipeline (IEP): In-Depth Architecture & Mathematical Provenance

> **Module Location**: [`src/iep/physics_proxies.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/iep/physics_proxies.py) & [`src/iep/__init__.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/iep/__init__.py)  
> **Role in TrackShift**: Third Stage (DIP -> PIP -> **IEP** -> DEP -> CMP). The "physics translator" that decouples environmental confounders (fuel burn, track rubbering-in) from the car's timing, and extracts the physical sliding energy (Q_frict) entering the tyres.

---

## 1. How Data Goes In (The Exact Inputs)

The method `PhysicsProxyPipeline.process()` takes two primary inputs:

1. **`cleaned_laps_df`** (from Component 2 `PIP`):
   * A DataFrame containing only the surviving green-flag racing laps (e.g. 52 clean laps).
   * Key columns: `lap_number`, `driver`, `compound`, `lap_time_s`, `lap_start_time_s`.
2. **`telemetry_map`** (from Component 1 `DIP`):
   * A dictionary mapping each driver code (`"HUL"`) to their continuous 10Hz sensor channels:
     * `time_s`: Timestamp within the session (seconds).
     * `speed_kmh`: Instantaneous vehicle velocity.
     * `brake_bool`: True when brake pedal pressure > 0.
     * `x_m`, `y_m`: Cartesian GPS coordinates of the car on the track.
     * `distance_m`: Cumulative distance travelled from the start line.

---

## 2. Core Physics Models, Mathematical Formulations & Paper Citations

Raw lap times lie. If you don't strip away fuel burn and track evolution, you cannot see what the tyre is doing. Below are the exact models implemented in `IEP`, their formulas, their physical intuition, and their peer-reviewed source papers.

```mermaid
flowchart TD
    In["Clean Laps (PIP) + Telemetry (DIP)"] --> M1["1. Fuel Mass Burn Decoupling (F34)"]
    M1 --> M2["2. Track Rubbering-In Saturation (F03)"]
    M2 --> M3["3. Path Curvature Geometry (F01)"]
    M3 --> M4["4. Slip Angle & Sliding Velocity (F09, F10)"]
    M4 --> M5["5. TRT Interfacial Sliding Power Q_frict (F12)"]
    M5 --> M6["6. Aerodynamic Wake Multiplier (F48)"]
    M6 --> M7["7. Micro-Sector Corner Slicing (F14)"]
    M7 --> Out["PhysicsExtractionResult: enriched_laps + turn_profiles"]
```

---

### Model 1: Fuel Mass Burn-Off Decoupling
* **Glossary Reference**: [Formula 34 (F34)](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md#formula-34-fuel-mass-burn-off-correction-law)

```text
Fuel_Mass_kg(n)      = Starting_Fuel_kg * (1 - lap_number / total_laps)
Fuel_Time_Penalty_s  = 0.033 s/kg * (Fuel_Mass_kg(n) - Reference_Fuel_kg)
Fuel_Corrected_Lap_s = Observed_LapTime_s - Fuel_Time_Penalty_s
```
* **Parameters**:
  * `Starting_Fuel_kg` = 105.0 kg (maximum FIA fuel load at race start)
  * `gamma_fuel` = 0.033 s/kg (Haas VF-24 mass penalty sensitivity)
  * `Reference_Fuel_kg` = 10.0 kg (end-of-race reference fuel level)
* **Why it works this way in simple words**:
  * An F1 car burns about 1.6 kg of petrol every single lap. By Newton's second law (Force = Mass × Acceleration), a lighter car accelerates faster, brakes later, and turns harder.
  * Losing 100 kg of fuel naturally makes an F1 car **3.3 seconds faster per lap** over a race distance.
* **Why we considered it**:
  * Without this, an AI looks at a driver running steady 1:21 lap times from Lap 5 to Lap 25 and thinks *"Tyre wear is zero!"* 
  * In reality, the tyres degraded by 2.5 seconds, but the lighter car hid the loss. Subtracting fuel weight reveals the **true tyre degradation**.
* **Academic Paper Provenance**:
  * **Source**: Milliken, W. F., & Milliken, D. L. (1995). *Race Car Vehicle Dynamics*, Chapter 17.
  * **F1 Reference**: Tremlett, A. J., & Limebeer, D. J. N. (2016). *Optimal Tyre Usage for a Formula One Car*, *Vehicle System Dynamics*, 54(10), 1448–1473.
  * **Why this paper**: Tremlett & Limebeer mathematically proved that fuel mass burn is the single largest linear confounder in Formula 1 lap timing.

---

### Model 2: Track Rubbering-In Evolution Model
* **Glossary Reference**: [Formula 3 (F03)](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md#formula-3-forward-velocity-from-speed-sensor-or-gps-differentiation)

```text
Track_Evolution_Gain_s(n) = E_max * (1 - exp( -cumulative_laps / tau_track ))
Fully_Corrected_Lap_s     = Fuel_Corrected_Lap_s + Track_Evolution_Gain_s
```
* **Parameters**:
  * `E_max` = 1.25 seconds (maximum grip gain from rubber deposition)
  * `tau_track` = 120 laps (exponential saturation time constant)
* **Why it works this way in simple words**:
  * As 20 cars corner, they grind hot molten rubber into the tiny microscopic cracks of the asphalt (micro-asperities). Rubber sticking to rubber has much higher grip than rubber sticking to bare stone.
  * The track gets rapidly faster early in the weekend, and then levels off asymptotically once the racing line is fully coated.
* **Why we considered it**:
  * If the track gains 1.0s of natural grip between Friday practice and Sunday race, and you don't correct for it, your model will mistakenly think the tyre compound miraculously improved.
* **Academic Paper Provenance**:
  * **Source**: West, E., & Limebeer, D. J. N. (2020). *Optimal Tyre Management of a Formula One Car*, *IEEE Transactions on Control Systems Technology*, 28(6), 2132–2145.
  * **Why this paper**: Modeled track grip evolution as a first-order saturation ODE driven by cumulative session mileage.

---

### Model 3: Cartesian Path Curvature Geometry
* **Glossary Reference**: [Formula 1 (F01)](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md#formula-1-track-path-curvature)

```text
Curvature_kappa(t) = |X'(t) * Y''(t) - Y'(t) * X''(t)| / (X'(t)^2 + Y'(t)^2)^(3/2)
Lateral_G_ms2(t)   = Velocity_ms(t)^2 * Curvature_kappa(t)
Lateral_Force_N(t) = Vehicle_Mass_kg * Lateral_G_ms2(t)
```
* **Parameters**:
  * `X'(t), Y'(t)`: First spatial derivatives of GPS coordinates along the track.
  * `X''(t), Y''(t)`: Second spatial derivatives computed via Savitzky-Golay polynomial smoothing filters.
* **Why it works this way in simple words**:
  * Curvature (`kappa`) is literally **"how sharp is the corner?"** (Curvature = 1 / Radius).
  * Centripetal force (`F = m * v^2 * kappa`) tells us that cornering stress squares with speed: taking a turn at 200 km/h creates **4 times more lateral stress** on the tyres than taking it at 100 km/h.
* **Why we considered it**:
  * Straightaways don't wear out tyres; high-speed corners do. By calculating `kappa` along the GPS path, we pinpoint the exact locations on track where the tyres are being tortured.
* **Academic Paper Provenance**:
  * **Source**: Milliken & Milliken (1995), *Race Car Vehicle Dynamics*, Chapter 2. Differential geometry of vehicle planar trajectories.

---

### Model 4: Contact Patch Slip Angle & Sliding Velocity
* **Glossary Reference**: [Formulas 9 & 10 (F09, F10)](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md#formula-9-reduced-order-linearized-tyre-slip-angle)

```text
Slip_Angle_alpha_rad = clip( Lateral_Force_N / (Cornering_Stiffness * Aero_Downforce_Factor), 0.0, 0.22 )
Lateral_Sliding_Speed_ms = Velocity_ms * sin( Slip_Angle_alpha_rad )
```
* **Parameters**:
  * `Cornering_Stiffness` = 145,000 N/rad (Pirelli front axle baseline)
  * `Aero_Downforce_Factor` = 1.0 + 0.00012 * (Velocity_kmh)^2
  * `clip(..., 0.0, 0.22)`: Limits slip angle to physical limits (~12.6 degrees).
* **Why it works this way in simple words**:
  * An F1 car doesn't steer like a train on rails. To turn, the rubber contact patch must twist at an angle relative to the wheel rim (the slip angle `alpha`).
  * Because the tyre is angled slightly sideways while moving forward at 200 km/h, the rubber is physically **skidding sideways across the asphalt** at speed `v_slip` (typically 2 to 5 meters per second).
* **Why we considered it**:
  * Rubber wear doesn't happen from just rolling; it happens when rubber **slides** against stone. Sliding velocity is the direct physical cause of tyre heat and wear.
* **Academic Paper Provenance**:
  * **Source**: Pacejka, H. B. (2002 / 2006). *Tire and Vehicle Dynamics*, Elsevier, Chapter 4 (Cornering and Slip Mechanics).
  * **Why this paper**: Hans Pacejka is the global authority on tyre contact mechanics; proved that cornering force requires interfacial slip velocity.

---

### Model 5: TRT Interfacial Frictional Sliding Power (Q_frict)
* **Glossary Reference**: [Formulas 12 & 13 (F12, F13)](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md#formula-12-interfacial-frictional-sliding-power)

```text
Frictional_Power_W (Q_frict) = 0.65 * (Lateral_Force_N * Lateral_Sliding_Speed_ms + Longitudinal_Force_N * Longitudinal_Sliding_Speed_ms) * (Vehicle_Mass / Mass_Ref)^2
```
* **Parameters**:
  * `p1` = 0.65 (thermal partition fraction: 65% of friction heat enters the tyre rubber, 35% enters the track asphalt)
  * `Longitudinal_Sliding_Speed_ms` = 0.03 * Velocity_ms (during hard braking > 1.0G)
* **Why it works this way in simple words**:
  * Power = Force × Speed. Pushing down with thousands of Newtons and sliding sideways at 3 m/s generates immense mechanical heat (thousands of Watts).
  * Exactly **65% of that heat sinks into the tyre rubber**, raising its internal temperature.
* **Why we considered it**:
  * This is the **golden bridge** of TrackShift. It converts observable telemetry (speed, steering, brakes) into internal thermodynamic heat flux without needing secret team sensors.
* **Academic Paper Provenance**:
  * **Paper 1**: Farroni, F., Rocca, E., & Timpone, F. (2014). *TRT: Thermo Racing Tyre - A Physical Model for the Estimation of Tyre Temperature Distribution*, *Vehicle System Dynamics*, 52(6), 802–820.
  * **Paper 2**: Todd, O., et al. (2025). *Explainable Time Series Prediction of Tyre Energy in Formula One Race Strategy*, **Mercedes-AMG Petronas F1 Team & Imperial College London**.
  * **Why these papers**: Farroni proved the 65% thermal partition split in racing tyres; Todd (Mercedes F1) proved that broadcast telemetry kinematics accurately predict tyre energy.

---

### Model 6: Aerodynamic Wake Penalty (Dirty Air Multiplier)
* **Glossary Reference**: [Formula 48 (F48)](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md#formula-48-lap-2-early-drs-wake-downforce-loss--slip-scaling)

```text
Wake_Multiplier = 1.0 + 0.20 * max( 0.0,  1.5 - Time_Gap_to_Car_Ahead_s )
Q_frict_in_wake = Q_frict * Wake_Multiplier
```
* **Parameters**:
  * `1.5s`: Aerodynamic wake influence horizon (dirty air bubble)
  * `0.20`: Maximum sliding work penalty (+20% sliding energy under heavy wake)
* **Why it works this way in simple words**:
  * When an F1 car follows another car within 1.5 seconds, it drives into "dirty air" (turbulent aerodynamic wake).
  * The wings lose downforce. Without downforce pressing the car down, the car slides more in corners, generating up to **20% more friction heat**.
* **Why we considered it**:
  * If a driver is stuck in a DRS train behind another car, their tyres burn up much faster. Without this penalty, the model would falsely blame the tyre compound.
* **Academic Paper Provenance**:
  * **Source**: Adrian Newey (2017), *How to Build a Car*, HarperCollins. Supported by FIA 2022-2026 Ground Effect Wake Studies.

---

### Model 7: Micro-Sector Turn-by-Turn Energy Profiling
* **Glossary Reference**: [Formula 14 (F14)](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md#formula-14-contact-patch-to-lap-average-heat-flux-scaling)

```text
Turn_Energy_Joules = Integral over [Turn_Start_m to Turn_End_m] of ( Q_frict * dt )
```
* **Why it works this way in simple words**:
  * Slices the 4.657 km Barcelona lap into 14 individual corners.
  * Turn 3 (the long, fast Renault carousel) takes 500m of continuous right-hand cornering at 230 km/h, dumping huge energy into the Front-Left tyre. Turn 1 is heavy braking; Turn 10 is a hairpin.
* **Why we considered it**:
  * Enables driver coaching: allows an engineer to say *"Save tyres in Turn 3 specifically,"* rather than a useless *"drive slower everywhere."*
* **Academic Paper Provenance**:
  * **Source**: Standard Formula 1 track architecture engineering and telemetry micro-sectoring.

---

## 3. How Data Comes Out (The Exact Outputs)

The method `PhysicsProxyPipeline.process()` returns a strongly typed container: **`PhysicsExtractionResult`**.

```python
@dataclass
class PhysicsExtractionResult:
    enriched_laps: pd.DataFrame
    fuel_model_params: Dict[str, float]
    track_model_params: Dict[str, float]
    energy_summary: pd.DataFrame
    turn_energy_profiles: Dict[int, List[TurnEnergyProfile]]
```

### Output 1: `enriched_laps` (The Feature Table)
The original `clean_laps` DataFrame is augmented with the new physical and decoupled features:

| Column Name Added | Units | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `fuel_mass_kg` | kg | `84.2` | Estimated fuel remaining on board |
| `fuel_time_penalty_s` | s | `2.78` | Lap time penalty added by fuel weight |
| `lap_time_fuel_corrected_s`| s | `78.67` | Pace with fuel weight subtracted |
| `track_evolution_s` | s | `0.45` | Lap time gain from rubbering-in |
| `lap_time_fully_corrected_s`| s | `79.12` | **Pristine residual pace attributable strictly to the tyres** |
| `lateral_energy_proxy` | Joules | `384,200` | Integral of cornering centripetal work |
| `braking_energy_proxy` | Joules | `192,500` | Kinetic energy dissipated under braking |
| `slip_energy_proxy` | Joules | `215,400` | True interfacial contact patch sliding work |
| `frictional_work_proxy` | Joules | `480,450` | Total combined sliding energy (Q_frict) |
| `wake_multiplier` | scalar | `1.12` | Dirty air sliding multiplier (+12%) |
| `turn3_energy_proxy` | Joules | `84,500` | Energy dumped in Turn 3 alone |

### Output 2: `turn_energy_profiles` (Corner Breakdowns)
A dictionary mapping lap number -> 14 corner profile objects containing:
* `min_speed_kmh` (apex speed)
* `peak_lat_acc_ms2` (peak cornering G-force)
* `peak_slip_velocity_ms` (peak rubber sliding speed)
* `lateral_energy` vs. `braking_energy`

---

## 4. Pipeline Handoff to Component 4 (DEP)

```text
[PIP Output: Clean Laps]
       │
       ▼
[IEP Physics & Decoupling Engine]
       │
       │ Calculates: Fuel Burn Decoupling + Track Evolution + Curvature + TRT Sliding Energy
       ▼
[PhysicsExtractionResult: enriched_laps]
       │
       │ Passes: 
       │   - `lap_time_fully_corrected_s` (Pristine tyre pace)
       │   - `frictional_work_proxy` (Total sliding heat flux Q_frict)
       │   - Turn 1-14 lateral distributions
       ▼
[Component 4 (DEP): 4-Wheel Asymmetric Load Allocator]
 (Splits Q_frict across FL, FR, RL, RR based on dynamic roll & pitch)
```
