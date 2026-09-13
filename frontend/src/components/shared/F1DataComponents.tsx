import React from 'react';

export type MetricBadgeType = 'neutral' | 'tag' | 'alert';

interface MetricBadgeProps {
  text: string;
  type?: MetricBadgeType;
  className?: string;
}

/**
 * Standardized F1 Metric Badge/Pill
 * Strict dimensional parity: identical height (20px), padding, border radius, and font size across all uses.
 * Color used only for semantic intent (alert vs tag vs neutral).
 */
export const MetricBadge: React.FC<MetricBadgeProps> = ({
  text,
  type = 'neutral',
  className = '',
}) => {
  let colorClasses = 'bg-white/[0.04] text-zinc-400 border-white/[0.08]'; // Neutral informational

  if (type === 'tag') {
    colorClasses = 'bg-white/[0.06] text-zinc-300 border-white/[0.12]'; // Sensor / Source tag
  } else if (type === 'alert') {
    colorClasses = 'bg-red-950/60 text-red-300 border-red-800/50 font-bold'; // Status / Critical alert
  }

  return (
    <span
      className={`inline-flex items-center justify-center h-5 px-2 text-[10px] font-mono font-medium rounded-full border leading-none tracking-tight shrink-0 select-none ${colorClasses} ${className}`}
    >
      {text}
    </span>
  );
};

export interface MetricCardProps {
  label: string;
  badge?: {
    text: string;
    type?: MetricBadgeType;
  };
  value: React.ReactNode;
  valueClassName?: string;
  secondaryLabel: string;
  secondaryValue: React.ReactNode;
  secondaryValueClassName?: string;
  className?: string;
}

/**
 * Standardized Top Metric Card
 * Fixed 3-row layout:
 * Row 1: Muted uppercase label (left) + Standardized badge (right)
 * Row 2: Large primary value (text-2xl font-bold font-mono tabular-nums)
 * Row 3: Muted secondary label (left) + Secondary value (right)
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  badge,
  value,
  valueClassName = 'text-white',
  secondaryLabel,
  secondaryValue,
  secondaryValueClassName = 'font-semibold text-zinc-200',
  className = '',
}) => {
  return (
    <div
      className={`f1-card p-4 flex flex-col justify-between hover:border-white/[0.15] transition-colors rounded-lg bg-[#16181D] border border-white/[0.08] min-h-[118px] ${className}`}
    >
      {/* Row 1: Label + Badge */}
      <div className="flex items-center justify-between gap-2 min-h-[20px] mb-1.5">
        <span className="text-[10px] font-display uppercase tracking-widest text-zinc-400 font-bold truncate">
          {label}
        </span>
        {badge && <MetricBadge text={badge.text} type={badge.type} />}
      </div>

      {/* Row 2: Primary Value */}
      <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight my-1 ${valueClassName}`}>
        {value}
      </div>

      {/* Row 3: Secondary Info */}
      <div className="text-xs text-zinc-400 mt-2 pt-2 flex items-center justify-between tabular-nums font-sans border-t border-white/[0.04]">
        <span className="text-zinc-400">{secondaryLabel}</span>
        <span className={secondaryValueClassName}>{secondaryValue}</span>
      </div>
    </div>
  );
};

/**
 * Standardized F1 Key-Value List Row (for panels like Circuit Archetype)
 */
export interface DataListRowProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

export const DataListRow: React.FC<DataListRowProps> = ({
  label,
  value,
  valueClassName = 'text-zinc-200 font-medium',
}) => {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-b-0">
      <span className="text-zinc-400 font-sans">{label}</span>
      <span className={`tabular-nums ${valueClassName}`}>{value}</span>
    </div>
  );
};
