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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity font-sans">
      <div className="w-full max-w-md bg-[#101319] border-l border-white/[0.08] h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Physics Specifications & Ablation
                </h3>
                <p className="text-xs text-zinc-400">
                  Calibrate vehicle assumptions and mechanical scaling factors
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls List */}
          <div className="space-y-4">

            {/* Control 1: Haas Aero Deficit Factor */}
            <div className="bg-[#14171F] p-4 rounded-lg border border-white/[0.07]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-red-400" />
                  Haas Aero Deficit Factor
                </label>
                <span className="text-xs font-mono font-semibold text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full border border-red-800/50">
                  {config.aeroDeficit.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
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
                <span className="font-semibold text-zinc-300">Default: 0.88</span>
                <span>1.00 (Zero Deficit)</span>
              </div>
              <div className="mt-2.5 p-2 rounded-md bg-amber-950/30 border border-amber-800/30 text-xs text-amber-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Induces <strong className="font-mono">+{extraHeat}°C</strong> contact patch heating via elevated slip angle.</span>
              </div>
            </div>

            {/* Control 2: Mass-Squared Energy Scaling */}
            <div className="bg-[#14171F] p-4 rounded-lg border border-white/[0.07]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                  <Weight className="w-4 h-4 text-sky-400" />
                  Mass-Squared Fuel Work Scaling
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
              <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
                Scales frictional power by <code className="text-zinc-300 bg-white/[0.05] px-1 py-0.2 rounded font-mono">(M_race / M_FP)²</code> to model inertial momentum during high-fuel race starts.
              </p>
              <div className="text-xs text-zinc-400 bg-[#0A0C0F] p-2 rounded-md border border-white/[0.06]">
                Scaling Status: <span className="font-semibold text-sky-400">{config.massSquaredScaling ? 'Enabled (Quadratic Inertia)' : 'Disabled (Linear 1.0x)'}</span>
              </div>
            </div>

            {/* Control 3: Pace Management Factor */}
            <div className="bg-[#14171F] p-4 rounded-lg border border-white/[0.07]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  Pace Management (Lift-and-Coast)
                </label>
                <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/50">
                  {config.paceManagementPush.toFixed(2)} ({(config.paceManagementPush * 100).toFixed(0)}%)
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
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
                <span className="font-semibold text-zinc-300">Default: 0.94</span>
                <span>1.00 (Flat-Out Push)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/[0.07] flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-md border border-white/[0.08] hover:bg-white/[0.04] transition-all font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-[#E10600] hover:bg-[#C00500] text-white text-xs font-semibold py-2 rounded-md transition-all shadow-sm"
          >
            Apply to Physics Pipeline
          </button>
        </div>

      </div>
    </div>
  );
};
