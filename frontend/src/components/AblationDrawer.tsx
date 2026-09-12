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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-[#101018] border-l border-[#242432] h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div>
          <div className="flex items-center justify-between border-b border-[#242432] pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-5 h-5 text-[#E10600]" />
              <div>
                <h3 className="text-base font-black text-[#F5F5F7] font-mono">
                  Physics Specifications & Ablation
                </h3>
                <p className="text-xs text-[#8C8C9A] font-mono">
                  Calibrate vehicle assumptions and mechanical scaling factors
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8C8C9A] hover:text-white rounded-lg hover:bg-[#1E1E2C] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls List */}
          <div className="space-y-5">

            {/* Control 1: Haas Aero Deficit Factor */}
            <div className="bg-[#15151E] p-4 rounded-xl border border-[#242432]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-[#F5F5F7] font-mono flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-[#E10600]" />
                  Haas Aero Deficit Factor
                </label>
                <span className="text-xs font-mono font-black text-[#E10600] bg-red-950/50 px-2 py-0.5 rounded border border-red-800/60">
                  {config.aeroDeficit.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-[#8C8C9A] mb-3 leading-relaxed">
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
              <div className="flex justify-between text-[10px] font-mono text-[#8C8C9A] mt-1">
                <span>0.80 (Heavy Slide)</span>
                <span className="font-bold text-[#F5F5F7]">Default: 0.88</span>
                <span>1.00 (Zero Deficit)</span>
              </div>
              <div className="mt-2.5 p-2 rounded-lg bg-amber-950/40 border border-amber-800/40 text-[11px] font-mono text-[#FF9100] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Induces <strong>+{extraHeat}°C</strong> contact patch heating via elevated slip angle.</span>
              </div>
            </div>

            {/* Control 2: Mass-Squared Energy Scaling */}
            <div className="bg-[#15151E] p-4 rounded-xl border border-[#242432]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-[#F5F5F7] font-mono flex items-center gap-1.5">
                  <Weight className="w-4 h-4 text-[#00E5FF]" />
                  Mass-Squared Fuel Work Scaling
                </label>
                <button
                  onClick={() => onChange({ ...config, massSquaredScaling: !config.massSquaredScaling })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    config.massSquaredScaling ? 'bg-[#E10600] shadow-haas-red' : 'bg-[#242432]'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      config.massSquaredScaling ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-[#8C8C9A] mb-2 leading-relaxed">
                Scales frictional power by <code>(M_race / M_FP)²</code> to model inertial momentum during high-fuel race starts.
              </p>
              <div className="text-[10px] font-mono text-[#8C8C9A] bg-[#0B0B0E] p-2 rounded-lg border border-[#242432]">
                Scaling Status: <span className="font-bold text-[#00E5FF]">{config.massSquaredScaling ? 'Enabled (Quadratic Inertia)' : 'Disabled (Linear 1.0x)'}</span>
              </div>
            </div>

            {/* Control 3: Pace Management Factor */}
            <div className="bg-[#15151E] p-4 rounded-xl border border-[#242432]">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-[#F5F5F7] font-mono flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  Pace Management (Lift-and-Coast)
                </label>
                <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
                  {config.paceManagementPush.toFixed(2)} ({(config.paceManagementPush * 100).toFixed(0)}%)
                </span>
              </div>
              <p className="text-[11px] text-[#8C8C9A] mb-3 leading-relaxed">
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
              <div className="flex justify-between text-[10px] font-mono text-[#8C8C9A] mt-1">
                <span>0.90 (Conservation)</span>
                <span className="font-bold text-[#F5F5F7]">Default: 0.94</span>
                <span>1.00 (Flat-Out Push)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-[#242432] flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-mono text-[#8C8C9A] hover:text-white px-3.5 py-2 rounded-lg border border-[#242432] hover:bg-[#181824] transition-all font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 bg-[#E10600] hover:bg-[#B30500] text-white font-mono text-xs font-bold py-2.5 rounded-lg shadow-haas-red transition-all"
          >
            Apply to Physics Pipeline
          </button>
        </div>

      </div>
    </div>
  );
};
