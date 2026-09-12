# TrackShift Tyre Degradation: Source of Truth, Derivation, and Validation

## 1. What this approach is trying to solve

TrackShift is not trying to predict lap time directly and call the difference "tyre degradation."

The problem is that practice-session pace contains several effects at the same time. Fuel load changes the car mass. Traffic changes the driver's achievable pace. The track gets faster as it evolves. Weather changes both the car and tyre operating conditions. Driver behaviour changes tyre loading. The tyre itself changes as it heats, cools, wears, grains, or blisters.

The objective is therefore to recover the part of observed performance loss that can reasonably be attributed to the tyre.

The central idea is to combine a physical tyre model with an empirical performance model.

The physical model explains how the tyre is being worked.

The empirical model explains how that tyre state appears in observed lap performance.

The validation system then checks whether the inferred tyre behaviour actually predicts what happens later, especially on race day.

---

# 2. The three things we need to establish

For every important part of the model, we need three separate answers.

**Source of Truth:** What published research says the physical relationship is.

**Formula / Derivation:** How we calculate the quantity from telemetry, tyre information, track information, and weather.

**Point of Validation:** What observable quantity we compare against to determine whether our implementation is behaving correctly.

These should not be mixed together.

A published paper can establish the mechanism without giving us current Haas/Pirelli parameter values.

A formula can produce tyre energy without proving that the resulting degradation estimate is correct.

A race-day comparison can validate the final degradation output without being direct measurement of rubber mass loss.

---

# 3. Source of Truth

The primary F1-specific source for the tyre degradation mechanism is West and Limebeer, "Optimal Tyre Management of a Formula One Car."

The paper models a Formula One car and represents tyre grip as a function of tyre wear and tyre temperature. It states that grip decreases when tyres become worn or are outside their optimal operating temperature range, and that overheating can accelerate wear. This gives us the basic physical chain needed by TrackShift: tyre operating conditions affect heat and wear, which affect grip, which affects race performance. fileciteturn5file3L503-L523

The paper is therefore the main source of truth for the degradation structure. It gives us the mechanisms we need to represent. It does not give us an exact modern Haas or current Pirelli coefficient set.

Tremlett and Limebeer, "Optimal Tyre Usage for a Formula One Car," is the earlier F1 tyre-usage work underlying the tyre-wear formulation. Its importance for TrackShift is that tyre wear is treated as part of the evolving state of the race car rather than as a static function of lap number.

Farroni et al., "TRT: Thermo Racing Tyre," is primarily a source for the thermal part of the model. It models heat generation and heat transfer through the tyre, including heat exchange with the surrounding environment and track. The detailed model uses a physical heat-diffusion formulation. fileciteturn6file6L1072-L1120

Kelly and Sharp provide additional F1-oriented support for the thermodynamic tyre model, including tread temperature, carcass temperature, inflation-gas effects, track temperature and ambient conditions. This supports the thermal structure but should not be treated as the source of modern Pirelli wear coefficients.

Todd et al., "Explainable Time Series Prediction of Tyre Energy in Formula One Race Strategy," is useful as the bridge from physical tyre energy to real Formula One telemetry. The work predicts tyre energy and shows that telemetry variables connected to car dynamics, such as steering wheel angle, contain substantial information about tyre energy. fileciteturn6file7L1179-L1189

Together, these papers give us the physical foundation.

They do not give us the final TrackShift model coefficients.

---

# 4. The physical chain

The model should be understood as a chain rather than as a flat feature table.

The chain is:

```text
Car + Driver + Track + Weather + Tyre
                    ↓
        Forces, Slip, Speed, Pressure
                    ↓
            Tyre Workload
                    ↓
        Frictional Power / Energy
                    ↓
          Tyre Thermal State
                    ↓
             Wear Mechanisms
                    ↓
         Accumulated Tyre State
                    ↓
                 Grip
                    ↓
             Car Performance
```

This is the core structure.

It means we do not need to throw 100 independent variables into a regression model and hope the machine learns tyre physics through osmosis, which would be a remarkably human solution.

---

# 5. What the raw inputs actually are

The raw input layer contains things that describe the tyre, car, circuit, environment and driver.

The important tyre variables are compound, tyre age/history, pressure where available, and any tyre-specific telemetry.

