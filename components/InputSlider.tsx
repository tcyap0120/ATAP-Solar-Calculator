import React from 'react';

interface InputSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  icon?: React.ReactNode;
}

export const InputSlider: React.FC<InputSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  icon
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-blue-600 font-bold font-mono">
          {value.toLocaleString()} <span className="text-xs text-slate-400 font-sans font-normal">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
      <div className="flex justify-between mt-1 text-xs text-slate-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};