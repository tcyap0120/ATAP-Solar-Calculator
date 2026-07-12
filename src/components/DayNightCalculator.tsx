
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Sun, Moon, Plus, Trash2, Zap, Clock, RefreshCw, Info, Calendar,
  AirVent, Car, Flame, Wind, Snowflake, Refrigerator, Droplets, Waves, CookingPot, Microwave, Cog,
  type LucideIcon
} from 'lucide-react';

/**
 * DayNight Usage Calculator
 * Daytime  = 10:00 → 17:00 (7 hrs)
 * Nighttime= 17:00 → 10:00 next day (17 hrs)
 *
 * Energy model: each appliance row contributes
 *   kWh = (power × wattsPerUnit / 1000) × hours × units
 * where `power` is the editable value shown in the appliance's natural unit
 * (W, kW, or HP) and `wattsPerUnit` converts it to watts.
 */

const DAY_START = 10; // 10:00
const DAY_END = 17;   // 17:00

interface AppliancePreset {
  id: string;
  name: string;
  icon: LucideIcon;
  /** Label shown on the editable power field. */
  powerLabel: string;
  /** Unit suffix shown next to the power input. */
  powerUnit: string;
  /** Default value of the power field (in `powerUnit`). */
  defaultPower: number;
  /** Multiplier converting the displayed power value into Watts. */
  wattsPerUnit: number;
  /** Default usage window (24h decimal). start === end means "runs 24 hours". */
  defaultStart: string; // "HH:MM"
  defaultEnd: string;   // "HH:MM"
  /** Optional note explaining the average assumption. */
  note?: string;
}

// Average / typical Malaysian-household figures. All editable by the user.
const PRESETS: AppliancePreset[] = [
  {
    id: 'aircond', name: 'Air Conditioner', icon: AirVent,
    powerLabel: 'Horsepower', powerUnit: 'HP', defaultPower: 1.5, wattsPerUnit: 746,
    defaultStart: '22:00', defaultEnd: '06:00',
    note: '≈746 W per HP (avg compressor draw).',
  },
  {
    id: 'ev', name: 'EV Charger', icon: Car,
    powerLabel: 'Charging Power', powerUnit: 'kW', defaultPower: 7, wattsPerUnit: 1000,
    defaultStart: '23:00', defaultEnd: '06:00',
    note: 'Typical home AC charger 7 kW.',
  },
  {
    id: 'waterheater', name: 'Water Heater', icon: Flame,
    powerLabel: 'Power', powerUnit: 'W', defaultPower: 3000, wattsPerUnit: 1,
    defaultStart: '07:00', defaultEnd: '07:30',
  },
  {
    id: 'dryer', name: 'Clothes Dryer', icon: Wind,
    powerLabel: 'Power', powerUnit: 'W', defaultPower: 2500, wattsPerUnit: 1,
    defaultStart: '20:00', defaultEnd: '21:00',
  },
  {
    id: 'freezer', name: 'Freezer', icon: Snowflake,
    powerLabel: 'Avg Power', powerUnit: 'W', defaultPower: 80, wattsPerUnit: 1,
    defaultStart: '00:00', defaultEnd: '00:00',
    note: 'Duty-cycle averaged. Runs 24 h.',
  },
  {
    id: 'fridge', name: 'Refrigerator', icon: Refrigerator,
    powerLabel: 'Avg Power', powerUnit: 'W', defaultPower: 60, wattsPerUnit: 1,
    defaultStart: '00:00', defaultEnd: '00:00',
    note: 'Duty-cycle averaged. Runs 24 h.',
  },
  {
    id: 'waterpump', name: 'Water Pump', icon: Droplets,
    powerLabel: 'Power', powerUnit: 'W', defaultPower: 750, wattsPerUnit: 1,
    defaultStart: '07:00', defaultEnd: '07:30',
  },
  {
    id: 'poolmotor', name: 'Pool Cleaning Motor', icon: Waves,
    powerLabel: 'Power', powerUnit: 'W', defaultPower: 1100, wattsPerUnit: 1,
    defaultStart: '10:00', defaultEnd: '14:00',
  },
  {
    id: 'cooker', name: 'Electric Cooker', icon: CookingPot,
    powerLabel: 'Power', powerUnit: 'W', defaultPower: 1800, wattsPerUnit: 1,
    defaultStart: '18:00', defaultEnd: '19:00',
  },
  {
    id: 'oven', name: 'Oven', icon: Flame,
    powerLabel: 'Power', powerUnit: 'W', defaultPower: 2000, wattsPerUnit: 1,
    defaultStart: '18:00', defaultEnd: '19:00',
  },
  {
    id: 'microwave', name: 'Microwave', icon: Microwave,
    powerLabel: 'Power', powerUnit: 'W', defaultPower: 1000, wattsPerUnit: 1,
    defaultStart: '12:00', defaultEnd: '12:15',
  },
  {
    id: 'custom', name: 'Other / Custom', icon: Cog,
    powerLabel: 'Power', powerUnit: 'W', defaultPower: 500, wattsPerUnit: 1,
    defaultStart: '18:00', defaultEnd: '22:00',
  },
];