The important vehicle-dynamics variables are tyre load, longitudinal force, lateral force, speed, longitudinal slip and slip angle.

The important environmental variables are track temperature, ambient temperature, wind and wetness/rain state.

Circuit and car context matter because the same tyre can experience very different workloads on different tracks or different cars.

These variables should not all become final model features.

Many of them exist because they are needed to derive intermediate physical states.

---

# 6. Compound

Compound is a true input.

Different compounds have different operating characteristics and wear behaviour.

The West and Limebeer paper explicitly notes that the optimal temperature window has to be adjusted for each tyre compound. fileciteturn5file8L1257-L1266

Therefore TrackShift should not assume one universal degradation curve.

The model should be capable of representing:

```text
compound
    ↓
temperature response
    ↓
grip and wear behaviour
```

---

# 7. Tyre age

Tyre age is an observation of how long a tyre has been used.

It is not the physical definition of degradation.

The simplest possible model would be:

```text
degradation = f(tyre age)
```

That is not sufficient for TrackShift.

A better representation is:

```text
tyre age + accumulated workload
                    ↓
              tyre state
```

Two tyres with the same tyre age can have different physical degradation if they experienced different loads, slip, temperatures, or track conditions.

Therefore tyre age is useful both as an input and as a validation variable for the hidden tyre state.

---

# 8. Tyre pressure

Pressure must be separated into two concepts.

Initial or setup pressure is a pre-input.

Operating pressure is a dynamic tyre state.

The important relationship is not simply:

```text
higher pressure = more degradation
```

because pressure affects the tyre's contact and mechanical behaviour, which then affects force generation, deformation, thermal behaviour and friction.

Therefore the correct role of pressure is:

```text
Pressure
    ↓
Contact / mechanical state
    ↓
Tyre forces and deformation
    ↓
Energy and temperature
    ↓
Degradation
```

The exact pressure effect for the current Pirelli tyres used in our target data must be estimated or validated from data rather than assumed from a generic coefficient.

---

# 9. Vertical load

Vertical load is:

```text
Fz
```

It changes the tyre's contact mechanics and therefore contributes to how much work the tyre is capable of doing.

It should therefore enter the physical tyre model either directly or through derived tyre-force and contact quantities.

It is not simply an arbitrary ML feature.

---

# 10. Longitudinal force and longitudinal slip

Longitudinal force is:

```text
Fx
```

and longitudinal slip is:

```text
κ
```

Together they represent the longitudinal part of tyre-road work.

When braking or accelerating, the tyre can dissipate energy through longitudinal sliding.

That contribution is part of the frictional-power calculation.

---

# 11. Lateral force and slip angle

Lateral force is:

```text
Fy
```

and slip angle is:

```text
α
```

These represent the lateral interaction between tyre and road.

Cornering can therefore produce significant tyre energy even when the car is not accelerating or braking heavily.

This matters especially for circuits with large sustained lateral loads.

---

# 12. Tyre energy / frictional power

This is the most important derived physical quantity in the degradation model.

West and Limebeer use:

\[
Q_{frict}
=
p_1u_n
\left(
|F_x\kappa|
+
|F_y\tan\alpha|
\right)
\]

Here, \(F_x\) is longitudinal tyre force, \(F_y\) is lateral tyre force, \(\kappa\) is longitudinal slip, \(\alpha\) is slip angle, \(u_n\) is the relevant tyre velocity term, and \(p_1\) represents the fraction of frictional power transferred to the tyre.

The important idea is simpler than the notation:

```text
force × slip × speed
        ↓
frictional power
```

This gives TrackShift a physically meaningful measure of how hard the tyre is being worked.

---

# 13. Why tyre energy matters

The degradation model directly connects mechanical abrasion to frictional power.

The published F1 formulation is:

\[
\dot w_p =
w_{p1}
\left(
\frac{Q_{frict}}{Q_{ref}}
\right)^{w_{p2}}
\]

West and Limebeer explicitly describe this as the mechanical-abrasion wear law. fileciteturn5file8L1197-L1213

This is a major reason why TrackShift should not model degradation as a simple function of tyre age.

If two tyres have different frictional workload histories, they can have different wear rates even when their ages are identical.

The model therefore needs tyre history, not just tyre age.

