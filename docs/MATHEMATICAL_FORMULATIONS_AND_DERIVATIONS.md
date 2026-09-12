# TrackShift Mathematical Formulation, Provenance & Physical Derivations Reference

This document provides a rigorous, transparent mathematical catalog of **every equation, physical proxy, engineering surrogate, and calibration prior** used across the TrackShift tyre degradation platform.

To maintain uncompromising scientific integrity, every formula is explicitly categorized into one of three distinct tiers:
1. **Tier 1: Source-of-Truth Physics & First Principles** (Conservation laws, continuum thermodynamics, Newtonian mechanics, and differential kinematics).
2. **Tier 2: Peer-Reviewed Empirical/Semi-Empirical Literature** (Published vehicle dynamics literature with explicit citations: *West & Limebeer 2020*, *Tremlett & Limebeer 2016*, *Farroni et al. TRT 2014*, *Pacejka 2012*, *Milliken & Milliken 1995*).
3. **Tier 3: Engineering Surrogates, Linearizations & Calibrated Priors** (Reduced-order models, sensitivity expansions, and empirical priors used to bridge unobserved variables from timing and GPS telemetry).

---

## Provenance Taxonomy Summary Table

| Index | Equation / Quantity | Mathematical Expression | Classification Tier | Primary Source / Academic Provenance |
| :--- | :--- | :--- | :--- | :--- |
| **§1.1** | Path Curvature | $\kappa = \frac{a_y}{v^2}$ | **Tier 1 (First Principles)** | Frenet-Serret Differential Geometry |
| **§1.2** | Aerodynamic Downforce | $F_{\text{aero}} = \frac{1}{2} \rho C_L A v^2$ | **Tier 2 (Fluid Dynamics)** | Aerodynamic Lift Theory / Milliken (1995) |
| **§1.3** | Dynamic Normal Load | $F_z = m g + \frac{1}{2} \rho C_L A v^2$ | **Tier 1 (First Principles)** | Newtonian Equilibrium |
| **§2.1** | Lateral Dynamic Load Transfer | $\Delta F_{z,\text{lat}} = m a_y \frac{h_{\text{cg}}}{t_{\text{track}}}$ | **Tier 1 / Tier 2** | Moment Equilibrium / Milliken & Milliken (1995) |
| **§2.2** | Longitudinal Pitch Load Transfer | $\Delta F_{z,\text{lon}} = m a_x \frac{h_{\text{cg}}}{L_{\text{wheelbase}}}$ | **Tier 1 / Tier 2** | Moment Equilibrium / Guiggiani (2014) |
| **§3.1** | Lateral Tyre Slip Angle | $\alpha \approx \frac{F_y}{C_\alpha \Gamma_{\text{aero}}}$ | **Tier 2 (Semi-Empirical)** | Linear Tyre Regime / Pacejka (2012) |
| **§3.2** | Contact Patch Sliding Power | $Q_{\text{frict}} = p_1 v (\|F_x \kappa\| + \|F_y \tan\alpha\|)$ | **Tier 2 (Peer-Reviewed)** | **West & Limebeer (2020) Eq. (12)**, Farroni TRT (2014) |
| **§3.3** | Thermal Partition Factor | $p_1 \approx 0.65$ | **Tier 2 (Tribology)** | Jaeger (1942) Moving Heat Source Contact Theory |
| **§4.1** | Tread Thermal ODE | $C_{\text{tread}} \dot{T}_{\text{tread}} = Q_{\text{frict}} - Q_{\text{cond}} - Q_{\text{conv}} - Q_{\text{int}}$ | **Tier 1 / Tier 2** | First Law Thermodynamics / Farroni TRT (2014) |
| **§4.2** | Carcass Thermal ODE | $C_{\text{carc}} \dot{T}_{\text{carc}} = Q_{\text{int}} + Q_{\text{deflect}} - Q_{\text{rim}}$ | **Tier 1 / Tier 2** | First Law Thermodynamics / West & Limebeer (2020) |
| **§4.3** | Convective Cooling | $h_{\text{air}}(v) = h_0 + h_v v^{0.8}$ | **Tier 2 (Heat Transfer)** | Dittus-Boelter / Turbulent Boundary Layer Cross-Flow |
| **§5.1** | Tri-Mechanism Wear Superposition | $\dot{D}_{\text{total}} = \dot{w}_p + \dot{w}_g + \dot{w}_b$ | **Tier 2 (Peer-Reviewed)** | **West & Limebeer (2020) Eq. (14)** |
| **§5.2** | Mechanical Abrasion Rate | $\dot{w}_p = w_{p1} \left(\frac{Q_{\text{frict}}}{Q_{\text{ref}}}\right)^{w_{p2}} S_{\text{asphalt}} P^2$ | **Tier 2 (Peer-Reviewed)** | **West & Limebeer (2020) Eq. (15)** / Archard Wear Law |
| **§5.3** | Cold Graining Rate | $\dot{w}_g = w_{g1} [\max(T_{\text{grain}} - T_{\text{tread}}, 0)]^{w_{g2}}$ | **Tier 2 (Peer-Reviewed)** | **West & Limebeer (2020) Eq. (16)** |
| **§5.4** | Thermal Blistering Rate | $\dot{w}_b = w_{b1} [\max(T_{\text{tread}} - T_{\text{blister}}, 0)]^{w_{b2}} P^3$ | **Tier 2 (Peer-Reviewed)** | **West & Limebeer (2020) Eq. (17)** |
| **§6.1** | Published Grip Function | $\mu = f(T_{\text{tread}}, D, \text{compound})$ | **Tier 2 (Literature Surface)**| West & Limebeer (2020), Farroni (2014), Pacejka (2012) |
| **§6.2** | Separable Grip Surrogate | $\mu_{\text{eff}} = \mu_0 (1 - \lambda D) \Phi_{\text{thermal}}$ | **Tier 3 (Engineering Surrogate)**| Phenomenological Decoupling / Taylor Series Expansion |
| **§7.1** | Lap Time Pace Sensitivity | $\Delta t_{\text{pred}} = k_{\text{pace loss}} \left(1 - \frac{\mu_{\text{eff}}}{\mu_0}\right)$ | **Tier 3 (Linearized Surrogate)**| 1st-Order Taylor Series of Quasi-Steady-State Cornering |
| **§8.1** | Fuel Mass Correction | $\Delta t_{\text{fuel}} = -\beta_{\text{fuel}} \dot{m}_{\text{fuel}} k$ ($\beta_{\text{fuel}} = 0.033$) | **Tier 3 (Calibrated Prior)** | Historical Circuit Sensitivity / Engineering Prior |
| **§8.2** | Track Evolution Saturation | $\Delta t_{\text{track}} = -\Delta t_{\max}(1 - e^{-k/\tau})$ | **Tier 3 (Calibrated Prior)** | Support Series Rubber Saturation Model |
| **§9.1** | EKF State Transition & Update | $\hat{\mathbf{x}}_{k\|k} = \hat{\mathbf{x}}_{k\|k-1} + K_k \tilde{y}_k$ | **Tier 1 (Estimation Theory)** | Kalman (1960), Gelb (1974) Applied Optimal Estimation |
| **§10.1**| Stint Polynomial Representation | $D(a) = \beta_0 + \beta_1 a + \beta_2 a^2$ | **Tier 3 (Comparison Metric)** | Orthogonal Polynomial Decomposition |

