# Component 02: Data Preprocessing Pipeline (PIP)

> **Source Location**: [`src/pip/preprocessing.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/pip/preprocessing.py)  
> **Pipeline Position**: Stage 2 (`DIP` -> `PIP` -> `IEP` -> `DEP` -> `CMP` -> `Validation` -> `Console`)  
> **Primary Purpose**: Clean raw lap timing records by enforcing 7 domain-specific motorsport filters. Removes pit-lane speed limiter artifacts, Safety Car periods, transponder anomalies, track-limits deletions, cold-tyre scrub laps, and traffic outliers so downstream regression models learn pure tyre degradation rather than external race chaos.

---

## 1. Engineering Motivation & Problem Statement

In Formula 1 timing data, a driver's lap time is constantly contaminated by events that have nothing to do with tyre degradation:
1. **Pit Lane Delays**: Pit in-laps and out-laps are 15 to 25 seconds slower due to the 80 km/h pit-lane speed limiter.
2. **Neutralized Races**: Safety Car (SC) and Virtual Safety Car (VSC) periods force drivers to lap 30 to 45 seconds off the pace to comply with FIA delta times.
3. **Scrub-in Anomalies**: Brand-new "sticker" tyres feature a slippery mold-release chemical coating and enter the track cold (~65°C from 2024 heating blankets instead of their ~100°C target operating window). Lap 1 is artificially slow and does not reflect steady-state wear.
4. **Traffic & Driver Errors**: Locking a brake into Turn 10, running wide onto the kerbs, or backing off to let a frontrunner lap under blue flags introduces multi-second pace spikes.

If raw laps are passed directly to machine learning or polynomial wear models, the algorithms falsely attribute traffic jams and safety cars to catastrophic tyre wear. The **Data Preprocessing Pipeline (PIP)** solves this by enforcing an auditable 7-stage filter cascade.

---

## 2. Component Architecture: The 7 Sequential Motorsport Filters

Every lap in the session must pass all 7 boolean gates to qualify as a **Clean Racing Lap**:

```text
                                 PIP FILTER CASCADE
                                 
              [Raw Laps Ingested from DIP SessionDataset]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Filter 1: Pit In/Out  │  Drops in-laps and out-laps
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Filter 2: Green Flag  │  Enforces TrackStatus == "1"
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Filter 3: Transponder │  Checks IsAccurate == True
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Filter 4: Track Limits│  Drops Deleted == True
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Filter 5: Scrub Warmup│  Purges tyre_life <= 1.0
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Filter 6: Pace Outlier│  Rejects > 2.0s Rolling Median
                     └───────────┬───────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Filter 7: Stint Guard │  Requires >= 4 Surviving Laps
                     └───────────┬───────────┘
                                 ▼
         ┌────────────────────────────────────────────────┐
         │               LapFilterResult                  │
         │  - clean_laps (Pristine laps for IEP/DEP)      │
         │  - rejected_laps (Annotated with failure tags) │
         │  - report (Auditable retention metrics)        │
         └────────────────────────────────────────────────┘
```

---

## 3. Mathematical Logic for Each Filter

### Filter 1: Pit In / Pit Out Detection
```text
Condition:
    pass_pit = is_null(pit_in_time_s) AND is_null(pit_out_time_s)
```
- **Motorsport Intuition**: In-laps include deceleration to the 80 km/h pit speed limiter; out-laps include stationary box dwell time and acceleration from the pit exit line. Neither represents track pace.

### Filter 2: Green Flag Enforcement
```text
Condition:
    pass_track_status = (track_status == "1")
```
- **Motorsport Intuition**: FastF1 tracks FIA race control status codes:
  - `1`: All sectors Green
  - `2`: Yellow flag in at least one sector
  - `4`: Safety Car deployed
  - `5`: Red Flag session stoppage
  - `6`: Virtual Safety Car (VSC)
  - `7`: VSC ending
- Any lap with `track_status != "1"` is corrupted by neutralized delta pacing.

### Filter 3: Transponder Integrity & Feasibility
```text
Condition:
    pass_timing_accuracy = (is_accurate == True) AND (t_min <= lap_time_s <= t_max)
```
- **Default Bounds**: `t_min = 50.0 s`, `t_max = 180.0 s`.
- **Motorsport Intuition**: Transponder loops occasionally suffer RF interference or miss a vehicle passage, recording split times as 0.000 or combining two laps into a single 3-minute entry.

### Filter 4: Track Limits Deletion Purge
```text
Condition:
    pass_track_limits = (deleted == False)
```
- **Motorsport Intuition**: Under FIA Sporting Regulations Article 33.3, drivers leaving track boundaries without justifiable reason have their lap times deleted. Such laps frequently involve kerb-hopping or off-track excursions that do not represent steady tyre load.

### Filter 5: Stint Warm-up & Scrub-in Purge
```text
Condition:
    pass_warmup = (tyre_life > 1.0)
```
- **Motorsport Intuition**: On Lap 1 of any stint, the tyre carcass is not yet in thermal equilibrium with the tread, and the surface is coated in slippery mold-release compound. Excluding Lap 1 prevents cold-tyre grip deficits from biasing degradation curves.

### Filter 6: Non-Racing Pace Outlier Purge (Rolling Median)
```text
Condition:
    Let M_roll(i) = RollingMedian(lap_time_s, window=5, center=True)
    pass_pace_outlier = (lap_time_s(i) - M_roll(i)) <= Delta_threshold
```
- **Default Parameter**: `Delta_threshold = 2.0 s`.
- **Motorsport Intuition**: If a driver encounters blue-flag traffic, locks a wheel into Turn 1, or charges their hybrid battery (ERS harvest lap), their pace will spike 2 to 5 seconds slower than adjacent laps. A centered rolling median detects and purges these isolated incidents without distorting the underlying degradation trend.

### Filter 7: Minimum Stint Length Guard
```text
Condition:
    pass_stint_length = (count(valid_laps_in_stint) >= N_min)
```
- **Default Parameter**: `N_min = 4 laps`.
- **Motorsport Intuition**: Fitting a 2nd or 3rd-order degradation polynomial to a 2-lap or 3-lap stint creates mathematical over-fitting and infinite derivative slopes. Stints with fewer than 4 clean laps are purged from regression training.

---

## 4. Data In / Data Out Specification

### Data In (Inputs to PIP)

PIP accepts the `laps` DataFrame from `SessionDataset` (Component 01).

| Column Name | Type | Physical Units | Example |
| :--- | :--- | :--- | :--- |
| `lap_number` | `int` | dimensionless | `14` |
| `driver` | `str` | 3-letter code | `"HUL"` |
| `stint` | `int` | index | `2` |
| `compound` | `str` | string | `"MEDIUM"` |
| `tyre_life` | `float` | laps | `8.0` |
| `lap_time_s` | `float` | seconds | `81.452` |
| `track_status` | `str` | string code | `"1"` |
| `is_accurate` | `bool` | boolean | `True` |
| `pit_in_time_s` | `float` | seconds / NaN | `NaN` |
| `pit_out_time_s` | `float` | seconds / NaN | `NaN` |
| `deleted` | `bool` | boolean | `False` |

---

### Data Out (Outputs from PIP)

The method `PreprocessingPipeline.process(laps_df)` returns a strongly typed **`LapFilterResult`**:

```python
@dataclass
class LapFilterResult:
    clean_laps: pd.DataFrame
    rejected_laps: pd.DataFrame
    report: FilteringReport
```

#### Output 1: `clean_laps` (The Golden Racing Dataset)
Contains only laps that satisfied all 7 filters. All original columns are preserved, augmented with:
- `is_clean_racing_lap = True` (boolean marker)
- **Downstream Consumer**: Handed directly to Component 03 (`IEP`) for physics proxy calculation and fuel burn decoupling.

#### Output 2: `rejected_laps` (The Auditable Rejection Ledger)
Unlike black-box scripts that delete rows silently, PIP preserves every discarded lap annotated with 7 diagnostic booleans:
- `pass_pit` (`bool`)
- `pass_track_status` (`bool`)
- `pass_timing_accuracy` (`bool`)
- `pass_track_limits` (`bool`)
- `pass_warmup` (`bool`)
- `pass_pace_outlier` (`bool`)
- `pass_stint_length` (`bool`)

An engineer can query any lap: *"Why was Lap 22 dropped?"* -> `pass_pace_outlier == False` (traffic delay of +3.4s).

#### Output 3: `FilteringReport` (Executive Audit Summary)
```text
============================================================
TrackShift Preprocessing Pipeline (PIP) - Audit Summary
============================================================
Raw Laps Ingested:    66
Clean Laps Retained:  52
Laps Excluded:        14
Overall Retention:    78.79%
------------------------------------------------------------
Filter Name                      | Rejected | Remaining | Retention
------------------------------------------------------------
Filter 1: Pit In/Out Removal     | 4        | 62        |  93.94%
Filter 2: Green Flag Enforcement | 3        | 59        |  95.16%
Filter 3: Timing Accuracy Check  | 0        | 59        | 100.00%
Filter 4: Track Limits Deletion  | 1        | 58        |  98.31%
Filter 5: Stint Warm-up          | 2        | 56        |  96.55%
Filter 6: Pace Outliers (>2.0s)  | 4        | 52        |  92.86%
Filter 7: Minimum Stint Length   | 0        | 52        | 100.00%
============================================================
```