interface ApplianceRow {
  rowId: string;
  presetId: string;
  units: number | '';
  power: number | '';
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

const getPreset = (id: string) => PRESETS.find(p => p.id === id) ?? PRESETS[0];

/** "HH:MM" → decimal hours (0–24). */
const parseTime = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h + m / 60;
};

/**
 * Split a usage window into daytime / nighttime hours.
 * start === end is treated as a full 24-hour run.
 */
const splitHours = (start: number, end: number): { day: number; night: number; total: number } => {
  const intervals: Array<[number, number]> = [];
  if (start === end) {
    intervals.push([0, 24]);
  } else if (start < end) {
    intervals.push([start, end]);
  } else {
    // wraps past midnight
    intervals.push([start, 24]);
    intervals.push([0, end]);
  }

  let day = 0;
  let total = 0;
  for (const [s, e] of intervals) {
    total += e - s;
    day += Math.max(0, Math.min(e, DAY_END) - Math.max(s, DAY_START));
  }
  return { day, night: total - day, total };
};

const num = (v: number | '') => (typeof v === 'number' ? v : 0);

const makeRow = (presetId: string, rowId: string): ApplianceRow => {
  const p = getPreset(presetId);
  return {
    rowId,
    presetId,
    units: 1,
    power: p.defaultPower,
    start: p.defaultStart,
    end: p.defaultEnd,
  };
};

let rowSeq = 0;
const nextRowId = () => `row-${rowSeq++}`;