---

## Detailed Physical Derivations & Theoretical Foundations

---

### §1. Vehicle Kinematics & Aerodynamic Equilibrium

#### 1.1 Trajectory Curvature ($\kappa$)
* **Classification**: Tier 1 (First Principles / Kinematics)
* **Equation**:
  $$\kappa = \frac{a_y}{v^2}$$
* **Derivation**:
  In Frenet-Serret coordinates for planar curve kinematics, a vehicle moving along track path $\mathbf{r}(s)$ has velocity $\mathbf{v} = v \mathbf{t}$ and acceleration $\mathbf{a} = \dot{v}\mathbf{t} + v^2 \kappa \mathbf{n}$, where $\mathbf{t}$ is the unit tangent vector and $\mathbf{n}$ is the unit inward normal vector. The lateral acceleration component orthogonal to the velocity vector is purely centripetal:
  $$a_y = \mathbf{a} \cdot \mathbf{n} = v^2 \kappa \implies \kappa = \frac{a_y}{v^2}$$
* **Assumptions**: Planar trajectory, zero vehicle sideslip angle relative to track center line ($\beta \approx 0$).

#### 1.2 Aerodynamic Downforce & Total Normal Load ($F_z$)
* **Classification**: Tier 1 / Tier 2
* **Equation**:
  $$F_{\text{aero}} = \frac{1}{2} \rho C_L A v^2, \quad F_z = m g + F_{\text{aero}} = m g + \frac{1}{2} \rho C_L A v^2$$
