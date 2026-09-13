# TrackShift Continual Learning Architecture

## 1. Dual-Loop Continual Learning Paradigm

TrackShift implements a dual-loop continual learning system with strict boundary isolation between intra-weekend practice calibration and inter-weekend walk-forward parameter updates.

```text
=============================================================================
LOOP 1: INTRA-WEEKEND PRACTICE CALIBRATION (Pre-Race)
=============================================================================
Historical Baseline Prior (Rounds 1-6)
       ↓
FP1: Green track baselines, compound operating initial evidence
       ↓
FP2: Dominant long-run session (70% nominal weight) under race conditions
       ↓
FP3: High track-temperature refinement and qualifying-to-race offsets
       ↓
Quality-Weighted Parameter Fusion: W_i^eff = W_i^nom * Q_i
       ↓
FROZEN PRE-RACE BENCHMARK (data/frozen_practice_calibrations.json)
       ↓
Sunday Forward Simulation & Downstream Strategy Optimization

=============================================================================
LOOP 2: INTER-WEEKEND WALK-FORWARD PARAMETER UPDATES (Post-Race)
=============================================================================
Sunday Race Execution
       ↓
Independent Race Stint Reconstruction & WOLS Latent Degradation Fitting
       ↓
Post-Race Scientific Auditing (Centered Shape MAE, Slope Error, Grip Validation)
       ↓
Post-Race Parameter Learner (proposes delta_w_p1 from systematic residual)
       ↓
Learning Acceptance Gatekeeper (verifies evidence, clamps step size <= 30%)
       ↓
Updated Prior committed into NEXT Grand Prix baseline
```

---

## 2. Loop 1: Intra-Weekend Practice Fusion

### 2.1 Nominal Calibration Weights
- $w_{\text{FP1}} = 0.15$: Initial compound discovery under green track conditions.
- $w_{\text{FP2}} = 0.70$: Primary race simulation session with heavy fuel long runs (15–20 laps) matching Sunday race time of day and track temperatures.
- $w_{\text{FP3}} = 0.15$: Thermal sensitivity check under peak midday track temperatures.

### 2.2 Telemetric Quality Score ($Q_i$)
To prevent unrepresentative or compromised practice runs from distorting the pre-race calibration, each session receives an automated quality metric:

$$
Q_i = \min\left(1.0, \frac{N_{\text{clean\_laps}}}{15.0}\right) \times \min\left(1.0, \frac{N_{\text{stints}}}{2.0}\right) \times \exp\left(-0.5 \frac{\sigma_{\text{res}}^2}{0.10}\right)
$$

Effective session weights are computed and normalized:
$$
W_i^{\text{effective}} = \frac{W_i^{\text{nominal}} \cdot Q_i}{\sum_j W_j^{\text{nominal}} \cdot Q_j}
$$

Fused compound parameters:
$$
\theta_{\text{fused}} = \sum_{i \in \{\text{FP1}, \text{FP2}, \text{FP3}\}} W_i^{\text{effective}} \cdot \theta_i
$$

---

## 3. Loop 2: Inter-Weekend Walk-Forward Learning

### 3.1 Learning Mechanism
The learner extracts persistent systematic discrepancies between predicted degradation and independently inferred actual race degradation:

$$
\Delta \beta_{1,\text{lap}} = \beta_{1,\text{race\_lap}} - \beta_{1,\text{pred\_lap}}
$$

The physical wear parameter update is proposed via calibrated gradient step:
$$
w_{p1,\text{proposed}} = w_{p1,\text{old}} + K \cdot \left(\frac{\Delta \beta_{1,\text{lap}}}{k_{\text{pace\_loss}}}\right)
$$
Where $K = 0.25$ is the deterministic continual learning rate.

### 3.2 Acceptance Gatekeeper Rules
To ensure model stability and prevent single-race overfitting, proposed updates must pass through four verification gates:
1. **Minimum Evidence Threshold**: Requires $\ge 1$ fully validated clean race stint.
2. **Step Size Clamping**: Parameter shift is bounded:
   $$
   \left| \frac{w_{p1,\text{updated}} - w_{p1,\text{old}}}{w_{p1,\text{old}}} \right| \le 30\%
   $$
3. **Physical Domain Bounds**: $w_{p1} \in [0.005, 0.350]$.
4. **Walk-Forward Validation**: Must preserve or improve out-of-sample prediction accuracy.
