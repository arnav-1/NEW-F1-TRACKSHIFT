# TrackShift: End-to-End Component Architecture & Documentation Index

Welcome to the **TrackShift Component Documentation Suite**. This directory contains the complete, sequential engineering blueprints for every component in the TrackShift Formula 1 Tyre Degradation and Thermodynamic Modelling Platform.

Every document in this folder is structured for maximum engineering rigor and practical motorsport intuition:
- **Zero unrendered LaTeX**: All mathematical equations are formatted in monospaced text blocks (` ```text `) with explicit variable definitions.
- **Strict Data In / Data Out Contracts**: Every component specifies the exact input schemas, filtering criteria, and output dataclasses.
- **Mathematical & Regulatory Provenance**: Every equation links to its primary academic literature source (Milliken, Pacejka, Radt, Tremlett) or the official **2024 FIA Technical & Sporting Regulations**.

---

## 1. End-to-End System Pipeline Flow

```text
                                  TRACKSHIFT PIPELINE ARCHITECTURE
                                  
  [FastF1 API]        [OpenF1 API]        [Open-Meteo API]
       │                   │                     │
       └─────────┬─────────┴─────────────────────┘
                 ▼
    ┌─────────────────────────┐
    │   01. DIP INGESTION     │  Raw telemetry, weather, laps, and stint markers
    └────────────┬────────────┘
                 ▼
    ┌─────────────────────────┐
    │   02. PIP PREPROCESSING │  7 Motorsport Filters: pit-lane, SC/VSC, accuracy,
    └────────────┬────────────┘  track limits, scrub warm-up, pace outliers, stint length
                 ▼
    ┌─────────────────────────┐
    │   03. IEP PHYSICS       │  Physics Proxies: fuel burn, track evolution,
    └────────────┬────────────┘  curvature energy, braking stress, slip velocity
                 ▼
    ┌─────────────────────────┐
    │   04. DEP DEGRADATION   │  Tri-mechanism wear decomposition, 4-wheel loads,
    └────────────┬────────────┘  polynomial degradation curves, cliff detection
                 ▼
    ┌─────────────────────────┐
    │   05. CORE MODEL (CMP)  │  Dual-layer thermodynamics (tread/surface), Arrhenius
    └────────────┬────────────┘  kinetics, 2024 FIA regulation dynamics (blanket/mass)
                 ▼
    ┌─────────────────────────┐
    │   06. POST-RACE SUITE   │  10-Pillar Scientific Validation: prediction intervals,
    └────────────┬────────────┘  8-class failure taxonomy, sensitivity, ODD bounds
                 ▼
    ┌─────────────────────────┐
    │   07. DATA EXPORT & UI  │  JSON serialization schema, FastAPI backend,
    └─────────────────────────┘  React 19 / Vite / Tailwind Pit-Wall Telemetry Console
```

---

## 2. Master Component Catalog

| File | Component Name | Primary Role | Key Source Files |
| :--- | :--- | :--- | :--- |
| [**01_DIP_DATA_INGESTION.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/01_DIP_DATA_INGESTION.md) | **DIP** (Data Ingestion Pipeline) | Ingests timing, telemetry, and weather across 3 APIs; caches Parquet locally. | `src/dip/ingestion.py` |
| [**02_PIP_DATA_PREPROCESSING.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/02_PIP_DATA_PREPROCESSING.md) | **PIP** (Data Preprocessing Pipeline) | Enforces 7 domain filters to isolate true racing pace from operational noise. | `src/pip/preprocessing.py` |
| [**03_IEP_PHYSICS_PROXIES.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/03_IEP_PHYSICS_PROXIES.md) | **IEP** (Information Extraction) | Decouples fuel burn and track evolution; extracts curvature and braking energies. | `src/iep/physics_proxies.py` |
| [**04_DEP_DEGRADATION_ESTIMATION.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/04_DEP_DEGRADATION_ESTIMATION.md) | **DEP** (Degradation Estimation) | Fits multi-stint polynomial wear curves, calculates 4-wheel loads, detects cliffs. | `src/dep/degradation.py` |
| [**05_CORE_MODEL_THERMODYNAMICS.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/05_CORE_MODEL_THERMODYNAMICS.md) | **CMP / Core Model** (Thermodynamics) | State-space thermal ODEs, flash heat, 70°C blanket deficit, dynamic mass shift. | `core_model/code/thermal_wear_model.py` |
| [**06_POST_RACE_VALIDATION_SUITE.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/06_POST_RACE_VALIDATION_SUITE.md) | **Validation Suite** (Post-Race) | 10-Pillar mature validation: intervals, sensitivity, 8-class taxonomy, pit window error. | `post_race_validation/code/post_race_validator.py` |
| [**07_DATA_EXPORT_API_AND_CONSOLE.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/07_DATA_EXPORT_API_AND_CONSOLE.md) | **Export & Console** (Frontend UI) | JSON telemetry serialization, React pit-wall console with 4 interactive dashboards. | `src/export_frontend_data.py`, `frontend/` |
| [**08_FOUR_WHEEL_MODELING.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/08_FOUR_WHEEL_MODELING.md) | **4-Wheel Dynamics Deep Dive** | Milliken weight transfer, yaw moment, banking, and contact patch asymmetry. | `src/dep/degradation.py`, `core_model/` |
| [**09_CONFIDENCE_STRATEGY_OPTIMIZATION.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/09_CONFIDENCE_STRATEGY_OPTIMIZATION.md) | **Decision Strategy Deep Dive** | Confidence scoring, undercut/overcut windows, Monte Carlo stint optimizer. | `src/cmp/comparison.py`, `post_race_validation/` |
| [**10_ALL_FORMULAS_MASTER_CATALOG.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/10_ALL_FORMULAS_MASTER_CATALOG.md) | **All 49 Formulas Catalog** | Comprehensive equations catalog with full provenance and academic citations. | `docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md` |
| [**11_LIVE_ODE_MODELING_AND_DEP_EXPANSION.md**](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/components/11_LIVE_ODE_MODELING_AND_DEP_EXPANSION.md) | **Live ODE & DEP Expansion** | State-space sub-stepped ODE numerical integration, tri-mechanism wear accumulation, and live race execution code map. | `core_model/code/thermal_wear_model.py`, `src/export_frontend_data.py` |

---

## 3. How to Read Through These Documents

1. **For Race Engineers & Data Scientists**:
   Read sequentially from **01** to **06**, then inspect **11 (Live ODE & DEP Expansion)**. Notice how raw sensor spikes are filtered out in **02**, isolated into physics energies in **03**, fitted into degradation trajectories in **04**, solved in state-space differential equations in **05** and **11**, and scientifically validated against Sunday actuals in **06**.
2. **For Strategists & Team Principals**:
   Focus on **06 (Post-Race Validation)**, **07 (Console UI)**, **09 (Strategy & Optimization)**, and **11 (Live Race Execution)**. These documents define the exact pit window error (MAE in laps), compound ranking accuracy (Spearman rank correlation), and real-time pit call triggers.
3. **For Vehicle Dynamicists & Modelling Specialists**:
   Deep dive into **04 (DEP)**, **05 (Core Model)**, **08 (4-Wheel Dynamics)**, **10 (All Formulas Catalog)**, and **11 (Live ODE & DEP Expansion)** for the exact vehicle dynamics equations (Milliken load transfer, coupled 2-node thermal ODEs, and friction generation).