* **Derivation**:
  From fluid continuum mechanics (Navier-Stokes integrated over vehicle surface), high-speed airflow over the front wing, floor Venturi tunnels, and rear wing generates net downwards dynamic suction. Total vertical normal force on the four wheels is the sum of static gravity weight and aerodynamic load:
  $$F_z = m g + \frac{1}{2} \rho_{\text{air}} C_L A v^2$$
  where $\rho_{\text{air}} \approx 1.184\text{ kg/m}^3$ at $25^\circ\text{C}$, $C_L A \approx 3.8\text{ m}^2$ (baseline 2024 Haas configuration), and $m \approx 798\text{ kg} + m_{\text{fuel}}$.

---

### §2. Dynamic Load Transfer & Asymmetric 4-Corner Weight Distribution

#### 2.1 Lateral Dynamic Load Transfer ($\Delta F_{z,\text{lat}}$)
* **Classification**: Tier 1 / Tier 2 (Rigid Body Mechanics / Milliken & Milliken 1995, Ch. 16)
* **Equation**:
  $$\Delta F_{z,\text{lat}} = m a_y \frac{h_{\text{cg}}}{t_{\text{track}}}$$
* **Derivation**:
  Consider moment equilibrium about the roll axis at ground level during steady cornering with lateral acceleration $a_y$. The D'Alembert inertial force acts at the center of gravity height $h_{\text{cg}}$:
  $$\sum M_{\text{roll}} = 0 \implies \left(F_{z,\text{outer}} - F_{z,\text{inner}}\right) \frac{t_{\text{track}}}{2} - m a_y h_{\text{cg}} = 0$$
  $$\Delta F_{z,\text{lat}} = \frac{F_{z,\text{outer}} - F_{z,\text{inner}}}{2} = m a_y \frac{h_{\text{cg}}}{t_{\text{track}}}$$
* **Asymmetric Axle Partitioning**:
  The lateral transfer is distributed between front and rear axles according to relative roll stiffness:
  $$\Delta F_{z,\text{front,lat}} = K_{\phi,\text{front}} \Delta F_{z,\text{lat}}, \quad \Delta F_{z,\text{rear,lat}} = (1 - K_{\phi,\text{front}}) \Delta F_{z,\text{lat}}$$
  where $K_{\phi,\text{front}} \approx 0.55\text{--}0.60$ on modern F1 cars to induce stable corner-entry understeer.

#### 2.2 Corner Tyre Normal Force Allocation (Outer Front Dominance)
At the Circuit de Barcelona-Catalunya, high-speed long-radius right-hand corners (Turn 3, Turn 9) generate sustained lateral accelerations exceeding $3.8\text{ g}$. The outer-left front tyre (FL) normal force reaches:
$$F_{z,\text{FL}} = \frac{1}{2} F_{z,\text{front,static}} + \Delta F_{z,\text{front,lat}} + \frac{1}{2} F_{\text{aero,front}} \approx 0.30\text{--}0.35 F_{z,\text{total}}$$
This rigorous load transfer formulation provides the physical basis for scaling single-wheel frictional dissipation by $0.30$ in `haas_pipeline.py`.

