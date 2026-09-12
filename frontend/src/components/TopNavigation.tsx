import React from 'react';
import type { SessionId, TyreCompound } from '../types/telemetry';
import { Map, Activity, Disc, Award, SlidersHorizontal } from 'lucide-react';

export type WorkspaceTab = 'circuit' | 'decoupling' | 'chassis' | 'validation';

interface TopNavigationProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  currentSession: SessionId;
  onSessionChange: (s: SessionId) => void;
  currentCompound: TyreCompound;
  onCompoundChange: (c: TyreCompound) => void;
  tyreLifeLaps: number;
  onOpenPhysicsInspector: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  onTabChange,
  currentSession,
  onSessionChange,
  currentCompound,
  onCompoundChange,
  tyreLifeLaps,
  onOpenPhysicsInspector,
}) => {
  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'circuit', label: 'Circuit & Live Telemetry', icon: Map },
    { id: 'decoupling', label: 'Signal Decoupling', icon: Activity },
    { id: 'chassis', label: '4-Wheel Tyre State', icon: Disc },
    { id: 'validation', label: 'Post-Race Validation', icon: Award },
  ];

  const getCompoundStyle = (comp: TyreCompound) => {
    switch (comp) {
      case 'SOFT':
        return 'bg-[#E10600] text-white border-[#E10600] shadow-sm shadow-red-500/40';
      case 'MEDIUM':
        return 'bg-[#E5A823] text-black border-[#E5A823] font-bold shadow-sm shadow-yellow-500/30';
      case 'HARD':
        return 'bg-white text-black border-slate-300 font-bold';
    }
  };

  return (
    <header className="bg-[#101018]/95 backdrop-blur-md border-b border-[#242432] sticky top-0 z-40 px-4 lg:px-8 py-3 shadow-2xl">
      <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
        
        {/* Left: TGR Haas F1 Brand & Driver Identity */}
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
          
          {/* Haas F1 Title Lockup */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#181824] border border-[#2B2B3D] text-white font-black text-xl italic tracking-tighter overflow-hidden group shadow-inner">
              <span>H</span>
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#E10600] group-hover:w-2 transition-all"></div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#8C8C9A]">
                <span className="text-[#E10600]">TOYOTA GAZOO RACING</span>
                <span className="text-[#333345]">|</span>
                <span>PARTNERSHIP</span>
              </div>
              <div className="text-lg font-black tracking-tight text-[#F5F5F7] flex items-center gap-2">
                <span>TGR | HAAS F1 TEAM</span>
                <span className="text-[10px] bg-[#E10600]/20 text-[#E10600] px-2 py-0.5 rounded font-mono font-bold border border-[#E10600]/30">
                  TRACKSHIFT PIT-WALL
                </span>
              </div>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-[#242432] hidden sm:block"></div>

          {/* Driver Pill: Nico Hülkenberg #27 | VF-26 */}
          <div className="flex items-center gap-3 bg-[#151520] border border-[#242432] px-3.5 py-1.5 rounded-lg shadow-sm">
            <div className="w-6 h-6 rounded-md bg-[#E10600]/20 border border-[#E10600] text-[#E10600] flex items-center justify-center font-mono font-black text-xs">
              27
            </div>
            <div>
              <div className="text-xs font-black text-[#F5F5F7] flex items-center gap-1.5">
                <span>Nico Hülkenberg</span>
                <span className="text-[10px] text-[#8C8C9A] font-mono bg-[#1E1E2C] px-1.5 py-0.2 rounded border border-[#242432]">
                  VF-26
                </span>
              </div>
              <div className="text-[10px] text-[#8C8C9A] font-mono">
                Car #27 • MoneyGram TGR Haas
              </div>
            </div>

            {/* Current Tyre Badge & Quick Compound Switcher */}
            <div className="flex items-center gap-1 pl-2.5 border-l border-[#242432]">
              {(['SOFT', 'MEDIUM', 'HARD'] as TyreCompound[]).map((comp) => {
                const isCurrent = currentCompound === comp;
                const code = comp === 'SOFT' ? 'C3' : comp === 'MEDIUM' ? 'C2' : 'C1';
                return (
                  <button
                    key={comp}
                    onClick={() => onCompoundChange(comp)}
                    title={`Select ${comp} (${code})`}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                      isCurrent
                        ? `${getCompoundStyle(comp)} scale-105 font-bold`
                        : 'bg-[#101018] text-[#8C8C9A] border-[#242432] hover:text-white hover:bg-[#181824]'
                    }`}
                  >
                    <span>{comp[0]}</span>
                    <span className="text-[9px] opacity-80 ml-0.5">{code}</span>
                  </button>
                );
              })}
              <span className="text-[10px] text-[#8C8C9A] font-mono ml-1 font-semibold">
                (Life: {tyreLifeLaps} L)
              </span>
            </div>
          </div>

          {/* Track & Session Selector */}
          <div className="hidden lg:flex items-center gap-2 bg-[#151520] border border-[#242432] rounded-lg px-3 py-1.5 text-xs font-mono">
            <span className="font-bold text-[#F5F5F7]">Circuit de Barcelona-Catalunya</span>
            <span className="text-[#333345]">•</span>
            <span className="text-[#8C8C9A]">4.657 km (14 Turns)</span>
            <span className="text-[#333345]">•</span>
            <select
              value={currentSession}
              onChange={(e) => onSessionChange(e.target.value as SessionId)}
              className="bg-[#101018] border border-[#242432] text-white rounded px-2 py-0.5 text-[11px] font-bold cursor-pointer focus:outline-none"
            >
              <option value="Race">Sunday Race (Held-Out)</option>
              <option value="FP1">FP1 Free Practice</option>
              <option value="FP2">FP2 Free Practice</option>
              <option value="FP3">FP3 Free Practice</option>
            </select>
          </div>
        </div>

        {/* Right: 4 Dedicated Workspace Tabs */}
        <div className="flex items-center gap-2 w-full xl:w-auto justify-center xl:justify-end">
          <div className="flex items-center bg-[#0B0B0E] p-1 rounded-xl border border-[#242432] shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#E10600] text-white font-bold shadow-sm shadow-red-500/40'
                      : 'text-[#8C8C9A] hover:text-[#F5F5F7] hover:bg-[#181824]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#8C8C9A]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Physics Inspector Button */}
          <button
            onClick={onOpenPhysicsInspector}
            className="flex items-center gap-1.5 bg-[#151520] hover:bg-[#1C1C2B] text-[#F5F5F7] border border-[#242432] hover:border-[#E10600]/50 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold shadow-sm transition-all"
            title="Inspect Physics Parameters & Vehicle Assumptions"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#E10600]" />
            <span className="hidden sm:inline">Physics Specs</span>
          </button>
        </div>

      </div>
    </header>
  );
};
