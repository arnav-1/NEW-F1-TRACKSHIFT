import React, { useState } from 'react';
import { BARCELONA_TURNS, type CircuitTurn } from '../data/barcelonaTrackData';
import type { LapTelemetryRecord } from '../types/telemetry';
import { Play, Pause, SkipBack, SkipForward, Flame, Zap, Gauge, Navigation, Info, ArrowUp, ArrowRight } from 'lucide-react';

interface CircuitMapProps {
  currentLap: LapTelemetryRecord;
  totalLaps: number;
  currentLapIndex: number;
  onLapChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const CircuitMap: React.FC<CircuitMapProps> = ({
  currentLap,
  totalLaps,
  currentLapIndex,
  onLapChange,
  isPlaying,
  onTogglePlay,
}) => {
  const [selectedTurn, setSelectedTurn] = useState<CircuitTurn>(BARCELONA_TURNS[2]); // Default Turn 3 (Limiting Hotspot)

  // Track SVG Path for Circuit de Barcelona-Catalunya (Modern 14-turn layout without chicane)
  // Scaled cleanly in a 600 x 360 canvas
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
      
      {/* Top Telemetry KPI Metric Strip (Black Pit-Wall Style) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Fuel Mass Penalty */}
        <div className="tgr-card p-4 border-l-4 border-l-[#E10600]">
          <div className="flex items-center justify-between text-[#8C8C9A] text-xs font-mono font-medium mb-1">
            <span>FUEL PENALTY DELTA</span>
            <span className="text-[10px] bg-[#0B0B0E] px-1.5 py-0.5 rounded text-[#8C8C9A] border border-[#242432]">0.033 s/kg</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#F5F5F7] telemetry-tabular">
            +{currentLap.fuel_penalty_s.toFixed(3)}s
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between">
            <span>Mass on board:</span>
            <span className="font-bold text-[#F5F5F7]">{currentLap.fuel_remaining_kg} kg</span>
          </div>
        </div>

        {/* Metric 2: Track Evolution Grip Gain */}
        <div className="tgr-card p-4 border-l-4 border-l-[#00E5FF]">
          <div className="flex items-center justify-between text-[#8C8C9A] text-xs font-mono font-medium mb-1">
            <span className="text-[#00E5FF] font-bold">TRACK EVOLUTION</span>
            <span className="text-[10px] bg-[#00E5FF]/10 text-[#00E5FF] px-1.5 py-0.5 rounded font-mono border border-[#00E5FF]/20">1.25s Max</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#00E5FF] telemetry-tabular">
            -{currentLap.track_evolution_s.toFixed(3)}s
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between">
            <span>Grip saturation:</span>
            <span className="font-bold text-[#F5F5F7]">{((currentLap.track_evolution_s / 1.25) * 100).toFixed(0)}% saturated</span>
          </div>
        </div>

        {/* Metric 3: Microclimate Temperatures */}
        <div className="tgr-card p-4 border-l-4 border-l-[#FF9100]">
          <div className="flex items-center justify-between text-[#8C8C9A] text-xs font-mono font-medium mb-1">
            <span>MICROCLIMATE TEMPS</span>
            <span className="text-[10px] bg-[#FF9100]/10 text-[#FF9100] px-1.5 py-0.5 rounded font-mono border border-[#FF9100]/20">IR Sensor</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#F5F5F7] telemetry-tabular flex items-baseline gap-2">
            <span>42.8°C</span>
            <span className="text-xs text-[#8C8C9A] font-normal">Track</span>
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between">
            <span>Ambient Air:</span>
            <span className="font-bold text-[#F5F5F7]">28.1°C (Dry)</span>
          </div>
        </div>

        {/* Metric 4: Primary Limiting Tyre (FL) */}
        <div className="tgr-card p-4 border-l-4 border-l-[#E10600] bg-gradient-to-br from-[#15151E] to-[#220d11]">
          <div className="flex items-center justify-between text-[#E10600] text-xs font-mono font-bold mb-1">
            <span>LIMITING TYRE</span>
            <span className="text-[9px] bg-[#E10600] text-white px-1.5 py-0.5 rounded font-black tracking-wider shadow-sm">CRITICAL</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#E10600] telemetry-tabular">
            FRONT-LEFT (FL)
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between">
            <span>Sliding Share:</span>
            <span className="font-black text-[#F5F5F7]">36.2% Workload</span>
          </div>
        </div>

        {/* Metric 5: Analytical Stint Cliff */}
        <div className="tgr-card p-4 border-l-4 border-l-purple-500 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-[#8C8C9A] text-xs font-mono font-medium mb-1">
            <span>PREDICTED CLIFF</span>
            <span className="text-[10px] bg-purple-950/40 text-purple-300 px-1.5 py-0.5 rounded font-mono border border-purple-800/40">&gt;0.25s / lap</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#F5F5F7] telemetry-tabular flex items-baseline gap-1.5">
            <span>LAP 19.4</span>
            <span className="text-xs text-[#E10600] font-bold">±0.5 Laps</span>
          </div>
          <div className="text-xs text-[#8C8C9A] font-mono mt-1 flex justify-between">
            <span>Target In-Lap Window:</span>
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
              <h2 className="text-base font-black text-[#F5F5F7] flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#E10600]" />
                <span>Circuit de Barcelona-Catalunya (Montmeló)</span>
              </h2>
              <p className="text-xs text-[#8C8C9A] font-mono mt-0.5">
                4.657 km • 14 Turns (Chicane Eliminated) • Clockwise Orientation (65% Right-Hand Load)
              </p>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#F5F5F7]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E10600] animate-pulse"></span>
                <span>Peak FL Stress (T3 & T9)</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#F5F5F7]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF9100]"></span>
                <span>Heavy Braking / Pitch (T1 & T10)</span>
              </span>
            </div>
          </div>

          {/* SVG Map Canvas (Deep Pit-Wall Black) */}
          <div className="w-full h-[380px] flex items-center justify-center relative bg-[#09090D] rounded-xl border border-[#242432] p-2 overflow-hidden shadow-inner">
            
            {/* Subtle Grid Watermark */}
            <div className="absolute inset-0 bg-[radial-gradient(#1E1E2E_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>

            <div className="absolute top-4 left-4 text-xs font-mono text-[#8C8C9A]/50 font-bold pointer-events-none">
              TGR Haas Pit-Wall TrackShift
            </div>

            <svg
              viewBox="80 50 480 280"
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

              {/* Start / Finish Line */}
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

              {/* Turn 3 Peak FL Thermal Highlight Glow */}
              <circle cx="520" cy="180" r="20" fill="#E10600" fillOpacity="0.3" className="animate-ping" />
              <circle cx="520" cy="180" r="10" fill="#E10600" fillOpacity="0.8" />

              {/* Turn 9 High-Speed Campsa FL Highlight Glow */}
              <circle cx="180" cy="75" r="18" fill="#E10600" fillOpacity="0.3" className="animate-ping" />
              <circle cx="180" cy="75" r="9" fill="#E10600" fillOpacity="0.8" />

              {/* Turn 1 & Turn 10 Braking Hotspots (Amber) */}
              <circle cx="480" cy="85" r="12" fill="#FF9100" fillOpacity="0.5" />
              <circle cx="110" cy="170" r="12" fill="#FF9100" fillOpacity="0.5" />

              {/* Interactive Turn Clickable Nodes T1 to T14 */}
              {BARCELONA_TURNS.map((turn) => {
                const isSelected = selectedTurn.number === turn.number;
                const isLimiting = turn.is_limiting_hotspot;
                const isBraking = turn.is_braking_hotspot;

                let nodeColor = '#333345';
                if (isLimiting) nodeColor = '#E10600';
                else if (isBraking) nodeColor = '#FF9100';

                return (
                  <g
                    key={turn.number}
                    className="cursor-pointer transition-all duration-150 group"
                    onClick={() => setSelectedTurn(turn)}
                  >
                    {/* Outer glow on selection */}
                    {isSelected && (
                      <circle
                        cx={turn.x}
                        cy={turn.y}
                        r="14"
                        fill="#E10600"
                        fillOpacity="0.3"
                      />
                    )}

                    {/* Node circle */}
                    <circle
                      cx={turn.x}
                      cy={turn.y}
                      r={isSelected ? 9 : 7}
                      fill={isSelected ? '#E10600' : '#111116'}
                      stroke={isSelected ? '#FFFFFF' : nodeColor}
                      strokeWidth={isSelected ? 2.5 : 2}
                      className="transition-all"
                    />

                    {/* Turn Number Tag */}
                    <text
                      x={turn.x}
                      y={turn.y - 12}
                      fill={isSelected ? '#E10600' : '#F5F5F7'}
                      fontSize={isSelected ? "11" : "9"}
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      T{turn.number}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Lap Playback & Stint Scrubber Bar */}
          <div className="mt-4 pt-4 border-t border-[#242432] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onTogglePlay}
                className="w-9 h-9 rounded-lg bg-[#E10600] hover:bg-[#B30500] text-white flex items-center justify-center shadow-haas-red transition-all"
                title={isPlaying ? 'Pause Stint Simulation' : 'Play Stint Telemetry'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              <button
                onClick={() => onLapChange(Math.max(0, currentLapIndex - 1))}
                disabled={currentLapIndex === 0}
                className="p-2 rounded-lg bg-[#151520] hover:bg-[#1E1E2C] text-[#8C8C9A] hover:text-white disabled:opacity-40 transition-colors border border-[#242432]"
                title="Previous Lap"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <div className="flex items-baseline gap-1.5">
                <span className="text-[#8C8C9A] font-medium">STINT LAP:</span>
                <span className="text-base font-black text-[#F5F5F7]">{currentLap.lap_number}</span>
                <span className="text-[#8C8C9A]">/ {totalLaps}</span>
              </div>

              <button
                onClick={() => onLapChange(Math.min(totalLaps - 1, currentLapIndex + 1))}
                disabled={currentLapIndex === totalLaps - 1}
                className="p-2 rounded-lg bg-[#151520] hover:bg-[#1E1E2C] text-[#8C8C9A] hover:text-white disabled:opacity-40 transition-colors border border-[#242432]"
                title="Next Lap"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Scrub Slider */}
            <div className="flex-1 w-full max-w-md flex items-center gap-3">
              <input
                type="range"
                min="0"
                max={totalLaps - 1}
                value={currentLapIndex}
                onChange={(e) => onLapChange(parseInt(e.target.value))}
                className="w-full accent-[#E10600] cursor-pointer"
              />
            </div>

            {/* Clean Pace & Fuel Readout */}
            <div className="text-right text-[11px] text-[#8C8C9A]">
              <div>Clean Pace: <strong className="text-[#F5F5F7] font-mono">{currentLap.pace_corrected_s.toFixed(3)}s</strong></div>
              <div>Fuel on Board: <strong className="text-[#00E5FF] font-mono">{currentLap.fuel_remaining_kg} kg</strong></div>
            </div>
          </div>

        </div>

        {/* Right 4 Cols: Interactive Micro-Sector Turn Inspector Card */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Selected Turn Detail Card */}
          <div className="tgr-card p-5 border-t-4 border-t-[#E10600]">
            <div className="flex items-center justify-between border-b border-[#242432] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0B0B0E] border border-[#242432] text-white flex items-center justify-center font-mono font-black text-sm">
                  T{selectedTurn.number}
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#F5F5F7]">{selectedTurn.name}</h3>
                  <span className="text-[10px] text-[#8C8C9A] font-mono">Sector {selectedTurn.sector} Micro-Sector</span>
                </div>
              </div>

              {selectedTurn.is_limiting_hotspot ? (
                <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded bg-red-950/60 text-[#E10600] border border-red-800/50">
                  PEAK FL WEAR
                </span>
              ) : selectedTurn.is_braking_hotspot ? (
                <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded bg-amber-950/60 text-[#FF9100] border border-amber-800/50">
                  HEAVY BRAKING
                </span>
              ) : (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[#0B0B0E] text-[#8C8C9A] border border-[#242432]">
                  BALANCED LOAD
                </span>
              )}
            </div>

            <p className="text-xs text-[#8C8C9A] leading-relaxed mb-4">
              {selectedTurn.description}
            </p>

            {/* Telemetry Channels for this Turn */}
            <div className="space-y-3 bg-[#0B0B0E] p-3.5 rounded-xl border border-[#242432] font-mono text-xs">
              
              <div className="flex items-center justify-between">
                <span className="text-[#8C8C9A] flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-slate-400" />
                  Peak Lateral Load:
                </span>
                <span className="font-black text-[#F5F5F7] text-sm">
                  {selectedTurn.lateral_g.toFixed(1)} G
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8C8C9A] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#E10600]" />
                  Dominant Loaded Tyre:
                </span>
                <span className={`font-black ${selectedTurn.dominant_tyre === 'FL' ? 'text-[#E10600]' : 'text-[#F5F5F7]'}`}>
                  {selectedTurn.dominant_tyre === 'FL' ? 'FRONT-LEFT (FL)' : selectedTurn.dominant_tyre}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8C8C9A] flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  Centripetal Roll Transfer:
                </span>
                <span className="font-black text-[#F5F5F7]">
                  {selectedTurn.roll_load_share_pct}% Axle Roll Share
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8C8C9A] flex items-center gap-1.5">
                  <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                  Braking Pitch Bias:
                </span>
                <span className="font-black text-[#F5F5F7]">
                  {selectedTurn.pitch_transfer_pct}% Front Bias
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#242432]">
                <span className="text-[#8C8C9A] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  Frictional Heat Flux (Q_frict):
                </span>
                <span className="font-black text-[#E10600]">
                  ~{selectedTurn.heat_flux_kw} kW
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8C8C9A]">
                <span>Apex Speed:</span>
                <span className="font-bold text-[#F5F5F7]">{selectedTurn.apex_speed_kmh} km/h</span>
              </div>

            </div>

            <div className="mt-3 text-[11px] text-[#8C8C9A] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#E10600] flex-shrink-0" />
              <span>Click any turn marker on the track to inspect real-time lateral weight transfer.</span>
            </div>
          </div>

          {/* Circuit Archetype Parameters */}
          <div className="tgr-card p-4 text-xs font-mono">
            <h4 className="font-black text-[#F5F5F7] text-[11px] mb-2">
              Circuit Archetype Parameters
            </h4>
            <div className="space-y-1.5 text-[#8C8C9A]">
              <div className="flex justify-between">
                <span>Macro Category:</span>
                <span className="font-bold text-[#F5F5F7]">High Downforce / Severe Lateral Scrub</span>
              </div>
              <div className="flex justify-between">
                <span>Asymmetric Ratio:</span>
                <span className="font-bold text-[#E10600]">65% Right / 35% Left</span>
              </div>
              <div className="flex justify-between">
                <span>Limiting Corner:</span>
                <span className="font-bold text-[#E10600]">Front-Left (36.2% Energy Share)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