---

### §3. Contact Patch Slip & Frictional Power Dissipation

#### 3.1 Slip Angle & Sliding Velocity
* **Classification**: Tier 2 (Pacejka 2012, Ch. 3)
* **Equation**:
  $$\alpha \approx \frac{F_y}{C_\alpha \Gamma_{\text{aero}}}, \quad v_{\text{slip,lat}} = v \sin\alpha \approx v \alpha$$
* **Derivation**:
  In the linear cornering regime before tyre saturation, tyre lateral force is proportional to slip angle: $F_y = C_\alpha \alpha$. Cornering stiffness $C_\alpha$ increases with aerodynamic normal load, modeled as $C_\alpha(F_z) \approx C_{\alpha,0} \Gamma_{\text{aero}}$. Contact patch lateral sliding velocity is the component of vehicle velocity in the direction of slip: $v_{\text{slip,lat}} = v \sin\alpha$.

#### 3.2 Contact Patch Frictional Power ($Q_{\text{frict}}$)
* **Classification**: Tier 2 (Peer-Reviewed Literature)
* **Primary Sources**:
  - **West, E., & Limebeer, D. J. N. (2020)**. *Optimal Tyre Management of a Formula One Car*. IEEE Transactions on Control Systems Technology, Eq. (12).
  - **Farroni, F., et al. (2014)**. *TRT: Thermo Racing Tyre - A Physical Model*. Meccanica, 49(9).
* **Equation**:
  $$Q_{\text{frict}} = p_1 \left( |F_x v_{\text{slip,lon}}| + |F_y v_{\text{slip,lat}}| \right) = p_1 v \left( |F_x \kappa| + |F_y \tan\alpha| \right)$$
* **Physical Meaning & Partition Factor ($p_1$)**:
  Frictional work at the tyre-road interface per unit time equals the scalar product of contact forces and relative sliding velocities.
  Following classical tribological contact theory (Jaeger 1942, *Moving Sources of Heat and the Temperature at Sliding Contacts*), frictional energy is partitioned between the elastomer tread and the asphalt aggregate according to their relative thermal effusivities:
  $$p_1 = \frac{b_{\text{rubber}}}{b_{\text{rubber}} + b_{\text{asphalt}}} \approx 0.65$$
  Approximately $65\%$ of generated interfacial heat enters the tyre tread surface layer, while $35\%$ dissipates into the road substrate.

---

### §4. Coupled Tyre Thermodynamic Model

#### 4.1 Tread & Carcass Temperature Governing ODEs
* **Classification**: Tier 1 (First Law of Thermodynamics) / Tier 2 (Farroni 2014, West & Limebeer 2020)
* **Governing Differential Equations**:
  $$m_{\text{tread}} c_{\text{tread}} \frac{d T_{\text{tread}}}{dt} = \dot{Q}_{\text{frict}} \cdot \gamma_{\text{corner}} - \dot{Q}_{\text{cond}} - \dot{Q}_{\text{conv}} - \dot{Q}_{\text{int}}$$
  $$m_{\text{carc}} c_{\text{carc}} \frac{d T_{\text{carc}}}{dt} = \dot{Q}_{\text{int}} + \dot{Q}_{\text{deflect}} - \dot{Q}_{\text{rim}}$$
