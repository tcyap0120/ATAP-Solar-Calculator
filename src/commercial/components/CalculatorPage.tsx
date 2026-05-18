import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../CommercialSolarShell';
import { CalculationResult, ProposedPlan } from '../types';
import { AlertTriangle, DollarSign, Zap, ChevronDown, Edit3, Save, Lock, Share2, TrendingUp, Sun, BatteryCharging, Gauge, Wand2, CheckCircle2, Activity, Receipt, ArrowRight, ArrowDown, CalendarX, RotateCcw, Wrench, Info, Sliders, ChevronUp, PanelTop, Table2, Download, Battery, FileText, Banknote, Clock, Moon } from 'lucide-react';
import WhatsAppModal from './WhatsAppModal';
import { DEFAULT_SESSION } from '../constants';
import { getOversizingRatio, UNLIMITED_MAX_INVERTER_DEFAULT_KW } from '../utils/meterHelpers';
import { useNavigate } from 'react-router-dom';

const SOLIS_SIZES = [4, 5, 6, 8, 10, 12, 15, 20, 30, 36, 40, 50, 60, 100];
const HUAWEI_SIZES = [4, 5, 6, 8, 10, 12, 15, 20, 30, 36, 40, 50, 100];

// Helper: PMT Formula
const calculatePMT = (rate: number, nper: number, pv: number) => {
    if (rate === 0) return pv / nper;
    const pvif = Math.pow(1 + rate, nper);
    return (rate * pv * pvif) / (pvif - 1);
};

interface CashflowRow {
  year: number;
  gen: number;
  tariff: number;
  billSavings: number;
  caTaxSaving: number;
  gita: number;
  opex: number;
  totalSavings: number;
  accumulated: number;
  installment?: number;
}

// --- TIME INPUT COMPONENT ---
interface TimeInputProps {
    value: number; // Decimal hours (e.g. 9.5 = 9:30)
    onChange: (val: number) => void;
    isEndTime?: boolean;
}

const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, isEndTime = false }) => {
    // Parse helper
    const parseTime = (val: number) => {
        const isNextDay = val >= 24;
        const normalizedValue = val % 24;
        const h24 = Math.floor(normalizedValue);
        const m = Math.round((normalizedValue - h24) * 60);
        
        const ampm = h24 >= 12 ? 'PM' : 'AM';
        let h12 = h24 % 12;
        if (h12 === 0) h12 = 12;
        
        return { h12, m, ampm, isNextDay };
    };

    const parsed = useMemo(() => parseTime(value), [value]);

    // Local state for inputs to allow flexible typing (clearing, partials)
    const [localH, setLocalH] = useState<string>(parsed.h12.toString());
    const [localM, setLocalM] = useState<string>(parsed.m < 10 ? `0${parsed.m}` : parsed.m.toString());
    
    // Sync local state with prop value (only if effectively different to prevent cursor jumps)
    useEffect(() => {
        const curH = parseInt(localH);
        if (isNaN(curH) || curH !== parsed.h12) {
             setLocalH(parsed.h12.toString());
        }
        
        const curM = parseInt(localM);
        if (isNaN(curM) || curM !== parsed.m) {
             setLocalM(parsed.m < 10 ? `0${parsed.m}` : parsed.m.toString());
        }
    }, [parsed]);

    const updateParent = (hStr: string, mStr: string, ap: string, nd: boolean) => {
        const h = parseInt(hStr) || 0;
        const m = parseInt(mStr) || 0;

        // Convert to 24h decimal
        let h24 = 0;
        if (ap === 'AM') {
            h24 = h === 12 ? 0 : h;
        } else {
            h24 = h === 12 ? 12 : h + 12;
        }

        let total = h24 + (m / 60);
        
        // Handle Next Day
        if (isEndTime && nd) {
            total += 24;
        }
        
        onChange(total);
    };

    const handleHChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalH(val);
        const h = parseInt(val);
        // Only update parent if valid hour
        if (!isNaN(h) && h >= 1 && h <= 12) {
            updateParent(val, localM, parsed.ampm, parsed.isNextDay);
        }
    };

    const handleMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalM(val);
        const m = parseInt(val);
        // Only update parent if valid minute
        if (!isNaN(m) && m >= 0 && m <= 59) {
            updateParent(localH, val, parsed.ampm, parsed.isNextDay);
        }
    };

    const handleAMPMChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateParent(localH, localM, e.target.value, parsed.isNextDay);
    };
    
    const handleNextDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateParent(localH, localM, parsed.ampm, e.target.checked);
    };

    return (
        <div className="flex items-center gap-2 w-full">
            {/* Hour */}
            <div className="relative flex-1">
                <input 
                    type="number" 
                    min="1" max="12"
                    value={localH}
                    onChange={handleHChange}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-1 py-3 text-center text-white font-bold outline-none focus:bg-white/20 text-lg appearance-none"
                    placeholder="HH"
                />
            </div>
            <span className="text-white font-bold text-lg mb-1">:</span>
            {/* Minute */}
            <div className="relative flex-1">
                <input 
                    type="number" 
                    min="0" max="59" step="15"
                    value={localM}
                    onChange={handleMChange}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-1 py-3 text-center text-white font-bold outline-none focus:bg-white/20 text-lg appearance-none"
                    placeholder="MM"
                    list={`mins-list-${isEndTime ? 'end' : 'start'}`}
                />
                <datalist id={`mins-list-${isEndTime ? 'end' : 'start'}`}>
                    <option value="00"></option>
                    <option value="15"></option>
                    <option value="30"></option>
                    <option value="45"></option>
                </datalist>
            </div>
            {/* AM/PM */}
            <div className="relative flex-1">
                <select 
                    value={parsed.ampm}
                    onChange={handleAMPMChange}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-1 py-3 text-center text-white font-bold outline-none focus:bg-white/20 text-base appearance-none cursor-pointer"
                >
                    <option value="AM" className="text-slate-800">AM</option>
                    <option value="PM" className="text-slate-800">PM</option>
                </select>
            </div>
            {/* Next Day Checkbox (End Time Only) */}
            {isEndTime && (
                <label className="flex items-center justify-center shrink-0 cursor-pointer ml-1 select-none group h-full" title="End time is the next day">
                    <input 
                        type="checkbox"
                        checked={parsed.isNextDay}
                        onChange={handleNextDayChange}
                        className="hidden"
                    />
                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${parsed.isNextDay ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white/5 border-white/20 text-white/30 group-hover:border-white/40'}`}>
                         <Moon size={16} fill={parsed.isNextDay ? "currentColor" : "none"} />
                    </div>
                </label>
            )}
        </div>
    );
};


