import React from 'react';

/**
 * Professional F1 Telemetry Styling Constants (ATLAS / MoTeC i2 Pro / Wintax)
 */
export const TELEMETRY_THEME = {
  // Telemetry Canvas & Grid
  canvasBg: '#080A0E',
  gridColor: 'rgba(255, 255, 255, 0.05)',
  gridDash: '2 3',
  axisLineColor: '#272B35',
  tickLineColor: '#272B35',
  tickColor: '#808793',
  cursorLineColor: '#9CA3AF',

  // Channel Trace Colors (ATLAS / Haas Pit-Wall Homologated)
  channels: {
    laserWhite: '#FFFFFF',
    telemetryCyan: '#00F0FF',
    timingGreen: '#00FF66',
    haasRed: '#FF1801',
    pirelliYellow: '#FFE500',
    amberWarning: '#F59E0B',
    slateReference: '#64748B',
    softMuted: '#334155',
    purpleAero: '#C084FC',
    orangeThermal: '#FB923C',
  },

  // Trace line weights
  strokeWidth: {
    primary: 1.5,
    secondary: 1.2,
    reference: 1.0,
  },
};

/**
 * Single Telemetry Channel Item in Readout
 */
export interface TelemetryReadoutItem {
  channel: string;
  value: string | number;
  unit?: string;
  color?: string;
  isDelta?: boolean;
  deltaSign?: '+' | '-' | '';
  isProminent?: boolean;
}

export interface TelemetryReadoutTooltipProps {
  active?: boolean;
  title: string;
  subtitle?: string;
  items: TelemetryReadoutItem[];
  alertMessage?: string;
  alertType?: 'warning' | 'critical' | 'info' | 'success';
}

/**
 * High-Density ATLAS / MoTeC Cursor Telemetry Readout
 * Replaces puffy web tooltips with high-density monospace engineering channel inspect panels.
 */
export const TelemetryReadoutTooltip: React.FC<TelemetryReadoutTooltipProps> = ({
  active,
  title,
  subtitle,
  items,
  alertMessage,
  alertType = 'warning',
}) => {
  if (!active) return null;

  const alertColors = {
    warning: 'border-amber-500/40 bg-amber-950/40 text-amber-300',
    critical: 'border-red-500/40 bg-red-950/40 text-red-300',
    info: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300',
    success: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
  };

  return (
    <div className="bg-[#07080B]/95 backdrop-blur-md border border-white/20 p-2.5 rounded shadow-[0_4px_20px_rgba(0,0,0,0.8)] text-[11px] font-mono min-w-[240px] pointer-events-none select-none z-50">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-white/10 text-[10px] tracking-wider uppercase text-zinc-400">
        <span className="font-bold text-zinc-200 truncate">{title}</span>
        {subtitle && <span className="text-zinc-500 font-normal shrink-0">{subtitle}</span>}
      </div>

      {/* High-density channel value table */}
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div
            key={`${item.channel}-${idx}`}
            className={`flex items-center justify-between gap-3 text-[11px] tabular-nums ${
              item.isProminent
                ? 'pt-1 border-t border-white/10 font-bold text-white'
                : 'text-zinc-300'
            }`}
          >
            {/* Channel Identifier with colored pip */}
            <div className="flex items-center gap-1.5 font-sans truncate max-w-[150px]">
              {item.color && (
                <span
                  className="w-1.5 h-1.5 shrink-0 rounded-[1px]"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="text-zinc-400 truncate text-[10px] font-mono uppercase">
                {item.channel}:
              </span>
            </div>

            {/* Calibrated Value + Unit */}
            <div className="flex items-baseline gap-1 shrink-0">
              <span
                style={item.color ? { color: item.color } : undefined}
                className="font-mono font-semibold"
              >
                {item.isDelta && typeof item.value === 'number' && item.value > 0 ? '+' : ''}
                {item.value}
              </span>
              {item.unit && (
                <span className="text-[9px] text-zinc-500 font-mono">{item.unit}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Discrete Alert Banner */}
      {alertMessage && (
        <div
          className={`mt-2 pt-1 border-t px-1.5 py-1 rounded text-[10px] font-sans flex items-center gap-1 ${alertColors[alertType]}`}
        >
          <span>⚠</span>
          <span className="truncate">{alertMessage}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Calculates a tight, dynamic Y-axis domain for lap pace signals.
 * Avoids hardcoded zero baselines that flatten millisecond/tenth variations.
 */
export function computePaceDomain(
  values: number[],
  padding: number = 0.4
): [number, number] {
  if (!values.length) return [70, 90];
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v) && v > 0);
  if (!valid.length) return [70, 90];

  const min = Math.min(...valid);
  const max = Math.max(...valid);

  const roundedMin = Math.floor((min - padding) * 2) / 2;
  const roundedMax = Math.ceil((max + padding) * 2) / 2;

  return [roundedMin, Math.max(roundedMin + 1, roundedMax)];
}

/**
 * Calculates symmetric or tight dynamic bounds for residual / confounder delta channels.
 */
export function computeDeltaDomain(
  values: number[],
  padding: number = 0.2
): [number, number] {
  if (!values.length) return [-1, 1];
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (!valid.length) return [-1, 1];

  const min = Math.min(...valid);
  const max = Math.max(...valid);

  const roundedMin = Math.floor((min - padding) * 4) / 4;
  const roundedMax = Math.ceil((max + padding) * 4) / 4;

  return [roundedMin, roundedMax];
}

/**
 * Calculates dynamic upper bounds for wear rates / damage rates.
 */
export function computeWearDomain(
  values: number[],
  padRatio: number = 0.15
): [number, number] {
  if (!values.length) return [0, 10];
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v) && v >= 0);
  if (!valid.length) return [0, 10];

  const max = Math.max(...valid);
  const top = Math.ceil(max * (1 + padRatio));

  return [0, Math.max(top, 1)];
}
