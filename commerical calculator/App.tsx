
import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calculator, Settings, Sun, Receipt, FileText, Home } from 'lucide-react';
import CalculatorPage from './components/CalculatorPage';
import SettingsPage from './components/SettingsPage';
import QuotationPage from './components/QuotationPage';
import CommercialResiPage from './components/CommercialResiPage';
import { GlobalSettings, InverterBrand, MeterType, CalculatorSession, QuotationDraft } from './types';
import { DEFAULT_BRANDS, DEFAULT_METERS, DEFAULT_SETTINGS, DEFAULT_SESSION } from './constants';

// --- Context Setup ---

interface AppContextType {
  settings: GlobalSettings;
  updateSettings: (newSettings: GlobalSettings) => void;
  brands: InverterBrand[];
  updateBrands: (newBrands: InverterBrand[]) => void;
  meters: MeterType[];
  updateMeters: (newMeters: MeterType[]) => void;
  calculatorSession: CalculatorSession;
  updateCalculatorSession: (session: CalculatorSession | ((prev: CalculatorSession) => CalculatorSession)) => void;
  quotationDraft: QuotationDraft;
  updateQuotationDraft: (draft: QuotationDraft | ((prev: QuotationDraft) => QuotationDraft)) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};

const defaultQuotationDraft: QuotationDraft = {
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

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from local storage or use defaults
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const saved = localStorage.getItem('solar_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [brands, setBrands] = useState<InverterBrand[]>(() => {
    const saved = localStorage.getItem('solar_brands');
    return saved ? JSON.parse(saved) : DEFAULT_BRANDS;
  });

  const [meters, setMeters] = useState<MeterType[]>(() => {
    const saved = localStorage.getItem('solar_meters');
    return saved ? JSON.parse(saved) : DEFAULT_METERS;
  });

  // Calculator Session State (In-Memory Persistence)
  const [calculatorSession, setCalculatorSession] = useState<CalculatorSession>(DEFAULT_SESSION);
  const [quotationDraft, setQuotationDraft] = useState<QuotationDraft>(defaultQuotationDraft);

  // Persist changes
  useEffect(() => {
    localStorage.setItem('solar_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('solar_brands', JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    localStorage.setItem('solar_meters', JSON.stringify(meters));
  }, [meters]);

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings: setSettings,
        brands,
        updateBrands: setBrands,
        meters,
        updateMeters: setMeters,
        calculatorSession,
        updateCalculatorSession: setCalculatorSession,
        quotationDraft,
        updateQuotationDraft: setQuotationDraft
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// --- Layout & Navigation ---

const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`relative flex flex-col items-center justify-center w-full md:h-16 md:w-20 md:rounded-2xl transition-all duration-200 group ${
        isActive 
          ? 'text-amber-600' 
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
      }`}
    >
      {isActive && (
        <div className="absolute inset-0 bg-amber-50 rounded-2xl opacity-100 transition-opacity hidden md:block"></div>
      )}
      <div className={`relative z-10 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-semibold mt-1 ${isActive ? 'text-amber-600' : 'text-slate-400'}`}>
        {label}
      </span>
    </Link>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 md:pl-24 transition-all overflow-x-hidden">
      {/* Desktop Side Nav */}
      <nav className="hidden md:flex flex-col items-center fixed left-0 top-0 bottom-0 w-24 bg-white border-r border-slate-100 z-50 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
        <div className="p-6 mb-4">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white p-2.5 rounded-xl shadow-lg shadow-amber-500/30">
             <Sun size={24} strokeWidth={2.5} />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-6 w-full px-2">
           <NavLink to="/" icon={<Calculator size={24} />} label="Recommender" />
           <NavLink to="/resi-calc" icon={<Home size={24} />} label="Resi-Calc" />
           <NavLink to="/quotation" icon={<FileText size={24} />} label="Quotation" />
           <NavLink to="/settings" icon={<Settings size={24} />} label="Settings" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-50 flex justify-around py-3 px-2 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <NavLink to="/" icon={<Calculator size={24} strokeWidth={2} />} label="Recommender" />
        <NavLink to="/resi-calc" icon={<Home size={24} strokeWidth={2} />} label="Resi-Calc" />
        <NavLink to="/quotation" icon={<FileText size={24} strokeWidth={2} />} label="Quotation" />
        <NavLink to="/settings" icon={<Settings size={24} strokeWidth={2} />} label="Settings" />
      </nav>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<CalculatorPage />} />
            <Route path="/resi-calc" element={<CommercialResiPage />} />
            <Route path="/quotation" element={<QuotationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