export const DayNightCalculator: React.FC = () => {
  const [rows, setRows] = useState<ApplianceRow[]>(() => [
    makeRow('aircond', nextRowId()),
    makeRow('fridge', nextRowId()),
  ]);

  const updateRow = (rowId: string, patch: Partial<ApplianceRow>) => {
    setRows(prev => prev.map(r => (r.rowId === rowId ? { ...r, ...patch } : r)));
  };

  const changePreset = (rowId: string, presetId: string) => {
    const p = getPreset(presetId);
    updateRow(rowId, {
      presetId,
      power: p.defaultPower,
      start: p.defaultStart,
      end: p.defaultEnd,
    });
  };

  const addRow = () => setRows(prev => [...prev, makeRow('custom', nextRowId())]);
  const removeRow = (rowId: string) => setRows(prev => prev.filter(r => r.rowId !== rowId));
  const resetAll = () => setRows([makeRow('aircond', nextRowId()), makeRow('fridge', nextRowId())]);

  const computed = useMemo(() => {
    const perRow = rows.map(r => {
      const p = getPreset(r.presetId);
      const watts = num(r.power) * p.wattsPerUnit;
      const kw = watts / 1000;
      const { day, night, total } = splitHours(parseTime(r.start), parseTime(r.end));
      const units = num(r.units);
      const dayKwh = kw * day * units;
      const nightKwh = kw * night * units;
      return {
        ...r,
        preset: p,
        watts,
        dayHours: day,
        nightHours: night,
        totalHours: total,
        dayKwh,
        nightKwh,
        totalKwh: dayKwh + nightKwh,
      };
    });

    const dayKwh = perRow.reduce((s, r) => s + r.dayKwh, 0);
    const nightKwh = perRow.reduce((s, r) => s + r.nightKwh, 0);
    const totalKwh = dayKwh + nightKwh;
    const dayPct = totalKwh > 0 ? (dayKwh / totalKwh) * 100 : 0;
    const nightPct = totalKwh > 0 ? (nightKwh / totalKwh) * 100 : 0;
    return { perRow, dayKwh, nightKwh, totalKwh, dayPct, nightPct };
  }, [rows]);

  const pieData = [
    { name: 'Daytime', value: computed.dayKwh, color: '#f59e0b' },
    { name: 'Nighttime', value: computed.nightKwh, color: '#6366f1' },
  ].filter(d => d.value > 0);

  const fmt = (n: number, d = 2) =>
    n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-blue-600" size={24} />
            DayNight Usage Calculator
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Estimate how your electricity use splits between
            <span className="font-semibold text-amber-600"> daytime (10am–5pm)</span> and
            <span className="font-semibold text-indigo-600"> nighttime (5pm–10am)</span>.
          </p>
        </div>
        <button
          onClick={resetAll}
          className="self-start inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
        >
          <RefreshCw size={16} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: appliance inputs */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Zap className="text-blue-600" size={18} />
                Appliances
              </h3>
              <span className="text-xs text-slate-400 font-medium">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-3">
              {computed.perRow.map((r) => {
                const Icon = r.preset.icon;
                return (
                  <div
                    key={r.rowId}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 transition hover:border-blue-200"
                  >
                    {/* Top line: appliance select + remove */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Icon size={18} />
                      </div>
                      <select
                        value={r.presetId}
                        onChange={(e) => changePreset(r.rowId, e.target.value)}
                        className="flex-1 bg-white border border-slate-300 text-slate-900 text-sm font-semibold rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                      >
                        {PRESETS.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeRow(r.rowId)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Inputs grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-500">Units</span>
                        <input
                          type="number" min={0} step={1} value={r.units}
                          onChange={(e) => updateRow(r.rowId, { units: e.target.value === '' ? '' : Number(e.target.value) })}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 font-mono"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-500">{r.preset.powerLabel} ({r.preset.powerUnit})</span>
                        <input
                          type="number" min={0} step="any" value={r.power}
                          onChange={(e) => updateRow(r.rowId, { power: e.target.value === '' ? '' : Number(e.target.value) })}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 font-mono"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-500">From</span>
                        <input
                          type="time" value={r.start}
                          onChange={(e) => updateRow(r.rowId, { start: e.target.value })}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-500">To</span>
                        <input
                          type="time" value={r.end}
                          onChange={(e) => updateRow(r.rowId, { end: e.target.value })}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                        />
                      </label>
                    </div>

                    {/* Per-row result */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="text-slate-400">
                        {r.totalHours === 24 && r.start === r.end ? '24 h/day' : `${fmt(r.totalHours, 1)} h/day`}
                        {' · '}{(r.watts / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kW
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-amber-600">
                        <Sun size={12} /> {fmt(r.dayKwh)} kWh
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-indigo-600">
                        <Moon size={12} /> {fmt(r.nightKwh)} kWh
                      </span>
                    </div>

                    {r.preset.note && (
                      <p className="mt-1 text-[11px] text-slate-400">{r.preset.note}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addRow}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:text-blue-600"
            >
              <Plus size={16} /> Add Appliance
            </button>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
            <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <p>
              Power values are editable averages — adjust them to your actual appliance ratings. For
              fridge &amp; freezer, the value is a <strong>duty-cycle average</strong> (compressor cycles on/off),
              so it already accounts for 24-hour running. Setting <strong>From</strong> = <strong>To</strong> means the
              appliance runs the full 24 hours.
            </p>
          </div>
        </div>

        {/* Right: results */}
        <div className="xl:col-span-5 space-y-4">
          {/* Ratio donut */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Usage Ratio</h3>
            <div className="relative h-56 w-full">
              {computed.totalKwh > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={62} outerRadius={88}
                      paddingAngle={2} dataKey="value"
                      startAngle={90} endAngle={-270}
                    >
                      {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${fmt(value)} kWh`, name]}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Add an appliance to see results
                </div>
              )}
              {/* Center label */}
              {computed.totalKwh > 0 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800">{fmt(computed.totalKwh, 1)}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">kWh / day</span>
                </div>
              )}
            </div>

            {/* Legend split */}
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-amber-600">
                  <Sun size={16} />
                  <span className="text-xs font-bold uppercase tracking-wide">Daytime</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-amber-700">{Math.round(computed.dayPct)}%</div>
                <div className="text-[11px] text-amber-600/80">{fmt(computed.dayKwh)} kWh</div>
              </div>
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-indigo-600">
                  <Moon size={16} />
                  <span className="text-xs font-bold uppercase tracking-wide">Nighttime</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-indigo-700">{Math.round(computed.nightPct)}%</div>
                <div className="text-[11px] text-indigo-600/80">{fmt(computed.nightKwh)} kWh</div>
              </div>
            </div>

            {/* Slim ratio bar */}
            <div className="mt-4">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${computed.dayPct}%` }} />
                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${computed.nightPct}%` }} />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-medium uppercase tracking-wide">
                <Zap size={14} /> Daily Total
              </div>
              <div className="mt-2 text-3xl font-bold">{fmt(computed.totalKwh, 1)}</div>
              <div className="text-xs text-slate-400">kWh / day</div>
            </div>
            <div className="rounded-2xl bg-blue-600 p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 text-blue-100 text-xs font-medium uppercase tracking-wide">
                <Calendar size={14} /> Monthly Est.
              </div>
              <div className="mt-2 text-3xl font-bold">{Math.round(computed.totalKwh * 30).toLocaleString()}</div>
              <div className="text-xs text-blue-200">kWh / month (×30)</div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <Info size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            <p>
              Your <strong>daytime ratio of {Math.round(computed.dayPct)}%</strong> can be used as the
              “Daytime Usage” input in the Calculator &amp; Recommender to size a solar system that
              best matches when you actually consume power.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayNightCalculator;