---

# 14. Tyre thermal state

Tyre temperature is a state.

The West and Limebeer model uses tread and carcass temperatures. The paper describes the tyre tread as the rubber surface that contacts the track and the carcass as the structural component, with the thermodynamic model maintaining separate thermal states. fileciteturn5file3L479-L499

A simplified TrackShift representation is:

\[
C_{tread}\frac{dT_{tread}}{dt}
=
Q_{friction}
+
Q_{deformation}
-
Q_{track}
-
Q_{air}
-
Q_{tread\rightarrow carcass}
\]

and:

\[
C_{carcass}\frac{dT_{carcass}}{dt}
=
Q_{tread\rightarrow carcass}
-
Q_{carcass\rightarrow environment}
+
Q_{internal}
\]

The exact terms and parameters depend on the final implementation.

The important point is that tyre temperature is dynamically generated from tyre workload and heat transfer.

---

# 15. Where the weather enters

Weather should not simply be thrown into the final degradation equation as a list of unrelated coefficients.

Its physical role is through the tyre's operating environment.

Track temperature affects heat transfer between tyre and track:

```text
Track temperature
       ↓
Tyre / track heat exchange
       ↓
Tread temperature
       ↓
Grip + wear
```

Ambient temperature affects cooling:

```text
Ambient temperature
       ↓
Convective cooling
       ↓
Tread / carcass temperature
       ↓
Grip + wear
```

Wind affects airflow and therefore heat transfer.

Rain and wetness are more fundamental because they change the tyre-road interaction itself.

This is why weather belongs in the model, but its effect should be routed through physical mechanisms and then tested empirically.

---

# 16. Graining

The published F1 model includes a separate cold-temperature wear mechanism:

\[
\dot w_g =
w_{g1}
\left[
\max(t_{tp}-T_{tread},0)
\right]^{w_{g2}}
\]

This represents graining when the tyre is overworked while too cold. fileciteturn5file8L1213-L1215

The important consequence for TrackShift is that degradation can be regime-dependent.

A tyre that is below its intended thermal window is not necessarily following the same degradation law as a tyre in its normal operating window.

---

# 17. Blistering

The published F1 model also includes a high-temperature wear mechanism:

\[
\dot w_b =
w_{b1}
\left[
\max(T_{tread}-t_{tp},0)
\right]^{w_{b2}}
\]

This represents blistering at high tread temperatures. fileciteturn5file8L1216-L1223

This produces an important asymmetry.

Cold operation can produce one wear mechanism.

Excessive hot operation can produce another.

Normal operation sits between those regimes.

Therefore the final degradation function need not be a single straight line.

---

# 18. Total degradation rate

The published formulation assumes the cumulative wear rate is the sum of the individual mechanisms:

\[
\boxed{
\dot D
=
\dot w_p
+
\dot w_g
+
\dot w_b
}
\]

This is the core degradation equation.

The quantities inside it are not arbitrary model features.

They come from the physical model.

---

# 19. Accumulated degradation

Instantaneous wear rate is not the same as cumulative tyre state.

The state is:

\[
D(t)
=
D(0)
+
\int_0^t \dot D(\tau)\,d\tau
\]

For discrete telemetry:

\[
D_{t+1}
=
D_t
+
\dot D_t\Delta t
\]

This is important because tyre degradation has memory.

The tyre carries the consequences of its previous workload.

A tyre cannot become physically new again simply because its temperature returns to the optimal range.

---

# 20. Grip

The published F1 model links grip to temperature and wear.

Conceptually:

\[
\mu
=
f(T_{tread},D,\text{compound})
\]

This creates two different effects.

Temperature changes can be partly reversible.

Wear changes are irreversible.

Therefore:

```text
temperature
    ↓
instantaneous grip state
```

while:

```text
accumulated wear
    ↓
longer-term grip loss
```

Both are necessary.

---

# 21. From grip to performance

The physical chain eventually becomes:

```text
Tyre temperature + degradation
              ↓
             grip
              ↓
       available tyre force
              ↓
  braking / acceleration / cornering
              ↓
            lap time
```

This is where TrackShift connects physical tyre modelling to the actual business output.

We do not necessarily need a complete vehicle simulator.

