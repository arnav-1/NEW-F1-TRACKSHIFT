import React from 'react';
import type { AblationConfig } from '../types/telemetry';
import { X, SlidersHorizontal, RotateCcw, Wind, Weight, Gauge, Info } from 'lucide-react';

interface AblationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: AblationConfig;
  onChange: (newConfig: AblationConfig) => void;
}

export const AblationDrawer: React.FC<AblationDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onChange({
      aeroDeficit: 0.88,
      massSquaredScaling: true,
      paceManagementPush: 0.94,
    });
  };

  const extraHeat = ((1.0 - config.aeroDeficit) * 40.0).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex justify-end transition-opacity font-sans">
      <div className="w-full max-w-md bg-[#0D0E12] border-l border-white/[0.1] h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-5 h-5 text-[#E10600]" />
              <div>
                <h3 className="f1-display text-base tracking-wider text-white font-bold">
                  PHYSICS SPECIFICATIONS & ABLATION
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Calibrate vehicle assumptions and mechanical scaling factors
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls List */}
          <div className="space-y-4">

            {/* Control 1: Haas Aero Deficit Factor */}
            <div className="f1-card p-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5 font-sans">
                  <Wind className="w-4 h-4 text-[#FF3B30]" />
                  <span>Haas Aero Deficit Factor</span>
                </label>
                <span className="f1-pill text-xs font-mono font-bold text-red-300 bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-800/60">
                  {config.aeroDeficit.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed font-sans">
                Models aerodynamic downforce deficit relative to frontrunners. Induces higher contact patch micro-sliding and elevates thermodynamic heating.
              </p>
              <input
                type="range"
                min="0.80"
                max="1.00"
                step="0.01"
                value={config.aeroDeficit}
                onChange={(e) => onChange({ ...config, aeroDeficit: parseFloat(e.target.value) })}
                className="w-full accent-[#E10600] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 mt-1.5 font-mono">
                <span>0.80 (Heavy Slide)</span>
                <span className="font-semibold text-zinc-300 font-sans">Default: 0.88</span>
                <span>1.00 (Zero Deficit)</span>
              </div>
              <div className="mt-2.5 p-2 rounded-md bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-1.5 font-sans">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Induces <strong className="font-mono font-bold">+{extraHeat}°C</strong> contact patch heating via elevated slip angle.</span>
              </div>
            </div>

            {/* Control 2: Mass-Squared Energy Scaling */}
            <div className="f1-card p-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5 font-sans">
                  <Weight className="w-4 h-4 text-sky-400" />
                  <span>Mass-Squared Fuel Work Scaling</span>
                </label>
                <button
                  onClick={() => onChange({ ...config, massSquaredScaling: !config.massSquaredScaling })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    config.massSquaredScaling ? 'bg-[#E10600]' : 'bg-white/[0.1]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      config.massSquaredScaling ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-zinc-400 mb-2 leading-relaxed font-sans">
                Scales frictional power by <code className="text-zinc-200 bg-black/40 px-1 py-0.5 rounded font-mono border border-white/[0.08]">(M_race / M_FP)²</code> to model inertial momentum during high-fuel race starts.
              </p>
              <div className="text-xs text-zinc-400 bg-[#0A0A0C] p-2 rounded-md border border-white/[0.06] font-sans">
                Scaling Status: <span className="font-semibold text-sky-400">{config.massSquaredScaling ? 'Enabled (Quadratic Inertia)' : 'Disabled (Linear 1.0x)'}</span>
              </div>
            </div>

            {/* Control 3: Pace Management Factor */}
            <div className="f1-card p-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5 font-sans">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  <span>Pace Management (Lift-and-Coast)</span>
                </label>
                <span className="f1-pill text-xs font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                  {config.paceManagementPush.toFixed(2)} ({(config.paceManagementPush * 100).toFixed(0)}%)
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed font-sans">
                Calibrates driver lift-and-coast and tyre conservation management during mid-stint race pacing.
              </p>
              <input
                type="range"
                min="0.90"
                max="1.00"
                step="0.01"
                value={config.paceManagementPush}
                onChange={(e) => onChange({ ...config, paceManagementPush: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 mt-1.5 font-mono">
                <span>0.90 (Conservation)</span>
                <span className="font-semibold text-zinc-300 font-sans">Default: 0.94</span>
                <span>1.00 (Flat-Out Push)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="f1-pill flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-4 py-2.5 rounded-full border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] transition-all font-bold tracking-wider"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET DEFAULTS</span>
          </button>

          <button
            onClick={onClose}
            className="f1-pill flex-1 bg-[#E10600] hover:bg-[#B30500] text-white text-xs font-bold py-2.5 rounded-full transition-all shadow-md shadow-red-950/50 tracking-wider text-center uppercase"
          >
            APPLY TO PHYSICS PIPELINE
          </button>
        </div>

      </div>
    </div>
  );
};
