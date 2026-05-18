import React, { useState, useEffect } from 'react';
import { generateDocument } from '../utils/docGenerator';
import { calculateSystemCost } from '../utils/billingEngine';
import { BATTERY_COST_CASH, PANEL_WATTAGE, PEAK_SUN_HOURS, APRIL_PROMO_BATTERY_UNIT_DISCOUNT } from '../constants';
import { InputNumber } from './InputNumber';
import { FileText, RefreshCw, User, Briefcase, Phone, Mail, MapPin, Zap, Battery, DollarSign, Activity, AlertTriangle, CreditCard, UserCheck, FileDown, PenTool } from 'lucide-react';

interface DocFormProps {
  aprilLaunchingPromo?: boolean;
  upgradeAutoBackupBox?: boolean;
  initialData?: {
    systemSize?: number;
    panelCount?: number;
    inverterSize?: string;
    systemPrice?: number;
    systemCCPrice?: number;
    batteryCount?: number;
    batteryCash?: number;
    annualGen?: number;
    monthlyGen?: number;
  }
}

// Moved outside to prevent re-mounting on every render (Fixes typing focus issue)
const InputText = ({ label, value, onChange, icon, fullWidth, placeholder }: any) => (
  <div className={`bg-white p-3 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all ${fullWidth ? 'col-span-full' : ''}`}>
    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
      {icon} {label}
    </label>
    <input 
      type="text" 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full outline-none text-slate-700 font-medium placeholder:text-slate-300"
    />
  </div>
);

