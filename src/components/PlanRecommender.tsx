
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { simulateSolar, getKwhFromBill, calculateSystemCost, calculateBill, getAprilLaunchingPromoDiscount } from '../utils/billingEngine';
import { InputNumber } from './InputNumber';
import { InputSlider } from './InputSlider';
import { SYSTEM_PRICING, BATTERY_CAPACITY_KWH, BATTERY_NOMINAL_KWH, PEAK_SUN_HOURS, PANEL_WATTAGE } from '../constants';
import { Zap, Sun, DollarSign, Home, Check, Battery, Info, BarChart3, PiggyBank, Target, PenTool, ShieldCheck, Compass, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, RefreshCw, MessageCircle, Copy, X, Plus, Minus, Table2, Download, Globe, User, Phone, ArrowUpCircle, CheckCircle2 } from 'lucide-react';
import { RecommendationResult } from '../types';
import html2canvas from 'html2canvas';

interface PlanRecommenderProps {
  initialUsage: number;
  aprilLaunchingPromo: boolean;
  onAprilLaunchingPromoChange: (value: boolean) => void;
  upgradeAutoBackupBox: boolean;
  onUpgradeAutoBackupBoxChange: (value: boolean) => void;
  suriaHomeRebate: boolean;
  onSuriaHomeRebateChange: (value: boolean) => void;
}

// Helper function to calculate a scenario result
const calculateScenario = (
  p: number,
  b: number,
  usageKwh: number,
  daytimePercent: number,
  phase: 'single' | 'three',
  billAmount: number,
  gapWarning: boolean,
  aprilLaunchingPromo: boolean,
  backupBoxUpgrade: boolean,
  suriaHomeRebate: boolean = false
): RecommendationResult | null => {
  const effectiveUsage = typeof usageKwh === 'number' ? usageKwh : 0;

  // If inside gap warning, use the upper bound bill for percentage calculation to avoid skewed data
  const effectiveBill = gapWarning
    ? calculateBill(1501).finalTotal
    : (typeof billAmount === 'number' ? billAmount : 0);

  const sim = simulateSolar(effectiveUsage, daytimePercent, p, b);
  const costs = calculateSystemCost(p, b, phase, {
    aprilLaunchingPromo,
    backupBoxUpgrade,
    suriaHomeRebate
  });

  if (!costs) return null;

  const cash = costs.cash;
  const cc = costs.cc;

  const annualSavings = sim.monthlySavings * 12;
  const paybackCash = annualSavings > 0 ? cash / annualSavings : 999;
  const paybackCC = annualSavings > 0 ? cc / annualSavings : 999;

  const savedPct = effectiveBill > 0 ? (sim.monthlySavings / effectiveBill) * 100 : 0;

  const solarSurplus = sim.solarGenerationMonthly - sim.demandDay;
  const totalBatteryCapacityMonthly = b * BATTERY_CAPACITY_KWH * 30;
  const batUtil = totalBatteryCapacityMonthly > 0 ? (solarSurplus / totalBatteryCapacityMonthly) : 0;

  return {
    panels: p,
    batteries: b,
    systemCostCash: cash,
    systemCostCC: cc,
    monthlySavings: sim.monthlySavings,
    savedPercentage: savedPct,
    newBillAmount: sim.newBill.finalTotal,
    paybackYearsCash: paybackCash,
    paybackYearsCC: paybackCC,
    roiPercentage: cash > 0 ? (annualSavings / cash) * 100 : 0,
    generation: sim.solarGenerationMonthly,
    export: sim.newBill.exportUnits || 0,
    inverterSize: costs.inverterSize,
    newImportKwh: sim.gridImport,
    newExportKwh: sim.newBill.exportUnits || 0,
    batteryUtilization: batUtil,
    isUpgraded: costs.isUpgraded,
    upgradeCost: costs.upgradeCost,
    originalInverterSize: costs.originalInverter,
    exportCreditValue: sim.newBill.exportCredit || 0,
    suriaRebate: costs.suriaRebate
  };
};

