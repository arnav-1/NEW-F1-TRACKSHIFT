# Component 01: Data Ingestion Pipeline (DIP)

> **Source Location**: [`src/dip/ingestion.py`](file:///c:/Users/daksh/Projects/Trackshiftv2/src/dip/ingestion.py)  
> **Pipeline Position**: Stage 1 (`DIP` -> `PIP` -> `IEP` -> `DEP` -> `CMP` -> `Validation` -> `Console`)  
> **Primary Purpose**: Ingest raw motorsport telemetry, timing, and meteorological records across 3 disparate data feeds, enforce strict schema validation, standardize all units to SI metric, and persist clean Apache Parquet files in a local cache.

---

## 1. Engineering Motivation & Problem Statement

Raw Formula 1 trackside telemetry is notoriously fragmented and difficult to process:
1. **Disparate Transport Layers**: Official transponder loop timing is provided via FastF1 (Python batch client wrapping Ergast/FIA timing), live race radio and stint markers come from the OpenF1 REST API, and ambient meteorological reanalysis is queried from Open-Meteo.
2. **Incompatible Data Types**: FastF1 returns Python `timedelta` objects (e.g., `0 days 00:01:21.452000`), strings, and integer codes. Downstream differential equation solvers and NumPy matrices require float seconds (`81.452 s`), kilometers per hour (`km/h`), and standard SI units.
3. **Missing Tyre Stint Boundaries**: Public timing APIs frequently drop tyre compound transition markers or fail to record pit stops occurring under Red Flag conditions.
4. **Network Volatility & API Rate Limits**: A pit-wall decision system cannot stall during a Grand Prix due to API HTTP 429 errors or server timeouts.

The **Data Ingestion Pipeline (DIP)** serves as the resilient front gate. It queries the external feeds, sanitizes types, reconstructs missing tyre stints locally, and serializes the data into Apache Parquet disk caches.

---

## 2. Component Architecture & Data Sources

```text
                                 DIP ARCHITECTURE FLOW
                                 
  [FastF1 API]                 [OpenF1 REST API]             [Open-Meteo API]
  - Lap timing splits          - Live tyre stint markers     - Hourly air temp
  - High-frequency telemetry   - Real-time pit notifications - Relative humidity
  - Weather & transponder      - Track status events         - Solar radiation
         │                             │                             │
         ▼                             ▼                             ▼
  ┌──────────────┐             ┌──────────────┐             ┌──────────────┐
  │FastF1Ingestor│             │OpenF1Ingestor│             │OpenMeteoIng  │
  └──────┬───────┘             └──────┬───────┘             └──────┬───────┘
         │                            │                            │
         └────────────────────┬───────┴────────────────────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │ DataIngestionPipeline    │  (Unified Facade)
                 │ - Schema Harmonization   │
                 │ - Type Normalization     │
                 │ - Local Stint Fallback   │
                 └────────────┬─────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │ DiskCacheManager         │  (Local Parquet Cache)
                 │ - data/cache/*.parquet   │
                 └────────────┬─────────────┘
                              ▼
                 ┌──────────────────────────┐
                 │ SessionDataset           │  (Typed Return Object)
                 └──────────────────────────┘
```

### The Three Ingestion Engines:

1. **`FastF1Ingestor`**:
   - Downloads official FIA transponder records: lap times, Sector 1/2/3 split times, speed traps, and deleted lap flags.
   - Extracts 10 Hz high-frequency chassis telemetry: speed `v(t)`, throttle position %, brake hydraulic pressure, engine RPM, gear selection, and Cartesian coordinates `(X, Y, Z)`.
   - Ingests trackside weather station samples: track surface temperature (`°C`), ambient temperature (`°C`), relative humidity (`%`), and wind speed/direction.

2. **`OpenF1Ingestor`**:
   - Queries `api.openf1.org/v1/stints` and `pit` endpoints to capture real-time pit entry and exit events.
   - **Autonomous Local Stint Deriver (`derive_stints_from_laps`)**: If the external OpenF1 server is unreachable, throttled, or returns null records, the ingestor triggers an internal heuristic that inspects the lap sequence, tracks non-null `pit_in_time_s` markers, and reconstructs the complete stint ledger locally.

3. **`OpenMeteoIngestor`**:
   - Queries global high-resolution meteorological models at the circuit's exact GPS latitude and longitude.
   - Supplies atmospheric pressure (`hPa`), solar irradiance (`W/m^2`), and dew point temperatures to calibrate track surface cooling models.

---

## 3. Data In / Data Out Specification

### Data In (Inputs to DIP)

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `year` | `int` | Yes | Championship calendar year | `2024` |
| `circuit` | `str` | Yes | Grand Prix venue or official name | `"Barcelona"` or `"Spain"` |
| `session_type` | `str` | Yes | Session identifier | `"FP1"`, `"FP2"`, `"FP3"`, `"Q"`, `"R"` |
| `driver` | `str` | Optional | 3-letter driver code (filters telemetry) | `"HUL"` (Nico Hülkenberg) |
| `team` | `str` | Optional | Constructor filter | `"Haas F1 Team"` |
| `force_refresh`| `bool` | Optional | If `True`, bypasses local Parquet cache | `False` |

---

### Data Out (Outputs from DIP)

DIP returns an immutable, strongly typed dataclass: **`SessionDataset`**.

```python
@dataclass
class SessionDataset:
    session_id: SessionIdentifier
    laps: pd.DataFrame
    telemetry: Dict[str, pd.DataFrame]
    weather: pd.DataFrame
    stints: pd.DataFrame
```

#### Schema: `laps` (Clean Lap Timing DataFrame)
| Column Name | Type | Physical Units | Description |
| :--- | :--- | :--- | :--- |
| `lap_number` | `int` | dimensionless | Completed lap index within session |
| `driver` | `str` | string code | 3-letter driver code (e.g. `"HUL"`) |
| `team` | `str` | string name | Team name (e.g. `"Haas F1 Team"`) |
| `stint` | `int` | count index | Stint number (1, 2, 3...) |
| `compound` | `str` | category | Pirelli tyre compound (`SOFT`, `MEDIUM`, `HARD`) |
| `tyre_life` | `float` | laps | Laps accumulated on this physical tyre set |
| `fresh_tyre` | `bool` | boolean | `True` if brand new sticker tyre, `False` if scrubbed |
| `lap_time_s` | `float` | seconds | Total lap duration in float seconds |
| `sector_1_time_s` | `float` | seconds | Sector 1 split duration |
| `sector_2_time_s` | `float` | seconds | Sector 2 split duration |
| `sector_3_time_s` | `float` | seconds | Sector 3 split duration |
| `speed_i1` | `float` | km/h | Speed trap at intermediate loop 1 |
| `speed_i2` | `float` | km/h | Speed trap at intermediate loop 2 |
| `speed_fl` | `float` | km/h | Speed trap across finish line |
| `speed_st` | `float` | km/h | Speed trap on main straight |
| `is_accurate` | `bool` | boolean | Transponder timing integrity verification |
| `track_status` | `str` | string code | FIA track condition (`1`=Green, `4`=SC, `6`=VSC) |
| `pit_in_time_s` | `float` | seconds / NaN | Timestamp crossing pit entry line |
| `pit_out_time_s` | `float` | seconds / NaN | Timestamp crossing pit exit line |
| `deleted` | `bool` | boolean | Track limits violation deletion flag |

#### Schema: `telemetry` (High-Frequency Car Sensor Channel)
Dictionary keyed by driver code containing 10 Hz telemetry:
| Column Name | Type | Physical Units | Description |
| :--- | :--- | :--- | :--- |
| `time_s` | `float` | seconds | Session elapsed time |
| `distance_m` | `float` | meters | Distance traveled along track centerline |
| `speed_kmh` | `float` | km/h | Linear chassis velocity |
| `throttle` | `float` | 0.0 to 100.0 % | Throttle pedal travel percentage |
| `brake` | `float` | 0.0 or 1.0 (or bar) | Brake activation / hydraulic pressure |
| `rpm` | `float` | rev/min | Internal combustion engine RPM |
| `gear` | `int` | 1 to 8 | Transmission gear ratio selection |
| `drs` | `int` | code (0, 8, 10, 12) | Drag Reduction System activation state |
| `x_m` | `float` | meters | Global Cartesian track X coordinate |
| `y_m` | `float` | meters | Global Cartesian track Y coordinate |
| `z_m` | `float` | meters | Elevation coordinate above sea level |

#### Schema: `weather` (Trackside Environmental Channel)
| Column Name | Type | Physical Units | Description |
| :--- | :--- | :--- | :--- |
| `time_s` | `float` | seconds | Timestamp of observation |
| `track_temp_c` | `float` | °C | Infrared sensor road surface temperature |
| `air_temp_c` | `float` | °C | Ambient dry-bulb air temperature |
| `humidity_pct` | `float` | % | Relative atmospheric humidity |
| `wind_speed_ms` | `float` | m/s | Anemometer wind speed |
| `wind_direction_deg` | `float` | degrees (0-360) | Wind compass heading |
| `rainfall` | `bool` | boolean | Trackside optical rain sensor detection |

---

## 4. Local Caching Strategy & Failure Modes

DIP incorporates the **`DiskCacheManager`** utilizing Apache Parquet storage:
- **Format**: Parquet files with Snappy compression. Parquet stores columnar metadata, preserving float64 precisions without ASCII truncation.
- **Cache Key**: `data/cache/{year}_{circuit}_{session_type}_{driver}.parquet`.
- **Latency Advantage**: Querying FastF1 across the network takes 3 to 15 seconds per session; loading from the Parquet disk cache takes less than 25 milliseconds.
- **Offline Reliability**: TrackShift operates seamlessly without an internet connection once sessions are cached.

```text
[Incoming Session Request]
           │
           ▼
   {Cache Hit in data/cache/?}
         ├──► YES ──► Load Parquet in <25ms ──► Construct SessionDataset
         │
         └──► NO  ──► Query FastF1 / OpenF1 ──► Sanitize & Convert Types
                                                    │
                                                    ▼
                                            Write to Parquet
                                                    │
                                                    ▼
                                           Construct SessionDataset
```
