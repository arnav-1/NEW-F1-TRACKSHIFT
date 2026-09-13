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
    <div className="min-h-screen bg-[#0A0A0C] text-[#F5F5F7] flex flex-col font-sans tgr-grid-bg">
      
      {/* 1. Official F1 Pit-Wall Navigation Bar */}
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

      {/* 3. Official F1 Partner & Technical Integrations Grid Band */}
      <section className="border-t border-white/[0.08] bg-[#0E1015]/90 py-6 px-4 lg:px-8 mt-12">
        <div className="max-w-[1800px] mx-auto">
          <div className="text-center mb-4">
            <span className="text-[10px] font-display uppercase tracking-widest text-zinc-500 font-bold">
              OFFICIAL TECHNICAL PARTNERS & HOMOLOGATION
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
            <div className="flex items-center gap-2 text-zinc-300 font-display tracking-wider text-sm font-bold">
              <span className="text-red-500 font-black text-lg italic">F1</span>
              <span>FORMULA 1®</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300 font-display tracking-wider text-sm font-bold">
              <span className="text-zinc-100 font-black">FIA</span>
              <span className="text-[10px] text-zinc-500">HOMOLOGATED</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300 font-display tracking-wider text-sm font-bold">
              <span className="text-[#FFF500] font-black italic">PIRELLI</span>
              <span className="text-[10px] text-zinc-500">TYRE SUPPLIER</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300 font-display tracking-wider text-sm font-bold">
              <span className="text-red-600 font-black">TOYOTA GAZOO RACING</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300 font-display tracking-wider text-sm font-bold">
              <span className="text-zinc-100 font-bold">HAAS AUTOMATION</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Multi-Column Official F1 Dark Footer */}
      <footer className="border-t border-white/[0.08] bg-[#070709] text-zinc-400 text-xs px-4 lg:px-8 pt-12 pb-8">
        <div className="max-w-[1800px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          
          {/* Promo / App Block on Left */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/haas-logo.png"
                alt="Haas F1 Team Logo"
                className="h-8 w-auto object-contain brightness-105"
              />
              <span className="f1-display text-base tracking-wider text-white font-bold">
                TRACKSHIFT TELEMETRY
              </span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
              Official Haas F1 Team pit-wall engineering console powered by Toyota Gazoo Racing technical partnership. Real-time deterministic tyre degradation modelling and empirical telemetry isolation.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button className="f1-pill px-4 py-2 bg-[#E10600] hover:bg-[#B30500] text-white text-xs font-bold tracking-wider transition-colors">
                DOWNLOAD TELEMETRY CSV
              </button>
              <button className="f1-pill px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.1] text-xs font-bold tracking-wider transition-colors">
                FIA REGULATIONS
              </button>
            </div>
          </div>

          {/* Column 1: Quick Links */}
          <div className="space-y-3">
            <h4 className="font-display uppercase tracking-widest text-zinc-200 font-bold text-xs">
              QUICK LINKS
            </h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#circuit" onClick={(e) => { e.preventDefault(); setActiveTab('circuit'); }} className="hover:text-white transition-colors">Circuit Telemetry</a></li>
              <li><a href="#decoupling" onClick={(e) => { e.preventDefault(); setActiveTab('decoupling'); }} className="hover:text-white transition-colors">Signal Decoupling</a></li>
              <li><a href="#chassis" onClick={(e) => { e.preventDefault(); setActiveTab('chassis'); }} className="hover:text-white transition-colors">4-Wheel Tyre State</a></li>
              <li><a href="#validation" onClick={(e) => { e.preventDefault(); setActiveTab('validation'); }} className="hover:text-white transition-colors">Post-Race Validation</a></li>
              <li><a href="#physics" onClick={(e) => { e.preventDefault(); setIsPhysicsOpen(true); }} className="hover:text-white transition-colors">Physics Ablation Specs</a></li>
            </ul>
          </div>

          {/* Column 2: Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="font-display uppercase tracking-widest text-zinc-200 font-bold text-xs">
              LEGAL & COMPLIANCE
            </h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookies Preferences</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Telemetry Licensing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FIA Timing Notice</a></li>
            </ul>
          </div>

          {/* Column 3: Support & Technical */}
          <div className="space-y-3">
            <h4 className="font-display uppercase tracking-widest text-zinc-200 font-bold text-xs">
              SUPPORT & PARTNERS
            </h4>
            <ul className="space-y-2 text-zinc-400">
              <li><a href="#" className="hover:text-white transition-colors">Haas F1 Technical Ops</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Toyota Gazoo Racing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pirelli Motorsport Hub</a></li>
              <li><a href="#" className="hover:text-white transition-colors">F1 TV Pit-Wall Audio</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Car #27 Nico Hülkenberg</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="max-w-[1800px] mx-auto pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <div>
            © 2026 TrackShift Engineering. Official technical simulation for TGR | Haas F1 Team.
          </div>
          <div className="flex items-center gap-4">
            <span>Formula 1® & FIA are registered trademarks.</span>
          </div>
        </div>
      </footer>

      {/* 5. Slide-Out Physics & Vehicle Ablation Specs Sheet */}
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
