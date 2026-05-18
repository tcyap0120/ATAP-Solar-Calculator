import React, { useState, useMemo } from 'react';
import { useAppContext } from '../App';
import { DollarSign, Sun, Activity, Zap } from 'lucide-react';

const CalculatorPage: React.FC = () => {
    const { settings } = useAppContext();
    const [billAmount, setBillAmount] = useState<string>('3000');
    const [selectedTariffId, setSelectedTariffId] = useState<string>(settings.tariffGroups?.[0]?.id || '');

    const calculation = useMemo(() => {
        const bill = parseFloat(billAmount) || 0;
        const tariff = settings.tariffGroups?.find(t => t.id === selectedTariffId) || settings.tariffGroups?.[0];
        
        if (!tariff || bill <= 0) return null;

        const effectiveRate = tariff.rate;
        const kwtbb = (tariff.kwtbbPct || 1.6) / 100;
        
        // Estimate Consumption from Bill
        // Bill = (Energy * Rate) + (Energy * Rate * KWTBB) + FixedCharge
        // Bill - FixedCharge = Energy * Rate * (1 + KWTBB)
        const fixedCharge = 20.00; // Standard commercial fixed charge
        const estimatedUsageKwh = Math.max(0, (bill - fixedCharge) / (effectiveRate * (1 + kwtbb)));

        // Basic sizing logic for recommendation
        // Assume 30% daytime usage as a baseline for "Recommender"
        const daytimeRatio = 0.3; 
        const daytimeUsage = estimatedUsageKwh * daytimeRatio;
        
        // Solar Generation Factor (kWh per kWp per month)
        // Using settings.sunHours * 30 days
        const yieldPerKwp = (settings.sunHours || 3.4) * 30;
        
        // Recommend size to match daytime usage
        const recommendedKwp = daytimeUsage / yieldPerKwp;
        const panelRating = settings.panelRating || 0.6;
        const recommendedPanels = Math.ceil(recommendedKwp / panelRating);
        const systemSize = recommendedPanels * panelRating;
        
        const monthlyGen = systemSize * yieldPerKwp;
        const selfConsumed = Math.min(monthlyGen, daytimeUsage);
        const exported = Math.max(0, monthlyGen - selfConsumed);
        
        const exportRate = settings.exportRate || 0.20;
        
        const savingsImport = selfConsumed * effectiveRate * (1 + kwtbb);
        const savingsExport = exported * exportRate;
        const totalMonthlySavings = savingsImport + savingsExport;
        
        // Simple Cost Estimation
        // Base Price from reference table if available, else fallback
        let estCost = systemSize * 2500; // Fallback
        const refPrice = settings.referencePrices?.find(r => r.panels === recommendedPanels);
        if (refPrice) {
            estCost = refPrice.price + 3000; // Add inverter base fee estimate
        }

        const roi = totalMonthlySavings > 0 ? estCost / (totalMonthlySavings * 12) : 0;

        return {
            estimatedUsageKwh,
            systemSize,
            recommendedPanels,
            monthlyGen,
            totalMonthlySavings,
            estCost,
            roi
        };
    }, [billAmount, selectedTariffId, settings]);

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Solar Recommender</h1>
                <p className="text-slate-500 font-medium mt-1">Quick estimation based on your monthly bill.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-6">
                    <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                        <Zap className="text-emerald-500"/> Your Usage
                    </h2>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Bill (RM)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">RM</span>
                            <input 
                                type="number"
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                         <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tariff Category</label>
                         <select 
                            value={selectedTariffId}
                            onChange={(e) => setSelectedTariffId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                         >
                             {settings.tariffGroups?.map(t => (
                                 <option key={t.id} value={t.id}>{t.name}</option>
                             ))}
                         </select>
                    </div>

                    {calculation && (
                        <div className="pt-4 border-t border-slate-100">
                             <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                                 <span>Est. Consumption</span>
                                 <span className="font-bold text-slate-800">{calculation.estimatedUsageKwh.toFixed(0)} kWh</span>
                             </div>
                        </div>
                    )}
                </div>

                {/* Result Section */}
                {calculation && (
                    <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl shadow-slate-900/10 flex flex-col justify-between relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                             <Sun size={200} />
                         </div>
                         
                         <div className="relative z-10">
                             <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2 mb-8">
                                <Activity size={20}/> Recommendation
                             </h2>
                             
                             <div className="grid grid-cols-2 gap-8 mb-8">
                                 <div>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">System Capacity</p>
                                     <p className="text-4xl font-black text-white">{calculation.systemSize.toFixed(2)} <span className="text-sm font-medium text-slate-500">kWp</span></p>
                                     <p className="text-sm text-emerald-500 font-bold mt-1">{calculation.recommendedPanels} Panels</p>
                                 </div>
                                 <div>
                                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Est. Investment</p>
                                     <p className="text-4xl font-black text-white">RM {calculation.estCost.toLocaleString(undefined, {maximumFractionDigits:0, notation:'compact'})}</p>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10 relative z-10">
                             <div className="flex justify-between items-center mb-3">
                                 <span className="text-sm font-bold text-slate-300">Monthly Savings</span>
                                 <span className="text-3xl font-black text-emerald-400">RM {calculation.totalMonthlySavings.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                             </div>
                             <div className="w-full bg-slate-700/50 rounded-full h-1.5 mb-3">
                                 <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: '60%'}}></div>
                             </div>
                             <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                 <span>Return on Investment</span>
                                 <span className="text-white">{calculation.roi.toFixed(1)} Years</span>
                             </div>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalculatorPage;