# Complete Master Catalog of TrackShift Formulas & Sources of Truth

> **Document Status**: Complete Production Formula Inventory (Formulas 1 to 49)  
> **Target System**: TrackShift Tyre Degradation & Strategy Intelligence Platform  
> **Source Reference**: [`docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md`](file:///c:/Users/daksh/Projects/Trackshiftv2/docs/FORMULA_PROVENANCE_AND_FEATURE_GLOSSARY.md)  

---

## The 4 Provenance Classification Tiers

Every formula in TrackShift is categorized into one of four strict scientific tiers:
* **Tier 1 (First Principles / Physical Laws)**: Fundamental, non-negotiable laws of classical mechanics, thermodynamics, and differential geometry (e.g., Conservation of Energy, Euler-Newton equations, Frenet-Serret curvature).
* **Tier 2 (Peer-Reviewed Academic Literature)**: Published equations from established vehicle dynamics and tyre research (*West & Limebeer 2020*, *Farroni TRT 2014*, *Tremlett & Limebeer 2016*, *Milliken & Milliken 1995*, *Pacejka 2012*).
* **Tier 3 (TrackShift Engineering Surrogates & Calibrations)**: Closed-form analytical approximations or empirical parameter tunings developed to run in real time from public broadcast telemetry without confidential sensors.
* **Tier 4 / Diagnostic Metrics**: Statistical error checks, reliability scores, and validation diagnostics powering the post-race debrief suite.

---

# Group 1: Track Kinematics & Aerodynamic Loads

### Formula 1: Track Path Curvature ($\kappa$)
```text
kappa(s) = | X_dot * Y_ddot - Y_dot * X_ddot | / ( (X_dot^2 + Y_dot^2)^(3/2) )
```
* **Tier**: Tier 1 (First Principles / Differential Geometry)
* **Source of Truth**: Frenet-Serret formulas of planar curve geometry.
* **Code Location**: `post_race_validation/code/telemetric_grip_validator.py:87-93` & `src/iep/physics_proxies.py:102-120`
* **What It Does**: Calculates the instantaneous curvature (inverse radius $1/R$) of the racing line from GPS coordinates.

---

### Formula 2: Curvature-Based Centripetal Lateral Acceleration ($a_y$)
```text
a_y = v^2 * kappa
```
* **Tier**: Tier 1 (Newtonian Kinematics)
* **Source of Truth**: Classical Euler-Newton rigid body kinematics.
* **Code Location**: `core_model/code/thermal_wear_model.py:180` & `src/iep/physics_proxies.py:125`
* **What It Does**: Derives the lateral cornering acceleration from speed and path radius.

---

### Formula 3: Forward Velocity from Speed Sensor or GPS Differentiation
```text
v(t) = sqrt( (dX/dt)^2 + (dY/dt)^2 )
```
* **Tier**: Tier 1 (Kinematics)
* **Source of Truth**: Standard Euclidean distance derivative.
* **Code Location**: `src/iep/physics_proxies.py:85-95`
* **What It Does**: Provides clean forward speed along the ground reference plane.

---

### Formula 4: Aerodynamic Downforce Scaling ($F_{\text{aero}}$)
```text
F_aero = 0.5 * rho_air * C_L_A * v^2
```
* **Tier**: Tier 2 (Fluid Dynamics)
* **Source of Truth**: Milliken & Milliken (1995), *Race Car Vehicle Dynamics*, Chapter 16, Eq. (16.1).
* **Code Location**: `post_race_validation/code/telemetric_grip_validator.py:100` & `src/iep/physics_proxies.py:130-145`
* **What It Does**: Computes vertical aerodynamic downforce pushing the car into the asphalt ($C_L A \approx 3.8\text{--}4.2\text{ m}^2$ for 2024 F1 cars).

---

### Formula 5: Total Vehicle Normal Load ($F_z$)
```text
F_z = m(t) * g + F_aero
```
* **Tier**: Tier 1 (Statics)
* **Source of Truth**: Newtonian vertical force equilibrium.
* **Code Location**: `post_race_validation/code/telemetric_grip_validator.py:101`
* **What It Does**: Sums static car weight (including remaining fuel) and high-speed downforce to find total vertical force on tyres.

---

# Group 2: Chassis Dynamic Load Transfer & 4-Wheel Allocation

### Formula 6: Steady-State Lateral Roll Load Transfer ($\Delta F_{z,\text{lat}}$)
```text
Delta F_z,lat = m(t) * a_y * (h_cg / t_track)
```
* **Tier**: Tier 1 / Tier 2 (Rigid Body Moment Balance)
* **Source of Truth**: Milliken & Milliken (1995), *Race Car Vehicle Dynamics*, Chapter 16, Section 16.3.
* **Code Location**: `src/dep/degradation.py:220-236`
* **What It Does**: Calculates how much normal force transfers from inside tyres to outside tyres during cornering across track width $t_{\text{track}}$.

---

### Formula 7: Longitudinal Pitch Load Transfer ($\Delta F_{z,\text{lon}}$)
```text
Delta F_z,lon = m(t) * a_x * (h_cg / L_wheelbase)
```
* **Tier**: Tier 1 / Tier 2 (Rigid Body Moment Balance)
* **Source of Truth**: Guiggiani, M. (2014), *The Science of Vehicle Dynamics*, Springer, Chapter 3; Milliken & Milliken (1995) Chapter 18.
* **Code Location**: `src/dep/degradation.py:237-250`
* **What It Does**: Calculates how much normal force pitches forward onto the front axle under braking (up to $70\%$) or squats rearward under traction (up to $75\%$).

---

### Formula 8: Four-Wheel Dynamic Normal Load Distribution ($F_{z,i}$)
```text
F_z,FL = 0.5 * F_z,front,static + 0.5 * F_aero,front - 0.5 * Delta F_z,lon + 0.5 * K_phi,front * Delta F_z,lat,total
F_z,FR = 0.5 * F_z,front,static + 0.5 * F_aero,front - 0.5 * Delta F_z,lon - 0.5 * K_phi,front * Delta F_z,lat,total
F_z,RL = 0.5 * F_z,rear,static  + 0.5 * F_aero,rear  + 0.5 * Delta F_z,lon + 0.5 * (1 - K_phi,front) * Delta F_z,lat,total
F_z,RR = 0.5 * F_z,rear,static  + 0.5 * F_aero,rear  + 0.5 * Delta F_z,lon - 0.5 * (1 - K_phi,front) * Delta F_z,lat,total
```
* **Tier**: Tier 1 / Tier 2 (Four-Corner Load Allocation)
* **Source of Truth**: Classical Vehicle Dynamics / Milliken & Milliken (1995), Chapter 16; RacePhysiX Framework.
* **Code Location**: `src/dep/degradation.py:252-276`
* **What It Does**: Reconstructs the exact vertical force on each individual tyre ($FL, FR, RL, RR$) without requiring secret wheel-hub strain gauges.

---

# Group 3: Interfacial Slip & Frictional Sliding Power

### Formula 9: Reduced-Order Linearized Tyre Slip Angle ($\alpha_i$)
```text
alpha_i = clip( F_y,i / (C_alpha,i * aero_downforce_factor), 0.0, 0.22 )
```
* **Tier**: Tier 3 (TrackShift Engineering Surrogate)
* **Source of Truth**: Pacejka, H. B. (2012), *Tire and Vehicle Dynamics*, linear slip regime with aero stiffness scaling.
* **Code Location**: `core_model/code/thermal_wear_model.py:183-185`
* **What It Does**: Computes lateral slip angle (radians) between wheel heading and vehicle trajectory.

---

### Formula 10: Lateral Contact Patch Sliding Velocity ($v_{\text{slip,lat}}$)
```text
v_slip,lat = v * sin(alpha)
```
* **Tier**: Tier 3 (Kinematic Projection)
* **Source of Truth**: Farroni et al. (2014), *TRT: Thermo Racing Tyre*, Section 2.1.
* **Code Location**: `core_model/code/thermal_wear_model.py:187`
* **What It Does**: Projects the car's forward speed into the lateral sliding scrub speed across road aggregate.

---

### Formula 11: Longitudinal Contact Patch Sliding Velocity ($v_{\text{slip,lon}}$)
```text
v_slip,lon = kappa_s * v   (approx 0.03 * v under heavy braking/traction)
```
* **Tier**: Tier 3 (Kinematic Surrogate)
* **Source of Truth**: Farroni et al. (2014) TRT; West & Limebeer (2020).
* **Code Location**: `core_model/code/thermal_wear_model.py:191`
* **What It Does**: Estimates longitudinal micro-slip during hard acceleration or braking.

---

### Formula 12: Interfacial Frictional Sliding Power ($Q_{\text{frict}}$)
```text
Q_frict = p1 * ( F_lat * v_slip,lat + F_lon * v_slip_lon )
```
* **Tier**: Tier 2 / Tier 3 (Sliding Friction Power)
* **Source of Truth**: West & Limebeer (2020), Eq. (12); Farroni TRT (2014).
* **Code Location**: `core_model/code/thermal_wear_model.py:194-197`
* **What It Does**: Calculates the mechanical friction power dissipated at the contact patch (up to $45,000\text{ W}$).

---

### Formula 13: Thermal Partitioning of Friction Energy ($p_1 = 0.65$)
```text
Q_tyre = p1 * Q_frict_total,   where p1 approx 0.65
```
* **Tier**: Tier 2 (Thermal Effusivity Theory)
* **Source of Truth**: Jaeger, J. C. (1942), *Proc. Roy. Soc. NSW*, Vol. 76; Farroni TRT (2014).
* **Code Location**: `core_model/code/thermal_wear_model.py:194`
* **What It Does**: Proves that $65\%$ of contact friction enters the tyre rubber, while $35\%$ conducts into the asphalt roadbed.

---

### Formula 14: Contact Patch to Lap Average Heat Flux Scaling
```text
Q_effective = Q_frict * corner_duty_cycle   (corner_duty_cycle approx 0.32)
```
* **Tier**: Tier 3 (TrackShift Engineering Integration)
* **Source of Truth**: Discrete lap integration scaling (accounting for $32\%$ cornering and $68\%$ straights).
* **Code Location**: `core_model/code/thermal_wear_model.py:209, 219`
* **What It Does**: Scales peak cornering heat flux across the duration of an entire lap.

---

# Group 4: Coupled 2-Node Thermodynamic ODEs

### Formula 15: Tyre Tread Temperature State Equation ($T_{\text{tread}}$)
```text
m_tread * c_tread * (d T_tread / dt) = Q_effective - Q_cond - Q_conv - Q_int
```
* **Tier**: Tier 1 / Tier 2 (First Law of Thermodynamics)
* **Source of Truth**: Farroni et al. (2014), *TRT*, *Meccanica*, 49(3); West & Limebeer (2020), Section III, Eq. (10).
* **Code Location**: `core_model/code/thermal_wear_model.py:224-242`
* **What It Does**: Master differential equation predicting fast-reacting tread surface temperature ($3.2\text{ kg}$ node).

---

### Formula 16: Tyre Carcass Temperature State Equation ($T_{\text{carcass}}$)
```text
m_carc * c_carc * (d T_carc / dt) = Q_int + Q_deflect - Q_rim
```
* **Tier**: Tier 1 / Tier 2 (First Law of Thermodynamics)
* **Source of Truth**: West & Limebeer (2020), Section III, Eq. (11); Farroni (2014).
* **Code Location**: `core_model/code/thermal_wear_model.py:225-243`
* **What It Does**: Master differential equation predicting slow-reacting internal structural carcass temperature ($6.8\text{ kg}$ node).

---

### Formula 17: Conductive Heat Loss to Track Surface ($Q_{\text{cond}}$)
```text
Q_cond = h_track * A_contact * ( T_tread - T_track )
```
* **Tier**: Tier 2 (Fourier Conduction)
* **Source of Truth**: Farroni et al. (2014), *TRT*, Eq. (6).
* **Code Location**: `core_model/code/thermal_wear_model.py:232`
* **What It Does**: Models heat conducting from hot rubber into the colder asphalt ($h_{\text{track}} = 120.0\text{ W/m}^2/\text{K}$).

---

### Formula 18 & 19: Forced Convective Heat Loss to Air ($Q_{\text{conv}}$ & $h_{\text{air}}(v)$)
```text
h_air(v) = h_0 + h_v * (v_ms)^0.8
Q_conv   = h_air(v) * A_exposed * ( T_tread - T_ambient )
```
* **Tier**: Tier 2 / Tier 3 (Turbulent Boundary Layer Convection)
* **Source of Truth**: Incropera & DeWitt (2007), *Heat Transfer*; Farroni TRT (2014); West & Limebeer (2020).
* **Code Location**: `core_model/code/thermal_wear_model.py:222, 233`
* **What It Does**: Models turbulent air rush cooling the tyre on high-speed straights.

---

### Formula 20: Internal Conduction Between Tread and Carcass ($Q_{\text{int}}$)
```text
Q_int = k_tread_carc * ( T_tread - T_carcass )
```
* **Tier**: Tier 2 (Lumped Conduction)
* **Source of Truth**: Fourier's Law applied to concentric nodes (West & Limebeer 2020; Farroni 2014).
* **Code Location**: `core_model/code/thermal_wear_model.py:234`
* **What It Does**: Transfers heat between the outer tread skin and the deep internal belts ($k = 85.0\text{ W/K}$).

---

### Formula 21: Carcass Deflection Internal Hysteresis Heating ($Q_{\text{deflect}}$)
```text
Q_deflect = 0.02 * Q_effective
```
* **Tier**: Tier 3 (TrackShift Linear Surrogate)
* **Source of Truth**: West & Limebeer (2020), Eq. (11) simplified from cyclic strain energy dissipation.
* **Code Location**: `core_model/code/thermal_wear_model.py:235`
* **What It Does**: Generates internal heat from the rubber flexing and relaxing as the wheel spins.

---

### Formula 22: Wheel Rim Heat Dissipation ($Q_{\text{rim}}$)
```text
Q_rim = h_rim * ( T_carcass - T_ambient )
```
* **Tier**: Tier 3 (TrackShift Engineering Extension)
* **Source of Truth**: Boundary heat sink introduced to prevent numerical thermal accumulation ($h_{\text{rim}} = 12.0\text{ W/K}$).
* **Code Location**: `core_model/code/thermal_wear_model.py:236`
* **What It Does**: Dissipates carcass heat into the magnesium wheel rim.

---

# Group 5: Tri-Mechanism Wear Superposition & Damage Accumulation

### Formula 23: Mechanical Surface Abrasion Rate ($\dot{w}_p$)
```text
w_dot_p = S_asphalt * w_p1 * ( Q_frict / Q_ref )^w_p2
```
* **Tier**: Tier 2 (Peer-Reviewed Structure with Tier 3 Calibrated Constants)
* **Source of Truth**: West & Limebeer (2020), Section IV, Eq. (15); Archard (1953) wear law.
* **Code Location**: `core_model/code/thermal_wear_model.py:268` & `src/dep/degradation.py:341-343`
* **What It Does**: Power-law mechanical wear ($w_{p1} = 0.035, w_{p2} = 1.15, Q_{\text{ref}} = 15,000\text{ W}$).

---

### Formula 24: Sub-Optimal Cold Graining Degradation Rate ($\dot{w}_g$)
```text
w_dot_g = w_g1 * [ max( T_grain - T_tread, 0 ) ]^w_g2
```
* **Tier**: Tier 2 / Tier 3 Extension (Threshold Decoupling)
* **Source of Truth**: West & Limebeer (2020), Section IV, Eq. (16).
* **Code Location**: `core_model/code/thermal_wear_model.py:272` & `src/dep/degradation.py:345-346`
* **What It Does**: Models cold rubber surface tearing below compound temperature $T_{\text{grain}}$ ($w_{g1} = 2.0\times 10^{-5}, w_{g2} = 1.4$).

---

### Formula 25: Super-Optimal Thermal Blistering Rate ($\dot{w}_b$)
```text
w_dot_b = w_b1 * [ max( T_tread - T_blister, 0 ) ]^w_b2
```
* **Tier**: Tier 2 / Tier 3 Extension (Threshold Decoupling)
* **Source of Truth**: West & Limebeer (2020), Section IV, Eq. (17).
* **Code Location**: `core_model/code/thermal_wear_model.py:276` & `src/dep/degradation.py:349-350`
* **What It Does**: Models explosive sub-surface rubber cratering above $T_{\text{blister}}$ ($w_{b1} = 5.0\times 10^{-5}, w_{b2} = 1.7$).

---

### Formula 26: Tri-Mechanism Degradation Rate Superposition ($\dot{D}$)
```text
D_dot_total = w_dot_p + w_dot_g + w_dot_b
```
* **Tier**: Tier 2 (Superposition Assumption)
* **Source of Truth**: West & Limebeer (2020), Section IV, Eq. (14).
* **Code Location**: `core_model/code/thermal_wear_model.py:278` & `src/dep/degradation.py:352`
* **What It Does**: Sums abrasion, cold graining, and thermal blistering into total instantaneous damage rate.

---

### Formula 27: Cumulative Tyre Mechanical Damage State ($D$)
```text
D(t) = Integral_0^t [ D_dot_total(tau) ] dtau
```
* **Tier**: Tier 2 (State-Space Formulation)
* **Source of Truth**: Tremlett & Limebeer (2016); West & Limebeer (2020).
* **Code Location**: `core_model/code/thermal_wear_model.py:279` & `src/dep/degradation.py:413-422`
* **What It Does**: Integrates cumulative damage over the stint ($0.0 \le D \le 1.0$).

---

# Group 6: Dynamic Grip Degradation & Lap Time Pace Loss

### Formula 28: Instantaneous Grip Loss from Mechanical Damage
```text
Psi_wear(D) = 1.0 - lambda_wear * D   (lambda_wear approx 0.25)
```
* **Tier**: Tier 3 (TrackShift Linear Taylor Surrogate)
* **Source of Truth**: TrackShift engineering assumption; West & Limebeer (2020).
* **Code Location**: `core_model/code/thermal_wear_model.py:287`
* **What It Does**: Quantifies permanent, irreversible chemical grip loss due to rubber depletion.

---

### Formula 29: Effective Friction Coefficient Multiplicative Surrogate ($\mu_{\text{eff}}$)
```text
mu_eff = mu_0 * ( 1.0 - lambda_wear * D ) * Phi_thermal(T_tread)
```
* **Tier**: Tier 3 (TrackShift Separable Surrogate)
* **Source of Truth**: TrackShift Engineering Hypothesis; separation of thermal and wear variables.
* **Code Location**: `core_model/code/thermal_wear_model.py:289`
* **What It Does**: Transparent grip decay combining baseline friction $\mu_0$, wear damage $D$, and thermal efficiency $\Phi$.

---

### Formula 30: Compound Thermal Plateau Grip Window Function ($\Phi_{\text{thermal}}$)
```text
half_window = 0.5 * T_window
excess_temp = max( 0.0, |T_tread - T_opt| - half_window )
Phi_thermal = max( 0.70, 1.0 - k_thermal * (excess_temp / half_window)^2 )
```
* **Tier**: Tier 3 (Empirical Parabolic Plateau with Floor)
* **Source of Truth**: Pirelli compound operating envelopes; TrackShift surrogate ($k_{\text{thermal}} = 0.35$).
* **Code Location**: `core_model/code/thermal_wear_model.py:282-284`
* **What It Does**: Delivers $100\%$ grip inside the compound's optimal window, with parabolic drop-off capped at a $70\%$ floor.

---

### Formula 31: Absolute Peak Chemical Grip Calibration ($\mu_0$)
```text
mu_0(SOFT) = 1.55,   mu_0(MEDIUM) = 1.45,   mu_0(HARD) = 1.35
```
* **Tier**: Tier 3 (Motorsport Benchmark Priors)
* **Source of Truth**: Pirelli Formula 1 benchmark friction baselines.
* **Code Location**: `core_model/code/thermal_wear_model.py:37-64`
* **What It Does**: Sets fresh-tyre peak friction capability per compound.

---

### Formula 32: Tyre-Attributable Lap Pace Loss Mapping ($\Delta t_{\text{pred}}$)
```text
Delta t_pred = k_pace_loss * ( 1.0 - mu_eff / mu_0 )
```
* **Tier**: Tier 3 (Linearized Vehicle Dynamics Sensitivity)
* **Source of Truth**: Analytical 1st-order Taylor series expansion of cornering lap time ($k_{\text{pace loss}} = 6.5\text{ s}$).
* **Code Location**: `core_model/code/thermal_wear_model.py:293`
* **What It Does**: Converts physical friction coefficient loss into timing seconds on the pit wall.

---

# Group 7: Confounder Corrections & Practice Stint Fitting

### Formula 33: Confounder-Decoupled Tyre Pace Observation
```text
t_lap,corrected = t_lap,raw - Delta t_fuel - Delta t_rubber - Delta t_traffic
```
* **Tier**: Tier 3 (Telemetry Filtering & Confounder Decoupling)
* **Source of Truth**: TrackShift Data Engineering Pipeline; Milliken & Milliken (1995).
* **Code Location**: `src/iep/physics_proxies.py:210-245`
* **What It Does**: Strips fuel mass and track evolution away from raw timing to reveal pure tyre grip.

---

### Formula 34: Fuel Mass Burn-Off Correction Law ($\Delta t_{\text{fuel}}$)
```text
Delta t_fuel(k) = -beta_fuel * ( m_fuel(k) - m_fuel,init )
```
* **Tier**: Tier 3 (Empirical Motorsport Prior)
* **Source of Truth**: Milliken & Milliken (1995), Chapter 16 ($\beta_{\text{fuel}} = 0.033\text{ s/kg}$).
* **Code Location**: `src/iep/physics_proxies.py:165-185` & `post_race_validation/code/stint_reconstructor.py:38`
* **What It Does**: Removes the $3.0\text{ s}$ per lap car acceleration gained from burning off $100\text{ kg}$ of fuel.

---

### Formula 35: Continuous Stint Age Normalization Mapping
```text
a = k - k_stint_start + 1.0
```
* **Tier**: Tier 3 (Indexing Normalization)
* **Source of Truth**: Standard stint alignment protocol.
* **Code Location**: `src/dep/degradation.py:697`
* **What It Does**: Zero-indexes laps completed on a specific set of tyres.

---

### Formula 36 & 37: Stint Observed Degradation Polynomial Representation
```text
Delta t_deg(t)       = (alpha * t) + (beta * t^2)
Predicted_LapTime(t) = Base_Pace + (alpha * t) + (beta * t^2)
```
* **Tier**: Tier 3 (Orthogonal Polynomial Regression)
* **Source of Truth**: Pirelli Motorsport Engineering empirical degradation protocols; West & Limebeer (2020).
* **Code Location**: `src/dep/degradation.py:480-484, 521-549`
* **What It Does**: Fits linear steady wear ($\alpha \cdot t$) and quadratic cliff curvature ($\beta \cdot t^2$).

---

### Formula 38: Practice-to-Race Physical Wear Calibration Transfer
```text
w_p1,Race = w_p1,Practice * ( S_asphalt,Race / S_asphalt,Practice ) * exp( gamma_T * ( T_track,Race - T_track,Practice ) )
```
* **Tier**: Tier 3 (TrackShift Bayesian Physical Transfer)
* **Source of Truth**: Arrhenius thermo-mechanical scaling across sessions.
* **Code Location**: `post_race_validation/code/practice_degradation_inferer.py:145-165`
* **What It Does**: Updates Saturday practice wear rates to Sunday race weather before lights out.

---

# Group 8: Cliff Changepoint & Post-Race Validation Metrics

### Formula 39: Degradation Cliff Discrete Curvature Changepoint Diagnostic ($t_{\text{cliff}}$)
```text
Marginal Rate:  d(Delta t_deg) / dt = alpha + 2 * beta * t
Cliff Lap:      t_cliff = ( Marginal_Threshold - alpha ) / ( 2 * beta )   (Threshold = 0.25 s/lap)
```
* **Tier**: Tier 4 / Diagnostic Metric (Analytical Derivative Threshold Crossing)
* **Source of Truth**: TrackShift PRD Engine 3 changepoint diagnostics.
* **Code Location**: `src/dep/degradation.py:531-534, 599-609`
* **What It Does**: Pinpoints the exact lap when staying out becomes slower than taking a 22-second pit stop.

---

### Formula 40: Apex Lateral Utilized Friction Estimator ($\mu_{\text{util}}$)
```text
mu_util = ( a_y / g ) / Gamma_aero
```
* **Tier**: Tier 4 / Diagnostic Metric (Non-Circular Telemetric Ground Truth)
* **Source of Truth**: Vehicle dynamics cornering equilibrium derivation.
* **Code Location**: `post_race_validation/code/telemetric_grip_validator.py:104`
* **What It Does**: Measures true physical tyre grip directly at the apex of high-speed corners (Barcelona T3, T9), avoiding circular lap-time reasoning.

---

### Formula 41: Lin's Concordance Correlation Coefficient ($\rho_c$)
```text
rho_c = ( 2 * rho * sigma_x * sigma_y ) / ( sigma_x^2 + sigma_y^2 + (mu_x - mu_y)^2 )
```
* **Tier**: Tier 4 / Diagnostic Metric (Biostatistical Agreement)
* **Source of Truth**: Lin, L. I. (1989), *Biometrics*, 45(1), 255–268.
* **Code Location**: `post_race_validation/code/operational_validator.py:78-85`
* **What It Does**: Evaluates both correlation and absolute slope/offset agreement between practice predictions and race truth.

---

### Formula 42: Strategic Pit Window Decision Error ($\Delta W_{\text{pit}}$)
```text
Delta W_pit = | k_pit,pred - k_pit,actual |
```
* **Tier**: Tier 4 / Operational Metric
* **Source of Truth**: TrackShift operational scorecard benchmark ($\le 1.0\text{ lap}$ target).
* **Code Location**: `post_race_validation/code/operational_validator.py:46`
* **What It Does**: Quantifies pit stop prediction error in integer race laps.

---

### Formula 43: Counterfactual Strategy Decision Attribution
```text
Delta t_strategy = t_actual_pit - t_optimal_counterfactual
```
* **Tier**: Tier 4 / Operational Metric
* **Source of Truth**: Post-race strategy debrief waterfall analysis.
* **Code Location**: `post_race_validation/code/operational_validator.py:112-130`
* **What It Does**: Calculates seconds won or lost by pitting on a specific lap versus the theoretical optimum.

---

### Formula 44: TrackShift Empirical Degradation Forecast Uncertainty Band ($\sigma_{\text{deg}}$)
```text
sigma_deg(t) = sqrt( sigma_alpha^2 * t^2 + sigma_beta^2 * t^4 + 2 * t^3 * Cov(alpha, beta) + sigma_residual^2 )
```
* **Tier**: Tier 4 / Statistical Metric (Covariance Propagation)
* **Source of Truth**: Standard error propagation across polynomial regression parameters.
* **Code Location**: `post_race_validation/code/practice_degradation_inferer.py:210-225`
* **What It Does**: Produces the $90\%$ confidence bounds ($\pm 0.15\text{ s}$) displayed on the pit-wall degradation chart.

---

### Formula 45: Bounded Calibration Reliability Confidence Score ($C_{\text{rel}}$)
```text
C_rel = min( 1.0, ( N_practice / N_target ) * exp( - |Delta T_track| / tau_T ) )
```
* **Tier**: Tier 4 / Diagnostic Metric (Bounded Exponential Trust Score)
* **Source of Truth**: TrackShift Diagnostic Metric ($N_{\text{target}} = 5, \tau_T = 15.0^\circ\text{C}$).
* **Code Location**: `post_race_validation/code/post_race_validator.py:175`
* **What It Does**: Outputs a $0.0\text{--}1.0$ trust score telling race engineers whether to trust the pre-race tyre forecast.

---

# Group 9: 2024 FIA Regulatory Boundary Conditions & Hidden Features

### Formula 46: 2024 Blanket Exit Thermal Deficit Boundary Condition
```text
T_tread(t=0) = T_blanket,max - lambda_unplugged * Delta t_unplugged
T_tread(t=0) approx 70.0°C - 0.035 * (300 s) approx 59.5°C
```
* **Tier**: Tier 3 / Regulatory Boundary Prior
* **Source of Truth**: FIA Technical Regulations Art 10.8.4 ($70^\circ\text{C}$ cap) & Sporting Regulations Art 44.4.b (5-min disconnect).
* **Code Location**: `core_model/code/thermal_wear_model.py:207-210` & `docs/REGULATORY_HIDDEN_FEATURES_ANALYSIS.md`
* **What It Does**: Initializes tyre ODEs with the legal $35^\circ\text{C}$ out-lap thermal deficit instead of assuming tyres start at operating temperature.

---

### Formula 47: Dynamic Axle Load Balance Migration ($W_{\text{dist}}$)
```text
W_dist(t) = 1.0 + gamma_axle * ( m_fuel(t) / m_fuel,init - 0.5 )
Q_frict,scaled(t) = Q_frict,raw(t) * W_dist(t)
```
* **Tier**: Tier 3 / Regulatory Boundary Prior
* **Source of Truth**: 2024 FIA Technical Regulations Art 4.1 ($798\text{ kg}$ dry mass), Art 4.2 ($44.5\%\text{--}46.0\%$ front axle distribution), and Art 6.1.2 (Fuel cell behind cockpit).
* **Code Location**: `post_race_validation/code/post_race_validator.py:105-113`
* **What It Does**: Models forward migration of the car's center of mass as $100\text{ kg}$ of fuel burns off behind the cockpit.

---

### Formula 48: Lap 2 Early DRS Wake Downforce Loss & Slip Scaling ($\eta_{\text{wake}}$)
```text
eta_wake(k) = 1.0 + Delta Q_drs * exp( -(k - 1) / tau_train )   (for 1 <= k <= 5)
Q_frict,drs(k) = Q_frict(k) * eta_wake(k)
```
* **Tier**: Tier 3 / Regulatory Boundary Prior
* **Source of Truth**: 2024 FIA Sporting Regulations Article 22.1.c (DRS enabled after Lap 1 / at Lap 2).
* **Code Location**: `post_race_validation/code/post_race_validator.py:120-135`
* **What It Does**: Models accelerated early-stint sliding and overheating caused by dense DRS trains forming on Lap 2.

---

### Formula 49: Sticker Tyre Mold-Release Micro-Adhesion Deficit
```text
mu_0(k=1) = mu_0 * ( 1.0 - Delta mu_release )   (Delta mu_release approx 0.04)
```
* **Tier**: Tier 3 / Regulatory Boundary Prior
* **Source of Truth**: 2024 FIA Sporting Regulations Article 30 (Tyre Allocation & Electronic Return Ledger).
* **Code Location**: `post_race_validation/code/post_race_validator.py:140-150`
* **What It Does**: Models the lower grip on Lap 1 of a brand-new sticker tyre before the chemical mold-release layer is scrubbed away.
