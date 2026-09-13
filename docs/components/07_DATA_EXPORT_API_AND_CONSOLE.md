# Component 07: Data Export Engine, API Layer & Pit-Wall Console

> **Source Locations**:  
> - Backend Export Engine: [`src/export_frontend_data.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/export_frontend_data.py)  
> - Frontend Application: [`frontend/src/`](file:///c:/Users/daksh/Projects/Trackshiftv2/frontend/src/) (`App.tsx`, `TelemetryView.tsx`, `ValidationDashboard.tsx`, `GlossaryView.tsx`)  
> **Pipeline Position**: Stage 7 (`DIP` -> `PIP` -> `IEP` -> `DEP` -> `CMP` -> `Validation` -> `Console`)  
> **Primary Purpose**: Execute the complete end-to-end TrackShift pipeline, serialize multidimensional physical states into an optimized JSON data feed, and render a high-performance, real-time Pit-Wall Telemetry Console for race engineers and strategists.

---

## 1. Engineering Motivation & Problem Statement

Even the most sophisticated thermodynamic model is useless if race engineers cannot interpret its conclusions in fractions of a second during a Grand Prix:
1. **Decision Latency Under Pressure**: In a live race, a strategist has roughly 10 to 15 seconds to call an undercut when an opponent enters the pit lane. Complex matrices and Python logs must be synthesized into intuitive visual indicators (e.g., tyre thermal gauges, remaining tread life percentages, and predicted cliff laps).
2. **Bridge Between Deep Science and Human Usability**: The frontend console must bridge the gap between high-frequency physics (10 Hz cornering loads, Arrhenius wear rates) and operational strategy (pit window lap numbers, tyre compound life).
3. **Auditability & Explainability**: When a strategic recommendation is generated, the engineer must be able to inspect the exact formula provenance, 2024 FIA regulatory rule, and sensitivity parameters that generated that recommendation.

The **Data Export Engine and Pit-Wall Console** handle the transformation from raw physics computations to an interactive Formula 1 pit-wall interface.

---

## 2. Component Architecture: Export Engine to Pit-Wall Console

```text
                               CONSOLE ARCHITECTURE FLOW
                               
         [DIP] ──► [PIP] ──► [IEP] ──► [DEP] ──► [CMP] ──► [Post-Race]
                                                               │
                                                               ▼
                                               ┌───────────────────────────────┐
                                               │ src/export_frontend_data.py   │
                                               │ - Aggregates FP1/2/3 & Race   │
                                               │ - Compiles 4-wheel thermals   │
                                               │ - Builds 10-pillar validation │
                                               └───────────────┬───────────────┘
                                                               ▼
                                               ┌───────────────────────────────┐
                                               │ telemetry_export.json         │
                                               │ (Optimized Typed JSON Payload)│
                                               └───────────────┬───────────────┘
                                                               ▼
                       ┌───────────────────────────────────────────────────────┐
                       │ React 19 + TypeScript + Tailwind + Lucide Console UI  │
                       ├───────────────────────────────────────────────────────┤
                       │ Tab 1: Live Race Strategy & 4-Wheel Thermals          │
                       │ Tab 2: Pre-Race Predictions & Stint Degradation       │
                       │ Tab 3: Post-Race Validation & Engineering Diagnostics │
                       │ Tab 4: Technical Glossary & Regulatory Rulebook       │
                       └───────────────────────────────────────────────────────┘
```

---

## 3. The 4 Interactive Dashboard Views

### Tab 1: Live Race Strategy & 4-Wheel Thermals
- **4-Wheel Independent Heatmap**: Real-time visualization of individual tyre surface temperatures ($T_{\text{surf}}$) and bulk carcass temperatures ($T_{\text{bulk}}$) for Left-Front (FL), Right-Front (FR), Left-Rear (RL), and Right-Rear (RR).
- **Remaining Tread Depth Gauges**: Dynamic circular progress indicators showing percentage of usable compound remaining before the sub-tread is exposed.
- **Delta Pace vs Optimal**: Real-time pace loss indicator tracking current lap time degradation against the clean-tyre baseline.
- **Pit Window Target**: Automated recommendation display highlighting the predicted optimal pit stop lap and tyre compound selection for the next stint.

---

### Tab 2: Pre-Race Predictions & Stint Degradation Curves
- **Multi-Compound Comparative Chart**: Interactive line plots comparing Soft (C3), Medium (C2), and Hard (C1) degradation trajectories fitted from practice long runs.
- **Degradation Cliff Forecasts**: Vertical marker flags indicating the exact predicted cliff lap ($L_{\text{cliff}}$) where pace loss exceeds 0.08 s/lap$^2$.
- **Fuel-Decoupled vs Raw Pace Overlay**: Engineering toggle allowing strategists to inspect raw observed lap times versus fuel-corrected pace ($t_{\text{lap,corr}}$).

---

### Tab 3: Post-Race Validation & Engineering Diagnostics
- **The 10-Pillar Validation Report**: Visual summary cards displaying empirical coverage (95% CI check), Pit Window Error ($\text{MAE}_{\text{pit}} \le 1.5\text{ laps}$), and Expected Calibration Error (ECE).
- **Multi-Race Failure Distribution**: Comparative radar and bar charts evaluating model generalization across Barcelona, Spa-Francorchamps, Silverstone, and Bahrain.
- **Automated 8-Class Failure Taxonomy Breakdown**: Pie chart and incident log classifying race lap anomalies into Driver Error, Dirty Air Wake, Weather Shift, or Graining.
- **Four-Tier Baseline Benchmark Comparison**: Side-by-side RMSE metrics comparing Constant Pace, Linear Drift, Compound+Age Statistical, and TrackShift Physical models.

---

### Tab 4: Technical Glossary & Regulatory Rulebook
- **Interactive Formula Catalog**: Searchable directory of all 49 mathematical formulations across all 7 pipeline stages.
- **2024 FIA Regulatory Links**: Direct citations linking each equation to the 2024 FIA Technical Regulations (e.g., Article 4.1 minimum mass, Article 10.8.4.d 70°C blanket cap) and Sporting Regulations (Article 22.1.c.i Lap 2 DRS).
- **Variable Definitions & Units**: Clear, monospaced definitions of all physical variables and empirical constants.

---

## 4. Data In / Data Out Specification

### Data In (Inputs to `export_frontend_data.py`)

| Input Feed | Source Module | Description |
| :--- | :--- | :--- |
| Practice Sessions | `DiskCacheManager` | FP1, FP2, and FP3 timing, telemetry, and weather parquet files |
| Sunday Race Session | `DiskCacheManager` | Sunday Grand Prix timing and telemetry parquet files |
| Calibrated Parameters | `PhysicalThermalWearEngine` | Frozen compound parameters ($\beta_1$, $K_{\text{abr}}$, $T_{\text{opt}}$) |
| Validation Metrics | `PostRaceValidator` | 10-pillar validation results, baseline benchmarks, and failure classifications |

---

### Data Out (Outputs from Export Engine)

Generates the master JSON payload: **`frontend/src/data/telemetry_export.json`**.

```json
{
  "metadata": {
    "circuit": "Circuit de Barcelona-Catalunya",
    "year": 2024,
    "driver": "Nico Hülkenberg",
    "car_number": 27,
    "team": "MoneyGram Haas F1 Team",
    "export_timestamp": "2026-09-13T01:25:22Z"
  },
  "live_race": {
    "current_lap": 66,
    "stints": [
      {
        "stint_number": 1,
        "compound": "SOFT",
        "start_lap": 1,
        "end_lap": 13,
        "laps": [
          {
            "lap_number": 5,
            "lap_time_s": 81.452,
            "delta_pace_s": 0.412,
            "fuel_remaining_kg": 98.6,
            "four_wheel_state": {
              "t_surf_fl_c": 104.2,
              "t_surf_fr_c": 98.5,
              "t_surf_rl_c": 101.8,
              "t_surf_rr_c": 97.1,
              "t_bulk_fl_c": 102.1,
              "t_bulk_fr_c": 96.4,
              "t_bulk_rl_c": 99.5,
              "t_bulk_rr_c": 95.8,
              "tread_fl_pct": 82.4,
              "tread_fr_pct": 89.1,
              "tread_rl_pct": 85.0,
              "tread_rr_pct": 91.2
            }
          }
        ]
      }
    ]
  },
  "pre_race_predictions": {
    "soft_c3": { "beta_1": 0.068, "cliff_lap": 14.2, "optimal_stint_laps": 13 },
    "medium_c2": { "beta_1": 0.042, "cliff_lap": 24.8, "optimal_stint_laps": 23 },
    "hard_c1": { "beta_1": 0.024, "cliff_lap": 36.5, "optimal_stint_laps": 34 }
  },
  "post_race_validation": {
    "mae_lap_time_s": 0.284,
    "rmse_lap_time_s": 0.362,
    "empirical_coverage_95_pct": 92.86,
    "pit_window_error_laps": 1.0,
    "spearman_rank_correlation": 0.941,
    "baseline_comparison": {
      "constant_rmse": 1.452,
      "linear_rmse": 0.612,
      "statistical_rmse": 0.485,
      "trackshift_physical_rmse": 0.362
    }
  }
}
```

---

## 5. Console Technology Stack & Performance

- **Framework**: React 19 with TypeScript, bundled via Vite.
- **Styling & Icons**: Tailwind CSS with custom Formula 1 dark-mode styling (`#0f172a` slate background, Haas red `#e10600`, Pirelli compound accents `#ef4444` Soft, `#eab308` Medium, `#ffffff` Hard), accompanied by Lucide-React iconography.
- **Data Visualization**: Recharts SVG charting engine with responsive containers and custom tooltips.
- **Execution**: Runs in non-daemon mode via `npm run dev` on `http://localhost:5173`.
