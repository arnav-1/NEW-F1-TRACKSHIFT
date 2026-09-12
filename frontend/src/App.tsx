import React, { useState, useMemo } from 'react';
import { TopNavigation, type WorkspaceTab } from './components/TopNavigation';
import { CircuitTelemetryView } from './components/CircuitTelemetryView';
import { SignalDecouplingView } from './components/SignalDecouplingView';
import { FourWheelDynamicsView } from './components/FourWheelDynamicsView';
import { PostRaceValidationView } from './components/PostRaceValidationView';
import { AblationDrawer } from './components/AblationDrawer';
import { generateLapTelemetry } from './data/mockTelemetry';
import type { SessionId, TyreCompound, AblationConfig } from './types/telemetry';

export function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('circuit');
  const [currentSession, setCurrentSession] = useState<SessionId>('Race');
  const [currentCompound, setCurrentCompound] = useState<TyreCompound>('SOFT');
  const [isPhysicsOpen, setIsPhysicsOpen] = useState<boolean>(false);
  const [selectedLapIndex, setSelectedLapIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [ablationConfig, setAblationConfig] = useState<AblationConfig>({
    aeroDeficit: 0.88,
    massSquaredScaling: true,
    paceManagementPush: 0.94,
  });

  // Dynamic telemetry stream based on circuit, session, compound, and ablation assumptions
  const telemetryData = useMemo(() => {
    return generateLapTelemetry(
      'barcelona',
      currentSession,
      currentCompound,
      ablationConfig.aeroDeficit,
      ablationConfig.massSquaredScaling,
      ablationConfig.paceManagementPush
    );
  }, [currentSession, currentCompound, ablationConfig]);

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
    <div className="min-h-screen bg-[#0B0B0E] text-[#F5F5F7] flex flex-col font-sans tgr-grid-bg">
      
      {/* 1. 2026 TGR Haas Top Navigation Bar */}
      <TopNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentSession={currentSession}
        onSessionChange={(s) => {
          setCurrentSession(s);
          setSelectedLapIndex(0);
        }}
        currentCompound={currentCompound}
        onCompoundChange={(c) => {
          setCurrentCompound(c);
          setSelectedLapIndex(0);
        }}
        tyreLifeLaps={currentLap.tyre_life}
        onOpenPhysicsInspector={() => setIsPhysicsOpen(true)}
      />

      {/* 2. Main Content Viewport: Renders the Active Workspace */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'circuit' && (
          <CircuitTelemetryView
            currentLap={currentLap}
            totalLaps={telemetryData.length}
            currentLapIndex={safeLapIndex}
            onLapChange={setSelectedLapIndex}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
          />
        )}

        {activeTab === 'decoupling' && (
          <SignalDecouplingView telemetryData={telemetryData} />
        )}

        {activeTab === 'chassis' && (
          <FourWheelDynamicsView
            corners={currentLap.corners}
            telemetryData={telemetryData}
          />
        )}

        {activeTab === 'validation' && (
          <PostRaceValidationView />
        )}
      </main>

      {/* 3. Slide-Out Physics & Vehicle Ablation Specs Sheet */}
      <AblationDrawer
        isOpen={isPhysicsOpen}
        onClose={() => setIsPhysicsOpen(false)}
        config={ablationConfig}
        onChange={setAblationConfig}
      />

    </div>
  );
}

export default App;
