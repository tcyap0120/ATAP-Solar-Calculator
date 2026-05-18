import React, { useState, useMemo, useRef, useEffect } from 'react';
import { QuotationDraft } from '../types';
import { extractSolarData } from '../services/geminiService';
import { generateDocument, inspectDocument, loadDefaultTemplate, createFilledDocBlob, renderDocxToElement } from '../services/docService';
import { useAppContext } from '../App';
import { FileText, Upload, Zap, User, MapPin, Tag, Download, Wand2, CheckCircle2, AlertTriangle, FileUp, Info, Printer, Eye, ArrowRight } from 'lucide-react';

const initialData: QuotationDraft = {
  clientname: '',
  clientcompany: '',
  contactno: '',
  email: '',
  addressline1: '',
  addressline2: '',
  addressline3: '',
  systemsize: '',
  panel: '',
  invertersize: '',
  inverterbrand: '',
  systemprice: 0,
  date: new Date().toISOString().split('T')[0],
};

const InputField: React.FC<{
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  type?: 'text' | 'number' | 'email' | 'date' | 'select';
  placeholder?: string;
  icon?: React.ReactNode;
  options?: string[];
  fullWidth?: boolean;
}> = ({ label, name, value, onChange, type = 'text', placeholder, icon, options, fullWidth }) => (
  <div className={`space-y-1 ${fullWidth ? 'col-span-full' : ''}`}>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">{label}</label>
    <div className="relative group">
       {icon && (
           <div className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
               {icon}
           </div>
       )}
       {type === 'select' ? (
           <select
              name={name}
              value={value}
              onChange={onChange}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all ${icon ? 'pl-10 pr-4' : 'px-4'}`}
           >
               <option value="">Select...</option>
               {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
           </select>
       ) : (
           <input
              type={type}
              name={name}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              step={type === 'number' ? 'any' : undefined}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all ${icon ? 'pl-10 pr-4' : 'px-4'} placeholder:font-normal placeholder:text-slate-400`}
           />
       )}
    </div>
  </div>
);

