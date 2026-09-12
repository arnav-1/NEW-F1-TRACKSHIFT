"""
TrackShift Preprocessing Pipeline (PIP).

This module implements the 7 domain-specific cleaning filters defined in the
TrackShift Specification (Engine 1: Preprocessing Pipeline). It isolates valid,
green-flag racing laps from noise, traffic, safety car interruptions, and non-racing pace.

The 7 Motorsport Cleaning Filters:
    1. Pit In / Pit Out Removal (Speed limiter and pit lane delta elimination)
    2. Track Status / Green Flag Only (TrackStatus == '1' strictly enforced)
    3. Timing Accuracy Filter (Transponder integrity; IsAccurate == True)
    4. Track Limits & Deleted Laps Filter (FIA track limits invalidation purge)
    5. Stint Warm-up / Out-lap Transient Filter (Cold tyre non-equilibrium scrub-in)
    6. Non-Racing Pace Outlier Purge (>2.0s rolling median delta rejection)
    7. Minimum Stint Length Threshold (Statistical power thresholding; >= 4 laps)

References:
    - West, E., & Limebeer, D. J. N. (2020). Optimal Tyre Management of a Formula One Car.
    - Tremlett, A. J., & Limebeer, D. J. N. (2016). Optimal Tyre Usage for a Formula One Car.
    - TrackShift Architecture: Engine 1 (PIP) Specification.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("trackshift.pip")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [PIP] %(message)s", datefmt="%H:%M:%S"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


@dataclass
class FilterStepMetric:
    """Diagnostic tracking for an individual filtering stage."""
    filter_name: str
    laps_in: int
    laps_rejected: int
    laps_remaining: int
    retention_rate_pct: float


@dataclass
class FilteringReport:
    """Comprehensive audit trail of preprocessing pipeline operations."""
    total_raw_laps: int
    total_clean_laps: int
    total_rejected_laps: int
    overall_retention_pct: float
    filter_breakdown: List[FilterStepMetric] = field(default_factory=list)

    def summary(self) -> str:
        """Generates human-readable summary table of filter performance."""
        lines = [
            "============================================================",
            "TrackShift Preprocessing Pipeline (PIP) - Audit Summary",
            "============================================================",
            f"Raw Laps Ingested:    {self.total_raw_laps}",
            f"Clean Laps Retained:  {self.total_clean_laps}",
            f"Laps Excluded:        {self.total_rejected_laps}",
            f"Overall Retention:    {self.overall_retention_pct:.2f}%",
            "------------------------------------------------------------",
            f"{'Filter Name':<32} | {'Rejected':<8} | {'Remaining':<9} | {'Retention'}",
            "------------------------------------------------------------",
        ]
        for step in self.filter_breakdown:
            lines.append(
                f"{step.filter_name:<32} | {step.laps_rejected:<8} | "
                f"{step.laps_remaining:<9} | {step.retention_rate_pct:>6.2f}%"
            )
        lines.append("============================================================")
        return "\n".join(lines)


@dataclass
class LapFilterResult:
    """Results container holding cleaned dataset, discarded outliers, and audit metrics."""
    clean_laps: pd.DataFrame
    rejected_laps: pd.DataFrame
    report: FilteringReport


class PreprocessingPipeline:
    """
    Engine 1: Preprocessing Pipeline (PIP).

    Executes sequential motorsport domain filters on lap timing series to isolate
    pure tyre degradation dynamics from environmental and operational artifacts.
    """

    def __init__(
        self,
        pace_outlier_threshold_s: float = 2.0,
        rolling_window_laps: int = 5,
        min_stint_length: int = 4,
        filter_warmup_lap: bool = True,
        max_lap_time_s: float = 180.0,
        min_lap_time_s: float = 50.0,
    ):
        """
        Initializes the Preprocessing Pipeline configuration.

        Args:
            pace_outlier_threshold_s: Maximum allowable pace delta (in seconds)
                above rolling median before a lap is flagged as traffic/mistake (default: 2.0s).
            rolling_window_laps: Window size (in laps) for rolling median pace estimation (default: 5).
            min_stint_length: Minimum number of representative laps required to retain a stint (default: 4).
            filter_warmup_lap: Whether to purge lap 1 of a fresh tyre stint (scrub-in / cold tyre transient).
            max_lap_time_s: Physical upper bound for a valid lap time (default: 180.0s).
            min_lap_time_s: Physical lower bound for a valid lap time (default: 50.0s).
        """
        self.pace_outlier_threshold_s = pace_outlier_threshold_s
        self.rolling_window_laps = rolling_window_laps
        self.min_stint_length = min_stint_length
        self.filter_warmup_lap = filter_warmup_lap
        self.max_lap_time_s = max_lap_time_s
        self.min_lap_time_s = min_lap_time_s

    def process(self, laps_df: pd.DataFrame) -> LapFilterResult:
        """
        Executes all 7 cleaning filters sequentially on the input lap dataset.

        Args:
            laps_df: Normalized lap timing DataFrame (from DIP).

        Returns:
            LapFilterResult containing cleaned laps, rejected laps, and filtering report.
        """
        if laps_df is None or laps_df.empty:
            empty_report = FilteringReport(
                total_raw_laps=0,
                total_clean_laps=0,
                total_rejected_laps=0,
                overall_retention_pct=0.0,
            )
            return LapFilterResult(
                clean_laps=pd.DataFrame(),
                rejected_laps=pd.DataFrame(),
                report=empty_report,
            )

        df = laps_df.copy()
        raw_count = len(df)
        breakdown: List[FilterStepMetric] = []

        # Initialize boolean filter masks (True = Passed)
        df["pass_pit"] = True
        df["pass_track_status"] = True
        df["pass_timing_accuracy"] = True
        df["pass_track_limits"] = True
        df["pass_warmup"] = True
        df["pass_pace_outlier"] = True
        df["pass_stint_length"] = True

        # -------------------------------------------------------------
        # Filter 1: Pit In / Pit Out Removal
        # -------------------------------------------------------------
        df["pass_pit"] = self._apply_pit_filter(df)
        breakdown.append(self._calc_step_metric("Filter 1: Pit In/Out Removal", df, "pass_pit", raw_count))

        # -------------------------------------------------------------
        # Filter 2: Track Status / Green Flag Only
        # -------------------------------------------------------------
        active_mask = df["pass_pit"]
        df["pass_track_status"] = self._apply_track_status_filter(df)
        breakdown.append(
            self._calc_step_metric("Filter 2: Green Flag Enforcement", df, "pass_track_status", active_mask.sum())
        )

        # -------------------------------------------------------------
        # Filter 3: Timing Accuracy Filter
        # -------------------------------------------------------------
        active_mask = active_mask & df["pass_track_status"]
        df["pass_timing_accuracy"] = self._apply_timing_accuracy_filter(df)
        breakdown.append(
            self._calc_step_metric("Filter 3: Timing Accuracy Check", df, "pass_timing_accuracy", active_mask.sum())
        )

        # -------------------------------------------------------------
        # Filter 4: Track Limits & Deleted Laps Filter
        # -------------------------------------------------------------
        active_mask = active_mask & df["pass_timing_accuracy"]
        df["pass_track_limits"] = self._apply_track_limits_filter(df)
        breakdown.append(
            self._calc_step_metric("Filter 4: Track Limits Deletion", df, "pass_track_limits", active_mask.sum())
        )

        # -------------------------------------------------------------
        # Filter 5: Stint Warm-up / Out-lap Transient Filter
        # -------------------------------------------------------------
        active_mask = active_mask & df["pass_track_limits"]
        df["pass_warmup"] = self._apply_warmup_filter(df)
        breakdown.append(
            self._calc_step_metric("Filter 5: Stint Warm-up Transient", df, "pass_warmup", active_mask.sum())
        )

        # -------------------------------------------------------------
        # Filter 6: Non-Racing Pace Outlier Purge (>2.0s Rolling Median)
        # -------------------------------------------------------------
        active_mask = active_mask & df["pass_warmup"]
        df["pass_pace_outlier"] = self._apply_pace_outlier_filter(df, active_mask)
        breakdown.append(
            self._calc_step_metric("Filter 6: Pace Outliers (>2.0s)", df, "pass_pace_outlier", active_mask.sum())
        )

        # -------------------------------------------------------------
        # Filter 7: Minimum Stint Length Threshold
        # -------------------------------------------------------------
        active_mask = active_mask & df["pass_pace_outlier"]
        df["pass_stint_length"] = self._apply_stint_length_filter(df, active_mask)
        breakdown.append(
            self._calc_step_metric("Filter 7: Minimum Stint Length", df, "pass_stint_length", active_mask.sum())
        )

        # Master pass mask
        df["is_clean_racing_lap"] = (
            df["pass_pit"]
            & df["pass_track_status"]
            & df["pass_timing_accuracy"]
            & df["pass_track_limits"]
            & df["pass_warmup"]
            & df["pass_pace_outlier"]
            & df["pass_stint_length"]
        )

        clean_laps = df[df["is_clean_racing_lap"]].copy().reset_index(drop=True)
        rejected_laps = df[~df["is_clean_racing_lap"]].copy().reset_index(drop=True)

        clean_count = len(clean_laps)
        rejected_count = len(rejected_laps)
        overall_retention = (clean_count / raw_count * 100.0) if raw_count > 0 else 0.0

        report = FilteringReport(
            total_raw_laps=raw_count,
            total_clean_laps=clean_count,
            total_rejected_laps=rejected_count,
            overall_retention_pct=overall_retention,
            filter_breakdown=breakdown,
        )

        logger.info(
            "PIP completed: %d/%d laps retained (%.1f%%)",
            clean_count,
            raw_count,
            overall_retention,
        )

        return LapFilterResult(
            clean_laps=clean_laps,
            rejected_laps=rejected_laps,
            report=report,
        )

    # -----------------------------------------------------------------
    # Individual Filter Implementations
    # -----------------------------------------------------------------

    def _apply_pit_filter(self, df: pd.DataFrame) -> pd.Series:
        """
        Filter 1: Pit In / Pit Out Removal.

        Eliminates in-laps and out-laps where the vehicle is subject to the pit-lane
        speed limiter (60/80 km/h) or stationary service time.

        Criteria:
            - pit_in_time_s must be NaN / Null
            - pit_out_time_s must be NaN / Null
        """
        has_pit_in = df["pit_in_time_s"].notna() if "pit_in_time_s" in df.columns else pd.Series(False, index=df.index)
        has_pit_out = df["pit_out_time_s"].notna() if "pit_out_time_s" in df.columns else pd.Series(False, index=df.index)

        # Laps with non-null pit times are invalid racing laps
        return ~(has_pit_in | has_pit_out)

    def _apply_track_status_filter(self, df: pd.DataFrame) -> pd.Series:
        """
        Filter 2: Track Status / Green Flag Only.

        Ensures full racing conditions. Removes Virtual Safety Car (VSC, '6'),
        Safety Car (SC, '4'), Yellow Flags ('2', '3'), and Red Flags ('5').

        Criteria:
            - FastF1 TrackStatus must equal '1' (Green Flag) exclusively.
        """
        if "track_status" not in df.columns:
            return pd.Series(True, index=df.index)

        status_str = df["track_status"].astype(str).str.strip()
        # In FastF1, TrackStatus '1' denotes all sectors clear under green flag
        return status_str == "1"

    def _apply_timing_accuracy_filter(self, df: pd.DataFrame) -> pd.Series:
        """
        Filter 3: Timing Accuracy Filter.

        Verifies transponder loop integrity and plausible physical time range.

        Criteria:
            - is_accurate == True
            - min_lap_time_s <= lap_time_s <= max_lap_time_s
            - lap_time_s is not null and not infinite
        """
        valid_acc = (
            df["is_accurate"].fillna(False).astype(bool)
            if "is_accurate" in df.columns
            else pd.Series(True, index=df.index)
        )

        lap_time = df["lap_time_s"] if "lap_time_s" in df.columns else pd.Series(np.nan, index=df.index)
        valid_range = (
            lap_time.notna()
            & np.isfinite(lap_time)
            & (lap_time >= self.min_lap_time_s)
            & (lap_time <= self.max_lap_time_s)
        )

        return valid_acc & valid_range

    def _apply_track_limits_filter(self, df: pd.DataFrame) -> pd.Series:
        """
        Filter 4: Track Limits & Deleted Laps Filter.

        Removes laps invalidated by FIA Race Control for exceeding track limits.

        Criteria:
            - deleted == False (or DeletedReason is empty)
        """
        if "deleted" not in df.columns:
            return pd.Series(True, index=df.index)

        return ~df["deleted"].fillna(False).astype(bool)

    def _apply_warmup_filter(self, df: pd.DataFrame) -> pd.Series:
        """
        Filter 5: Stint Warm-up / Out-lap Transient Filter.

        Removes initial scrub-in / cold tyre laps (e.g. tyre_life == 1) when
        temperatures are outside the optimal thermal operating window.

        Criteria:
            - tyre_life > 1 (if filter_warmup_lap is enabled and tyre_life exists)
        """
        if not self.filter_warmup_lap or "tyre_life" not in df.columns:
            return pd.Series(True, index=df.index)

        # Retain laps where tyre_life is strictly greater than 1, or where tyre_life is missing
        return (df["tyre_life"] > 1.0) | df["tyre_life"].isna()

    def _apply_pace_outlier_filter(
        self,
        df: pd.DataFrame,
        current_valid_mask: pd.Series,
    ) -> pd.Series:
        """
        Filter 6: Non-Racing Pace Outlier Purge (>2.0s Rolling Median Delta).

        Calculates rolling median lap time within each driver's stint. Purges
        laps where:
            lap_time_s - rolling_median_s > pace_outlier_threshold_s

        References:
            - TrackShift Engine 1 PRD: Purges non-racing pace outliers (>2.0s rolling median delta).
        """
        pass_mask = pd.Series(True, index=df.index)

        # Group by driver and stint to evaluate pace continuity
        group_cols = ["driver"]
        if "stint" in df.columns and df["stint"].notna().any():
            group_cols.append("stint")

        for _, group_idx in df.groupby(group_cols, sort=False).groups.items():
            stint_sub = df.loc[group_idx].copy()
            # Only consider laps that have survived prior filters for computing the rolling baseline
            valid_stint_laps = stint_sub[current_valid_mask.loc[group_idx]]

            if len(valid_stint_laps) < 3:
                # Insufficient points for robust rolling median; fallback to static median
                if not valid_stint_laps.empty:
                    base_median = valid_stint_laps["lap_time_s"].median()
                    is_outlier = (stint_sub["lap_time_s"] - base_median) > self.pace_outlier_threshold_s
                    pass_mask.loc[stint_sub[is_outlier].index] = False
                continue

            # Compute rolling median centered or backward
            rolling_med = (
                valid_stint_laps["lap_time_s"]
                .rolling(window=self.rolling_window_laps, min_periods=1, center=True)
                .median()
            )
            # Reindex to all stint laps
            aligned_med = rolling_med.reindex(stint_sub.index).bfill().ffill()

            delta = stint_sub["lap_time_s"] - aligned_med
            is_outlier = delta > self.pace_outlier_threshold_s
            pass_mask.loc[stint_sub[is_outlier].index] = False

        return pass_mask

    def _apply_stint_length_filter(
        self,
        df: pd.DataFrame,
        current_valid_mask: pd.Series,
    ) -> pd.Series:
        """
        Filter 7: Minimum Stint Length Threshold.

        Ensures each retained stint has sufficient valid laps (>= min_stint_length)
        to enable statistically sound tyre wear parameter estimation.

        Criteria:
            - sum(valid_laps_in_stint) >= min_stint_length
        """
        pass_mask = pd.Series(True, index=df.index)

        group_cols = ["driver"]
        if "stint" in df.columns and df["stint"].notna().any():
            group_cols.append("stint")

        for _, group_idx in df.groupby(group_cols, sort=False).groups.items():
            valid_count_in_stint = current_valid_mask.loc[group_idx].sum()
            if valid_count_in_stint < self.min_stint_length:
                # Mark entire stint as failing the minimum sample power criterion
                pass_mask.loc[group_idx] = False

        return pass_mask

    @staticmethod
    def _calc_step_metric(
        filter_name: str,
        df: pd.DataFrame,
        mask_col: str,
        laps_in: int,
    ) -> FilterStepMetric:
        """Computes incremental attrition metric for a given filtering step."""
        passes = df[mask_col]
        rejected = (~passes).sum()
        remaining = laps_in - rejected
        retention = (remaining / laps_in * 100.0) if laps_in > 0 else 0.0
        return FilterStepMetric(
            filter_name=filter_name,
            laps_in=laps_in,
            laps_rejected=rejected,
            laps_remaining=max(0, remaining),
            retention_rate_pct=max(0.0, retention),
        )
