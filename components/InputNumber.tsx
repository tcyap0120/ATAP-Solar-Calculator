
import React from 'react';

interface InputNumberProps {
  label: string;
  value: number | '';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (val: number | '') => void;
  icon?: React.ReactNode;
  helperText?: string;
  placeholder?: string;
}

export const InputNumber: React.FC<InputNumberProps> = ({
  label,
  value,
  min = 0,
  max,
  step = 1,
  unit = '',
  onChange,
  icon,
  helperText,
  placeholder
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange('');
    } else {
      onChange(Number(val));
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          {icon}
          <span>{label}</span>
        </div>
      </div>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-lg rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-mono"
        />
        {unit && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-slate-500 sm:text-sm">{unit}</span>
          </div>
        )}
      </div>
      {helperText && (
        <div className="mt-2 text-xs text-slate-400">
          {helperText}
        </div>
      )}
    </div>
  );
};