We need enough of the physical chain to construct a credible tyre state and enough of the empirical chain to identify how that state changes observed performance.

---

# 22. The observed lap-time problem

Observed lap time is not equal to tyre degradation.

A useful decomposition is:

\[
Y_t =
\text{baseline pace}
+
\text{fuel}
+
\text{tyre degradation}
+
\text{traffic}
+
\text{track evolution}
+
\text{weather}
+
\text{driver variation}
+
\epsilon_t
\]

This decomposition is explicitly used in the TrackShift research program. The document also warns that the terms are not perfectly identifiable. fileciteturn5file0L31-L58

This is exactly why naive tyre-age regression is not enough.

---

# 23. Fuel

Fuel changes vehicle mass and therefore affects lap performance independently of tyre wear.

The research program requires testing no fuel correction, the current linear correction, and alternative plausible fuel-burn assumptions. The purpose is to measure how much the inferred degradation changes when the fuel assumption changes. fileciteturn5file0L62-L78

Fuel should therefore be treated as a confounder of observed pace.

It should not be confused with physical tyre wear.

---

# 24. Traffic

Traffic can create temporary pace loss without creating corresponding tyre degradation.

The research program explicitly tests traffic proxies against lap residuals and degradation residuals and recommends preserving affected laps rather than silently deleting them. fileciteturn5file0L82-L102

Therefore:

```text
traffic
    ↓
observed pace loss
```

does not automatically mean:

```text
traffic
    ↓
tyre degradation
```

The model needs to distinguish them.

---

# 25. Track evolution

The track changes throughout a weekend.

A later lap may be faster because the track has improved, even though the tyre is older.

The research program explicitly requires examining FP1, FP2, FP3, qualifying and race and testing the interaction between tyre age and session progression. fileciteturn5file0L106-L134

Therefore:

```text
track evolution
    ↓
baseline pace
```

must be separated from:

```text
tyre age
    ↓
tyre degradation
```

---

# 26. Driver variation

Drivers do not generate identical tyre workloads.

Braking, steering, throttle use, racing line and tyre-management style can change the energy applied to the tyre.

The research program requires repeated-stint and driver-to-driver comparisons and explicitly warns against treating unexplained pace variation as tyre state automatically. fileciteturn5file5L859-L869

This means the model should learn tyre degradation without simply learning one driver's characteristic pace pattern.

---

# 27. Team and car effects

Different cars can produce different tyre behaviour.

The research program therefore tests whether degradation slopes vary by team and whether team × season effects are needed. fileciteturn5file5L873-L895

This is important for a global model.

We want:

```text
global tyre knowledge
```

without pretending:

```text
every car behaves identically
```

The later hierarchy can determine how much of the remaining effect belongs at global, team, driver, or team × season level.

---

# 28. Weather in the empirical model

Weather has two roles.

First, it can change the physical tyre state:

```text
weather
    ↓
tyre temperature / road interaction
    ↓
degradation
```

Second, it can change observed pace through other mechanisms.

Therefore:

```text
weather
    ↓
observed lap time
```

and:

```text
weather
    ↓
tyre state
    ↓
observed lap time
```

both have to be considered.

The TrackShift research program specifically requires testing weather variables against lap time, pace residual, tyre age, compound, estimated degradation and prediction error. fileciteturn5file5L914-L936

---

# 29. Weather regimes

The model should not automatically assume that weather is represented best as either continuous variables or categorical regimes.

The research program calls for comparison between continuous weather covariates, discrete regimes and hybrid representations. fileciteturn5file5L940-L956

Candidate regimes are:

```text
dry
damp
wet
crossover
drying
```

These are hypotheses to test, not assumptions to hard-code.

---

# 30. Weather transitions

Transitions can create a much harder modelling problem than steady weather.

Relevant transitions include:

```text
dry → damp
dry → wet
wet → drying
slick → intermediate
intermediate → slick
```

The model should measure prediction error, state error, uncertainty and adaptation speed during these transitions. fileciteturn5file5L984-L1001

Wet races should remain in the evaluation set.

---

# 31. Weather leakage

Every weather variable must be checked for:

- source;
- timestamp;
- temporal resolution;
- observed versus forecast status;
- prediction-time availability.

