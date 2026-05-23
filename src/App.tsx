
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { simulateSolar, calculateBill, getKwhFromBill, calculateSystemCost } from './utils/billingEngine';
import { InputSlider } from './components/InputSlider';
import { InputNumber } from './components/InputNumber';
import { BillDetails } from './components/BillDetails';
import { EnergyChart } from './components/EnergyChart';
import { PlanRecommender } from './components/PlanRecommender';
import { SavingsGraphGenerator } from './components/SavingsGraphGenerator';
import { DailyFlowDiagram } from './components/DailyFlowDiagram';
import { DocForm } from './components/DocForm';
import { ForecastTable } from './components/ForecastTable';
import { BATTERY_COST_CASH, PANEL_WATTAGE, BATTERY_CAPACITY_KWH, APRIL_PROMO_BATTERY_UNIT_DISCOUNT } from './constants';
import { Zap, Sun, Battery, DollarSign, Leaf, Calculator, LayoutGrid, BarChart2, Activity, TrendingUp, AlertTriangle, RefreshCw, Download, Lock, ArrowRight, Home, FileText, Table, Menu, X, Building2 } from 'lucide-react';

const CommercialSolarShell = lazy(() => import('./commercial/CommercialSolarShell'));

const App = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [authError, setAuthError] = useState(false);

  // Navigation State with Persistence
  const [activeTab, setActiveTab] = useState<'calculator' | 'planner' | 'graphs' | 'daily' | 'forms' | 'forecast' | 'commercial'>(() => {
    const saved = localStorage.getItem('solar_activeTab');
    const ok = saved === 'calculator' || saved === 'planner' || saved === 'graphs' || saved === 'daily' || saved === 'forms' || saved === 'forecast' || saved === 'commercial';
    return ok ? saved : 'planner';
  });

  useEffect(() => {
    localStorage.setItem('solar_activeTab', activeTab);
  }, [activeTab]);

  // State for user inputs (Calculator)
  // Defaulting to RM 1000 Bill
  const DEFAULT_BILL = 1000;

  const [usageKwh, setUsageKwh] = useState<number | ''>(() => {
    return getKwhFromBill(DEFAULT_BILL);
  });

  const [billAmount, setBillAmount] = useState<number | ''>(DEFAULT_BILL);

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

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [aprilLaunchingPromo, setAprilLaunchingPromo] = useState(false);
  const [upgradeAutoBackupBox, setUpgradeAutoBackupBox] = useState(false);
  const [suriaHomeRebate, setSuriaHomeRebate] = useState(false);

  const handleAprilLaunchingPromoChange = (value: boolean) => {
    setAprilLaunchingPromo(value);
    if (!value) setUpgradeAutoBackupBox(false);
  };

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

  const simulation = useMemo(() => {
    const safeUsage = typeof usageKwh === 'number' ? usageKwh : 0;
    return simulateSolar(safeUsage, daytimePercent, panelCount, batteryCount);
  }, [usageKwh, daytimePercent, panelCount, batteryCount]);

  // System Cost Calculation for Calculator Tab
  const systemCost = useMemo(() => {
    // Single-phase sheet runs to 21 panels; above that use three-phase tier pricing.
    const estimatedPhase = panelCount > 21 ? 'three' : 'single';
    return calculateSystemCost(panelCount, batteryCount, estimatedPhase, {
      aprilLaunchingPromo,
      backupBoxUpgrade: upgradeAutoBackupBox,
      suriaHomeRebate
    });
  }, [panelCount, batteryCount, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate]);

  const savingsPercent = simulation.originalBill.finalTotal > 0
    ? (simulation.monthlySavings / simulation.originalBill.finalTotal) * 100
    : 0;

  const totalKwp = (panelCount * (PANEL_WATTAGE / 1000)).toFixed(2);

  // Check for Export > Import (Oversized)
  const isExportOversized = (simulation.newBill.exportUnits || 0) > simulation.gridImport;

  // Navigation Items Config
  const navItems = [
    { id: 'planner', label: 'Recommender', icon: LayoutGrid },
    { id: 'calculator', label: 'Calculator', icon: Calculator },
    { id: 'graphs', label: 'Graph', icon: BarChart2 },
    { id: 'forecast', label: 'Forecast', icon: Table },
    { id: 'daily', label: 'Illustration', icon: Activity },
    { id: 'forms', label: 'Forms', icon: FileText },
  ] as const;

  // --- COMMERCIAL SOLAR (separate app shell; does not share residential state) ---
  if (isAuthenticated && activeTab === 'commercial') {
    return (
      <div className="min-h-screen bg-slate-50 relative [--atap-commercial-header-h:3.5rem]">
        <div className="sticky top-0 z-[100] flex min-h-[3.5rem] shrink-0 items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm md:px-6">
          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
          >
            <ArrowRight size={16} className="rotate-180" />
            Back to Residential Solar
          </button>
          <span className="text-xs font-medium text-slate-500 md:text-sm">Commercial Solar Calculator</span>
        </div>
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center p-8 text-slate-500">
              Loading commercial calculator…
            </div>
          }
        >
          <CommercialSolarShell />
        </Suspense>
      </div>
    );
  }

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

          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">ATAP Solar Calculator</h1>
          <p className="text-center text-slate-500 mb-8 text-sm">Welcome back. Please enter your access code to continue.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
    <div className="flex min-h-screen bg-slate-50">

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation (Desktop & Mobile) */}
      <aside className={`w-64 bg-slate-900 text-white flex-col fixed inset-y-0 left-0 z-50 shadow-xl transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-400 p-1.5 rounded-lg text-slate-900">
              <Sun size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">ATAP Solar Calculator</h1>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5 opacity-80">by TC Yap</p>
            </div>
          </div>
          {/* Close Button (Mobile Only) */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === item.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
          <div className="my-3 border-t border-slate-800/80" />
          <button
            type="button"
            onClick={() => {
              setActiveTab('commercial');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'commercial'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <Building2 size={20} />
            <span>Commercial Solar</span>
          </button>
        </nav>

        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer text-left rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/95">
              <input
                type="checkbox"
                checked={aprilLaunchingPromo}
                onChange={e => handleAprilLaunchingPromoChange(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-amber-400/60 text-amber-500 focus:ring-amber-500"
              />
              <span className="leading-snug">
                <span className="font-bold text-amber-50">April Launching Promo</span>
                <span className="block text-amber-200/80 mt-0.5">No battery: −RM800 single / −RM1600 3-phase on system. With 1+ batteries: −RM1800 / −RM3000 on system; −RM800 per battery (cash &amp; CC).</span>
              </span>
            </label>
            {aprilLaunchingPromo && (
              <label className="ml-5 flex items-start gap-2 cursor-pointer rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-100/90">
                <input
                  type="checkbox"
                  checked={upgradeAutoBackupBox}
                  onChange={e => setUpgradeAutoBackupBox(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-amber-400/60 text-amber-500 focus:ring-amber-500"
                />
                <span className="leading-snug">
                  <span className="font-semibold text-amber-50">Upgrade to Auto BackupBox</span>
                  <span className="block text-amber-200/75 mt-0.5">
                    Only with 1+ battery: +RM800 single-phase / +RM1500 three-phase on system cash &amp; CC (not on
                    battery).
                  </span>
                </span>
              </label>
            )}
            <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100/95">
              <input
                type="checkbox"
                checked={suriaHomeRebate}
                onChange={e => setSuriaHomeRebate(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-emerald-400/60 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="leading-snug">
                <span className="font-bold text-emerald-50">SuRIA Home RM3,000 Rebate</span>
                <span className="block text-emerald-200/80 mt-0.5">Government rebate of RM3,000 — deducted from both cash &amp; CC price.</span>
              </span>
            </label>
          </div>
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="w-full mb-4 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-bold transition-all"
            >
              <Download size={16} />
              Install App
            </button>
          )}
          <p className="text-xs text-slate-500 text-center">Updated: {__BUILD_DATE__}</p>
        </div>
      </aside>



      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 pb-24 md:p-8 md:pb-8 overflow-x-hidden">
        {/* Mobile Header */}
        <div className="md:hidden mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-sm active:scale-95 transition-transform"
            >
              <Menu size={20} />
            </button>
            <div className="bg-yellow-400 p-1.5 rounded-lg text-slate-900 shadow-sm">
              <Sun size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-none">ATAP Solar</h1>
              <p className="text-[10px] text-slate-500 font-medium">Calculator</p>
            </div>
          </div>
          {showInstallBtn && (
            <button onClick={handleInstallClick} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Download size={20} />
            </button>
          )}
        </div>

        {/* Dynamic Content - Persisted state using CSS visibility */}

        {/* Calculator Tab */}
        <div className={activeTab === 'calculator' ? 'block animate-in fade-in duration-300' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                        icon={<DollarSign size={16} />}
                        unit=" RM"
                      />
                      {gapWarning && (
                        <div className="bg-amber-50 text-amber-800 p-3 text-xs rounded-xl border border-amber-200 flex items-start gap-2 shadow-sm animate-in slide-in-from-top-1">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                          <div className="flex-1">
                            <p className="font-bold mb-0.5">Tariff Blind Spot</p>
                            <button onClick={fixBillAmount} className="mt-1 text-blue-600 font-bold hover:underline hover:text-blue-700 flex items-center gap-1 transition-colors">
                              Round up <RefreshCw size={10} />
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

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <InputSlider
                        label="Daytime Usage"
                        value={daytimePercent}
                        min={0}
                        max={100}
                        unit="%"
                        onChange={setDaytimePercent}
                        icon={<Sun size={16} />}
                      />
                    </div>
                    <button
                      onClick={() => setDaytimePercent(30)}
                      className="p-3 bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-50 transition-colors group h-fit self-center"
                      title="Reset to 30%"
                    >
                      <RefreshCw size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:rotate-180 transition-all duration-300" />
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">System Size</div>
                    <div className="space-y-6">
                      <InputNumber
                        label="Solar Panels (640W)"
                        value={panelCount}
                        min={0}
                        max={500}
                        onChange={(val) => setPanelCount(Number(val))}
                        icon={<Leaf size={16} />}
                        helperText={`Total System Capacity: ${totalKwp} kWp`}
                      />

                      <InputNumber
                        label="Batteries (16 kWh)"
                        value={batteryCount}
                        min={0}
                        max={100}
                        onChange={(val) => setBatteryCount(Number(val))}
                        icon={<Battery size={16} />}
                        helperText={`Usable discharge ~${BATTERY_CAPACITY_KWH.toFixed(2)} kWh/day per unit (90% of 16 kWh nominal)`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                      <input
                        type="checkbox"
                        checked={aprilLaunchingPromo}
                        onChange={e => handleAprilLaunchingPromoChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <span>
                        <span className="font-bold">April Launching Promo</span>
                        <span className="block text-xs text-amber-800/90 mt-0.5">
                          No battery: single −RM800 / three-phase −RM1600 on system. With 1+ batteries: single −RM1800; three-phase −RM3000; −RM800 per battery (cash &amp; CC).
                        </span>
                      </span>
                    </label>
                    {aprilLaunchingPromo && (
                      <label className="ml-2 flex items-start gap-3 cursor-pointer rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
                        <input
                          type="checkbox"
                          checked={upgradeAutoBackupBox}
                          onChange={e => setUpgradeAutoBackupBox(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                        />
                        <span>
                          <span className="font-bold">Upgrade to Auto BackupBox</span>
                          <span className="block text-xs text-amber-800/90 mt-0.5">
                            Only when ordering 1+ battery: +RM800 (single-phase) or +RM1500 (three-phase) on system cash
                            &amp; CC (not on battery).
                          </span>
                        </span>
                      </label>
                    )}
                    <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
                      <input
                        type="checkbox"
                        checked={suriaHomeRebate}
                        onChange={e => setSuriaHomeRebate(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>
                        <span className="font-bold">SuRIA Home RM3,000 Rebate</span>
                        <span className="block text-xs text-emerald-800/90 mt-0.5">
                          Government rebate of RM3,000 — deducted from both cash &amp; CC price on all systems.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* System Price Est. */}
              {systemCost && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <DollarSign className="text-emerald-600" size={20} />
                    Est. System Price
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Credit Card Price</span>
                      <span className="font-bold text-slate-900 text-lg">RM {systemCost.cc.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">Cash Price</span>
                      <span className="font-bold text-emerald-600 text-lg">RM {systemCost.cash.toLocaleString()}</span>
                    </div>
                    {typeof systemCost.backupBoxUpgradeRM === 'number' && systemCost.backupBoxUpgradeRM > 0 && (
                      <div className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5">
                        <span>Auto BackupBox upgrade</span>
                        <span className="font-semibold">+RM {systemCost.backupBoxUpgradeRM.toLocaleString()}</span>
                      </div>
                    )}
                    {typeof systemCost.aprilPromoDiscount === 'number' && systemCost.aprilPromoDiscount > 0 && (
                      <div className="flex justify-between items-center text-xs text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5">
                        <span>April Launching Promo</span>
                        <span className="font-semibold">−RM {systemCost.aprilPromoDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {typeof systemCost.suriaRebate === 'number' && systemCost.suriaRebate > 0 && (
                      <div className="flex justify-between items-center text-xs text-emerald-800 bg-emerald-50 rounded-lg px-2 py-1.5">
                        <span>SuRIA Home Rebate</span>
                        <span className="font-semibold">−RM {systemCost.suriaRebate.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-50 text-center">
                      Based on {panelCount > 21 ? '3-Phase' : 'Single Phase'} Inverter
                    </div>
                  </div>
                </div>
              )}

              {/* Oversized Warning */}
              {isExportOversized && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 text-red-800 animate-in slide-in-from-top-2">
                  <AlertTriangle size={20} className="text-red-500 shrink-0" />
                  <div>
                    <p className="font-bold text-sm mb-1">System Oversized Warning</p>
                    <p className="text-xs opacity-90 leading-relaxed">
                      New Export ({(simulation.newBill.exportUnits || 0).toLocaleString()} kWh) is higher than New Import ({simulation.gridImport.toLocaleString()} kWh).
                      This configuration is not ideal for maximizing ROI. Consider reducing panel count or adding batteries.
                    </p>
                  </div>
                </div>
              )}

              {/* Estimated Monthly Savings */}
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
                    <li>
                      <strong>Export Credit:</strong> RM0.2703/kWh if new import ≤1500 kWh, or RM0.3703/kWh if new import &gt;1500 kWh.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other Tabs */}
        <div className={activeTab === 'planner' ? 'block' : 'hidden'}>
          <PlanRecommender
            initialUsage={typeof usageKwh === 'number' ? usageKwh : 0}
            aprilLaunchingPromo={aprilLaunchingPromo}
            onAprilLaunchingPromoChange={handleAprilLaunchingPromoChange}
            upgradeAutoBackupBox={upgradeAutoBackupBox}
            onUpgradeAutoBackupBoxChange={setUpgradeAutoBackupBox}
            suriaHomeRebate={suriaHomeRebate}
            onSuriaHomeRebateChange={setSuriaHomeRebate}
          />
        </div>

        <div className={activeTab === 'graphs' ? 'block' : 'hidden'}>
          <SavingsGraphGenerator initialUsage={typeof usageKwh === 'number' ? usageKwh : 0} />
        </div>

        <div className={activeTab === 'forecast' ? 'block' : 'hidden'}>
          <ForecastTable
            initialUsage={typeof usageKwh === 'number' ? usageKwh : 0}
            aprilLaunchingPromo={aprilLaunchingPromo}
            upgradeAutoBackupBox={upgradeAutoBackupBox}
          />
        </div>

        <div className={activeTab === 'daily' ? 'block' : 'hidden'}>
          <DailyFlowDiagram initialUsage={typeof usageKwh === 'number' ? usageKwh : 0} />
        </div>

        {/* DocForm - Rendered hidden when not active to preserve state */}
        <div className={activeTab === 'forms' ? 'block' : 'hidden'}>
          <DocForm
            aprilLaunchingPromo={aprilLaunchingPromo}
            upgradeAutoBackupBox={upgradeAutoBackupBox}
            initialData={{
              systemSize: Number(totalKwp),
              panelCount: panelCount,
              inverterSize: systemCost?.inverterSize,
              systemPrice: systemCost?.cash,
              systemCCPrice: systemCost?.cc,
              batteryCount: batteryCount,
              batteryCash:
                batteryCount *
                (aprilLaunchingPromo ? BATTERY_COST_CASH - APRIL_PROMO_BATTERY_UNIT_DISCOUNT : BATTERY_COST_CASH),
              annualGen: simulation.solarGenerationMonthly * 12,
              monthlyGen: simulation.solarGenerationMonthly
            }}
          />
        </div>

      </main>
    </div>
  );
};

export default App;
