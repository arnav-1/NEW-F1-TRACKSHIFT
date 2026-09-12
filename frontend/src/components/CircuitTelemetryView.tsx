import React, { useState } from 'react';
import { BARCELONA_TURNS, type CircuitTurn } from '../data/barcelonaTrackData';
import type { LapTelemetryRecord } from '../types/telemetry';
import { Play, Pause, SkipBack, SkipForward, Navigation } from 'lucide-react';

interface CircuitTelemetryViewProps {
  currentLap: LapTelemetryRecord;
  totalLaps: number;
  currentLapIndex: number;
  onLapChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const CircuitTelemetryView: React.FC<CircuitTelemetryViewProps> = ({
  currentLap,
  totalLaps,
  currentLapIndex,
  onLapChange,
  isPlaying,
  onTogglePlay,
}) => {
  const [selectedTurn, setSelectedTurn] = useState<CircuitTurn>(BARCELONA_TURNS[2]); // Default T3 (Curva Renault)

  // Track SVG Path for Circuit de Barcelona-Catalunya (Modern 14-turn layout without chicane)
  const trackPath = `
    M 340 310
    L 460 310
    C 480 310, 495 295, 495 270
    L 495 110
    C 495 80, 480 65, 460 70
    C 440 75, 430 95, 435 115
    C 445 140, 535 140, 535 190
    C 535 235, 465 255, 430 245
    C 385 235, 360 215, 335 220
    C 305 225, 275 200, 260 195
    C 240 190, 225 155, 205 150
    C 190 145, 175 75, 155 75
    C 130 75, 115 120, 105 160
    C 95 200, 115 230, 130 235
    C 145 240, 160 265, 160 280
    C 160 305, 210 310, 240 310
    Z
  `;

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
            +{currentLap.fuel_penalty_s.toFixed(3)}s
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between tabular-nums">
            <span>Mass on board:</span>
            <span className="font-bold text-[#F5F5F7]">{currentLap.fuel_remaining_kg} kg</span>
          </div>
        </div>

        {/* Metric 2: Track Evolution Grip Gain */}
        <div className="tgr-card p-4 border-l-4 border-l-[#00E5FF]">
          <div className="flex items-center justify-between text-[#8C8C9A] text-[11px] font-mono font-bold tracking-wider mb-1">
            <span className="text-[#00E5FF]">TRACK EVOLUTION</span>
            <span className="text-[10px] bg-[#00E5FF]/10 text-[#00E5FF] px-1.5 py-0.5 rounded font-mono border border-[#00E5FF]/20">1.25s Max</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#00E5FF] tabular-nums">
            -{currentLap.track_evolution_s.toFixed(3)}s
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between tabular-nums">
            <span>Grip saturation:</span>
            <span className="font-bold text-[#F5F5F7]">{((currentLap.track_evolution_s / 1.25) * 100).toFixed(0)}% saturated</span>
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
            <span>LAP 19.4</span>
            <span className="text-xs text-[#E10600] font-bold">±0.5 Laps</span>
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between tabular-nums">
            <span>Target Window:</span>
            <span className="font-bold text-purple-300">Lap 18 – 20</span>
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
                <span className="w-2.5 h-2.5 rounded-full bg-[#E10600]"></span>
                <span>Peak FL Scrub (T3 & T9)</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#F5F5F7]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]"></span>
                <span>Braking Pitch (T1 & T10)</span>
              </span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="w-full h-[380px] flex items-center justify-center relative bg-[#09090D] rounded-xl border border-[#242432] p-2 overflow-hidden shadow-inner">
            
            {/* Subtle Grid Watermark */}
            <div className="absolute inset-0 bg-[radial-gradient(#1E1E2E_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>

            <div className="absolute top-4 left-4 text-xs font-mono text-[#8C8C9A]/50 font-bold pointer-events-none">
              TGR HAAS PIT-WALL TELEMETRY
            </div>

            <svg
              viewBox="80 50 480 290"
              className="w-full h-full max-h-[360px] drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] relative z-10"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Main Track Asphalt Ribbon */}
              <path
                d={trackPath}
                fill="none"
                stroke="#2B2B3D"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* High-Contrast Inner Track Line */}
              <path
                d={trackPath}
                fill="none"
                stroke="#F5F5F7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dashed Centerline */}
              <path
                d={trackPath}
                fill="none"
                stroke="#00E5FF"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.6"
              />

              {/* FIA Timing Loop S1 (Exit of Turn 3) */}
              <line x1="505" y1="210" x2="525" y2="210" stroke="#00E5FF" strokeWidth="2.5" />
              <text x="530" y="213" fill="#00E5FF" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold">S1</text>

              {/* FIA Timing Loop S2 (Post Turn 9) */}
              <line x1="215" y1="135" x2="235" y2="135" stroke="#00E5FF" strokeWidth="2.5" />
              <text x="240" y="138" fill="#00E5FF" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold">S2</text>

              {/* FIA Timing Loop S3 / Start & Finish Line */}
              <line
                x1="460"
                y1="300"
                x2="460"
                y2="320"
                stroke="#E10600"
                strokeWidth="4"
              />
              <text x="445" y="335" fill="#E10600" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">
                FINISH
              </text>
              <text x="466" y="318" fill="#00E5FF" fontSize="8" fontFamily="JetBrains Mono" fontWeight="bold">S3</text>

              {/* Turn 3 Peak FL Thermal Highlight Glow */}
              <circle cx="520" cy="180" r="18" fill="#E10600" fillOpacity="0.25" />
              <circle cx="520" cy="180" r="9" fill="#E10600" fillOpacity="0.8" />

              {/* Turn 9 High-Speed Campsa FL Highlight Glow */}
              <circle cx="180" cy="75" r="16" fill="#E10600" fillOpacity="0.25" />
              <circle cx="180" cy="75" r="8" fill="#E10600" fillOpacity="0.8" />

              {/* Turn 1 & Turn 10 Braking Hotspots (Amber) */}
              <circle cx="480" cy="85" r="12" fill="#D97706" fillOpacity="0.45" />
              <circle cx="110" cy="170" r="12" fill="#D97706" fillOpacity="0.45" />

              {/* Interactive Turn Clickable Nodes T1 to T14 */}
              {BARCELONA_TURNS.map((turn) => {
                const isSelected = selectedTurn.number === turn.number;
                const isLimiting = turn.is_limiting_hotspot;
                const isBraking = turn.is_braking_hotspot;

                let nodeColor = '#333345';
                if (isLimiting) nodeColor = '#E10600';
                else if (isBraking) nodeColor = '#D97706';

                return (
                  <g
                    key={turn.number}
                    className="cursor-pointer transition-all duration-150 group"
                    onClick={() => setSelectedTurn(turn)}
                  >
                    {/* Selection highlight ring */}
                    {isSelected && (
                      <circle
                        cx={turn.x}
                        cy={turn.y}
                        r="14"
                        fill="none"
                        stroke="#F5F5F7"
                        strokeWidth="2"
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Turn Marker Circle */}
                    <circle
                      cx={turn.x}
                      cy={turn.y}
                      r="7.5"
                      fill={isSelected ? '#F5F5F7' : '#151520'}
                      stroke={nodeColor}
                      strokeWidth="2.5"
                      className="group-hover:stroke-white transition-colors"
                    />

                    {/* Turn Label Text */}
                    <text
                      x={turn.x}
                      y={turn.y - 11}
                      textAnchor="middle"
                      fill={isSelected ? '#FFFFFF' : '#8C8C9A'}
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      className="select-none pointer-events-none"
                    >
                      T{turn.number}
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
                  STINT LAP {String(currentLap.lap_number).padStart(2, '0')} / {String(totalLaps).padStart(2, '0')}
                </span>
                <span className="text-[#333345]">|</span>
                <span>
                  LAP TIME: <strong className="text-[#F5F5F7]">{currentLap.raw_lap_time.toFixed(3)}s</strong>
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span>
                  FUEL: <strong className="text-[#F5F5F7]">{currentLap.fuel_remaining_kg.toFixed(1)} KG</strong>
                </span>
                <span className="text-[#333345]">|</span>
                <span>
                  COMPOUND: <strong className="text-[#E10600]">SOFT [C3]</strong>
                </span>
                <span className="text-[#333345]">|</span>
                <span>
                  TYRE AGE: <strong className="text-[#F5F5F7]">{currentLap.tyre_life} LAPS</strong>
                </span>
              </div>
            </div>

            {/* Playback Controls & Slider */}
            <div className="flex items-center gap-3">
              <button
                onClick={onTogglePlay}
                className="w-8 h-8 rounded-lg bg-[#E10600] hover:bg-[#C00500] text-white flex items-center justify-center transition-colors shadow-sm"
                title={isPlaying ? 'Pause simulation' : 'Play simulation'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => onLapChange(Math.max(0, currentLapIndex - 1))}
                disabled={currentLapIndex === 0}
                className="w-7 h-7 rounded border border-[#242432] bg-[#151520] hover:bg-[#1E1E2C] disabled:opacity-30 disabled:hover:bg-[#151520] text-[#8C8C9A] hover:text-white flex items-center justify-center transition-colors"
                title="Previous lap"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="0"
                max={totalLaps - 1}
                value={currentLapIndex}
                onChange={(e) => onLapChange(parseInt(e.target.value, 10))}
                className="flex-1 accent-[#E10600] cursor-pointer h-1.5 bg-[#1E1E2C] rounded-lg"
              />

              <button
                onClick={() => onLapChange(Math.min(totalLaps - 1, currentLapIndex + 1))}
                disabled={currentLapIndex >= totalLaps - 1}
                className="w-7 h-7 rounded border border-[#242432] bg-[#151520] hover:bg-[#1E1E2C] disabled:opacity-30 disabled:hover:bg-[#151520] text-[#8C8C9A] hover:text-white flex items-center justify-center transition-colors"
                title="Next lap"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Right 4 Cols: Corner Telemetry Data Block (Structured Table, No Prose) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="tgr-card p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#242432]">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-[#E10600]/20 border border-[#E10600] text-[#E10600] font-mono font-bold text-xs flex items-center justify-center">
                  T{selectedTurn.number}
                </span>
                <div>
                  <div className="text-xs font-bold text-[#F5F5F7] font-mono">
                    {selectedTurn.name.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-[#8C8C9A] font-mono">
                    SECTOR {selectedTurn.sector} MICRO-SECTOR
                  </div>
                </div>
              </div>

              {selectedTurn.is_limiting_hotspot && (
                <span className="text-[9px] bg-[#E10600] text-white px-2 py-0.5 rounded font-mono font-bold">
                  PEAK FL WEAR
                </span>
              )}
              {selectedTurn.is_braking_hotspot && (
                <span className="text-[9px] bg-[#D97706] text-white px-2 py-0.5 rounded font-mono font-bold">
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
                    <td className="py-2 text-right font-bold text-[#F5F5F7]">{selectedTurn.lateral_g.toFixed(2)}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">G</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">ROLL_TRANSFER</td>
                    <td className="py-2 text-right font-bold text-[#00E5FF]">{selectedTurn.roll_load_share_pct.toFixed(1)}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">% [OUTER LEFT]</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">PITCH_BIAS</td>
                    <td className="py-2 text-right font-bold text-[#FF9100]">{selectedTurn.pitch_transfer_pct.toFixed(1)}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">% [FRONT]</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">APEX_SPEED</td>
                    <td className="py-2 text-right font-bold text-[#F5F5F7]">{selectedTurn.apex_speed_kmh.toFixed(1)}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">KM/H</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">LIMITING_CORNER</td>
                    <td className="py-2 text-right font-bold text-[#E10600]">{selectedTurn.dominant_tyre}</td>
                    <td className="py-2 text-right text-[#8C8C9A]">[36.2% WORKLOAD]</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-[#8C8C9A]">HEAT_FLUX_DENSITY</td>
                    <td className="py-2 text-right font-bold text-[#F5F5F7]">{selectedTurn.heat_flux_kw.toFixed(1)}</td>
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
