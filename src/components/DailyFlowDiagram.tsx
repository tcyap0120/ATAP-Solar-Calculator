
import React, { useState, useMemo, useEffect } from 'react';
import { calculateBill, getKwhFromBill, simulateSolar } from '../utils/billingEngine';
import { BATTERY_CAPACITY_KWH, PANEL_WATTAGE, PEAK_SUN_HOURS } from '../constants';
import { InputNumber } from './InputNumber';
import { InputSlider } from './InputSlider';
import { Zap, DollarSign, Sun, Battery, Home, ArrowRight, Activity, AlertTriangle, RefreshCw, Moon, ArrowDown, Calendar } from 'lucide-react';

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

  const FlowArrow = ({ val, color, label }: { val: number, color: string, label?: string }) => {
    if (val <= 0.01) return <div className="hidden"></div>;
    return (
      <div className="flex flex-col items-center justify-center relative h-full w-full">
         {label && <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">{label}</span>}
         <div className={`relative h-1.5 w-full rounded-full ${color} bg-opacity-30 overflow-hidden`}>
            <div className={`absolute inset-0 ${color} animate-flow`}></div>
         </div>
         <span className={`text-xs font-bold mt-1 ${color.replace('bg-', 'text-')}`}>
           {val.toFixed(1)} kWh
         </span>
         <style>{`
            @keyframes flow {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .animate-flow {
              animation: flow 1.5s linear infinite;
            }
         `}</style>
      </div>
    );
  };

  const NodeCard = ({ icon, title, value, color, subtext }: any) => (
    <div className={`flex flex-col items-center justify-center p-4 bg-white border ${color} rounded-xl shadow-sm z-10 w-28 md:w-32 h-28 md:h-32 text-center`}>
      <div className="mb-2">{icon}</div>
      <div className="font-bold text-slate-800 text-sm leading-tight">{title}</div>
      <div className="font-mono font-bold text-lg">{value.toFixed(1)} <span className="text-[10px] font-sans font-normal text-slate-400">kWh</span></div>
      {subtext && <div className="text-[10px] text-slate-400 leading-tight mt-1">{subtext}</div>}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
       {/* Inputs Section */}
       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Activity className="text-blue-600" size={24} />
          Daily Simulation
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100">
           <InputNumber 
              label="Solar Panels" 
              value={panelCount} 
              onChange={val => setPanelCount(Number(val))} 
              icon={<Sun size={16}/>} 
              helperText={`${(panelCount * 0.62).toFixed(2)} kWp`} 
           />
           <InputNumber 
              label="Batteries" 
              value={batteryCount} 
              onChange={val => setBatteryCount(Number(val))} 
              icon={<Battery size={16}/>} 
              helperText={`${(batteryCount * 14.3).toFixed(1)}kWh (conservatively calculate 10% loss as ${(batteryCount * 12.87).toFixed(1)}kWh)`} 
           />
        </div>
      </div>

      {/* --- DAYTIME FLOW DIAGRAM --- */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
         <div className="flex items-center gap-2 mb-8 justify-center">
            <Sun className="text-amber-500 fill-amber-500" size={32} />
            <h3 className="text-2xl font-bold text-slate-800">Daytime Flow</h3>
         </div>

         <div className="relative max-w-4xl mx-auto h-[400px] md:h-[300px]">
            {/* Grid Container */}
            <div className="grid grid-cols-3 h-full items-center justify-items-center gap-4">
              
              {/* Left: Source (Solar) */}
              <div className="row-span-3">
                 <NodeCard 
                   icon={<Sun size={32} className="text-amber-500" />} 
                   title="Solar Panels" 
                   value={dailyStats.dailySolarGen} 
                   color="border-amber-200 ring-4 ring-amber-50"
                   subtext="Total Generation"
                 />
              </div>

              {/* Middle: Connections */}
              <div className="flex flex-col h-full w-full justify-around py-8 relative">
                 {/* Solar to Grid (Top) */}
                 <div className="flex items-center w-full">
                    <div className="flex-1 -rotate-12 transform origin-left translate-y-4">
                      <FlowArrow val={dailyStats.solarToGrid} color="bg-blue-500" label="Export" />
                    </div>
                 </div>

                 {/* Solar to Home (Middle) */}
                 <div className="flex items-center w-full">
                    <div className="flex-1">
                      <FlowArrow val={dailyStats.solarToHome} color="bg-amber-500" label="Direct Use" />
                    </div>
                 </div>

                 {/* Solar to Battery (Bottom) */}
                 <div className="flex items-center w-full">
                    <div className="flex-1 rotate-12 transform origin-left -translate-y-4">
                      <FlowArrow val={dailyStats.solarToBattery} color="bg-emerald-500" label="Charge" />
                    </div>
                 </div>
              </div>

              {/* Right: Destinations */}
              <div className="flex flex-col h-full justify-between w-full items-center py-2">
                 {/* Grid */}
                 <div className="relative">
                   <NodeCard 
                     icon={<Zap size={24} className="text-blue-500" />} 
                     title="Grid Export" 
                     value={dailyStats.solarToGrid} 
                     color="border-blue-200"
                   />
                   {/* Grid Import Arrow (Day) - Special Case */}
                   {dailyStats.gridToHomeDay > 0 && (
                     <div className="absolute top-full left-1/2 -translate-x-1/2 h-16 w-0.5 bg-blue-300 border-l border-dashed border-blue-400">
                        <div className="absolute top-1/2 left-4 w-24 -translate-y-1/2">
                          <span className="text-[10px] text-blue-500 font-bold block">Import</span>
                          <span className="text-xs font-mono font-bold">{dailyStats.gridToHomeDay.toFixed(1)} kWh</span>
                        </div>
                        <ArrowDown size={12} className="absolute bottom-0 -translate-x-1/2 text-blue-400" />
                     </div>
                   )}
                 </div>

                 {/* Home */}
                 <div className="relative z-20">
                    <NodeCard 
                      icon={<Home size={24} className="text-slate-600" />} 
                      title="Home Load" 
                      value={dailyStats.dayDemand} 
                      color="border-slate-300 bg-slate-50"
                      subtext="Daytime Usage"
                    />
                 </div>

                 {/* Battery */}
                 <div>
                    <NodeCard 
                      icon={<Battery size={24} className="text-emerald-500" />} 
                      title="Battery" 
                      value={dailyStats.solarToBattery} 
                      color="border-emerald-200"
                      subtext="Charged"
                    />
                 </div>
              </div>
            </div>
         </div>
      </div>


      {/* --- NIGHTTIME FLOW DIAGRAM --- */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl text-slate-100">
         <div className="flex items-center gap-2 mb-8 justify-center">
            <Moon className="text-blue-200 fill-blue-200" size={32} />
            <h3 className="text-2xl font-bold text-white">Nighttime Flow</h3>
         </div>

         <div className="relative max-w-4xl mx-auto h-[250px]">
            {/* Grid Container */}
            <div className="grid grid-cols-3 h-full items-center justify-items-center gap-4">
              
              {/* Left: Sources */}
              <div className="flex flex-col h-full justify-around w-full items-center">
                 {/* Battery Source */}
                 <NodeCard 
                   icon={<Battery size={24} className="text-emerald-500" />} 
                   title="Battery" 
                   value={dailyStats.batteryToHome} 
                   color="border-emerald-800 bg-slate-800 text-slate-200"
                   subtext="Discharge (90% eff)"
                 />
                 
                 {/* Grid Source */}
                 <NodeCard 
                   icon={<Zap size={24} className="text-blue-400" />} 
                   title="Grid Import" 
                   value={dailyStats.gridToHomeNight} 
                   color="border-blue-900 bg-slate-800 text-slate-200"
                 />
              </div>

              {/* Middle: Connections */}
              <div className="flex flex-col h-full w-full justify-around py-8">
                 {/* Battery to Home */}
                 <div className="flex items-center w-full">
                    <div className="flex-1 rotate-6 transform origin-left">
                      <FlowArrow val={dailyStats.batteryToHome} color="bg-emerald-500" label="Discharge" />
                    </div>
                 </div>

                 {/* Grid to Home */}
                 <div className="flex items-center w-full">
                    <div className="flex-1 -rotate-6 transform origin-left">
                      <FlowArrow val={dailyStats.gridToHomeNight} color="bg-blue-500" label="Import" />
                    </div>
                 </div>
              </div>

              {/* Right: Destination (Home) */}
              <div className="row-span-2">
                 <NodeCard 
                    icon={<Home size={32} className="text-slate-300" />} 
                    title="Home Load" 
                    value={dailyStats.nightDemand} 
                    color="border-slate-600 bg-slate-800 text-slate-100"
                    subtext="Night Usage"
                  />
              </div>

            </div>
         </div>
      </div>
      
      {/* --- MONTHLY PROJECTION --- */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg border border-blue-500/50">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
          <Calendar className="text-blue-300" size={24} />
          Projected Monthly Totals
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
        </div>
      </div>

    </div>
  );
};
