# TrackShift Deterministic Tyre-Degradation Backend Architecture

## 1. Executive Summary & Design Principles
The TrackShift tyre-degradation intelligence backend is an enterprise-grade, deterministic, physics-informed computational system for Formula 1 pit-wall strategy, continuous practice calibration, real-time telemetry observation, and rigorous post-race scientific validation.

### Strict Non-Negotiable Constraints:
1. **Strict Determinism**: Zero Monte Carlo simulations, zero stochastic random sampling, zero Bayesian MCMC posterior sampling, zero neural-network black boxes. All methods use deterministic Weighted Ordinary Least Squares (WOLS), analytical derivatives, and numerical forward integration of coupled thermodynamic/damage ODEs.
2. **Strict Scientific Provenance**: Every mathematical equation is classified into a strict hierarchy (TIER 1 First Principles, TIER 2 Published Literature, TIER 3A Engineering Approximation, TIER 3B Empirical/Calibration Choice, DIAGNOSTIC, MATHEMATICAL TRANSFORMATION). TrackShift approximations are never disguised as fundamental physical laws.
3. **Strict Parameter Freeze Before Sunday**: Practice parameters (FP1, FP2, FP3) are fused and frozen into `data/frozen_practice_calibrations.json` before Sunday race start. Sunday race observations are never used to alter the frozen pre-race forecast.
4. **Complete Fuel & Confounder Decoupling**: Fuel burn ($\Delta t_{\text{fuel}} = -\beta_{\text{fuel}} \Delta m_{\text{fuel}}$ with $\beta_{\text{fuel}} = 0.033\text{ s/kg}$ Tier 3B prior) is decoupled at the observation layer, completely isolated from internal tyre damage states.
5. **Permanent Elimination of Circular Features**:
   - `track_rubber_evolution`: permanently removed and absorbed into unmodelled residual $\varepsilon(k)$.
   - `driver_push_level`: permanently removed (never derived from lap-time residuals).
   - `grip_drop_ratio`: excluded as a duplicate regression feature.

---

## 2. End-to-End System Architecture

```text
[Historical Races 1-6] -> [Historical Baseline Prior]
                                   |
                                   v
             [Spain FP1] -> [Session Quality W_1 = W_nom * Q_1]
                                   |
                                   v
             [Spain FP2] -> [Session Quality W_2 = W_nom * Q_2] (Dominant: 70%)
                                   |
                                   v
             [Spain FP3] -> [Session Quality W_3 = W_nom * Q_3]
                                   |
                                   v
                   [Deterministic Parameter Fusion]
                                   |
                                   v
              [PARAMETER FREEZE: data/frozen_practice_calibrations.json]
                                   |
            +----------------------+----------------------+
            |                                             |
            v                                             v
[Pre-Race Forward Simulation]                 [Live Sunday Race Observer]
  - Thermal ODEs: T_tread, T_carc               - Ingests Live Telemetry Lap-by-Lap
  - Tri-Mechanism Wear: w_p, w_g, w_b           - Decouples Fuel & Dirty-Air Wake
  - Damage Integral: D(t)                       - Tracks Live T_tread, T_carc, D(k)
  - Frictional Grip Capacity: mu_eff            - Recommends Action Code (0/1/2)
  - Predicted Pace Loss: Delta t_tyre           - PRE_RACE_FROZEN_STATE IS IMMUTABLE
            |
            v
[Deterministic Strategy Optimizer]
  - Minimizes Race Time J
  - Solves Compound Sequence & Pit Laps
  - Enforces FIA 2-Dry-Compound Mandate
  - Bounds by min(Cliff, Crossover, Safety Floor)
            |
            +----------------------+----------------------+
                                   |
                                   v (Post-Race Only)
                   [Independent Race Stint Reconstruction]
                     - Decouples Fuel & Filters Contamination
                     - Fits Independent WOLS: beta_1,race, beta_2,race
                                   |
                                   v
                     [Post-Race Scientific Validation]
                       1. Centered Shape MAE (s)
                       2. Physical MAE (s)
                       3. Slope Error (ms/lap)
                       4. Pit Window Accuracy (+/- 2 Laps)
                       5. Non-Circular Telemetric Grip Validation
                                   |
                                   v
                     [Continual Parameter Learner]
                       - Updates w_p1 for NEXT Race
                       - Verified by Learning Acceptance Gatekeeper
                       - Feeds Forward into Austria Prior
```