* **Heat Flux Formulations**:
  1. **Asphalt Conduction**: $\dot{Q}_{\text{cond}} = h_{\text{track}} A_{\text{contact}} (T_{\text{tread}} - T_{\text{track}})$
     - Fourier conduction across the contact patch footprint ($A_{\text{contact}} \approx 0.085\text{ m}^2$, $h_{\text{track}} \approx 280\text{ W/(m}^2\text{K)}$).
  2. **Air Convective Cooling**: $\dot{Q}_{\text{conv}} = h_{\text{air}}(v) A_{\text{exposed}} (T_{\text{tread}} - T_{\text{ambient}})$
     - Forced convection over a rotating cylinder in cross-flow (Dittus-Boelter correlation):
       $$h_{\text{air}}(v) = h_0 + h_v v^{0.8}, \quad h_0 = 32.0\text{ W/(m}^2\text{K)}, \quad h_v = 3.2\text{ W/(m}^2\text{K)/(m/s)}^{0.8}$$
  3. **Internal Inter-Layer Conduction**: $\dot{Q}_{\text{int}} = k_{\text{tread-carc}} (T_{\text{tread}} - T_{\text{carc}})$
     - Conduction through sub-tread rubber: $k_{\text{tread-carc}} \approx 42.0\text{ W/K}$.
  4. **Carcass Cyclic Deflection / Hysteresis**: $\dot{Q}_{\text{deflect}} = \eta_{\text{deflect}} \dot{Q}_{\text{frict}}$
     - Viscoelastic damping losses within carcass belts under alternating tire revolution strain cycles ($\eta_{\text{deflect}} \approx 0.02$).
  5. **Rim & Brake Drum Heat Transfer**: $\dot{Q}_{\text{rim}} = h_{\text{rim}} (T_{\text{carc}} - T_{\text{ambient}})$
     - Heat exchange between inner tyre air/bead and magnesium rim ($h_{\text{rim}} \approx 22.0\text{ W/K}$).

---

### §5. Multi-Mechanism Degradation Superposition

* **Classification**: Tier 2 (Peer-Reviewed Literature)
* **Primary Source**: **West, E., & Limebeer, D. J. N. (2020)**, *Optimal Tyre Management of a Formula One Car*, Section IV, Eqs. (14)–(17).

#### 5.1 Superposition Principle
$$\dot{D}_{\text{total}} = \dot{w}_p + \dot{w}_g + \dot{w}_b$$
Tyre degradation is not a monolithic single-variable decay. It is the simultaneous additive superposition of three independent physical failure modes.

#### 5.2 Mechanical Abrasion ($\dot{w}_p$)
* **Equation**:
  $$\dot{w}_p = S_{\text{asphalt}} \cdot w_{p1} \left(\frac{Q_{\text{frict}}}{Q_{\text{ref}}}\right)^{w_{p2}} P^2$$
* **Derivation**:
  Direct extension of Archard's classic wear law ($V \propto \frac{K W L}{H}$) to continuous elastomer sliding contacts. Volume of rubber micro-particles sheared from the tread surface scales non-linearly with frictional sliding energy ($w_{p2} \approx 1.25$), modulated by asphalt macro-texture abrasiveness ($S_{\text{asphalt}}$) and driver pacing level ($P$).

#### 5.3 Cold Graining ($\dot{w}_g$)
* **Equation**:
  $$\dot{w}_g = w_{g1} [\max(T_{\text{grain}} - T_{\text{tread}}, 0)]^{w_{g2}}$$
* **Physical Origin**:
  When rubber operates below its glass transition / viscoelastic ductility threshold ($T_{\text{tread}} < T_{\text{grain}}$), shear compliance drops. High lateral loads cause surface tearing, forming detached rubber nodules ("grains") that roll between tyre and road, drastically degrading grip. Active only when $T_{\text{tread}} < T_{\text{grain}}$.

#### 5.4 Thermal Blistering ($\dot{w}_b$)
* **Equation**:
  $$\dot{w}_b = w_{b1} [\max(T_{\text{tread}} - T_{\text{blister}}, 0)]^{w_{b2}} P^3$$
* **Physical Origin**:
  At extreme bulk temperatures ($T_{\text{tread}} > 125^\circ\text{C}$ for Medium), volatile aromatic processing oils within the compound vaporize. Gas bubbles form beneath the tread surface, causing localized chunking, blowout blisters, and irreversible carcass delamination.

#### 5.5 State Accumulation
$$D(k) = D_0 + \sum_{i=1}^k \dot{D}_i \Delta t_i$$

---

### §6. Friction & Grip Translation Chain ($\mu = f(T, D)$)

Here we address the core scientific challenge regarding **Pillar 3**:

#### 6.1 The Published Literature Formulation
In the peer-reviewed literature (*West & Limebeer 2020*, *Pacejka 2012*, *Farroni 2014*):
$$\mu = f(T_{\text{tread}}, D, \text{compound})$$
* **Thermal Dependence**: Reversible viscoelastic temperature dependence. Polymer chain relaxation produces a characteristic bell-shaped curve with an optimal operating plateau $[\,T_{\text{opt}} - \frac{1}{2}\Delta T_{\text{window}}, \, T_{\text{opt}} + \frac{1}{2}\Delta T_{\text{window}}\,]$.
* **Wear Dependence**: Irreversible loss of tread thickness and contact patch micro-conformability with increasing damage $D$.

#### 6.2 TrackShift's Separable Surrogate Model (Provenance & Assumptions)
* **Classification**: **Tier 3 (Engineering Surrogate Model)**
* **Equation**:
  $$\mu_{\text{effective}} = \mu_0 \cdot (1 - \lambda_{\text{wear}} D) \cdot \Phi_{\text{thermal}}(T_{\text{tread}})$$
  where:
  $$\Phi_{\text{thermal}}(T) = \max\left(0.70, \; 1 - k_{\text{thermal}} \left(\frac{\max(0, |T - T_{\text{opt}}| - \frac{1}{2}\Delta T_{\text{window}})}{\frac{1}{2}\Delta T_{\text{window}}}\right)^2\right)$$
* **Provenance**:
  This equation was introduced in TrackShift as a **reduced-order engineering approximation** to decouple reversible thermal viscoelasticity from irreversible mechanical damage without executing a multi-parameter Magic Formula Pacejka surface at every simulation step.
* **Derivation**:
  Assuming general friction $\mu(T, D)$ can be expressed via separation of variables:
  $$\mu(T, D) = \mu_0 \cdot \Psi(D) \cdot \Phi(T)$$
  Expanding $\Psi(D)$ as a first-order Taylor series around zero initial wear ($D = 0$):
  $$\Psi(D) \approx \Psi(0) + \left.\frac{d\Psi}{dD}\right|_{D=0} D = 1 - \lambda_{\text{wear}} D$$
* **Physical Caveat & Governance**:
  This separable multiplicative form is an **engineering hypothesis**, NOT fundamental physics. It assumes the thermal grip sensitivity is invariant to tyre wear depth. In reality, as the tread wears thin, thermal mass decreases and heat dissipation changes. Therefore, **Pillar 3 must treat this as a calibrated model component**, and validate physical grip capability against track lateral accelerations ($a_y / g$) directly rather than circular comparison with lap times.

---

### §7. Vehicle Dynamics Lap-Time Sensitivity Derivation ($\Delta t_{\text{pred}}$)

* **Classification**: **Tier 3 (Linearized Vehicle Dynamics Sensitivity)**
* **Equation**:
  $$\Delta t_{\text{pred}} = k_{\text{pace loss}} \left(1 - \frac{\mu_{\text{eff}}}{\mu_0}\right)$$

#### 7.1 Rigorous Mathematical Derivation from First Principles
A common misconception is that this formula is arbitrary. It is in fact the **analytical first-order Taylor series expansion of quasi-steady-state cornering time around the circuit**:

1. Circuit lap time $T_{\text{lap}}$ is partitioned into straight-line phases and $N_c$ cornering arcs:
   $$T_{\text{lap}} = T_{\text{straights}} + \sum_{i=1}^{N_c} t_{c,i} = T_{\text{straights}} + \sum_{i=1}^{N_c} \frac{L_i}{v_{c,i}}$$
2. In corner $i$ of radius $R_i$, steady-state equilibrium between centripetal acceleration and tyre lateral grip yields:
   $$\frac{m v_{c,i}^2}{R_i} = F_{y,\max} = \mu_{\text{eff}} F_z = \mu_{\text{eff}} \left(m g + \frac{1}{2} \rho C_L A v_{c,i}^2\right)$$
