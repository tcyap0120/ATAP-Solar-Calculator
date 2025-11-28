
import React, { useState, useMemo, useEffect } from 'react';
import { calculateBill, getKwhFromBill, simulateSolar } from '../utils/billingEngine';
import { BATTERY_CAPACITY_KWH, SYSTEM_PRICING } from '../constants';
import { InputNumber } from './InputNumber';
import { InputSlider } from './InputSlider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { Zap, DollarSign, Sun, TrendingUp, AlertTriangle, RefreshCw, Battery } from 'lucide-react';

interface SavingsGraphGeneratorProps {
  initialUsage: number;
}

export const SavingsGraphGenerator: React.FC<SavingsGraphGeneratorProps> = ({ initialUsage }) => {
  // Inputs
  const [usageKwh, setUsageKwh] = useState<number | ''>(initialUsage);
  const [billAmount, setBillAmount] = useState<number | ''>(0);
  const [phase, setPhase] = useState<'single' | 'three'>('single');
  const [daytimePercent, setDaytimePercent] = useState<number>(30);
  const [isSyncing, setIsSyncing] = useState(false);
  const [gapWarning, setGapWarning] = useState<boolean>(false);

  // Constants
  const billGapLower = useMemo(() => calculateBill(1500).finalTotal, []);
  const billGapUpper = useMemo(() => calculateBill(1501).finalTotal, []);

  // Initialize bill
  useEffect(() => {
    const val = typeof usageKwh === 'number' ? usageKwh : 0;
    const bill = calculateBill(val).finalTotal;
    setBillAmount(parseFloat(bill.toFixed(2)));
  }, []);

  // Sync Logic (Reused from PlanRecommender for consistency)
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

  // --- Graph Data Generation ---
  const graphsData = useMemo(() => {
    const effectiveUsage = typeof usageKwh === 'number' ? usageKwh : 0;
    
    // 1. Determine Max Batteries (Match kWh method)
    // Night Usage Daily = (Monthly Usage / 30) * (Night %)
    // Max Batteries = Ceil(Night Usage Daily / Battery Capacity)
    const dailyUsage = effectiveUsage / 30;
    const nightPercent = 1 - (daytimePercent / 100);
    const dailyNightUsage = dailyUsage * nightPercent;
    
    // Determine how many batteries needed to cover night load completely
    const maxBatteriesNeeded = Math.ceil(dailyNightUsage / BATTERY_CAPACITY_KWH);
    
    // Clamp to a reasonable visualization limit (e.g., 10) to prevent UI crash on huge inputs
    const batteryLimit = Math.min(maxBatteriesNeeded, 10);

    const allSeries = [];

    // 2. Generate series for each battery count (0 to Max)
    for (let b = 0; b <= batteryLimit; b++) {
      const dataPoints = [];
      let crossoverPanel: number | null = null; // Track when export > import

      // X-axis: Panels from 6 to 54
      for (let p = 6; p <= 54; p++) {
        const sim = simulateSolar(effectiveUsage, daytimePercent, p, b);
        const pct = sim.originalBill.finalTotal > 0 
          ? (sim.monthlySavings / sim.originalBill.finalTotal) * 100 
          : 0;

        const exportUnits = sim.newBill.exportUnits || 0;
        const importUnits = sim.gridImport;

        // Check for crossover (First point where Export > Import)
        if (crossoverPanel === null && exportUnits > importUnits) {
          crossoverPanel = p;
        }

        dataPoints.push({
          panels: p,
          savings: sim.monthlySavings,
          bill: sim.newBill.finalTotal,
          export: exportUnits,
          import: importUnits,
          savedPercentage: pct
        });
      }
      allSeries.push({
        batteryCount: b,
        data: dataPoints,
        crossoverPanel
      });
    }

    return allSeries;
  }, [usageKwh, daytimePercent]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Inputs Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <TrendingUp className="text-blue-600" size={24} />
          Analysis Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col gap-2">
            <InputNumber
              label="Avg. Monthly Bill"
              value={billAmount}
              onChange={handleBillChange}
              icon={<DollarSign size={16}/>}
              unit=" RM"
            />
            {gapWarning && (
              <div className="bg-amber-50 text-amber-800 p-3 text-xs rounded-xl border border-amber-200 flex items-start gap-2 shadow-sm animate-in slide-in-from-top-1">
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
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <label className="text-slate-600 font-medium flex items-center gap-2 mb-2">
              <Zap size={16} /> TNB Phase
            </label>
            <div className="flex gap-2">
              <button 
                onClick={() => setPhase('single')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${phase === 'single' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Single Phase
              </button>
              <button 
                onClick={() => setPhase('three')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${phase === 'three' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                3 Phase
              </button>
            </div>
          </div>
          
           <div className="flex items-end">
             <div className="w-full">
                <InputSlider
                  label="Daytime Usage %"
                  value={daytimePercent}
                  min={0} max={100} unit="%"
                  onChange={setDaytimePercent}
                  icon={<Sun size={16}/>}
               />
             </div>
           </div>
        </div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {graphsData.map((series) => (
          <div key={series.batteryCount} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-lg flex flex-col h-[360px]">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                  <Battery size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">
                    {series.batteryCount} Battery
                  </h3>
                  <span className="text-xs text-slate-400">
                    {(series.batteryCount * BATTERY_CAPACITY_KWH).toFixed(1)} kWh Storage
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="panels" 
                    type="number" 
                    domain={[6, 54]} 
                    tickCount={9}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    label={{ value: 'Panels', position: 'bottom', offset: 0, fontSize: 10, fill: '#94a3b8' }}
                  />
                  {/* Left Axis: RM */}
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: '#2563eb' }}
                    tickFormatter={(val) => `RM${val}`}
                    width={45}
                  />
                  {/* Right Axis: % */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: '#10b981' }}
                    tickFormatter={(val) => `${Math.round(val)}%`}
                    width={40}
                    domain={[0, 100]}
                  />
                  
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'savedPercentage') return [`${Math.round(value)}%`, 'Bill Saved'];
                      return [`RM ${value.toLocaleString(undefined, {maximumFractionDigits:0})}`, 'Savings'];
                    }}
                    labelFormatter={(label) => `${label} Panels`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  
                  {phase === 'single' && (
                    <ReferenceLine yAxisId="left" x={22} stroke="#f59e0b" strokeDasharray="3 3">
                      <Label value="Single Phase Limit" position="insideTopRight" angle={-90} offset={20} style={{ fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} />
                    </ReferenceLine>
                  )}

                  {series.crossoverPanel && (
                    <ReferenceLine yAxisId="left" x={series.crossoverPanel} stroke="#ef4444" strokeDasharray="3 3">
                      <Label 
                        value="Export > Import" 
                        position="center" 
                        angle={-90} 
                        dx={-15}
                        style={{ fill: '#ef4444', fontSize: 10, fontWeight: 'bold', textShadow: '0px 0px 3px white' }} 
                      />
                    </ReferenceLine>
                  )}

                  {/* Primary Line: Savings RM */}
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="savings" 
                    stroke="#2563eb" 
                    strokeWidth={2} 
                    dot={false}
                    activeDot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                  />
                  
                  {/* Secondary Line: Savings % (Invisible but active for tooltip and axis scaling) */}
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="savedPercentage" 
                    stroke="#10b981" 
                    strokeWidth={0} 
                    strokeOpacity={0}
                    dot={false}
                    activeDot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
             <p className="text-[10px] text-center text-slate-400 mt-2">
               X: Panel Count (6-54) • Y1: Savings (RM) • Y2: Bill % Saved
            </p>
          </div>
        ))}
      </div>
      
      {graphsData.length === 0 && (
         <div className="text-center p-12 text-slate-400">
           Enter usage to generate graphs.
         </div>
      )}
    </div>
  );
};