---

## 3. Modular Engineering Packages (`testDaksh/`)

| Module | Responsibility | Scientific Tier |
| :--- | :--- | :--- |
| `numerical_schemas.py` | Strictly typed dataclasses for all inputs, states, forecasts, and scorecards | Schema Definition |
| `physical_tyre_model.py` | Vehicle kinematics, dynamic loads, frictional power, thermal ODEs, tri-mechanism wear | Tiers 1, 2, 3A, 3B |
| `historical_prior_builder.py` | Synthesizes baseline empirical priors from Rounds 1–6 (Bahrain to Miami) | Tier 3B Prior |
| `stint_reconstructor.py` | Filters in/out laps, SC/VSC, dirty air; decouples fuel burn ($-0.033\text{ s/kg}$); normalizes stint age $a \in [0, 1]$ | Observation / Filtering |
| `practice_degradation_inferer.py`| Fits latent degradation trajectory $D_{\text{obs}}(a) = \beta_0 + \beta_1 a + \beta_2 a^2$ via deterministic WOLS | Math Transformation |
| `parameter_fusion.py` | Quality-weighted multi-session parameter fusion ($W_i^{\text{effective}} = W_i^{\text{nominal}} Q_i$) | Math Transformation |
| `parameter_calibrator.py` | Calibrates physical $w_{p1}$ against practice degradation rate and writes immutable freeze JSON | Calibration & Freeze |
| `pre_race_forecaster.py` | Forward simulation of thermal ODEs, damage accumulation, and pace loss for all dry compounds | Forward Simulation |
| `strategy_optimizer.py` | Deterministic grid-search optimization of compound sequences and pit stops minimizing race time | Strategy Layer |
| `live_state_estimator.py` | Isolated real-time observer tracking live tyre conditions without altering the frozen forecast | State Observer |
| `telemetric_grip_validator.py` | Non-circular lateral grip estimation from steady-state apex telemetry $\mu = a_y / (g \Gamma_{\text{aero}})$ | Independent Audit |
| `post_race_validator.py` | Independent auditing: Centered Shape MAE, Physical MAE, Slope Error, Pit Accuracy | Validation Layer |
| `post_race_learner.py` | Second continual learning loop updating compound parameters for subsequent events | Parameter Learning |
| `learning_acceptance.py` | Bounded gatekeeper verifying repeatability, step size limit ($\le 30\%$), and bounds | Gatekeeper |
| `walk_forward_runner.py` | Orchestrates chronological walk-forward benchmark (Spain $\to$ Austria $\to$ Silverstone $\to$ Belgium) | Orchestration |
| `pipeline_runner.py` | Master CLI interface and summary reporting | CLI |

---

## 4. Staging & Circuit Data Flow

### A. Historical Calibration Prior (Rounds 1 to 6)
- **Bahrain (Sakhir)**: Thermal abrasive baseline, heavy rear traction wear.
- **Saudi Arabia (Jeddah)**: Smooth asphalt, high-speed lateral flow.
- **Australia (Albert Park)**: Semi-street layout, front-grain sensitive.
- **Japan (Suzuka)**: High lateral energy, abrasive aggregate (FL limiting).
- **China (Shanghai)**: Heavy front braking into Turn 1 & Turn 14 hairpins.
- **Miami (Autodrome)**: High surface temperature, low macro-texture asphalt.

### B. Demonstration Target Weekend: Spain / Barcelona (Round 10)
- **Full Weekend Execution**: FP1 $\to$ FP2 $\to$ FP3 $\to$ Freeze $\to$ Forecast $\to$ Strategy $\to$ Live State $\to$ Independent Race Validation $\to$ Learning.
- **Limiting Wheel**: Front-Left (Turn 3 carousel, Turn 9 fast right).

### C. Unseen Transfer Validation (Rounds 11, 12, 14)
- **Austria (Round 11)**: Traction-limiting uphill braking (RR limiting). Consumes post-Spain prior.
- **Silverstone (Round 12)**: Ultra high-speed lateral flow (Maggotts/Becketts/Chapel, FL limiting). Consumes post-Austria prior.
- **Belgium / Spa (Round 14)**: High speed elevation changes, Eau Rouge compression, Pouhon lateral flow. Consumes post-Silverstone prior.
