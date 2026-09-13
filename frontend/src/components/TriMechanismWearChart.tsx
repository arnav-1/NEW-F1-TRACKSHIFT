import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { LapTelemetryRecord } from '../types/telemetry';
import { Flame, Thermometer, Cpu } from 'lucide-react';
import {
  TelemetryReadoutTooltip,
  computeWearDomain,
  TELEMETRY_THEME,
} from './shared/TelemetryChartComponents';

interface TriMechanismWearChartProps {
  telemetryData: LapTelemetryRecord[];
}

export const TriMechanismWearChart: React.FC<TriMechanismWearChartProps> = ({
  telemetryData,
}) => {
  // Map FL corner physical damage components across completed laps
  const wearData = telemetryData.map((d) => {
    const fl = d.corners.FL;
    return {
      lap_number: d.lap_number,
      abrasion: Number((fl.abrasion_rate * 10000).toFixed(2)),
      graining: Number((fl.graining_rate * 10000).toFixed(2)),
      blistering: Number((fl.blistering_rate * 10000).toFixed(2)),
      total_rate: Number(((fl.abrasion_rate + fl.graining_rate + fl.blistering_rate) * 10000).toFixed(2)),
      cumulative_d: Number((fl.cumulative_damage * 100).toFixed(1)),
      tread_temp: fl.tread_temp_c,
      carcass_temp: fl.carcass_temp_c,
    };
  });

  const latestPoint = wearData[wearData.length - 1] || {
    tread_temp: 112.4,
    carcass_temp: 104.1,
    cumulative_d: 24.5,
    total_rate: 6.8,
  };

  const cliffLap = 19;

  // Dynamic wear domain
  const totalDamages = wearData.map((d) => d.total_rate);
  const wearDomain = computeWearDomain(totalDamages, 0.2);

  return (
    <div className="pitwall-panel p-4 h-full flex flex-col justify-between">
      {/* Panel Header & Color Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-haas-border/70 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-haas-red" />
          <h2 className="text-sm font-bold text-haas-white font-mono">
            Panel 3: Tri-Mechanism Wear Breakdown & Thermal ODEs (DEP)
          </h2>
        </div>

        {/* Triple Mechanism Legend Indicators */}
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-slate-100 font-bold">
            <span className="w-2.5 h-2.5 rounded-sm bg-white inline-block shadow-sm"></span>
            1. Mechanical Abrasion (w_p)
          </span>
          <span className="flex items-center gap-1.5 text-haas-amber font-bold">
            <span className="w-2.5 h-2.5 rounded-sm bg-haas-amber inline-block"></span>
            2. Cold Graining (&lt;85°C)
          </span>
          <span className="flex items-center gap-1.5 text-haas-red font-bold">
            <span className="w-2.5 h-2.5 rounded-sm bg-haas-red inline-block"></span>
            3. Thermal Blistering (&gt;118°C)
          </span>
        </div>
      </div>

      {/* Top Strip: Carcass vs Tread Thermal ODE Gauges */}
      <div className="grid grid-cols-3 gap-2.5 mb-2 bg-[#0c0c14] p-2.5 rounded-lg border border-haas-border/70">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-haas-red/10 border border-haas-red/30 flex items-center justify-center flex-shrink-0">
            <Thermometer className="w-3.5 h-3.5 text-haas-red" />
          </div>
          <div className="text-[10px] font-mono">
            <span className="text-haas-gray font-semibold">T_tread ODE:</span>
            <div className="text-haas-white font-black text-xs">{latestPoint.tread_temp}°C</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <Thermometer className="w-3.5 h-3.5 text-haas-cyan" />
          </div>
          <div className="text-[10px] font-mono">
            <span className="text-haas-gray font-semibold">T_carcass ODE:</span>
            <div className="text-haas-cyan font-black text-xs">{latestPoint.carcass_temp}°C</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#181824] border border-haas-border flex items-center justify-center flex-shrink-0">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-[10px] font-mono">
            <span className="text-haas-gray font-semibold">Cumulative D(t):</span>
            <div className="text-purple-300 font-black text-xs">{latestPoint.cumulative_d}% Life Expended</div>
          </div>
        </div>
      </div>

      {/* Stacked Area Chart Canvas */}
      <div className="w-full h-[220px] bg-[#080A0E] rounded-lg border border-white/[0.08] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={wearData}
            margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradAbrasion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="gradGraining" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="gradBlistering" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray={TELEMETRY_THEME.gridDash}
              stroke={TELEMETRY_THEME.gridColor}
            />
            <XAxis
              dataKey="lap_number"
              stroke={TELEMETRY_THEME.axisLineColor}
              tick={{ fill: TELEMETRY_THEME.tickColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={{ stroke: TELEMETRY_THEME.tickLineColor }}
              axisLine={{ stroke: TELEMETRY_THEME.axisLineColor }}
              label={{
                value: 'STINT LAPS COMPLETED',
                position: 'insideBottom',
                offset: -2,
                fill: TELEMETRY_THEME.tickColor,
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
            <YAxis
              stroke={TELEMETRY_THEME.axisLineColor}
              domain={wearDomain}
              tick={{ fill: TELEMETRY_THEME.tickColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={{ stroke: TELEMETRY_THEME.tickLineColor }}
              axisLine={{ stroke: TELEMETRY_THEME.axisLineColor }}
              label={{
                value: 'D_rate [×10⁻⁴]',
                angle: -90,
                position: 'insideLeft',
                fill: TELEMETRY_THEME.tickColor,
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                offset: 15,
              }}
            />

            {/* Custom Telemetry Tooltip with Units */}
            <Tooltip
              cursor={{ stroke: TELEMETRY_THEME.cursorLineColor, strokeWidth: 1, strokeDasharray: '2 2' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <TelemetryReadoutTooltip
                      active={active}
                      title={`LAP ${data.lap_number} (FL LIMITING TYRE)`}
                      subtitle={`${data.tread_temp}°C / ${data.carcass_temp}°C`}
                      items={[
                        { channel: 'MECHANICAL ABRASION', value: data.abrasion, unit: 'x10⁻⁴', color: '#CBD5E1' },
                        { channel: 'COLD GRAINING', value: data.graining, unit: 'x10⁻⁴', color: '#FBBF24' },
                        { channel: 'THERMAL BLISTERING', value: data.blistering, unit: 'x10⁻⁴', color: '#F87171' },
                        { channel: 'TOTAL WEAR RATE', value: data.total_rate, unit: 'x10⁻⁴', color: '#FFFFFF', isProminent: true },
                        { channel: 'CUMULATIVE D(t)', value: `${data.cumulative_d}%`, color: '#C084FC' },
                      ]}
                      alertMessage={data.lap_number >= cliffLap ? `CLIFF HORIZON (Lap ${cliffLap})` : undefined}
                      alertType={data.lap_number >= cliffLap ? 'critical' : 'info'}
                    />
                  );
                }
                return null;
              }}
            />

            {/* 1. Mechanical Abrasion */}
            <Area
              type="monotone"
              dataKey="abrasion"
              stackId="1"
              stroke="#CBD5E1"
              strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
              fill="url(#gradAbrasion)"
            />

            {/* 2. Cold Graining in Amber (<85°C) */}
            <Area
              type="monotone"
              dataKey="graining"
              stackId="1"
              stroke="#FBBF24"
              strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
              fill="url(#gradGraining)"
            />

            {/* 3. Thermal Blistering in Haas Crimson Red (>118°C) */}
            <Area
              type="monotone"
              dataKey="blistering"
              stackId="1"
              stroke="#F87171"
              strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
              fill="url(#gradBlistering)"
            />

            {/* Dotted Vertical Reference Line at Analytical Cliff Lap */}
            <ReferenceLine
              x={cliffLap}
              stroke={TELEMETRY_THEME.channels.haasRed}
              strokeDasharray="3 2"
              strokeWidth={TELEMETRY_THEME.strokeWidth.secondary}
              label={{
                value: `CLIFF HORIZON: LAP ${cliffLap}`,
                position: 'top',
                fill: TELEMETRY_THEME.channels.haasRed,
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Mathematical Formulation Footer */}
      <div className="mt-2 pt-2 border-t border-haas-border/70 flex flex-wrap items-center justify-between text-[11px] font-mono text-haas-gray gap-2">
        <span className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-haas-red" />
          <span>ODE: <code>dD/dt = (Q_frict/Q_ref)^1.15 + w_g(T &lt; 85°C) + w_b(T &gt; 118°C)</code></span>
        </span>
        <span className="text-haas-red font-bold flex items-center gap-1">
          <span>Non-linear Blistering past Lap 18</span>
        </span>
      </div>
    </div>
  );
};
