import React from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import {
  Brain,
  Sliders,
  CheckCircle2,
  Flame,
  ShieldCheck,
} from 'lucide-react';

export const StrategyRecommendationBox: React.FC = () => {
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
        return 'bg-[#E10600] text-white border-[#E10600] shadow-[0_0_8px_rgba(225,6,0,0.5)]';
      case 'MEDIUM':
        return 'bg-[#E5A823] text-black border-[#E5A823] shadow-[0_0_8px_rgba(229,168,35,0.5)]';
      case 'HARD':
        return 'bg-[#FFFFFF] text-black border-[#FFFFFF] shadow-[0_0_8px_rgba(255,255,255,0.4)]';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'FP1_BASELINE':
        return 'bg-emerald-950/50 text-emerald-400 border-emerald-700/50';
      case 'FP2_UPDATE':
        return 'bg-sky-950/50 text-sky-400 border-sky-700/50';
      case 'FP3_FREEZE':
        return 'bg-purple-950/50 text-purple-400 border-purple-700/50';
      case 'POST_RACE_AUDIT':
        return 'bg-amber-950/50 text-amber-400 border-amber-700/50';
      default:
        return 'bg-zinc-900 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="tgr-card p-5 border border-white/[0.12] bg-[#0E1015]/95 relative overflow-hidden shadow-2xl space-y-4">
      
      {/* Background Accent Watermark */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-red-600/10 via-transparent to-transparent pointer-events-none rounded-bl-full" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-600/15 border border-red-500/30 text-red-500">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-display font-bold uppercase tracking-wider text-red-500">
                HAAS F1 CONTINUAL MODEL EVOLUTION & STRATEGY DIRECTIVE
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getStageColor(rec.stage)}`}>
                {rec.stage.replace('_', ' ')}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.08]">
                {activeCircuitInfo.flag} {activeCircuitInfo.name.toUpperCase()} // {selectedSession}
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-wide mt-0.5 font-display">
              {rec.title}
            </h3>
          </div>
        </div>

        {/* Confidence Pill */}
        <div className="flex items-center gap-2 bg-black/40 border border-white/[0.08] px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div className="flex flex-col text-right leading-none">
            <span className="text-[10px] text-zinc-500 font-sans uppercase">MODEL FIDELITY</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {rec.confidence_score.toFixed(1)}% ({rec.confidence_tier})
            </span>
          </div>
        </div>
      </div>

      {/* Model Evolution Weights Progress Bar */}
      <div className="space-y-1.5 bg-black/40 p-3 rounded-lg border border-white/[0.06]">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-sans font-medium text-[11px] uppercase tracking-wider">Multi-Session Fusion Weights:</span>
          </span>
          <div className="flex items-center gap-4 text-[11px] tabular-nums">
            <span className={fp1Pct > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
              FP1: {fp1Pct.toFixed(0)}%
            </span>
            <span className={fp2Pct > 0 ? 'text-sky-400 font-bold' : 'text-zinc-600'}>
              FP2: {fp2Pct.toFixed(0)}% {fp2Pct >= 70 ? '(Dominant Long Run)' : ''}
            </span>
            <span className={fp3Pct > 0 ? 'text-purple-400 font-bold' : 'text-zinc-600'}>
              FP3: {fp3Pct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-2 rounded-full bg-zinc-800/80 overflow-hidden flex">
          <div
            style={{ width: `${fp1Pct}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
            title={`FP1 Nominal Weight: ${fp1Pct.toFixed(1)}%`}
          />
          <div
            style={{ width: `${fp2Pct}%` }}
            className="h-full bg-sky-500 transition-all duration-500"
            title={`FP2 Nominal Weight: ${fp2Pct.toFixed(1)}%`}
          />
          <div
            style={{ width: `${fp3Pct}%` }}
            className="h-full bg-purple-500 transition-all duration-500"
            title={`FP3 Nominal Weight: ${fp3Pct.toFixed(1)}%`}
          />
        </div>
      </div>

      {/* Grid of Key Numerical Outputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Card 1: Recommended Compound & Strategy */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-sans uppercase">
            <span>RECOMMENDED TYRE</span>
            <span className="text-[10px] text-zinc-500">FIA MANDATE 2-COMP</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`px-3 py-1 rounded-md text-xs font-display font-black tracking-wider border ${getCompoundBadgeStyle(rec.recommended_primary_compound)}`}>
              {rec.recommended_primary_compound}
            </span>
            <span className="text-xs font-semibold text-zinc-200 font-sans">
              Primary Race Compound
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono leading-tight pt-1 border-t border-white/[0.04]">
            {rec.optimal_strategy}
          </p>
        </div>

        {/* Card 2: Inferred Degradation Slopes */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-sans uppercase">
            <span>INFERRED WEAR RATES</span>
            <span className="text-[10px] text-zinc-500">d(&Delta;t)/dlap</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
            <div className={`p-1.5 rounded ${selectedCompound === 'SOFT' ? 'bg-red-950/60 border border-red-600/40' : 'bg-white/[0.02]'}`}>
              <div className="text-[10px] text-red-400 font-bold">SOFT</div>
              <div className="text-xs font-bold text-white tabular-nums">
                +{rec.compound_degradation_slopes_s_lap['SOFT']?.toFixed(3)}s
              </div>
            </div>
            <div className={`p-1.5 rounded ${selectedCompound === 'MEDIUM' ? 'bg-amber-950/60 border border-amber-600/40' : 'bg-white/[0.02]'}`}>
              <div className="text-[10px] text-amber-400 font-bold">MED</div>
              <div className="text-xs font-bold text-white tabular-nums">
                +{rec.compound_degradation_slopes_s_lap['MEDIUM']?.toFixed(3)}s
              </div>
            </div>
            <div className={`p-1.5 rounded ${selectedCompound === 'HARD' ? 'bg-zinc-800 border border-zinc-500' : 'bg-white/[0.02]'}`}>
              <div className="text-[10px] text-zinc-300 font-bold">HARD</div>
              <div className="text-xs font-bold text-white tabular-nums">
                +{rec.compound_degradation_slopes_s_lap['HARD']?.toFixed(3)}s
              </div>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
            <span>Calibrated w_p1:</span>
            <span className="text-zinc-300 font-bold">
              {rec.calibrated_wear_wp1[selectedCompound]?.toFixed(5) ?? '0.11266'}
            </span>
          </div>
        </div>

        {/* Card 3: Cliff & Crossover Prediction */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-sans uppercase">
            <span>PREDICTED CLIFF LAPS</span>
            <span className="text-[10px] text-red-400">&kappa; &gt; 0.25s/lap</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
            <div className="p-1 rounded bg-white/[0.02]">
              <div className="text-[10px] text-zinc-500">SOFT</div>
              <div className="text-xs font-bold text-red-400 tabular-nums">
                L{rec.predicted_cliff_laps['SOFT']?.toFixed(0)}
              </div>
            </div>
            <div className="p-1 rounded bg-white/[0.02]">
              <div className="text-[10px] text-zinc-500">MED</div>
              <div className="text-xs font-bold text-amber-400 tabular-nums">
                L{rec.predicted_cliff_laps['MEDIUM']?.toFixed(0)}
              </div>
            </div>
            <div className="p-1 rounded bg-white/[0.02]">
              <div className="text-[10px] text-zinc-500">HARD</div>
              <div className="text-xs font-bold text-zinc-200 tabular-nums">
                L{rec.predicted_cliff_laps['HARD']?.toFixed(0)}
              </div>
            </div>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono flex items-center justify-between pt-0.5">
            <span>S &rarr; M Crossover:</span>
            <span className="text-sky-300 font-bold">Lap {rec.crossover_laps.soft_to_medium}</span>
          </div>
        </div>

        {/* Card 4: Stint Target Windows */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-sans uppercase">
            <span>OPTIMAL PIT WINDOWS</span>
            <span className="text-[10px] text-emerald-400 font-bold">ACTIVE</span>
          </div>
          <div className="space-y-1">
            {rec.pit_windows.map((pw) => (
              <div key={pw.stint_number} className="flex items-center justify-between text-xs font-mono bg-white/[0.02] px-2 py-1 rounded">
                <span className="text-zinc-400">
                  Stint {pw.stint_number} ({pw.compound}):
                </span>
                <span className="text-white font-bold">
                  Lap {pw.pit_lap_target}{' '}
                  <span className="text-[10px] text-zinc-500 font-normal">
                    (L{pw.window_open}–{pw.window_close})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Operational Observation & Action Directives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1">
          <div className="text-[10px] font-display uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Flame className="w-3 h-3 text-amber-500" />
            <span>PIT-WALL TELEMETRY OBSERVATION</span>
          </div>
          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
            {rec.key_observation}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-red-950/20 border border-red-600/20 space-y-1">
          <div className="text-[10px] font-display uppercase tracking-wider text-red-400 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-red-500" />
            <span>TACTICAL ACTION DIRECTIVE</span>
          </div>
          <p className="text-xs text-zinc-200 font-sans leading-relaxed">
            {rec.actionable_decision}
          </p>
        </div>
      </div>

      {/* Post-Race Validation Card (Only shown when Sunday Race is selected) */}
      {rec.post_race_metrics && (
        <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-display font-bold uppercase tracking-wider text-emerald-400">
                POST-RACE VALIDATION AUDIT (HELD-OUT SUNDAY TELEMETRY)
              </div>
              <p className="text-[11px] text-zinc-400 font-sans">
                Non-circular physical model verified against actual race stints. Parameters updated forward in time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-xs font-mono">
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase block">CENTERED SHAPE MAE</span>
              <span className="text-emerald-400 font-bold text-sm">
                {rec.post_race_metrics.centered_shape_mae_s.toFixed(4)}s
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase block">PHYSICAL MAE</span>
              <span className="text-white font-bold text-sm">
                {rec.post_race_metrics.physical_mae_s.toFixed(4)}s
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase block">PIT ACCURACY (&plusmn;2L)</span>
              <span className="text-sky-400 font-bold text-sm">
                {rec.post_race_metrics.pit_accuracy_pct.toFixed(1)}%
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase block">NEXT RACE STEP</span>
              <span className="text-amber-400 font-bold text-sm">
                {rec.post_race_metrics.continual_learning_delta_pct > 0 ? '+' : ''}
                {rec.post_race_metrics.continual_learning_delta_pct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
