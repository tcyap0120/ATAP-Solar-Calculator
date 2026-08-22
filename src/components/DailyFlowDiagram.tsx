
import React, { useState, useMemo, useEffect } from 'react';
import { calculateBill, getKwhFromBill, simulateSolar } from '../utils/billingEngine';
import { BATTERY_CAPACITY_KWH, PANEL_WATTAGE, PEAK_SUN_HOURS } from '../constants';
import { InputNumber } from './InputNumber';
import { InputSlider } from './InputSlider';
import { Zap, DollarSign, Sun, Battery, Home, Activity, AlertTriangle, RefreshCw, Moon, Calendar } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DailyFlowDiagramProps {
  initialUsage: number;
}

export const DailyFlowDiagram: React.FC<DailyFlowDiagramProps> = ({ initialUsage }) => {
  // Inputs
  const [usageKwh, setUsageKwh] = useState<number | ''>(initialUsage);
  const [billAmount, setBillAmount] = useState<number | ''>(0);
  const [daytimePercent, setDaytimePercent] = useState<number>(30);
  const [panelCount, setPanelCount] = useState<number>(12);
  const [batteryCount, setBatteryCount] = useState<number>(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [gapWarning, setGapWarning] = useState<boolean>(false);

  // Constants for Blind Spot
  const billGapLower = useMemo(() => calculateBill(1500).finalTotal, []);
  const billGapUpper = useMemo(() => calculateBill(1501).finalTotal, []);

  // Initialize bill
  useEffect(() => {
    const val = typeof usageKwh === 'number' ? usageKwh : 0;
    const bill = calculateBill(val).finalTotal;
    setBillAmount(parseFloat(bill.toFixed(2)));
  }, []);

  // Sync Logic
  const handleUsageChange = (val: number | '') => {
    setUsageKwh(val);
    setGapWarning(false);
    if (!isSyncing && typeof val === 'number') {
      setIsSyncing(true);
      const bill = calculateBill(val).finalTotal;
      setBillAmount(parseFloat(bill.toFixed(2)));
      setIsSyncing(false);
    } else if (val === '') {
      setBillAmount('');
    }
  };

  const handleBillChange = (val: number | '') => {
    setBillAmount(val);
    if (typeof val === 'number' && val > billGapLower && val < billGapUpper) {
      setGapWarning(true);
      if (!isSyncing) setUsageKwh(1501);
    } else {
      setGapWarning(false);
      if (!isSyncing && typeof val === 'number') {
        setIsSyncing(true);
        const kwh = getKwhFromBill(val);
        setUsageKwh(kwh);
        setIsSyncing(false);
      } else if (val === '') {
        setUsageKwh('');
      }
    }
  };

  const fixBillAmount = () => {
    setBillAmount(parseFloat(billGapUpper.toFixed(1)));
    setGapWarning(false);
  };

  // --- Daily Physics Calculation ---
  const dailyStats = useMemo(() => {
    const effectiveUsage = typeof usageKwh === 'number' ? usageKwh : 0;
    
    // 1. Daily Averages
    const dailyTotalUsage = effectiveUsage / 30;
    const dayDemand = dailyTotalUsage * (daytimePercent / 100);
    const nightDemand = dailyTotalUsage * (1 - daytimePercent / 100);

    // 2. Solar Generation (Daily)
    // Panels * kW * 3.5h
    const dailySolarGen = panelCount * (PANEL_WATTAGE / 1000) * PEAK_SUN_HOURS;

    // 3. Battery Capacity
    const totalBatteryCap = batteryCount * BATTERY_CAPACITY_KWH;

    // --- DAYTIME FLOW ---
    // Energy Priority: Home -> Battery -> Grid
    
    // Flow 1: Solar to Home
    // Can't use more than demand, can't use more than gen
    const solarToHome = Math.min(dailySolarGen, dayDemand);
    
    // Remaining Solar
    const solarSurplus = Math.max(0, dailySolarGen - dayDemand);
    
    // Flow 2: Grid to Home (Day)
    // If solar wasn't enough
    const gridToHomeDay = Math.max(0, dayDemand - dailySolarGen);

    // Flow 3: Solar to Battery
    const solarToBattery = Math.min(solarSurplus, totalBatteryCap);

    // Flow 4: Solar to Grid (Export)
    const solarToGrid = Math.max(0, solarSurplus - solarToBattery);


    // --- NIGHTTIME FLOW ---
    // Energy Priority: Battery -> Grid

    // Assume Battery starts "Full" relative to what was put in today
    // (In reality it carries over, but for daily illustration, Input = Available)
    const batteryStored = solarToBattery;

    // Flow 5: Battery to Home
    // Logic from billing engine: discharge efficiency 0.9
    // Max output is limited by what's stored OR what's needed
    // However, the billing engine calculates discharge = stored * 0.9.
    // So usable energy is stored * 0.9
    const batteryUsable = batteryStored * 0.9;
    const batteryToHome = Math.min(batteryUsable, nightDemand);

    // Flow 6: Grid to Home (Night)
    const gridToHomeNight = Math.max(0, nightDemand - batteryToHome);

    return {
      dayDemand,
      nightDemand,
      dailySolarGen,
      totalBatteryCap,
      solarToHome,
      gridToHomeDay,
      solarToBattery,
      solarToGrid,
      batteryToHome,
      gridToHomeNight,
      batteryStored // Amount charged today
    };

  }, [usageKwh, daytimePercent, panelCount, batteryCount]);

  // Calculate Projected Bill
  const projectedBill = useMemo(() => {
    const totalImport = (dailyStats.gridToHomeDay + dailyStats.gridToHomeNight) * 30;
    const totalExport = dailyStats.solarToGrid * 30;
    return calculateBill(totalImport, totalExport).finalTotal;
  }, [dailyStats]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-20">
      
       {/* Inputs Section */}
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
          <Activity className="text-blue-600" size={24} />
          Daily Simulation
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="flex flex-col gap-2">
            <InputNumber
              label="Avg. Monthly Bill"
              value={billAmount}
              onChange={handleBillChange}
              icon={<DollarSign size={16}/>}
              unit=" RM"
            />
            {gapWarning && (
              <div className="bg-amber-50 text-amber-800 p-3 text-xs rounded-xl border border-amber-200 flex items-start gap-2 shadow-sm">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="font-bold mb-0.5">Tariff Blind Spot</p>
                  <button onClick={fixBillAmount} className="mt-1 text-blue-600 font-bold hover:underline hover:text-blue-700 flex items-center gap-1 transition-colors">
                      Round up <RefreshCw size={10}/>
                  </button>
                </div>
              </div>
            )}
          </div>
          <InputNumber
            label="Avg. Monthly Usage"
            value={usageKwh}
            onChange={handleUsageChange}
            icon={<Zap size={16}/>}
            unit=" kWh"
          />
           <InputNumber 
              label="Solar Panels" 
              value={panelCount} 
              onChange={val => setPanelCount(Number(val))} 
              icon={<Sun size={16}/>} 
              helperText={`${(panelCount * (PANEL_WATTAGE / 1000)).toFixed(2)} kWp`} 
           />
           <InputNumber 
              label="Batteries" 
              value={batteryCount} 
              onChange={val => setBatteryCount(Number(val))} 
              icon={<Battery size={16}/>} 
              helperText={`${(batteryCount * 16).toFixed(1)} kWh nominal (usable ~${(batteryCount * BATTERY_CAPACITY_KWH).toFixed(1)} kWh/day)`} 
           />
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100">
          <InputSlider
            label="Daytime Usage %"
            value={daytimePercent}
            min={0} max={100} unit="%"
            onChange={setDaytimePercent}
            icon={<Sun size={16}/>}
          />
        </div>
      </div>

      {/* --- DAYTIME FLOW DIAGRAM --- */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
         <div className="flex items-center gap-2 mb-4 justify-center">
            <Sun className="text-amber-500 fill-amber-500" size={26} />
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800">Daytime Flow</h3>
         </div>
         <FlowStage
           width={900}
           height={404}
           nodes={[
             { id: 'solar', x: 0,   y: 141, Icon: Sun,     title: 'Solar Panels', value: dailyStats.dailySolarGen,  sub: 'Total generation', tone: 'amber' },
             { id: 'grid',  x: 600, y: 0,   Icon: Zap,     title: 'Grid Export',  value: dailyStats.solarToGrid,    sub: 'Sold back',        tone: 'blue' },
             { id: 'home',  x: 600, y: 141, Icon: Home,    title: 'Home Load',    value: dailyStats.dayDemand,      sub: 'Daytime usage',    tone: 'slate' },
             { id: 'batt',  x: 600, y: 282, Icon: Battery, title: 'Battery',      value: dailyStats.solarToBattery, sub: 'Charged',          tone: 'emerald' },
           ]}
           edges={[
             { from: 'solar', to: 'grid', value: dailyStats.solarToGrid,    label: 'Export',     tone: 'blue' },
             { from: 'solar', to: 'home', value: dailyStats.solarToHome,    label: 'Direct use', tone: 'amber' },
             { from: 'solar', to: 'batt', value: dailyStats.solarToBattery, label: 'Charge',     tone: 'emerald' },
             { from: 'grid',  to: 'home', value: dailyStats.gridToHomeDay,  label: 'Import',     tone: 'blue', detour: true },
           ]}
         />
      </div>

      {/* --- NIGHTTIME FLOW DIAGRAM --- */}
      <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-2xl text-slate-100">
         <div className="flex items-center gap-2 mb-4 justify-center">
            <Moon className="text-blue-200 fill-blue-200" size={26} />
            <h3 className="text-xl sm:text-2xl font-bold text-white">Nighttime Flow</h3>
         </div>
         <FlowStage
           dark
           width={900}
           height={300}
           nodes={[
             { id: 'batt', x: 0,   y: 0,  Icon: Battery, title: 'Battery',     value: dailyStats.batteryToHome,   sub: 'Discharge (90% eff)', tone: 'emerald' },
             { id: 'grid', x: 0,   y: 178, Icon: Zap,    title: 'Grid Import', value: dailyStats.gridToHomeNight, sub: 'Bought from grid',    tone: 'blue' },
             { id: 'home', x: 600, y: 89, Icon: Home,    title: 'Home Load',   value: dailyStats.nightDemand,     sub: 'Night usage',         tone: 'slate' },
           ]}
           edges={[
             { from: 'batt', to: 'home', value: dailyStats.batteryToHome,   label: 'Discharge', tone: 'emerald' },
             { from: 'grid', to: 'home', value: dailyStats.gridToHomeNight, label: 'Import',    tone: 'blue' },
           ]}
         />
      </div>

      {/* --- MONTHLY PROJECTION --- */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg border border-blue-500/50">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
          <Calendar className="text-blue-300" size={24} />
          Projected Monthly Totals
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* New Import */}
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
            <div className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">New Import (Grid to Home)</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{(Math.round((dailyStats.gridToHomeDay + dailyStats.gridToHomeNight) * 30)).toLocaleString()} kWh</span>
            </div>
            <div className="mt-2 text-sm text-blue-100 font-mono">
              ({(dailyStats.gridToHomeDay + dailyStats.gridToHomeNight).toFixed(2)} kWh/day × 30 days)
            </div>
          </div>

          {/* New Export */}
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
            <div className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">New Export (Solar to Grid)</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{(Math.round(dailyStats.solarToGrid * 30)).toLocaleString()} kWh</span>
            </div>
            <div className="mt-2 text-sm text-blue-100 font-mono">
              ({dailyStats.solarToGrid.toFixed(2)} kWh/day × 30 days)
            </div>
          </div>

          {/* Estimated Bill */}
          <div className="bg-emerald-500/20 rounded-xl p-4 backdrop-blur-sm border border-emerald-400/30">
            <div className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">Est. Monthly Bill</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">RM {projectedBill.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
            <div className="mt-2 text-sm text-emerald-100 font-mono">
              After solar savings
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Flow stage — one responsive SVG per diagram                         */
/* ------------------------------------------------------------------ */

/**
 * The day and night diagrams used to be a 3-column grid of HTML cards with CSS-rotated bars
 * floating in the middle column. The bars never touched the cards they described, so the picture
 * read as three disconnected pieces with a lot of dead space between them.
 *
 * Both stages are now a single SVG on a fixed viewBox: cards and connectors share one coordinate
 * system, so a curve genuinely runs from the edge of one card to the edge of another, and the whole
 * thing scales to any container width instead of needing a horizontal scrollbar on a phone.
 */

const CARD_W = 152;
const CARD_H = 122;

type StageTone = 'amber' | 'blue' | 'emerald' | 'slate';

interface StageNode {
  id: string;
  x: number;
  y: number;
  Icon: LucideIcon;
  title: string;
  value: number;
  sub?: string;
  tone: StageTone;
}

interface StageEdge {
  from: string;
  to: string;
  value: number;
  label: string;
  tone: StageTone;
  /** Drawn as a dashed detour around the right of the stage (grid topping up the house by day). */
  detour?: boolean;
}

const TONES: Record<StageTone, { line: string; icon: string; text: string }> = {
  amber: { line: '#f59e0b', icon: '#f59e0b', text: '#b45309' },
  blue: { line: '#3b82f6', icon: '#3b82f6', text: '#1d4ed8' },
  emerald: { line: '#10b981', icon: '#10b981', text: '#047857' },
  slate: { line: '#64748b', icon: '#475569', text: '#334155' },
};

const LIGHT_CARD: Record<StageTone, { fill: string; stroke: string }> = {
  amber: { fill: '#fffbeb', stroke: '#fcd34d' },
  blue: { fill: '#eff6ff', stroke: '#93c5fd' },
  emerald: { fill: '#ecfdf5', stroke: '#6ee7b7' },
  slate: { fill: '#f8fafc', stroke: '#cbd5e1' },
};

const DARK_CARD: Record<StageTone, { fill: string; stroke: string }> = {
  amber: { fill: '#292524', stroke: '#b45309' },
  blue: { fill: '#1e293b', stroke: '#1d4ed8' },
  emerald: { fill: '#1e293b', stroke: '#047857' },
  slate: { fill: '#1e293b', stroke: '#475569' },
};

const FlowStage: React.FC<{
  width: number;
  height: number;
  nodes: StageNode[];
  edges: StageEdge[];
  dark?: boolean;
}> = ({ width, height, nodes, edges, dark }) => {
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const cards = dark ? DARK_CARD : LIGHT_CARD;
  const titleFill = dark ? '#e2e8f0' : '#1e293b';
  const valueFill = dark ? '#f8fafc' : '#0f172a';
  const subFill = dark ? '#94a3b8' : '#94a3b8';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ display: 'block', maxWidth: width, margin: '0 auto', height: 'auto' }}
      role="img"
    >
      <style>{`
        @keyframes dashFlow { to { stroke-dashoffset: -36; } }
        .flow-line { animation: dashFlow 1.1s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .flow-line { animation: none; } }
      `}</style>

      {/* connectors first so the cards sit on top of the line ends */}
      {edges.filter(e => e.value > 0.01).map((e, i) => {
        const a = byId[e.from];
        const b = byId[e.to];
        if (!a || !b) return null;
        const tone = TONES[e.tone];

        let d: string;
        let lx: number;
        let ly: number;

        if (e.detour) {
          // Both cards are in the same column: loop out to the right and back in.
          const x1 = a.x + CARD_W;
          const y1 = a.y + CARD_H / 2;
          const x2 = b.x + CARD_W;
          const y2 = b.y + CARD_H / 2;
          const out = Math.min(x1, x2) + 74;
          d = `M ${x1},${y1} H ${out - 22} Q ${out},${y1} ${out},${y1 + 22} V ${y2 - 22} Q ${out},${y2} ${out - 22},${y2} H ${x2}`;
          lx = out + 8;
          ly = (y1 + y2) / 2;
        } else {
          const x1 = a.x + CARD_W;
          const y1 = a.y + CARD_H / 2;
          const x2 = b.x;
          const y2 = b.y + CARD_H / 2;
          const bend = Math.max(60, (x2 - x1) * 0.45);
          d = `M ${x1},${y1} C ${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`;
          lx = (x1 + x2) / 2;
          ly = (y1 + y2) / 2;
        }

        return (
          <g key={i}>
            <path d={d} fill="none" stroke={tone.line} strokeWidth={3} strokeOpacity={0.22} strokeLinecap="round" />
            <path
              className="flow-line"
              d={d}
              fill="none"
              stroke={tone.line}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={e.detour ? '6 8' : '14 22'}
            />
            {e.detour ? (
              <>
                <text x={lx} y={ly - 4} fontSize={10} fontWeight={800} fill={tone.text} letterSpacing={0.4}>
                  {e.label.toUpperCase()}
                </text>
                <text x={lx} y={ly + 11} fontSize={12} fontWeight={800} fill={tone.line}>
                  {e.value.toFixed(1)}
                  <tspan fontSize={9.5} fontWeight={600} fill="#94a3b8"> kWh</tspan>
                </text>
              </>
            ) : (
              <g transform={`translate(${lx}, ${ly})`}>
                <rect x={-46} y={-19} width={92} height={38} rx={9} fill={dark ? '#0f172a' : '#ffffff'} stroke={tone.line} strokeOpacity={0.35} />
                <text x={0} y={-4} textAnchor="middle" fontSize={9.5} fontWeight={800} fill={tone.text} letterSpacing={0.5}>
                  {e.label.toUpperCase()}
                </text>
                <text x={0} y={11} textAnchor="middle" fontSize={13} fontWeight={800} fill={tone.line}>
                  {e.value.toFixed(1)} kWh
                </text>
              </g>
            )}
          </g>
        );
      })}

      {nodes.map(n => {
        const c = cards[n.tone];
        const tone = TONES[n.tone];
        return (
          <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
            <rect width={CARD_W} height={CARD_H} rx={16} fill={c.fill} stroke={c.stroke} strokeWidth={2} />
            <g transform={`translate(${CARD_W / 2 - 13}, 14)`}>
              <n.Icon width={26} height={26} color={tone.icon} />
            </g>
            <text x={CARD_W / 2} y={62} textAnchor="middle" fontSize={13} fontWeight={700} fill={titleFill}>
              {n.title}
            </text>
            <text x={CARD_W / 2} y={90} textAnchor="middle" fontSize={23} fontWeight={800} fill={valueFill}>
              {n.value.toFixed(1)}
              <tspan fontSize={11} fontWeight={600} fill={subFill}> kWh</tspan>
            </text>
            {n.sub && (
              <text x={CARD_W / 2} y={108} textAnchor="middle" fontSize={10} fill={subFill}>
                {n.sub}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