export const DocForm: React.FC<DocFormProps> = ({
  initialData,
  aprilLaunchingPromo = false,
  upgradeAutoBackupBox = false
}) => {
  // Agent Details
  const [agentName, setAgentName] = useState('');

  // Client Details
  const [salutation, setSalutation] = useState('Mr');
  const [clientName, setClientName] = useState('');
  const [clientIC, setClientIC] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [addressLine3, setAddressLine3] = useState('');

  // System Details
  const [systemSize, setSystemSize] = useState<number | ''>(initialData?.systemSize || '');
  const [panelCount, setPanelCount] = useState<number | ''>(initialData?.panelCount || '');
  
  // Initialize inverter size as a number (string for input, parsed later)
  const parseInverterSize = (str?: string) => {
    if (!str) return '';
    const match = str.match(/^(\d+(\.\d+)?)/);
    return match ? match[1] : '';
  };

  const [inverterSize, setInverterSize] = useState<string | number>(parseInverterSize(initialData?.inverterSize));
  const [inverterBrand, setInverterBrand] = useState('GoodWe');
  const [meterPhase, setMeterPhase] = useState<'Single' | 'Three'>('Single');
  
  // Pricing
  const [systemPrice, setSystemPrice] = useState<number | ''>(initialData?.systemPrice || '');
  const [batteryCashPrice, setBatteryCashPrice] = useState<number | ''>(initialData?.batteryCash || 0);
  const [systemCCPrice, setSystemCCPrice] = useState<number | ''>(initialData?.systemCCPrice || '');
  
  // Battery
  const [batteryQty, setBatteryQty] = useState<number | ''>(initialData?.batteryCount || 0);
  
  // Generation (Initialize rounded to 2 decimals)
  const [annualGen, setAnnualGen] = useState<number | ''>(
    initialData?.annualGen ? parseFloat(initialData.annualGen.toFixed(2)) : ''
  );
  const [monthlyGen, setMonthlyGen] = useState<number | ''>(
    initialData?.monthlyGen ? parseFloat(initialData.monthlyGen.toFixed(2)) : ''
  );

  // Track which document is currently generating
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);

  // Validation State
  const getPhaseMismatchError = () => {
    const size = parseFloat(String(inverterSize));
    if (isNaN(size) || size === 0) return null;
    
    // Updated Validation Rule: 
    // Single Phase meter: up to 8 kWac per residential sheet (21 panels)
    // Three Phase meter: Max Inverter 15kW (40 panels)
    if (meterPhase === 'Single' && size > 8) {
      return "Max 8kW for Single Phase";
    }
    
    if (meterPhase === 'Three' && size > 15) {
      return "Max 15kW for Three Phase";
    }
    
    return null;
  };

  const validationError = getPhaseMismatchError();

  // --- Auto-Sync Logic ---

  const updatePricing = (panels: number, batteries: number, phase: 'Single' | 'Three') => {
    const phaseKey = phase === 'Three' ? 'three' : 'single';
    const cost = calculateSystemCost(panels, batteries, phaseKey, {
      aprilLaunchingPromo,
      backupBoxUpgrade: upgradeAutoBackupBox
    });
    
    if (cost) {
      setSystemPrice(cost.cash);
      setSystemCCPrice(cost.cc);
      // Format inverter size: "8 kWac Single Phase" -> "8"
      const sizeNum = parseInverterSize(cost.inverterSize);
      setInverterSize(sizeNum);
      const netBattUnit = aprilLaunchingPromo ? BATTERY_COST_CASH - APRIL_PROMO_BATTERY_UNIT_DISCOUNT : BATTERY_COST_CASH;
      setBatteryCashPrice(batteries * netBattUnit);
    }
  };

  const updateGeneration = (panels: number) => {
    const kwPerPanel = PANEL_WATTAGE / 1000;
    const monthly = panels * kwPerPanel * PEAK_SUN_HOURS * 30;
    const annual = monthly * 12;
    
    setMonthlyGen(parseFloat(monthly.toFixed(2)));
    setAnnualGen(parseFloat(annual.toFixed(2)));
  };

  const handlePanelChange = (val: number | '') => {
    setPanelCount(val);
    if (typeof val === 'number') {
      // 1. Sync System Size (kWp)
      const kwp = (val * PANEL_WATTAGE) / 1000;
      setSystemSize(parseFloat(kwp.toFixed(2)));
      
      // 2. Sync Pricing
      const bQty = typeof batteryQty === 'number' ? batteryQty : 0;
      updatePricing(val, bQty, meterPhase);

      // 3. Sync Generation
      updateGeneration(val);
    }
  };

  const handleSystemSizeChange = (val: number | '') => {
    setSystemSize(val);
    if (typeof val === 'number') {
      // 1. Sync Panel Count
      const panels = Math.round((val * 1000) / PANEL_WATTAGE);
      setPanelCount(panels);

      // 2. Sync Pricing
      const bQty = typeof batteryQty === 'number' ? batteryQty : 0;
      updatePricing(panels, bQty, meterPhase);

      // 3. Sync Generation
      updateGeneration(panels);
    }
    
  };

  const handleBatteryQtyChange = (val: number | '') => {
    setBatteryQty(val);
    const qty = typeof val === 'number' ? val : 0;
    
    // Sync Pricing
    const panels = typeof panelCount === 'number' ? panelCount : 0;
    updatePricing(panels, qty, meterPhase);
  };

  const handlePhaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPhase = e.target.value as 'Single' | 'Three';
    setMeterPhase(newPhase);

    // Sync Pricing
    const panels = typeof panelCount === 'number' ? panelCount : 0;
    const bQty = typeof batteryQty === 'number' ? batteryQty : 0;
    updatePricing(panels, bQty, newPhase);
  };

  useEffect(() => {
    const panels = typeof panelCount === 'number' ? panelCount : 0;
    const qty = typeof batteryQty === 'number' ? batteryQty : 0;
    if (panels >= 6) updatePricing(panels, qty, meterPhase);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- promo toggle should refresh prices only
  }, [aprilLaunchingPromo, upgradeAutoBackupBox]);

  // --- End Auto-Sync Logic ---

  // Calculated for DOC generation only
  const systemExcludingBattery = (typeof systemPrice === 'number' && typeof batteryCashPrice === 'number') 
    ? systemPrice - batteryCashPrice 
    : 0;

  const handleImport = () => {
    if (initialData) {
        if (initialData.systemSize) setSystemSize(initialData.systemSize);
        if (initialData.panelCount) setPanelCount(initialData.panelCount);
        if (initialData.inverterSize) setInverterSize(parseInverterSize(initialData.inverterSize));
        if (initialData.systemPrice) setSystemPrice(initialData.systemPrice);
        if (initialData.systemCCPrice) setSystemCCPrice(initialData.systemCCPrice);
        if (initialData.batteryCount !== undefined) setBatteryQty(initialData.batteryCount);
        if (initialData.batteryCash) setBatteryCashPrice(initialData.batteryCash);
        
        // Round generation data to 2 decimals on import
        if (initialData.annualGen) setAnnualGen(parseFloat(initialData.annualGen.toFixed(2)));
        if (initialData.monthlyGen) setMonthlyGen(parseFloat(initialData.monthlyGen.toFixed(2)));
    }
  };

  const generateSingleDoc = async (templateName: string, docType: string) => {
    if (validationError) {
       if(!confirm(`Warning: ${validationError}. Continue generation?`)) {
         return;
       }
    }

    setGeneratingDoc(docType);
    
    try {
      // Keys matching the Word Content Control Tags (lowercase)
      // Ensure numerical formatting includes 2 decimal places where requested
      const dataMap: Record<string, string | number> = {
        agentname: agentName,
        salutation: salutation,
        clientname: clientName,
        clientic: clientIC,
        clientcompany: clientCompany,
        contactno: contactNo,
        email: email,
        addressline1: addressLine1,
        addressline2: addressLine2,
        addressline3: addressLine3,
        systemsize: systemSize,
        panel: panelCount,
        invertersize: inverterSize,
        inverterbrand: inverterBrand,
        systemprice: typeof systemPrice === 'number' ? systemPrice.toLocaleString() : '',
        meterphase: meterPhase, // 'Single' or 'Three'
        battery: batteryQty,
        batterycashprice: typeof batteryCashPrice === 'number' ? batteryCashPrice.toLocaleString() : '',
        systemexcludingbatterycash: systemExcludingBattery.toLocaleString(),
        systemccprice: typeof systemCCPrice === 'number' ? systemCCPrice.toLocaleString() : '',
        annualgeneration: typeof annualGen === 'number' ? annualGen.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '',
        monthlygeneration: typeof monthlyGen === 'number' ? monthlyGen.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : ''
      };

      // Fetch specific template
      const response = await fetch(`./${templateName}`);
      if (!response.ok) {
        throw new Error(`Could not fetch template: ${templateName}`);
      }
      const templateBlob = await response.blob();
      const generatedBlob = await generateDocument(templateBlob, dataMap);
      
      const cleanClientName = clientName.replace(/[^a-z0-9]/gi, '_').substring(0, 20) || 'Client';
      const outName = `${docType}_${cleanClientName}.docx`;
      
      // Trigger download
      const url = URL.createObjectURL(generatedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);
      alert(`Error generating ${docType}. Check console for details.`);
    } finally {
      setGeneratingDoc(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-20">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600" size={24} />
                        Document Auto-Fill
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Populate Word forms with calculated data.</p>
                </div>
                {initialData && (
                    <button 
                        onClick={handleImport}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold"
                    >
                        <RefreshCw size={16} /> Import from Calculator
                    </button>
                )}
            </div>

            {/* Sales Agent */}
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                     <UserCheck size={14} /> Sales Agent Information
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <InputText label="Agent Name" value={agentName} onChange={setAgentName} icon={<User size={14}/>} placeholder="Full Name" />
                 </div>
            </div>

            {/* Client Section */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Client Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <User size={14} /> Salutation
                            </label>
                            <input 
                                type="text" 
                                value={salutation} 
                                onChange={(e) => setSalutation(e.target.value)}
                                list="salutations"
                                className="w-full outline-none text-slate-700 font-medium"
                            />
                            <datalist id="salutations">
                                <option value="Mr"/>
                                <option value="Ms"/>
                                <option value="Mrs"/>
                                <option value="Madam"/>
                                <option value="Dato'"/>
                                <option value="Datuk"/>
                                <option value="Datin"/>
                                <option value="Datin Paduka"/>
                                <option value="Datuk Seri"/>
                                <option value="Dato’ Sri"/>
                                <option value="Dato' Wira"/>
                                <option value="Tan Sri"/>
                                <option value="Puan Sri"/>
                                <option value="Tun"/>
                                <option value="Toh Puan"/>
                                <option value="Yang Berhormat (YB)"/>
                                <option value="Yang Berbahagia (YBhg.)"/>
                                <option value="Yang Amat Berhormat (YAB)"/>
                                <option value="Prof"/>
                                <option value="Dr"/>
                                <option value="Assoc. Prof"/>
                                <option value="Ir"/>
                                <option value="Haji"/>
                                <option value="Hajah"/>
                            </datalist>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <InputText label="Client Name" value={clientName} onChange={setClientName} icon={<User size={14}/>} placeholder="Full Legal Name" />
                    </div>
                    
                    <InputText label="Client IC / Passport" value={clientIC} onChange={setClientIC} icon={<CreditCard size={14}/>} />
                    <div className="md:col-span-2">
                         <InputText label="Company Name (Optional)" value={clientCompany} onChange={setClientCompany} icon={<Briefcase size={14}/>} />
                    </div>
                    
                    <InputText label="Contact No" value={contactNo} onChange={setContactNo} icon={<Phone size={14}/>} />
                    <div className="md:col-span-2">
                        <InputText label="Email" value={email} onChange={setEmail} icon={<Mail size={14}/>} />
                    </div>
                    
                    <div className="md:col-span-3">
                         <InputText label="Address Line 1" value={addressLine1} onChange={setAddressLine1} icon={<MapPin size={14}/>} />
                    </div>
                    <div className="md:col-span-3">
                        <InputText label="Address Line 2" value={addressLine2} onChange={setAddressLine2} icon={<MapPin size={14}/>} />
                    </div>
                    <div className="md:col-span-3">
                        <InputText label="Address Line 3" value={addressLine3} onChange={setAddressLine3} icon={<MapPin size={14}/>} />
                    </div>
                </div>
            </div>

            {/* System Specs */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">System Specifications</h3>
                
                {/* Row 1: Manual Configuration (Highlighted) */}
                <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 mb-4 shadow-sm">
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <PenTool size={12} /> Manual Configuration
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {/* Panel Qty */}
                         <div className="bg-white p-3 rounded-xl border-2 border-blue-200 shadow-sm focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Zap size={14}/> Panel Quantity
                            </label>
                            <input 
                                type="number" 
                                value={panelCount} 
                                onChange={(e) => handlePanelChange(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full text-xl font-bold text-slate-800 outline-none"
                                placeholder="0"
                            />
                         </div>

                         {/* Battery Qty */}
                         <div className="bg-white p-3 rounded-xl border-2 border-blue-200 shadow-sm focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Battery size={14}/> Battery Quantity
                            </label>
                            <input 
                                type="number" 
                                value={batteryQty} 
                                onChange={(e) => handleBatteryQtyChange(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full text-xl font-bold text-slate-800 outline-none"
                                placeholder="0"
                            />
                         </div>
                         
                         {/* Phase Selection */}
                         <div className="bg-white p-3 rounded-xl border-2 border-blue-200 shadow-sm focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Activity size={14} /> Meter Phase
                            </label>
                            <select 
                              value={meterPhase} 
                              onChange={handlePhaseChange}
                              className="w-full outline-none text-xl font-bold text-slate-800 bg-transparent cursor-pointer"
                            >
                              <option value="Single">Single Phase</option>
                              <option value="Three">Three Phase</option>
                            </select>
                         </div>
                    </div>
                </div>

                {/* Row 2: Secondary / Auto Calculated */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <InputNumber label="System Size (kWp)" value={systemSize} onChange={handleSystemSizeChange} icon={<Zap size={14}/>} unit="kWp" />
                     
                     {/* Inverter Size */}
                     <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all relative">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                           <Zap size={14} /> Inverter Size
                        </label>
                        <div className="flex items-center gap-2">
                           <input 
                              type="text"
                              value={inverterSize}
                              onChange={(e) => setInverterSize(e.target.value)}
                              placeholder="e.g. 8"
                              className={`w-full outline-none font-medium ${validationError ? 'text-red-600' : 'text-slate-700'}`}
                           />
                           <span className="text-xs font-bold text-slate-400 whitespace-nowrap">kWac</span>
                        </div>
                        {/* Validation Error */}
                        {validationError && (
                           <div className="absolute top-full left-0 mt-1 w-full bg-red-50 text-red-600 text-[10px] p-1.5 rounded-lg border border-red-200 flex items-center gap-1 z-10 shadow-lg animate-in slide-in-from-top-1">
                              <AlertTriangle size={10} />
                              <span>{validationError}</span>
                           </div>
                        )}
                     </div>
                     
                     <InputText label="Inverter Brand" value={inverterBrand} onChange={setInverterBrand} icon={<Briefcase size={14}/>} />
                </div>
            </div>

            {/* Pricing */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Pricing & Financials</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <InputNumber label="Total System Price" value={systemPrice} onChange={setSystemPrice} icon={<DollarSign size={14}/>} unit="RM" />
                    <InputNumber label="Total Battery Cash Price" value={batteryCashPrice} onChange={setBatteryCashPrice} icon={<DollarSign size={14}/>} unit="RM" />
                    <InputNumber label="System CC Price" value={systemCCPrice} onChange={setSystemCCPrice} icon={<DollarSign size={14}/>} unit="RM" />
                </div>
                
                {/* Calculated Read-only fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">System Excl. Battery</div>
                        <div className="font-mono font-bold text-slate-700">RM {systemExcludingBattery.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Generation */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Projected Generation (2 decimals)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputNumber label="Monthly Generation" value={monthlyGen} onChange={setMonthlyGen} icon={<Activity size={14}/>} unit="kWh" />
                    <InputNumber label="Annual Generation" value={annualGen} onChange={setAnnualGen} icon={<Activity size={14}/>} unit="kWh" />
                </div>
            </div>

            {/* Generate Action Buttons */}
            <div className="bg-slate-900 p-6 rounded-xl shadow-xl shadow-slate-900/10">
                 <div className="mb-4">
                     <p className="font-bold text-white mb-1">Generate Documents</p>
                     <p className="text-slate-400 text-sm">Select a specific document to generate and download.</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Reordered: Quotation -> Booking -> Insurance */}
                    <button
                        onClick={() => generateSingleDoc('ResidentialQuotation.docx', 'Quotation')}
                        disabled={generatingDoc !== null}
                        className={`px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                            generatingDoc === 'Quotation' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-emerald-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {generatingDoc === 'Quotation' ? <RefreshCw className="animate-spin" size={20} /> : <FileDown size={20} />}
                        Quotation
                    </button>

                    <button
                        onClick={() => generateSingleDoc('ResidentialBooking.docx', 'Booking')}
                        disabled={generatingDoc !== null}
                        className={`px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                            generatingDoc === 'Booking' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-emerald-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {generatingDoc === 'Booking' ? <RefreshCw className="animate-spin" size={20} /> : <FileDown size={20} />}
                        Booking Form
                    </button>

                    <button
                        onClick={() => generateSingleDoc('ResidentialInsurance.docx', 'Insurance')}
                        disabled={generatingDoc !== null}
                        className={`px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                            generatingDoc === 'Insurance' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-emerald-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {generatingDoc === 'Insurance' ? <RefreshCw className="animate-spin" size={20} /> : <FileDown size={20} />}
                        Insurance Form
                    </button>
                 </div>
            </div>
        </div>
    </div>
  );
};