import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../CommercialSolarShell';
import { DEFAULT_BRANDS } from '../constants';
import { 
  Zap, 
  Battery, 
  Sun, 
  TrendingUp, 
  Minus,
  Plus,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Lightbulb,
  Clock,
  Sliders,
  RotateCcw,
  RefreshCw,
  DollarSign,
  PanelTop,
  Activity,
  Globe,
  Download,
  Copy,
  Image as ImageIcon
} from 'lucide-react';
// @ts-ignore
import html2canvas from 'html2canvas';

const CommercialResiPage: React.FC = () => {
  const { settings, brands } = useAppContext();

  /** Always GoodWe (Hybrid) for pricing — same as commercial Recommender; never fall back to another brand. */
  const goodWeBrand = useMemo(() => {
    return (
      brands.find((b) => b.id === 'goodwe') ?? DEFAULT_BRANDS.find((b) => b.id === 'goodwe') ?? DEFAULT_BRANDS[0]
    );
  }, [brands]);

  // --- Master Usage State ---
  const [usageKwh, setUsageKwh] = useState<number>(2000);
  const [currentBill, setCurrentBill] = useState<number>(0); // New State for Bill
  const [daytimePercent, setDaytimePercent] = useState<number>(30);
  /** `null` = unknown / unlimited (no roof cap); numeric = max panels from roof survey */
  const [roofLimit, setRoofLimit] = useState<number | null>(null);

  /** Max panels for formula plans: unknown / non-positive = no cap; otherwise roof limit. */
  const formulaPanelCap = useMemo(
    () =>
      roofLimit == null || roofLimit <= 0 ? Number.POSITIVE_INFINITY : roofLimit,
    [roofLimit]
  );
  
  // --- Manual Mode State ---
  const [manualPanels, setManualPanels] = useState<number>(20);
  const [manualBattery, setManualBattery] = useState<number>(0);

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [selectedFormulaDaytime, setSelectedFormulaDaytime] = useState(true);
  const [selectedFormulaBess, setSelectedFormulaBess] = useState(true);

  const [isWAModalOpen, setIsWAModalOpen] = useState(false);
  const [proposalLang, setProposalLang] = useState<'zh' | 'en'>('zh');
  const proposalRef = useRef<HTMLDivElement>(null);

  // --- Sync Logic (Two-Way) ---
  // Get active tariff details
  const activeGroup = settings.tariffGroups?.[0] || { rate: settings.tariffRate, kwtbbPct: settings.kwtbb * 100 };
  const tariffRate = activeGroup.rate;
  const kwtbbPct = (activeGroup.kwtbbPct || 1.6) / 100;
  const fixedCharge = 20.00;

  // Initialize Bill on Mount based on default Usage
  useEffect(() => {
    const energy = usageKwh * tariffRate;
    const kwtbb = energy * kwtbbPct;
    const total = energy + kwtbb + fixedCharge;
    setCurrentBill(parseFloat(total.toFixed(2)));
  }, []); // Run once on mount to sync initial state

  const handleUsageChange = (val: string) => {
      const kwh = Math.max(0, parseInt(val) || 0);
      setUsageKwh(kwh);
      
      // Update Bill
      const energy = kwh * tariffRate;
      const kwtbb = energy * kwtbbPct;
      const total = energy + kwtbb + fixedCharge;
      setCurrentBill(parseFloat(total.toFixed(2)));
  };

  const handleBillChange = (val: string) => {
      const bill = Math.max(0, parseFloat(val) || 0);
      setCurrentBill(bill);

      if (bill > fixedCharge) {
          const effectiveRate = tariffRate * (1 + kwtbbPct);
          const kwh = (bill - fixedCharge) / effectiveRate;
          setUsageKwh(Math.round(kwh));
      } else {
          setUsageKwh(0);
      }
  };

  // --- Calculation Logic (Core) ---
  const calculateMetrics = (pQty: number, bQty: number, tKwh: number) => {
    const solarSize = pQty * settings.panelRating;
    
    // Override Sun Hours to 3.5 for Resi-Calc as requested
    const RESI_SUN_HOURS = 3.5; 
    
    const exportRate = settings.exportRate || 0.20;

    // 1. Original Bill
    const energyCharge = tKwh * tariffRate;
    const kwtbbCharge = energyCharge * kwtbbPct;
    const originalGrandTotal = energyCharge + fixedCharge + kwtbbCharge;

    // 2. Solar Generation
    const monthlyGen = solarSize * RESI_SUN_HOURS * 30;

    // 3. Direct Consumption
    const loadDaytime = tKwh * (daytimePercent / 100);
    const directUse = Math.min(monthlyGen, loadDaytime);
    
    // 4. Excess Solar
    const excessSolar = Math.max(0, monthlyGen - directUse);

    // 5. Battery Logic
    // FIXED: Use settings capacity (default 16 kWh or user set) instead of hardcoded 5.0
    const kwhPerBatteryUnit = settings.battery?.capacityKwh ?? 16; 
    const battUsableRatio = settings.battery?.usableRatio || 0.9;
    const totalStorageCap = bQty * kwhPerBatteryUnit * battUsableRatio;
    const maxMonthlyStorage = totalStorageCap * 30; 
    
    const batteryIn = Math.min(excessSolar, maxMonthlyStorage);
    
    // Efficiency Factor: 90% Discharge Efficiency (Input -> Output loss)
    const dischargeEfficiency = 0.9;
    const availableBatteryEnergy = batteryIn * dischargeEfficiency;

    const loadNighttime = tKwh - loadDaytime;
    const batteryOut = Math.min(availableBatteryEnergy, loadNighttime); 

    // 6. Grid Export (NEM)
    const exportNem = Math.max(0, excessSolar - batteryIn);

    // 7. New Import
    const newImport = Math.max(0, tKwh - directUse - batteryOut);

    // 8. New Bill
    const newEnergyCharge = newImport * tariffRate;
    const newKwtbbCharge = newEnergyCharge * kwtbbPct;
    const exportCredit = exportNem * exportRate;
    
    const newBillRaw = (newEnergyCharge + fixedCharge + newKwtbbCharge) - exportCredit;
    const newGrandTotal = Math.max(fixedCharge, newBillRaw); // Minimum monthly charge

    const monthlySavings = originalGrandTotal - newGrandTotal;
    const savingsPct = (monthlySavings / originalGrandTotal) * 100;

    // 9. System price — GoodWe (Hybrid) + Ref Rates, same rules as commercial Recommender (CalculatorPage)
    const unitPrice = settings.battery?.pricePerUnit ?? 8200;
    const batteryCostCash = bQty * unitPrice;
    const batteryCostCC = bQty * Math.round(unitPrice * 1.093);

    let oneTimeFees = 0;
    if (settings.otherCosts && solarSize < settings.otherCosts.gitaFeeThreshold) {
      oneTimeFees += settings.otherCosts.gitaFee;
    }

    let priceCash = 0;
    let priceCc = 0;

    if (goodWeBrand?.id === 'goodwe' && goodWeBrand.pricingTiers?.length) {
      const tier =
        goodWeBrand.pricingTiers.find((t) => solarSize >= t.minKw && solarSize < t.maxKw) ??
        goodWeBrand.pricingTiers[goodWeBrand.pricingTiers.length - 1];

      if (tier.useSmartLogic && settings.referencePrices) {
        const panelCount = Math.round(pQty || solarSize / settings.panelRating);
        const ref = settings.referencePrices.find((r) => r.panels === panelCount);
        const basePrice = ref ? ref.price : tier.pricePerKw * solarSize;
        const baseCc = ref ? (ref.priceCC36 ?? ref.price * 1.093) : basePrice * 1.093;
        priceCash = basePrice + tier.baseFee;
        priceCc = baseCc + tier.baseFee;
      } else {
        priceCash = tier.pricePerKw * solarSize + tier.baseFee;
      }

      if (tier.deductionPerKw) {
        const ded = tier.deductionPerKw * solarSize;
        priceCash -= ded;
        if (tier.useSmartLogic && settings.referencePrices) {
          priceCc -= ded;
        }
      }

      if (!(tier.useSmartLogic && settings.referencePrices)) {
        priceCc = priceCash * 1.093;
      }
    } else {
      const ref = settings.referencePrices?.find((r) => r.panels === pQty);
      const fallbackBase = solarSize * 2500;
      const baseCash = ref ? ref.price : fallbackBase;
      const baseCc = ref ? (ref.priceCC36 ?? ref.price * 1.093) : fallbackBase * 1.093;
      priceCash = baseCash;
      priceCc = baseCc;
    }

    const totalPrice = priceCash + oneTimeFees + batteryCostCash;
    const installmentTotal = priceCc + oneTimeFees + batteryCostCC;

    const roi = monthlySavings > 0 ? (totalPrice / (monthlySavings * 12)) : 0;

    const isHighExport = exportNem > newImport;

    return { 
        monthlySavings, 
        savingsPct, 
        totalPrice, // Cash Price
        installmentTotal, // CC Price
        roi, 
        kwp: solarSize, 
        monthlyGen, 
        directUse,
        batteryIn,
        batteryOut,
        exportNem, 
        newImport,
        originalGrandTotal,
        newGrandTotal,
        isHighExport,
        loadDaytime,
        loadNighttime,
        energyCharge,
        retailCharge: fixedCharge,
        kwtbbCharge,
        newEnergyCharge,
        newKwtbbCharge,
        exportCredit
    };
  };

  const manualMetrics = useMemo(() => {
     return calculateMetrics(manualPanels, manualBattery, usageKwh);
  }, [manualPanels, manualBattery, usageKwh, daytimePercent, settings, goodWeBrand]);

  /**
   * Sizing formulas (View Auto-Recommendations):
   * Plan1 Daytime: panels = (consumption/30 × daytime%) ÷ panelRating ÷ 3.4, 0 battery
   * Plan2 BESS: panels = (consumption/30 × daytime% + min(51.48, consumption/30 × (100%−daytime%))) ÷ panelRating ÷ 3.4
   *   batteries = round(min(night cap, nightly kWh) ÷ usable kWh per unit); usable = capacity × usableRatio
   */
  const FORMULA_SUN_HOURS = 3.4;
  /** Max night-load term (kWh/day): 4 batteries × 16 kWh × 90% usable */
  const BESS_NIGHT_CAP_KWH = 57.6;

  const formulaBasedPlans = useMemo(() => {
    const dailyKwh = usageKwh / 30;
    const d = daytimePercent / 100;
    const panelRating = settings.panelRating || 0.64;
    const usablePerBattery =
      (settings.battery?.capacityKwh ?? 16) * (settings.battery?.usableRatio ?? 0.9);
    const nightKwh = dailyKwh * (1 - d);
    const nightCapped = Math.min(BESS_NIGHT_CAP_KWH, nightKwh);

    const p1Raw = (dailyKwh * d) / panelRating / FORMULA_SUN_HOURS;
    const p2Raw = (dailyKwh * d + nightCapped) / panelRating / FORMULA_SUN_HOURS;
    const battRaw = nightCapped / usablePerBattery;

    const clampPanels = (n: number) => {
      const r = Math.max(1, Math.round(n));
      if (!Number.isFinite(formulaPanelCap)) return r;
      return Math.min(formulaPanelCap, r);
    };
    const maxBatt = settings.battery?.maxCount ?? 4;
    const batteries = Math.min(maxBatt, Math.max(0, Math.round(battRaw)));

    return {
      daytime: {
        id: 'formula-daytime',
        label: 'Daytime Coverage',
        panels: clampPanels(p1Raw),
        batteryQty: 0,
      },
      bess: {
        id: 'formula-bess',
        label: 'BESS Coverage',
        panels: clampPanels(p2Raw),
        batteryQty: batteries,
      },
    };
  }, [usageKwh, daytimePercent, settings.panelRating, settings.battery, formulaPanelCap]);

  const selectedPlansForWA = useMemo(() => {
    const plans = [];

    if (selectedFormulaDaytime) {
      const c = formulaBasedPlans.daytime;
      const m = calculateMetrics(c.panels, c.batteryQty, usageKwh);
      plans.push({
        ...c,
        isSelected: true,
        minSavings: 0,
        maxSavings: 0,
        colorClass: 'border-teal-500 bg-teal-50/50',
        badge: 'Plan 1',
        isFormulaPreset: true,
        ...m,
      });
    }
    if (selectedFormulaBess) {
      const c = formulaBasedPlans.bess;
      const m = calculateMetrics(c.panels, c.batteryQty, usageKwh);
      plans.push({
        ...c,
        isSelected: true,
        minSavings: 0,
        maxSavings: 0,
        colorClass: 'border-fuchsia-500 bg-fuchsia-50/50',
        badge: 'Plan 2',
        isFormulaPreset: true,
        ...m,
      });
    }
    if (plans.length === 0) {
      plans.push({
        id: 'manual',
        label: 'Custom Configuration',
        panels: manualPanels,
        batteryQty: manualBattery,
        isSelected: true,
        minSavings: 0,
        maxSavings: 0,
        colorClass: '',
        badge: 'Manual',
        ...manualMetrics,
      });
    }
    return plans;
  }, [
    usageKwh,
    daytimePercent,
    manualMetrics,
    manualPanels,
    manualBattery,
    selectedFormulaDaytime,
    selectedFormulaBess,
    formulaBasedPlans,
  ]);

  const handleDownloadImage = async () => {
      if (!proposalRef.current) return;

      try {
          const el = proposalRef.current;
          const canvas = await html2canvas(el, {
              scale: 2,
              backgroundColor: '#ffffff',
              useCORS: true,
              scrollX: 0,
              scrollY: 0,
              width: el.scrollWidth,
              height: el.scrollHeight,
              windowWidth: el.scrollWidth,
              windowHeight: el.scrollHeight,
          });
          const image = canvas.toDataURL('image/jpeg', 0.9);
          const link = document.createElement('a');
          link.href = image;
          link.download = `SolarProposal_${new Date().toISOString().slice(0,10)}.jpg`;
          link.click();
      } catch (error) {
          console.error("Image generation failed:", error);
          alert("Could not generate image.");
      }
  };

  const renderDetailBreakdown = (metrics: any) => (
      <div className="bg-slate-50 rounded-xl p-4 text-[11px] sm:text-xs space-y-6">
          
          {/* Energy Balance Table */}
          <div>
              <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Activity size={14} className="text-blue-500" /> Energy Flow Balance
              </h4>
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                          <th className="pb-2 pl-2">Description</th>
                          <th className="pb-2 text-right pr-2">Energy (kWh)</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                      <tr><td className="py-1.5 pl-2 font-medium">Total Consumption</td><td className="py-1.5 text-right pr-2 font-bold">{usageKwh}</td></tr>
                      <tr><td className="py-1.5 pl-4 text-slate-500">• Daytime Load ({daytimePercent}%)</td><td className="py-1.5 text-right pr-2 text-slate-500">{metrics.loadDaytime.toFixed(0)}</td></tr>
                      <tr><td className="py-1.5 pl-4 text-slate-500">• Nighttime Load</td><td className="py-1.5 text-right pr-2 text-slate-500">{metrics.loadNighttime.toFixed(0)}</td></tr>
                      
                      <tr className="bg-amber-50 text-amber-900 font-bold border-t border-amber-100">
                          <td className="py-1.5 pl-2">Solar Generation</td><td className="py-1.5 text-right pr-2 text-amber-700">{metrics.monthlyGen.toFixed(0)}</td>
                      </tr>
                      
                      <tr><td className="py-1.5 pl-2 text-blue-600 font-bold">Direct Use (Solar)</td><td className="py-1.5 text-right pr-2 font-bold text-blue-600">{metrics.directUse.toFixed(0)}</td></tr>
                      
                      {metrics.batteryIn > 0 && (
                          <>
                          <tr><td className="py-1.5 pl-2">Battery Charge (In)</td><td className="py-1.5 text-right pr-2">{metrics.batteryIn.toFixed(1)}</td></tr>
                          <tr><td className="py-1.5 pl-2 text-emerald-600 font-bold">Battery Discharge (Out) <span className="text-[9px] font-normal text-emerald-500 block leading-none">90% Efficiency</span></td><td className="py-1.5 text-right pr-2 font-bold text-emerald-600">{metrics.batteryOut.toFixed(1)}</td></tr>
                          </>
                      )}
                      
                      <tr><td className="py-1.5 pl-2 text-amber-600">Export to Grid</td><td className="py-1.5 text-right pr-2 text-amber-600 font-semibold">{metrics.exportNem.toFixed(0)}</td></tr>
                      <tr className="border-t border-slate-300 font-black text-slate-800 bg-slate-100">
                          <td className="py-2 pl-2">New Grid Import</td><td className="py-2 text-right pr-2">{metrics.newImport.toFixed(0)}</td>
                      </tr>
                  </tbody>
              </table>
          </div>

          {/* Financial Breakdown */}
          <div className="grid grid-cols-2 gap-3">
              {/* Old Bill */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <p className="font-black text-slate-700 mb-2 border-b pb-1.5 flex justify-between items-center">
                      Current Bill <span className="text-slate-400 font-normal text-[10px]">MYR</span>
                  </p>
                  <div className="space-y-1.5">
                      <div className="flex justify-between"><span>Energy Chg</span><span className="font-medium">{metrics.energyCharge.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
                      <div className="flex justify-between"><span>Retail Chg</span><span className="font-medium">{metrics.retailCharge.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
                      <div className="flex justify-between"><span>KWTBB</span><span className="font-medium">{metrics.kwtbbCharge.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
                      <div className="flex justify-between font-black border-t pt-1.5 mt-1 text-slate-800 text-sm">
                          <span>Total</span><span>{metrics.originalGrandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                      </div>
                  </div>
              </div>
              {/* New Bill */}
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 shadow-sm text-emerald-900">
                  <p className="font-black mb-2 border-b border-emerald-200 pb-1.5 flex justify-between items-center">
                      New Bill <span className="text-emerald-600 font-normal text-[10px]">MYR</span>
                  </p>
                  <div className="space-y-1.5">
                      <div className="flex justify-between"><span>Import Cost</span><span className="font-medium">{metrics.newEnergyCharge.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
                      <div className="flex justify-between"><span>Retail Chg</span><span className="font-medium">{metrics.retailCharge.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
                      <div className="flex justify-between"><span>KWTBB</span><span className="font-medium">{metrics.newKwtbbCharge.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
                      <div className="flex justify-between text-amber-700 font-bold bg-amber-50/50 px-1 -mx-1 rounded">
                          <span>Export Credit</span><span>-{metrics.exportCredit.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                      </div>
                      <div className="flex justify-between font-black border-t border-emerald-200 pt-1.5 mt-1 text-lg">
                          <span>Total</span><span>{metrics.newGrandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-fade-in-up pb-24">
      
      {/* --- INPUT SECTION --- */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                   <Lightbulb className="text-amber-500 fill-amber-500" /> 
                   Resi-Style Calculator
                </h1>
                <p className="text-slate-500 font-medium text-sm mt-1">
                  Commercial · residential-style usage model. System price uses{' '}
                  <span className="font-semibold text-slate-700">GoodWe (Hybrid)</span> tier rules and{' '}
                  <span className="font-semibold text-slate-700">Ref Rates</span> (residential three-phase with-battery tier), same as the main Recommender.
                </p>
            </div>
            
             <div className="flex items-center gap-2 text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-lg text-slate-500">
                <RefreshCw size={12} /> Sync Active
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Bill Input */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Receipt size={14} /> Current Bill (RM)
                </label>
                <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400 pointer-events-none">RM</span>
                    <input 
                        type="number" 
                        value={currentBill || ''}
                        onChange={(e) => handleBillChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-5 py-4 text-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all group-hover:bg-slate-100"
                        placeholder="0"
                    />
                </div>
            </div>

            {/* Usage Input */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Zap size={14} /> Consumption
                </label>
                <div className="relative group">
                    <input 
                        type="number" 
                        value={usageKwh || ''}
                        onChange={(e) => handleUsageChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all group-hover:bg-slate-100"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">kWh</span>
                </div>
            </div>

            {/* Roof Limit — empty = unknown (unlimited for recommendations) */}
             <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <PanelTop size={14} /> Roof Limit
                </label>
                <div className="relative group">
                    <input 
                        type="number" 
                        min={0}
                        value={roofLimit === null ? '' : roofLimit}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '') {
                            setRoofLimit(null);
                            return;
                          }
                          const n = parseInt(v, 10);
                          if (!Number.isNaN(n)) setRoofLimit(Math.max(0, n));
                        }}
                        placeholder="Unknown"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all group-hover:bg-slate-100 placeholder:text-slate-300 placeholder:font-semibold"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">Pcs</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Leave empty if unknown — formula panel counts are not capped by roof (unlimited). Enter a number to cap recommendations to that many panels.
                </p>
            </div>

            {/* Daytime Percentage */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={14} /> Daytime Usage %
                </label>
                <div className="relative group">
                    <input 
                        type="number" 
                        min="0" max="100"
                        value={daytimePercent}
                        onChange={(e) => setDaytimePercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all group-hover:bg-slate-100"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">%</span>
                </div>
                <input 
                    type="range" 
                    min="0" max="100" 
                    value={daytimePercent} 
                    onChange={(e) => setDaytimePercent(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
            </div>
        </div>
      </div>

      {/* --- MANUAL CALCULATOR SECTION --- */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Sliders size={20} className="text-indigo-500" />
                    Configure System
                </h2>
                <p className="text-slate-500 text-xs mt-1">Adjust panels and battery to see impact.</p>
             </div>
             {/* Reset Button */}
             <button 
                onClick={() => { setManualPanels(10); setManualBattery(0); }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
             >
                <RotateCcw size={14}/> Reset
             </button>
         </div>
         
         <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* Manual Inputs */}
             <div className="lg:col-span-4 space-y-6">
                 {/* Panels */}
                 <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                     <div className="flex justify-between items-center">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Solar Panels</label>
                         <div className="flex items-center gap-1">
                             <button onClick={() => setManualPanels(Math.max(0, manualPanels - 1))} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><Minus size={16} className="text-slate-400"/></button>
                             <button onClick={() => setManualPanels(manualPanels + 1)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><Plus size={16} className="text-slate-400"/></button>
                         </div>
                     </div>
                     <div className="flex items-end gap-2">
                         <input 
                            type="number" 
                            className="w-full text-4xl font-black text-slate-800 bg-transparent outline-none border-b-2 border-slate-100 focus:border-indigo-500 transition-colors"
                            value={manualPanels}
                            onChange={(e) => setManualPanels(Math.max(0, parseInt(e.target.value) || 0))}
                         />
                         <span className="text-sm font-bold text-slate-400 mb-2">pcs</span>
                     </div>
                     <p className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-lg inline-block">
                         {manualMetrics.kwp.toFixed(2)} kWp Capacity
                     </p>
                 </div>

                 {/* Batteries */}
                 <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                     <div className="flex justify-between items-center">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batteries</label>
                         <div className="flex items-center gap-1">
                             <button onClick={() => setManualBattery(Math.max(0, manualBattery - 1))} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><Minus size={16} className="text-slate-400"/></button>
                             <button onClick={() => setManualBattery(manualBattery + 1)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors"><Plus size={16} className="text-slate-400"/></button>
                         </div>
                     </div>
                     <div className="flex items-end gap-2">
                         <input 
                            type="number" 
                            className="w-full text-4xl font-black text-slate-800 bg-transparent outline-none border-b-2 border-slate-100 focus:border-emerald-500 transition-colors"
                            value={manualBattery}
                            onChange={(e) => setManualBattery(Math.max(0, parseInt(e.target.value) || 0))}
                         />
                         <span className="text-sm font-bold text-slate-400 mb-2">units</span>
                     </div>
                      <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                         {(manualBattery * (settings.battery?.capacityKwh ?? 16)).toFixed(1)} kWh Storage
                     </p>
                 </div>
             </div>

             {/* Manual Results */}
             <div className="lg:col-span-8">
                 <div className="bg-slate-900 rounded-[2rem] p-8 text-white h-full relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-slate-900/10">
                    
                    {/* Background Decor */}
                    <div className="absolute -right-20 -top-20 text-white opacity-[0.03] rotate-12 pointer-events-none">
                        <TrendingUp size={300} strokeWidth={1.5} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10 mb-8">
                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Est. Monthly Savings</p>
                             <h3 className="text-4xl font-black text-emerald-400 tracking-tight">RM {manualMetrics.monthlySavings.toLocaleString(undefined, {maximumFractionDigits:0})}</h3>
                             <p className="text-sm text-slate-400 mt-1 font-medium">{manualMetrics.savingsPct.toFixed(0)}% Bill Reduction</p>
                         </div>
                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cash Price</p>
                             <h3 className="text-4xl font-black text-white tracking-tight">RM {manualMetrics.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                             <p className="text-sm text-slate-400 mt-1 font-medium">{manualMetrics.roi.toFixed(1)} Years ROI</p>
                         </div>
                    </div>
                    
                    {/* New Bill Preview */}
                    <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10 relative z-10">
                         <div className="flex justify-between items-center mb-4">
                             <span className="text-xs font-bold text-slate-300 uppercase">Monthly Bill Projection</span>
                             {manualMetrics.newGrandTotal <= 25 && <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Min. Charge</span>}
                         </div>
                         <div className="flex items-center gap-4 text-sm mb-4">
                             <div className="flex-1">
                                 <p className="text-slate-400 text-xs mb-1">Current</p>
                                 <p className="text-xl font-bold text-slate-300 line-through decoration-red-500/50">RM {manualMetrics.originalGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                             </div>
                             <ArrowRight size={20} className="text-slate-500" />
                             <div className="flex-1 text-right">
                                 <p className="text-emerald-400 text-xs mb-1 font-bold">New Estimate</p>
                                 <p className="text-3xl font-black text-white">RM {manualMetrics.newGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                             </div>
                         </div>
                         
                         {/* Mini Breakdown */}
                         <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-white/10 pt-4 text-slate-400">
                             <div className="text-center">
                                 <span className="block font-bold text-white text-xs">{manualMetrics.monthlyGen.toFixed(0)}</span>
                                 <span>Gen (kWh)</span>
                             </div>
                              <div className="text-center">
                                 <span className="block font-bold text-blue-300 text-xs">{manualMetrics.directUse.toFixed(0)}</span>
                                 <span>Direct Use</span>
                             </div>
                              <div className="text-center">
                                 <span className="block font-bold text-amber-300 text-xs">{manualMetrics.exportNem.toFixed(0)}</span>
                                 <span>Export</span>
                             </div>
                         </div>
                    </div>

                    {/* Export Warning */}
                    {manualMetrics.isHighExport && (
                         <div className="absolute top-0 left-0 w-full bg-amber-500 text-amber-950 font-bold text-xs px-6 py-2 flex items-center justify-center gap-2 z-20 shadow-md">
                             <AlertTriangle size={14} />
                             Warning: Generation exceeds consumption. System may be oversized.
                         </div>
                    )}

                 </div>
             </div>
         </div>
      </div>

      {/* --- FORMULA PLANS (always visible) --- */}
      <div className="border-t border-slate-200 mt-8 pt-8 space-y-10 animate-fade-in-up">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Formula-based plans</h3>
              <p className="text-sm text-slate-500 mt-1">
                Plan 1 and 2 use your monthly kWh, daytime %, panel rating {settings.panelRating} kWp/pc, {FORMULA_SUN_HOURS} h sun, roof cap{' '}
                {roofLimit != null && roofLimit > 0 ? `${roofLimit} pcs` : 'unlimited'}; BESS uses{' '}
                {((settings.battery?.capacityKwh ?? 16) * (settings.battery?.usableRatio ?? 0.9)).toFixed(2)} kWh per battery.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  key: 'daytime' as const,
                  config: {
                    ...formulaBasedPlans.daytime,
                    badge: 'Plan 1',
                    colorClass: 'border-teal-500 bg-teal-50/50',
                    isFormulaPreset: true,
                  },
                  selected: selectedFormulaDaytime,
                  setSelected: setSelectedFormulaDaytime,
                },
                {
                  key: 'bess' as const,
                  config: {
                    ...formulaBasedPlans.bess,
                    badge: 'Plan 2',
                    colorClass: 'border-fuchsia-500 bg-fuchsia-50/50',
                    isFormulaPreset: true,
                  },
                  selected: selectedFormulaBess,
                  setSelected: setSelectedFormulaBess,
                },
              ].map(({ key, config, selected, setSelected }) => {
                const metrics = calculateMetrics(config.panels, config.batteryQty, usageKwh);
                const isExpanded = expandedCardId === `formula-${key}`;
                return (
                  <div
                    key={key}
                    className={`relative rounded-[2rem] border-2 transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
                      selected
                        ? `${config.colorClass} shadow-lg scale-[1.01] z-10`
                        : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm opacity-90 hover:opacity-100'
                    }`}
                  >
                    <div className="p-6 pb-2">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-2 inline-block ${
                              selected ? 'bg-white/40 text-slate-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {config.badge}
                          </span>
                          <h3 className="text-xl font-extrabold text-slate-800 leading-none">{config.label}</h3>
                          <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                            {key === 'daytime'
                              ? 'Panels = (monthly kWh ÷ 30 × daytime %) ÷ panel kWp ÷ sun hours. No battery.'
                              : 'Panels include daytime load + capped night load. Batteries sized from capped night kWh ÷ usable kWh per unit.'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelected(!selected)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            selected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {selected ? <CheckCircle2 size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}
                        </button>
                      </div>

                      <div className="flex gap-2 mb-6">
                        <div
                          className={`flex-1 flex items-center justify-between p-2 rounded-xl border ${
                            selected ? 'bg-white/40 border-white/20' : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Panels</span>
                            <span className="text-sm font-black text-slate-800 leading-tight">{config.panels}</span>
                          </div>
                        </div>
                        <div
                          className={`flex-1 flex items-center justify-between p-2 rounded-xl border ${
                            selected ? 'bg-white/40 border-white/20' : 'bg-slate-50 border-slate-100'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Battery</span>
                            <span className="text-sm font-black text-slate-800 leading-tight">{config.batteryQty}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-50 rounded-lg p-2 px-3 border border-slate-100">
                          <span className="text-xs font-bold text-slate-500 uppercase">System Price</span>
                          <span className="text-lg font-black text-slate-800">
                            RM {metrics.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase">Monthly Savings</span>
                          <span className="text-2xl font-black text-slate-800 tracking-tight">
                            RM {metrics.monthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, metrics.savingsPct)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-emerald-600">{metrics.savingsPct.toFixed(0)}% Reduction</span>
                          <span className="text-amber-600">{metrics.roi.toFixed(1)} Yrs ROI</span>
                        </div>
                      </div>
                    </div>

                    <div className={`border-t ${selected ? 'border-black/5' : 'border-slate-100'} bg-white/30`}>
                      <button
                        type="button"
                        onClick={() => setExpandedCardId(isExpanded ? null : `formula-${key}`)}
                        className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
                      >
                        {isExpanded ? 'Hide Breakdown' : 'View Details'}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 animate-fade-in-up">{renderDetailBreakdown(metrics)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-8 py-4 rounded-[2.5rem] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl animate-fade-in-up">
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Plans</span>
             <span className="text-xl font-black text-emerald-400">{selectedPlansForWA.length} Options</span>
          </div>
          <button 
             onClick={() => setIsWAModalOpen(true)}
             className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95"
          >
             <Share2 size={20} />
             Generate Proposal
          </button>
      </div>

      {/* Comparison Modal */}
      {isWAModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
                  
                  {/* Header */}
                  <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                          <Share2 size={24} className="text-emerald-400" />
                          <div>
                              <h3 className="text-xl font-black tracking-tight">Proposal Preview</h3>
                              <p className="text-slate-400 text-xs font-medium">Selected {selectedPlansForWA.length} configurations</p>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                          {/* Language Toggle */}
                          <div className="flex bg-slate-800 rounded-lg p-1">
                             <button 
                                onClick={() => setProposalLang('zh')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${proposalLang === 'zh' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
                             >
                                中文
                             </button>
                             <button 
                                onClick={() => setProposalLang('en')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${proposalLang === 'en' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
                             >
                                English
                             </button>
                          </div>

                          <button onClick={() => setIsWAModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                              <ChevronDown size={28} className="rotate-180" />
                          </button>
                      </div>
                  </div>

                  <div className="p-8 bg-slate-50 overflow-y-auto grow custom-scrollbar">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                        
                        {/* LEFT: Text Preview */}
                        <div className="space-y-4">
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                               <Copy size={12}/> Message Text
                           </h4>
                           <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-700 leading-relaxed max-h-[500px] overflow-y-auto font-medium">
                              {/* CUSTOM PROPOSAL LOGIC */}
                              {(() => {
                                  // Phase Info Logic
                                  const meterType = "Three Phase";
                                  const roofText =
                                    roofLimit != null && roofLimit > 0
                                      ? `${roofLimit} ${proposalLang === 'zh' ? '片' : 'pcs'}`
                                      : proposalLang === 'zh'
                                        ? '待确认'
                                        : 'TBC';
                                  
                                  const introZh = `⚡*根据您的用电资料：*

- *每月电费*：RM${currentBill.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
- *每月用电量*：约${usageKwh.toLocaleString()} kWh
- *假设白天用电比例*：${daytimePercent}%
- *电表类型*：${meterType}
- *屋顶可容纳电板数量*：${roofText}

我们依照您的用电量准备了多种方案，提供不同预算、节省幅度与回本期。最终方案将在确认屋顶可容纳片数后确定 😁`;

                                  const introEn = `⚡*Based on your Electricity Usage:*

- *Monthly Bill*: RM${currentBill.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
- *Monthly Consumption*: ~${usageKwh.toLocaleString()} kWh
- *Daytime Usage %*: ${daytimePercent}%
- *Meter Type*: ${meterType}
- *Roof Capacity*: ${roofText}

We have prepared multiple plans based on your usage, offering different budgets, savings, and ROI. Final proposal subject to site visit. 😁`;

                                  const plansText = selectedPlansForWA.map((p, i) => {
                                      const cashPrice = p.totalPrice;
                                      const installmentTotal = p.installmentTotal;
                                      const monthlyInstallment = installmentTotal / 36;
                                      
                                      // --- Language Switching for Plans ---
                                      if (proposalLang === 'zh') {
                                          const batteryText = p.batteryQty > 0 ? `+ *${p.batteryQty}粒电池*` : '*（无电池）*';
                                          return `\n--------------------\n\n☀ *方案${i + 1}：节省${p.savingsPct.toFixed(1)}%*\n\n*系统配置*：${p.panels}片 *${p.kwp.toFixed(2)} kWp* ${batteryText}\n\n📌 *每月预计节省*：约 *RM${p.monthlySavings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n📌 *每年预计节省*：约 *RM${(p.monthlySavings * 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n💰 *系统现金价*：*RM${cashPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}*\n🎉 *0%分期总额*：*RM${installmentTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}* （36个月，*每月供期*：*RM${monthlyInstallment.toLocaleString(undefined, {maximumFractionDigits: 0})}*）\n📌 *预计回本期*：*${p.roi.toFixed(2)} 年*`;
                                      } else {
                                          const batteryText = p.batteryQty > 0 ? `+ *${p.batteryQty} Batteries*` : '*(No Battery)*';
                                          return `\n--------------------\n\n☀ *Option ${i + 1}: Save ${p.savingsPct.toFixed(1)}%*\n\n*System Config*: ${p.panels} pcs *${p.kwp.toFixed(2)} kWp* ${batteryText}\n\n📌 *Est. Monthly Savings*: ~ *RM${p.monthlySavings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n📌 *Est. Annual Savings*: ~ *RM${(p.monthlySavings * 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n💰 *System Cash Price*: *RM${cashPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}*\n🎉 *0% Installment Total*: *RM${installmentTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}* (36 Months, *Monthly*: *RM${monthlyInstallment.toLocaleString(undefined, {maximumFractionDigits: 0})}*)\n📌 *Est. ROI*: *${p.roi.toFixed(2)} Years*`;
                                      }
                                  }).join('');

                                  return (proposalLang === 'zh' ? introZh : introEn) + plansText;
                              })()}
                           </div>
                           <button 
                                onClick={() => {
                                   // Re-generate text logic locally for clipboard (duplication needed for clean event handler)
                                   // ... (Use same logic as above)
                                   const meterType = "Three Phase";
                                   const roofText =
                                    roofLimit != null && roofLimit > 0
                                      ? `${roofLimit} ${proposalLang === 'zh' ? '片' : 'pcs'}`
                                      : proposalLang === 'zh'
                                        ? '待确认'
                                        : 'TBC';
                                   
                                   const intro = proposalLang === 'zh' 
                                        ? `⚡*根据您的用电资料：*\n\n- *每月电费*：RM${currentBill.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n- *每月用电量*：约${usageKwh.toLocaleString()} kWh\n- *假设白天用电比例*：${daytimePercent}%\n- *电表类型*：${meterType}\n- *屋顶可容纳电板数量*：${roofText}\n\n我们依照您的用电量准备了多种方案，提供不同预算、节省幅度与回本期。最终方案将在确认屋顶可容纳片数后确定 😁`
                                        : `⚡*Based on your Electricity Usage:*\n\n- *Monthly Bill*: RM${currentBill.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n- *Monthly Consumption*: ~${usageKwh.toLocaleString()} kWh\n- *Daytime Usage %*: ${daytimePercent}%\n- *Meter Type*: ${meterType}\n- *Roof Capacity*: ${roofText}\n\nWe have prepared multiple plans based on your usage, offering different budgets, savings, and ROI. Final proposal subject to site visit. 😁`;

                                   const plansText = selectedPlansForWA.map((p, i) => {
                                        const cashPrice = p.totalPrice;
                                        const installmentTotal = p.installmentTotal;
                                        const monthlyInstallment = installmentTotal / 36;
                                        
                                        if (proposalLang === 'zh') {
                                            const batteryText = p.batteryQty > 0 ? `+ *${p.batteryQty}粒电池*` : '*（无电池）*';
                                            return `\n--------------------\n\n☀ *方案${i + 1}：节省${p.savingsPct.toFixed(1)}%*\n\n*系统配置*：${p.panels}片 *${p.kwp.toFixed(2)} kWp* ${batteryText}\n\n📌 *每月预计节省*：约 *RM${p.monthlySavings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n📌 *每年预计节省*：约 *RM${(p.monthlySavings * 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n💰 *系统现金价*：*RM${cashPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}*\n🎉 *0%分期总额*：*RM${installmentTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}* （36个月，*每月供期*：*RM${monthlyInstallment.toLocaleString(undefined, {maximumFractionDigits: 0})}*）\n📌 *预计回本期*：*${p.roi.toFixed(2)} 年*`;
                                        } else {
                                            const batteryText = p.batteryQty > 0 ? `+ *${p.batteryQty} Batteries*` : '*(No Battery)*';
                                            return `\n--------------------\n\n☀ *Option ${i + 1}: Save ${p.savingsPct.toFixed(1)}%*\n\n*System Config*: ${p.panels} pcs *${p.kwp.toFixed(2)} kWp* ${batteryText}\n\n📌 *Est. Monthly Savings*: ~ *RM${p.monthlySavings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n📌 *Est. Annual Savings*: ~ *RM${(p.monthlySavings * 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n💰 *System Cash Price*: *RM${cashPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}*\n🎉 *0% Installment Total*: *RM${installmentTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}* (36 Months, *Monthly*: *RM${monthlyInstallment.toLocaleString(undefined, {maximumFractionDigits: 0})}*)\n📌 *Est. ROI*: *${p.roi.toFixed(2)} Years*`;
                                        }
                                   }).join('');
                                   
                                   navigator.clipboard.writeText(intro + plansText);
                                   alert("Copied to clipboard!");
                                }}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-95 text-lg"
                              >
                                Copy Text
                           </button>
                        </div>

                        {/* RIGHT: Visual Comparison (HTML to Image) */}
                        <div className="space-y-4">
                           <div className="flex justify-between items-center">
                               <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                   <ImageIcon size={12}/> Comparison Image
                               </h4>
                               <button 
                                  onClick={handleDownloadImage}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                               >
                                   <Download size={14}/> Download JPEG
                               </button>
                           </div>
                           
                           {/* THE CAPTURE CONTAINER */}
                           <div className="overflow-x-auto rounded-[1rem] border border-slate-200 shadow-lg">
                               <div ref={proposalRef} className="bg-white min-w-[700px] pb-4">
                                   
                                   {/* Styled Header */}
                                   <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white p-6">
                                       <div className="flex items-center gap-3 mb-1">
                                           <Sun className="text-yellow-300" size={24} fill="currentColor" />
                                           <h2 className="text-2xl font-bold">Astern {proposalLang === 'zh' ? '住宅方案对比' : 'Solar Comparison'}</h2>
                                       </div>
                                       <div className="text-xs text-indigo-100 font-medium flex gap-3 opacity-90">
                                           <span>{proposalLang === 'zh' ? '三相电表' : 'Three Phase'}</span>
                                           <span>•</span>
                                           <span>{proposalLang === 'zh' ? '每月电费' : 'Bill'} RM {currentBill.toLocaleString()}</span>
                                           <span>•</span>
                                           <span>{proposalLang === 'zh' ? '用电量' : 'Usage'} {usageKwh.toLocaleString()} kWh</span>
                                           <span>•</span>
                                           <span>{proposalLang === 'zh' ? '屋顶限制' : 'Roof'}: {roofLimit != null && roofLimit > 0 ? roofLimit : proposalLang === 'zh' ? '待确认' : 'TBC'}</span>
                                       </div>
                                   </div>

                                   {/* Data Table */}
                                   <table className="w-full text-left border-collapse">
                                       <thead>
                                           <tr className="bg-indigo-50/50 text-indigo-900 border-b border-indigo-100">
                                               <th className="p-4 font-bold text-xs uppercase tracking-wider w-1/4">
                                                   {proposalLang === 'zh' ? '指标' : 'Metric'}
                                               </th>
                                               {selectedPlansForWA.map((p, i) => (
                                                   <th key={i} className="p-4 font-bold text-xs uppercase tracking-wider text-center text-indigo-700">
                                                       {proposalLang === 'zh' ? `方案 ${i+1}` : `Option ${i+1}`}
                                                   </th>
                                               ))}
                                           </tr>
                                       </thead>
                                       <tbody className="text-sm">
                                           {/* Row: Config */}
                                           <tr className="border-b border-slate-100">
                                               <td className="p-4 font-bold text-slate-600 bg-slate-50/30">
                                                   {proposalLang === 'zh' ? '系统配置' : 'System Config'}
                                               </td>
                                               {selectedPlansForWA.map((p, i) => (
                                                   <td key={i} className="p-4 text-center font-bold text-slate-800">
                                                       {p.panels} {proposalLang === 'zh' ? '片' : 'pcs'} <span className="text-slate-400 font-normal">({p.kwp.toFixed(2)} kWp)</span>
                                                   </td>
                                               ))}
                                           </tr>
                                           
                                           {/* Row: Battery */}
                                           <tr className="border-b border-slate-100">
                                               <td className="p-4 font-bold text-slate-600 bg-slate-50/30">
                                                   {proposalLang === 'zh' ? '电池' : 'Battery'}
                                               </td>
                                               {selectedPlansForWA.map((p, i) => (
                                                   <td key={i} className={`p-4 text-center font-bold ${p.batteryQty > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                                                       {p.batteryQty > 0 
                                                            ? (proposalLang === 'zh' ? `${p.batteryQty} 粒` : `${p.batteryQty} units`) 
                                                            : (proposalLang === 'zh' ? '无电池' : 'None')}
                                                   </td>
                                               ))}
                                           </tr>

                                           {/* Row: Monthly Savings */}
                                           <tr className="border-b border-slate-100 bg-emerald-50/10">
                                               <td className="p-4 font-bold text-slate-600 bg-slate-50/30">
                                                   {proposalLang === 'zh' ? '每月节省' : 'Est. Monthly Savings'}
                                               </td>
                                               {selectedPlansForWA.map((p, i) => (
                                                   <td key={i} className="p-4 text-center font-bold text-slate-800">
                                                       RM {p.monthlySavings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                   </td>
                                               ))}
                                           </tr>

                                           {/* Row: Savings % */}
                                           <tr className="border-b border-slate-100">
                                               <td className="p-4 font-bold text-slate-600 bg-slate-50/30">
                                                   {proposalLang === 'zh' ? '节省比例' : 'Bill Reduction'}
                                               </td>
                                               {selectedPlansForWA.map((p, i) => (
                                                   <td key={i} className="p-4 text-center font-bold text-emerald-600 text-lg">
                                                       {p.savingsPct.toFixed(1)}%
                                                   </td>
                                               ))}
                                           </tr>

                                           {/* Row: ROI */}
                                           <tr className="border-b border-slate-100">
                                               <td className="p-4 font-bold text-slate-600 bg-slate-50/30">
                                                   {proposalLang === 'zh' ? '回本期' : 'Est. ROI'}
                                               </td>
                                               {selectedPlansForWA.map((p, i) => (
                                                   <td key={i} className="p-4 text-center font-bold text-amber-600">
                                                       {p.roi.toFixed(2)} {proposalLang === 'zh' ? '年' : 'Years'}
                                                   </td>
                                               ))}
                                           </tr>

                                           {/* Row: Cash Price */}
                                           <tr className="border-b border-slate-100">
                                               <td className="p-4 font-bold text-slate-600 bg-slate-50/30">
                                                   {proposalLang === 'zh' ? '现金价 (Promo)' : 'System Price (Cash)'}
                                               </td>
                                               {selectedPlansForWA.map((p, i) => (
                                                   <td key={i} className="p-4 text-center font-bold text-slate-900">
                                                       RM {p.totalPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                                   </td>
                                               ))}
                                           </tr>

                                           {/* Row: Installment Total */}
                                           <tr className="border-b border-slate-100">
                                               <td className="p-4 font-bold text-slate-600 bg-slate-50/30">
                                                   {proposalLang === 'zh' ? '0%分期总额' : '0% Installment Total'}
                                               </td>
                                               {selectedPlansForWA.map((p, i) => {
                                                   return (
                                                   <td key={i} className="p-4 text-center font-bold text-slate-800">
                                                       RM {p.installmentTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                                   </td>
                                               )})}
                                           </tr>

                                           {/* Row: Installment Monthly */}
                                           <tr>
                                               <td className="p-4 font-bold text-slate-600 bg-slate-50/30">
                                                   {proposalLang === 'zh' ? '0%分期 (36个月)' : '0% Installment (36m)'}
                                               </td>
                                               {selectedPlansForWA.map((p, i) => {
                                                   const monthly = p.installmentTotal / 36;
                                                   return (
                                                   <td key={i} className="p-4 text-center font-bold text-slate-600 text-xs">
                                                       RM {monthly.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}/{proposalLang === 'zh' ? '月' : 'mo'}
                                                   </td>
                                               )})}
                                           </tr>
                                       </tbody>
                                   </table>
                               </div>
                           </div>
                        </div>

                     </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CommercialResiPage;