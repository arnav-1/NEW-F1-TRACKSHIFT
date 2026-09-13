import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
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
} from 'lucide-react';

export const StrategyRecommendationBox: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const {
    selectedSession,
    selectedCompound,
    activeCircuitInfo,
    activeSessionRecommendation,
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

  return (
    <div className="tgr-card border border-white/[0.14] bg-[#0E1015]/95 shadow-2xl relative overflow-hidden transition-all duration-300">
      
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-red-600/10 via-transparent to-transparent pointer-events-none rounded-bl-full" />

      {/* 1. Sleek, Ultra-Glanceable Executive Summary Bar (Always Visible & Clickable) */}
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
                HAAS F1 PIT-WALL STRATEGY
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
          {/* Recommended Tyre Badge */}
          <div className="flex items-center gap-2 bg-black/60 border border-white/[0.08] px-3 py-1.5 rounded-lg">
            <span className="text-[11px] text-zinc-400 font-sans uppercase font-semibold">TYRE:</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-display font-black tracking-wider border ${getCompoundBadgeStyle(rec.recommended_primary_compound)}`}>
              {rec.recommended_primary_compound}
            </span>
          </div>

          {/* Primary Pit Window */}
          {rec.pit_windows[0] && (
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

      {/* 2. Expanded Detail Pane (Opens smoothly on click) */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-white/[0.08] space-y-4 animate-in fade-in-50 duration-200">
          
          {/* Model Weight Evolution Visual Progress Bar */}
          <div className="bg-black/50 p-3.5 rounded-lg border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-300 font-sans font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-red-500" />
                <span>Continual Learning Fusion Weights:</span>
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
            
            {/* Card 1: Primary Recommended Strategy */}
            <div className="p-4 rounded-lg bg-black/50 border border-white/[0.08] space-y-2.5">
              <div className="text-xs text-zinc-400 font-sans uppercase font-bold tracking-wider">
                PRIMARY TYRE RECOMMENDATION
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-lg text-sm font-display font-black tracking-wider border ${getCompoundBadgeStyle(rec.recommended_primary_compound)}`}>
                  {rec.recommended_primary_compound}
                </span>
                <span className="text-sm font-bold text-white font-sans">
                  Race Baseline
                </span>
              </div>
              <div className="pt-2 border-t border-white/[0.06] text-xs font-mono text-zinc-300">
                <div className="text-[11px] text-zinc-500 uppercase font-sans mb-0.5">Mandated Strategy:</div>
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

            {/* Card 4: Stint Target Windows */}
            <div className="p-4 rounded-lg bg-black/50 border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-sans uppercase font-bold tracking-wider">
                <span>OPTIMAL PIT WINDOWS</span>
                <span className="text-[11px] text-emerald-400 font-bold font-mono">ACTIVE</span>
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

          {/* Post-Race Validation Card (Visible during Sunday Race) */}
          {rec.post_race_metrics && (
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
            </div>
          )}

        </div>
      )}

    </div>
  );
};
