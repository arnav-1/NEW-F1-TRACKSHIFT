# TrackShift Strategy Optimization Architecture

## 1. Mathematical Formulation
Tyre strategy optimization is strictly downstream of the physical model. The optimizer minimizes total race elapsed time over the full Grand Prix distance $N_{\text{total}}$:

$$
\min_{\substack{\mathbf{c} \in \mathcal{C}^M \\ \mathbf{L} \in \mathbb{N}^M}} J(\mathbf{c}, \mathbf{L}) = \sum_{m=1}^M \sum_{k=1}^{L_m} \hat{t}_{\text{lap}}(c_m, k) + (M - 1) \cdot \Delta t_{\text{pit}}
$$

### Decision Variables:
- $M$: Number of stints (1-stop: $M=2$, 2-stop: $M=3$).
- $\mathbf{c} = [c_1, \dots, c_M]$: Compound sequence, where $c_m \in \{\text{SOFT}, \text{MEDIUM}, \text{HARD}\}$.
- $\mathbf{L} = [L_1, \dots, L_M]$: Stint lengths (number of completed laps per stint).

### Constraints:
1. **Total Race Distance Coverage**:
   $$
   \sum_{m=1}^M L_m = N_{\text{total}}
   $$
2. **FIA Sporting Regulations (Two Dry Compounds Mandate)**:
   $$
   \left| \{ c_1, \dots, c_M \} \right| \ge 2 \quad (\text{if race declared Dry})
   $$
3. **Physical Tyre Life Envelope**:
   For each stint $m$, the stint length cannot exceed the maximum usable tyre life $L_{\max}(c_m)$:
   $$
   L_m \le L_{\max}(c_m) = \min\left( L_{\text{cliff}}(c_m), L_{\text{crossover}}(c_m), L_{\text{safety\_floor}}(c_m) \right)
   $$

---

## 2. Deterministic Strategy Decision Thresholds

### 2.1 Analytical Degradation Cliff ($L_{\text{cliff}}$)
Derived from the quadratic degradation trajectory $D(a) = \beta_0 + \beta_1 a + \beta_2 a^2$:
$$
\frac{dD}{da} = \beta_1 + 2 \beta_2 a
$$
Setting marginal pace loss rate to the cliff trigger rate $\delta_{\text{cliff}} = 0.20\text{ s/lap}$:
$$
a_{\text{cliff}} = \frac{\delta_{\text{cliff}} - \beta_1}{2 \beta_2}
$$
Converting normalized age back to lap units:
$$
L_{\text{cliff}} = \lfloor a_{\text{cliff}} \cdot (N_{\text{stint}} - 1) \rfloor + 1
$$
*Classification: TIER 3A Engineering Heuristic.*

### 2.2 Economic Crossover Threshold ($L_{\text{crossover}}$)
The point in a stint where marginal lap pace loss exceeds the amortized cost of pitting for fresh rubber:
$$
\Delta t_{\text{tyre}}(k) \ge \Delta t_{\text{pit\_loss}} / (N_{\text{rem}} - k) \approx 1.80\text{ s}
$$
*Classification: TIER 3B Configurable Strategy Economics.*

### 2.3 Four-Wheel Limiting Tread Safety Floor ($L_{\text{safety\_floor}}$)
Ensures the tyre is pitted before mechanical delamination or carcass exposure occurs:
$$
D(k) \le 0.85 \quad (15\% \text{ minimum tread remaining})
$$
*Classification: Configurable External Safety Constraint.*

---

## 3. Numerical Output Schema (`StrategyOptimizationRecord`)
```json
{
  "circuit": "Spain",
  "race_distance_laps": 66,
  "starting_compound": "SOFT",
  "compound_sequence": ["SOFT", "MEDIUM", "HARD"],
  "compound_sequence_ids": [3, 2, 1],
  "stint_lengths": [14, 24, 28],
  "pit_laps": [14, 38],
  "pit_windows": [[12, 16], [36, 40]],
  "predicted_total_race_time_s": 5357.0,
  "pit_time_loss_total_s": 44.0,
  "constraints_satisfied": 1,
  "safety_margin_pct": 15.0
}
```
All outputs are strictly numerical and typed without LLM-generated text.
