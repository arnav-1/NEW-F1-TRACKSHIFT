import React from 'react';
import { CIRCUITS_GEOMETRY, SPAIN_MAP, type TurnMarkerData } from '../data/circuitsData';
import { useTelemetry } from '../context/TelemetryContext';
import { Play, Pause, SkipBack, SkipForward, Navigation } from 'lucide-react';
import { MetricCard, MetricBadge, DataListRow } from './shared/F1DataComponents';
import { StrategyRecommendationBox } from './StrategyRecommendationBox';

export type { TurnMarkerData };

export const CircuitMap: React.FC = () => {
  const {
    selectedCircuit,
    selectedCompound,
    currentLap,
    totalStintLaps,
    isPlaying,
    activeTurn,
    setLap,
    setIsPlaying,
    setActiveTurn,
    currentLapData,
    compoundMetadata,
    activeCircuitInfo,
    activeSessionWeather,
  } = useTelemetry();

  const currentCircuitMap = CIRCUITS_GEOMETRY[selectedCircuit] || SPAIN_MAP;
  const turns = currentCircuitMap.turns;
  const sectors = currentCircuitMap.sectors;
  const svgPath = currentCircuitMap.svgPath;

  const activeTurnData: TurnMarkerData =
    turns.find((t) => t.id === activeTurn) || turns[0];

  const getCompoundColor = (comp: string) => {
    switch (comp) {
      case 'SOFT':
        return 'text-red-400';
      case 'MEDIUM':
        return 'text-amber-400';
      case 'HARD':
        return 'text-zinc-100';
      default:
        return 'text-red-400';
    }
  };

  const getCompoundCode = (comp: string) => {
    switch (comp) {
      case 'SOFT':
        return 'C3';
      case 'MEDIUM':
        return 'C2';
      case 'HARD':
        return 'C1';
      default:
        return 'C3';
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Top Telemetry KPI Metric Strip in Standardized F1 MetricCard System */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Fuel Penalty Delta */}
        <MetricCard
          label="Fuel Penalty Delta"
          badge={{ text: "0.033 s/kg", type: "neutral" }}
          value={`+${currentLapData?.fuel_penalty_s?.toFixed(3) ?? '0.000'}s`}
          valueClassName="text-white"
          secondaryLabel="Mass on board:"
          secondaryValue={`${currentLapData?.fuel_remaining_kg?.toFixed(1) ?? '33.3'} kg`}
        />

        {/* Metric 2: Track Evolution Grip Gain */}
        <MetricCard
          label="Track Evolution"
          badge={{ text: "1.25s Max", type: "neutral" }}
          value={`-${currentLapData?.track_evolution_s?.toFixed(3) ?? '0.000'}s`}
          valueClassName="text-sky-400"
          secondaryLabel="Grip saturation:"
          secondaryValue={`${(((currentLapData?.track_evolution_s ?? 0) / 1.25) * 100).toFixed(0)}% saturated`}
        />

        {/* Metric 3: Microclimate Temperatures */}
        <MetricCard
          label="Microclimate Temps"
          badge={{ text: "IR Sensor", type: "tag" }}
          value={
            <div className="flex items-baseline gap-2">
              <span>{activeSessionWeather.track_temp_c.toFixed(1)}°C</span>
              <span className="text-xs text-zinc-400 font-normal">Track</span>
            </div>
          }
          valueClassName="text-white"
          secondaryLabel="Ambient air:"
          secondaryValue={`${activeSessionWeather.air_temp_c.toFixed(1)}°C (${activeSessionWeather.condition})`}
        />

        {/* Metric 4: Primary Limiting Tyre */}
        <MetricCard
          label="Limiting Tyre"
          badge={{ text: "CRITICAL", type: "alert" }}
          value={`${compoundMetadata?.limiting_corner ?? activeCircuitInfo.limiting_wheel} (${activeCircuitInfo.limiting_wheel_name})`}
          valueClassName="text-[#FF3B30]"
          secondaryLabel="Sliding share:"
          secondaryValue={`${compoundMetadata?.limiting_workload_pct?.toFixed(1) ?? '36.2'}% Workload`}
          secondaryValueClassName="font-semibold text-red-300"
        />

        {/* Metric 5: Analytical Stint Cliff */}
        <MetricCard
          label="Predicted Cliff"
          badge={{ text: ">0.25s / lap", type: "neutral" }}
          value={
            <div className="flex items-baseline gap-1.5">
              <span>LAP {compoundMetadata?.predicted_cliff_lap ? compoundMetadata.predicted_cliff_lap.toFixed(1) : (selectedCompound === 'SOFT' ? '19.4' : selectedCompound === 'MEDIUM' ? '28.0' : '38.0')}</span>
              <span className="text-xs text-[#FF3B30] font-semibold font-mono">±0.5 Laps</span>
            </div>
          }
          valueClassName="text-white"
          secondaryLabel="Target window:"
          secondaryValue={
            selectedCompound === 'SOFT' ? 'Lap 18 – 20' : selectedCompound === 'MEDIUM' ? 'Lap 26 – 29' : 'Lap 36 – 40'
          }
          secondaryValueClassName="font-semibold text-purple-300"
          className="col-span-2 md:col-span-1"
        />

      </div>
 
      {/* Pit-Wall Continual Learning & Strategy Directive Banner */}
      <StrategyRecommendationBox />

      {/* Main Workspace Grid: Large Circuit Map & Turn Telemetry Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left 8 Cols: Interactive Vector Track Map */}
        <div className="lg:col-span-8 tgr-card p-5 relative">
          
          {/* Track Map Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-red-500" />
                <span>{currentCircuitMap.flag} {currentCircuitMap.name}</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {currentCircuitMap.length_km} km | {currentCircuitMap.turns_count} Turns | {currentCircuitMap.archetype}
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-2.5 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-[#E10600]"></span>
                <span>{currentCircuitMap.peakScrubLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-[#E5A823]"></span>
                <span>{currentCircuitMap.heavyBrakingLabel}</span>
              </span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="w-full h-[400px] flex items-center justify-center relative bg-[#0A0C0F] rounded-lg border border-white/[0.07] p-2 overflow-hidden shadow-inner">
            
            {/* Subtle Grid Watermark */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

            <div className="absolute top-3.5 left-4 text-[11px] font-mono text-zinc-500/60 font-semibold tracking-wider pointer-events-none uppercase">
              TGR HAAS PIT-WALL TELEMETRY // {currentCircuitMap.country.toUpperCase()}
            </div>

            <svg
              viewBox={currentCircuitMap.viewBox || "0 0 1000 600"}
              className="w-full h-full max-h-[380px] drop-shadow-[0_0_24px_rgba(0,0,0,0.9)] relative z-10"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#E10600" floodOpacity="0.7" />
                </filter>
                <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#E5A823" floodOpacity="0.7" />
                </filter>
              </defs>

              {/* Main Track Outer Dark Border */}
              <path
                d={svgPath}
                fill="none"
                stroke="#20242E"
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Inner Titanium Racing Line */}
              <path
                d={svgPath}
                fill="none"
                stroke="#7E8494"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Centerline Dashed Telemetry Line */}
              <path
                d={svgPath}
                fill="none"
                stroke="#00E5FF"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                opacity="0.45"
              />

              {/* Sector Timing Lines (S1, S2, S3) */}
              {sectors.map((sec) => (
                <g key={sec.id}>
                  {sec.id === 'S3' ? (
                    <>
                      <line
                        x1={sec.x}
                        y1={sec.y - 14}
                        x2={sec.x}
                        y2={sec.y + 14}
                        stroke="#E10600"
                        strokeWidth="3.5"
                      />
                      <text
                        x={sec.x - 22}
                        y={sec.y + 30}
                        fill="#E10600"
                        fontSize="11"
                        fontFamily="Inter, sans-serif"
                        fontWeight="600"
                      >
                        FINISH
                      </text>
                      <text
                        x={sec.x + 8}
                        y={sec.y + 16}
                        fill="#00E5FF"
                        fontSize="11"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="600"
                      >
                        S3
                      </text>
                    </>
                  ) : (
                    <>
                      <circle cx={sec.x} cy={sec.y} r="3" fill="#00E5FF" />
                      <line
                        x1={sec.x - 8}
                        y1={sec.y}
                        x2={sec.x + 8}
                        y2={sec.y}
                        stroke="#00E5FF"
                        strokeWidth="2"
                      />
                      <text
                        x={sec.x + 12}
                        y={sec.y + 4}
                        fill="#00E5FF"
                        fontSize="11"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="600"
                      >
                        {sec.id}
                      </text>
                    </>
                  )}
                </g>
              ))}

              {/* Turn Markers Anchored Exactly Along Track Coordinates */}
              {turns.map((turn) => {
                const isSelected = activeTurn === turn.id;
                const isPeakScrub = turn.type === 'peak_scrub';
                const isHeavyBraking = turn.type === 'heavy_braking';

                let fillColor = '#14171F';
                let strokeColor = '#505666';
                let filterStyle = undefined;

                if (isPeakScrub) {
                  fillColor = '#E10600';
                  strokeColor = '#FFFFFF';
                  filterStyle = 'url(#glow-red)';
                } else if (isHeavyBraking) {
                  fillColor = '#E5A823';
                  strokeColor = '#0B0D11';
                  filterStyle = 'url(#glow-amber)';
                }

                if (isSelected) {
                  strokeColor = '#FFFFFF';
                }

                return (
                  <g
                    key={turn.id}
                    className="cursor-pointer transition-transform group"
                    onClick={() => setActiveTurn(turn.id)}
                    onMouseEnter={() => setActiveTurn(turn.id)}
                  >
                    {/* Concentric Selection Halo */}
                    {isSelected && (
                      <circle
                        cx={turn.x}
                        cy={turn.y}
                        r="15"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        className="animate-pulse"
                      />
                    )}

                    {isPeakScrub && (
                      <circle
                        cx={turn.x}
                        cy={turn.y}
                        r="16"
                        fill="#E10600"
                        fillOpacity="0.2"
                        className="animate-pulse"
                      />
                    )}

                    {/* Node Circle at Exact Coordinates */}
                    <circle
                      cx={turn.x}
                      cy={turn.y}
                      r={isSelected ? 9 : 7.5}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter={filterStyle}
                      className="group-hover:scale-125 transition-transform"
                    />

                    {/* Turn Label Text */}
                    <text
                      x={turn.x}
                      y={turn.y - 13}
                      textAnchor="middle"
                      fill={isSelected ? '#FFFFFF' : isPeakScrub ? '#FF4A45' : isHeavyBraking ? '#F5B83D' : '#8E94A2'}
                      fontSize={isSelected ? '12' : '11'}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      className="select-none pointer-events-none"
                    >
                      T{turn.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Stint Progression Scrubber (Bottom) */}
          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
            
            {/* Authentic Pit-Wall Telemetry Readout Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[#0A0C0F] px-4 py-2 rounded-lg border border-white/[0.07] text-zinc-400">
              <div className="flex items-center gap-2.5">
                <span className="font-semibold text-zinc-200 tracking-wide font-mono tabular-nums">
                  STINT LAP {String(currentLap).padStart(2, '0')} / {String(totalStintLaps).padStart(2, '0')}
                </span>
                <span className="text-zinc-700">|</span>
                <span>
                  Lap Time: <strong className="text-zinc-200 font-mono tabular-nums">{currentLapData?.raw_lap_time?.toFixed(3) ?? '81.847'}s</strong>
                </span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <span>
                  Fuel: <strong className="text-zinc-200 font-mono tabular-nums">{currentLapData?.fuel_remaining_kg?.toFixed(1) ?? '33.3'} kg</strong>
                </span>
                <span className="text-zinc-700">|</span>
                <span>
                  Compound: <strong className={`${getCompoundColor(selectedCompound)} font-mono`}>
                    {selectedCompound} [{getCompoundCode(selectedCompound)}]
                  </strong>
                </span>
                <span className="text-zinc-700">|</span>
                <span>
                  Tyre Age: <strong className="text-zinc-200 font-mono tabular-nums">{currentLapData?.tyre_life ?? 1} Laps</strong>
                </span>
              </div>
            </div>

            {/* Playback Controls & Slider */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-8 h-8 rounded-md bg-[#E10600] hover:bg-[#C00500] text-white flex items-center justify-center transition-colors shadow-sm"
                title={isPlaying ? 'Pause simulation' : 'Play simulation'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => setLap(Math.max(1, currentLap - 1))}
                disabled={currentLap <= 1}
                className="w-7 h-7 rounded-md border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                title="Previous lap"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="1"
                max={totalStintLaps}
                value={currentLap}
                onChange={(e) => setLap(parseInt(e.target.value, 10))}
                className="flex-1 accent-[#E10600] cursor-pointer h-1.5 bg-white/[0.08] rounded-lg"
              />

              <button
                onClick={() => setLap(Math.min(totalStintLaps, currentLap + 1))}
                disabled={currentLap >= totalStintLaps}
                className="w-7 h-7 rounded-md border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                title="Next lap"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Right 4 Cols: Corner Telemetry Data Block */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="f1-card p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-[#E10600]/15 border border-[#E10600]/35 text-[#FF3B30] font-display font-black text-sm flex items-center justify-center">
                  T{activeTurnData.id}
                </span>
                <div>
                  <div className="f1-display text-sm tracking-wide text-white font-bold">
                    {activeTurnData.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans tracking-wide uppercase">
                    Micro-Sector Channel Log
                  </div>
                </div>
              </div>

              {activeTurnData.type === 'peak_scrub' && (
                <MetricBadge text="Peak Scrub Zone" type="tag" />
              )}
              {activeTurnData.type === 'heavy_braking' && (
                <MetricBadge text="Braking Zone" type="tag" />
              )}
            </div>

            {/* Official F1 Standings/Results Table Pattern */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-zinc-500 text-[10px] font-display uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-2 font-medium">Channel</th>
                    <th className="py-2.5 px-2 text-right font-medium">Value</th>
                    <th className="py-2.5 px-2 text-right font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-2 text-zinc-300 font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E10600] shrink-0" />
                      <span>Lateral Accel</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold font-mono tabular-nums text-white text-xs">{activeTurnData.lateral_g.toFixed(2)}</td>
                    <td className="py-2.5 px-2 text-right text-zinc-500 font-mono text-[10px]">g</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-2 text-zinc-300 font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span>Roll Transfer</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold font-mono tabular-nums text-sky-400 text-xs">{activeTurnData.roll_transfer.toFixed(1)}</td>
                    <td className="py-2.5 px-2 text-right text-zinc-500 font-mono text-[10px]">% [Outer L]</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-2 text-zinc-300 font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>Pitch Bias</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold font-mono tabular-nums text-amber-400 text-xs">{activeTurnData.pitch_bias.toFixed(1)}</td>
                    <td className="py-2.5 px-2 text-right text-zinc-500 font-mono text-[10px]">% [Front]</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-2 text-zinc-300 font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>Apex Speed</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold font-mono tabular-nums text-white text-xs">{activeTurnData.apex_speed_kmh.toFixed(1)}</td>
                    <td className="py-2.5 px-2 text-right text-zinc-500 font-mono text-[10px]">km/h</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-2 text-zinc-300 font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] shrink-0" />
                      <span>Limiting Corner</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold font-mono tabular-nums text-[#FF3B30] text-xs">{activeTurnData.limiting_tyre}</td>
                    <td className="py-2.5 px-2 text-right text-zinc-500 font-mono text-[10px]">{compoundMetadata?.limiting_workload_pct?.toFixed(1) ?? '36.2'}% Load</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-2 text-zinc-300 font-sans flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                      <span>Heat Flux Density</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold font-mono tabular-nums text-white text-xs">{activeTurnData.heat_flux_kw.toFixed(1)}</td>
                    <td className="py-2.5 px-2 text-right text-zinc-500 font-mono text-[10px]">kW/m²</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Circuit Archetype Parameters */}
            <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-1">
              <div className="text-zinc-500 text-[10px] font-display uppercase tracking-wider font-semibold mb-1">
                Circuit Archetype
              </div>
              <DataListRow
                label="Macro Category:"
                value={activeCircuitInfo.archetype}
                valueClassName="text-zinc-200 font-medium font-sans text-[11px]"
              />
              <DataListRow
                label="Circuit Length:"
                value={`${activeCircuitInfo.length_km} km (${activeCircuitInfo.turns} Turns)`}
                valueClassName="text-zinc-200 font-medium font-mono"
              />
              <DataListRow
                label="Limiting Corner:"
                value={`${activeCircuitInfo.limiting_wheel_name} (${compoundMetadata?.limiting_workload_pct?.toFixed(1) ?? '36.2'}% Share)`}
                valueClassName="text-[#FF3B30] font-semibold font-sans"
              />
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
