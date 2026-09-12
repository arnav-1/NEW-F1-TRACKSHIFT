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
        return 'bg-[#E10600] text-white border-[#E10600]';
      case 'MEDIUM':
        return 'bg-[#E5A823] text-black border-[#E5A823] font-semibold';
      case 'HARD':
        return 'bg-white text-[#111116] border-slate-300 font-semibold';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 lg:px-8 py-3 shadow-sm">
      <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
        
        {/* Left: TGR Haas F1 Livery Wordmark & Driver Identity */}
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
          
          {/* TGR Haas F1 Logo */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#111116] text-white font-black text-xl italic tracking-tighter overflow-hidden group shadow-sm">
              <span>H</span>
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#E10600] group-hover:w-2 transition-all"></div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span className="text-[#E10600]">TOYOTA GAZOO RACING</span>
                <span className="text-slate-300">|</span>
                <span>PARTNERSHIP</span>
              </div>
              <div className="text-lg font-black tracking-tight text-[#111116] flex items-center gap-2">
                <span>TGR | HAAS F1 TEAM</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                  TRACKSHIFT 2026
                </span>
              </div>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

          {/* Driver Pill: Nico Hülkenberg #27 | VF-26 */}
          <div className="flex items-center gap-3 bg-[#F4F5F8] border border-slate-200 px-3.5 py-1.5 rounded-lg shadow-sm">
            <div className="w-6 h-6 rounded-md bg-[#111116] text-white flex items-center justify-center font-mono font-black text-xs">
              27
            </div>
            <div>
              <div className="text-xs font-black text-[#111116] flex items-center gap-1.5">
                <span>Nico Hülkenberg</span>
                <span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200">
                  VF-26
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Car #27 • MoneyGram TGR Haas
              </div>
            </div>

            {/* Current Tyre Badge & Quick Switcher */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-300">
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
                        ? `${getCompoundStyle(comp)} shadow-sm scale-105 font-bold`
                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700'
                    }`}
                  >
                    <span>{comp[0]}</span>
                    <span className="text-[9px] opacity-80 ml-0.5">{code}</span>
                  </button>
                );
              })}
              <span className="text-[10px] text-slate-600 font-mono ml-1 font-semibold">
                (Life: {tyreLifeLaps} L)
              </span>
            </div>
          </div>

          {/* Track & Session Selector */}
          <div className="hidden lg:flex items-center gap-2 bg-[#F4F5F8] border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono">
            <span className="font-bold text-[#111116]">Circuit de Barcelona-Catalunya</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">4.657 km (14 Turns)</span>
            <span className="text-slate-400">•</span>
            <select
              value={currentSession}
              onChange={(e) => onSessionChange(e.target.value as SessionId)}
              className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-bold text-[#111116] cursor-pointer focus:outline-none"
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
          <div className="flex items-center bg-[#F4F5F8] p-1 rounded-xl border border-slate-200 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white text-[#111116] font-bold shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-[#111116] hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#E10600]' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Physics Inspector Button */}
          <button
            onClick={onOpenPhysicsInspector}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#111116] border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold shadow-sm transition-all"
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
