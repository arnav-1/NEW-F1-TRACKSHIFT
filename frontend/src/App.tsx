import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { MetricRibbon } from './components/MetricRibbon';
import { ChassisLoadMatrix } from './components/ChassisLoadMatrix';
import { ConfounderDecoupleChart } from './components/ConfounderDecoupleChart';
import { TriMechanismWearChart } from './components/TriMechanismWearChart';
import { ValidationBenchmarkTable } from './components/ValidationBenchmarkTable';
import { AblationDrawer } from './components/AblationDrawer';
import { generateLapTelemetry } from './data/mockTelemetry';
import type { CircuitId, SessionId, TyreCompound, AblationConfig } from './types/telemetry';
import { Play, Pause, SkipBack, SkipForward, Clock, Cpu, MapPin } from 'lucide-react';

export function App() {
  const [currentCircuit, setCurrentCircuit] = useState<CircuitId>('barcelona');
  const [currentSession, setCurrentSession] = useState<SessionId>('Race');
  const [currentCompound, setCurrentCompound] = useState<TyreCompound>('SOFT');
  const [isAblationOpen, setIsAblationOpen] = useState<boolean>(false);
  const [selectedLapIndex, setSelectedLapIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [ablationConfig, setAblationConfig] = useState<AblationConfig>({
    aeroDeficit: 0.88,
    massSquaredScaling: true,
    paceManagementPush: 0.94,
  });

  // Generate telemetry stream dynamically based on circuit, session, compound, and ablation parameters
  const telemetryData = useMemo(() => {
    return generateLapTelemetry(
      currentCircuit,
      currentSession,
      currentCompound,
      ablationConfig.aeroDeficit,
      ablationConfig.massSquaredScaling,
      ablationConfig.paceManagementPush
    );
  }, [currentCircuit, currentSession, currentCompound, ablationConfig]);

  // Ensure selected lap index stays within bounds when dataset length changes
  const safeLapIndex = Math.min(selectedLapIndex, telemetryData.length - 1);
  const currentLap = telemetryData[safeLapIndex] || telemetryData[0];

  // Auto-playback simulation loop
  React.useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setSelectedLapIndex((prev) => (prev + 1) % telemetryData.length);
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, telemetryData.length]);

  return (
    <div className="min-h-screen bg-haas-bg text-haas-white flex flex-col font-sans carbon-grid">
      
      {/* 1. Pit-Wall Top Navigation & Session Controller */}
      <Header
        currentCircuit={currentCircuit}
        onCircuitChange={(c) => {
          setCurrentCircuit(c);
          setSelectedLapIndex(0);
        }}
        currentSession={currentSession}
        onSessionChange={(s) => {
          setCurrentSession(s);
          setSelectedLapIndex(0);
        }}
        currentCompound={currentCompound}
        onCompoundChange={(comp) => {
          setCurrentCompound(comp);
          setSelectedLapIndex(0);
        }}
        onOpenAblation={() => setIsAblationOpen(true)}
      />

      {/* Main Pit-Wall Cockpit Content Area */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-3 sm:p-4 lg:p-5 space-y-3.5">
        
        {/* 2. KPI Metrics Ribbon Strip */}
        <MetricRibbon currentLapData={currentLap} />

        {/* 3. Core 2x2 Telemetry Grid Panels */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
          
          {/* PANEL 1: 4-Wheel Asymmetric Workload Matrix */}
          <div className="min-h-[460px]">
            <ChassisLoadMatrix corners={currentLap.corners} />
          </div>

          {/* PANEL 2: Observational Confounder Decoupling Chart */}
          <div className="min-h-[460px]">
            <ConfounderDecoupleChart telemetryData={telemetryData} />
          </div>

          {/* PANEL 3: Tri-Mechanism Wear Breakdown & Thermal ODEs */}
          <div className="min-h-[410px]">
            <TriMechanismWearChart telemetryData={telemetryData} />
          </div>

          {/* PANEL 4: Post-Race Sunday Benchmark Validation */}
          <div className="min-h-[410px]">
            <ValidationBenchmarkTable />
          </div>

        </div>

        {/* 4. Live Pit-Wall Stint Scrubber & Playback Controller */}
        <div className="pitwall-panel p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono shadow-xl border-haas-border/80">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-haas-red hover:bg-red-700 text-white flex items-center justify-center shadow-sm shadow-haas-red/50 transition-all flex-shrink-0"
              title={isPlaying ? 'Pause Telemetry Playback' : 'Simulate Live Lap Playback'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            {/* Previous Lap Button */}
            <button
              onClick={() => setSelectedLapIndex(Math.max(0, safeLapIndex - 1))}
              disabled={safeLapIndex === 0}
              className="p-1.5 rounded-md hover:bg-[#181824] text-haas-gray hover:text-white disabled:opacity-30 transition-colors"
              title="Previous Lap"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Active Lap Counter */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-haas-gray font-semibold">STINT LAP:</span>
              <span className="font-black text-haas-white text-sm">{currentLap.lap_number}</span>
              <span className="text-haas-gray">/ {telemetryData.length}</span>
            </div>

            {/* Next Lap Button */}
            <button
              onClick={() => setSelectedLapIndex(Math.min(telemetryData.length - 1, safeLapIndex + 1))}
              disabled={safeLapIndex === telemetryData.length - 1}
              className="p-1.5 rounded-md hover:bg-[#181824] text-haas-gray hover:text-white disabled:opacity-30 transition-colors"
              title="Next Lap"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Scrub Slider */}
          <div className="flex-1 w-full max-w-xl flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={telemetryData.length - 1}
              value={safeLapIndex}
              onChange={(e) => setSelectedLapIndex(parseInt(e.target.value))}
              className="w-full accent-haas-red cursor-pointer"
            />
          </div>

          {/* Live Telemetry Status Indicators */}
          <div className="flex items-center gap-3 text-[11px] text-haas-gray">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-haas-cyan" />
              <span>Clean Pace: <strong className="text-haas-white font-mono">{currentLap.pace_corrected_s.toFixed(3)}s</strong></span>
            </span>
            <span className="hidden md:inline text-haas-border">•</span>
            <span className="hidden md:flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-haas-red" />
              <span>Limiting Corner: <strong className="text-haas-red font-black">FL (36.2%)</strong></span>
            </span>
            <span className="hidden lg:inline text-haas-border">•</span>
            <span className="hidden lg:flex items-center gap-1 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-haas-red" />
              <span>{currentCircuit === 'barcelona' ? 'Catalunya 4.657 km' : 'Silverstone 5.891 km'}</span>
            </span>
          </div>
        </div>

      </main>

      {/* 5. Engineering Ablation Control Drawer (Panel 5) */}
      <AblationDrawer
        isOpen={isAblationOpen}
        onClose={() => setIsAblationOpen(false)}
        config={ablationConfig}
        onChange={setAblationConfig}
      />

    </div>
  );
}

export default App;
