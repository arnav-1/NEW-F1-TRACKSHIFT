import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { MetricRibbon } from './components/MetricRibbon';
import { ChassisLoadMatrix } from './components/ChassisLoadMatrix';
import { ConfounderDecoupleChart } from './components/ConfounderDecoupleChart';
import { TriMechanismWearChart } from './components/TriMechanismWearChart';
import { ValidationBenchmarkTable } from './components/ValidationBenchmarkTable';
import { AblationDrawer } from './components/AblationDrawer';
import { generateLapTelemetry } from './data/mockTelemetry';
import type { CircuitId, SessionId, AblationConfig } from './types/telemetry';
import { Play, Pause, SkipBack, SkipForward, Clock, Cpu } from 'lucide-react';

export function App() {
  const [currentCircuit, setCurrentCircuit] = useState<CircuitId>('barcelona');
  const [currentSession, setCurrentSession] = useState<SessionId>('Race');
  const [isAblationOpen, setIsAblationOpen] = useState<boolean>(false);
  const [selectedLapIndex, setSelectedLapIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [ablationConfig, setAblationConfig] = useState<AblationConfig>({
    aeroDeficit: 0.88,
    massSquaredScaling: true,
    paceManagementPush: 0.94,
  });

  // Generate telemetry stream dynamically based on circuit, session, and ablation parameters
  const telemetryData = useMemo(() => {
    return generateLapTelemetry(
      currentCircuit,
      currentSession,
      ablationConfig.aeroDeficit,
      ablationConfig.massSquaredScaling,
      ablationConfig.paceManagementPush
    );
  }, [currentCircuit, currentSession, ablationConfig]);

  // Active scrubbed lap data
  const currentLap = telemetryData[selectedLapIndex] || telemetryData[0];

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
      
      {/* 1. Pit-Wall Top Navigation */}
      <Header
        currentCircuit={currentCircuit}
        onCircuitChange={setCurrentCircuit}
        currentSession={currentSession}
        onSessionChange={setCurrentSession}
        onOpenAblation={() => setIsAblationOpen(true)}
      />

      {/* Main Pit-Wall Cockpit Content Area */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-4 lg:p-6 space-y-4">
        
        {/* 2. KPI Metrics Ribbon Strip */}
        <MetricRibbon currentLapData={currentLap} />

        {/* 3. Core 2x2 Telemetry Grid Panels */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          
          {/* PANEL 1: 4-Wheel Asymmetric Workload Matrix */}
          <div className="h-[430px]">
            <ChassisLoadMatrix corners={currentLap.corners} />
          </div>

          {/* PANEL 2: Observational Confounder Decoupling Chart */}
          <div className="h-[430px]">
            <ConfounderDecoupleChart telemetryData={telemetryData} />
          </div>

          {/* PANEL 3: Tri-Mechanism Wear Engine */}
          <div className="h-[370px]">
            <TriMechanismWearChart telemetryData={telemetryData} />
          </div>

          {/* PANEL 4: Sunday Race Benchmark Validation */}
          <div className="h-[370px]">
            <ValidationBenchmarkTable />
          </div>

        </div>

        {/* 4. Live Pit-Wall Stint Scrubber & Playback Controller */}
        <div className="pitwall-panel p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-full bg-haas-red hover:bg-red-700 text-white flex items-center justify-center shadow-sm shadow-haas-red/50 transition-all flex-shrink-0"
              title={isPlaying ? 'Pause Stint Playback' : 'Simulate Live Lap Playback'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <button
              onClick={() => setSelectedLapIndex(Math.max(0, selectedLapIndex - 1))}
              disabled={selectedLapIndex === 0}
              className="p-1.5 rounded hover:bg-[#181824] text-haas-gray hover:text-white disabled:opacity-30"
              title="Previous Lap"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <div className="flex items-baseline gap-1.5">
              <span className="text-haas-gray">ACTIVE LAP:</span>
              <span className="font-bold text-haas-white text-sm">{currentLap.lap_number}</span>
              <span className="text-haas-gray">/ {telemetryData.length}</span>
            </div>

            <button
              onClick={() => setSelectedLapIndex(Math.min(telemetryData.length - 1, selectedLapIndex + 1))}
              disabled={selectedLapIndex === telemetryData.length - 1}
              className="p-1.5 rounded hover:bg-[#181824] text-haas-gray hover:text-white disabled:opacity-30"
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
              value={selectedLapIndex}
              onChange={(e) => setSelectedLapIndex(parseInt(e.target.value))}
              className="w-full accent-haas-red cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3 text-[11px] text-haas-gray">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-haas-cyan" />
              <span>Clean Pace: <strong className="text-haas-white font-mono">{currentLap.pace_corrected_s}s</strong></span>
            </span>
            <span className="hidden md:inline text-haas-border">•</span>
            <span className="hidden md:flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-haas-red" />
              <span>Limiting Tyre: <strong className="text-haas-red font-bold">FL (36.2%)</strong></span>
            </span>
          </div>
        </div>

      </main>

      {/* 5. Engineering Ablation Control Drawer */}
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