The TrackShift research program explicitly distinguishes historical oracle weather from operational weather available at prediction time and forbids future weather information entering earlier predictions. fileciteturn5file5L1005-L1023

This is part of the validation methodology, not a minor data-engineering detail.

---

# 32. What is the first point of validation?

The first physical validation target should be tyre temperature.

The model predicts:

\[
T_{predicted}
\]

and we compare it with:

\[
T_{observed}
\]

where suitable tyre-temperature observations exist.

This validates the thermal subsystem before we ask it to produce a degradation estimate.

The West and Limebeer paper itself fitted its F1 thermal model using telemetry, providing precedent for this type of validation. Our TrackShift error must still be measured independently.

---

# 33. The second point of validation is tyre energy

The derived tyre-energy quantity should be checked independently.

The model calculates frictional power from forces, slip and speed.

That derived quantity can be compared against an independently derived tyre-energy calculation or other trusted telemetry-based tyre-energy quantity.

Todd et al. provide an F1 precedent in which tyre energies are modelled from telemetry and the predicted energy patterns reflect actual circuit dynamics. fileciteturn6file7L1141-L1154

This validates the intermediate workload representation.

It does not prove that the wear model is correct.

---

# 34. The third point of validation is degradation

Actual lap-by-lap modern F1 rubber mass loss is not directly available to us as a clean public target.

Therefore the final degradation quantity is treated as latent.

The practical observable target becomes:

```text
tyre-attributable performance loss
```

after accounting for the major confounders.

The TrackShift research program explicitly treats degradation as a latent state and requires comparison of the latent state against observed lap time, fuel-corrected lap time and tyre age. fileciteturn5file2L354-L387

---

# 35. Constructing the observable degradation signal

For a stint, we start with observed lap time.

We then account for the known non-tyre sources of performance variation.

The result is a cleaned performance residual.

Conceptually:

\[
\text{clean pace}
=
\text{observed pace}
-
\text{estimated fuel effect}
-
\text{traffic effect}
-
\text{track-evolution effect}
-
\text{other identifiable effects}
\]

The exact decomposition is empirical.

The goal is not to claim perfect causal identification.

The goal is to determine whether the remaining systematic decline is consistent with tyre degradation.

---

# 36. Latent-state validation

For each sufficiently long stint, the research program requires comparing:

```text
observed lap time
fuel-corrected lap time
tyre age
latent tyre state
estimated degradation
latent uncertainty
```

The questions are:

Does degradation generally increase with tyre age?

Does the state reset correctly after a pit stop?

Does it respond to sustained pace changes?

Does it remain sensible during traffic?

Does it incorrectly absorb weather changes?

Does it absorb driver-specific variation?

Does compound-specific behaviour appear?

Does uncertainty increase when evidence is sparse?

Does the state become unstable during regime transitions? fileciteturn5file2L366-L387

A mathematically valid latent state is not automatically a physically valid latent state.

---

# 37. Latent degradation versus empirical degradation

There should be two separate degradation estimates.

The first is an observational estimate from corrected lap performance.

The second is the degradation state produced by the physical/statistical model.

They do not need to be identical.

But they should show sensible agreement.

The research program specifically proposes comparing them using:

- correlation;
- rank correlation;
- slope;
- error distribution;
- disagreement cases. fileciteturn6file2L283-L303

Large disagreement cases should be investigated rather than hidden by averaging.

---

# 38. Final point of validation: race day

This is the most important product-level validation.

Practice information is used to estimate the tyre state and degradation trajectory.

The resulting prediction is then evaluated on an actual future race.

The core test is:

```text
practice information
        ↓
predicted tyre degradation
        ↓
actual race-day stint
        ↓
observed tyre-related performance
```

The evaluation must be temporal.

The race being predicted cannot contribute information to the practice prediction.

This is what makes the validation meaningful.

The research program explicitly treats future races and other future populations as generalization tests. fileciteturn6file3L581-L611

---

# 39. What counts as ground truth

There is no single ground-truth object for the whole system.

For tyre temperature:

```text
observed tyre temperature
```

is the validation target.

For tyre energy:

```text
independently derived tyre energy
```

is the validation target.

For thermal behaviour:

```text
predicted thermal state vs observed thermal state
```

is the validation target.

For final degradation:

```text
clean tyre-attributable performance loss
```

