import { useState } from 'react';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import { TopNavigation, type WorkspaceTab } from './components/TopNavigation';
import { CircuitMap } from './components/CircuitMap';
import { SignalDecouplingView } from './components/SignalDecouplingView';
import { FourWheelDynamicsView } from './components/FourWheelDynamicsView';
import { PostRaceValidationView } from './components/PostRaceValidationView';
import { AblationDrawer } from './components/AblationDrawer';

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('circuit');
  const [isPhysicsOpen, setIsPhysicsOpen] = useState<boolean>(false);

  const {
    currentLapData,
    stintDataset,
    ablationConfig,
    setAblationConfig,
  } = useTelemetry();

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-[#F5F5F7] flex flex-col font-sans tgr-grid-bg">
      
      {/* 1. 2026 TGR Haas Top Navigation Bar */}
      <TopNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenPhysicsInspector={() => setIsPhysicsOpen(true)}
      />

      {/* 2. Main Content Viewport: Renders the Active Workspace */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'circuit' && <CircuitMap />}

        {activeTab === 'decoupling' && (
          <SignalDecouplingView telemetryData={stintDataset} />
        )}

        {activeTab === 'chassis' && (
          <FourWheelDynamicsView
            corners={currentLapData.corners}
            telemetryData={stintDataset}
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

export function App() {
  return (
    <TelemetryProvider>
      <DashboardContent />
    </TelemetryProvider>
  );
}

export default App;