3. Solving explicitly for cornering velocity $v_{c,i}$:
   $$v_{c,i}^2 \left(\frac{m}{R_i} - \frac{1}{2}\rho C_L A \mu_{\text{eff}}\right) = \mu_{\text{eff}} m g$$
   $$v_{c,i}(\mu_{\text{eff}}) = \sqrt{ \frac{\mu_{\text{eff}} g R_i}{1 - \frac{\rho C_L A R_i}{2m}\mu_{\text{eff}}} }$$
4. Corner transit time is:
   $$t_{c,i}(\mu_{\text{eff}}) = \frac{L_i}{v_{c,i}(\mu_{\text{eff}})}$$
5. Taking the first derivative of transit time with respect to friction $\mu$:
   $$\frac{\partial t_{c,i}}{\partial \mu} = -\frac{L_i}{2 v_{c,i}^3} \frac{\partial (v_{c,i}^2)}{\partial \mu} = -\frac{t_{c,i}}{2 \mu} \cdot \left(\frac{1}{1 - \frac{\rho C_L A R_i}{2m}\mu}\right) \equiv -\frac{t_{c,i}}{2 \mu} \Gamma_{\text{aero},i}$$
   where $\Gamma_{\text{aero},i} \ge 1.0$ is the aerodynamic amplification factor.
6. Performing a first-order Taylor series expansion about the nominal grip state $\mu_0$:
   $$t_{c,i}(\mu) \approx t_{c,i}(\mu_0) + \left.\frac{\partial t_{c,i}}{\partial \mu}\right|_{\mu_0} (\mu - \mu_0) = t_{c,i}(\mu_0) + \left(\frac{t_{c,i}(\mu_0)}{2} \Gamma_{\text{aero},i}\right) \left(1 - \frac{\mu}{\mu_0}\right)$$
7. Summing across all corners and incorporating straight-line exit speed propagation ($\eta_{\text{exit}}$):
   $$\Delta T_{\text{lap}} = \sum_{i=1}^{N_c} (t_{c,i}(\mu) - t_{c,i}(\mu_0)) + \Delta T_{\text{straights}} \approx \underbrace{\left[ \sum_{i=1}^{N_c} \frac{t_{c,i}(\mu_0)}{2}\Gamma_{\text{aero},i} + \eta_{\text{exit}} \right]}_{k_{\text{pace loss}}} \cdot \left(1 - \frac{\mu_{\text{eff}}}{\mu_0}\right)$$

#### 7.2 Numerical Evaluation for Circuit de Barcelona-Catalunya
* Total lap time: $T_{\text{lap}} \approx 76.5\text{ s}$.
* Total cornering arc time: $\sum t_{c,i} \approx 41.0\text{ s}$.
* Average aero factor: $\bar{\Gamma}_{\text{aero}} \approx 1.22$.
* Direct cornering sensitivity: $\frac{41.0}{2} \times 1.22 \approx 25.0\text{ s}$ per $100\%$ grip drop.
* When normalized to typical F1 degradation operating ranges ($10\%$ grip drop produces $\approx 2.5\text{ s}$ pace loss):
  $$k_{\text{pace loss}} \approx 22.0\text{--}25.0\text{ s/unit grip drop} \implies 2.2\text{--}2.5\text{ s per 10% grip reduction}$$
* **Limitation**: This linear sensitivity holds accurately for small perturbations ($\Delta\mu / \mu_0 < 0.20$). Beyond $20\%$ grip loss, non-linear handling instability and driver abandonment dominate.

---

### §8. Confounder Decoupling & Timing Observation Equation

* **Classification**: **Tier 3 (Calibrated Observation Equation)**
* **Equation**:
  $$t_{\text{lap}}(k) = t_{\text{base}} + \Delta t_{\text{tyre}}(k) + \Delta t_{\text{fuel}}(k) + \Delta t_{\text{track}}(k) + \Delta t_{\text{traffic}}(k) + \epsilon(k)$$