const CalculatorPage: React.FC = () => {
  const { settings, brands, meters, calculatorSession, updateCalculatorSession, updateQuotationDraft } = useAppContext();
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);

  // --- Context-Based State Setters Helpers ---
  const setSelectedMeterId = (val: string) => updateCalculatorSession(prev => ({...prev, selectedMeterId: val}));
  const setSelectedBrandId = (val: string) => updateCalculatorSession(prev => ({...prev, selectedBrandId: val}));
  const setKwpValue = (val: string) => updateCalculatorSession(prev => ({...prev, kwpValue: val}));
  const setPanelsValue = (val: string) => updateCalculatorSession(prev => ({...prev, panelsValue: val}));
  const setInverterSize = (val: string) => updateCalculatorSession(prev => ({...prev, inverterSize: val}));
  const setSelectedTariffGroupId = (val: string) => updateCalculatorSession(prev => ({...prev, selectedTariffGroupId: val}));
  const setBillAmount = (val: string) => updateCalculatorSession(prev => ({...prev, billAmount: val}));
  const setTargetKwh = (val: string) => updateCalculatorSession(prev => ({...prev, targetKwh: val}));
  const setRoofLimit = (val: string) => updateCalculatorSession(prev => ({...prev, roofLimit: val}));
  const setNoLoadDays = (val: string) => updateCalculatorSession(prev => ({...prev, noLoadDays: val}));
  const setOpStartHour = (val: number) => updateCalculatorSession(prev => ({...prev, opStartHour: val}));
  const setOpEndHour = (val: number) => updateCalculatorSession(prev => ({...prev, opEndHour: val}));
  const setActiveStrategy = (val: 'custom' | 'max_savings' | 'daytime_coverage' | 'bess_coverage') => updateCalculatorSession(prev => ({...prev, activeStrategy: val}));
  const setProposedPlans = (val: ProposedPlan[] | null) => updateCalculatorSession(prev => ({...prev, proposedPlans: val}));
  const setShowBillDetails = (val: boolean) => updateCalculatorSession(prev => ({...prev, showBillDetails: val}));
  const setShowSavingsDetails = (val: boolean) => updateCalculatorSession(prev => ({...prev, showSavingsDetails: val}));
  const setHasDefaultedMeter = (val: boolean) => updateCalculatorSession(prev => ({...prev, hasDefaultedMeter: val}));
  const setBatteryCount = (val: number) => updateCalculatorSession(prev => ({...prev, batteryCount: val}));

  // Local UI State
  const [isWAModalOpen, setIsWAModalOpen] = useState(false);
  const [showCashflow, setShowCashflow] = useState(false);
  const [showInstallmentTable, setShowInstallmentTable] = useState(false);
  
  // Destructure for easy access
  const { 
      selectedMeterId, selectedBrandId, kwpValue, panelsValue, inverterSize,
      selectedTariffGroupId, billAmount, targetKwh, roofLimit, noLoadDays,
      opStartHour, opEndHour, activeStrategy, proposedPlans, 
      showBillDetails, showSavingsDetails, hasDefaultedMeter, batteryCount
  } = calculatorSession;

  // Resolved Objects
  const selectedMeter = meters.find(m => m.id === selectedMeterId);
  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  // --- Fix invalid / legacy meter id (e.g. after reducing meter list to two types) ---
  useEffect(() => {
    if (meters.length === 0) return;
    if (!selectedMeterId || !meters.some(m => m.id === selectedMeterId)) {
      setSelectedMeterId(meters[0].id);
    }
  }, [meters, selectedMeterId]);

  // --- Init Defaults if empty ---
  useEffect(() => {
      if (!selectedTariffGroupId && settings.tariffGroups && settings.tariffGroups.length > 0) {
          setSelectedTariffGroupId(settings.tariffGroups[0].id);
      }
      if (!selectedMeterId && meters.length > 0) {
          setSelectedMeterId(meters[0].id);
      }
      if (!selectedBrandId && brands.length > 0) {
          setSelectedBrandId(brands[0].id);
      }
      if (inverterSize === '0' && meters.length > 0 && selectedMeterId) {
          const m = meters.find(meter => meter.id === selectedMeterId);
          if (m) {
               const inv = m.maxInverterKw > 0 ? m.maxInverterKw : UNLIMITED_MAX_INVERTER_DEFAULT_KW;
               setInverterSize(inv.toString());
          }
      }
  }, [settings.tariffGroups, selectedTariffGroupId, selectedMeterId, selectedBrandId, meters, brands]);

  // --- Helpers ---
  const formatTime = (decimalTime: number) => {
    const isNextDay = decimalTime >= 24;
    const val = decimalTime % 24;
    
    const h = Math.floor(val);
    const m = Math.round((val - h) * 60);
    const mStr = m < 10 ? `0${m}` : m;
    
    const ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    
    return `${h12}:${mStr} ${ampm}${isNextDay ? ' (+1 Day)' : ''}`;
  };

  // --- Logic: Bill & kWh Sync ---
  const getActiveTariffGroup = () => {
      return (settings.tariffGroups || []).find(g => g.id === selectedTariffGroupId);
  };

  // --- Effect: Auto-Calculate Target kWh on Mount if Default Bill exists ---
  useEffect(() => {
    if (billAmount && billAmount !== '0' && !targetKwh) {
       const rm = parseFloat(billAmount);
       const group = getActiveTariffGroup();
       const rate = group ? group.rate : settings.tariffRate;
       const kwtbbPct = group ? group.kwtbbPct : (settings.kwtbb * 100);
       
       if (!isNaN(rm) && rm >= 20) {
          const k = kwtbbPct / 100;
          const energyCharge = (rm - 20) / (1 + k);
          const kwh = energyCharge / rate;
          setTargetKwh(kwh.toFixed(0));
       }
    }
  }, []);

  const handleBillChange = (val: string) => {
      setBillAmount(val);
      const rm = parseFloat(val);
      const group = getActiveTariffGroup();
      
      const rate = group ? group.rate : settings.tariffRate;
      const kwtbbPct = group ? group.kwtbbPct : (settings.kwtbb * 100);
      
      if (!isNaN(rm)) {
          if (rm < 20) {
              setTargetKwh('0');
              return;
          }
          const k = kwtbbPct / 100;
          const energyCharge = (rm - 20) / (1 + k);
          const kwh = energyCharge / rate;
          setTargetKwh(kwh.toFixed(0));
      } else {
          setTargetKwh('');
      }
  };

  const handleKwhChange = (val: string) => {
      setTargetKwh(val);
      const kwh = parseFloat(val);
      const group = getActiveTariffGroup();

      const rate = group ? group.rate : settings.tariffRate;
      const kwtbbPct = group ? group.kwtbbPct : (settings.kwtbb * 100);

      if (!isNaN(kwh)) {
          const energyCharge = kwh * rate;
          const k = kwtbbPct / 100;
          const total = energyCharge * (1 + k) + 20;
          setBillAmount(total.toFixed(2));
      } else {
          setBillAmount('');
      }
  };

  const handleManualPanelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPanelsValue(val);
    const p = parseFloat(val);
    if (!isNaN(p)) {
         setKwpValue((p * settings.panelRating).toFixed(2));
    } else {
         setKwpValue('0');
    }
    // Switch to custom strategy when user manually edits
    setActiveStrategy('custom');
    // DO NOT clear proposedPlans here to keep the buttons visible
  }

  // --- Effect: Handle Meter Defaulting (Only if fresh start/reset) ---
  useEffect(() => {
     if ((!billAmount || billAmount === '0') && !hasDefaultedMeter) {
        const meter = meters.find(m => m.id === selectedMeterId);
        if (meter) {
            const newInverterKw = meter.maxInverterKw > 0 ? meter.maxInverterKw : UNLIMITED_MAX_INVERTER_DEFAULT_KW;
            setInverterSize(newInverterKw.toString());
            
            const oversizing = getOversizingRatio(settings, batteryCount);
            const maxDc = newInverterKw * oversizing;
            let maxPanels = Math.floor(maxDc / settings.panelRating);
            
            if (roofLimit && parseFloat(roofLimit) > 0) {
                 const roofMax = parseFloat(roofLimit);
                 if (roofMax < maxPanels) {
                     maxPanels = roofMax;
                 }
            }
            
            setPanelsValue(maxPanels.toString());
            setKwpValue((maxPanels * settings.panelRating).toFixed(2));
            setHasDefaultedMeter(true);
        }
     }
  }, [selectedMeterId, meters, settings, billAmount, hasDefaultedMeter, roofLimit, batteryCount]);

  // --- Effect: Update Inverter Size if Meter changes (User Action) ---
  const handleMeterChange = (newMeterId: string) => {
      setSelectedMeterId(newMeterId);
      const meter = meters.find(m => m.id === newMeterId);
      if (meter) {
          const invKw = meter.maxInverterKw > 0 ? meter.maxInverterKw : UNLIMITED_MAX_INVERTER_DEFAULT_KW;
          setInverterSize(invKw.toString());
          if (!billAmount || billAmount === '0') {
                const oversizing = getOversizingRatio(settings, batteryCount);
                const maxDc = invKw * oversizing;
                let maxPanels = Math.floor(maxDc / settings.panelRating);
                if (roofLimit && parseFloat(roofLimit) > 0) {
                     maxPanels = Math.min(maxPanels, parseFloat(roofLimit));
                }
                setPanelsValue(maxPanels.toString());
                setKwpValue((maxPanels * settings.panelRating).toFixed(2));
                setActiveStrategy('custom');
          }
      }
  }

  // --- Effect: Auto-update Inverter Size when System Size or Brand changes ---
  useEffect(() => {
    const kwp = parseFloat(kwpValue);
    if (isNaN(kwp) || kwp <= 0) return;

    const brand = brands.find(b => b.id === selectedBrandId);
    if (!brand) return;

    const meter = meters.find(m => m.id === selectedMeterId);
    const oversizing = getOversizingRatio(settings, batteryCount);
    const minAcRequired = kwp / oversizing;
    let recommendedSize = 0;

    const cleanBrandName = brand.name.split('(')[0].trim().toLowerCase();

    if (cleanBrandName.includes('solis')) {
        const size = SOLIS_SIZES.find(s => s >= minAcRequired);
        recommendedSize = size || SOLIS_SIZES[SOLIS_SIZES.length - 1];
    } else if (cleanBrandName.includes('huawei')) {
        const maxSingle = Math.max(...HUAWEI_SIZES);
        if (minAcRequired <= maxSingle) {
            recommendedSize = HUAWEI_SIZES.find(s => s >= minAcRequired) || maxSingle;
        } else {
            const countMax = Math.floor(minAcRequired / maxSingle);
            const remainder = minAcRequired % maxSingle;
            let remainderSize = 0;
            if (remainder > 0) {
                remainderSize = HUAWEI_SIZES.find(s => s >= remainder) || 0;
            }
            recommendedSize = (countMax * maxSingle) + remainderSize;
        }
    } else {
        // Fallback for GoodWe or others: just match AC to DC/oversizing
        recommendedSize = Math.ceil(minAcRequired);
    }

    if (meter && meter.maxInverterKw > 0) {
        recommendedSize = Math.min(recommendedSize, meter.maxInverterKw);
    }

    if (recommendedSize.toString() !== inverterSize) {
        setInverterSize(recommendedSize.toString());
    }
  }, [kwpValue, selectedBrandId, selectedMeterId, settings, batteryCount]);


  // --- Logic: Time-Based Overlap Calculation (ROI Perspective) ---
  const calculateSelfConsumptionRatio = () => {
       const solarStart = settings.solarStartHour || 10;
       const solarEnd = settings.solarEndHour || 17;
       const solarDuration = solarEnd - solarStart;

       const overlapStart = Math.max(solarStart, opStartHour);
       const overlapEnd = Math.min(solarEnd, opEndHour);
       
       let overlapDuration = 0;
       if (overlapEnd > overlapStart) {
           overlapDuration = overlapEnd - overlapStart;
       }
       
       if (solarDuration <= 0) return 0;
       let ratio = overlapDuration / solarDuration;
       if (ratio > 1) ratio = 1;
       if (ratio < 0) ratio = 0;
       
       return ratio;
  }

  // --- Logic: Auto Recommend ---
  const handleRecommend = () => {
    if (!billAmount || parseFloat(billAmount) <= 0) return;

    const targetBill = parseFloat(billAmount);
    const consumptionKwh = parseFloat(targetKwh) || 0;
    
    // Use Global Settings directly
    const sunHours = settings.sunHours;
    const exportRate = settings.exportRate || 0.20;
    const daysNoLoad = parseFloat(noLoadDays) || 0;
    
    // Use Tariff Group Settings, with Fallback
    const activeGroup = getActiveTariffGroup();
    const tariff = activeGroup ? activeGroup.rate : settings.tariffRate;
    const kwtbbPercent = activeGroup ? activeGroup.kwtbbPct : (settings.kwtbb * 100);

    // Effective Rate
    const effectiveImportTariff = tariff * (1 + (kwtbbPercent / 100));
    const selfConsumedRatio = calculateSelfConsumptionRatio();
    
    // Adjust weighted rate for No Load Days
    const activeDays = 30 - daysNoLoad;
    const activeWeight = activeDays / 30;
    const noLoadWeight = daysNoLoad / 30;
    
    // Average Return per kWh generated (For Plan A: Max Savings)
    const returnOnActiveDay = (selfConsumedRatio * effectiveImportTariff) + ((1 - selfConsumedRatio) * exportRate);
    const returnOnNoLoadDay = exportRate; // 100% Export
    const weightedRate = (returnOnActiveDay * activeWeight) + (returnOnNoLoadDay * noLoadWeight);
    
    // Constraints
    const currentInverterKw = parseFloat(inverterSize) || 0;
    
    let maxAllowedPanelsNoBatt = Infinity;
    let maxAllowedPanelsWithBatt = Infinity;
    const oversNo = getOversizingRatio(settings, 0);
    const oversYes = getOversizingRatio(settings, 1);

    if (selectedMeter && selectedMeter.limitKwac < 90000) {
        const constraintKw = selectedMeter.maxInverterKw > 0 ? selectedMeter.maxInverterKw : currentInverterKw;
        maxAllowedPanelsNoBatt = Math.floor((constraintKw * oversNo) / settings.panelRating);
        maxAllowedPanelsWithBatt = Math.floor((constraintKw * oversYes) / settings.panelRating);
    }

    const roofMaxPanels = roofLimit && parseFloat(roofLimit) > 0 ? parseFloat(roofLimit) : Infinity;
    const absoluteMaxPanelsA = Math.min(maxAllowedPanelsNoBatt, roofMaxPanels);
    const absoluteMaxPanelsB = Math.min(maxAllowedPanelsNoBatt, roofMaxPanels);
    const absoluteMaxPanelsC = Math.min(maxAllowedPanelsWithBatt, roofMaxPanels);

    const calcPlanDetails = (kwp: number, battCount: number = 0) => {
        const annualGen = kwp * sunHours * 30 * 12;
        const monthlyGen = annualGen / 12;
        const monthlyRevenue = monthlyGen * weightedRate; 
        
        let cost = 0;
        let brandToUse = brands.find(b => b.id === selectedBrandId);
        if (battCount > 0) {
            brandToUse = brands.find(b => b.id === 'goodwe') || brands[0];
        }

        if (brandToUse) {
             const tier = brandToUse.pricingTiers.find(t => kwp >= t.minKw && kwp < t.maxKw) 
              || brandToUse.pricingTiers[brandToUse.pricingTiers.length - 1];
             if(tier) cost = (tier.pricePerKw * kwp) + tier.baseFee;
        }

        if (battCount > 0 && settings.battery) {
            cost += battCount * (settings.battery.pricePerUnit ?? 8200);
        }

        return {
            kwp,
            panels: Math.round(kwp / settings.panelRating),
            estOffset: monthlyRevenue, 
            hasExcess: monthlyGen > consumptionKwh,
            cost
        }
    };

    // PLAN A: MAX SAVINGS
    const monthlyGenPerKwp = sunHours * 30;
    const monthlyRevenuePerKwp = monthlyGenPerKwp * weightedRate;
    const requiredKwpA = targetBill / monthlyRevenuePerKwp;
    const requiredPanelsA = Math.ceil(requiredKwpA / settings.panelRating);
    const finalPanelsA = Math.min(requiredPanelsA, absoluteMaxPanelsA);
    const planACandidate = calcPlanDetails(finalPanelsA * settings.panelRating);
    // If one fewer panel achieves the same rounded monthly savings, prefer the cheaper option
    const planALower = finalPanelsA > 1 ? calcPlanDetails((finalPanelsA - 1) * settings.panelRating) : null;
    const planA = (planALower && Math.round(planALower.estOffset) >= Math.round(planACandidate.estOffset))
        ? planALower
        : planACandidate;

    // PLAN B: DAYTIME COVERAGE
    const safeActiveDays = activeDays > 0 ? activeDays : 1;
    const adc = consumptionKwh / safeActiveDays;
    const solarStart = settings.solarStartHour || 10;
    const solarEnd = settings.solarEndHour || 17;
    const overlapStart = Math.max(solarStart, opStartHour);
    const overlapEnd = Math.min(solarEnd, opEndHour);
    const overlapDuration = Math.max(0, overlapEnd - overlapStart);
    // FIX: Using opEndHour and opStartHour from state
    const opDuration = Math.max(1, opEndHour - opStartHour);
    const loadSolarRatio = overlapDuration / opDuration;
    const cbs = adc * loadSolarRatio;
    const requiredPanelsB = Math.ceil(cbs / sunHours / settings.panelRating);
    const finalPanelsB = Math.min(requiredPanelsB, absoluteMaxPanelsB);
    const planB = calcPlanDetails(finalPanelsB * settings.panelRating);

    // PLAN C: BESS COVERAGE
    const battSettings = settings.battery || { capacityKwh: 16, usableRatio: 0.9, pricePerUnit: 8200, maxCount: 4 };
    const effectiveBattCap = battSettings.capacityKwh * battSettings.usableRatio; 
    const maxStorable = effectiveBattCap * battSettings.maxCount;
    
    // Calculate total duration that is NOT direct solar overlap (Includes both pre-solar morning and post-solar night)
    const nonSolarDuration = Math.max(0, opDuration - overlapDuration);
    const cbbRatio = nonSolarDuration / opDuration;
    let cbb = adc * cbbRatio;
    
    if (cbb > maxStorable) {
        cbb = maxStorable;
    }
    
    const totalDailyLoadToCover = cbs + cbb;
    const requiredKwpC = totalDailyLoadToCover / sunHours;
    const requiredPanelsC = Math.ceil(requiredKwpC / settings.panelRating);
    const finalPanelsC = Math.min(requiredPanelsC, absoluteMaxPanelsC);
    
    let requiredBattQty = Math.ceil(cbb / effectiveBattCap);
    if (requiredBattQty > battSettings.maxCount) requiredBattQty = battSettings.maxCount;
    if (cbb <= 0) requiredBattQty = 0;

    const planC = calcPlanDetails(finalPanelsC * settings.panelRating, requiredBattQty);

    const plans: ProposedPlan[] = [
        {
            type: 'max_savings',
            label: 'Max Savings',
            panels: planA.panels,
            kwp: planA.kwp,
            estOffset: planA.estOffset,
            hasExcess: planA.hasExcess,
            cost: planA.cost,
            batteryCount: 0
        },
        {
            type: 'daytime_coverage',
            label: 'Daytime Coverage',
            panels: planB.panels,
            kwp: planB.kwp,
            estOffset: planB.estOffset,
            hasExcess: false,
            cost: planB.cost,
            batteryCount: 0
        },
        {
            type: 'bess_coverage',
            label: 'BESS Coverage',
            panels: planC.panels,
            kwp: planC.kwp,
            estOffset: planC.estOffset,
            hasExcess: false,
            cost: planC.cost,
            batteryCount: requiredBattQty
        }
    ];

    setProposedPlans(plans);
    // Re-apply the strategy the user already chose (e.g. BESS); do not always reset to Daytime Coverage.
    const planTypes: ProposedPlan['type'][] = ['max_savings', 'daytime_coverage', 'bess_coverage'];
    const strategy = activeStrategy;
    const preferred =
      strategy !== 'custom' && planTypes.includes(strategy)
        ? plans.find((p) => p.type === strategy)
        : undefined;
    applyPlan(preferred ?? plans[1]);
  };

  // --- Effect: Auto-Recommend when inputs change ---
  // Do not depend on batteryCount: manual battery edits must not re-run recommend (which applies Daytime Coverage and resets battery to 0).
  useEffect(() => {
     if (!billAmount || billAmount === '0') return; 
     const timer = setTimeout(() => {
         handleRecommend();
     }, 500);
     return () => clearTimeout(timer);
  }, [
    billAmount,
    targetKwh,
    selectedMeterId,
    selectedTariffGroupId,
    opStartHour,
    opEndHour,
    noLoadDays,
    roofLimit,
    settings,
    brands,
  ]);

  const applyPlan = (plan: ProposedPlan) => {
     setPanelsValue(plan.panels.toString());
     setKwpValue(plan.kwp.toFixed(2));
     setActiveStrategy(plan.type);
     
     const batQty = plan.batteryCount || 0;
     setBatteryCount(batQty);
     
     let newBrandId = selectedBrandId;
     
     if (batQty > 0) {
         newBrandId = 'goodwe';
         setSelectedBrandId('goodwe');
     } else {
        if (settings.brandRules && settings.brandRules.length > 0) {
            const matchingRule = settings.brandRules.find(r => plan.kwp >= r.minKwp && plan.kwp < r.maxKwp);
            if (matchingRule) {
                const brandExists = brands.some(b => b.id === matchingRule.brandId);
                if (brandExists) {
                    newBrandId = matchingRule.brandId;
                    if (newBrandId !== selectedBrandId) {
                        setSelectedBrandId(newBrandId);
                    }
                }
            }
        }
    }

    // Inverter size is handled by the useEffect watching kwpValue and brand
  }
  
  const handleResetSession = () => {
      if(window.confirm("Reset all inputs?")) {
          // Explicitly reset everything to the requested defaults
          updateCalculatorSession({
              ...DEFAULT_SESSION,
              billAmount: '0',
              targetKwh: '0',
              selectedMeterId: 'three_phase',
              selectedBrandId: brands[0]?.id || '',
              selectedTariffGroupId: settings.tariffGroups?.[0]?.id || '',
              noLoadDays: '0',
              roofLimit: '',
              inverterSize: '0',
              panelsValue: '',
              kwpValue: '',
              proposedPlans: null,
              batteryCount: 0,
              hasDefaultedMeter: false // Allow meter defaulting to run again
          });
          setShowCashflow(false);
          setShowInstallmentTable(false);
      }
  }
  
  const handleCreateQuotation = () => {
      if (!result) return;
      
      const cleanBrandName = selectedBrand?.name.replace(/\s*\(.*?\)\s*/g, '').trim() || '';
      
      // Update draft but preserve client/site info if it exists
      updateQuotationDraft(prev => ({
          ...prev,
          systemsize: result.systemSizeKw.toFixed(2),
          panel: panelsValue,
          invertersize: inverterSize,
          inverterbrand: cleanBrandName,
          systemprice: result.totalPrice, 
          date: new Date().toISOString().split('T')[0]
      }));
      
      navigate('/quotation');
  }

  const systemSizeKw = useMemo(() => {
    return parseFloat(kwpValue) || 0;
  }, [kwpValue]);

  const maxSafePanels = useMemo(() => {
      if (!selectedMeter || selectedMeter.maxInverterKw <= 0) return Infinity;
      const oversizing = getOversizingRatio(settings, batteryCount);
      const maxDc = selectedMeter.maxInverterKw * oversizing;
      return Math.floor(maxDc / settings.panelRating);
  }, [selectedMeter, settings, batteryCount]);

  const isOverPanelLimit = (parseFloat(panelsValue) || 0) > maxSafePanels;

  // Battery Limit Logic
  const maxBatteryCount = settings.battery?.maxCount || 4;
  const isOverBatteryLimit = batteryCount > maxBatteryCount;

  interface DetailedResult extends CalculationResult {
    effectiveTariff: number;
    annualDays: number;
    caAmount: number;
    gitaAmount: number;
    netCostCA: number;
    netCostTotal: number;
    isCapped: boolean;
    exportRate: number;
    
    monthlyGen: number;
    monthlyOriginalKwh: number;
    monthlyDirectUseKwh: number;
    monthlyNewImportKwh: number;
    monthlyExportKwh: number;
    monthlyUsableExportKwh: number;
    monthlyAtapKwh: number;
    monthlyAtapValue: number;
    monthlyNoLoadExportKwh: number; 
  }

  const calculateResult = (): DetailedResult | null => {
    if (!selectedBrand || !selectedMeter) return null;
    
    if (systemSizeKw <= 0) {
         return {
            systemSizeKw: 0,
            limitKwac: selectedMeter.limitKwac,
            totalPrice: 0,
            annualGeneration: 0,
            annualSavings: 0,
            roiYearsNoTax: 0,
            priceAfterCA: 0,
            roiYearsCA: 0,
            priceAfterGITA: 0,
            roiYearsGITA: 0,
            effectiveTariff: 0,
            annualDays: 360,
            caAmount: 0,
            gitaAmount: 0,
            netCostCA: 0,
            netCostTotal: 0,
            isCapped: false,
            selfConsumedRatio: 0,
            annualSelfConsumedKwh: 0,
            annualExportedKwh: 0,
            savingsFromSelfConsumption: 0,
            savingsFromExport: 0,
            exportRate: settings.exportRate || 0.20,
            monthlyGen: 0,
            monthlyOriginalKwh: parseFloat(targetKwh) || 0,
            monthlyDirectUseKwh: 0,
            monthlyNewImportKwh: parseFloat(targetKwh) || 0,
            monthlyExportKwh: 0,
            monthlyUsableExportKwh: 0,
            monthlyAtapKwh: 0,
            monthlyAtapValue: 0,
            monthlyNoLoadExportKwh: 0,
            oneTimeFees: 0,
            annualOpex: 0,
            netAnnualSavings: 0,
            breakdownOpex: {
                maintenance: 0,
                stLicense: 0,
                chargeman: 0,
                visitingEngineer: 0,
                maintenanceDetails: undefined
            },
            isGitaEligible: false,
            batteryCount: 0,
            batteryCapacity: 0,
            batteryCost: 0,
            batteryDischargeKwh: 0
        };
    }

    const sunHours = settings.sunHours;
    const exportRate = settings.exportRate || 0.20;
    const taxRate = settings.taxRate;
    
    const activeGroup = getActiveTariffGroup();
    const tariff = activeGroup ? activeGroup.rate : settings.tariffRate;
    const kwtbbPercent = activeGroup ? activeGroup.kwtbbPct : (settings.kwtbb * 100);
    const kwtbb = kwtbbPercent / 100;
    
    let price = 0;
    const tier = selectedBrand.pricingTiers.find(t => systemSizeKw >= t.minKw && systemSizeKw < t.maxKw) 
              || selectedBrand.pricingTiers[selectedBrand.pricingTiers.length - 1];
    
    if (tier) {
      if (tier.useSmartLogic && settings.referencePrices) {
        const panelCount = Math.round(parseFloat(panelsValue) || (systemSizeKw / settings.panelRating));
        const ref = settings.referencePrices.find(r => r.panels === panelCount);
        const basePrice = ref ? ref.price : (tier.pricePerKw * systemSizeKw);
        price = basePrice + tier.baseFee;
      } else {
        price = (tier.pricePerKw * systemSizeKw) + tier.baseFee;
      }
      if (tier.deductionPerKw) {
          price -= (tier.deductionPerKw * systemSizeKw);
      }
    }

    let battCost = 0;
    let battTotalCap = 0;
    if (batteryCount > 0 && settings.battery) {
        battTotalCap = batteryCount * settings.battery.capacityKwh;
        battCost = batteryCount * (settings.battery.pricePerUnit ?? 8200);
        price += battCost;
    }

    const { otherCosts, maintenanceTiers } = settings;
    let oneTimeFees = 0;
    
    if (otherCosts) {
        if (systemSizeKw < otherCosts.gitaFeeThreshold) {
            oneTimeFees += otherCosts.gitaFee;
        }
    }

    price += oneTimeFees;

    let annualOpex = 0;
    let maintCost = 0;
    let maintTier = null;
    let stCost = 0;
    let chargemanCost = 0;
    let engineerCost = 0;

    /** Tier schedule from settings; payment cadence: < 96 kWp = full tier amount every 3 yrs (cashflow Y3,6,9…); ≥ 96 kWp = same amount every year. */
    const maintPaymentFrequencyYears = systemSizeKw < 96 ? 3 : 1;

    if (maintenanceTiers) {
        maintTier = maintenanceTiers.find(t => systemSizeKw >= t.minKwp && systemSizeKw < t.maxKwp)
            || maintenanceTiers[maintenanceTiers.length - 1];
        if (maintTier) {
            maintCost = maintTier.cost / maintPaymentFrequencyYears;
        }
    }

    if (otherCosts) {
        if (systemSizeKw >= otherCosts.stLicenseThreshold) {
            stCost = systemSizeKw * otherCosts.stLicenseRate;
        }
        if (systemSizeKw >= otherCosts.chargemanThreshold) {
            chargemanCost = otherCosts.chargemanCost * 12;
        }
        if (systemSizeKw >= otherCosts.visitingEngineerThreshold) {
            engineerCost = otherCosts.visitingEngineerCost * 12;
        }
    }

    annualOpex = maintCost + stCost + chargemanCost + engineerCost;

    const monthlyGen = systemSizeKw * sunHours * 30;
    const annualGen = monthlyGen * 12;
    const dailyGen = monthlyGen / 30;
    
    const effectiveImportTariff = tariff * (1 + kwtbb);
    
    const daysNoLoad = parseFloat(noLoadDays) || 0;
    const daysActive = 30 - daysNoLoad;
    
    let monthlyOriginalKwh = parseFloat(targetKwh);
    if (isNaN(monthlyOriginalKwh)) monthlyOriginalKwh = 0;
    
    const dailyActiveConsumption = daysActive > 0 ? monthlyOriginalKwh / daysActive : 0;
    
    const solarStart = settings.solarStartHour || 10;
    const solarEnd = settings.solarEndHour || 17;
    const solarDuration = Math.max(0.1, solarEnd - solarStart);

    const opStart = opStartHour;
    const opEnd = opEndHour;
    const opDuration = Math.max(0.1, opEnd - opStart);

    const overlapStart = Math.max(solarStart, opStart);
    const overlapEnd = Math.min(solarEnd, opEnd);
    const overlapDuration = Math.max(0, overlapEnd - overlapStart);

    const solarGenWindowRatio = overlapDuration / solarDuration; 
    const consumptionWindowRatio = overlapDuration / opDuration;

    const dailyGenDuringOverlap = dailyGen * solarGenWindowRatio;
    const dailyConsumptionDuringOverlap = dailyActiveConsumption * consumptionWindowRatio;

    const actualDailyDirectUse = Math.min(dailyGenDuringOverlap, dailyConsumptionDuringOverlap);
    
    let dailyBatteryCharge = 0;
    let dailyBatteryDischarge = 0;
    
    if (batteryCount > 0 && settings.battery) {
        const dailyExcessSolar = dailyGen - actualDailyDirectUse;
        const maxChargeCapacity = batteryCount * settings.battery.capacityKwh * settings.battery.usableRatio;
        dailyBatteryCharge = Math.min(dailyExcessSolar, maxChargeCapacity);
        // Operating hours without PV: morning before solar + evening after solar (steady-state; uniform load over op window).
        const preSolarDuration = Math.max(0, Math.min(solarStart, opEnd) - Math.max(opStart, 0));
        const postSolarDuration = Math.max(0, opEnd - solarEnd);
        const batteryDischargeWindowHours = preSolarDuration + postSolarDuration;

        if (batteryDischargeWindowHours > 0) {
            const consumptionBatteryDischargeCap =
                dailyActiveConsumption * (batteryDischargeWindowHours / opDuration);
            dailyBatteryDischarge = Math.min(dailyBatteryCharge, consumptionBatteryDischargeCap);
        }
    }

    const noLoadDailyDirectUse = 0; 
    
    const monthlyDirectUseKwh = (actualDailyDirectUse * daysActive) + (noLoadDailyDirectUse * daysNoLoad);
    const monthlyBatteryDischargeKwh = (dailyBatteryDischarge * daysActive);
    
    const dailyExport = Math.max(0, dailyGen - actualDailyDirectUse - dailyBatteryCharge);
    const monthlyExportKwh = (dailyExport * daysActive) + (dailyGen * daysNoLoad); 

    const monthlyNewImportKwh = Math.max(0, monthlyOriginalKwh - monthlyDirectUseKwh - monthlyBatteryDischargeKwh);
    const monthlyUsableExportKwh = Math.min(monthlyExportKwh, monthlyNewImportKwh);
    
    const monthlyAtapKwh = monthlyExportKwh - monthlyUsableExportKwh;
    const monthlyAtapValue = monthlyAtapKwh * exportRate;

    const savingsDirect = monthlyDirectUseKwh * effectiveImportTariff;
    const savingsBattery = monthlyBatteryDischargeKwh * effectiveImportTariff; 
    const savingsExport = monthlyUsableExportKwh * exportRate;
    
    const monthlyTotalSavings = savingsDirect + savingsBattery + savingsExport;
    const potentialAnnualSavings = monthlyTotalSavings * 12; 
    let annualSavings = potentialAnnualSavings + (monthlyAtapValue * 12); 
    
    let isCapped = false;
    const userMonthlyBill = parseFloat(billAmount);
    
    let grossFinancialSavings = annualSavings;
    if (!isNaN(userMonthlyBill) && userMonthlyBill > 0) {
        if (grossFinancialSavings > (userMonthlyBill * 12)) {
            grossFinancialSavings = userMonthlyBill * 12;
            isCapped = true;
        }
    }

    const netAnnualSavings = grossFinancialSavings - annualOpex;

    const caAmount = price * taxRate;

    const isGitaEligible = systemSizeKw >= (otherCosts?.gitaIncentiveThreshold || 60);
    const gitaAmount = isGitaEligible ? (price * 0.60 * taxRate) : 0;

    const netCostCA = price - caAmount; 
    const netCostTotal = price - caAmount - gitaAmount; 

    // ROI CALCS
    // Request: Use Gross Savings (ignoring annual operating expenses like maintenance)
    const roiNoTax = grossFinancialSavings > 0 ? price / grossFinancialSavings : 0;
    const roiCA = grossFinancialSavings > 0 ? netCostCA / grossFinancialSavings : 0;
    const roiGITA = grossFinancialSavings > 0 ? netCostTotal / grossFinancialSavings : 0;
    
    const selfConsumedRatio = monthlyGen > 0 ? (monthlyDirectUseKwh + monthlyBatteryDischargeKwh) / monthlyGen : 0;

    return {
      systemSizeKw,
      limitKwac: selectedMeter.limitKwac,
      totalPrice: price,
      annualGeneration: annualGen,
      annualSavings: grossFinancialSavings, // Use capped savings for display too
      roiYearsNoTax: roiNoTax,
      priceAfterCA: netCostCA,
      roiYearsCA: roiCA,
      priceAfterGITA: netCostTotal,
      roiYearsGITA: roiGITA,
      effectiveTariff: effectiveImportTariff,
      annualDays: 360,
      caAmount,
      gitaAmount,
      netCostCA,
      netCostTotal,
      isCapped, 
      selfConsumedRatio,
      annualSelfConsumedKwh: monthlyDirectUseKwh * 12,
      annualExportedKwh: monthlyExportKwh * 12,
      savingsFromSelfConsumption: (savingsDirect + savingsBattery) * 12,
      savingsFromExport: savingsExport * 12,
      exportRate,
      monthlyGen,
      monthlyOriginalKwh,
      monthlyDirectUseKwh,
      monthlyNewImportKwh,
      monthlyExportKwh,
      monthlyUsableExportKwh,
      monthlyAtapKwh,
      monthlyAtapValue,
      monthlyNoLoadExportKwh: (dailyGen * daysNoLoad),
      oneTimeFees,
      annualOpex,
      netAnnualSavings,
      breakdownOpex: {
          maintenance: maintCost,
          stLicense: stCost,
          chargeman: chargemanCost,
          visitingEngineer: engineerCost,
          maintenanceDetails: maintTier ? { cost: maintTier.cost, freq: maintPaymentFrequencyYears } : undefined
      },
      isGitaEligible,
      batteryCount,
      batteryCapacity: battTotalCap,
      batteryCost: battCost,
      batteryDischargeKwh: monthlyBatteryDischargeKwh
    };
  };

  const result = calculateResult();

  const cashflowData: CashflowRow[] = useMemo(() => {
    if (!result) return [];
    let accumulatedCashflow = -result.totalPrice;
    
    const data: CashflowRow[] = [{
        year: 0,
        gen: 0,
        tariff: 0,
        billSavings: 0,
        caTaxSaving: 0,
        gita: 0,
        opex: 0,
        totalSavings: -result.totalPrice,
        accumulated: -result.totalPrice
    }];

    for (let year = 1; year <= 20; year++) {
         const billSavings = result.annualSavings;
         
         let caPercentage = 0;
         if (year === 1) caPercentage = 0.34;
         else if (year >= 2 && year <= 5) caPercentage = 0.14;
         else if (year === 6) caPercentage = 0.10;
         
         const caTaxSaving = result.caAmount * caPercentage;

         const gita = (result.isGitaEligible && year === 3) ? result.gitaAmount : 0;
         
         const fixedOpex = result.breakdownOpex.stLicense + result.breakdownOpex.chargeman + result.breakdownOpex.visitingEngineer;
         
         const maintCost = result.breakdownOpex.maintenanceDetails?.cost || 0;
         const maintFreq = result.breakdownOpex.maintenanceDetails?.freq || 1;
         let currentYearMaint = 0;
         
         if (maintFreq === 1) {
             currentYearMaint = maintCost;
         } else {
             if (year % maintFreq === 0) {
                 currentYearMaint = maintCost;
             }
         }
         
         const totalYearOpex = fixedOpex + currentYearMaint;
         const totalSavings = billSavings + caTaxSaving + gita - totalYearOpex;
         
         accumulatedCashflow += totalSavings;

         data.push({
            year,
            gen: result.annualGeneration,
            tariff: result.effectiveTariff,
            billSavings,
            caTaxSaving,
            gita,
            opex: totalYearOpex,
            totalSavings,
            accumulated: accumulatedCashflow
         });
    }
    return data;
  }, [result]);

  const installmentCashflowData: CashflowRow[] = useMemo(() => {
    if (!result || !settings.financing) return [];
    
    const { interestRate, tenureYears } = settings.financing;
    const ratePerMonth = (interestRate / 100) / 12;
    const nper = tenureYears * 12;
    const monthlyPayment = calculatePMT(ratePerMonth, nper, result.totalPrice);
    const annualInstallment = monthlyPayment * 12;
    const totalRepayment = annualInstallment * tenureYears;
    
    // Year 0 is 0 because of 100% financing assumption
    let accumulatedCashflow = 0;
    
    const data: CashflowRow[] = [{
        year: 0,
        gen: 0,
        tariff: 0,
        billSavings: 0,
        caTaxSaving: 0,
        gita: 0,
        opex: 0,
        installment: 0,
        totalSavings: 0,
        accumulated: 0
    }];

    for (let year = 1; year <= 20; year++) {
         const billSavings = result.annualSavings;
         
         let caPercentage = 0;
         if (year === 1) caPercentage = 0.34;
         else if (year >= 2 && year <= 5) caPercentage = 0.14;
         else if (year === 6) caPercentage = 0.10;
         
         const caTaxSaving = result.caAmount * caPercentage;

         const gita = (result.isGitaEligible && year === 3) ? result.gitaAmount : 0;
         
         const fixedOpex = result.breakdownOpex.stLicense + result.breakdownOpex.chargeman + result.breakdownOpex.visitingEngineer;
         
         const maintCost = result.breakdownOpex.maintenanceDetails?.cost || 0;
         const maintFreq = result.breakdownOpex.maintenanceDetails?.freq || 1;
         let currentYearMaint = 0;
         
         if (maintFreq === 1) {
             currentYearMaint = maintCost;
         } else {
             if (year % maintFreq === 0) {
                 currentYearMaint = maintCost;
             }
         }
         
         const totalYearOpex = fixedOpex + currentYearMaint;
         
         let currentInstallment = 0;
         if (year <= tenureYears) {
             currentInstallment = annualInstallment;
         }

         const totalSavings = billSavings + caTaxSaving + gita - totalYearOpex - currentInstallment;
         
         accumulatedCashflow += totalSavings;

         data.push({
            year,
            gen: result.annualGeneration,
            tariff: result.effectiveTariff,
            billSavings,
            caTaxSaving,
            gita,
            opex: totalYearOpex,
            installment: currentInstallment,
            totalSavings,
            accumulated: accumulatedCashflow
         });
    }
    return data;
  }, [result, settings.financing]);

  const activeCashflowData = showInstallmentTable ? installmentCashflowData : cashflowData;

  const breakevenYear = useMemo(() => {
    if (!activeCashflowData.length) return null;
    const match = activeCashflowData.find(d => d.year > 0 && d.accumulated >= 0);
    return match ? match.year : null;
  }, [activeCashflowData]);


  const handleDownloadCSV = () => {
    if (!activeCashflowData.length) return;

    const headers = [
      "Year",
      "Generation (kWh)",
      "Tariff (RM/kWh)",
      "Bill Savings (RM)",
      "CA Tax Savings (RM)",
      result?.isGitaEligible ? "GITA Incentive (RM)" : null,
      "Annual Opex (RM)",
      showInstallmentTable ? "Installment (RM)" : null,
      "Total Net Savings (RM)",
      "Accumulated Cashflow (RM)"
    ].filter(Boolean).join(",");

    const rows = activeCashflowData.map(row => {
      const rowData = [
        row.year,
        row.year === 0 ? '' : row.gen.toFixed(0),
        row.year === 0 ? '' : row.tariff.toFixed(4),
        row.year === 0 ? '' : row.billSavings.toFixed(2),
        row.year === 0 ? '' : row.caTaxSaving.toFixed(2),
        result?.isGitaEligible ? (row.year === 0 ? '' : row.gita.toFixed(2)) : null,
        row.year === 0 ? '' : row.opex.toFixed(2),
        showInstallmentTable ? (row.installment?.toFixed(2) ?? '0.00') : null,
        row.totalSavings.toFixed(2),
        row.accumulated.toFixed(2)
      ].filter(val => val !== null);
      
      return rowData.join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", showInstallmentTable ? "solar_installment_cashflow.csv" : "solar_cashflow_projection.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const billEstimationDetails = useMemo(() => {
     if (!targetKwh) return null; 
     
     const kwh = parseFloat(targetKwh);
     const group = getActiveTariffGroup();
     const rate = group ? group.rate : settings.tariffRate;
     const kwtbbPct = group ? group.kwtbbPct : (settings.kwtbb * 100);

     if (isNaN(kwh) || kwh <= 0) return null;

     const energyCharge = kwh * rate;
     const retailCharge = 20.00;
     const kwtbbCharge = energyCharge * (kwtbbPct / 100);
     const total = energyCharge + retailCharge + kwtbbCharge;
     
     return { energyCharge, retailCharge, kwtbbCharge, total, rate, kwtbbPct };
  }, [targetKwh, selectedTariffGroupId, settings.tariffGroups, settings.tariffRate, settings.kwtbb]);


  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Commercial Solar Calculator <span className="text-amber-500">ATAP</span></h1>
          <p className="text-slate-500 font-medium">Commercial & Industrial Solar System Recommender by Luffy & TC</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Inputs */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Recommendation Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/10 relative">
              <button 
                  onClick={handleResetSession}
                  className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                  title="Reset Inputs"
              >
                  <RotateCcw size={16} className="text-blue-100" />
              </button>
              
              <div className="flex items-center gap-2 mb-4">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                      <Wand2 size={20} className="text-blue-100" />
                  </div>
                  <h2 className="font-bold text-lg">Configuration</h2>
              </div>
              
              <div className="space-y-4">
                  
                  {/* Tariff Group Selector */}
                  <div>
                      <label className="block text-xs font-bold text-blue-100 uppercase mb-2">Tariff Group</label>
                      <div className="relative">
                          <select 
                            className="w-full appearance-none bg-white/10 border border-white/20 focus:bg-white/20 rounded-xl px-4 py-3 text-white font-bold outline-none cursor-pointer"
                            value={selectedTariffGroupId}
                            onChange={(e) => setSelectedTariffGroupId(e.target.value)}
                          >
                             {(settings.tariffGroups || []).map(group => (
                                 <option key={group.id} value={group.id} className="text-slate-800">{group.name}</option>
                             ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-4 text-blue-200 pointer-events-none" size={16} />
                      </div>
                  </div>

                  {/* Bill & Consumption Inputs (Synced) */}
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="block text-xs font-bold text-blue-100 uppercase mb-2">Target Bill (RM)</label>
                          <input 
                              type="number" 
                              placeholder="e.g. 1000"
                              className="w-full bg-white/10 border border-white/20 focus:bg-white/20 rounded-xl px-3 py-3 text-white placeholder-blue-200 font-bold outline-none transition-all"
                              value={billAmount}
                              onChange={(e) => handleBillChange(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-blue-100 uppercase mb-2">Consumption (kWh)</label>
                           <input 
                              type="number" 
                              placeholder="e.g. 1950"
                              className="w-full bg-white/10 border border-white/20 focus:bg-white/20 rounded-xl px-3 py-3 text-white placeholder-blue-200 font-bold outline-none transition-all"
                              value={targetKwh}
                              onChange={(e) => handleKwhChange(e.target.value)}
                          />
                      </div>
                  </div>

                   {/* Meter Type Input */}
                   <div>
                       <label className="block text-xs font-bold text-blue-100 uppercase mb-2">Meter Type</label>
                       <div className="relative">
                           <select 
                               className="w-full appearance-none bg-white/10 border border-white/20 focus:bg-white/20 rounded-xl px-4 py-3 text-white font-bold outline-none cursor-pointer"
                               value={selectedMeterId}
                               onChange={(e) => handleMeterChange(e.target.value)}
                           >
                               {meters.map((m) => (
                                   <option key={m.id} value={m.id} className="text-slate-800">
                                       {m.name} {m.limitKwac < 90000 ? `(Max ${m.limitKwac} kWac)` : '(No Limit)'}
                                   </option>
                               ))}
                           </select>
                           <ChevronDown className="absolute right-4 top-4 text-blue-200 pointer-events-none" size={16} />
                       </div>
                  </div>

                  {/* Bill Details Toggle */}
                  {billEstimationDetails && (
                      <div className="bg-black/10 rounded-xl overflow-hidden border border-white/10">
                          <button 
                            onClick={() => setShowBillDetails(!showBillDetails)}
                            className="w-full flex justify-between items-center px-4 py-2 text-xs font-bold text-blue-100 hover:bg-white/5 transition-colors"
                          >
                             <span className="flex items-center gap-1.5"><Receipt size={12}/> Bill Details</span>
                             <ChevronDown size={14} className={`transition-transform ${showBillDetails ? 'rotate-180' : ''}`}/>
                          </button>
                          {showBillDetails && (
                             <div className="px-4 pb-3 pt-1 space-y-1.5">
                                 <div className="flex justify-between text-xs text-blue-200">
                                     <span>Energy Charge ({(billEstimationDetails.rate).toFixed(4)}/kWh)</span>
                                     <span>RM {billEstimationDetails.energyCharge.toFixed(2)}</span>
                                 </div>
                                 <div className="flex justify-between text-xs text-blue-200">
                                     <span>Retail Charge (Fixed)</span>
                                     <span>RM {billEstimationDetails.retailCharge.toFixed(2)}</span>
                                 </div>
                                  <div className="flex justify-between text-xs text-blue-200">
                                     <span>KWTBB Fund ({billEstimationDetails.kwtbbPct}%)</span>
                                     <span>RM {billEstimationDetails.kwtbbCharge.toFixed(2)}</span>
                                 </div>
                                 <div className="border-t border-white/10 pt-1 mt-1 flex justify-between text-xs font-bold text-white">
                                     <span>Total Estimated</span>
                                     <span>RM {billEstimationDetails.total.toFixed(2)}</span>
                                 </div>
                             </div>
                          )}
                      </div>
                  )}

                  {/* Operation Hours */}
                  <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-blue-100 uppercase">Operation Hours</label>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold text-blue-50">
                            {(calculateSelfConsumptionRatio() * 100).toFixed(0)}% Solar Utilized (Est.)
                        </span>
                      </div>
                      
                      {/* Stacked Layout for Better Spacing */}
                      <div className="space-y-3">
                         <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                             <div className="flex items-center gap-3">
                                 <div className="w-8 text-center text-[10px] font-bold text-blue-200 uppercase leading-tight">Start</div>
                                 <div className="flex-1">
                                    <TimeInput 
                                        value={opStartHour} 
                                        onChange={setOpStartHour} 
                                    />
                                 </div>
                             </div>
                         </div>
                         <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                             <div className="flex items-center gap-3">
                                 <div className="w-8 text-center text-[10px] font-bold text-blue-200 uppercase leading-tight">End</div>
                                 <div className="flex-1">
                                    <TimeInput 
                                        value={opEndHour} 
                                        onChange={setOpEndHour}
                                        isEndTime 
                                    />
                                 </div>
                             </div>
                         </div>
                      </div>
                      
                      {/* 24 Hour Indicator */}
                      {((opEndHour - opStartHour >= 24) || (opStartHour === 0 && opEndHour === 24)) && (
                          <div className="mt-2 flex items-center justify-center gap-1.5 text-emerald-300 bg-emerald-500/20 py-1.5 px-3 rounded-lg border border-emerald-500/30">
                              <Clock size={12} />
                              <span className="text-[10px] font-bold uppercase tracking-wide">Operating 24 Hours</span>
                          </div>
                      )}
                  </div>
                  
                  {/* Grid for No Load & Roof Capacity */}
                  <div className="grid grid-cols-2 gap-3">
                      {/* No Load Days */}
                      <div>
                           <label className="block text-xs font-bold text-blue-100 uppercase mb-2">No Load Days (Per Mo)</label>
                           <div className="relative">
                                <input 
                                    type="number" 
                                    min="0" max="30"
                                    placeholder="e.g. 4"
                                    className="w-full bg-white/10 border border-white/20 focus:bg-white/20 rounded-xl px-3 py-3 text-white placeholder-blue-200 font-bold outline-none transition-all"
                                    value={noLoadDays}
                                    onChange={(e) => setNoLoadDays(e.target.value)}
                                />
                           </div>
                      </div>

                      {/* Roof Capacity */}
                      <div>
                           <label className="block text-xs font-bold text-blue-100 uppercase mb-2">Roof Max (pcs)</label>
                           <div className="relative">
                               <input 
                                  type="number" 
                                  placeholder="e.g. 50"
                                  className="w-full bg-white/10 border border-white/20 focus:bg-white/20 rounded-xl px-3 py-3 text-white placeholder-blue-200 font-bold outline-none transition-all"
                                  value={roofLimit}
                                  onChange={(e) => setRoofLimit(e.target.value)}
                               />
                           </div>
                      </div>
                  </div>
              </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results */}
        <div ref={resultsRef} className="lg:col-span-7 space-y-6 lg:sticky lg:top-6 self-start">
           {/* ... existing right column content ... */}
           
           {/* STRATEGY SWITCHER */}
           {proposedPlans && proposedPlans.length > 0 && (
               <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex flex-wrap gap-2">
                   {proposedPlans.map(plan => (
                       <button 
                           key={plan.type}
                           onClick={() => applyPlan(plan)}
                           className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                               activeStrategy === plan.type 
                               ? (plan.type === 'max_savings' 
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                    : plan.type === 'bess_coverage'
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                        : 'bg-amber-500 text-white shadow-md shadow-amber-500/20')
                               : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                           }`}
                       >
                           <span className="uppercase tracking-wide text-[10px] sm:text-xs">{plan.label}</span>
                           <div className="flex gap-2">
                                <span className={`text-[9px] py-0.5 px-1.5 rounded-md ${activeStrategy === plan.type ? 'bg-white/20' : 'bg-slate-200/50'}`}>
                                    {plan.panels} Pcs
                                </span>
                                {(plan.batteryCount || 0) > 0 && (
                                     <span className={`text-[9px] py-0.5 px-1.5 rounded-md flex items-center gap-0.5 ${activeStrategy === plan.type ? 'bg-white/20' : 'bg-slate-200/50'}`}>
                                        <Battery size={8} /> {plan.batteryCount}
                                     </span>
                                )}
                           </div>
                       </button>
                   ))}
               </div>
           )}

           {/* HERO RESULT CARD */}
           {result && (
             <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-[2rem] p-6 lg:p-8 shadow-2xl shadow-slate-900/20 relative overflow-hidden group animate-fade-in-up">
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none"></div>
                
                {/* Decor */}
                <div className="absolute -right-16 -top-16 text-white opacity-[0.03] pointer-events-none rotate-12">
                   <DollarSign size={300} strokeWidth={1.5} />
                </div>

                <div className="relative z-10 space-y-6">
                   
                   {/* Header & Actions */}
                   <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Proposed System</h2>
                            <p className="text-slate-400 text-sm">Optimized for your consumption</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleCreateQuotation}
                                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl border border-white/10 transition-all flex items-center gap-2 text-sm font-bold"
                            >
                                <FileText size={16} />
                                <span className="hidden sm:inline">Copy to Quotation</span>
                            </button>
                            <button 
                                onClick={() => setIsWAModalOpen(true)}
                                className="bg-[#25D366] hover:bg-[#20b555] text-white px-4 py-2 rounded-xl shadow-lg shadow-green-500/20 transition-all flex items-center gap-2 text-sm font-bold"
                            >
                                <Share2 size={16} />
                                <span className="hidden sm:inline">Generate WhatsApp</span>
                            </button>
                        </div>
                   </div>

                   {/* ROW 1: Specs */}
                   <div className="grid grid-cols-2 gap-4 p-5 bg-white/5 rounded-2xl border border-white/10">
                        {/* Panel Qty */}
                        <div className="space-y-1 relative">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Panel Quantity</p>
                            <div className="flex items-baseline gap-1">
                                <input
                                    type="number"
                                    value={panelsValue}
                                    onChange={handleManualPanelChange}
                                    className={`bg-transparent text-xl font-bold text-white w-24 outline-none border-b border-white/20 focus:border-white transition-colors ${isOverPanelLimit ? 'text-red-300 border-red-500/50' : ''}`}
                                />
                                <span className="text-sm font-medium text-slate-400">pcs</span>
                            </div>
                            {isOverPanelLimit && (
                                <div className="absolute top-full left-0 mt-1 text-[10px] text-red-500 font-bold flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md border border-red-100 z-10 w-full whitespace-nowrap">
                                    <AlertTriangle size={10} /> Max: {maxSafePanels} pcs
                                </div>
                            )}
                            <p className="text-[10px] text-slate-500 mt-1">{settings.panelRating}W Modules</p>
                        </div>
                        
                        {/* Capacity */}
                        <div className="space-y-1">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Capacity</p>
                             <p className="text-xl font-bold text-white">{result.systemSizeKw.toFixed(2)} <span className="text-sm font-medium text-slate-400">kWp</span></p>
                        </div>

                        {/* Inverter */}
                        <div className="space-y-1">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inverter</p>
                             <p className="text-xl font-bold text-white truncate" title={selectedBrand?.name}>{selectedBrand?.name}</p>
                             <p className="text-[10px] text-slate-500">Est. {inverterSize} kWac</p>
                        </div>

                        {/* Battery */}
                        <div className="space-y-1 relative">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Battery Qty</p>
                             <div className="flex items-baseline gap-1">
                                <input
                                    type="number"
                                    value={batteryCount}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setBatteryCount(isNaN(val) ? 0 : val);
                                        // Switch to custom strategy when user manually edits
                                        setActiveStrategy('custom');
                                        // If setting battery > 0, warn if not goodwe? 
                                        if (val > 0 && selectedBrandId !== 'goodwe') {
                                            // Optional: auto switch or just warn
                                        }
                                    }}
                                    className={`bg-transparent text-xl font-bold w-24 outline-none border-b transition-colors ${
                                        isOverBatteryLimit 
                                        ? 'text-red-300 border-red-500/50 focus:border-red-500' 
                                        : 'text-emerald-400 border-white/20 focus:border-emerald-400'
                                    }`}
                                />
                                <span className="text-sm font-medium text-slate-400">pcs</span>
                            </div>
                            {batteryCount > 0 && selectedBrandId !== 'goodwe' && (
                                <p className="text-[9px] text-red-400 mt-0.5 leading-tight">Warning: Battery requires GoodWe</p>
                            )}
                            {isOverBatteryLimit && (
                                <div className="absolute top-full left-0 mt-1 text-[10px] text-red-500 font-bold flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md border border-red-100 z-10 w-full whitespace-nowrap shadow-lg">
                                    <AlertTriangle size={10} /> Max: {maxBatteryCount} pcs
                                </div>
                            )}
                        </div>
                   </div>

                   {/* ROW 2: Financials */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Gross Price & ROI */}
                        <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex flex-col justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">System Price (Gross)</p>
                                <p className="text-2xl font-bold text-white">RM {result.totalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                {result.batteryCost > 0 && (
                                    <p className="text-[10px] text-slate-400 mt-1">Includes RM {result.batteryCost.toLocaleString()} Battery Cost</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-3 py-2 rounded-lg w-fit">
                                <TrendingUp size={16} />
                                <span className="text-sm font-bold">{result.roiYearsNoTax.toFixed(2)} Years ROI</span>
                            </div>
                        </div>

                        {/* Net Price & ROI */}
                        <div className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex flex-col justify-between gap-4 relative overflow-hidden">
                             {result.isGitaEligible && (
                                 <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">
                                     GITA ELIGIBLE
                                 </div>
                             )}
                            <div>
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                                    {result.isGitaEligible ? 'Net Price (CA + GITA)' : 'Net Price (After CA)'}
                                </p>
                                <p className="text-2xl font-bold text-white">
                                    RM {(result.isGitaEligible ? result.priceAfterGITA : result.priceAfterCA).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-lg w-fit">
                                <TrendingUp size={16} />
                                <span className="text-sm font-bold">{(result.isGitaEligible ? result.roiYearsGITA : result.roiYearsCA).toFixed(2)} Years ROI</span>
                            </div>
                        </div>

                   </div>

                </div>
             </div>
           )}

           {/* SAVINGS CARD */}
           {result && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 animate-fade-in-up delay-200">
                 <div className="flex justify-between items-start mb-6">
                     <div>
                        <h3 className="text-lg font-bold text-slate-800">Est. Monthly Savings (Gross)</h3>
                        <p className="text-xs text-slate-400 font-medium">Projected bill reduction based on generation.</p>
                     </div>
                     <div className="bg-green-50 text-green-600 p-3 rounded-xl shadow-sm border border-green-100">
                       <DollarSign size={24} />
                    </div>
                 </div>

                 {/* 2-Column Savings Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                     {/* Column 1: Monthly Metrics */}
                     <div className="space-y-4 border-r border-slate-100 pr-4">
                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Savings</p>
                             <h3 className="text-4xl font-black text-slate-800 tracking-tight">
                                RM {((result.savingsFromSelfConsumption + result.savingsFromExport) / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                             </h3>
                             {result.monthlyAtapValue > 1 && (
                                <p className="text-[10px] font-bold text-amber-600 mt-1">
                                    + RM {result.monthlyAtapValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Extra)
                                </p>
                             )}
                         </div>

                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bill Reduction</p>
                             <div className="flex items-center gap-2">
                                <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold text-sm">
                                    {billAmount && parseFloat(billAmount) > 0 
                                      ? Math.min(100, (((result.savingsFromSelfConsumption + result.savingsFromExport)/12 + result.monthlyAtapValue) / parseFloat(billAmount)) * 100).toFixed(0)
                                      : '0'}%
                                </div>
                                <span className="text-xs text-slate-500">of original bill</span>
                             </div>
                         </div>

                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Offset</p>
                             <p className="text-sm font-bold text-slate-700">
                                 {(result.monthlyDirectUseKwh + result.monthlyUsableExportKwh + result.batteryDischargeKwh).toLocaleString(undefined, {maximumFractionDigits:0})} kWh
                             </p>
                             <p className="text-[10px] text-slate-400">Direct Use {result.batteryDischargeKwh > 0 ? '+ Battery ' : ''}+ Usable Export (ATAP)</p>
                         </div>
                     </div>

                     {/* Column 2: Annual Metrics */}
                     <div className="space-y-4">
                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Annual Savings</p>
                             <h3 className="text-3xl font-bold text-slate-700 tracking-tight">
                                RM {result.annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                             </h3>
                         </div>

                         <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Annual Offset</p>
                             <p className="text-sm font-bold text-slate-700">
                                 {((result.monthlyDirectUseKwh + result.monthlyUsableExportKwh + result.batteryDischargeKwh) * 12).toLocaleString(undefined, {maximumFractionDigits:0})} kWh
                             </p>
                         </div>
                         
                         <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Annual Generation</p>
                            <p className="text-sm font-bold text-amber-600 flex items-center gap-1">
                                <Sun size={14} className="fill-amber-100"/>
                                {result.annualGeneration.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh
                            </p>
                         </div>
                     </div>
                 </div>
                 
                 {/* ...rest of the components... */}
                 <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                     <div 
                        className="flex justify-between items-center cursor-pointer p-4 hover:bg-slate-100 transition-colors"
                        onClick={() => setShowSavingsDetails(!showSavingsDetails)}
                     >
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">More Details</span>
                        <div className={`text-slate-400 bg-white p-1.5 rounded-full border border-slate-200 transition-transform duration-300 ${showSavingsDetails ? 'rotate-180' : ''}`}>
                           <ChevronDown size={16}/>
                        </div>
                     </div>
                     
                     {/* Collapsible Details */}
                     {showSavingsDetails && (
                        <div className="px-5 pb-5 border-t border-slate-100 space-y-4 animate-fade-in-up bg-white">
                           <div className="pt-4 grid gap-3">
                               {result.isCapped && (
                                   <div className="flex justify-between text-sm p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100">
                                       <span className="font-medium flex items-center gap-2"><AlertTriangle size={14}/> ROI Capped by Bill</span>
                                       <span className="font-bold">Fin. Offset: RM {parseFloat(billAmount).toLocaleString()}/mo</span>
                                   </div>
                               )}
                               
                               <div className="flex justify-between text-sm p-3 bg-slate-50 rounded-xl">
                                  <span className="text-slate-500 font-medium">Generation Formula</span>
                                  <span className="font-bold text-slate-700">{result.systemSizeKw} kWp × {settings.sunHours} hrs × 30 days</span>
                               </div>

                               {/* ENERGY FLOW BREAKDOWN */}
                               <div className="border border-slate-100 rounded-xl overflow-hidden">
                                  <div className="bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                     Monthly Energy Flow (Est.)
                                  </div>
                                  
                                  {/* Generation */}
                                  <div className="p-3 flex justify-between items-center border-b border-slate-50">
                                      <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                                          <Sun size={14} className="fill-amber-100"/> Solar Generation
                                      </span>
                                      <span className="text-sm font-bold text-slate-800">
                                          {result.monthlyGen.toLocaleString(undefined, {maximumFractionDigits:0})} kWh
                                      </span>
                                  </div>

                                  <div className="grid grid-cols-2">
                                      {/* Direct Use */}
                                      <div className="p-3 border-r border-slate-100 bg-blue-50/30">
                                          <div className="flex items-center gap-1.5 mb-1">
                                             <Activity size={12} className="text-blue-500"/>
                                             <span className="text-[10px] font-bold text-blue-600 uppercase">Direct Use</span>
                                          </div>
                                          <div className="text-sm font-bold text-slate-800">
                                              {result.monthlyDirectUseKwh.toLocaleString(undefined, {maximumFractionDigits:0})} kWh
                                          </div>
                                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                              RM {(result.monthlyDirectUseKwh * result.effectiveTariff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Saved
                                          </div>
                                      </div>

                                      {/* New Import */}
                                      <div className="p-3 bg-slate-50/50">
                                          <div className="flex items-center gap-1.5 mb-1">
                                             <ArrowDown size={12} className="text-slate-400"/>
                                             <span className="text-[10px] font-bold text-slate-500 uppercase">New Import</span>
                                          </div>
                                          <div className="text-sm font-bold text-slate-700">
                                              {result.monthlyNewImportKwh.toLocaleString(undefined, {maximumFractionDigits:0})} kWh
                                          </div>
                                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                                              RM {(result.monthlyNewImportKwh * result.effectiveTariff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Billable
                                          </div>
                                      </div>

                                      {/* Usable Export */}
                                      <div className="p-3 border-r border-t border-slate-100 bg-purple-50/30">
                                          <div className="flex items-center gap-1.5 mb-1">
                                             <Share2 size={12} className="text-purple-500"/>
                                             <span className="text-[10px] font-bold text-purple-600 leading-tight">Usable Export (ATAP)</span>
                                          </div>
                                          <div className="text-sm font-bold text-slate-800">
                                              {result.monthlyUsableExportKwh.toLocaleString(undefined, {maximumFractionDigits:0})} kWh
                                          </div>
                                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                              RM {(result.monthlyUsableExportKwh * result.exportRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Credit
                                          </div>
                                      </div>

                                      {/* Extra (Wasted) */}
                                      <div className="p-3 border-t border-slate-100 bg-amber-50/30">
                                          <div className="flex items-center gap-1.5 mb-1">
                                             <BatteryCharging size={12} className="text-amber-500"/>
                                             <span className="text-[10px] font-bold text-amber-600 leading-tight">Extra (Wasted)</span>
                                          </div>
                                          <div className="text-sm font-bold text-slate-800">
                                              {result.monthlyAtapKwh.toLocaleString(undefined, {maximumFractionDigits:0})} kWh
                                          </div>
                                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                              ~ RM {result.monthlyAtapValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Value
                                          </div>
                                      </div>

                                      {/* Battery Specific Display */}
                                      {result.batteryDischargeKwh > 0 && (
                                         <div className="p-3 col-span-2 border-t border-slate-100 bg-emerald-50/30">
                                              <div className="flex items-center gap-1.5 mb-1">
                                                 <Battery size={12} className="text-emerald-500"/>
                                                 <span className="text-[10px] font-bold text-emerald-600 uppercase">Battery Discharge</span>
                                              </div>
                                              <div className="text-sm font-bold text-slate-800">
                                                  {result.batteryDischargeKwh.toLocaleString(undefined, {maximumFractionDigits:0})} kWh
                                              </div>
                                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                  RM {(result.batteryDischargeKwh * result.effectiveTariff).toLocaleString(undefined, {maximumFractionDigits:0})} Saved
                                              </div>
                                          </div>
                                      )}
                                  </div>
                                  
                                  {/* No Load Specific Breakdown */}
                                  {result.monthlyNoLoadExportKwh > 0 && (
                                     <div className="bg-slate-50 p-3 border-t border-slate-200">
                                         <div className="flex items-center gap-2 mb-1">
                                             <CalendarX size={12} className="text-slate-400"/>
                                             <span className="text-[10px] font-bold text-slate-500 uppercase">No Load Days Impact</span>
                                         </div>
                                         <p className="text-xs text-slate-600">
                                             {result.monthlyNoLoadExportKwh.toLocaleString(undefined, {maximumFractionDigits:0})} kWh dumped to grid due to {noLoadDays} inactive days/month.
                                         </p>
                                     </div>
                                  )}
                               </div>

                               <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Tax Incentives Breakdown</p>
                                   <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                            <span className="text-xs text-emerald-600 block mb-1 font-semibold">CA Saved ({(settings.taxRate * 100).toFixed(0)}%)</span>
                                            <span className="font-bold text-emerald-700 text-lg">- RM {result.caAmount.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                        </div>
                                        {result.isGitaEligible && (
                                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                <span className="text-xs text-emerald-600 block mb-1 font-semibold">GITA Saved ({(settings.taxRate * 60).toFixed(1)}%)</span>
                                                <span className="font-bold text-emerald-700 text-lg">- RM {result.gitaAmount.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                            </div>
                                        )}
                                   </div>
                               </div>
                           </div>
                        </div>
                     )}
                 </div>
              </div>
           )}

           {/* OPEX CARD */}
           {result && result.annualOpex > 0 && (
             <div className="bg-slate-50 rounded-[2rem] shadow-sm border border-slate-200 p-6 animate-fade-in-up delay-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-500 shadow-sm">
                        <Wrench size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-700">Operating Expenses (Est.)</h3>
                        <p className="text-xs text-slate-400 font-medium">Annual recurring costs excluded from Gross Savings</p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">Total Annual Opex</p>
                        <p className="text-xl font-black text-red-500">- RM {result.annualOpex.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {result.breakdownOpex.maintenance > 0 && (
                        <div
                            className="bg-white p-3 rounded-xl border border-slate-200"
                            title={result.systemSizeKw < 96
                              ? 'Below 96 kWp: pay full tier amount once every 3 years (first charge in year 3 of cashflow).'
                              : '96 kWp and above: maintenance paid annually.'}
                        >
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Maintenance</p>
                            <p className="font-bold text-slate-700 mb-1">
                                RM {result.breakdownOpex.maintenance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                <span className="text-[10px] font-normal text-slate-400">/yr avg</span>
                            </p>
                            {result.systemSizeKw < 96 && result.breakdownOpex.maintenanceDetails && (
                                <p className="text-[10px] text-slate-500 leading-tight mt-1">
                                    RM {result.breakdownOpex.maintenanceDetails.cost.toLocaleString()} per service · every {result.breakdownOpex.maintenanceDetails.freq} yrs
                                </p>
                            )}
                            <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-1">Recommended</span>
                        </div>
                    )}
                    {result.breakdownOpex.stLicense > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200" title="RM 1.65/kWp for systems >= 100kWp">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ST License</p>
                            <p className="font-bold text-slate-700 mb-1">RM {result.breakdownOpex.stLicense.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                            <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded">Legally Required</span>
                        </div>
                    )}
                    {result.breakdownOpex.chargeman > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200" title="Compulsory for systems >= 100kWp">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Chargeman</p>
                            <p className="font-bold text-slate-700 mb-1">RM {result.breakdownOpex.chargeman.toLocaleString()}</p>
                            <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded">Legally Required</span>
                        </div>
                    )}
                     {result.breakdownOpex.visitingEngineer > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200" title="Compulsory for systems >= 100kWp">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vis. Engineer</p>
                            <p className="font-bold text-slate-700 mb-1">RM {result.breakdownOpex.visitingEngineer.toLocaleString()}</p>
                            <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded">Legally Required</span>
                        </div>
                    )}
                </div>

                {/* Cashflow Table Buttons */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            setShowCashflow(!showCashflow);
                            setShowInstallmentTable(false);
                        }}
                        className={`flex-1 py-3 border rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${showCashflow && !showInstallmentTable ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Table2 size={16} />
                        {showCashflow && !showInstallmentTable ? 'Hide Table' : 'Outright Purchase Cashflow Table'}
                    </button>
                    <button 
                        onClick={() => {
                            if (!showCashflow || !showInstallmentTable) {
                                setShowCashflow(true);
                                setShowInstallmentTable(true);
                            } else {
                                setShowCashflow(false);
                                setShowInstallmentTable(false);
                            }
                        }}
                        className={`flex-1 py-3 border rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${showCashflow && showInstallmentTable ? 'bg-indigo-600 text-white border-indigo-600' : 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        <Banknote size={16} />
                        Installment Cashflow Table
                    </button>
                </div>
             </div>
           )}

           {/* CASHFLOW TABLE */}
           {result && showCashflow && (
               <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 animate-fade-in-up">
                    <div className="flex justify-between items-start mb-4">
                         <div className="flex flex-col">
                             <div className="flex items-center gap-3">
                                 <h3 className="font-bold text-lg text-slate-800">
                                     {showInstallmentTable ? "20-Year Installment Cashflow" : "20-Year Cashflow Projection"}
                                 </h3>
                                 <button 
                                    onClick={handleDownloadCSV}
                                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors"
                                    title="Download CSV"
                                 >
                                    <Download size={18} />
                                 </button>
                             </div>
                             {showInstallmentTable && settings.financing && (
                                 <p className="text-xs text-indigo-500 font-medium mt-1">
                                     Loan: {settings.financing.interestRate}% Interest, {settings.financing.tenureYears} Years Tenure
                                 </p>
                             )}
                         </div>
                         {breakevenYear ? (
                            <div className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                                Breakeven: Year {breakevenYear}
                            </div>
                         ) : (
                             <div className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl text-xs font-bold">
                                Breakeven: &gt; 20 Years
                             </div>
                         )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-right border-collapse">
                            <thead className="bg-slate-50 text-slate-500 uppercase">
                                <tr>
                                    <th className="px-3 py-3 text-left">Year</th>
                                    <th className="px-3 py-3">Gen (kWh)</th>
                                    <th className="px-3 py-3">Tariff</th>
                                    <th className="px-3 py-3">Bill Savings</th>
                                    <th className="px-3 py-3 text-emerald-600">CA</th>
                                    {result.isGitaEligible && <th className="px-3 py-3 text-emerald-600">GITA</th>}
                                    <th className="px-3 py-3 text-red-500">Annual Opex</th>
                                    {showInstallmentTable && <th className="px-3 py-3 text-indigo-500">Installment</th>}
                                    <th className="px-3 py-3 font-bold">Total Savings</th>
                                    <th className="px-3 py-3 font-bold bg-slate-100">Accumulated Net Cashflow</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeCashflowData.map((row) => (
                                    <tr key={row.year} className={row.year === 0 ? "font-bold bg-slate-50" : "hover:bg-slate-50"}>
                                        <td className="px-3 py-2 text-left font-bold text-slate-700">{row.year}</td>
                                        {row.year === 0 ? (
                                            <>
                                                <td colSpan={result.isGitaEligible ? 7 : 6} className="px-3 py-2 text-center text-slate-400">
                                                    {showInstallmentTable ? 'Initial Investment (Financed)' : 'Initial Investment'}
                                                </td>
                                                {showInstallmentTable && <td></td>}
                                                <td className={`px-3 py-2 ${showInstallmentTable ? 'text-slate-400' : 'text-red-600 bg-red-100 rounded-l'}`}>
                                                    {showInstallmentTable ? '0' : `- RM ${result.totalPrice.toLocaleString(undefined, {maximumFractionDigits:0})}`}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-3 py-2 text-slate-600">{row.gen.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                                                <td className="px-3 py-2 text-slate-500">{row.tariff.toFixed(3)}</td>
                                                <td className="px-3 py-2 text-slate-800">{row.billSavings.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                                                <td className="px-3 py-2 text-emerald-600">{row.caTaxSaving > 0 ? row.caTaxSaving.toLocaleString(undefined, {maximumFractionDigits:0}) : '-'}</td>
                                                {result.isGitaEligible && (
                                                    <td className="px-3 py-2 text-emerald-600">{row.gita > 0 ? row.gita.toLocaleString(undefined, {maximumFractionDigits:0}) : '-'}</td>
                                                )}
                                                <td className="px-3 py-2 text-red-500">{row.opex > 0 ? "- " + row.opex.toLocaleString(undefined, {maximumFractionDigits:0}) : '-'}</td>
                                                {showInstallmentTable && (
                                                    <td className="px-3 py-2 text-indigo-500">
                                                        {row.installment !== undefined && row.installment > 0 ? "- " + row.installment.toLocaleString(undefined, {maximumFractionDigits:0}) : '-'}
                                                    </td>
                                                )}
                                                <td className="px-3 py-2 font-bold text-slate-900">{row.totalSavings.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                                                <td className={`px-3 py-2 font-bold bg-slate-50 border-l border-slate-100 ${row.accumulated > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {row.accumulated.toLocaleString(undefined, {maximumFractionDigits:0})}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
               </div>
           )}

        </div>
      </div>

      {/* MODAL */}
      {result && (
        <WhatsAppModal 
           isOpen={isWAModalOpen} 
           onClose={() => setIsWAModalOpen(false)}
           data={{
              systemSizeKw: result.systemSizeKw,
              panels: parseFloat(panelsValue),
              brandName: selectedBrand?.name || '',
              meterName: selectedMeter?.name || '',
              tariff: parseFloat(getActiveTariffGroup()?.rate.toString() || settings.tariffRate.toString()),
              taxRate: settings.taxRate,
              sunHours: settings.sunHours,
              result: result,
              inverterSize: inverterSize,
              billAmount: billAmount || '0',
              targetKwh: targetKwh || '0',
              opStartHour: opStartHour,
              opEndHour: opEndHour,
              noLoadDays: noLoadDays,
              roofLimit: roofLimit
           }}
        />
      )}
    </div>
  );
};

export default CalculatorPage;