const QuotationPage: React.FC = () => {
  const { quotationDraft, updateQuotationDraft, settings } = useAppContext();
  const [templateFile, setTemplateFile] = useState<ArrayBuffer | null>(null);
  const [templateName, setTemplateName] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'warning'} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const formData = quotationDraft || initialData;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-Sync Logic
    const rating = settings.panelRating || 0.6; 
    
    updateQuotationDraft(prev => {
        let updates: any = { [name]: name === 'systemprice' ? parseFloat(value) || 0 : value };

        // If System Size Changed -> Update Panels
        if (name === 'systemsize') {
            const kw = parseFloat(value);
            if (!isNaN(kw) && kw > 0) {
                updates.panel = Math.ceil(kw / rating).toString();
            } else {
                updates.panel = '';
            }
        }

        // If Panels Changed -> Update System Size
        if (name === 'panel') {
            const count = parseFloat(value);
            if (!isNaN(count) && count > 0) {
                updates.systemsize = (count * rating).toFixed(2);
            } else {
                updates.systemsize = '';
            }
        }

        return { ...prev, ...updates };
    });
  };

  const calculatedData = useMemo(() => {
    const price = Number(formData.systemprice) || 0;
    const sst = price * 0.06;
    const total = price * 1.06;

    const format = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      ...formData,
      sstofprice: format(sst),
      "price+sst": format(total),
      formattedSystemPrice: format(price),
    };
  }, [formData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          const buffer = loadEvent.target.result as ArrayBuffer;
          setTemplateFile(buffer);
          setTemplateName(file.name);
          setNotification({ message: "Custom template loaded", type: "success" });
          setTimeout(() => setNotification(null), 3000);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSmartFill = async () => {
    if (!rawText.trim()) {
      setNotification({ message: "Enter text to extract data.", type: "error" });
      return;
    }
    setIsLoading(true);
    try {
      const extracted = await extractSolarData(rawText);
      updateQuotationDraft(prev => ({
        ...prev,
        ...extracted,
        systemprice: extracted.systemprice || prev.systemprice,
        date: extracted.date || prev.date
      }));
      setNotification({ message: "Data extracted successfully!", type: "success" });
    } catch (error) {
      setNotification({ message: "Failed to extract data.", type: "error" });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const getRenderData = () => {
      const renderData: any = {};
      Object.keys(calculatedData).forEach(key => {
        renderData[key.toLowerCase()] = (calculatedData as any)[key];
        renderData[key.toLowerCase().replace(/\s/g,'')] = (calculatedData as any)[key];
      });
      renderData['systemprice'] = calculatedData.formattedSystemPrice;
      return renderData;
  }

  const prepareFilledDoc = async () => {
      let buffer = templateFile;
      if (!buffer) {
          try {
             buffer = await loadDefaultTemplate();
          } catch(e) {
             setNotification({ message: "Default template missing.", type: "error" });
             throw e;
          }
      }
      const renderData = getRenderData();
      const filledBlob = createFilledDocBlob(buffer.slice(0), renderData);
      return filledBlob;
  };

  const generateFilename = () => {
      const client = (formData.clientname || 'Client').replace(/[^a-z0-9]/gi, '');
      const size = (formData.systemsize || '0').replace(/[^0-9.]/g, '');
      return `AsternQuotation_${client}_${size}kWp`;
  };

  const handleDownloadWord = async () => {
      try {
          let buffer = templateFile;
          if (!buffer) {
             try {
                buffer = await loadDefaultTemplate();
             } catch(e) {
                setNotification({ message: "Default template missing.", type: "error" });
                return;
             }
          }
          const renderData = getRenderData();
          const fileName = generateFilename() + '.docx';
          generateDocument(buffer, renderData, fileName);
          setNotification({ message: "Word document downloaded.", type: "success" });
          setTimeout(() => setNotification(null), 3000);
      } catch (e) {
          console.error(e);
          setNotification({ message: "Could not generate Word doc.", type: "error" });
          setTimeout(() => setNotification(null), 3000);
      }
  };

  // High Quality Print (Best for Images/Layout)
  const handleDownloadPDF = async () => {
      setIsGeneratingPdf(true);
      try {
          const filledBlob = await prepareFilledDoc();
          const fileName = generateFilename();
          
           if (printContainerRef.current) {
              printContainerRef.current.innerHTML = '';
              await renderDocxToElement(filledBlob, printContainerRef.current);
              
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                  printWindow.document.title = fileName;
                  printWindow.document.write('<html><head><title>' + fileName + '</title>');
                  printWindow.document.write(`
                    <style>
                        /* Reset margins to allow docx-preview to control layout */
                        @media print {
                            @page {
                                size: auto;
                                margin: 0;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                                background: white;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            /* Ensure wrapper fills the page */
                            .docx-wrapper { 
                                padding: 0 !important; 
                                background: white !important; 
                            }
                            /* Ensure pages are treated as printed pages */
                            section.docx { 
                                margin: 0 !important; 
                                box-shadow: none !important; 
                                page-break-after: always;
                            }
                        }
                        /* Screen Preview Styles for the pop-up */
                        body { 
                            margin: 0; 
                            padding: 20px; 
                            background: #f1f5f9; 
                            display: flex; 
                            justify-content: center;
                        }
                        .docx-wrapper { 
                            padding: 20px !important; 
                        }
                    </style>
                  `);
                  printWindow.document.write('</head><body>');
                  printWindow.document.write(printContainerRef.current.innerHTML);
                  printWindow.document.write('</body></html>');
                  printWindow.document.close();
                  
                  // Wait for images and resources to render
                  setTimeout(() => {
                      printWindow.focus();
                      printWindow.print();
                  }, 1000);
                  
                  setNotification({ message: "Select 'Save as PDF' in the dialog.", type: "success" });
              } else {
                  setNotification({ message: "Pop-up blocked. Allow pop-ups to print.", type: "warning" });
              }
           }
      } catch (e) {
          console.error("Print Error:", e);
          setNotification({ message: "Could not generate document.", type: "error" });
      } finally {
          setIsGeneratingPdf(false);
           if (printContainerRef.current) printContainerRef.current.innerHTML = '';
           setTimeout(() => setNotification(null), 4000);
      }
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-24">
       
       {/* Hidden Container for Rendering */}
       <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -1000, opacity: 0, pointerEvents: 'none', width: '210mm' }}>
          <div ref={printContainerRef} className="bg-white text-black"></div>
       </div>

       <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Quotation Generator</h1>
          <p className="text-slate-500 font-medium mt-1">Auto-fill templates with smart calculation data.</p>
        </div>
        {notification && (
            <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in-up ${
                notification.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                notification.type === 'warning' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                'bg-red-100 text-red-800 border border-red-200'
            }`}>
                {notification.type === 'success' ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>}
                {notification.message}
            </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Inputs (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
              
              {/* Client Info Card */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                       <User size={18} className="text-indigo-500"/>
                       <h3 className="font-bold text-slate-700">Client Information</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <InputField label="Client Name" name="clientname" value={formData.clientname} onChange={handleInputChange} icon={<User size={14}/>} />
                      <InputField label="Company Name" name="clientcompany" value={formData.clientcompany} onChange={handleInputChange} />
                      <InputField label="Contact Number" name="contactno" value={formData.contactno} onChange={handleInputChange} />
                      <InputField label="Email Address" name="email" value={formData.email} onChange={handleInputChange} type="email" />
                      
                      <div className="col-span-full border-t border-slate-100 my-2"></div>
                      <div className="col-span-full mb-1 flex items-center gap-2 text-slate-500">
                          <MapPin size={16} className="text-amber-500"/> <span className="text-xs font-bold uppercase">Site Address</span>
                      </div>

                      <InputField label="Address Line 1" name="addressline1" value={formData.addressline1} onChange={handleInputChange} placeholder="Unit/Street" fullWidth/>
                      <InputField label="Address Line 2" name="addressline2" value={formData.addressline2} onChange={handleInputChange} placeholder="Area/Taman" />
                      <InputField label="Address Line 3" name="addressline3" value={formData.addressline3} onChange={handleInputChange} placeholder="City/State/Postcode" />
                  </div>
              </div>

              {/* System Info Card */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                   <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                       <Zap size={18} className="text-amber-500"/>
                       <h3 className="font-bold text-slate-700">System Configuration</h3>
                  </div>
                  <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-5">
                      <InputField label="System Size (kWp)" name="systemsize" value={formData.systemsize} onChange={handleInputChange} type="number" />
                      <InputField label="Panel Qty (pcs)" name="panel" value={formData.panel} onChange={handleInputChange} type="number" />
                      <InputField label="Date" name="date" value={formData.date} onChange={handleInputChange} type="date" />
                      
                      <InputField label="Inv Size (kWac)" name="invertersize" value={formData.invertersize} onChange={handleInputChange} type="number" />
                      <InputField label="Inv Brand" name="inverterbrand" value={formData.inverterbrand} onChange={handleInputChange} placeholder="e.g. Solis" />
                  </div>
              </div>

              {/* Pricing Card */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                   <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                       <Tag size={18} className="text-emerald-500"/>
                       <h3 className="font-bold text-slate-700">Pricing Details</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <InputField label="System Price (Excl. SST)" name="systemprice" value={formData.systemprice} onChange={handleInputChange} type="number" icon={<span className="text-xs font-bold">RM</span>}/>
                      
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                          <div className="flex justify-between text-xs font-medium text-slate-500">
                              <span>Subtotal</span>
                              <span>RM {calculatedData.formattedSystemPrice}</span>
                          </div>
                          <div className="flex justify-between text-xs font-medium text-slate-500">
                              <span>SST (6%)</span>
                              <span>RM {calculatedData.sstofprice}</span>
                          </div>
                          <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-800">
                              <span>Total Payable</span>
                              <span className="text-emerald-600">RM {calculatedData["price+sst"]}</span>
                          </div>
                      </div>
                  </div>
              </div>

          </div>

          {/* RIGHT: Actions (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
              
              {/* Main Action Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2rem] p-6 shadow-xl shadow-slate-900/20">
                  <h3 className="text-lg font-bold mb-1">Download Quotation</h3>
                  <p className="text-slate-400 text-xs mb-6">Generate documents from the active template.</p>
                  
                  <button 
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPdf}
                    className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 active:scale-95 transition-all group ${isGeneratingPdf ? 'opacity-70 cursor-wait' : ''}`}
                  >
                      {isGeneratingPdf ? (
                          <Printer size={20} className="animate-pulse"/>
                      ) : (
                          <Download size={20} className="group-hover:scale-110 transition-transform"/>
                      )}
                      {isGeneratingPdf ? 'Processing...' : 'Download PDF'}
                  </button>

                  <button 
                      onClick={handleDownloadWord}
                      className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-white text-slate-700 border-2 border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all group mt-3 active:scale-95"
                  >
                      <FileText size={20} className="group-hover:scale-110 transition-transform"/>
                      Download Word (.docx)
                  </button>

                  <div className="mt-4 p-3 bg-white/10 rounded-xl flex gap-2 border border-white/5">
                      <Info size={14} className="text-emerald-400 shrink-0 mt-0.5"/>
                      <p className="text-[10px] text-slate-300 leading-tight">
                         <strong>For PDF:</strong> Uses browser print dialog. Select <strong>"Save as PDF"</strong> for best results.
                      </p>
                  </div>
              </div>

              {/* Template Management */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Template Settings</h3>
                  
                  <div className="mb-4">
                    {!templateName ? (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                                <FileText size={16} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-slate-700">Default Template</p>
                                <p className="text-[10px] text-slate-400 truncate">quotationtofill.docx</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText size={16} className="text-emerald-600 shrink-0"/>
                                <span className="text-xs font-bold text-emerald-800 truncate">{templateName}</span>
                            </div>
                            <button onClick={() => {setTemplateFile(null); setTemplateName('')}} className="text-[10px] font-bold text-slate-400 hover:text-red-500">Remove</button>
                        </div>
                    )}
                  </div>

                  <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors text-center cursor-pointer group">
                      <input 
                        type="file" 
                        accept=".docx"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center justify-center gap-1 text-slate-400 group-hover:text-indigo-500 transition-colors">
                          <FileUp size={20} />
                          <span className="font-bold text-xs">Upload Custom .docx</span>
                      </div>
                  </div>
              </div>

               {/* Smart Fill */}
               <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                   <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex justify-between items-center text-white">
                       <div className="flex items-center gap-2 font-bold text-sm">
                           <Wand2 size={16} /> AI Smart Fill
                       </div>
                   </div>
                   <div className="p-4 space-y-3">
                       <textarea
                          value={rawText}
                          onChange={(e) => setRawText(e.target.value)}
                          placeholder="Paste text/email to extract info..."
                          className="w-full h-20 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-violet-200 outline-none resize-none"
                        ></textarea>
                        <button 
                         onClick={handleSmartFill}
                         disabled={isLoading}
                         className={`w-full py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${isLoading ? 'opacity-50' : ''}`}
                       >
                           {isLoading ? 'Thinking...' : 'Extract Data'}
                       </button>
                   </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default QuotationPage;