import React, { useState } from 'react';
import { useTelemetry, type SessionType } from '../context/TelemetryContext';
import {
  Brain,
  Sliders,
  CheckCircle2,
  Flame,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Target,
  Layers,
  ArrowRight,
  RotateCcw,
  Award,
  Lock,
} from 'lucide-react';

export const StrategyRecommendationBox: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const {
    selectedSession,
    setSession,
    selectedCompound,
    activeCircuitInfo,
    activeSessionRecommendation,
    advanceToNextSession,
    resetWeekendToFP1,
    isSessionUnlocked,
    setActiveTab,
  } = useTelemetry();

  if (!activeSessionRecommendation) {
    return null;
  }

  const rec = activeSessionRecommendation;
  const weights = rec.model_weights;
  const totalWeight = weights.FP1 + weights.FP2 + weights.FP3;
  const fp1Pct = totalWeight > 0 ? (weights.FP1 / totalWeight) * 100 : 0;
  const fp2Pct = totalWeight > 0 ? (weights.FP2 / totalWeight) * 100 : 0;
  const fp3Pct = totalWeight > 0 ? (weights.FP3 / totalWeight) * 100 : 0;

  const getCompoundBadgeStyle = (comp: string) => {
    switch (comp) {
      case 'SOFT':
        return 'bg-[#E10600] text-white border-[#E10600] shadow-[0_0_12px_rgba(225,6,0,0.6)]';
      case 'MEDIUM':
        return 'bg-[#E5A823] text-black border-[#E5A823] shadow-[0_0_12px_rgba(229,168,35,0.6)]';
      case 'HARD':
        return 'bg-[#FFFFFF] text-black border-[#FFFFFF] shadow-[0_0_12px_rgba(255,255,255,0.5)]';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'FP1_BASELINE':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-600/60';
      case 'FP2_UPDATE':
        return 'bg-sky-950/60 text-sky-400 border-sky-600/60';
      case 'FP3_FREEZE':
        return 'bg-purple-950/60 text-purple-400 border-purple-600/60';
      case 'POST_RACE_AUDIT':
        return 'bg-amber-950/60 text-amber-400 border-amber-600/60';
      default:
        return 'bg-zinc-900 text-zinc-300 border-zinc-700';
    }
  };

  const sessions: Array<{ id: SessionType; label: string; stageName: string; color: string }> = [
    { id: 'FP1', label: '1. FP1 Practice', stageName: 'Green Track Baseline', color: 'emerald' },
    { id: 'FP2', label: '2. FP2 Long-Run', stageName: 'Dominant 82% Update', color: 'sky' },
    { id: 'FP3', label: '3. FP3 Pre-Race', stageName: 'Pre-Race Freeze', color: 'purple' },
    { id: 'Race', label: '4. Sunday GP', stageName: 'Pre-Race Strategy & Audit', color: 'red' },
  ];

  return (
    <div className="tgr-card border border-white/[0.14] bg-[#0E1015]/95 shadow-2xl relative overflow-hidden transition-all duration-300 space-y-0">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-red-600/10 via-transparent to-transparent pointer-events-none rounded-bl-full" />

      {/* 1. Grand Prix Weekend Sequential Stepper & Advancement Action Bar */}
      <div className="bg-black/90 px-4 lg:px-6 py-2.5 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        
        {/* Step Breadcrumbs: FP1 -> FP2 -> FP3 -> Race */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
          <span className="text-[10px] font-display uppercase tracking-widest text-zinc-400 font-bold mr-1 hidden sm:inline">
            WEEKEND STEPPER:
          </span>

          {sessions.map((sess, idx) => {
            const isCurrent = selectedSession === sess.id;
            const isUnlocked = isSessionUnlocked(sess.id);

            return (
              <React.Fragment key={sess.id}>
                {idx > 0 && <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />}

                <button
                  onClick={() => {
                    if (isUnlocked) {
                      setSession(sess.id);
                    }
                  }}
                  disabled={!isUnlocked}
                  title={isUnlocked ? `Switch to ${sess.label}` : `${sess.label} is locked until previous session finishes`}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all font-display uppercase tracking-wider font-bold text-xs ${
                    isCurrent
                      ? sess.color === 'emerald'
                        ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                        : sess.color === 'sky'
                        ? 'bg-sky-600 text-white shadow-[0_0_10px_rgba(2,132,199,0.5)]'
                        : sess.color === 'purple'
                        ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]'
                        : 'bg-[#E10600] text-white shadow-[0_0_12px_rgba(225,6,0,0.6)]'
                      : isUnlocked
                      ? 'bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08]'
                      : 'bg-white/[0.02] text-zinc-600 cursor-not-allowed border border-white/[0.04]'
                  }`}
                >
                  <span>{sess.label}</span>
                  {!isUnlocked ? (
                    <Lock className="w-3 h-3 text-zinc-600" />
                  ) : !isCurrent ? (
                    <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                  ) : null}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Action Advancement Buttons */}
        <div className="flex items-center gap-2.5 ml-auto">
          {selectedSession === 'FP1' && (
            <button
              onClick={advanceToNextSession}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-display font-black tracking-wider uppercase rounded-md shadow-md flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>MOVE ONTO FP2 (LONG-RUN UPDATE)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {selectedSession === 'FP2' && (
            <button
              onClick={advanceToNextSession}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-display font-black tracking-wider uppercase rounded-md shadow-md flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>MOVE ONTO FP3 (PRE-RACE FREEZE)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {selectedSession === 'FP3' && (
            <button
              onClick={advanceToNextSession}
              className="px-4 py-1.5 bg-[#E10600] hover:bg-[#B30500] text-white text-xs font-display font-black tracking-wider uppercase rounded-md shadow-md flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse"
            >
              <span>LAUNCH SUNDAY RACE 🚦</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {selectedSession === 'Race' && (
            <button
              onClick={() => setActiveTab('validation')}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-display font-black tracking-wider uppercase rounded-md shadow-md flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Award className="w-4 h-4 text-emerald-300" />
              <span>DESIGNATED POST-RACE VALIDATION 🏆</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reset Weekend Button */}
          <button
            onClick={resetWeekendToFP1}
            title="Reset simulation to FP1 Practice"
            className="p-1.5 bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white rounded-md border border-white/[0.08] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 2. Sleek Executive Summary Ribbon (Clickable to Expand / Collapse) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
      >
        {/* Left: Brand + Stage Tag + Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-2 rounded-lg bg-red-600/15 border border-red-500/30 text-red-500 shrink-0">
            <Brain className="w-5 h-5" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-display font-black tracking-wider text-red-500 uppercase text-xs">
                HAAS F1 STRATEGY DIRECTIVE
              </span>
              <span className="text-zinc-600">|</span>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase border ${getStageColor(rec.stage)}`}>
                {rec.stage.replace('_', ' ')}
              </span>
              <span className="text-zinc-400 text-xs font-mono hidden sm:inline">
                {activeCircuitInfo.flag} {activeCircuitInfo.name.toUpperCase()} // {selectedSession}
              </span>
            </div>

            {/* Big Headline */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm md:text-base font-bold text-white font-display tracking-wide truncate">
                {rec.title}
              </span>
            </div>
          </div>
        </div>

        {/* Center: High-Impact Recommendation Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Primary Recommended Tyre Badge */}
          <div className="flex items-center gap-2 bg-black/60 border border-white/[0.08] px-3 py-1.5 rounded-lg">
            <span className="text-[11px] text-zinc-400 font-sans uppercase font-semibold">TYRE:</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-display font-black tracking-wider border ${getCompoundBadgeStyle(rec.recommended_primary_compound)}`}>
              {rec.recommended_primary_compound}
            </span>
          </div>

          {/* Pit Target (Only when available in FP3/Race) */}
          {rec.pit_windows[0] && ['FP3', 'Race'].includes(selectedSession) && (
            <div className="hidden lg:flex items-center gap-2 bg-black/60 border border-white/[0.08] px-3 py-1.5 rounded-lg">
              <Target className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[11px] text-zinc-400 font-sans uppercase font-semibold">PIT TARGET:</span>
              <span className="text-xs font-bold text-white font-mono">
                LAP {rec.pit_windows[0].pit_lap_target}{' '}
                <span className="text-zinc-500 font-normal">
                  (L{rec.pit_windows[0].window_open}–{rec.pit_windows[0].window_close})
                </span>
              </span>
            </div>
          )}

          {/* Model Weights Badge */}
          <div className="hidden md:flex items-center gap-2 bg-black/60 border border-white/[0.08] px-3 py-1.5 rounded-lg font-mono text-xs">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-zinc-400 font-sans text-[11px]">WEIGHTS:</span>
            <span className="text-white font-bold">
              {fp1Pct.toFixed(0)}% / {fp2Pct.toFixed(0)}% / {fp3Pct.toFixed(0)}%
            </span>
          </div>

          {/* Model Fidelity Badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-black/60 border border-white/[0.08] px-2.5 py-1.5 rounded-lg text-xs font-mono text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold">{rec.confidence_score.toFixed(0)}%</span>
          </div>

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="f1-pill flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-white border border-red-500/40 rounded-lg text-xs font-display font-bold tracking-wider transition-all shadow-sm"
          >
            <span>{isExpanded ? 'COLLAPSE' : 'EXPAND NUMBERS'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. Expanded Technical Numbers & Session-Specific Pane (Boxes appear/disappear sequentially) */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-white/[0.08] space-y-4 animate-in fade-in-50 duration-200">
          
          {/* Model Weight Evolution Visual Progress Bar */}
          <div className="bg-black/50 p-3.5 rounded-lg border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-sans font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-red-500" />
                <span>Continual Learning Fusion Weights (Physical Evolution):</span>
              </span>
              <div className="flex items-center gap-4 text-xs tabular-nums">
                <span className={fp1Pct > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                  FP1 Practice: {fp1Pct.toFixed(0)}%
                </span>
                <span className={fp2Pct > 0 ? 'text-sky-400 font-bold' : 'text-zinc-600'}>
                  FP2 Long Run: {fp2Pct.toFixed(0)}% {fp2Pct >= 70 ? '(Dominant)' : ''}
                </span>
                <span className={fp3Pct > 0 ? 'text-purple-400 font-bold' : 'text-zinc-600'}>
                  FP3 Refinement: {fp3Pct.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-zinc-800/90 overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${fp1Pct}%` }}
                className="h-full bg-emerald-500 transition-all duration-500"
                title={`FP1: ${fp1Pct.toFixed(1)}%`}
              />
              <div
                style={{ width: `${fp2Pct}%` }}
                className="h-full bg-sky-500 transition-all duration-500"
                title={`FP2: ${fp2Pct.toFixed(1)}%`}
              />
              <div
                style={{ width: `${fp3Pct}%` }}
                className="h-full bg-purple-500 transition-all duration-500"
                title={`FP3: ${fp3Pct.toFixed(1)}%`}
              />
            </div>
          </div>

          {/* High-Legibility Big Numerical Output Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Card 1: Primary Compound & Session Baseline */}
            <div className="p-4 rounded-lg bg-black/50 border border-white/[0.08] space-y-2.5">
              <div className="text-xs text-zinc-400 font-sans uppercase font-bold tracking-wider">
                PRIMARY TYRE RECOMMENDATION
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-lg text-sm font-display font-black tracking-wider border ${getCompoundBadgeStyle(rec.recommended_primary_compound)}`}>
                  {rec.recommended_primary_compound}
                </span>
                <span className="text-sm font-bold text-white font-sans">
                  {selectedSession === 'FP1' ? 'Initial Baseline' : selectedSession === 'FP2' ? 'Long-Run Choice' : 'Race Mandate'}
                </span>
              </div>
              <div className="pt-2 border-t border-white/[0.06] text-xs font-mono text-zinc-300">
                <div className="text-[11px] text-zinc-500 uppercase font-sans mb-0.5">Session Directive:</div>
                <div className="font-semibold text-zinc-100">{rec.optimal_strategy}</div>
              </div>
            </div>

            {/* Card 2: Inferred Degradation Rates with BIG FONTS */}
            <div className="p-4 rounded-lg bg-black/50 border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-sans uppercase font-bold tracking-wider">
                <span>INFERRED WEAR RATES</span>
                <span className="text-[11px] text-zinc-500 font-mono">d(&Delta;t)/dlap</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className={`p-2 rounded-lg ${selectedCompound === 'SOFT' ? 'bg-red-950/70 border border-red-500' : 'bg-white/[0.03]'}`}>
                  <div className="text-xs text-red-400 font-bold mb-0.5">SOFT</div>
                  <div className="text-base md:text-lg font-black text-white tabular-nums">
                    +{rec.compound_degradation_slopes_s_lap['SOFT']?.toFixed(3)}s
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${selectedCompound === 'MEDIUM' ? 'bg-amber-950/70 border border-amber-500' : 'bg-white/[0.03]'}`}>
                  <div className="text-xs text-amber-400 font-bold mb-0.5">MED</div>
                  <div className="text-base md:text-lg font-black text-white tabular-nums">
                    +{rec.compound_degradation_slopes_s_lap['MEDIUM']?.toFixed(3)}s
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${selectedCompound === 'HARD' ? 'bg-zinc-800 border border-zinc-400' : 'bg-white/[0.03]'}`}>
                  <div className="text-xs text-zinc-300 font-bold mb-0.5">HARD</div>
                  <div className="text-base md:text-lg font-black text-white tabular-nums">
                    +{rec.compound_degradation_slopes_s_lap['HARD']?.toFixed(3)}s
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-400 font-mono flex items-center justify-between pt-1 border-t border-white/[0.06]">
                <span>Physical Wear (w_p1):</span>
                <span className="text-white font-bold text-xs">
                  {rec.calibrated_wear_wp1[selectedCompound]?.toFixed(5) ?? '0.11266'}
                </span>
              </div>
            </div>

            {/* Card 3: Predicted Cliff & Crossover */}
            <div className="p-4 rounded-lg bg-black/50 border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-sans uppercase font-bold tracking-wider">
                <span>PREDICTED CLIFF LAPS</span>
                <span className="text-[11px] text-red-400 font-mono">&gt;0.25s/lap</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <div className="text-xs text-zinc-500 mb-0.5">SOFT</div>
                  <div className="text-base md:text-lg font-black text-red-400 tabular-nums">
                    L{rec.predicted_cliff_laps['SOFT']?.toFixed(0)}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <div className="text-xs text-zinc-500 mb-0.5">MED</div>
                  <div className="text-base md:text-lg font-black text-amber-400 tabular-nums">
                    L{rec.predicted_cliff_laps['MEDIUM']?.toFixed(0)}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <div className="text-xs text-zinc-500 mb-0.5">HARD</div>
                  <div className="text-base md:text-lg font-black text-zinc-200 tabular-nums">
                    L{rec.predicted_cliff_laps['HARD']?.toFixed(0)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-300 font-mono flex items-center justify-between pt-1 border-t border-white/[0.06]">
                <span className="text-zinc-400">S &rarr; M Crossover:</span>
                <span className="text-sky-400 font-bold text-xs">Lap {rec.crossover_laps.soft_to_medium}</span>
              </div>
            </div>

            {/* Card 4: Stint Target Windows (Conditional on session progression) */}
            <div className="p-4 rounded-lg bg-black/50 border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-sans uppercase font-bold tracking-wider">
                <span>{selectedSession === 'FP1' ? 'ESTIMATED STINTS' : 'OPTIMAL PIT WINDOWS'}</span>
                <span className="text-[11px] text-emerald-400 font-bold font-mono">
                  {selectedSession === 'FP1' ? 'ESTIMATE' : selectedSession === 'FP2' ? 'REFINED' : 'MANDATED'}
                </span>
              </div>
              <div className="space-y-1.5">
                {rec.pit_windows.map((pw) => (
                  <div key={pw.stint_number} className="flex items-center justify-between text-xs font-mono bg-white/[0.03] px-2.5 py-1.5 rounded-md">
                    <span className="text-zinc-300 font-semibold">
                      Stint {pw.stint_number} ({pw.compound}):
                    </span>
                    <span className="text-white font-bold">
                      Lap {pw.pit_lap_target}{' '}
                      <span className="text-[11px] text-zinc-400 font-normal">
                        (L{pw.window_open}–{pw.window_close})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Operational Directives with Clear, Large Text */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="text-xs font-display uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>PIT-WALL TELEMETRY OBSERVATION</span>
              </div>
              <p className="text-sm text-zinc-200 font-sans leading-relaxed">
                {rec.key_observation}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-red-950/25 border border-red-600/30 space-y-1.5">
              <div className="text-xs font-display uppercase tracking-wider text-red-400 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-500" />
                <span>TACTICAL ACTION DIRECTIVE</span>
              </div>
              <p className="text-sm text-zinc-100 font-sans leading-relaxed font-medium">
                {rec.actionable_decision}
              </p>
            </div>
          </div>

          {/* Post-Race Validation Card (ONLY REVEALED during Sunday Race session) */}
          {rec.post_race_metrics && selectedSession === 'Race' && (
            <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-display font-black uppercase tracking-wider text-emerald-400">
                    POST-RACE VALIDATION AUDIT (HELD-OUT SUNDAY TELEMETRY)
                  </div>
                  <p className="text-xs text-zinc-300 font-sans mt-0.5">
                    Non-circular physical model verified against actual race stints. Parameters updated forward in time.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs font-mono">
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 uppercase font-sans block">CENTERED SHAPE MAE</span>
                  <span className="text-emerald-400 font-black text-base md:text-lg">
                    {rec.post_race_metrics.centered_shape_mae_s.toFixed(4)}s
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 uppercase font-sans block">PHYSICAL MAE</span>
                  <span className="text-white font-black text-base md:text-lg">
                    {rec.post_race_metrics.physical_mae_s.toFixed(4)}s
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 uppercase font-sans block">PIT ACCURACY (&plusmn;2L)</span>
                  <span className="text-sky-400 font-black text-base md:text-lg">
                    {rec.post_race_metrics.pit_accuracy_pct.toFixed(1)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 uppercase font-sans block">NEXT RACE STEP</span>
                  <span className="text-amber-400 font-black text-base md:text-lg">
                    {rec.post_race_metrics.continual_learning_delta_pct > 0 ? '+' : ''}
                    {rec.post_race_metrics.continual_learning_delta_pct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Direct Link to Designated Post Race Validation Tab */}
              <button
                onClick={() => setActiveTab('validation')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-display uppercase tracking-wider font-bold text-xs rounded-md shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Award className="w-4 h-4 text-white" />
                <span>OPEN FULL VALIDATION WORKSPACE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Session Advancement Footer Card */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] text-xs">
            <div className="text-zinc-400 font-sans">
              Grand Prix Weekend Status:{' '}
              <strong className="text-white font-mono uppercase">
                {selectedSession === 'FP1'
                  ? 'FP1 Green Track Ingestion'
                  : selectedSession === 'FP2'
                  ? 'FP2 Long-Run Calibration (82% Weight)'
                  : selectedSession === 'FP3'
                  ? 'FP3 Pre-Race Parameter Freeze Locked'
                  : 'Sunday Grand Prix Strategy Execution'}
              </strong>
            </div>

            {selectedSession === 'FP1' && (
              <button
                onClick={advanceToNextSession}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-display uppercase tracking-wider font-bold text-xs rounded-md shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>MOVE ONTO FP2 (LONG-RUN UPDATE)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {selectedSession === 'FP2' && (
              <button
                onClick={advanceToNextSession}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-display uppercase tracking-wider font-bold text-xs rounded-md shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>MOVE ONTO FP3 (PRE-RACE FREEZE)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {selectedSession === 'FP3' && (
              <button
                onClick={advanceToNextSession}
                className="px-5 py-2 bg-[#E10600] hover:bg-[#B30500] text-white font-display uppercase tracking-wider font-bold text-xs rounded-md shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse"
              >
                <span>LAUNCH SUNDAY RACE 🚦</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {selectedSession === 'Race' && (
              <button
                onClick={() => setActiveTab('validation')}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-display uppercase tracking-wider font-bold text-xs rounded-md shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Award className="w-4 h-4 text-emerald-300" />
                <span>GO TO DESIGNATED POST-RACE VALIDATION 🏆</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
