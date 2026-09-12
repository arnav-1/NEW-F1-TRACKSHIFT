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
import type { LapTelemetryPoint } from '../types/telemetry';
import { Flame, Cpu } from 'lucide-react';

interface TriMechanismWearChartProps {
  telemetryData: LapTelemetryPoint[];
}

export const TriMechanismWearChart: React.FC<TriMechanismWearChartProps> = ({
  telemetryData,
}) => {
  // Map FL corner wear breakdown for each lap
  const wearData = telemetryData.map((d) => ({
    lap_number: d.lap_number,
    abrasion: Number((d.corners.FL.abrasion_rate * 10000).toFixed(2)),
    graining: Number((d.corners.FL.graining_rate * 10000).toFixed(2)),
    blistering: Number((d.corners.FL.blistering_rate * 10000).toFixed(2)),
    total_rate: Number(((d.corners.FL.abrasion_rate + d.corners.FL.graining_rate + d.corners.FL.blistering_rate) * 10000).toFixed(2)),
    tread_temp: d.corners.FL.tread_temp_c,
  }));

  const cliffLap = 19.4;

  return (
    <div className="pitwall-panel p-4 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-haas-border/70 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-haas-red" />
          <h2 className="text-sm font-bold tracking-tight text-haas-white font-mono uppercase">
            Panel 3: Tri-Mechanism Wear Superposition (DEP)
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2.5 h-2.5 rounded bg-slate-300 inline-block"></span> Abrasion (w_p)
          </span>
          <span className="flex items-center gap-1 text-haas-amber">
            <span className="w-2.5 h-2.5 rounded bg-haas-amber inline-block"></span> Graining (w_g)
          </span>
          <span className="flex items-center gap-1 text-haas-red">
            <span className="w-2.5 h-2.5 rounded bg-haas-red inline-block"></span> Blistering (w_b)
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={wearData}
            margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradAbrasion" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#CBD5E1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#CBD5E1" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gradGraining" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF9100" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#FF9100" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gradBlistering" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E10600" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#E10600" stopOpacity={0.3} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#242432" opacity={0.6} />
            <XAxis
              dataKey="lap_number"
              stroke="#8C8C9A"
              fontSize={11}
              fontFamily="JetBrains Mono"
              tickLine={false}
              label={{ value: 'Tyre Age (Laps Completed)', position: 'insideBottom', offset: -2, fill: '#8C8C9A', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
            <YAxis
              stroke="#8C8C9A"
              fontSize={11}
              fontFamily="JetBrains Mono"
              tickLine={false}
              tickFormatter={(v) => `${v}`}
              label={{ value: 'Wear Rate (×10⁻⁴)', angle: -90, position: 'insideLeft', fill: '#8C8C9A', fontSize: 10, fontFamily: 'JetBrains Mono', offset: 15 }}
            />

            {/* Custom Tooltip */}
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#0e0e16] border border-haas-border p-3 rounded-md shadow-2xl font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-haas-border pb-1 mb-2">
                        <span className="font-bold text-haas-white">LAP {data.lap_number} (FL Corner)</span>
                        <span className="text-haas-cyan text-[10px]">{data.tread_temp}°C Tread</span>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-300">Mechanical Abrasion:</span>
                          <span className="font-bold text-slate-100">{data.abrasion}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-haas-amber">Cold Graining:</span>
                          <span className="font-bold text-haas-amber">{data.graining}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-haas-red">Thermal Blistering:</span>
                          <span className="font-bold text-haas-red">{data.blistering}</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t border-haas-border font-bold">
                          <span className="text-haas-white">Total Damage Rate:</span>
                          <span className="text-emerald-400">{data.total_rate}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Stacked Areas */}
            <Area
              type="monotone"
              dataKey="abrasion"
              stackId="1"
              stroke="#CBD5E1"
              fill="url(#gradAbrasion)"
            />
            <Area
              type="monotone"
              dataKey="graining"
              stackId="1"
              stroke="#FF9100"
              fill="url(#gradGraining)"
            />
            <Area
              type="monotone"
              dataKey="blistering"
              stackId="1"
              stroke="#E10600"
              fill="url(#gradBlistering)"
            />

            {/* Cliff Inflection Line */}
            <ReferenceLine
              x={cliffLap}
              stroke="#E10600"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `STINT CLIFF (LAP ${cliffLap})`,
                position: 'top',
                fill: '#E10600',
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
                fontWeight: 'bold',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Notes */}
      <div className="mt-2 pt-2 border-t border-haas-border/70 flex items-center justify-between text-[11px] font-mono text-haas-gray">
        <span className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-haas-red" />
          <span>ODE: <code>dD/dt = w_p(Q_frict) + w_g(T &lt; 85°C) + w_b(T &gt; 118°C)</code></span>
        </span>
        <span className="text-haas-red font-bold">
          Blistering Acceleration past Lap 18
        </span>
      </div>
    </div>
  );
};
