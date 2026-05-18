
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { calculateBill, getKwhFromBill, simulateSolar, calculateSystemCost } from '../utils/billingEngine';
import { PANEL_WATTAGE, BATTERY_CAPACITY_KWH, PEAK_SUN_HOURS } from '../constants';
import { InputNumber } from './InputNumber';
import { InputSlider } from './InputSlider';
import { DollarSign, Zap, Sun, Battery, Table, AlertTriangle, RefreshCw, Activity, Download, User, Phone, CheckSquare, Square } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ForecastTableProps {
  initialUsage: number;
  aprilLaunchingPromo?: boolean;
  upgradeAutoBackupBox?: boolean;
}

export const ForecastTable: React.FC<ForecastTableProps> = ({
  initialUsage,
  aprilLaunchingPromo = false,
  upgradeAutoBackupBox = false
}) => {
  // Inputs
  const [usageKwh, setUsageKwh] = useState<number | ''>(initialUsage);
  const [billAmount, setBillAmount] = useState<number | ''>(0);
  const [daytimePercent, setDaytimePercent] = useState<number>(30);
  const [panelCount, setPanelCount] = useState<number>(12);
  const [batteryCount, setBatteryCount] = useState<number>(1);
  const [phase, setPhase] = useState<'single' | 'three'>('single');
  const [remainSameTariff, setRemainSameTariff] = useState<boolean>(false);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [gapWarning, setGapWarning] = useState<boolean>(false);

  // Download personalization
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  // Constants
  const billGapLower = useMemo(() => calculateBill(1500).finalTotal, []);
  const billGapUpper = useMemo(() => calculateBill(1501).finalTotal, []);

  // Initialize
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
    setUsageKwh(1501);
  };

  // --- Forecast Generation ---
  const forecastData = useMemo(() => {
    const safeUsage = typeof usageKwh === 'number' ? usageKwh : 0;
    const data = [];
    let accumulatedSavings = 0;

    // Calculate System Cost
    const costData = calculateSystemCost(panelCount, batteryCount, phase, {
      aprilLaunchingPromo,
      backupBoxUpgrade: upgradeAutoBackupBox
    });
    const systemCost = costData ? costData.cash : 0;

    // Constants for calculation
    const kwPerPanel = PANEL_WATTAGE / 1000;
    const baseTariff = safeUsage > 1500 ? 0.5443 : 0.4443;
    
    // Original Bill (Base Annual without inflation)
    const baseOriginalMonthly = calculateBill(safeUsage).finalTotal;
    const baseOriginalAnnual = baseOriginalMonthly * 12;

    for (let year = 0; year <= 30; year++) {
      let performance = 0;
      let tariffMultiplier = 1;
      let currentTariffRate = baseTariff;
      let annualYield = 0;
      let billBeforeAnnual = 0;
      let billChargeAnnual = 0;
      let exportCreditAnnual = 0;
      let billAfterAnnual = 0;
      let netSaving = 0;
      let capex = 0;

      // Year 0 is Setup / Investment Year
      if (year === 0) {
         capex = systemCost;
         accumulatedSavings -= capex;
         
         data.push({
            year,
            performance: 0,
            yield: 0,
            tariff: baseTariff,
            billBefore: 0,
            billCharge: 0,
            exportCredit: 0,
            billAfter: 0,
            netSaving: 0,
            systemPrice: capex,
            savingPct: 0,
            accumulated: accumulatedSavings
         });
         continue;
      }

      // --- Year 1 to 30 ---

      // 1. Degradation Logic
      if (year === 1) {
        performance = 1.0; 
      } else if (year === 2) {
        performance = 0.99; 
      } else {
        performance = 0.99 - ((year - 2) * 0.004);
      }

      // 2. Tariff Inflation Logic (10% increase every 5 years starting Year 6)
      if (!remainSameTariff) {
          tariffMultiplier = Math.pow(1.1, Math.floor((year - 1) / 5));
      } else {
          tariffMultiplier = 1;
      }
      
      currentTariffRate = baseTariff * tariffMultiplier;

      // 3. Yield Calculation
      annualYield = panelCount * kwPerPanel * PEAK_SUN_HOURS * 365 * performance;
      
      // 4. Bill Calculations
      // Apply tariff multiplier to the base annual bill
      billBeforeAnnual = baseOriginalAnnual * tariffMultiplier;

      // For Bill After, simulate solar with degraded panels, then apply tariff multiplier
      const effectivePanelCount = panelCount * performance;
      const sim = simulateSolar(safeUsage, daytimePercent, effectivePanelCount, batteryCount);
      
      // Extract Bill Components (Monthly)
      // We calculate Charge from components to correctly handle the "Bill Charge" column (which is Import Cost)
      // Charge = Subtotal + ServiceTax + KWTBB + EEIncentiveAdjustment
      const monthlyCharge = sim.newBill.subtotal + sim.newBill.serviceTax + sim.newBill.kwtbb + (sim.newBill.eeIncentiveAdjustment || 0);
      const monthlyExportCredit = sim.newBill.exportCredit || 0; // Negative value
      
      // Annualize and Apply Tariff Multiplier
      billChargeAnnual = (monthlyCharge * 12) * tariffMultiplier;
      
      // 5. Export Credit Logic: 0 from 11th year onward (Year 11-30)
      if (year > 10) {
        exportCreditAnnual = 0;
      } else {
        exportCreditAnnual = (monthlyExportCredit * 12) * tariffMultiplier;
      }

      // Bill After = Charge + Credit (Credit is negative). Clamp to 0.
      billAfterAnnual = Math.max(0, billChargeAnnual + exportCreditAnnual);

      // 6. Net Saving
      netSaving = billBeforeAnnual - billAfterAnnual;
      
      // 7. Accumulate
      accumulatedSavings += netSaving;
      
      const savingPct = billBeforeAnnual > 0 ? (netSaving / billBeforeAnnual) * 100 : 0;

      data.push({
        year,
        performance,
        yield: annualYield,
        tariff: currentTariffRate,
        billBefore: billBeforeAnnual,
        billCharge: billChargeAnnual,
        exportCredit: exportCreditAnnual,
        billAfter: billAfterAnnual,
        netSaving,
        systemPrice: 0,
        savingPct,
        accumulated: accumulatedSavings
      });
    }
    
    return data;
  }, [usageKwh, panelCount, batteryCount, daytimePercent, phase, remainSameTariff, aprilLaunchingPromo, upgradeAutoBackupBox]);

  const totalKwp = (panelCount * (PANEL_WATTAGE/1000)).toFixed(2);

  const handleDownload = async () => {
      if (!tableRef.current) return;
      
      try {
          const canvas = await html2canvas(tableRef.current, {
              scale: 2,
              backgroundColor: '#ffffff'
          });
          
          const link = document.createElement('a');
          link.download = `Solar-Forecast-${new Date().toISOString().slice(0,10)}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
      } catch (err) {
          console.error("Failed to download image", err);
          alert("Failed to download image");
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Configuration Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Table className="text-blue-600" size={24} />
            Forecast Profile
            </h2>
            <div className="flex gap-2 w-full md:w-auto">
                <button 
                    onClick={handleDownload} 
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/10"
                >
                    <Download size={16} />
                    Download Report
                </button>
            </div>
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
                  <button onClick={fixBillAmount} className="mt-1 text-blue-600 font-bold hover:underline hover:text-blue-700 flex items-center gap-1 transition-colors">
                    Round up <RefreshCw size={10} />
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
              <Zap size={16} /> Meter Phase
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPhase('single')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${phase === 'single' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Single
              </button>
              <button
                onClick={() => setPhase('three')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${phase === 'three' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Three
              </button>
            </div>
          </div>
          
           <div className="flex items-center gap-2">
            <div className="flex-1">
              <InputSlider
                label="Daytime Usage %"
                value={daytimePercent}
                min={0} max={100} unit="%"
                onChange={setDaytimePercent}
                icon={<Sun size={16} />}
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
              helperText={`${totalKwp} kWp`} 
           />
           <InputNumber 
              label="Batteries" 
              value={batteryCount} 
              onChange={val => setBatteryCount(Number(val))} 
              icon={<Battery size={16}/>} 
              helperText="14kWh Unit" 
           />
        </div>

        {/* Optional User Data for Report */}
        <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <User size={12}/> Agent Name
                        </label>
                        <input 
                            type="text" 
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Enter Client Name"
                            className="w-full bg-transparent outline-none text-slate-700 font-bold"
                        />
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Phone size={12}/> Contact Number
                        </label>
                        <input 
                            type="text" 
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Enter Phone Number"
                            className="w-full bg-transparent outline-none text-slate-700 font-bold"
                        />
                    </div>
                </div>

                <div className="lg:w-1/3 flex items-center">
                    <button 
                        onClick={() => setRemainSameTariff(!remainSameTariff)}
                        className={`w-full p-4 rounded-xl border transition-all flex items-center gap-3 ${remainSameTariff ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                         {remainSameTariff ? <CheckSquare size={24} className="text-blue-600" /> : <Square size={24} className="text-slate-300" />}
                         <div className="text-left">
                            <div className="font-bold text-sm">Remain Same Tariff</div>
                            <div className="text-xs opacity-70">Do NOT simulate 10% inflation every 5 years</div>
                         </div>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Forecast Table */}
      <div className="overflow-auto bg-slate-100 rounded-2xl p-4 border border-slate-200 shadow-inner">
        <div ref={tableRef} className="bg-white p-8 rounded-xl shadow-sm min-w-[1200px] relative">
            
            {/* Header / Watermark */}
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <img src={`${(import.meta as any).env.BASE_URL}astern_logo.png`} alt="Astern Logo" className="h-[180px] w-auto mb-4 object-contain" />
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Solar ROI Forecast</h1>
                    <div className="flex gap-6 text-sm text-slate-500 font-medium">
                        {customerName && <span className="flex items-center gap-1"><User size={14}/> {customerName}</span>}
                        {phoneNumber && <span className="flex items-center gap-1"><Phone size={14}/> {phoneNumber}</span>}
                        <span className="flex items-center gap-1 text-slate-400">|</span>
                        <span>{new Date().toLocaleDateString()}</span>
                    </div>
                </div>
                
                <div className="flex flex-col items-end gap-6">
                    {/* Parameter Summary Box */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-[300px] shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-200">
                            Forecast Profile
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Monthly Bill</span>
                                <span className="font-bold text-slate-800">RM {typeof billAmount === 'number' ? billAmount.toLocaleString() : 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Monthly Usage</span>
                                <span className="font-bold text-slate-800">{typeof usageKwh === 'number' ? usageKwh.toLocaleString() : 0} kWh</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Meter Phase</span>
                                <span className="font-bold text-slate-800 capitalize">{phase === 'single' ? 'Single Phase' : 'Three Phase'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500 font-medium">Daytime Usage</span>
                                <span className="font-bold text-slate-800">{daytimePercent}%</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-200 mt-2">
                                <span className="text-slate-500 font-medium">Installing System</span>
                                <span className="font-bold text-blue-600 text-right">{panelCount} Panels / {totalKwp} kWp</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated Net Savings (30 Years)</div>
                        <div className="text-4xl font-bold text-emerald-600 tracking-tight">RM {forecastData[30].accumulated.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    </div>
                </div>
            </div>

            <table className="w-full text-sm text-left border-collapse">
                <thead>
                    <tr className="border-b-2 border-slate-100">
                        <th className="py-4 px-2 text-center text-slate-500 font-bold uppercase text-xs tracking-wider">Year</th>
                        <th className="py-4 px-2 text-right text-slate-500 font-bold uppercase text-xs tracking-wider">Perf.</th>
                        <th className="py-4 px-2 text-right text-slate-500 font-bold uppercase text-xs tracking-wider">Yield (kWh)</th>
                        <th className="py-4 px-2 text-center text-slate-500 font-bold uppercase text-xs tracking-wider">Tariff</th>
                        <th className="py-4 px-2 text-right text-slate-400 font-bold uppercase text-xs tracking-wider">Bill Before</th>
                        <th className="py-4 px-2 text-right text-slate-500 font-bold uppercase text-xs tracking-wider bg-slate-50/50">Bill Charge</th>
                        <th className="py-4 px-2 text-right text-emerald-600 font-bold uppercase text-xs tracking-wider bg-emerald-50/10">Export Credit</th>
                        <th className="py-4 px-2 text-right text-slate-800 font-bold uppercase text-xs tracking-wider">Bill After</th>
                        <th className="py-4 px-2 text-right text-emerald-600 font-bold uppercase text-xs tracking-wider">Net Saving</th>
                        <th className="py-4 px-2 text-right text-red-500 font-bold uppercase text-xs tracking-wider">System Cost</th>
                        <th className="py-4 px-2 text-right text-blue-600 font-bold uppercase text-xs tracking-wider">Accumulated</th>
                    </tr>
                </thead>
                <tbody className="font-mono text-slate-600">
                    {forecastData.map((row, idx) => (
                        <tr key={row.year} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${row.year === 0 ? 'bg-slate-50/80 font-bold' : ''}`}>
                            <td className="py-3 px-2 text-center font-bold text-slate-800">{row.year}</td>
                            <td className="py-3 px-2 text-right text-xs">
                                {row.year === 0 ? '-' : `${(row.performance * 100).toFixed(1)}%`}
                            </td>
                            <td className="py-3 px-2 text-right">
                                {row.year === 0 ? '-' : Math.round(row.yield).toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-center text-xs text-slate-400">
                                {row.tariff.toFixed(4)}
                            </td>
                            <td className="py-3 px-2 text-right text-slate-400">
                                {Math.round(row.billBefore).toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right text-slate-500 bg-slate-50/50">
                                {Math.round(row.billCharge).toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right text-emerald-600 bg-emerald-50/10">
                                {row.exportCredit !== 0 ? Math.round(row.exportCredit).toLocaleString() : '-'}
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-slate-700">
                                {Math.round(row.billAfter).toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-emerald-600">
                                {Math.round(row.netSaving).toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right text-red-500">
                                {row.systemPrice > 0 ? `(RM ${row.systemPrice.toLocaleString()})` : '-'}
                            </td>
                            <td className={`py-3 px-2 text-right font-bold ${row.accumulated >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                                {Math.round(row.accumulated).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Assumptions Footer */}
            <div className="mt-8 pt-6 border-t-2 border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs text-slate-400">
                <div className="space-y-1">
                    <p className="font-bold text-slate-500 uppercase tracking-wider mb-2">Key Assumptions</p>
                    <p>• Peak Sun Hours: <strong>{PEAK_SUN_HOURS} hours/day</strong></p>
                    <p>• ATAP contract duration is 10 years, export credit exists only 10 years</p>
                    <p>• Solar Panel Degradation: <strong>-0.4% annually</strong> (starting Year 3)</p>
                    <p>• Tariff Rate Inflation: <strong>{remainSameTariff ? 'None (Fixed Rate)' : '+10% every 5 years (starting Year 6)'}</strong></p>
                </div>
                <div className="text-right">
                    <p>Generated by <strong>Astern AI BESS 360</strong></p>
                    <p className="opacity-70">Disclaimer: Figures are projections based on historical data and specified parameters.</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