export const PlanRecommender: React.FC<PlanRecommenderProps> = ({
  initialUsage,
  aprilLaunchingPromo,
  onAprilLaunchingPromoChange,
  upgradeAutoBackupBox,
  onUpgradeAutoBackupBoxChange,
  suriaHomeRebate,
  onSuriaHomeRebateChange
}) => {
  // Inputs
  const [usageKwh, setUsageKwh] = useState<number | ''>(initialUsage);

  // FIX: Initialize billAmount immediately based on usageKwh
  const [billAmount, setBillAmount] = useState<number | ''>(() => {
    const val = typeof initialUsage === 'number' ? initialUsage : 0;
    return parseFloat(calculateBill(val).finalTotal.toFixed(2));
  });

  const [phase, setPhase] = useState<'single' | 'three'>('single');
  const [daytimePercent, setDaytimePercent] = useState<number>(30);
  const [roofMaxPanels, setRoofMaxPanels] = useState<number | ''>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [gapWarning, setGapWarning] = useState<boolean>(false);
  const [language, setLanguage] = useState<'zh' | 'en'>('en');

  // State to track edited plans { id: RecommendationResult }
  const [editedPlans, setEditedPlans] = useState<Record<string, RecommendationResult>>({});

  // Manual Inputs
  const [manualPanels, setManualPanels] = useState<number | ''>('');
  const [manualBatteries, setManualBatteries] = useState<number | ''>('');

  // Selection State for Whatsapp
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const billGapLower = useMemo(() => calculateBill(1500).finalTotal, []);
  const billGapUpper = useMemo(() => calculateBill(1501).finalTotal, []);

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

  // Selection Rule State
  const [selectionRule, setSelectionRule] = useState<'saving' | 'battery'>('battery');

  // Optimization Algorithm
  const recommendations = useMemo(() => {
    const effectiveUsage = typeof usageKwh === 'number' ? usageKwh : 0;
    const userLimit = roofMaxPanels === '' ? 999 : roofMaxPanels;

    const results: RecommendationResult[] = [];
    // Single-phase: max 14 panels; three-phase to 40.
    const maxPanels = Math.min(
      userLimit,
      phase === 'single' ? 14 : 40,
      SYSTEM_PRICING[SYSTEM_PRICING.length - 1].panels
    );
    const minPanels = SYSTEM_PRICING[0].panels;

    for (let p = minPanels; p <= maxPanels; p++) {
      const maxBat = 20;
      for (let b = 0; b <= maxBat; b++) {

        // Single Phase: max 11 panels without battery, 14 panels with battery.
        if (phase === 'single') {
          if (b === 0 && p > 11) continue;
          if (p > 14) continue;
        }

        const result = calculateScenario(
          p, b, effectiveUsage, daytimePercent, phase,
          typeof billAmount === 'number' ? billAmount : 0,
          gapWarning,
          aprilLaunchingPromo,
          upgradeAutoBackupBox,
          suriaHomeRebate
        );

        if (!result) continue;

        // CONSTRAINT: Exclude if New Export > New Import
        if (result.newExportKwh > result.newImportKwh) {
          continue;
        }
        results.push(result);
      }
    }

    if (results.length === 0) return {
      lowestBreakeven: null,
      mediumOffset: null,
      highOffset: null,
      matchKwh: null,
      maxSaving: null,
      batteryPlans: []
    };

    // --- STRATEGY 1: Increasing Saving % (Original) ---
    // 1. Lowest Breakeven
    const sortedByPayback = [...results].sort((a, b) => a.paybackYearsCash - b.paybackYearsCash);
    const lowestBreakeven = sortedByPayback[0];

    // 2. Medium Offset (70-90% Savings)
    const mediumOffsetCandidates = results.filter(r => r.savedPercentage >= 70 && r.savedPercentage < 90);
    const sortedByROIMediumOffset = [...mediumOffsetCandidates].sort((a, b) => a.paybackYearsCash - b.paybackYearsCash);
    const mediumOffset = sortedByROIMediumOffset.length > 0 ? sortedByROIMediumOffset[0] : null;

    // 3. High Offset (90-99% Savings)
    const highOffsetCandidates = results.filter(r => r.savedPercentage >= 90 && r.savedPercentage <= 99);
    const sortedByCostHighOffset = [...highOffsetCandidates].sort((a, b) => a.systemCostCash - b.systemCostCash);
    const highOffset = sortedByCostHighOffset.length > 0 ? sortedByCostHighOffset[0] : null;

    // 4. Match kWh (Balanced)
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

    // 5. Max Saving
    const sortedBySavings = [...results].sort((a, b) => {
      const diff = b.savedPercentage - a.savedPercentage;
      if (Math.abs(diff) > 0.01) return diff;
      return a.systemCostCash - b.systemCostCash;
    });
    const maxSaving = sortedBySavings[0];


    // --- STRATEGY 2: Increasing Battery (New) ---
    const batteryPlans: RecommendationResult[] = [];

    // Iterate from 0 to 5 batteries
    for (let b = 0; b <= 5; b++) {
      const candidates = results.filter(r => r.batteries === b);
      if (candidates.length === 0) continue;

      let bestPlan: RecommendationResult | undefined;

      if (b === 0) {
        // Plan 1 (No Battery): Lowest payback year
        candidates.sort((a, b) => a.paybackYearsCash - b.paybackYearsCash);
        bestPlan = candidates[0];
      } else {
        // Prefer minimal panels where export still happens (surplus after self-consumption + battery).
        // If all scenarios have zero export (common when the battery absorbs daytime surplus),
        // fall back to best payback so each battery tier still shows a plan.
        candidates.sort((a, b) => a.panels - b.panels);
        bestPlan = candidates.find(r => r.newExportKwh > 0);
        if (!bestPlan) {
          candidates.sort((a, b) => a.paybackYearsCash - b.paybackYearsCash);
          bestPlan = candidates[0];
        }
      }

      if (bestPlan) {
        batteryPlans.push(bestPlan);
        // Stop condition if 100% savings reached
        if (bestPlan.savedPercentage >= 100) {
          break;
        }
      }
    }

    return { lowestBreakeven, mediumOffset, highOffset, matchKwh, maxSaving, batteryPlans };

  }, [usageKwh, phase, daytimePercent, roofMaxPanels, billAmount, gapWarning, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate]);

  // Handle plan updates from cards
  const handleUpdatePlan = useCallback((id: string, newResult: RecommendationResult) => {
    setEditedPlans(prev => ({
      ...prev,
      [id]: newResult
    }));
  }, []);

  // Manual Result Calculation
  const manualResult = useMemo(() => {
    if (typeof manualPanels !== 'number' || manualPanels < 6) return null;
    const b = typeof manualBatteries === 'number' ? manualBatteries : 0;
    return calculateScenario(
      manualPanels, b,
      typeof usageKwh === 'number' ? usageKwh : 0,
      daytimePercent, phase,
      typeof billAmount === 'number' ? billAmount : 0,
      gapWarning,
      aprilLaunchingPromo,
      upgradeAutoBackupBox,
      suriaHomeRebate
    );
  }, [manualPanels, manualBatteries, usageKwh, phase, daytimePercent, billAmount, gapWarning, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate]);


  // Filter selections based on current mode
  const currentModeSelectedPlans = useMemo(() => {
    let validIds: string[] = ['manual']; // Manual is always visible
    if (selectionRule === 'saving') {
      validIds = [...validIds, 'lowestBreakeven', 'mediumOffset', 'highOffset', 'matchKwh', 'maxSaving'];
    } else {
      recommendations.batteryPlans.forEach((_, idx) => validIds.push(`batteryPlan_${idx}`));
    }

    return selectedPlans.filter(id => validIds.includes(id));
  }, [selectionRule, selectedPlans, recommendations]);

  // Whatsapp Generation Logic
  const handleTogglePlan = (planId: string) => {
    if (selectedPlans.includes(planId)) {
      setSelectedPlans(prev => prev.filter(id => id !== planId));
    } else {
      setSelectedPlans(prev => [...prev, planId]);
    }
  };

  const getActivePlanData = useCallback((id: string, original: RecommendationResult | null) => {
    return editedPlans[id] || original;
  }, [editedPlans]);

  // Refactored message generation to support dynamic language switching
  const generateMessageText = useCallback((lang: 'zh' | 'en') => {
    const plansToInclude: { title: string, data: RecommendationResult }[] = [];

    const getTitle = (type: string, pct: number, batteries?: number) => {
      if (selectionRule === 'battery' && type.startsWith('batteryPlan_')) {
        const batCount = batteries ?? 0;
        const lower = Math.floor(pct / 10) * 10;
        const upper = lower + 10;

        if (lang === 'zh') {
          const batText = batCount === 0 ? "无电池" : `${batCount}粒电池`;
          return `节省${lower}-${upper}%方案（${batText}）`;
        } else {
          const batText = batCount === 0 ? "No Battery" : `${batCount} ${batCount > 1 ? 'Batteries' : 'Battery'}`;
          return `Save ${lower}-${upper}% Plan (${batText})`;
        }
      }

      if (lang === 'zh') {
        switch (type) {
          case 'lowestBreakeven': return "最快回本期方案";
          case 'mediumOffset': return `节省约 ${pct}% 电费方案`;
          case 'highOffset': return `节省约 ${pct}% 电费方案`;
          case 'matchKwh': return `节省约 ${pct}% 电费方案`;
          case 'maxSaving': return "最高节省方案";
          case 'manual': return "自定义方案";
          default: return "方案";
        }
      } else {
        switch (type) {
          case 'lowestBreakeven': return "Fastest ROI Plan";
          case 'mediumOffset': return `~${pct}% Savings Plan`;
          case 'highOffset': return `~${pct}% Savings Plan`;
          case 'matchKwh': return `~${pct}% Savings Plan`;
          case 'maxSaving': return "Max Savings Plan";
          case 'manual': return "Custom Plan";
          default: return "Plan";
        }
      }
    };

    const addPlan = (id: string, rec: RecommendationResult | null) => {
      const data = getActivePlanData(id, rec);
      // Use currentModeSelectedPlans instead of selectedPlans to respect mode
      if (currentModeSelectedPlans.includes(id) && data) {
        plansToInclude.push({ title: getTitle(id, Math.round(data.savedPercentage), data.batteries), data });
      }
    };

    if (selectionRule === 'saving') {
      addPlan('lowestBreakeven', recommendations.lowestBreakeven);
      addPlan('mediumOffset', recommendations.mediumOffset);
      addPlan('highOffset', recommendations.highOffset);
      addPlan('matchKwh', recommendations.matchKwh);
      addPlan('maxSaving', recommendations.maxSaving);
    } else {
      recommendations.batteryPlans.forEach((plan, idx) => {
        addPlan(`batteryPlan_${idx}`, plan);
      });
    }

    if (currentModeSelectedPlans.includes('manual') && manualResult) {
      plansToInclude.push({ title: getTitle('manual', Math.round(manualResult.savedPercentage)), data: manualResult });
    }

    if (plansToInclude.length === 0) return "";

    const rawBill = typeof billAmount === 'number' ? billAmount : 0;
    const roundedBill = Math.round(rawBill / 10) * 10;
    const roofLimitStr = roofMaxPanels === '' ? (lang === 'zh' ? '待确定' : 'TBC') : roofMaxPanels;

    let msg = "";

    if (lang === 'zh') {
      msg = `你好，根据您提供的用电资料：\n`;
      msg += `- 每月电费：约RM ${roundedBill}\n`;
      msg += `- 每月用电量：约 ${usageKwh} kWh\n`;
      msg += `- 假设白天用电比例：${daytimePercent}%\n`;
      msg += `- 电表：${phase === 'single' ? 'Single Phase' : 'Three Phase'}\n`;
      msg += `- 屋顶可容纳电板数量：${roofLimitStr}\n`;
      msg += `\n我们为您量身定制以下 ${plansToInclude.length} 种方案，以不同预算、节省效能、与回酬周期供您参考 😁\n\n`;
    } else {
      msg = `Hi there! Based on the electricity usage details provided:\n`;
      msg += `- Monthly Bill: ~RM ${roundedBill}\n`;
      msg += `- Monthly Usage: ~${usageKwh} kWh\n`;
      msg += `- Est. Daytime Usage: ${daytimePercent}%\n`;
      msg += `- Meter Type: ${phase === 'single' ? 'Single Phase' : 'Three Phase'}\n`;
      msg += `- Roof Capacity: ${roofLimitStr}\n`;
      msg += `\nHere are ${plansToInclude.length} tailored solar proposals for you, covering different budget ranges, savings targets, and ROI periods for your review 😁\n\n`;
    }

    if (aprilLaunchingPromo) {
      msg +=
        lang === 'zh'
          ? `⏰ 限时优惠仅限至 2026年5月30日！\n\n`
          : `⏰ Limited promo until 30th May 2026 only!\n\n`;
    }


    plansToInclude.forEach((plan, index) => {
      const r = plan.data;
      const roundedMonthlySavings = Math.floor(r.monthlySavings / 10) * 10;
      const roundedAnnualSavings = roundedMonthlySavings * 12;
      const kwpNum = (r.panels * PANEL_WATTAGE) / 1000;
      const kwp = kwpNum.toFixed(2);
      const listPriceCCBeforePromo = aprilLaunchingPromo
        ? r.systemCostCC + getAprilLaunchingPromoDiscount(phase, r.batteries)
        : 0;

      const batteryTotalKwhNominal = r.batteries * BATTERY_NOMINAL_KWH;
      const batteryKwhLabel =
        r.batteries > 0 ? batteryTotalKwhNominal.toString() : '';
      const batStr =
        r.batteries === 0
          ? lang === 'zh'
            ? '（无电池）'
            : '(No Battery)'
          : lang === 'zh'
            ? `+ ${r.batteries}粒电池${batteryKwhLabel}kWh`
            : `+ ${r.batteries} ${r.batteries > 1 ? 'Batteries' : 'Battery'} ${batteryKwhLabel}kWh`;

      msg += `☀️ ${lang === 'zh' ? '方案' : 'Plan'} ${index + 1}：${plan.title}\n\n`;
      msg += `${lang === 'zh' ? '系统配置' : 'System Size'}： *${r.panels} ${lang === 'zh' ? '片太阳能板' : 'Panels'} ${kwp} kWp ${batStr}*\n`;

      // When SuRIA rebate is active the stored prices already have the rebate deducted; show pre-rebate first, then after-rebate.
      const suriaRebateAmt = r.suriaRebate ?? 3000;
      const ccBeforeRebate = suriaHomeRebate ? r.systemCostCC + suriaRebateAmt : r.systemCostCC;
      const cashBeforeRebate = suriaHomeRebate ? r.systemCostCash + suriaRebateAmt : r.systemCostCash;

      if (lang === 'zh') {
        msg += `📌每月预计节省电费：约 RM${roundedMonthlySavings}+-\n`;
        msg += `📌每年预计节省电费：约 RM${roundedAnnualSavings}+-\n`;
        msg += `📌早鸟优惠价：RM${ccBeforeRebate.toLocaleString()}（可零利息分期付款36个月）\n`;
        msg += `📌早鸟现金优惠价：RM${cashBeforeRebate.toLocaleString()}\n`;
        if (suriaHomeRebate) {
          msg += `\n🎉RM${suriaRebateAmt.toLocaleString()}津贴后价格: *RM${r.systemCostCC.toLocaleString()}*\n`;
          msg += `💰RM${suriaRebateAmt.toLocaleString()}津贴后现金价: *RM${r.systemCostCash.toLocaleString()}*\n`;
        }
        msg += `📌预计回本期：${r.paybackYearsCash.toFixed(1)} - ${r.paybackYearsCC.toFixed(1)}年\n\n`;
      } else {
        msg += `📌Est. Monthly Savings: ~RM${roundedMonthlySavings}+-\n`;
        msg += `📌Est. Annual Savings: ~RM${roundedAnnualSavings}+-\n`;
        msg += `📌Promo Price: RM${ccBeforeRebate.toLocaleString()} (0% Interest / 36m)\n`;
        msg += `📌Cash Price: RM${cashBeforeRebate.toLocaleString()}\n`;
        if (suriaHomeRebate) {
          msg += `\n🎉After RM${suriaRebateAmt.toLocaleString()} Rebate (CC): *RM${r.systemCostCC.toLocaleString()}*\n`;
          msg += `💰After RM${suriaRebateAmt.toLocaleString()} Rebate (Cash): *RM${r.systemCostCash.toLocaleString()}*\n`;
        }
        msg += `📌Est. ROI Period: ${r.paybackYearsCash.toFixed(1)} - ${r.paybackYearsCC.toFixed(1)} Years\n\n`;
      }
    });

    if (lang === 'zh') {
      msg += `💼 *【 配套包括 】*\n\n`;
      msg += `✅ 终生太阳能 RM10,000保险\n`;
      msg += `✅ AI智能能源管理系统\n`;
      msg += `✅ 安装费 & 政府申请手续 全包\n`;
      msg += `✅ 10年 GoodWe 全球Tier 1逆变器保修\n`;
      msg += `✅ 10年 GoodWe 全球Tier 1电池保修\n`;
      msg += `✅ 15年 Trina Solar 全球Tier 1太阳能电板保修\n`;
      msg += `✅ 30年 电板发电效能保证\n`;
      msg += `✅ 1年 安装与人工保修`;
    } else {
      msg += `💼 *【 Package Includes 】*\n\n`;
      msg += `✅ Lifetime Solar Insurance (RM10,000 Coverage)\n`;
      msg += `✅ AI Smart Energy Management System\n`;
      msg += `✅ All-Inclusive Installation & ATAP Application\n`;
      msg += `✅ 10-Year Inverter Warranty (GoodWe - Global Tier 1)\n`;
      msg += `✅ 10-Year Battery Warranty (GoodWe - Global Tier 1)\n`;
      msg += `✅ 15-Year Solar Panel Warranty (Trina Solar - Global Tier 1)\n`;
      msg += `✅ 30-Year Linear Power Output Warranty\n`;
      msg += `✅ 1-Year Workmanship & Installation Warranty`;
    }

    return msg;
  }, [recommendations, manualResult, currentModeSelectedPlans, getActivePlanData, billAmount, usageKwh, daytimePercent, phase, roofMaxPanels, selectionRule, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate]);

  // FIX: corrected Clipboard method name from webText to writeText
  const copyToClipboard = () => {
    if (generatedMessage) {
      navigator.clipboard.writeText(generatedMessage);
      alert(language === 'zh' ? "已复制到剪贴板！" : "Copied to clipboard!");
    }
  };

  const handleGenerateMessage = () => {
    setLanguage('zh');
    setGeneratedMessage(generateMessageText('zh'));
  };

  // Collect selected plans for Comparison
  const comparisonData = useMemo(() => {
    const list: { name: string; data: RecommendationResult; theme: string; icon: any }[] = [];
    const getRec = (id: string, def: RecommendationResult | null) => getActivePlanData(id, def);

    // Helper to generate dynamic name based on ACTUAL plan percentage
    const getDynamicSaverName = (pct: number, lang: 'zh' | 'en') => {
      const lower = Math.floor(pct / 10) * 10;
      const upper = lower + 10;
      return lang === 'zh' ? `${lower}-${upper}% 节省` : `${lower}-${upper}% Saver`;
    };

    if (selectionRule === 'saving') {
      if (currentModeSelectedPlans.includes('lowestBreakeven')) {
        const d = getRec('lowestBreakeven', recommendations.lowestBreakeven);
        if (d) list.push({
          name: language === 'zh' ? "最快回本" : "Fastest ROI",
          data: d,
          theme: 'emerald',
          icon: BarChart3
        });
      }

      if (currentModeSelectedPlans.includes('mediumOffset')) {
        const d = getRec('mediumOffset', recommendations.mediumOffset);
        if (d) list.push({
          name: getDynamicSaverName(d.savedPercentage, language),
          data: d,
          theme: 'cyan',
          icon: Target
        });
      }

      if (currentModeSelectedPlans.includes('highOffset')) {
        const d = getRec('highOffset', recommendations.highOffset);
        if (d) list.push({
          name: getDynamicSaverName(d.savedPercentage, language),
          data: d,
          theme: 'purple',
          icon: ShieldCheck
        });
      }

      if (currentModeSelectedPlans.includes('matchKwh')) {
        const d = getRec('matchKwh', recommendations.matchKwh);
        if (d) list.push({
          name: language === 'zh' ? "平衡方案" : "Balanced",
          data: d,
          theme: 'blue',
          icon: Target
        });
      }

      if (currentModeSelectedPlans.includes('maxSaving')) {
        const d = getRec('maxSaving', recommendations.maxSaving);
        if (d) list.push({
          name: language === 'zh' ? "最高节省" : "Max Saving",
          data: d,
          theme: 'amber',
          icon: PiggyBank
        });
      }
    } else {
      // Battery Plans
      recommendations.batteryPlans.forEach((plan, idx) => {
        const id = `batteryPlan_${idx}`;
        if (currentModeSelectedPlans.includes(id)) {
          const d = getRec(id, plan);
          if (d) {
            const batCount = d.batteries;
            const name = language === 'zh'
              ? (batCount === 0 ? "无电池" : `${batCount} 粒电池`)
              : (batCount === 0 ? "No Battery" : `${batCount} ${batCount > 1 ? 'Batteries' : 'Battery'}`);

            // Cycle themes
            const themes = ['emerald', 'cyan', 'blue', 'purple', 'amber', 'rose'];
            const theme = themes[idx % themes.length];

            list.push({
              name: name,
              data: d,
              theme: theme,
              icon: batCount === 0 ? BarChart3 : Battery
            });
          }
        }
      });
    }

    if (currentModeSelectedPlans.includes('manual')) {
      if (manualResult) list.push({
        name: language === 'zh' ? "自定义" : "Custom",
        data: manualResult,
        theme: 'slate',
        icon: PenTool
      });
    }

    return list;
  }, [currentModeSelectedPlans, recommendations, manualResult, getActivePlanData, language, selectionRule]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Home className="text-blue-600" size={24} />
            Your Profile
          </h2>
        </div>

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
            {phase === 'single' ? (
              <span className="text-[10px] text-amber-600 mt-1">Max 11 Panels (no battery) / 14 Panels (with battery)</span>
            ) : (
              <span className="text-[10px] text-amber-600 mt-1">Max 40 Panels (15kWac)</span>
            )}
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

        <div className="mt-4 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={aprilLaunchingPromo}
              onChange={e => onAprilLaunchingPromoChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
            />
            <span>
              <span className="font-bold">{language === 'zh' ? '四月开跑促销' : 'April Launching Promo'}</span>
              <span className="block text-xs text-amber-800/90 mt-0.5">
                {language === 'zh'
                  ? '无电池：单相减 RM800、三相减 RM1600（系统）。有电池：单相减 RM1800、三相减 RM3000；每粒电池减 RM800（现金与分期相同）。'
                  : 'No battery: −RM800 single / −RM1600 three-phase on system. With 1+ batteries: −RM1800 / −RM3000 on system; −RM800 per battery (same on cash & CC).'}
              </span>
            </span>
          </label>
          {aprilLaunchingPromo && (
            <label className="ml-1 flex items-start gap-3 cursor-pointer rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
              <input
                type="checkbox"
                checked={upgradeAutoBackupBox}
                onChange={e => onUpgradeAutoBackupBoxChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <span>
                <span className="font-bold">{language === 'zh' ? '升级 Auto BackupBox' : 'Upgrade to Auto BackupBox'}</span>
                <span className="block text-xs text-amber-800/90 mt-0.5">
                  {language === 'zh'
                    ? '仅在有 1 台或以上电池时适用：系统加价单相 RM800、三相 RM1500（现金与分期相同；不含电池单价）。'
                    : 'Only with 1+ battery: +RM800 single-phase / +RM1500 three-phase on system cash & CC (not on battery).'}
                </span>
              </span>
            </label>
          )}
          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
            <input
              type="checkbox"
              checked={suriaHomeRebate}
              onChange={e => onSuriaHomeRebateChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <span className="font-bold">{language === 'zh' ? 'SuRIA Home 政府回扣 RM3,000' : 'SuRIA Home RM3,000 Rebate'}</span>
              <span className="block text-xs text-emerald-800/90 mt-0.5">
                {language === 'zh'
                  ? '政府提供 RM3,000 回扣，适用于所有系统（现金及分期同等扣减）。'
                  : 'Government rebate of RM3,000 applied to all systems — deducted from both cash and CC price.'}
              </span>
            </span>
          </label>
        </div>

      </div>

      {/* Header & Toggle */}
      {/* Header & Toggle */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1">
          <button
            onClick={() => setSelectionRule('saving')}
            className={`px-5 py-2.5 rounded-lg text-base font-bold transition-all flex items-center gap-2 ${selectionRule === 'saving'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <TrendingUp size={18} />
            {language === 'zh' ? '按节省比例' : 'Rising Saving %'}
          </button>
          <button
            onClick={() => setSelectionRule('battery')}
            className={`px-5 py-2.5 rounded-lg text-base font-bold transition-all flex items-center gap-2 ${selectionRule === 'battery'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Battery size={18} />
            {language === 'zh' ? '按电池数量' : 'Rising Battery'}
          </button>
        </div>

        {/* Bulk Selection Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const plansToAdd: string[] = [];
              if (selectionRule === 'saving') {
                if (recommendations.lowestBreakeven) plansToAdd.push('lowestBreakeven');
                if (recommendations.mediumOffset) plansToAdd.push('mediumOffset');
                if (recommendations.highOffset) plansToAdd.push('highOffset');
                if (recommendations.matchKwh) plansToAdd.push('matchKwh');
                if (recommendations.maxSaving) plansToAdd.push('maxSaving');
              } else {
                recommendations.batteryPlans.forEach((_, idx) => plansToAdd.push(`batteryPlan_${idx}`));
              }
              // Merge with existing, avoiding duplicates
              setSelectedPlans(prev => [...new Set([...prev, ...plansToAdd])]);
            }}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <div className="w-4 h-4 border-2 border-slate-400 rounded flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm opacity-0 hover:opacity-100 transition-opacity"></div>
            </div>
            {language === 'zh' ? '全选' : 'Select All'}
          </button>
          <button
            onClick={() => {
              let plansToRemove: string[] = [];
              if (selectionRule === 'saving') {
                plansToRemove = ['lowestBreakeven', 'mediumOffset', 'highOffset', 'matchKwh', 'maxSaving'];
              } else {
                plansToRemove = recommendations.batteryPlans.map((_, idx) => `batteryPlan_${idx}`);
              }
              setSelectedPlans(prev => prev.filter(id => !plansToRemove.includes(id)));
            }}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-red-500 transition-colors"
          >
            <div className="w-4 h-4 border-2 border-slate-400 rounded flex items-center justify-center">
              {/* Empty square for unselect */}
            </div>
            {language === 'zh' ? '取消全选' : 'Unselect All'}
          </button>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {selectionRule === 'saving' ? (
          <>
            {recommendations.lowestBreakeven && (
              <RecommendationCard
                id="lowestBreakeven"
                title="Lowest Breakeven"
                result={recommendations.lowestBreakeven}
                badge="BEST ROI"
                badgeColor="bg-emerald-500"
                icon={<BarChart3 className="text-emerald-600" size={24} />}
                currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
                daytimePercent={daytimePercent}
                isSelected={selectedPlans.includes('lowestBreakeven')}
                onToggle={() => handleTogglePlan('lowestBreakeven')}
                phase={phase}
                usageKwh={typeof usageKwh === 'number' ? usageKwh : 0}
                gapWarning={gapWarning}
                aprilLaunchingPromo={aprilLaunchingPromo}
                upgradeAutoBackupBox={upgradeAutoBackupBox}
                suriaHomeRebate={suriaHomeRebate}
                onUpdate={handleUpdatePlan}
              />
            )}

            {recommendations.mediumOffset && (
              <RecommendationCard
                id="mediumOffset"
                title="70-90% Bill Saver"
                result={recommendations.mediumOffset}
                badge="SMART SAVER"
                badgeColor="bg-cyan-500"
                icon={<Target className="text-cyan-600" size={24} />}
                currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
                daytimePercent={daytimePercent}
                isSelected={selectedPlans.includes('mediumOffset')}
                onToggle={() => handleTogglePlan('mediumOffset')}
                phase={phase}
                usageKwh={typeof usageKwh === 'number' ? usageKwh : 0}
                gapWarning={gapWarning}
                aprilLaunchingPromo={aprilLaunchingPromo}
                upgradeAutoBackupBox={upgradeAutoBackupBox}
                suriaHomeRebate={suriaHomeRebate}
                onUpdate={handleUpdatePlan}
              />
            )}

            {recommendations.highOffset && (
              <RecommendationCard
                id="highOffset"
                title="90-99% Bill Saver"
                result={recommendations.highOffset}
                badge="MAX OFFSET"
                badgeColor="bg-purple-600"
                icon={<ShieldCheck className="text-purple-600" size={24} />}
                currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
                daytimePercent={daytimePercent}
                isSelected={selectedPlans.includes('highOffset')}
                onToggle={() => handleTogglePlan('highOffset')}
                phase={phase}
                usageKwh={typeof usageKwh === 'number' ? usageKwh : 0}
                gapWarning={gapWarning}
                aprilLaunchingPromo={aprilLaunchingPromo}
                upgradeAutoBackupBox={upgradeAutoBackupBox}
                suriaHomeRebate={suriaHomeRebate}
                onUpdate={handleUpdatePlan}
              />
            )}

            {recommendations.matchKwh && (
              <RecommendationCard
                id="matchKwh"
                title="Match the kWh"
                result={recommendations.matchKwh}
                badge="BALANCED"
                badgeColor="bg-blue-600"
                icon={<Target className="text-blue-600" size={24} />}
                currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
                daytimePercent={daytimePercent}
                isSelected={selectedPlans.includes('matchKwh')}
                onToggle={() => handleTogglePlan('matchKwh')}
                phase={phase}
                usageKwh={typeof usageKwh === 'number' ? usageKwh : 0}
                gapWarning={gapWarning}
                aprilLaunchingPromo={aprilLaunchingPromo}
                upgradeAutoBackupBox={upgradeAutoBackupBox}
                suriaHomeRebate={suriaHomeRebate}
                onUpdate={handleUpdatePlan}
              />
            )}

            {recommendations.maxSaving && (
              <RecommendationCard
                id="maxSaving"
                title="Maximum Saving"
                result={recommendations.maxSaving}
                badge="POWER USER"
                badgeColor="bg-amber-500"
                icon={<PiggyBank className="text-amber-600" size={24} />}
                currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
                daytimePercent={daytimePercent}
                isSelected={selectedPlans.includes('maxSaving')}
                onToggle={() => handleTogglePlan('maxSaving')}
                phase={phase}
                usageKwh={typeof usageKwh === 'number' ? usageKwh : 0}
                gapWarning={gapWarning}
                aprilLaunchingPromo={aprilLaunchingPromo}
                upgradeAutoBackupBox={upgradeAutoBackupBox}
                suriaHomeRebate={suriaHomeRebate}
                onUpdate={handleUpdatePlan}
              />
            )}
          </>
        ) : (
          <>
            {recommendations.batteryPlans.map((plan, idx) => {
              const batCount = plan.batteries;
              const colors = ['bg-emerald-500', 'bg-cyan-500', 'bg-blue-600', 'bg-purple-600', 'bg-amber-500', 'bg-rose-500'];
              const color = colors[idx % colors.length];
              const iconColor = color.replace('bg-', 'text-').replace('500', '600');

              const title = language === 'zh'
                ? (batCount === 0 ? "无电池方案" : `${batCount} 粒电池方案`)
                : (batCount === 0 ? "No Battery Plan" : `${batCount} Battery Plan`);

              const badge = "BEST ROI";

              return (
                <RecommendationCard
                  key={`bat_plan_${idx}`}
                  id={`batteryPlan_${idx}`}
                  title={title}
                  result={plan}
                  badge={badge}
                  badgeColor={color}
                  icon={batCount === 0 ? <BarChart3 className={iconColor} size={24} /> : <Battery className={iconColor} size={24} />}
                  currentBill={gapWarning ? billGapUpper : (typeof billAmount === 'number' ? billAmount : 0)}
                  daytimePercent={daytimePercent}
                  isSelected={selectedPlans.includes(`batteryPlan_${idx}`)}
                  onToggle={() => handleTogglePlan(`batteryPlan_${idx}`)}
                  phase={phase}
                  usageKwh={typeof usageKwh === 'number' ? usageKwh : 0}
                  gapWarning={gapWarning}
                  aprilLaunchingPromo={aprilLaunchingPromo}
                  upgradeAutoBackupBox={upgradeAutoBackupBox}
                  suriaHomeRebate={suriaHomeRebate}
                  onUpdate={handleUpdatePlan}
                />
              );
            })}
          </>
        )}
      </div>

      {(!recommendations.lowestBreakeven && recommendations.batteryPlans.length === 0) && (
        <div className="text-center p-12 bg-slate-100 rounded-2xl border border-dashed border-slate-300">
          <p className="text-slate-500">No valid system configuration found based on your constraints.</p>
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
                phase={phase}
                usageKwh={typeof usageKwh === 'number' ? usageKwh : 0}
                gapWarning={gapWarning}
                aprilLaunchingPromo={aprilLaunchingPromo}
                upgradeAutoBackupBox={upgradeAutoBackupBox}
                suriaHomeRebate={suriaHomeRebate}
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

      {/* Floating Action Buttons */}
      {currentModeSelectedPlans.length > 0 && !generatedMessage && !showComparison && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-40 flex justify-center gap-4 animate-in slide-in-from-bottom-6 pointer-events-none px-4">
          <button
            onClick={() => setShowComparison(true)}
            className="pointer-events-auto bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-6 rounded-full shadow-2xl flex items-center gap-3 transition-transform hover:scale-105"
          >
            <Table2 size={20} />
            <span className="hidden sm:inline">Compare</span>
          </button>
          <button
            onClick={handleGenerateMessage}
            className="pointer-events-auto bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-full shadow-2xl flex items-center gap-3 transition-transform hover:scale-105"
          >
            <MessageCircle size={24} fill="white" className="text-white" />
            <span>Whatsapp ({currentModeSelectedPlans.length})</span>
          </button>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && (
        <ComparisonModal
          data={comparisonData}
          onClose={() => setShowComparison(false)}
          language={language}
          onToggleLanguage={() => setLanguage(l => l === 'en' ? 'zh' : 'en')}
          daytimePercent={daytimePercent}
          currentBill={typeof billAmount === 'number' ? billAmount : 0}
          usageKwh={typeof usageKwh === 'number' ? usageKwh : 0}
          suriaHomeRebate={suriaHomeRebate}
        />
      )}

      {/* WhatsApp Message Modal */}
      {generatedMessage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MessageCircle className="text-green-600" size={20} />
                {language === 'zh' ? '生成消息' : 'Generated Message'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newLang = language === 'zh' ? 'en' : 'zh';
                    setLanguage(newLang);
                    setGeneratedMessage(generateMessageText(newLang));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-colors"
                >
                  <Globe size={16} />
                  {language === 'zh' ? 'EN' : '中文'}
                </button>
                <button onClick={() => setGeneratedMessage(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
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
                {language === 'zh' ? '复制到剪贴板' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-Components ---

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
  phase: 'single' | 'three';
  usageKwh: number;
  gapWarning: boolean;
  aprilLaunchingPromo: boolean;
  upgradeAutoBackupBox: boolean;
  suriaHomeRebate: boolean;
  onUpdate?: (id: string, newResult: RecommendationResult) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  id, title, result: initialResult, badge, badgeColor, icon,
  currentBill, daytimePercent, isSelected, onToggle,
  phase, usageKwh, gapWarning, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate, onUpdate
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Local state for editing with flexible input support
  const [panels, setPanels] = useState<number | ''>(initialResult.panels);
  const [batteries, setBatteries] = useState<number | ''>(initialResult.batteries);

  const [result, setResult] = useState(initialResult);

  // Sync state if base props change significantly
  useEffect(() => {
    setPanels(initialResult.panels);
    setBatteries(initialResult.batteries);
    setResult(initialResult);
  }, [initialResult.panels, initialResult.batteries, initialResult.systemCostCash, initialResult.systemCostCC, aprilLaunchingPromo, upgradeAutoBackupBox]);

  const resultRef = useRef(result);
  resultRef.current = result;

  // Recalculate when inputs or promo change (skip if output unchanged)
  useEffect(() => {
    const p = typeof panels === 'number' ? panels : 0;
    const b = typeof batteries === 'number' ? batteries : 0;
    if (p < 6) return;

    const newRes = calculateScenario(
      p, b, usageKwh, daytimePercent, phase, currentBill, gapWarning, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate
    );
    if (!newRes) return;

    const prev = resultRef.current;
    const sameDims = p === prev.panels && b === prev.batteries;
    const samePrice =
      Math.abs(newRes.systemCostCash - prev.systemCostCash) < 0.01 &&
      Math.abs(newRes.systemCostCC - prev.systemCostCC) < 0.01;
    if (sameDims && samePrice) return;

    setResult(newRes);
    if (onUpdate) onUpdate(id, newRes);
  }, [panels, batteries, usageKwh, daytimePercent, phase, currentBill, gapWarning, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate, id, onUpdate]);

  const invLower = result.inverterSize.toLowerCase();
  const roofAngles =
    invLower.includes("3.6 kwac") ||
    invLower.includes("5 kwac") ||
    /\b6 kWac\b/i.test(result.inverterSize) ||
    invLower.includes("8 kwac")
      ? 2
      : 3;
  const kwp = (result.panels * PANEL_WATTAGE / 1000).toFixed(2);
  const batUtilPercent = Math.round(result.batteryUtilization * 100);

  // Generate Scenarios
  const scenarios = useMemo(() => {
    if (currentBill <= 0) return [];

    const anchor = Math.round(currentBill / 100) * 100;
    const billsToCheck = [];

    // 3 lower
    for (let i = 3; i >= 1; i--) {
      const val = anchor - (i * 100);
      if (val > 0 && val !== 800) billsToCheck.push(val);
    }

    if (anchor > 0 && anchor !== 800) billsToCheck.push(anchor);

    // 3 higher
    for (let i = 1; i <= 3; i++) {
      const val = anchor + (i * 100);
      if (val !== 800) billsToCheck.push(val);
    }

    // Filter duplicates and recalculate just in case
    const uniqueBills = Array.from(new Set(billsToCheck)).sort((a, b) => a - b);

    return uniqueBills.map(bill => {
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

  // Input Handlers
  const handlePanelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setPanels('');
    } else {
      const parsed = parseInt(val);
      setPanels(parsed);
      if (onUpdate && !isNaN(parsed) && parsed >= 6) {
        const b = typeof batteries === 'number' ? batteries : 0;
        const newRes = calculateScenario(parsed, b, usageKwh, daytimePercent, phase, currentBill, gapWarning, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate);
        if (newRes) onUpdate(id, newRes);
      }
    }
  };

  const handleBatteryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setBatteries('');
    } else {
      const parsed = parseInt(val);
      setBatteries(parsed);
      if (onUpdate && !isNaN(parsed) && parsed >= 0) {
        const p = typeof panels === 'number' ? panels : 0;
        const newRes = calculateScenario(p, parsed, usageKwh, daytimePercent, phase, currentBill, gapWarning, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate);
        if (newRes) onUpdate(id, newRes);
      }
    }
  };

  const changePanels = (delta: number) => {
    const current = typeof panels === 'number' ? panels : 0;
    const newVal = current + delta;
    if (newVal >= 6 && newVal <= 60) {
      setPanels(newVal);
      // Eagerly update editedPlans so WhatsApp message is always in sync,
      // even if the user clicks Whatsapp before the async recalculation effect fires.
      if (onUpdate) {
        const b = typeof batteries === 'number' ? batteries : 0;
        const newRes = calculateScenario(newVal, b, usageKwh, daytimePercent, phase, currentBill, gapWarning, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate);
        if (newRes) onUpdate(id, newRes);
      }
    }
  };

  const changeBatteries = (delta: number) => {
    const current = typeof batteries === 'number' ? batteries : 0;
    const newVal = current + delta;
    if (newVal >= 0 && newVal <= 20) {
      setBatteries(newVal);
      if (onUpdate) {
        const p = typeof panels === 'number' ? panels : 0;
        const newRes = calculateScenario(p, newVal, usageKwh, daytimePercent, phase, currentBill, gapWarning, aprilLaunchingPromo, upgradeAutoBackupBox, suriaHomeRebate);
        if (newRes) onUpdate(id, newRes);
      }
    }
  };

  const isExportHigh = result.newExportKwh > result.newImportKwh;
  const isPhaseMismatch = phase === 'single' && (typeof panels === 'number' ? panels : 0) > 14;

  const isSinglePhaseLimitExceeded = phase === 'single' && (
    ((typeof batteries === 'number' ? batteries : 0) === 0 && (typeof panels === 'number' ? panels : 0) > 11) ||
    ((typeof batteries === 'number' ? batteries : 0) > 0 && (typeof panels === 'number' ? panels : 0) > 14)
  );

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border overflow-hidden flex flex-col h-full transition-all group relative ${isSelected ? 'border-green-500 ring-2 ring-green-500 ring-opacity-50' : 'border-slate-100 hover:ring-2 hover:ring-blue-500/20'}`}
    >
      <div className={`p-1 ${badgeColor || 'bg-slate-800'}`}></div>

      <div className={`absolute top-4 right-4 text-xs font-bold px-3 py-1.5 rounded-lg border shadow-sm ${badgeColor ? badgeColor.replace('bg-', 'bg-').replace('500', '100').replace('600', '100') + ' ' + badgeColor.replace('bg-', 'text-').replace('500', '700').replace('600', '700') + ' border-' + badgeColor.replace('bg-', '').replace('500', '200').replace('600', '200') : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
        Save {Math.round(result.savedPercentage)}%
      </div>

      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={onToggle}
          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all shadow-sm ${isSelected ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-slate-300 text-transparent hover:border-green-400'}`}
        >
          <Check size={18} strokeWidth={3} />
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col pb-2 pt-14">
        <div className="flex justify-between items-start mb-6 pr-20">
          <div>
            <h3 className="font-bold text-xl text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
              {icon}
              {title}
            </h3>
            <div className="text-xs text-slate-500 mt-2">
              <div className="font-semibold text-slate-600">{result.inverterSize}</div>
              <div className="flex items-center gap-1 mt-1 text-slate-400">
                <Compass size={12} />
                <span>Supports {roofAngles} Roof Angles <span className="opacity-75 font-medium">(Min 4)</span></span>
              </div>
            </div>
          </div>
          {badge && <span className={`${badgeColor} text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide absolute top-14 right-6 shadow-sm`}>{badge}</span>}
        </div>

        {/* Editable Controls Section */}
        <div className="space-y-4 mb-8">
          {/* Panels Control */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
            <div className="text-sm font-semibold text-slate-700 mb-2 pl-1">Panels</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changePanels(-1)}
                className="w-12 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                <Minus size={18} strokeWidth={2.5} />
              </button>
              <div className="flex-1 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-xl text-slate-800 shadow-sm relative overflow-hidden">
                <input
                  type="number"
                  value={panels}
                  onChange={handlePanelChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full h-full text-center bg-transparent outline-none appearance-none"
                />
              </div>
              <button
                onClick={() => changePanels(1)}
                className="w-12 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="mt-2 text-center bg-blue-100/50 text-blue-700 text-xs font-bold py-1 rounded-lg">
              {kwp} kWp
            </div>
          </div>

          {/* Batteries Control */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
            <div className="text-sm font-semibold text-slate-700 mb-2 pl-1">Batteries</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeBatteries(-1)}
                className="w-12 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                <Minus size={18} strokeWidth={2.5} />
              </button>
              <div className="flex-1 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-xl text-slate-800 shadow-sm overflow-hidden">
                <input
                  type="number"
                  value={batteries}
                  onChange={handleBatteryChange}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="w-full h-full text-center bg-transparent outline-none appearance-none"
                />
              </div>
              <button
                onClick={() => changeBatteries(1)}
                className="w-12 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Warning if Phase Mismatch (General) */}
        {isPhaseMismatch && !isSinglePhaseLimitExceeded && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2 items-start text-xs text-amber-700 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold block mb-0.5">Phase Limit Exceeded</span>
              Single Phase supports max 14 panels (with battery).
            </div>
          </div>
        )}

        {/* New Warning: Single Phase Limit Exceeded (Specific) */}
        {isSinglePhaseLimitExceeded && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 items-start text-xs text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <span className="font-bold block mb-0.5">Single Phase Limit Exceeded</span>
              Single-phase limits exceeded: max 11 panels without battery, or 14 panels with battery.
            </div>
          </div>
        )}

        {/* Auto Upgrade Notification (Replaces Capacity Warning) */}
        {result.isUpgraded && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex gap-2 items-start text-xs text-blue-800 animate-in fade-in slide-in-from-top-2">
            <ArrowUpCircle size={14} className="mt-0.5 shrink-0 text-blue-600" />
            <div>
              <span className="font-bold block mb-0.5">Inverter Upgraded for Safety</span>
              Automatically upgraded from {result.originalInverterSize} to {result.inverterSize}.
              <span className="block mt-1 font-bold">+RM {result.upgradeCost?.toLocaleString()} included in price.</span>
            </div>
          </div>
        )}

        {/* Warning if Export > Import */}
        {isExportHigh && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 items-start text-xs text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <span className="font-bold block mb-0.5">Oversized Warning</span>
              New Export ({result.newExportKwh} kWh) exceeds New Import ({result.newImportKwh} kWh). This significantly reduces ROI.
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6 flex-1">
          <div className="flex justify-between text-sm items-center">
            <span className="text-slate-500 font-medium">Monthly Savings</span>
            <span className="font-bold text-emerald-600 text-lg">RM {result.monthlySavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-slate-500 font-medium">New Bill Est.</span>
            <span className="font-bold text-slate-800 text-lg">RM {result.newBillAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-slate-500 font-medium">Payback</span>
            <span className="font-bold text-blue-600">{result.paybackYearsCash.toFixed(1)} - {result.paybackYearsCC.toFixed(1)} Years</span>
          </div>
          <div className="flex justify-between text-[10px] items-center mt-0.5">
            <span className="text-slate-400">Savings after 10yrs</span>
            <span className="font-mono font-bold text-slate-500">RM {(result.monthlySavings + (result.exportCreditValue || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-[10px] items-center mt-0.5">
            <span className="text-slate-400">10 Year Total Net Profit</span>
            <span className="font-mono font-bold text-slate-500">RM {((result.monthlySavings * 120) - result.systemCostCash).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>

          <div className="my-4 border-t border-slate-100"></div>

          <div className="flex justify-between text-sm items-center">
            <span className="text-slate-500">Credit Card Price</span>
            <span className="font-mono font-bold text-slate-800 text-lg">RM {result.systemCostCC.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-slate-500">Installment (36m)</span>
            <span className="font-mono text-slate-500 text-xs">RM {(result.systemCostCC / 36).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</span>
          </div>
          <div className="flex justify-between text-sm mt-1 items-center">
            <span className="text-slate-500 font-bold">Cash Price</span>
            <span className="font-mono font-bold text-emerald-600 text-lg">RM {result.systemCostCash.toLocaleString()}</span>
          </div>
        </div>
      </div>

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

interface ComparisonModalProps {
  data: { name: string; data: RecommendationResult; theme: string; icon: any }[];
  onClose: () => void;
  language: 'zh' | 'en';
  onToggleLanguage: () => void;
  daytimePercent: number;
  currentBill: number;
  usageKwh: number;
  suriaHomeRebate: boolean;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({
  data,
  onClose,
  language,
  onToggleLanguage,
  daytimePercent,
  currentBill,
  usageKwh,
  suriaHomeRebate
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showTenYearSavings, setShowTenYearSavings] = useState(false);
  const [showTenYearGrossSavings, setShowTenYearGrossSavings] = useState(false);
  const [showNewImport, setShowNewImport] = useState(false);
  const [showNewExport, setShowNewExport] = useState(false);

  const handleDownload = async () => {
    if (!tableRef.current) return;

    const original = tableRef.current;

    // Clone the element and attach to body so html2canvas sees it outside
    // the modal's max-height / overflow-y-auto / overflow-hidden ancestors.
    const clone = original.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, {
      position: 'fixed',
      left: '-99999px',
      top: '0px',
      overflow: 'visible',
      width: original.scrollWidth + 'px',
      maxWidth: 'none',
      height: 'auto',
      maxHeight: 'none',
      zIndex: '-1',
      pointerEvents: 'none',
      transform: 'none',
    });
    // Strip overflow clipping from every descendant inside the clone
    clone.querySelectorAll<HTMLElement>('*').forEach(e => {
      e.style.overflow = 'visible';
      e.style.maxHeight = 'none';
    });

    document.body.appendChild(clone);

    // Two animation frames so the browser fully lays out the clone
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));

    const captureW = clone.scrollWidth;
    const captureH = clone.scrollHeight;

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: captureW,
        height: captureH,
        windowWidth: captureW + 200,
        windowHeight: captureH + 200,
        imageTimeout: 15000,
      });

      const link = document.createElement('a');
      link.download = `Solar-Comparison-${new Date().toISOString().slice(0, 10)}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
      alert('Failed to download image. Please try again.');
    } finally {
      document.body.removeChild(clone);
    }
  };

  const getThemeStyles = (theme: string) => {
    switch (theme) {
      case 'emerald': return { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200', highlight: 'text-emerald-600', headerBg: 'bg-emerald-50' };
      case 'cyan': return { bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', highlight: 'text-cyan-600', headerBg: 'bg-cyan-50' };
      case 'purple': return { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', highlight: 'text-purple-600', headerBg: 'bg-purple-50' };
      case 'blue': return { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', highlight: 'text-blue-600', headerBg: 'bg-blue-50' };
      case 'amber': return { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', highlight: 'text-amber-600', headerBg: 'bg-amber-50' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-900', border: 'border-slate-200', highlight: 'text-slate-600', headerBg: 'bg-slate-50' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[min(95dvh,100vh)] sm:max-h-[90vh] rounded-xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden min-h-0">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center bg-slate-50/50 shrink-0">
          <div className="min-w-0 pr-8 sm:pr-0">
            <h3 className="font-bold text-lg sm:text-xl text-slate-800">{language === 'zh' ? '方案对比' : 'Plan Comparison'}</h3>
            <p className="text-xs sm:text-sm text-slate-500 truncate">
              {language === 'zh'
                ? `基于每月 RM${currentBill} 电费 (${usageKwh} kWh)`
                : `Based on RM${currentBill} Bill (${usageKwh} kWh)`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={onToggleLanguage}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs sm:text-sm font-bold transition-colors"
            >
              <Globe size={16} />
              {language === 'zh' ? 'EN' : '中文'}
            </button>
            <button onClick={handleDownload} className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-blue-700 transition-colors">
              <Download size={16} />
              {language === 'zh' ? '下载' : 'Download'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 ml-auto sm:ml-0"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 sm:p-6 bg-slate-100">
          {/* View Options - Moved outside tableRef for image export */}
          <div className="flex flex-wrap gap-x-3 gap-y-2 px-2 py-3 sm:p-4 mb-4 sm:mb-6 text-xs sm:text-sm text-slate-600 bg-white rounded-xl shadow-sm border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
              <input
                type="checkbox"
                checked={showTenYearSavings}
                onChange={(e) => setShowTenYearSavings(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{language === 'zh' ? '显示 10年总净盈利' : 'Show 10 Year Savings'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
              <input
                type="checkbox"
                checked={showTenYearGrossSavings}
                onChange={(e) => setShowTenYearGrossSavings(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{language === 'zh' ? '显示 10年后月节省' : 'Show Savings after 10yrs'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
              <input
                type="checkbox"
                checked={showNewImport}
                onChange={(e) => setShowNewImport(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{language === 'zh' ? '显示 新进口电量' : 'Show New Import'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
              <input
                type="checkbox"
                checked={showNewExport}
                onChange={(e) => setShowNewExport(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>{language === 'zh' ? '显示 新出口电量' : 'Show New Export'}</span>
            </label>
          </div>

          <div ref={tableRef} className="bg-white p-4 sm:p-8 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 w-full max-w-full relative overflow-hidden">
            {/* Watermark/Header for Image Export */}
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 relative z-10 px-0 sm:px-2">
              <div className="min-w-0">
                <img src={`${(import.meta as any).env.BASE_URL}astern_logo.png`} alt="Astern Logo" className="h-16 sm:h-24 md:h-32 lg:h-[180px] w-auto max-w-full mb-2 sm:mb-3 object-contain object-left" />
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1 break-words">{language === 'zh' ? '太阳能方案比较' : 'Solar Plan Comparison'}</h1>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">AI BESS 360 by Astern Technologies</p>
              </div>
              <div className="w-20 sm:w-32 shrink-0 opacity-50 self-end sm:self-auto">
                <img src={`${(import.meta as any).env.BASE_URL}ai_bess_360.png`} alt="AI BESS 360" className="w-full h-auto object-contain" />
              </div>
            </div>

            {/* Inputs for Image Export */}
            <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 px-0 sm:px-2 border-b border-slate-100 pb-6 sm:pb-8">
              <div className="relative min-w-0">
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <User size={12} /> {language === 'zh' ? '销售员' : 'Sales Agent'}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={language === 'zh' ? '输入姓名 (可选)' : 'Enter Name (Optional)'}
                  className="w-full min-w-0 bg-transparent border-b-2 border-slate-300 focus:border-blue-500 outline-none py-2 text-base sm:text-lg text-slate-800 font-bold placeholder:text-slate-300 transition-colors"
                />
              </div>
              <div className="relative min-w-0">
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <Phone size={12} /> {language === 'zh' ? '联系号码' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={language === 'zh' ? '输入号码 (可选)' : 'Enter Phone (Optional)'}
                  className="w-full min-w-0 bg-transparent border-b-2 border-slate-300 focus:border-blue-500 outline-none py-2 text-base sm:text-lg text-slate-800 font-bold placeholder:text-slate-300 transition-colors"
                />
              </div>
            </div>

            <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 overscroll-x-contain touch-pan-x rounded-xl [scrollbar-gutter:stable]">
            <table
              className="w-full text-left border-collapse rounded-xl overflow-hidden shadow-sm text-sm sm:text-base"
              style={{ minWidth: `${Math.max(300, 96 + data.length * 136)}px` }}
            >
              <thead>
                <tr>
                  <th className="p-2 sm:p-4 border-b-2 border-slate-100 text-slate-500 font-bold text-[10px] sm:text-xs uppercase tracking-wider bg-slate-50 align-bottom">
                    {language === 'zh' ? '项目' : 'Feature'}
                  </th>
                  {data.map((item, idx) => {
                    const styles = getThemeStyles(item.theme);
                    const Icon = item.icon || Zap;
                    return (
                      <th key={idx} className={`p-2 sm:p-4 border-t-4 ${styles.bg} ${styles.border.replace('border-', 'border-t-')} align-bottom min-w-[132px] sm:min-w-[180px]`}>
                        <div className={`flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 ${styles.highlight}`}>
                          <Icon size={18} className="shrink-0" />
                          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold opacity-80">
                            {language === 'zh' ? '方案' : 'Plan'} {idx + 1}
                          </span>
                        </div>
                        <div className={`font-bold text-sm sm:text-xl ${styles.text} leading-tight break-words`}>
                          {item.name}
                        </div>
                        <div className="mt-1.5 sm:mt-2">
                          <span className={`inline-block px-1.5 sm:px-2 py-0.5 bg-white ${styles.highlight} border ${styles.border} text-[10px] sm:text-xs rounded-full font-bold uppercase tracking-wide`}>
                            {language === 'zh' ? `节省 ${Math.round(item.data.savedPercentage)}%` : `Save ${Math.round(item.data.savedPercentage)}%`}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {/* Row 1: System Size */}
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="p-2 sm:p-4 font-bold text-slate-400 text-[10px] sm:text-xs uppercase bg-slate-50/30 group-hover:bg-slate-50 transition-colors align-top">
                    {language === 'zh' ? '系统配置' : 'System Size'}
                  </td>
                  {data.map((item, idx) => (
                    <td key={idx} className="p-2 sm:p-4 align-top">
                      <div className="font-bold text-base sm:text-lg text-slate-900">{item.data.panels} {language === 'zh' ? '片电板' : 'Panels'}</div>
                      <div className="text-xs sm:text-sm text-slate-500">{(item.data.panels * PANEL_WATTAGE / 1000).toFixed(2)} kWp</div>
                      {item.data.batteries > 0 ? (
                        <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 text-xs sm:text-sm font-bold text-emerald-600 bg-emerald-50 w-fit max-w-full px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                          <Battery size={14} className="shrink-0" />
                          <span className="break-words">{item.data.batteries} {language === 'zh' ? '粒电池' : 'Battery'}</span>
                        </div>
                      ) : (
                        <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-400 italic flex items-center gap-1.5 opacity-60">
                          <Battery size={14} />
                          {language === 'zh' ? '无电池' : 'No Battery'}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Row 2: Monthly Savings (Highlighted) */}
                <tr className="bg-slate-50/50 border-y border-slate-100">
                  <td className="p-2 sm:p-4 font-bold text-slate-400 text-[10px] sm:text-xs uppercase bg-slate-100/50 align-top">
                    {language === 'zh' ? '每月节省' : 'Monthly Savings'}
                  </td>
                  {data.map((item, idx) => {
                    const styles = getThemeStyles(item.theme);
                    return (
                      <td key={idx} className={`p-2 sm:p-4 align-top ${styles.bg} bg-opacity-30`}>
                        <div className={`text-xl sm:text-2xl font-black tabular-nums ${styles.highlight}`}>
                          RM {Math.round(item.data.monthlySavings).toLocaleString()}
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                          <CheckCircle2 size={12} className="text-slate-400 shrink-0" />
                          <span>
                            {language === 'zh' ? '安装后预计电费: ' : 'Expected Bill After Solar: '}
                            <strong>RM {Math.round(item.data.newBillAmount).toLocaleString()}</strong>
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Optional Row: Savings after 10yrs (No Export) - Moved here requested */}
                {showTenYearGrossSavings && (
                  <tr className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-2 sm:p-4 font-bold text-slate-400 text-[10px] sm:text-xs uppercase bg-slate-50/30 group-hover:bg-slate-50 transition-colors align-top">
                      {language === 'zh' ? '10年后月节省' : 'Savings after 10yrs'}
                    </td>
                    {data.map((item, idx) => {
                      // Logic: Monthly Savings - Export Credit (since exportCredit is negative, we add it)
                      const savingsNoExport = item.data.monthlySavings + (item.data.exportCreditValue || 0);

                      return (
                        <td key={idx} className="p-2 sm:p-4 align-top">
                          <div className="text-base sm:text-lg font-bold text-emerald-600 tabular-nums">
                            RM {savingsNoExport.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-medium">
                            {language === 'zh' ? '(无出口回扣)' : '(No Export Credit)'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )}

                {/* Row 3: Payback */}
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="p-2 sm:p-4 font-bold text-slate-400 text-[10px] sm:text-xs uppercase bg-slate-50/30 group-hover:bg-slate-50 transition-colors align-top">
                    {language === 'zh' ? '回本期' : 'ROI Period'}
                  </td>
                  {data.map((item, idx) => (
                    <td key={idx} className="p-2 sm:p-4 align-top">
                      <div className="text-base sm:text-lg font-bold text-slate-700 tabular-nums">
                        {item.data.paybackYearsCash.toFixed(1)} - {item.data.paybackYearsCC.toFixed(1)} {language === 'zh' ? '年' : 'Years'}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* New Row: 10 Year Net Profit */}
                {showTenYearSavings && (
                  <tr className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-2 sm:p-4 font-bold text-slate-400 text-[10px] sm:text-xs uppercase bg-slate-50/30 group-hover:bg-slate-50 transition-colors align-top">
                      {language === 'zh' ? '10年总净盈利' : '10 Year Total Net Profit'}
                    </td>
                    {data.map((item, idx) => {
                      const profit = (item.data.monthlySavings * 12 * 10) - item.data.systemCostCash;
                      return (
                        <td key={idx} className="p-2 sm:p-4 align-top">
                          <div className="text-base sm:text-lg font-bold text-emerald-600 tabular-nums">
                            RM {profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )}



                {/* Optional Row: New Import */}
                {showNewImport && (
                  <tr className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-2 sm:p-4 font-bold text-slate-400 text-[10px] sm:text-xs uppercase bg-slate-50/30 group-hover:bg-slate-50 transition-colors align-top">
                      {language === 'zh' ? '新进口电量' : 'New Import'}
                    </td>
                    {data.map((item, idx) => (
                      <td key={idx} className="p-2 sm:p-4 align-top">
                        <div className="text-xs sm:text-sm font-bold text-slate-700 tabular-nums">
                          {item.data.newImportKwh.toLocaleString()} kWh
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* Optional Row: New Export */}
                {showNewExport && (
                  <tr className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-2 sm:p-4 font-bold text-slate-400 text-[10px] sm:text-xs uppercase bg-slate-50/30 group-hover:bg-slate-50 transition-colors align-top">
                      {language === 'zh' ? '新出口电量' : 'New Export'}
                    </td>
                    {data.map((item, idx) => (
                      <td key={idx} className="p-2 sm:p-4 align-top">
                        <div className="text-xs sm:text-sm font-bold text-slate-700 tabular-nums">
                          {item.data.newExportKwh.toLocaleString()} kWh
                        </div>
                      </td>
                    ))}
                  </tr>
                )}

                {/* Row 4: Pricing */}
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="p-2 sm:p-4 font-bold text-slate-400 text-[10px] sm:text-xs uppercase bg-slate-50/30 align-top pt-4 sm:pt-6 group-hover:bg-slate-50 transition-colors">
                    {language === 'zh' ? '价格详情' : 'Price Details'}
                  </td>
                  {data.map((item, idx) => {
                    const ccAfter = item.data.systemCostCC;
                    const cashAfter = item.data.systemCostCash;
                    const rebateAmt = item.data.suriaRebate ?? 3000;
                    const ccBefore = suriaHomeRebate ? ccAfter + rebateAmt : ccAfter;
                    const cashBefore = suriaHomeRebate ? cashAfter + rebateAmt : cashAfter;
                    return (
                      <td key={idx} className="p-2 sm:p-4 align-top">
                        <div className="space-y-3 sm:space-y-4">
                          {/* Installment Price */}
                          <div>
                            <div className="text-[10px] uppercase text-slate-400 font-bold mb-0.5">
                              {language === 'zh' ? '系统价格' : 'Installment Price'}
                            </div>
                            {suriaHomeRebate && (
                              <div className="text-sm text-slate-400 line-through tabular-nums">RM {ccBefore.toLocaleString()}</div>
                            )}
                            <div className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">RM {ccAfter.toLocaleString()}</div>
                            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">RM {Math.round(ccAfter / 36).toLocaleString()} / {language === 'zh' ? '月' : 'mo'} (36{language === 'zh' ? '期' : 'm'})</div>
                          </div>

                          {/* Cash Price */}
                          <div className="pt-2 sm:pt-3 border-t border-slate-200">
                            <div className="text-[10px] uppercase text-emerald-600 font-bold mb-0.5">
                              {language === 'zh' ? '现金优惠价' : 'Cash Price'}
                            </div>
                            {suriaHomeRebate && (
                              <div className="text-sm text-slate-400 line-through tabular-nums">RM {cashBefore.toLocaleString()}</div>
                            )}
                            <div className="text-base sm:text-lg font-bold text-emerald-600 tabular-nums">RM {cashAfter.toLocaleString()}</div>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
            </div>

            {suriaHomeRebate && (
              <div className="mt-4 sm:mt-6 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-[11px] sm:text-xs text-emerald-800 leading-relaxed">
                <Info size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {language === 'zh'
                    ? `以上价格已包含 SuRIA Home 政府津贴。该津贴将由 TNB 直接转账至客户银行账户。`
                    : `Prices shown are after the SuRIA Home government rebate. The rebate will be transferred directly to the client's bank account by TNB.`}
                </span>
              </div>
            )}

            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200 flex flex-col gap-1 text-slate-400 text-[11px] sm:text-xs px-0 sm:px-2">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-blue-500" />
                <span>
                  {language === 'zh'
                    ? `基于原账单 RM ${currentBill.toLocaleString()} / ${usageKwh.toLocaleString()} kWh 用量`
                    : `Based on RM ${currentBill.toLocaleString()} Bill / ${usageKwh.toLocaleString()} kWh Usage`
                  }
                </span>
              </div>
              <div className="pl-6">
                {language === 'zh'
                  ? `假设 ${daytimePercent}% 白天用量`
                  : `Assuming ${daytimePercent}% daytime usage`
                }
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-6 text-[10px] text-slate-400 text-center leading-relaxed max-w-2xl mx-auto italic border-t border-slate-100 pt-4">
              {language === 'zh'
                ? '免责声明：上述计算结果是基于一般情况的理论估算值。实际节省金额可能会受到天气、阴影遮挡、屋顶朝向、实际用电模式以及电费费率调整等因素的影响而有所不同。'
                : 'Disclaimer: The figures above are based on theoretical calculations and average usage scenarios. Actual savings may vary depending on weather conditions, shading, roof orientation, actual consumption patterns, tariff rate changes, etc.'}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors"
          >
            {language === 'zh' ? '关闭' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
