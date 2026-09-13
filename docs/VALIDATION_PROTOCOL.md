# TrackShift Scientific Validation Protocol

## 1. Scope & Objective
This document defines the post-race auditing methodology used by TrackShift to quantify prediction accuracy, diagnostic reliability, and physical fidelity.

Post-race validation is **strictly independent of the frozen pre-race forecast**. Sunday race observations are never used to refit or adjust the frozen model during the validation phase.

---

## 2. Core Scientific Metrics

### 2.1 Centered Shape MAE (seconds)
Eliminates static driver pace offsets, traffic offsets, or race-day base lap time shifts to evaluate the pure curvature fidelity of the degradation model.

#### Mathematical Definition:
Given predicted pace loss series $\hat{y} = [\hat{y}_1, \dots, \hat{y}_N]$ and independently observed pace loss series $y = [y_1, \dots, y_N]$:

$$
\overline{\hat{y}} = \frac{1}{N} \sum_{k=1}^N \hat{y}_k, \quad \overline{y} = \frac{1}{N} \sum_{k=1}^N y_k
$$

$$
\text{MAE}_{\text{shape}} = \frac{1}{N} \sum_{k=1}^N \left| (\hat{y}_k - \overline{\hat{y}}) - (y_k - \overline{y}) \right|
$$

#### Proof of Invariance to Constant Driver Offset:
Let observed pace be shifted by an arbitrary constant driver pace offset $C \in \mathbb{R}$ such that $y_k' = y_k + C$.
Then:
$$
\overline{y'} = \frac{1}{N} \sum_{k=1}^N (y_k + C) = \overline{y} + C
$$
Substituting into the centered residual:
$$
(y_k' - \overline{y'}) = (y_k + C) - (\overline{y} + C) = y_k - \overline{y}
$$
Therefore:
$$
\text{MAE}_{\text{shape}}(y') = \text{MAE}_{\text{shape}}(y)
$$
Centered Shape MAE is strictly invariant to uniform pace offsets, isolating tyre degradation curvature from driver management deltas.

---

### 2.2 Physical MAE (seconds)
Evaluates end-to-end uncentered lap time prediction error over the valid stint region:

$$
\text{MAE}_{\text{phys}} = \frac{1}{N} \sum_{k=1}^N \left| \hat{t}_{\text{pred}}(k) - t_{\text{obs}}(k) \right|
$$

Where:
$$
\hat{t}_{\text{pred}}(k) = t_{\text{base}} + \Delta\hat{t}_{\text{tyre}}(k) + \Delta t_{\text{fuel}}(k)
$$

---

### 2.3 Degradation Slope Error ($E_\beta$, ms/lap)
Quantifies error in the linear rate of pace degradation over completed flying laps:

$$
E_\beta = \left| \hat{\beta}_{1,\text{pred\_lap}} - \hat{\beta}_{1,\text{race\_lap}} \right| \times 1000 \quad [\text{ms/lap}]
$$

Where $\hat{\beta}_{1,\text{pred\_lap}}$ is the per-lap rate simulated by the frozen model, and $\hat{\beta}_{1,\text{race\_lap}}$ is independently inferred via WOLS on Sunday stint telemetry.

---

### 2.4 Pit Window Accuracy ($\pm 2$ Laps)
Evaluates whether the actual race pit stop occurred within the model's recommended pit window:

$$
\text{Capture}_{\pm 2L} = \mathbb{I}\left( \left| L_{\text{actual\_pit}} - L_{\text{pred\_pit}} \right| \le 2 \right)
$$

Where $L_{\text{pred\_pit}}$ is determined by the minimum of:
1. Analytical degradation cliff ($L_{\text{cliff}} = \frac{0.25 - \alpha}{2\beta} - 1$),
2. Economic crossover threshold ($\Delta t_{\text{deg}} \ge 1.80\text{ s}$),
3. Safety floor ($D \ge 0.85$, $15\%$ tread remaining).

---

### 2.5 Non-Circular Telemetric Grip Validation
Validates internal physical grip capacity $\mu_{\text{eff}}(T, D)$ using high-frequency apex telemetry in steady-state corners, completely independent of lap times.

#### Formulation:
1. Extract minimum mid-corner speed $v_{\text{apex}}$ and local curvature $\kappa_{\text{apex}}$.
2. Lateral acceleration: $a_y = v_{\text{apex}}^2 \kappa_{\text{apex}}$.
3. Normalize for dynamic aerodynamic downforce:
   $$
   \Gamma_{\text{aero}}(v) = 1 + \frac{\frac{1}{2} \rho C_L A v_{\text{apex}}^2}{m \cdot g}
   $$
4. Telemetry grip index:
   $$
   \mu_{\text{telemetry}} = \frac{a_y}{g \cdot \Gamma_{\text{aero}}(v)}
   $$
5. Compare normalized model grip $\frac{\mu_{\text{model}}(k)}{\mu_{\text{model}}(0)}$ against normalized telemetry grip $\frac{\mu_{\text{telemetry}}(k)}{\mu_{\text{telemetry}}(0)}$ using Pearson correlation, RMSE, and trend agreement.
