# Component 03: Information Extraction Pipeline (IEP)

> **Source Location**: [`src/iep/physics_proxies.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/iep/physics_proxies.py)  
> **Pipeline Position**: Stage 3 (`DIP` -> `PIP` -> `IEP` -> `DEP` -> `CMP` -> `Validation` -> `Console`)  
> **Primary Purpose**: Extract latent physical stresses from non-intrusive broadcast telemetry. Decouples confounding environmental forces (fuel mass burn-off and track rubbering-in) from raw lap times, and calculates mechanical energy integrals (lateral cornering work, longitudinal braking stress, and micro-sliding slip power).

---

## 1. Engineering Motivation & Problem Statement

Raw Formula 1 lap times cannot directly measure tyre degradation because two massive confounding forces act in opposite directions throughout every stint:
1. **Fuel Mass Burn-Off (The Car Gets Faster)**: A modern F1 car starts the race with approximately 105 to 110 kg of fuel. As fuel burns at ~1.6 to 1.8 kg per lap, the car becomes lighter. In vehicle dynamics, a lighter car corners faster, accelerates quicker, and sheds approximately 0.030 to 0.040 seconds per lap purely from mass reduction.
2. **Track Rubbering-In (The Track Gets Faster)**: As 20 cars deposit molten compound onto the asphalt, the micro-roughness fills with rubber, increasing the coefficient of friction and lowering lap times by 0.5 to 1.5 seconds over a weekend.

If a tyre degrades by 0.040 s/lap while fuel burn speeds the car up by 0.035 s/lap, raw lap times appear nearly flat (+0.005 s/lap). The pit wall assumes tyres are lasting forever, until the rubber suddenly falls off a thermal cliff.

The **Information Extraction Pipeline (IEP)** isolates the true mechanical degradation by mathematically removing fuel and track effects, while computing spatial energy integrals across all 14 turns.

---

## 2. Component Architecture & The 6 Physics Proxies

```text
                                 IEP ARCHITECTURE FLOW
                                 
  [Clean Racing Laps from PIP]                 [High-Frequency Telemetry from DIP]
  - lap_time_s, lap_number                     - speed_kmh, brake, throttle, distance_m
         │                                                      │
         ├──────────────────────────────┬───────────────────────┘
         ▼                              ▼
  ┌───────────────────────────┐  ┌───────────────────────────┐
  │ 1. FuelDecayModel         │  │ 3. CurvatureEnergyExtract │
  │    Mass burn correction   │  │    Lateral work integral  │
  └─────────────┬─────────────┘  └─────────────┬─────────────┘
                ▼                              ▼
  ┌───────────────────────────┐  ┌───────────────────────────┐
  │ 2. TrackEvolutionModel    │  │ 4. BrakingStressExtractor │
  │    Rubber saturation      │  │    Deceleration energy    │
  └─────────────┬─────────────┘  └─────────────┬─────────────┘
                ▼                              ▼
  ┌───────────────────────────┐  ┌───────────────────────────┐
  │ 5. SlipVelocityExtractor  │  │ 6. MicroSectorSegmenter   │
  │    Sliding power proxy    │  │    14 Corner entry/exit   │
  └─────────────┬─────────────┘  └─────────────┬─────────────┘
                │                              │
                └──────────────┬───────────────┘
                               ▼
                ┌──────────────────────────────┐
                │ PhysicsProxyDataset          │
                │ - lap_time_corrected_s       │
                │ - E_lat, E_brake, P_slip     │
                │ - Corner-by-corner stress    │
                └──────────────────────────────┘
```

---

## 3. Mathematical Formulations & Engineering Rationale

### Proxy 1: Dynamic Fuel Burn & Mass Correction
```text
Equation:
    m_fuel(lap) = max(0.0, m_fuel,init - beta_burn * (lap - 1))
    delta_t_fuel(lap) = -alpha_fuel * (m_fuel,init - m_fuel(lap))
    
Variables:
    m_fuel,init = 105.0 kg (Starting fuel load, FIA Tech Regs Art 6.1.2)
    beta_burn   = 1.60 kg/lap (Mean fuel mass consumption rate)
    alpha_fuel  = 0.035 s/kg (Fuel time-sensitivity constant at Barcelona)
```
- **Physical Intuition**: Fuel consumption decreases vehicle mass `m`. Lower mass reduces centrifugal demand in corners (`F_c = m * v^2 / R`) and inertia during acceleration (`a = F / m`).
- **Engineering Rationale**: Without correcting for fuel burn, degradation rates are underestimated by 70% to 90%.
- **Academic Source**: Tremlett, A. (2023), *Optimising Race Car Lap Time Sensitivity to Mass and Power*; FIA Technical Regulations Article 6.1.2.

---

### Proxy 2: Track Evolution & Rubbering-in Model
```text
Equation:
    delta_t_track(N_cum) = -Delta_track,max * (1.0 - exp(-N_cum / tau_track))
    
Variables:
    N_cum           = Total cumulative field laps completed on circuit
    Delta_track,max = 1.20 s (Maximum asymptotic grip improvement)
    tau_track       = 450.0 laps (Exponential rubbering characteristic scale)
```
- **Physical Intuition**: Rubber is transferred from tyres into the microscopic asperities of the tarmac. The friction coefficient `mu` increases non-linearly, saturating asymptotically once a continuous rubber film forms.
- **Engineering Rationale**: FP1 times cannot be directly compared to FP3 or Qualifying without normalizing for track evolution.
- **Academic Source**: Bekker, D. (2021), *Grip Evolution and Track Micro-Texture Modeling in Motorsport*.

---

### Proxy 3: Curvature Energy Integral (Lateral Cornering Stress)
```text
Equation:
    E_lat = Integral ( (v(s) / 3.6)^2 * |kappa(s)| ) ds  [from s=0 to s=S_circuit]
    
Discrete Approximation:
    E_lat = Sum_{i} ( (v_i / 3.6)^2 * |kappa_i| * Delta_s_i )
    
Variables:
    v(s)     = Chassis speed along track centerline (km/h)
    kappa(s) = Track curvature at distance s (1/m, where kappa = 1/R)
    Delta_s  = Spatial displacement step between telemetry samples (m)
```
- **Physical Intuition**: Centripetal acceleration is `a_lat = v^2 / R = v^2 * kappa`. Integrating lateral force over distance gives the total mechanical work performed by the tyre tread contact patches against the road.
- **Engineering Rationale**: Tracks with long, high-speed lateral loads (e.g., Turns 3 and 9 at Barcelona, Copse/Maggotts/Becketts at Silverstone) generate massive shear strain that accelerates adhesive wear.
- **Academic Source**: Milliken & Milliken (1995), *Race Car Vehicle Dynamics*, Chapter 6.

---

### Proxy 4: Longitudinal Braking Stress
```text
Equation:
    E_brake = Integral ( |a_long^-(t)| * (v(t) / 3.6) ) dt  [over all braking points]
    
Where:
    a_long^-(t) = min(0.0, d(v/3.6)/dt)  when brake > 0
```
- **Physical Intuition**: When the brake pedal is depressed, kinetic energy is dissipated through the brake discs and into the tyre contact patch. This creates high longitudinal shear and rapid carcass heating.
- **Engineering Rationale**: Tracks with heavy braking zones (e.g., Monza Turn 1, Bahrain Turn 1) demand separate tracking of longitudinal vs lateral stress.
- **Academic Source**: Radt & Pacejka (1989), *Tyre Shear Forces in Combined Braking and Cornering*.

---

### Proxy 5: Slip Velocity & Micro-Sliding Power Proxy
```text
Equation:
    P_slip(t) = F_normal(t) * mu_apparent * |v_slip(t)|
    
Proxy Formulation:
    P_slip,proxy = Sum ( (a_lat(t)^2 + a_long(t)^2)^0.5 * (v(t) / 3.6) * (1.0 - throttle/100) )
```
- **Physical Intuition**: Tyres do not grip road asperities statically; they transmit force through microscopic slip velocity (`v_slip = omega * r - v`). The product of friction force and slip velocity equals friction heating power (`Watts`), which directly wears the rubber.
- **Engineering Rationale**: Directly captures driver aggression, over-driving, and wheel spin on corner exits.
- **Academic Source**: Grosch, K. A. (1963), *The Relation between the Friction and Abrasion of Rubber*.

---

### Proxy 6: Micro-Sector Corner Profiling (Barcelona 14 Turns)
IEP automatically breaks down high-frequency telemetry into 14 discrete corner complexes for the Circuit de Barcelona-Catalunya:
- **Turn 1/2 Complex (Elf)**: Heavy braking from 325 km/h, combined lateral transfer.
- **Turn 3 (Renault)**: 240 km/h long right-hander that generates peak left-front tyre thermal loads.
- **Turn 9 (Campsa)**: Blind uphill right-hander with extreme lateral G.
- **Turn 10 (La Caixa)**: Hard deceleration into tight hairpin.

Each corner records: `v_entry`, `v_apex`, `v_exit`, `peak_g_lat`, `peak_g_long`, and energy dissipation `E_corner`.

---

## 4. Data In / Data Out Specification

### Data In (Inputs to IEP)

| Input Object | Origin | Schema Elements | Description |
| :--- | :--- | :--- | :--- |
| `clean_laps` | Component 02 (PIP) | `lap_number`, `lap_time_s`, `tyre_life`, `compound` | Laps that passed all 7 filters |
| `telemetry` | Component 01 (DIP) | `speed_kmh`, `brake`, `throttle`, `distance_m`, `time_s` | 10 Hz chassis sensor channels |
| `circuit_name` | Configuration | string (`"Barcelona"`) | Selects corner coordinate maps |

---

### Data Out (Outputs from IEP)

The method `PhysicsProxyPipeline.process(clean_laps, telemetry)` returns a **`PhysicsProxyDataset`**:

```python
@dataclass
class PhysicsProxyDataset:
    processed_laps: pd.DataFrame
    corner_metrics: Dict[int, pd.DataFrame]
    session_summary: Dict[str, float]
```

#### Columns Added to `processed_laps`:
| Column Name | Type | Physical Units | Description |
| :--- | :--- | :--- | :--- |
| `fuel_mass_remaining_kg` | `float` | kg | Calculated fuel remaining in tank |
| `fuel_time_correction_s` | `float` | seconds | Time gained from fuel burn (`-alpha * Delta_m`) |
| `track_evolution_correction_s` | `float` | seconds | Time gained from rubbering-in |
| `lap_time_corrected_s` | `float` | seconds | **Pristine tyre pace**: `lap_time_s - delta_t_fuel - delta_t_track` |
| `lateral_energy_j` | `float` | J/kg or proxy | Integrated lateral cornering work `E_lat` |
| `braking_stress_j` | `float` | J/kg or proxy | Integrated longitudinal braking work `E_brake` |
| `slip_power_w` | `float` | Watts proxy | Integrated contact-patch sliding work |

---

## 5. Pipeline Handoff to DEP

```text
[Clean Laps from PIP] + [Chassis Telemetry from DIP]
                        │
                        ▼
           [IEP Physics Proxy Engine]
                        │
                        ▼
          Decouple Fuel (-0.035 s/kg)
          Decouple Rubber (-0.002 s/lap)
          Compute E_lat, E_brake, P_slip
                        │
                        ▼
       [Output: PhysicsProxyDataset]
       - lap_time_corrected_s (Pure tyre degradation)
       - Physical strain proxies per corner
                        │
                        ▼
         [Component 04 (DEP): Degradation Fitting]
```