is the practical observable target.

For the product:

```text
practice prediction vs held-out race-day tyre behaviour
```

is the final validation.

The last quantity is the one that matters most to the user problem.

---

# 40. What the papers prove and what they do not prove

The papers support the existence of a physical relationship between tyre workload, temperature, wear, grip and performance.

They support the use of frictional power and tyre thermal states.

They support separate degradation mechanisms for mechanical abrasion, graining and blistering.

They support tyre temperature and wear as state variables.

They support F1 telemetry as a practical source from which tyre-energy information can be derived.

They do not prove the exact numerical coefficients for our current Haas/Pirelli data.

They do not provide direct modern race-day tread-loss ground truth.

They do not tell us that every weather variable is useful.

They do not tell us that one global degradation curve will work equally well for every team, car, driver, circuit and year.

Those questions have to be answered using the TrackShift dataset.

---

# 41. The final model structure we are actually aiming for

The model should therefore operate as:

```text
RAW DATA
  ↓
vehicle / tyre / track / weather information
  ↓
derived tyre forces and slip
  ↓
frictional power / tyre energy
  ↓
thermal state
  ↓
wear mechanisms
  ↓
accumulated tyre state
  ↓
grip state
  ↓
expected tyre performance effect
```

Alongside it, we have:

```text
OBSERVED LAP PERFORMANCE
  ↓
fuel correction
traffic handling
track-evolution correction
weather handling
driver / car handling
  ↓
clean tyre-performance signal
```

The two sides are compared.

The physical side provides the mechanism.

The empirical side provides the observable evidence.

The race-day holdout provides the final test.

---

# 42. The actual TrackShift source-of-truth hierarchy

For the physical model:

```text
Published F1 tyre research
        ↓
physical relationship
        ↓
derived formula
        ↓
TrackShift implementation
```

For the empirical model:

```text
observed F1 data
        ↓
confounder-controlled performance signal
        ↓
degradation estimate
        ↓
held-out race validation
```

The research papers are therefore the source of truth for the **physical mechanism**.

The data is the source of truth for **whether that mechanism explains the behaviour we actually observe**.

Neither replaces the other.

---

# 43. The most important distinction

The final TrackShift target should not be stated as:

```text
rubber mass lost per lap
```

because we do not directly observe that quantity.

The target should be:

```text
tyre-attributable performance degradation
```

with the physical model providing a latent explanation for why that degradation occurs.

That gives us a scientifically defensible system without pretending that unavailable Pirelli measurements are somehow sitting inside the dataset waiting for us to discover them.

---

# 44. Final answer to the original three questions

## 1. Source of Truth

The main source of truth is the published F1 tyre-management literature, especially West and Limebeer.

It establishes that tyre performance depends on temperature and accumulated wear, and that wear is driven by frictional workload plus temperature-dependent mechanisms. fileciteturn5file3L511-L523

Farroni/TRT and Kelly/Sharp support the thermal model.

Tremlett/Limebeer supports the F1 tyre-usage and wear-state formulation.

Todd et al. supports the practical connection between F1 telemetry and tyre energy. fileciteturn6file7L1179-L1189

## 2. Formula / Derivation

We derive tyre forces, slip and frictional workload from telemetry.

We calculate frictional power:

\[
Q_{frict}
=
p_1u_n
\left(
|F_x\kappa|
+
|F_y\tan\alpha|
\right)
\]

We use the thermal model to estimate tread and carcass temperature.

We calculate:

\[
\dot w_p
\]

for mechanical abrasion,

\[
\dot w_g
\]

for graining,

and:

\[
\dot w_b
\]

for blistering.

Then:

\[
\dot D
=
\dot w_p+\dot w_g+\dot w_b
\]

and:

\[
D(t)
=
\int \dot D\,dt
\]

Finally:

\[
\mu
=
f(T,D,\text{compound})
\]

connects tyre state to grip and therefore performance.

## 3. Point of Validation

The thermal model is validated against observed tyre temperature.

The energy calculation is validated against independently derived tyre-energy behaviour.

The degradation state is validated against corrected, tyre-attributable performance loss.

The final product is validated by predicting race-day tyre behaviour from practice data and evaluating that prediction on a held-out future race.

That is the actual TrackShift approach.