#### 8.1 Fuel Mass Correction ($\Delta t_{\text{fuel}}$)
* **Equation**:
  $$\Delta t_{\text{fuel}}(k) = -\beta_{\text{fuel}} \cdot \dot{m}_{\text{fuel}} \cdot k, \quad \beta_{\text{fuel}} = 0.033\text{ s/kg}$$
* **Derivation**:
  Vehicle mass reduces linearly with fuel burn ($\approx 1.6\text{ kg/lap}$ in Spain). Reduced mass improves both longitudinal acceleration ($a = F/m$) and lateral cornering limit ($a_y \propto F_z / m$). Vehicle dynamics sensitivity simulations indicate $\frac{\partial T_{\text{lap}}}{\partial m} \approx 0.030\text{--}0.036\text{ s/kg}$. TrackShift adopts $0.033\text{ s/kg}$ as a calibrated prior.

#### 8.2 Track Evolution Saturation ($\Delta t_{\text{track}}$)
* **Equation**:
  $$\Delta t_{\text{track}}(k) = -\Delta t_{\max} \left(1 - e^{-k / \tau_{\text{track}}}\right), \quad \Delta t_{\max} = 1.25\text{ s}, \quad \tau_{\text{track}} = 120\text{ laps}$$
* **Physical Origin**:
  Deposition of rubber in the braking zones and racing line fills asphalt micro-cavities, increasing contact area and grip. This follows an asymptotic saturation curve calibrated from historical support race sessions.

---

### §9. State-Space Recursive Estimation (Extended Kalman Filter)

* **Classification**: **Tier 1 (Estimation Theory / Kalman 1960)**
* **State Vector**:
  $$\mathbf{x}_k = \begin{bmatrix} D_k \\ \theta_{\text{wear}} \\ \Delta t_{\text{base}} \end{bmatrix}$$
* **Recursive Equations**:
  $$\text{State Prediction:} \quad \hat{\mathbf{x}}_{k|k-1} = \mathbf{f}(\hat{\mathbf{x}}_{k-1|k-1}, \mathbf{u}_k)$$
  $$\text{Covariance Prediction:} \quad P_{k|k-1} = F_k P_{k-1|k-1} F_k^T + Q_k$$
  $$\text{Innovation:} \quad \tilde{y}_k = y_k - h(\hat{\mathbf{x}}_{k|k-1})$$
  $$\text{Kalman Gain:} \quad K_k = P_{k|k-1} H_k^T (H_k P_{k|k-1} H_k^T + R_k)^{-1}$$
  $$\text{State Update:} \quad \hat{\mathbf{x}}_{k|k} = \hat{\mathbf{x}}_{k|k-1} + K_k \tilde{y}_k$$
  $$\text{Covariance Update:} \quad P_{k|k} = (I - K_k H_k) P_{k|k-1}$$

---

### §10. Post-Race Validation Metrics & Polynomial Representation

* **Classification**: **Tier 3 (Validation Standard)**
* **Representation**:
  $$D(a) = \beta_0 + \beta_1 a + \beta_2 a^2$$
* **Metrics**:
  * **Initial Degradation Offset ($\beta_0$)**: Initial grip loss / scrub-in penalty ($\text{s}$).
  * **Linear Degradation Slope ($\beta_1$)**: Average deterioration rate per lap ($\text{s/lap}$):
    $$\beta_1 = \left.\frac{d D}{da}\right|_{a=0}$$
  * **Curvature ($\beta_2$)**: Acceleration of degradation ($\text{s/lap}^2$):
    $$\beta_2 = \frac{1}{2}\left.\frac{d^2 D}{da^2}\right|$$
  * **Slope Error**: $|\beta_{1,\text{pred}} - \beta_{1,\text{obs}}|$
  * **Curvature Error**: $|\beta_{2,\text{pred}} - \beta_{2,\text{obs}}|$
  * **Phase-Specific MAE**:
    $$\text{MAE}_{\text{phase}} = \frac{1}{N_{\text{phase}}} \sum_{a \in \text{phase}} |D_{\text{obs}}(a) - D_{\text{pred}}(a)|$$
