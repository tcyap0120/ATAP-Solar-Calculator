
import React, { useState, useEffect, useMemo } from 'react';
import { simulateSolar, calculateBill, getKwhFromBill } from './utils/billingEngine';
import { InputSlider } from './components/InputSlider';
import { InputNumber } from './components/InputNumber';
import { BillDetails } from './components/BillDetails';
import { EnergyChart } from './components/EnergyChart';
import { PlanRecommender } from './components/PlanRecommender';
import { SavingsGraphGenerator } from './components/SavingsGraphGenerator';
import { DailyFlowDiagram } from './components/DailyFlowDiagram';
import { Zap, Sun, Battery, Clock, DollarSign, Leaf, Calculator, LayoutGrid, BarChart2, Activity, TrendingUp, AlertTriangle, RefreshCw, Download, Lock, ArrowRight } from 'lucide-react';

const App = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [authError, setAuthError] = useState(false);

  // Navigation State with Persistence
  const [activeTab, setActiveTab] = useState<'calculator' | 'planner' | 'graphs' | 'daily'>(() => {
    const saved = localStorage.getItem('solar_activeTab');
    return (saved === 'calculator' || saved === 'planner' || saved === 'graphs' || saved === 'daily') ? saved : 'calculator';
  });

  useEffect(() => {
    localStorage.setItem('solar_activeTab', activeTab);
  }, [activeTab]);

  // State for user inputs (Calculator)
  const [usageKwh, setUsageKwh] = useState<number | ''>(1200);
  // Initialize bill amount based on default usage
  const [billAmount, setBillAmount] = useState<number | ''>(() => {
    const res = calculateBill(1200);
    return parseFloat(res.finalTotal.toFixed(2));
  });
  
  const [daytimePercent, setDaytimePercent] = useState<number>(30); // Default 30%
  const [panelCount, setPanelCount] = useState<number>(12);
  const [batteryCount, setBatteryCount] = useState<number>(1);

  // Syncing State
  const [isSyncing, setIsSyncing] = useState(false);
  const [gapWarning, setGapWarning] = useState<boolean>(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Tariff Blind Spot Bounds
  const billGapLower = useMemo(() => calculateBill(1500).finalTotal, []);
  const billGapUpper = useMemo(() => calculateBill(1501).finalTotal, []);

  // Check for stored auth session
  useEffect(() => {
    const storedAuth = localStorage.getItem('solar_auth');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // PWA Install Logic
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === 'tcyap888') {
      setIsAuthenticated(true);
      setAuthError(false);
      localStorage.setItem('solar_auth', 'true');
    } else {
      setAuthError(true);
    }
  };

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
      // Auto fix usage to valid upper bound if typing in blind spot
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
    setUsageKwh(1501);
  };

  // Derived state (Simulation Result)
  const simulation = useMemo(() => {
    const safeUsage = typeof usageKwh === 'number' ? usageKwh : 0;
    return simulateSolar(safeUsage, daytimePercent, panelCount, batteryCount);
  }, [usageKwh, daytimePercent, panelCount, batteryCount]);

  // Derived calculations for UI displays
  const savingsPercent = simulation.originalBill.finalTotal > 0 
    ? (simulation.monthlySavings / simulation.originalBill.finalTotal) * 100 
    : 0;

  const totalKwp = (panelCount * 0.62).toFixed(2);

  // --- RENDER WELCOME SCREEN IF NOT AUTHENTICATED ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
         <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
            
            <div className="flex justify-center mb-6">
               <div className="bg-blue-50 p-4 rounded-2xl">
                 <Sun size={48} className="text-blue-600 fill-blue-600 animate-pulse" />
               </div>
            </div>
            
            <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Solar Calculator by TC</h1>
            <p className="text-center text-slate-500 mb-8 text-sm">Welcome back. Please enter your access code to continue.</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
               <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input 
                      type="password" 
                      placeholder="Access Code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${authError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200 focus:border-blue-400'}`}
                    />
                  </div>
                  {authError && <p className="text-xs text-red-500 mt-2 pl-1 font-medium">Incorrect access code. Please try again.</p>}
               </div>
               
               <button 
                 type="submit"
                 className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group"
               >
                 Enter App
                 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </form>
            
            <p className="text-center text-xs text-slate-300 mt-8">Ver 2.0.0 • Protected System</p>
         </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-slate-900 text-white pt-8 pb-24 px-4 md:px-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=3264&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-yellow-400 p-1.5 rounded-lg text-slate-900">
                <Sun size={24} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Solar Calculator by TC</h1>
            </div>
            <p className="text-slate-300 text-sm max-w-md leading-relaxed">
              Precision TNB Bill Calculator & Intelligent Solar System Planner for Malaysia.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Install App Button (Visible only if PWA installable) */}
            {showInstallBtn && (
              <button 
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all border border-white/20 animate-pulse"
              >
                <Download size={16} />
                Install App
              </button>
            )}

            {/* Global Savings Stat (Only relevant if looking at calculator, but nice to have) */}
            {activeTab === 'calculator' && (
              <div className="hidden md:block text-right animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Est. Monthly Savings</div>
                <div className="flex flex-col items-end">
                  <div className="text-3xl font-bold text-emerald-400">
                    RM {simulation.monthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-sm font-medium text-emerald-200">
                    Save {Math.round(savingsPercent)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation - Grid on mobile, Flex on desktop */}
        <div className="max-w-7xl mx-auto mt-8 grid grid-cols-2 md:flex md:gap-2 relative z-10">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-t-xl font-bold transition-all text-sm md:text-base ${
              activeTab === 'calculator' 
                ? 'bg-slate-50 text-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Calculator size={18} className="shrink-0" />
            <span>Calculator</span>
          </button>
          <button
            onClick={() => setActiveTab('planner')}
            className={`flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-t-xl font-bold transition-all text-sm md:text-base ${
              activeTab === 'planner' 
                ? 'bg-slate-50 text-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <LayoutGrid size={18} className="shrink-0" />
            <span>Recommender</span>
          </button>
          <button
            onClick={() => setActiveTab('graphs')}
            className={`flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-t-xl font-bold transition-all text-sm md:text-base ${
              activeTab === 'graphs' 
                ? 'bg-slate-50 text-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <BarChart2 size={18} className="shrink-0" />
            <span>Graph</span>
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-t-xl font-bold transition-all text-sm md:text-base ${
              activeTab === 'daily' 
                ? 'bg-slate-50 text-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Activity size={18} className="shrink-0" />
            <span>Illustration</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 -mt-6 relative z-20">
        
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
            {/* Left Column: Inputs */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Zap className="text-blue-600" size={20} />
                  Configuration
                </h2>
                
                <div className="space-y-6">
                  {/* Bill & Usage Sync Section */}
                  <div className="space-y-4">
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
                      label="Monthly Usage"
                      value={usageKwh}
                      min={100}
                      max={10000}
                      step={10}
                      unit=" kWh"
                      onChange={handleUsageChange}
                      icon={<Zap size={16} />}
                    />
                  </div>

                  <InputSlider
                    label="Daytime Usage"
                    value={daytimePercent}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={setDaytimePercent}
                    icon={<Sun size={16} />}
                  />

                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">System Size</div>
                    <div className="space-y-6">
                      <InputNumber
                        label="Solar Panels (620W)"
                        value={panelCount}
                        min={0}
                        max={500}
                        onChange={(val) => setPanelCount(Number(val))}
                        icon={<Leaf size={16} />}
                        helperText={`Total System Capacity: ${totalKwp} kWp`}
                      />

                      <InputNumber
                        label="Batteries (14kWh)"
                        value={batteryCount}
                        min={0}
                        max={100}
                        onChange={(val) => setBatteryCount(Number(val))}
                        icon={<Battery size={16} />}
                        helperText="Effective capacity ~12.87kWh (10% conservative loss)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Estimated Monthly Savings (Duplicate Display) */}
              <div className="bg-emerald-500 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                   <TrendingUp size={64} />
                 </div>
                 <div className="relative z-10">
                   <h3 className="font-bold text-emerald-100 uppercase text-xs tracking-wider mb-2">Est. Monthly Savings</h3>
                   <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">RM {simulation.monthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-sm font-medium text-emerald-100 opacity-80">({Math.round(savingsPercent)}%)</span>
                   </div>
                 </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-blue-600 rounded-2xl shadow-lg p-6 text-white">
                <h3 className="font-bold text-blue-100 uppercase text-xs tracking-wider mb-4">System Output & Demand</h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <div className="text-2xl font-bold">{Math.round(simulation.solarGenerationMonthly).toLocaleString()}</div>
                    <div className="text-blue-200 text-xs">kWh Generated</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{Math.round(simulation.batteryDischarge).toLocaleString()}</div>
                    <div className="text-blue-200 text-xs">kWh Battery Used</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold opacity-90">{Math.round(simulation.demandDay).toLocaleString()}</div>
                    <div className="text-blue-200 text-xs">Daytime Demand (kWh)</div>
                  </div>
                   <div>
                    <div className="text-xl font-bold opacity-90">{Math.round(simulation.demandNight).toLocaleString()}</div>
                    <div className="text-blue-200 text-xs">Nighttime Demand (kWh)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Results */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Charts Section */}
              <EnergyChart simulation={simulation} />

              {/* Detailed Bill Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BillDetails 
                  data={simulation.originalBill} 
                  title="Original Utility Bill" 
                />
                <BillDetails 
                  data={simulation.newBill} 
                  title="Projected Bill with Solar" 
                  isProjected 
                />
              </div>

              {/* Warning / Note */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
                <div className="mt-0.5">
                  <DollarSign size={16} />
                </div>
                <div>
                  <p className="mb-2">
                    <strong>Tariff Note:</strong> Tariff is calculated as a flat rate: RM0.4443/kWh for usage ≤1500 kWh, and RM0.5443/kWh for usage &gt;1500 kWh. Service Tax (8%) is applied only to the cost portion exceeding 600 kWh usage.
                  </p>
                  <ul className="list-disc list-outside pl-4 space-y-1 text-xs opacity-90">
                    <li>Solar generation calculated based on <strong>3.5 peak sun hours</strong>/day.</li>
                    <li>Export credit calculated using average SMP of <strong>RM 0.20/kWh</strong>.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <PlanRecommender initialUsage={typeof usageKwh === 'number' ? usageKwh : 0} />
        )}

        {activeTab === 'graphs' && (
          <SavingsGraphGenerator initialUsage={typeof usageKwh === 'number' ? usageKwh : 0} />
        )}

        {activeTab === 'daily' && (
          <DailyFlowDiagram initialUsage={typeof usageKwh === 'number' ? usageKwh : 0} />
        )}

      </main>
    </div>
  );
};

export default App;
