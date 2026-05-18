
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../CommercialSolarShell';
import { ChevronDown, Receipt, Zap, AlertCircle } from 'lucide-react';

const BillEstimatorPage: React.FC = () => {
  const { settings } = useAppContext();
  
  const [estimatorKwh, setEstimatorKwh] = useState<string>('');
  const [selectedEstimatorTariffId, setSelectedEstimatorTariffId] = useState<string>('');
  
  // Default selection
  useEffect(() => {
    if (settings.tariffGroups && settings.tariffGroups.length > 0 && !selectedEstimatorTariffId) {
        setSelectedEstimatorTariffId(settings.tariffGroups[0].id);
    }
  }, [settings.tariffGroups]);

  const calculateBillEstimation = () => {
    const kwh = parseFloat(estimatorKwh) || 0;
    const group = (settings.tariffGroups || []).find(g => g.id === selectedEstimatorTariffId);
    
    if (!group || kwh <= 0) return null;

    const retailCharge = 20.00; // Fixed Retail Charge (Caj Peruncitan)
    const energyCharge = kwh * group.rate;
    // KWTBB is calculated on Energy Charge ONLY, excluding Retail Charge
    const kwtbbCharge = energyCharge * (group.kwtbbPct / 100);
    
    const total = energyCharge + retailCharge + kwtbbCharge;

    return {
        energyCharge,
        retailCharge,
        kwtbbCharge,
        total,
        group
    };
  }

  const result = calculateBillEstimation();
  const selectedGroup = (settings.tariffGroups || []).find(g => g.id === selectedEstimatorTariffId);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up space-y-8">
      
      <header className="mb-8">
         <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Bill Estimator</h1>
         <p className="text-slate-500 font-medium mt-1">Calculate monthly electricity bills based on commercial tariffs.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* INPUT CARD */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 space-y-6 h-fit">
           <div className="flex items-center gap-3 mb-2">
              <div className="bg-cyan-100 text-cyan-600 p-3 rounded-xl">
                 <Receipt size={24} strokeWidth={2.5} />
              </div>
              <div>
                  <h2 className="font-bold text-slate-700 text-lg">Input Usage</h2>
                  <p className="text-xs text-slate-400 font-medium">Enter details below</p>
              </div>
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tariff Group</label>
              <div className="relative">
                  <select 
                    className="w-full appearance-none bg-slate-50 border border-slate-200 hover:border-cyan-300 rounded-2xl px-4 py-3.5 text-slate-700 font-semibold focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none transition-all cursor-pointer"
                    value={selectedEstimatorTariffId}
                    onChange={(e) => setSelectedEstimatorTariffId(e.target.value)}
                  >
                     {(settings.tariffGroups || []).map(group => (
                         <option key={group.id} value={group.id}>{group.name}</option>
                     ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={18} />
              </div>
              {selectedGroup && (
                <div className="mt-2 flex gap-4 text-xs text-slate-500 font-medium px-1">
                    <span>Rate: <strong className="text-slate-700">RM {selectedGroup.rate}</strong>/kWh</span>
                    <span>KWTBB: <strong className="text-slate-700">{selectedGroup.kwtbbPct}%</strong></span>
                </div>
              )}
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Consumption (kWh)</label>
              <div className="relative">
                  <input 
                      type="number" 
                      placeholder="e.g. 5000"
                      className="w-full bg-slate-50 border border-slate-200 hover:border-cyan-300 rounded-2xl px-4 py-3.5 text-slate-700 font-bold focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none transition-all text-lg"
                      value={estimatorKwh}
                      onChange={(e) => setEstimatorKwh(e.target.value)}
                  />
                  <span className="absolute right-4 top-4 text-sm font-bold text-slate-400">kWh</span>
              </div>
           </div>
        </div>

        {/* RESULT CARD */}
        <div className="space-y-6">
            {result ? (
                <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-[2rem] p-8 shadow-xl shadow-cyan-900/10 animate-fade-in-up">
                    <p className="text-cyan-100 text-xs font-bold uppercase tracking-widest mb-4">Estimated Monthly Bill</p>
                    <h3 className="text-5xl font-black mb-6 tracking-tight">
                        <span className="text-2xl font-bold opacity-60 mr-1">RM</span>
                        {result.total.toLocaleString(undefined, {maximumFractionDigits: 2, minimumFractionDigits: 2})}
                    </h3>

                    <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-md space-y-3 border border-white/10">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-cyan-50 font-medium">Energy Charge</span>
                            <span className="font-bold">RM {result.energyCharge.toLocaleString(undefined, {maximumFractionDigits:2, minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-cyan-50 font-medium">Retail Charge (Fixed)</span>
                            <span className="font-bold">RM {result.retailCharge.toLocaleString(undefined, {maximumFractionDigits:2, minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-cyan-50 font-medium">KWTBB ({result.group.kwtbbPct}%)</span>
                            <span className="font-bold">RM {result.kwtbbCharge.toLocaleString(undefined, {maximumFractionDigits:2, minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="pt-3 mt-1 border-t border-white/20 flex justify-between items-center">
                            <span className="font-bold text-cyan-50">Total Payable</span>
                            <span className="font-extrabold text-lg">RM {result.total.toLocaleString(undefined, {maximumFractionDigits:2, minimumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center p-8 text-center text-slate-400 min-h-[300px]">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                        <Zap size={32} className="text-slate-300" />
                    </div>
                    <p className="font-bold text-lg mb-1">No Estimation Yet</p>
                    <p className="text-sm">Enter consumption details to calculate the bill amount.</p>
                </div>
            )}
            
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-3 text-amber-800 text-sm">
                <AlertCircle size={20} className="shrink-0" />
                <p>
                    <strong>Note:</strong> This estimation only includes the Energy Charge, Retail Charge (RM 20), and KWTBB Fund. 
                    It does not include Minimum Monthly Charges, Late Payment Penalties, or other surcharges/rebates (ICPT).
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default BillEstimatorPage;
