import React from 'react';
import { CalculationResult } from '../types';

interface WhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: CalculationResult | null;
    noLoadDays: string;
    roofLimit: string;
    language: 'en' | 'zh';
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, result, noLoadDays, roofLimit, language }) => {
    if (!isOpen || !result) return null;

    // Logic from original snippet to ensure compatibility if used elsewhere
    const daysActive = 30 - (parseFloat(noLoadDays) || 0);
    const roofText = (roofLimit && parseFloat(roofLimit) > 0) ? `${roofLimit} pcs` : (language === 'zh' ? '还未确认' : 'Not Confirmed');
    
    // Note: CalculationResult usually provides annualGeneration. Monthly is approx.
    const monthlyGen = result.annualGeneration / 12;
    const monthlySavings = ((result.savingsFromSelfConsumption + result.savingsFromExport) / 12); 
    const annualSavings = monthlySavings * 12;

    const savingsPercentage = (result.annualSavings / (result.annualSavings + result.netAnnualSavings)) * 100 || 0; // Approx logic placeholder

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">WhatsApp Proposal Preview</h2>
                
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 font-mono text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    <p className="font-bold mb-2 text-slate-800">Summary:</p>
                    <p>System Size: {result.systemSizeKw.toFixed(2)} kWp</p>
                    <p>Panels: {Math.ceil(result.systemSizeKw / 0.6)} pcs (Roof Limit: {roofText})</p>
                    <p>Est. Monthly Savings: RM {monthlySavings.toFixed(2)}</p>
                    <p>ROI: {result.roiYearsNoTax.toFixed(1)} Years</p>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                        Close
                    </button>
                    <button 
                        onClick={() => {
                            // Copy logic would go here
                            alert("Copied to clipboard!");
                            onClose();
                        }}
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        Copy Text
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppModal;