
import React, { useState } from 'react';
import { useAppContext } from '../CommercialSolarShell';
import { PricingTier } from '../types';
import { Save, Plus, Trash2, RefreshCcw, Table2, Cog, ScrollText, Wrench, Battery, Banknote } from 'lucide-react';
import { COMMERCIAL_SETTINGS_SCHEMA_VERSION, DEFAULT_BRANDS, DEFAULT_METERS, DEFAULT_SETTINGS } from '../constants';
import { maxPanelsForMeter } from '../utils/meterHelpers';

const SettingsPage: React.FC = () => {
  const { settings, updateSettings, brands, updateBrands, meters, updateMeters } = useAppContext();
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'brands' | 'meters' | 'tariffs' | 'ref_rates' | 'automation' | 'other_costs' | 'battery' | 'financing'>('general');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = () => {
    updateSettings({ ...localSettings, _settingsSchemaVersion: COMMERCIAL_SETTINGS_SCHEMA_VERSION });
    setSuccessMsg('Settings saved successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm("Are you sure? This will reset all custom pricing and settings.")) {
        updateSettings(DEFAULT_SETTINGS);
        setLocalSettings(DEFAULT_SETTINGS);
        updateBrands(DEFAULT_BRANDS);
        updateMeters(DEFAULT_METERS);
        setSuccessMsg('Reset to defaults.');
        setTimeout(() => setSuccessMsg(''), 3000);
    }
  }

  // Helpers (unchanged logic)
  const updateBrandPrice = (brandId: string, tierIndex: number, field: keyof PricingTier, value: string | number | boolean) => {
    const newBrands = brands.map(b => {
      if (b.id !== brandId) return b;
      const newTiers = [...b.pricingTiers];
      newTiers[tierIndex] = { ...newTiers[tierIndex], [field]: value };
      return { ...b, pricingTiers: newTiers };
    });
    updateBrands(newBrands);
  };

  const toggleSmartLogic = (brandId: string, tierIndex: number, isChecked: boolean) => {
    const newBrands = brands.map(b => {
      if (b.id !== brandId) return b;
      const newTiers = [...b.pricingTiers];
      if (isChecked) {
          newTiers[tierIndex] = { ...newTiers[tierIndex], useSmartLogic: isChecked, pricePerKw: 0 };
      } else {
          newTiers[tierIndex] = { ...newTiers[tierIndex], useSmartLogic: isChecked };
      }
      return { ...b, pricingTiers: newTiers };
    });
    updateBrands(newBrands);
  };

  const addTier = (brandId: string) => {
    const newBrands = brands.map(b => {
        if(b.id !== brandId) return b;
        return {
            ...b,
            pricingTiers: [...b.pricingTiers, { minKw: 0, maxKw: 0, pricePerKw: 0, baseFee: 0, deductionPerKw: 0, description: 'New Tier', useSmartLogic: false }]
        }
    });
    updateBrands(newBrands);
  }

  const removeTier = (brandId: string, index: number) => {
    const newBrands = brands.map(b => {
        if(b.id !== brandId) return b;
        const newTiers = b.pricingTiers.filter((_, i) => i !== index);
        return { ...b, pricingTiers: newTiers };
    });
    updateBrands(newBrands);
  }

  const updateMeterField = (meterId: string, field: 'limitKwac' | 'maxInverterKw', val: string) => {
    const newMeters = meters.map(m => m.id === meterId ? { ...m, [field]: parseFloat(val) || 0 } : m);
    updateMeters(newMeters);
  }

  const updateRefPrice = (index: number, field: 'panels' | 'price' | 'priceCC36', value: string) => {
    const newRefs = [...(localSettings.referencePrices || [])];
    const num = parseFloat(value) || 0;
    newRefs[index] = { ...newRefs[index], [field]: num };
    setLocalSettings({ ...localSettings, referencePrices: newRefs });
  }

  const addRefPrice = () => {
    const newRefs = [...(localSettings.referencePrices || []), { panels: 0, price: 0, priceCC36: 0 }];
    setLocalSettings({ ...localSettings, referencePrices: newRefs });
  }

  const removeRefPrice = (index: number) => {
    const newRefs = (localSettings.referencePrices || []).filter((_, i) => i !== index);
    setLocalSettings({ ...localSettings, referencePrices: newRefs });
  }

  // Automation Rule Helpers
  const updateBrandRule = (index: number, field: 'minKwp' | 'maxKwp' | 'brandId', value: string | number) => {
    const newRules = [...(localSettings.brandRules || [])];
    newRules[index] = { ...newRules[index], [field]: value };
    setLocalSettings({ ...localSettings, brandRules: newRules });
  }

  const addBrandRule = () => {
      const newRules = [...(localSettings.brandRules || []), { minKwp: 0, maxKwp: 0, brandId: brands[0]?.id || '' }];
      setLocalSettings({ ...localSettings, brandRules: newRules });
  }

  const removeBrandRule = (index: number) => {
      const newRules = (localSettings.brandRules || []).filter((_, i) => i !== index);
      setLocalSettings({ ...localSettings, brandRules: newRules });
  }

  // Tariff Group Helpers
  const updateTariffGroup = (index: number, field: 'name' | 'rate' | 'kwtbbPct', value: string) => {
      const newGroups = [...(localSettings.tariffGroups || [])];
      if (field === 'name') {
          newGroups[index] = { ...newGroups[index], name: value };
      } else {
          newGroups[index] = { ...newGroups[index], [field]: parseFloat(value) };
      }
      setLocalSettings({ ...localSettings, tariffGroups: newGroups });
  }

  const addTariffGroup = () => {
      const newGroups = [...(localSettings.tariffGroups || []), { id: Date.now().toString(), name: 'New Tariff Group', rate: 0, kwtbbPct: 1.6 }];
      setLocalSettings({ ...localSettings, tariffGroups: newGroups });
  }

  const removeTariffGroup = (index: number) => {
      const newGroups = (localSettings.tariffGroups || []).filter((_, i) => i !== index);
      setLocalSettings({ ...localSettings, tariffGroups: newGroups });
  }

  // Maintenance Helpers
  const updateMaintTier = (index: number, field: 'minKwp' | 'maxKwp' | 'cost' | 'frequencyYears', value: string) => {
      const newTiers = [...(localSettings.maintenanceTiers || [])];
      newTiers[index] = { ...newTiers[index], [field]: parseFloat(value) || 0 };
      setLocalSettings({ ...localSettings, maintenanceTiers: newTiers });
  }

  const addMaintTier = () => {
      const newTiers = [...(localSettings.maintenanceTiers || []), { minKwp: 0, maxKwp: 0, cost: 0, frequencyYears: 1 }];
      setLocalSettings({ ...localSettings, maintenanceTiers: newTiers });
  }
  
  const removeMaintTier = (index: number) => {
      const newTiers = (localSettings.maintenanceTiers || []).filter((_, i) => i !== index);
      setLocalSettings({ ...localSettings, maintenanceTiers: newTiers });
  }

  // Other Cost Helpers
  const updateOtherCost = (field: keyof typeof localSettings.otherCosts, value: string) => {
      const currentCosts = localSettings.otherCosts || DEFAULT_SETTINGS.otherCosts;
      const newCosts = { ...currentCosts, [field]: parseFloat(value) || 0 };
      setLocalSettings({ ...localSettings, otherCosts: newCosts });
  }

  // Battery Helpers
  const updateBattery = (field: keyof typeof localSettings.battery, value: string) => {
      const currentBatt = localSettings.battery || DEFAULT_SETTINGS.battery;
      const newBatt = { ...currentBatt, [field]: parseFloat(value) || 0 };
      setLocalSettings({ ...localSettings, battery: newBatt });
  }

  // Financing Helpers
  const updateFinancing = (field: keyof typeof localSettings.financing, value: string) => {
      const currentFin = localSettings.financing || DEFAULT_SETTINGS.financing;
      const newFin = { ...currentFin, [field]: parseFloat(value) || 0 };
      setLocalSettings({ ...localSettings, financing: newFin });
  }


  return (
    <div className="space-y-8 pb-24 animate-fade-in-up">
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">App Settings</h1>
          <p className="text-slate-500 font-medium mt-1">Configure your pricing logic and defaults.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={handleResetDefaults}
                className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Reset Defaults"
            >
                <RefreshCcw size={20} />
            </button>
            <button 
                onClick={handleSave}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-slate-900/10 active:scale-95"
            >
                <Save size={18} />
                Save Changes
            </button>
        </div>
      </header>

      {successMsg && (
        <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-fade-in-up">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            {successMsg}
        </div>
      )}

      {/* Modern Segmented Control */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex overflow-x-auto gap-1">
        {(['general', 'brands', 'meters', 'tariffs', 'ref_rates', 'automation', 'other_costs', 'battery', 'financing'] as const).map(tab => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-xl transition-all capitalize whitespace-nowrap ${
                    activeTab === tab 
                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
            >
                {tab.replace('_', ' ')}
            </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 min-h-[400px]">
        
        {/* GENERAL SETTINGS */}
        {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
                <div className="group">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-amber-500 transition-colors">Default Panel Rating (kWp)</label>
                    <input 
                        type="number" step="0.01"
                        value={localSettings.panelRating}
                        onChange={e => setLocalSettings({...localSettings, panelRating: parseFloat(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    />
                </div>
                <div className="group">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-amber-500 transition-colors">Avg Sun Hours</label>
                    <input 
                        type="number" step="0.1"
                        value={localSettings.sunHours}
                        onChange={e => setLocalSettings({...localSettings, sunHours: parseFloat(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    />
                </div>
                {/* 
                  NOTE: Default Tariff here is the global "fallback" or residential rate. 
                  Commercial users should typically use the "Tariffs" tab to define specific groups. 
                */}
                <div className="group">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-amber-500 transition-colors">Default Tariff (RM/kWh)</label>
                    <input 
                        type="number" step="0.0001"
                        value={localSettings.tariffRate}
                        onChange={e => setLocalSettings({...localSettings, tariffRate: parseFloat(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    />
                </div>
                <div className="group">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-amber-500 transition-colors">Export Rate (ATAP) (RM/kWh)</label>
                    <input 
                        type="number" step="0.0001"
                        value={localSettings.exportRate || 0.20}
                        onChange={e => setLocalSettings({...localSettings, exportRate: parseFloat(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    />
                </div>
                 <div className="group">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-amber-500 transition-colors">KWTBB Factor (0.016 = 1.6%)</label>
                    <input 
                        type="number" step="0.001"
                        value={localSettings.kwtbb}
                        onChange={e => setLocalSettings({...localSettings, kwtbb: parseFloat(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    />
                </div>
                <div className="group col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-amber-500 transition-colors">Solar Gen Window (24h format)</label>
                    <div className="flex gap-4">
                       <div className="flex-1">
                          <span className="text-xs text-slate-400 mb-1 block">Start Hour</span>
                          <input 
                              type="number" step="1" min="0" max="23"
                              value={localSettings.solarStartHour || 10}
                              onChange={e => setLocalSettings({...localSettings, solarStartHour: parseFloat(e.target.value)})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                       </div>
                       <div className="flex-1">
                          <span className="text-xs text-slate-400 mb-1 block">End Hour</span>
                          <input 
                              type="number" step="1" min="0" max="23"
                              value={localSettings.solarEndHour || 16}
                              onChange={e => setLocalSettings({...localSettings, solarEndHour: parseFloat(e.target.value)})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                       </div>
                    </div>
                </div>
            </div>
        )}

        {/* BRANDS PRICING */}
        {activeTab === 'brands' && (
            <div className="space-y-12">
                {brands.map(brand => (
                    <div key={brand.id} className="group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-8 w-1 bg-amber-500 rounded-full"></div>
                            <h3 className="font-bold text-xl text-slate-800">{brand.name}</h3>
                        </div>
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left min-w-[900px]">
                                    <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-5 py-4">Min kWp</th>
                                            <th className="px-5 py-4">Max kWp</th>
                                            <th className="px-5 py-4">Rate (RM/kWp)</th>
                                            <th className="px-5 py-4">Base Add (RM)</th>
                                            <th className="px-5 py-4">Ded. (RM/kWp)</th>
                                            <th className="px-5 py-4 text-center">Smart?</th>
                                            <th className="px-5 py-4">Desc</th>
                                            <th className="px-5 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {brand.pricingTiers.map((tier, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-5 py-3">
                                                    <input type="number" className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-medium" value={tier.minKw} onChange={(e) => updateBrandPrice(brand.id, idx, 'minKw', parseFloat(e.target.value))} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <input type="number" className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-medium" value={tier.maxKw} onChange={(e) => updateBrandPrice(brand.id, idx, 'maxKw', parseFloat(e.target.value))} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    {tier.useSmartLogic ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md border border-blue-200 shadow-sm">
                                                            Ref. Table
                                                        </span>
                                                    ) : (
                                                        <input 
                                                            type="number" 
                                                            className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-1.5 font-bold text-slate-700" 
                                                            value={tier.pricePerKw} 
                                                            onChange={(e) => updateBrandPrice(brand.id, idx, 'pricePerKw', parseFloat(e.target.value))} 
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <input type="number" className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-medium" value={tier.baseFee} onChange={(e) => updateBrandPrice(brand.id, idx, 'baseFee', parseFloat(e.target.value))} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <input type="number" className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-medium" value={tier.deductionPerKw || 0} onChange={(e) => updateBrandPrice(brand.id, idx, 'deductionPerKw', parseFloat(e.target.value))} />
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={tier.useSmartLogic || false} 
                                                        onChange={(e) => toggleSmartLogic(brand.id, idx, e.target.checked)}
                                                        className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500 cursor-pointer border-slate-300" 
                                                    />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <input type="text" className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600" value={tier.description} onChange={(e) => updateBrandPrice(brand.id, idx, 'description', e.target.value)} />
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <button onClick={() => removeTier(brand.id, idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200">
                                <button onClick={() => addTier(brand.id)} className="text-xs flex items-center gap-2 text-slate-600 hover:text-amber-600 font-bold uppercase tracking-wide transition-colors">
                                    <Plus size={16} /> Add Pricing Tier
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* METERS CONFIG */}
        {activeTab === 'meters' && (
            <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-end md:items-start gap-4">
                     <div>
                        <h3 className="font-bold text-lg text-slate-800">Meter Configurations</h3>
                        <p className="text-sm text-slate-500">Two meter types: default selection in the calculator is <strong>Normal (three phase)</strong>. Oversizing depends on whether a battery is in the design.</p>
                     </div>
                     <div className="flex flex-wrap gap-4">
                         <div>
                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Oversizing (no battery)</label>
                             <input
                                type="number" step="0.01"
                                value={localSettings.oversizingRatioWithoutBattery ?? 1.37}
                                onChange={(e) => setLocalSettings({ ...localSettings, oversizingRatioWithoutBattery: parseFloat(e.target.value) })}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold w-28 text-right focus:ring-2 focus:ring-amber-500 outline-none"
                             />
                         </div>
                         <div>
                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Oversizing (with battery)</label>
                             <input
                                type="number" step="0.01"
                                value={localSettings.oversizingRatioWithBattery ?? 1.75}
                                onChange={(e) => setLocalSettings({ ...localSettings, oversizingRatioWithBattery: parseFloat(e.target.value) })}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold w-28 text-right focus:ring-2 focus:ring-amber-500 outline-none"
                             />
                         </div>
                     </div>
                </div>

                <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
                     <table className="w-full text-sm text-left min-w-[720px]">
                        <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-4">Meter Type</th>
                                <th className="px-4 py-4">AC Limit (kWac)</th>
                                <th className="px-4 py-4">Max Inverter (kWac)</th>
                                <th className="px-4 py-4">Max Panels (no batt.)</th>
                                <th className="px-4 py-4">Max Panels (with batt.)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {meters.map(meter => (
                                <tr key={meter.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-4 font-bold text-slate-700">{meter.name}</td>
                                    <td className="px-4 py-4">
                                        <input 
                                            type="number" step="0.01"
                                            className="bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg px-3 py-2 w-28 font-medium outline-none transition-colors"
                                            value={meter.limitKwac}
                                            onChange={(e) => updateMeterField(meter.id, 'limitKwac', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-4">
                                        <input 
                                            type="number" step="1"
                                            min={0}
                                            className="bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-lg px-3 py-2 w-32 font-medium outline-none transition-colors"
                                            value={meter.maxInverterKw > 0 ? meter.maxInverterKw : ''}
                                            placeholder="Unlimited"
                                            title="0 or empty = no max inverter cap (three-phase default)"
                                            onChange={(e) => updateMeterField(meter.id, 'maxInverterKw', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-slate-600 font-bold tabular-nums">
                                        {meter.maxInverterKw > 0
                                            ? maxPanelsForMeter(
                                                meter.maxInverterKw,
                                                localSettings.panelRating,
                                                localSettings.oversizingRatioWithoutBattery ?? 1.37
                                              )
                                            : <span className="text-slate-400 font-semibold">Unlimited</span>}
                                    </td>
                                    <td className="px-4 py-4 text-slate-600 font-bold tabular-nums">
                                        {meter.maxInverterKw > 0
                                            ? maxPanelsForMeter(
                                                meter.maxInverterKw,
                                                localSettings.panelRating,
                                                localSettings.oversizingRatioWithBattery ?? 1.75
                                              )
                                            : <span className="text-slate-400 font-semibold">Unlimited</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>
            </div>
        )}

        {/* TARIFFS TAB */}
        {activeTab === 'tariffs' && (
            <div className="space-y-6">
                 <div className="bg-cyan-50 border border-cyan-100 p-5 rounded-2xl flex gap-4 items-start">
                    <div className="bg-white p-2 rounded-xl text-cyan-500 shadow-sm">
                        <ScrollText size={24} />
                    </div>
                    <div className="text-sm text-cyan-900">
                        <p className="font-bold text-base mb-1">Commercial Tariff Groups</p>
                        <p className="opacity-80 leading-relaxed">Define different tariff groups (e.g., Tariff B, Tariff C). These can be selected in the Bill Estimator.</p>
                    </div>
                 </div>

                 <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Group Name</th>
                                <th className="px-6 py-4">Rate (RM/kWh)</th>
                                <th className="px-6 py-4">KWTBB (%)</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {(localSettings.tariffGroups || []).map((group, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4">
                                        <input 
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                                            value={group.name}
                                            onChange={(e) => updateTariffGroup(idx, 'name', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="number" step="0.0001"
                                            className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                                            value={group.rate}
                                            onChange={(e) => updateTariffGroup(idx, 'rate', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="number" step="0.1"
                                            className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                                            value={group.kwtbbPct}
                                            onChange={(e) => updateTariffGroup(idx, 'kwtbbPct', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => removeTariffGroup(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                        <button onClick={addTariffGroup} className="text-xs flex items-center gap-2 text-slate-600 hover:text-cyan-600 font-bold uppercase tracking-wide transition-colors">
                            <Plus size={16} /> Add Group
                        </button>
                    </div>
                 </div>
            </div>
        )}

        {/* REF RATES */}
        {activeTab === 'ref_rates' && (
            <div className="space-y-6">
                 <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex gap-4 items-start">
                    <div className="bg-white p-2 rounded-xl text-blue-500 shadow-sm">
                        <Table2 size={24} />
                    </div>
                    <div className="text-sm text-blue-900">
                        <p className="font-bold text-base mb-1">Reference Price Table</p>
                        <p className="opacity-80 leading-relaxed">This lookup table is used when Smart Logic is enabled for a pricing tier. It matches the exact number of panels to base prices. Defaults match the residential calculator: three-phase meter, with-battery system cash and 36-month CC per panel count.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {(localSettings.referencePrices || []).map((ref, idx) => (
                         <div key={idx} className="flex flex-col gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
                             <div className="flex justify-between items-center mb-1">
                                <div className="w-16">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Panels</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-center"
                                        value={ref.panels}
                                        onChange={(e) => updateRefPrice(idx, 'panels', e.target.value)}
                                    />
                                </div>
                                <button onClick={() => removeRefPrice(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                    <Trash2 size={16} />
                                </button>
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cash (RM)</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold"
                                        value={ref.price}
                                        onChange={(e) => updateRefPrice(idx, 'price', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">36M CC (RM)</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 text-sm font-semibold text-amber-900"
                                        value={ref.priceCC36 || 0}
                                        onChange={(e) => updateRefPrice(idx, 'priceCC36', e.target.value)}
                                    />
                                </div>
                             </div>
                         </div>
                     ))}
                     <button 
                        onClick={addRefPrice}
                        className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 transition-all group min-h-[120px]"
                     >
                        <Plus size={32} className="mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider">Add Rate</span>
                     </button>
                 </div>
            </div>
        )}

        {/* AUTOMATION RULES */}
        {activeTab === 'automation' && (
            <div className="space-y-6">
                 <div className="bg-purple-50 border border-purple-100 p-5 rounded-2xl flex gap-4 items-start">
                    <div className="bg-white p-2 rounded-xl text-purple-500 shadow-sm">
                        <Cog size={24} />
                    </div>
                    <div className="text-sm text-purple-900">
                        <p className="font-bold text-base mb-1">Brand Automation</p>
                        <p className="opacity-80 leading-relaxed">Automatically switch the Inverter Brand when the system capacity (kWp) falls within these ranges during "Quick Recommendation".</p>
                    </div>
                 </div>

                 <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                    <table className="w-full min-w-[520px] table-fixed text-sm text-left">
                        <colgroup>
                            <col className="w-[7.5rem]" />
                            <col className="w-[7.5rem]" />
                            <col />
                            <col className="w-14" />
                        </colgroup>
                        <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Min kWp</th>
                                <th className="px-4 py-3">Max kWp</th>
                                <th className="px-4 py-3">Auto-Select Brand</th>
                                <th className="px-2 py-3 text-center" aria-label="Remove rule"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {(localSettings.brandRules || []).map((rule, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 align-middle">
                                        <input 
                                            type="number"
                                            className="w-full max-w-[6.5rem] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-medium"
                                            value={rule.minKwp}
                                            onChange={(e) => updateBrandRule(idx, 'minKwp', parseFloat(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                        <input 
                                            type="number"
                                            className="w-full max-w-[6.5rem] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-medium"
                                            value={rule.maxKwp}
                                            onChange={(e) => updateBrandRule(idx, 'maxKwp', parseFloat(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-4 py-3 align-middle min-w-0">
                                        <select 
                                            className="w-full min-w-0 max-w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-purple-200"
                                            value={rule.brandId}
                                            onChange={(e) => updateBrandRule(idx, 'brandId', e.target.value)}
                                        >
                                            <option value="">-- Select Brand --</option>
                                            {brands.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-2 py-3 align-middle text-center">
                                        <button type="button" onClick={() => removeBrandRule(idx)} className="inline-flex p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" aria-label="Remove rule">
                                            <Trash2 size={16} className="shrink-0" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                        <button onClick={addBrandRule} className="text-xs flex items-center gap-2 text-slate-600 hover:text-purple-600 font-bold uppercase tracking-wide transition-colors">
                            <Plus size={16} /> Add Rule
                        </button>
                    </div>
                 </div>
            </div>
        )}
        
        {/* OTHER COSTS (OPEX & FEES) */}
        {activeTab === 'other_costs' && (
            <div className="space-y-12">
                
                {/* 1. Regulatory Costs */}
                <div>
                     <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex gap-4 items-start mb-6">
                        <div className="bg-white p-2 rounded-xl text-slate-600 shadow-sm">
                            <Wrench size={24} />
                        </div>
                        <div className="text-sm text-slate-800">
                            <p className="font-bold text-base mb-1">Regulatory & Compliance Fees</p>
                            <p className="text-slate-500 leading-relaxed">Configure thresholds and costs for GITA, ST Licensing, and compulsory personnel (Chargeman, Visiting Engineer).</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* GITA */}
                        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                            <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">GITA Processing</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fee Amount (RM)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                                        value={localSettings.otherCosts?.gitaFee}
                                        onChange={(e) => updateOtherCost('gitaFee', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fee Threshold (&lt; kWp)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                                        value={localSettings.otherCosts?.gitaFeeThreshold}
                                        onChange={(e) => updateOtherCost('gitaFeeThreshold', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Incentive Threshold (&ge; kWp)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                                        value={localSettings.otherCosts?.gitaIncentiveThreshold || 60}
                                        onChange={(e) => updateOtherCost('gitaIncentiveThreshold', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ST License */}
                        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                            <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">ST License</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rate (RM/kWp/Year)</label>
                                    <input 
                                        type="number" step="0.01"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                                        value={localSettings.otherCosts?.stLicenseRate}
                                        onChange={(e) => updateOtherCost('stLicenseRate', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Threshold (Apply if &ge; kWp)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                                        value={localSettings.otherCosts?.stLicenseThreshold}
                                        onChange={(e) => updateOtherCost('stLicenseThreshold', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Chargeman */}
                        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                            <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">Chargeman</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Cost (RM)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                                        value={localSettings.otherCosts?.chargemanCost}
                                        onChange={(e) => updateOtherCost('chargemanCost', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Threshold (Apply if &ge; kWp)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                                        value={localSettings.otherCosts?.chargemanThreshold}
                                        onChange={(e) => updateOtherCost('chargemanThreshold', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Engineer */}
                        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                            <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">Visiting Engineer</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Monthly Cost (RM)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                                        value={localSettings.otherCosts?.visitingEngineerCost}
                                        onChange={(e) => updateOtherCost('visitingEngineerCost', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Threshold (Apply if &ge; kWp)</label>
                                    <input 
                                        type="number"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                                        value={localSettings.otherCosts?.visitingEngineerThreshold}
                                        onChange={(e) => updateOtherCost('visitingEngineerThreshold', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                     </div>
                </div>

                {/* 2. Maintenance Tiers */}
                <div>
                    <h3 className="font-bold text-xl text-slate-800 mb-2">Maintenance Cost Tiers</h3>
                    <p className="text-xs text-slate-500 mb-4 max-w-3xl">
                      Tier <strong>cost</strong> is the amount per maintenance event (table “RM / Year”). In the calculator, systems <strong>below 96 kWp</strong> pay that amount once every <strong>3 years</strong> (first payment in <strong>year 3</strong> of the cashflow table). Systems <strong>96 kWp and above</strong> pay the same tier amount <strong>every year</strong>. The “Frequency (Yrs)” column below is optional metadata only; cashflow uses the rule above.
                    </p>
                    <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs font-bold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Min kWp</th>
                                    <th className="px-6 py-4">Max kWp</th>
                                    <th className="px-6 py-4">Cost Per Service (RM)</th>
                                    <th className="px-6 py-4">Frequency (Yrs)</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {(localSettings.maintenanceTiers || []).map((tier, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4">
                                            <input 
                                                type="number"
                                                className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                                                value={tier.minKwp}
                                                onChange={(e) => updateMaintTier(idx, 'minKwp', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="number"
                                                className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                                                value={tier.maxKwp}
                                                onChange={(e) => updateMaintTier(idx, 'maxKwp', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="number"
                                                className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                                                value={tier.cost}
                                                onChange={(e) => updateMaintTier(idx, 'cost', e.target.value)}
                                            />
                                        </td>
                                         <td className="px-6 py-4">
                                            <input 
                                                type="number"
                                                className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
                                                value={tier.frequencyYears || 1}
                                                onChange={(e) => updateMaintTier(idx, 'frequencyYears', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => removeMaintTier(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                            <button onClick={addMaintTier} className="text-xs flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold uppercase tracking-wide transition-colors">
                                <Plus size={16} /> Add Tier
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* BATTERY CONFIG */}
        {activeTab === 'battery' && (
            <div className="space-y-6">
                 <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex gap-4 items-start">
                    <div className="bg-white p-2 rounded-xl text-emerald-500 shadow-sm">
                        <Battery size={24} />
                    </div>
                    <div className="text-sm text-emerald-900">
                        <p className="font-bold text-base mb-1">Battery Energy Storage (BESS)</p>
                        <p className="opacity-80 leading-relaxed">Configure the parameters for the "BESS Coverage" recommendation strategy.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
                     <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-emerald-500 transition-colors">Battery Capacity (kWh)</label>
                        <input 
                            type="number" step="0.1"
                            value={localSettings.battery?.capacityKwh || 16}
                            onChange={e => updateBattery('capacityKwh', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                     </div>
                     <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-emerald-500 transition-colors">Usable Ratio (0.9 = 90%)</label>
                        <input 
                            type="number" step="0.01" max="1"
                            value={localSettings.battery?.usableRatio || 0.9}
                            onChange={e => updateBattery('usableRatio', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                     </div>
                     <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-emerald-500 transition-colors">Price per Battery Unit (RM)</label>
                        <input 
                            type="number" step="1"
                            value={localSettings.battery?.pricePerUnit ?? 8200}
                            onChange={e => updateBattery('pricePerUnit', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                     </div>
                     <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-emerald-500 transition-colors">Max Battery Quantity</label>
                        <input 
                            type="number" step="1"
                            value={localSettings.battery?.maxCount || 4}
                            onChange={e => updateBattery('maxCount', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        />
                     </div>
                 </div>
            </div>
        )}

        {/* FINANCING CONFIG */}
        {activeTab === 'financing' && (
            <div className="space-y-6">
                 <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex gap-4 items-start">
                    <div className="bg-white p-2 rounded-xl text-indigo-500 shadow-sm">
                        <Banknote size={24} />
                    </div>
                    <div className="text-sm text-indigo-900">
                        <p className="font-bold text-base mb-1">Installment Plan Settings</p>
                        <p className="opacity-80 leading-relaxed">Configure default loan parameters for the Installment Cashflow Table.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
                     <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-indigo-500 transition-colors">Interest Rate (%)</label>
                        <input 
                            type="number" step="0.1"
                            value={localSettings.financing?.interestRate ?? 5}
                            onChange={e => updateFinancing('interestRate', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                     </div>
                     <div className="group">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 group-focus-within:text-indigo-500 transition-colors">Tenure (Years)</label>
                        <input 
                            type="number" step="1"
                            value={localSettings.financing?.tenureYears ?? 7}
                            onChange={e => updateFinancing('tenureYears', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                     </div>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default SettingsPage;
