import React from 'react';
import { BARCELONA_TURNS, BARCELONA_SECTORS, BARCELONA_SVG_PATH, type TurnMarkerData } from '../data/barcelonaTrackData';
import { useTelemetry } from '../context/TelemetryContext';
import { Play, Pause, SkipBack, SkipForward, Navigation } from 'lucide-react';

export { BARCELONA_TURNS, BARCELONA_SECTORS, BARCELONA_SVG_PATH };
export type { TurnMarkerData };

export const CircuitMap: React.FC = () => {
  const {
    selectedCompound,
    currentLap,
    totalStintLaps,
    isPlaying,
    activeTurn,
    setLap,
    setIsPlaying,
    setActiveTurn,
    currentLapData,
  } = useTelemetry();

  const activeTurnData: TurnMarkerData =
    BARCELONA_TURNS.find((t) => t.id === activeTurn) || BARCELONA_TURNS[2]; // Default to Turn 3 (Renault)

  const getCompoundColor = (comp: string) => {
    switch (comp) {
      case 'SOFT':
        return 'text-[#E10600]';
      case 'MEDIUM':
        return 'text-[#E5A823]';
      case 'HARD':
        return 'text-white';
      default:
        return 'text-[#E10600]';
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
    <div className="space-y-6">
      
      {/* Top Telemetry KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Fuel Mass Penalty */}
        <div className="tgr-card p-4 border-l-4 border-l-[#E10600]">
          <div className="flex items-center justify-between text-[#8C8C9A] text-[11px] font-mono font-bold tracking-wider mb-1">
            <span>FUEL PENALTY DELTA</span>
            <span className="text-[10px] bg-[#0B0B0E] px-1.5 py-0.5 rounded text-[#8C8C9A] border border-[#242432]">0.033 s/kg</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F5F7] tabular-nums">
            +{currentLapData?.fuel_penalty_s?.toFixed(3) ?? '0.000'}s
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between tabular-nums">
            <span>Mass on board:</span>
            <span className="font-bold text-[#F5F5F7]">{currentLapData?.fuel_remaining_kg?.toFixed(1) ?? '33.3'} kg</span>
          </div>
        </div>

        {/* Metric 2: Track Evolution Grip Gain */}
        <div className="tgr-card p-4 border-l-4 border-l-[#00E5FF]">
          <div className="flex items-center justify-between text-[#8C8C9A] text-[11px] font-mono font-bold tracking-wider mb-1">
            <span className="text-[#00E5FF]">TRACK EVOLUTION</span>
            <span className="text-[10px] bg-[#00E5FF]/10 text-[#00E5FF] px-1.5 py-0.5 rounded font-mono border border-[#00E5FF]/20">1.25s Max</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#00E5FF] tabular-nums">
            -{currentLapData?.track_evolution_s?.toFixed(3) ?? '0.000'}s
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between tabular-nums">
            <span>Grip saturation:</span>
            <span className="font-bold text-[#F5F5F7]">
              {(((currentLapData?.track_evolution_s ?? 0) / 1.25) * 100).toFixed(0)}% saturated
            </span>
          </div>
        </div>

        {/* Metric 3: Microclimate Temperatures */}
        <div className="tgr-card p-4 border-l-4 border-l-[#FF9100]">
          <div className="flex items-center justify-between text-[#8C8C9A] text-[11px] font-mono font-bold tracking-wider mb-1">
            <span>MICROCLIMATE TEMPS</span>
            <span className="text-[10px] bg-[#FF9100]/10 text-[#FF9100] px-1.5 py-0.5 rounded font-mono border border-[#FF9100]/20">IR Sensor</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F5F7] tabular-nums flex items-baseline gap-2">
            <span>42.8°C</span>
            <span className="text-xs text-[#8C8C9A] font-normal">Track</span>
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between tabular-nums">
            <span>Ambient Air:</span>
            <span className="font-bold text-[#F5F5F7]">28.1°C (Dry)</span>
          </div>
        </div>

        {/* Metric 4: Primary Limiting Tyre (FL) */}
        <div className="tgr-card p-4 border-l-4 border-l-[#E10600] bg-gradient-to-br from-[#15151E] to-[#220d11]">
          <div className="flex items-center justify-between text-[#E10600] text-[11px] font-mono font-bold tracking-wider mb-1">
            <span>LIMITING TYRE</span>
            <span className="text-[9px] bg-[#E10600] text-white px-1.5 py-0.5 rounded font-black tracking-wider">CRITICAL</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#E10600] tabular-nums">
            FRONT-LEFT (FL)
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between tabular-nums">
            <span>Sliding Share:</span>
            <span className="font-bold text-[#F5F5F7]">36.2% Workload</span>
          </div>
        </div>

        {/* Metric 5: Analytical Stint Cliff */}
        <div className="tgr-card p-4 border-l-4 border-l-purple-500 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-[#8C8C9A] text-[11px] font-mono font-bold tracking-wider mb-1">
            <span>PREDICTED CLIFF</span>
            <span className="text-[10px] bg-purple-950/40 text-purple-300 px-1.5 py-0.5 rounded font-mono border border-purple-800/40">&gt;0.25s / lap</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#F5F5F7] tabular-nums flex items-baseline gap-1.5">
            <span>LAP {selectedCompound === 'SOFT' ? '10.0' : selectedCompound === 'MEDIUM' ? '18.0' : '25.0'}</span>
            <span className="text-xs text-[#E10600] font-bold">±0.5 Laps</span>
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between tabular-nums">
            <span>Target Window:</span>
            <span className="font-bold text-purple-300">
              {selectedCompound === 'SOFT' ? 'Lap 9 – 11' : selectedCompound === 'MEDIUM' ? 'Lap 17 – 19' : 'Lap 24 – 26'}
            </span>
          </div>
        </div>

      </div>

      {/* Main Workspace Grid: Large Circuit Map & Turn Telemetry Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 8 Cols: Interactive Vector Track Map */}
        <div className="lg:col-span-8 tgr-card p-6 relative">
          
          {/* Track Map Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#242432]">
            <div>
              <h2 className="text-base font-bold text-[#F5F5F7] flex items-center gap-2 font-mono">
                <Navigation className="w-4 h-4 text-[#E10600]" />
                <span>CIRCUIT DE BARCELONA-CATALUNYA</span>
              </h2>
              <p className="text-xs text-[#8C8C9A] font-mono mt-0.5">
                4.657 KM | 14 TURNS | FIA GRADE 1 TIMING LOOPS S1 / S2 / S3
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#F5F5F7]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E10600] shadow-[0_0_6px_rgba(225,6,0,0.8)]"></span>
                <span>Peak FL Scrub (T3 & T9)</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#F5F5F7]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5A823]"></span>
                <span>Heavy Braking (T1, T4, T10)</span>
              </span>
            </div>
          </div>

          {/* SVG Map Canvas (True Barcelona Layout viewBox="0 0 1000 600") */}
          <div className="w-full h-[400px] flex items-center justify-center relative bg-[#09090D] rounded-xl border border-[#242432] p-2 overflow-hidden shadow-inner">
            
            {/* Subtle Grid Watermark */}
            <div className="absolute inset-0 bg-[radial-gradient(#1E1E2E_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>

            <div className="absolute top-4 left-4 text-xs font-mono text-[#8C8C9A]/50 font-bold pointer-events-none">
              TGR HAAS PIT-WALL TELEMETRY // MONTMELÓ
            </div>

            <svg
              viewBox="0 0 1000 600"
              className="w-full h-full max-h-[380px] drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] relative z-10"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#E10600" floodOpacity="0.8" />
                </filter>
                <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#E5A823" floodOpacity="0.8" />
                </filter>
              </defs>

              {/* Main Track Outer Dark Border: stroke-[#242432] stroke-[14] */}
              <path
                d={BARCELONA_SVG_PATH}
                fill="none"
                stroke="#242432"
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Inner Titanium Racing Line: stroke-[#8E929B] stroke-[5] */}
              <path
                d={BARCELONA_SVG_PATH}
                fill="none"
                stroke="#8E929B"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Centerline Dashed Telemetry Line */}
              <path
                d={BARCELONA_SVG_PATH}
                fill="none"
                stroke="#00E5FF"
                strokeWidth="1.5"
                strokeDasharray="6 6"
                opacity="0.5"
              />

              {/* Sector Timing Lines (S1, S2, S3) */}
              {BARCELONA_SECTORS.map((sec) => (
                <g key={sec.id}>
                  {sec.id === 'S3' ? (
                    <>
                      <line
                        x1={sec.x}
                        y1={sec.y - 14}
                        x2={sec.x}
                        y2={sec.y + 14}
                        stroke="#E10600"
                        strokeWidth="4"
                      />
                      <text
                        x={sec.x - 22}
                        y={sec.y + 30}
                        fill="#E10600"
                        fontSize="12"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        FINISH
                      </text>
                      <text
                        x={sec.x + 8}
                        y={sec.y + 16}
                        fill="#00E5FF"
                        fontSize="11"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
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
                        strokeWidth="2.5"
                      />
                      <text
                        x={sec.x + 12}
                        y={sec.y + 4}
                        fill="#00E5FF"
                        fontSize="11"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        {sec.id}
                      </text>
                    </>
                  )}
                </g>
              ))}

              {/* Turn Markers (T1 to T14) Anchored Exactly Along Track Coordinates */}
              {BARCELONA_TURNS.map((turn) => {
                const isSelected = activeTurn === turn.id;
                const isPeakScrub = turn.type === 'peak_scrub';
                const isHeavyBraking = turn.type === 'heavy_braking';

                let fillColor = '#151520';
                let strokeColor = '#64748B';
                let filterStyle = undefined;

                if (isPeakScrub) {
                  fillColor = '#E10600';
                  strokeColor = '#FFFFFF';
                  filterStyle = 'url(#glow-red)';
                } else if (isHeavyBraking) {
                  fillColor = '#E5A823';
                  strokeColor = '#0B0B0E';
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
                        strokeWidth="2"
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
                        fillOpacity="0.25"
                        className="animate-pulse"
                      />
                    )}

                    {/* Node Circle at Exact Coordinates */}
                    <circle
                      cx={turn.x}
                      cy={turn.y}
                      r={isSelected ? 10 : 8}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={filterStyle}
                      className="group-hover:scale-125 transition-transform"
                    />

                    {/* Turn Label Text */}
                    <text
                      x={turn.x}
                      y={turn.y - 14}
                      textAnchor="middle"
                      fill={isSelected ? '#FFFFFF' : isPeakScrub ? '#E10600' : isHeavyBraking ? '#E5A823' : '#8C8C9A'}
                      fontSize={isSelected ? '12' : '11'}
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
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
          <div className="mt-4 pt-4 border-t border-[#242432] space-y-3">
            
            {/* Authentic Pit-Wall Telemetry Readout Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-[#0B0B0E] px-3.5 py-2 rounded-lg border border-[#242432] text-[#8C8C9A]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#F5F5F7] tracking-wider">
                  STINT LAP {String(currentLap).padStart(2, '0')} / {String(totalStintLaps).padStart(2, '0')}
                </span>
                <span className="text-[#333345]">|</span>
                <span>
                  LAP TIME: <strong className="text-[#F5F5F7]">{currentLapData?.raw_lap_time?.toFixed(3) ?? '81.847'}s</strong>
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>
                  FUEL: <strong className="text-[#F5F5F7]">{currentLapData?.fuel_remaining_kg?.toFixed(1) ?? '33.3'} KG</strong>
                </span>
                <span className="text-[#333345]">|</span>
                <span>
                  COMPOUND: <strong className={getCompoundColor(selectedCompound)}>
                    {selectedCompound} [{getCompoundCode(selectedCompound)}]
                  </strong>
                </span>
                <span className="text-[#333345]">|</span>
                <span>
                  TYRE AGE: <strong className="text-[#F5F5F7]">{currentLapData?.tyre_life ?? 1} LAPS</strong>
                </span>
              </div>
            </div>

            {/* Playback Controls & Slider */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-8 h-8 rounded-lg bg-[#E10600] hover:bg-[#C00500] text-white flex items-center justify-center transition-colors shadow-sm"
                title={isPlaying ? 'Pause simulation' : 'Play simulation'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => setLap(Math.max(1, currentLap - 1))}
                disabled={currentLap <= 1}
                className="w-7 h-7 rounded border border-[#242432] bg-[#151520] hover:bg-[#1E1E2C] disabled:opacity-30 disabled:hover:bg-[#151520] text-[#8C8C9A] hover:text-white flex items-center justify-center transition-colors"
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
                className="flex-1 accent-[#E10600] cursor-pointer h-1.5 bg-[#1E1E2C] rounded-lg"
              />

              <button
                onClick={() => setLap(Math.min(totalStintLaps, currentLap + 1))}
                disabled={currentLap >= totalStintLaps}
                className="w-7 h-7 rounded border border-[#242432] bg-[#151520] hover:bg-[#1E1E2C] disabled:opacity-30 disabled:hover:bg-[#151520] text-[#8C8C9A] hover:text-white flex items-center justify-center transition-colors"
                title="Next lap"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Right 4 Cols: Corner Telemetry Data Block */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="tgr-card p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#242432]">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-[#E10600]/20 border border-[#E10600] text-[#E10600] font-mono font-bold text-xs flex items-center justify-center">
                  T{activeTurnData.id}
                </span>
                <div>
                  <div className="text-xs font-bold text-[#F5F5F7] font-mono">
                    {activeTurnData.name.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-[#8C8C9A] font-mono">
                    MICRO-SECTOR CHANNEL LOG
                  </div>
                </div>
              </div>

              {activeTurnData.type === 'peak_scrub' && (
                <span className="text-[9px] bg-[#E10600] text-white px-2 py-0.5 rounded font-mono font-bold">
                  PEAK FL WEAR
                </span>
              )}
              {activeTurnData.type === 'heavy_braking' && (
                <span className="text-[9px] bg-[#E5A823] text-black px-2 py-0.5 rounded font-mono font-bold">
                  BRAKING ZONE
                </span>
              )}
            </div>

            {/* Telemetry Channel Readout Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#242432] text-[#8C8C9A] text-[10px]">
                    <th className="py-2">CHANNEL</th>
                    <th className="py-2 text-right">VALUE</th>
                    <th className="py-2 text-right">UNIT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242432]/60 tabular-nums">
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">LATERAL_ACCEL</td>
                    <td className="py-2 text-right font-bold text-[#F5F5F7]">{activeTurnData.lateral_g.toFixed(2)}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">G</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">ROLL_TRANSFER</td>
                    <td className="py-2 text-right font-bold text-[#00E5FF]">{activeTurnData.roll_transfer.toFixed(1)}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">% [OUTER LEFT]</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">PITCH_BIAS</td>
                    <td className="py-2 text-right font-bold text-[#E5A823]">{activeTurnData.pitch_bias.toFixed(1)}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">% [FRONT]</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">APEX_SPEED</td>
                    <td className="py-2 text-right font-bold text-[#F5F5F7]">{activeTurnData.apex_speed_kmh.toFixed(1)}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">KM/H</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">LIMITING_CORNER</td>
                    <td className="py-2 text-right font-bold text-[#E10600]">{activeTurnData.limiting_tyre}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">[36.2% WORKLOAD]</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">HEAT_FLUX_DENSITY</td>
                    <td className="py-2 text-right font-bold text-[#F5F5F7]">{activeTurnData.heat_flux_kw.toFixed(1)}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">KW/M²</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Circuit Archetype Parameters */}
            <div className="mt-4 pt-3 border-t border-[#242432] space-y-1.5 text-[11px] font-mono">
              <div className="text-[#8C8C9A] text-[10px] font-bold">CIRCUIT ARCHETYPE PARAMETERS</div>
              <div className="flex justify-between text-[#8C8C9A]">
                <span>Macro Category:</span>
                <span className="text-[#F5F5F7] font-bold">High Downforce / Severe Lateral Scrub</span>
              </div>
              <div className="flex justify-between text-[#8C8C9A]">
                <span>Asymmetric Ratio:</span>
                <span className="text-[#F5F5F7] font-bold">65% Right / 35% Left</span>
              </div>
              <div className="flex justify-between text-[#8C8C9A]">
                <span>Limiting Corner:</span>
                <span className="text-[#E10600] font-bold">Front-Left (36.2% Energy Share)</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
