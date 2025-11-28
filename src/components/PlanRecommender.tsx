
import React, { useState, useEffect, useMemo } from 'react';
import { simulateSolar, getKwhFromBill, calculateSystemCost, calculateBill } from '../utils/billingEngine';
import { InputNumber } from './InputNumber';
import { InputSlider } from './InputSlider';
import { SYSTEM_PRICING, BATTERY_CAPACITY_KWH, PEAK_SUN_HOURS, PANEL_WATTAGE } from '../constants';
import { Zap, Sun, DollarSign, Home, Check, Battery, Info, BarChart3, PiggyBank, Target, PenTool, ShieldCheck, Compass, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, RefreshCw, MessageCircle, Copy, X } from 'lucide-react';
import { RecommendationResult } from '../types';

interface PlanRecommenderProps {
  initialUsage: number;
}

export const PlanRecommender: React.FC<PlanRecommenderProps> = ({ initialUsage }) => {
  // Inputs
  const [usageKwh, setUsageKwh] = useState<number | ''>(initialUsage);
  const [billAmount, setBillAmount] = useState<number | ''>(0);
  const [phase, setPhase] = useState<'single' | 'three'>('single');
  const [daytimePercent, setDaytimePercent] = useState<number>(30);
  const [roofMaxPanels, setRoofMaxPanels] = useState<number | ''>(''); // Default blank (no limit)
  const [isSyncing, setIsSyncing] = useState(false);
  const [gapWarning, setGapWarning] = useState<boolean>(false);

  // Manual Inputs
  const [manualPanels, setManualPanels] = useState<number | ''>('');
  const [manualBatteries, setManualBatteries] = useState<number | ''>('');

  // Selection State for Whatsapp
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);

  // Calculate tariff blind spot bounds
  const billGapLower = useMemo(() => calculateBill(1500).finalTotal, []);
  const billGapUpper = useMemo(() => calculateBill(1501).finalTotal, []);

  // Initialize bill amount from initial usage
  useEffect(() => {
    const val = typeof usageKwh === 'number' ? usageKwh : 0;
    const bill = calculateBill(val).finalTotal;
    setBillAmount(parseFloat(bill.toFixed(2)));
  }, []);

  // Sync Logic
  const handleUsageChange = (val: number | '') => {
    setUsageKwh(val);
    setGapWarning(false); // Clear warning on direct usage input
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

    // Check for tariff blind spot
    if (typeof val === 'number' && val > billGapLower && val < billGapUpper) {
      setGapWarning(true);
      // Auto-round usage up to 1501 to ensure valid calculations
      if (!isSyncing) {
        setUsageKwh(1501);
      }
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

  // Helper: Calculate Scenario
  const calculateScenario = (p: number, b: number): RecommendationResult | null => {
    const effectiveUsage = typeof usageKwh === 'number' ? usageKwh : 0;

    // If inside gap warning, use the upper bound bill for percentage calculation to avoid skewed data
    const effectiveBill = gapWarning
      ? billGapUpper
      : (typeof billAmount === 'number' ? billAmount : 0);

    const sim = simulateSolar(effectiveUsage, daytimePercent, p, b);
    const costs = calculateSystemCost(p, b);

    if (!costs) return null;

    let adjustedCash = costs.cash;
    let adjustedCC = costs.cc;
    let inverterLabel = costs.tier.inverterSize;

    // Three Phase Logic Adjustments
    if (phase === 'three') {
      if (p >= 6 && p <= 14) {
        adjustedCash += 3350;
        adjustedCC += 3350;
        inverterLabel = "10 kWac Three Phase";
      } else if (p >= 15 && p <= 22) {
        adjustedCash += 1600;
        adjustedCC += 1600;
        inverterLabel = "10 kWac Three Phase";
      }
      // For p >= 23, it's already Three Phase in constant DB, no adjustment needed.
    }

    const annualSavings = sim.monthlySavings * 12;
    // Avoid divide by zero
    const paybackCash = annualSavings > 0 ? adjustedCash / annualSavings : 999;
    const paybackCC = annualSavings > 0 ? adjustedCC / annualSavings : 999;

    // Calculate saved percentage
    const savedPct = effectiveBill > 0 ? (sim.monthlySavings / effectiveBill) * 100 : 0;

    // Calculate Battery Utilisation Rate
    const solarSurplus = sim.solarGenerationMonthly - sim.demandDay;
    const totalBatteryCapacityMonthly = b * BATTERY_CAPACITY_KWH * 30;
    const batUtil = totalBatteryCapacityMonthly > 0 ? (solarSurplus / totalBatteryCapacityMonthly) : 0;

    return {
      panels: p,
      batteries: b,
      systemCostCash: adjustedCash,
      systemCostCC: adjustedCC,
      monthlySavings: sim.monthlySavings,
      savedPercentage: savedPct,
      newBillAmount: sim.newBill.finalTotal,
      paybackYearsCash: paybackCash,
      paybackYearsCC: paybackCC,
      roiPercentage: (annualSavings / adjustedCash) * 100,
      generation: sim.solarGenerationMonthly,
      export: sim.newBill.exportUnits || 0,
      inverterSize: inverterLabel,
      newImportKwh: sim.gridImport,
      newExportKwh: sim.newBill.exportUnits || 0,
      batteryUtilization: batUtil
    };
  };

  // Optimization Algorithm
  const recommendations = useMemo(() => {
    const effectiveUsage = typeof usageKwh === 'number' ? usageKwh : 0;
    const userLimit = roofMaxPanels === '' ? 999 : roofMaxPanels;

    const results: RecommendationResult[] = [];
    const maxPanels = Math.min(
      userLimit,
      phase === 'single' ? 22 : 56,
      SYSTEM_PRICING[SYSTEM_PRICING.length - 1].panels
    );
    const minPanels = SYSTEM_PRICING[0].panels;

    for (let p = minPanels; p <= maxPanels; p++) {
      const maxBat = 20;
      for (let b = 0; b <= maxBat; b++) {
        const result = calculateScenario(p, b);
        if (!result) continue;

        // CONSTRAINT: Exclude if New Export > New Import
        const exportVal = result.export || 0;
        const sim = simulateSolar(effectiveUsage, daytimePercent, p, b);
        if (exportVal > sim.gridImport) {
          continue;
        }
        results.push(result);
      }
    }

    if (results.length === 0) return { lowestBreakeven: null, matchKwh: null, highOffset: null, maxSaving: null };

    // STRATEGIES
    const sortedByPayback = [...results].sort((a, b) => a.paybackYearsCash - b.paybackYearsCash);
    const lowestBreakeven = sortedByPayback[0];

    const kwPerPanel = PANEL_WATTAGE / 1000;
    const targetPanels = effectiveUsage / 30 / PEAK_SUN_HOURS / kwPerPanel;
    const nightUsageDaily = (effectiveUsage * (1 - daytimePercent / 100)) / 30;
    const targetBatteries = nightUsageDaily / BATTERY_CAPACITY_KWH;

    const sortedByMatch = [...results].sort((a, b) => {
      const distA = Math.abs(a.panels - targetPanels) + Math.abs(a.batteries - targetBatteries);
      const distB = Math.abs(b.panels - targetPanels) + Math.abs(b.batteries - targetBatteries);
      return distA - distB;
    });
    const matchKwh = sortedByMatch[0];

    const highOffsetCandidates = results.filter(r => r.savedPercentage >= 90 && r.savedPercentage <= 99);
    const sortedByCostHighOffset = [...highOffsetCandidates].sort((a, b) => a.systemCostCash - b.systemCostCash);
    const highOffset = sortedByCostHighOffset.length > 0 ? sortedByCostHighOffset[0] : null;

    const sortedBySavings = [...results].sort((a, b) => {
      const diff = b.monthlySavings - a.monthlySavings;
      if (Math.abs(diff) > 0.1) return diff;
      return a.systemCostCash - b.systemCostCash;
    });
    const maxSaving = sortedBySavings[0];

    return { lowestBreakeven, matchKwh, highOffset, maxSaving };

  }, [usageKwh, phase, daytimePercent, roofMaxPanels, billAmount, gapWarning]);


  // Manual Result Calculation
  const manualResult = useMemo(() => {
    if (typeof manualPanels !== 'number' || manualPanels < 6) return null;
    const b = typeof manualBatteries === 'number' ? manualBatteries : 0;
    return calculateScenario(manualPanels, b);
  }, [manualPanels, manualBatteries, usageKwh, phase, daytimePercent, billAmount, gapWarning]);


  // Whatsapp Generation Logic
  const handleTogglePlan = (planId: string) => {
    if (selectedPlans.includes(planId)) {
      setSelectedPlans(prev => prev.filter(id => id !== planId));
    } else {
      setSelectedPlans(prev => [...prev, planId]);
    }
  };

  const handleGenerateMessage = () => {
    const plansToInclude = [];

    if (selectedPlans.includes('lowestBreakeven') && recommendations.lowestBreakeven)
      plansToInclude.push({ title: "最短回本期方案", data: recommendations.lowestBreakeven });

    if (selectedPlans.includes('matchKwh') && recommendations.matchKwh) {
      const pct = Math.round(recommendations.matchKwh.savedPercentage);
      plansToInclude.push({ title: `电量匹配方案 (节省 ${pct}% 电费)`, data: recommendations.matchKwh });
    }

    if (selectedPlans.includes('highOffset') && recommendations.highOffset)
      plansToInclude.push({ title: "高效节省方案", data: recommendations.highOffset });

    if (selectedPlans.includes('maxSaving') && recommendations.maxSaving)
      plansToInclude.push({ title: "最高节省方案", data: recommendations.maxSaving });

    if (selectedPlans.includes('manual') && manualResult)
      plansToInclude.push({ title: "自定义方案", data: manualResult });

    if (plansToInclude.length === 0) return;

    // Bill rounding logic: Nearest multiple of 10
    const rawBill = typeof billAmount === 'number' ? billAmount : 0;
    const roundedBill = Math.round(rawBill / 10) * 10;

    let msg = `你好，根据您提供的用电资料：\n\n`;
    msg += `- 每月电费：约RM ${roundedBill}\n`;
    msg += `- 每月用电量：约 ${usageKwh} kWh\n`;
    msg += `- 假设白天用电比例：${daytimePercent}%\n`;
    msg += `- 电表：${phase === 'single' ? 'Single Phase' : 'Three Phase'}\n`;
    msg += `- 屋顶可容纳电板数量：${roofMaxPanels === '' ? '待确定' : roofMaxPanels}\n\n`;

    msg += `我们为您量身定制以下 ${plansToInclude.length} 种方案，以不同预算、节省效能、与回酬周期供您参考 😁\n\n`;

    plansToInclude.forEach((plan, index) => {
      const r = plan.data;
      const roundedMonthlySavings = Math.floor(r.monthlySavings / 10) * 10;
      const roundedAnnualSavings = roundedMonthlySavings * 12;
      const kwp = (r.panels * PANEL_WATTAGE / 1000).toFixed(2);

      const listPrice = r.systemCostCC + 2000 + (r.batteries * 1000);

      msg += `☀️ 方案${index + 1}：${plan.title}\n\n`;
      msg += `系统配置：${r.panels}片太阳能板 ${kwp} kWp + ${r.batteries}粒电池\n`;
      msg += `📌每月预计节省电费：约 RM${roundedMonthlySavings}+-\n`;
      msg += `📌每年预计节省电费：约 RM${roundedAnnualSavings}+-\n`;
      msg += `📌系统原价：RM${listPrice.toLocaleString()}\n`;
      msg += `🎉早鸟优惠价：RM${r.systemCostCC.toLocaleString()}（可零利息分期付款36个月）\n`;
      msg += `💰早鸟现金优惠价：RM${r.systemCostCash.toLocaleString()}\n`;
      msg += `📌预计回本期：${r.paybackYearsCash.toFixed(1)} - ${r.paybackYearsCC.toFixed(1)}年\n\n`;
      msg += `*\n`;
    });

    msg += `💼 【 配套包括 】\n\n`;
    msg += `✅ 终生太阳能 RM10,000保险\n`;
    msg += `✅ AI智能能源管理系统\n`;
    msg += `✅ 安装费 & 政府申请手续 全包\n`;
    msg += `✅ 10年 GoodWe 全球Tier 1逆变器保修\n`;
    msg += `✅ 10年 GoodWe 全球Tier 1电池保修\n`;
    msg += `✅ 15年 Trina Solar 全球Tier 1太阳能电板保修\n`;
    msg += `✅ 30年 电板发电效能保证\n`;
    msg += `✅ 1年 安装与人工保修`;

    setGeneratedMessage(msg);
  };

  const copyToClipboard = () => {
    if (generatedMessage) {
      navigator.clipboard.writeText(generatedMessage);
      // Optional: Visual feedback or toast could be added here
      alert("Message copied to clipboard!");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Home className="text-blue-600" size={24} />
          Your Profile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <p className="leading-relaxed opacity-90">Bill amounts between <strong>RM{billGapLower.toFixed(1)}</strong> and <strong>RM{billGapUpper.toFixed(1)}</strong> are impossible due to tariff tiers.</p>
                  <button onClick={fixBillAmount} className="mt-2 text-blue-600 font-bold hover:underline hover:text-blue-700 flex items-center gap-1 transition-colors">
                    Round up to RM{billGapUpper.toFixed(1)} <RefreshCw size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <InputNumber
            label="Avg. Monthly Usage"
            value={usageKwh}
            onChange={handleUsageChange}
            icon={<Zap size={16} />}
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
            {phase === 'single' && <span className="text-[10px] text-amber-600 mt-1">Max 22 Panels (8kWac)</span>}
          </div>

          <InputNumber
            label="Roof Capacity (Max Panels)"
            value={roofMaxPanels}
            onChange={setRoofMaxPanels}
            min={6}
            max={60}
            icon={<Home size={16} />}
            placeholder="Optional (Unlimited)"
            helperText="Leave blank for no limit"
          />
        </div>

        <div className="mt-6 flex items-center gap-2">
          <div className="flex-1">
            <InputSlider
              label="Daytime Usage %"
              value={daytimePercent}
              min={0} max={100} unit="%"
              onChange={setDaytimePercent}
              icon={<Sun size={16} />}
            />
          </div>
          <button
            onClick={() => setDaytimePercent(30)}
            className="mt-6 p-2 hover:bg-slate-100 rounded-lg transition-colors group"
            title="Reset to 30%"
          >
            <RefreshCw size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:rotate-180 transition-all duration-300" />
          </button>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {recommendations.lowestBreakeven && (
          <RecommendationCard
            id="lowestBreakeven"
            title="Lowest Breakeven"
            result={recommendations.lowestBreakeven}
            badge="Best ROI"
            badgeColor="bg-emerald-500"
            icon={<BarChart3 className="text-emerald-600" size={24} />}
            currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
            daytimePercent={daytimePercent}
            isSelected={selectedPlans.includes('lowestBreakeven')}
            onToggle={() => handleTogglePlan('lowestBreakeven')}
          />
        )}
        {recommendations.matchKwh && (
          <RecommendationCard
            id="matchKwh"
            title="Match the kWh"
            result={recommendations.matchKwh}
            badge="Balanced"
            badgeColor="bg-blue-600"
            icon={<Target className="text-blue-600" size={24} />}
            currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
            daytimePercent={daytimePercent}
            isSelected={selectedPlans.includes('matchKwh')}
            onToggle={() => handleTogglePlan('matchKwh')}
          />
        )}
        {recommendations.highOffset && (
          <RecommendationCard
            id="highOffset"
            title="90-99% Bill Saver"
            result={recommendations.highOffset}
            badge="Optimal Offset"
            badgeColor="bg-purple-600"
            icon={<ShieldCheck className="text-purple-600" size={24} />}
            currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
            daytimePercent={daytimePercent}
            isSelected={selectedPlans.includes('highOffset')}
            onToggle={() => handleTogglePlan('highOffset')}
          />
        )}
        {recommendations.maxSaving && (
          <RecommendationCard
            id="maxSaving"
            title="Maximum Saving"
            result={recommendations.maxSaving}
            badge="Power User"
            badgeColor="bg-amber-500"
            icon={<PiggyBank className="text-amber-600" size={24} />}
            currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
            daytimePercent={daytimePercent}
            isSelected={selectedPlans.includes('maxSaving')}
            onToggle={() => handleTogglePlan('maxSaving')}
          />
        )}
      </div>

      {!recommendations.lowestBreakeven && (
        <div className="text-center p-12 bg-slate-100 rounded-2xl border border-dashed border-slate-300">
          <p className="text-slate-500">No valid system configuration found based on your constraints.</p>
          <p className="text-sm text-slate-400">
            Try checking usage or allowing for a larger system.
            <br />
            Note: Systems where export exceeds import are excluded.
          </p>
        </div>
      )}

      {/* Manual Design Section */}
      <div className="mt-12 pt-8 border-t border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <PenTool className="text-slate-600" size={24} />
          Custom Manual Plan
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="space-y-4">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <p className="text-sm text-slate-500 mb-4">Manually specify a system size to see the financial breakdown.</p>
              <div className="space-y-4">
                <InputNumber
                  label="Solar Panels"
                  value={manualPanels}
                  onChange={setManualPanels}
                  min={6} max={60}
                  icon={<Sun size={16} />}
                  helperText="Min 6 panels"
                />
                <InputNumber
                  label="Batteries"
                  value={manualBatteries}
                  onChange={setManualBatteries}
                  min={0} max={20}
                  icon={<Battery size={16} />}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {manualResult ? (
              <RecommendationCard
                id="manual"
                title="Custom Configuration"
                result={manualResult}
                icon={<Check className="text-slate-600" size={24} />}
                currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
                daytimePercent={daytimePercent}
                isSelected={selectedPlans.includes('manual')}
                onToggle={() => handleTogglePlan('manual')}
              />
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400">
                <PenTool size={32} className="mb-2 opacity-50" />
                <p>Enter panel count (min 6) to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Bar for Whatsapp */}
      {selectedPlans.length > 0 && !generatedMessage && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center animate-in slide-in-from-bottom-6">
          <button
            onClick={handleGenerateMessage}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-full shadow-2xl flex items-center gap-3 transition-transform hover:scale-105"
          >
            <MessageCircle size={24} fill="white" className="text-white" />
            <span>Generate Whatsapp ({selectedPlans.length})</span>
          </button>
        </div>
      )}

      {/* Generated Message Modal */}
      {generatedMessage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MessageCircle className="text-green-600" size={20} />
                Generated Message
              </h3>
              <button onClick={() => setGeneratedMessage(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto bg-slate-50">
              <textarea
                className="w-full h-64 p-4 text-sm font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none leading-relaxed text-slate-700 shadow-inner"
                value={generatedMessage}
                readOnly
              />
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={copyToClipboard}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Copy size={18} />
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface RecommendationCardProps {
  id: string;
  title: string;
  result: RecommendationResult;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  currentBill: number;
  daytimePercent: number;
  isSelected?: boolean;
  onToggle?: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ id, title, result, badge, badgeColor, icon, currentBill, daytimePercent, isSelected, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to determine roof angle support
  const getRoofSpecs = (inverterStr: string) => {
    const lower = inverterStr.toLowerCase();
    if (lower.includes("5 kwac") || lower.includes("8 kwac")) return 2;
    if (lower.includes("10 kwac") || lower.includes("12 kwac")) return 3;
    if (lower.includes("15 kwac") || lower.includes("20 kwac")) return 4;
    return 2;
  };

  const roofAngles = getRoofSpecs(result.inverterSize);
  const kwp = (result.panels * PANEL_WATTAGE / 1000).toFixed(2);
  const batUtilPercent = Math.round(result.batteryUtilization * 100);

  // Generate Scenarios
  const scenarios = useMemo(() => {
    if (currentBill <= 0) return [];

    // Find nearest 100
    const anchor = Math.round(currentBill / 100) * 100;
    const billsToCheck = [];

    // 3 lower
    for (let i = 3; i >= 1; i--) {
      const val = anchor - (i * 100);
      if (val > 0) billsToCheck.push(val);
    }

    // Anchor (if positive)
    if (anchor > 0) billsToCheck.push(anchor);

    // 3 higher
    for (let i = 1; i <= 3; i++) {
      billsToCheck.push(anchor + (i * 100));
    }

    return billsToCheck.map(bill => {
      const kwh = getKwhFromBill(bill);
      const sim = simulateSolar(kwh, daytimePercent, result.panels, result.batteries);
      return {
        bill,
        newBill: sim.newBill.finalTotal,
        saved: sim.monthlySavings,
        pct: (sim.monthlySavings / bill) * 100
      };
    });
  }, [currentBill, result.panels, result.batteries, daytimePercent]);

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border overflow-hidden flex flex-col h-full transition-all group relative ${isSelected ? 'border-green-500 ring-2 ring-green-500 ring-opacity-50' : 'border-slate-100 hover:ring-2 hover:ring-blue-500/20'}`}
    >
      <div className={`p-1 ${badgeColor || 'bg-slate-800'}`}></div>

      {/* Percentage Saved Badge */}
      <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-lg border border-emerald-200 shadow-sm">
        Save {Math.round(result.savedPercentage)}%
      </div>

      {/* Selection Checkbox */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-300 text-transparent hover:border-green-400'}`}
        >
          <Check size={16} strokeWidth={3} />
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col pb-2 pt-10">
        <div className="flex justify-between items-start mb-4 pr-20">
          <div>
            <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
              {icon}
              {title}
            </h3>
            <div className="text-xs text-slate-500 mt-1">
              <div className="font-semibold">{result.inverterSize}</div>
              <div className="flex items-center gap-1 mt-0.5 text-slate-400">
                <Compass size={12} />
                <span>Supports {roofAngles} Roof Angles <span className="opacity-75 font-medium">(Min 4 panels/angle)</span></span>
              </div>
            </div>
          </div>
          {badge && <span className={`${badgeColor} text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide absolute top-12 right-6`}>{badge}</span>}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="bg-slate-50 p-3 rounded-xl text-center flex-1 border border-slate-100 flex flex-col justify-center">
            <span className="block text-2xl font-bold text-slate-800 leading-none mb-1">{result.panels}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Panels</span>
            <span className="text-[10px] text-blue-600 font-bold mt-1 bg-blue-50 rounded px-1 self-center">{kwp} kWp</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl text-center flex-1 border border-slate-100 flex flex-col justify-center">
            <span className="block text-2xl font-bold text-slate-800 leading-none mb-1">{result.batteries}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Batteries</span>
          </div>
        </div>

        <div className="space-y-3 mb-6 flex-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Monthly Savings</span>
            <span className="font-bold text-emerald-600">RM {result.monthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">New Bill Est.</span>
            <span className="font-bold text-slate-800">RM {result.newBillAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Break-even</span>
            <span className="font-bold text-blue-600">{result.paybackYearsCash.toFixed(1)} - {result.paybackYearsCC.toFixed(1)} Years</span>
          </div>

          <div className="my-2 border-t border-slate-100"></div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Original Price</span>
            <span className="font-mono font-bold text-slate-800">RM {result.systemCostCC.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">36m Installment</span>
            <span className="font-mono font-bold text-slate-800">RM {(result.systemCostCC / 36).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Cash Price</span>
            <span className="font-mono font-bold text-emerald-600">RM {result.systemCostCash.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Expandable Details Section */}
      <div className="border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
        >
          {isOpen ? 'Hide Details' : 'Show Details'}
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isOpen && (
          <div className="px-6 pb-6 pt-2 text-sm animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-slate-500">New Import</span>
                <span className="font-mono font-semibold text-slate-700">{result.newImportKwh.toLocaleString()} kWh</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-slate-500">New Export</span>
                <span className="font-mono font-semibold text-slate-700">{result.newExportKwh.toLocaleString()} kWh</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Battery Utilisation</span>
                <span className={`font-mono font-bold ${batUtilPercent > 100 ? 'text-blue-600' : 'text-slate-700'}`}>
                  {result.batteries > 0 ? `${batUtilPercent}%` : 'N/A'}
                </span>
              </div>
              {result.batteries > 0 && (
                <p className="text-[10px] text-slate-400 mt-1 italic mb-3">
                  *Ratio of surplus solar to battery capacity. {batUtilPercent > 100 ? 'Batteries fully charged.' : 'Batteries partially charged.'}
                </p>
              )}

              {scenarios.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-1.5 mb-2 text-slate-600 font-bold text-xs uppercase tracking-wide">
                    <TrendingUp size={12} />
                    Scenario Analysis
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-200">
                          <th className="text-left pb-1 font-medium">Bill Scenario</th>
                          <th className="text-right pb-1 font-medium">Est. Savings</th>
                          <th className="text-right pb-1 font-medium">% Saved</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {scenarios.map((s) => {
                          const isClosest = Math.abs(s.bill - currentBill) < 50;
                          return (
                            <tr key={s.bill} className={isClosest ? "bg-blue-50 text-blue-800 font-bold" : "text-slate-600"}>
                              <td className="py-1">RM {s.bill}</td>
                              <td className="text-right">RM {s.saved.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                              <td className="text-right">{Math.round(s.pct)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
