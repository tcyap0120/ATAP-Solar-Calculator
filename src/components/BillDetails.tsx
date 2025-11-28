import React from 'react';
import { BillBreakdown } from '../types';
import { Minus, Plus, ArrowRight } from 'lucide-react';

interface BillDetailsProps {
  data: BillBreakdown;
  title: string;
  isProjected?: boolean;
}

export const BillDetails: React.FC<BillDetailsProps> = ({ data, title, isProjected }) => {
  const formatCurrency = (val: number) => 
    `RM ${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const Row = ({ label, value, type = 'neutral', subtext = '' }: { label: string, value: number, type?: 'add'|'sub'|'total'|'neutral', subtext?: string }) => {
    let colorClass = "text-slate-700";
    let Icon = null;
    
    if (type === 'add') { Icon = <Plus size={12} />; colorClass = "text-slate-700"; }
    if (type === 'sub') { Icon = <Minus size={12} />; colorClass = "text-emerald-600"; }
    if (type === 'total') colorClass = "text-blue-900 font-bold text-lg";

    // Don't render if value is 0 and it's a specific charge (except Total)
    if (value === 0 && type !== 'total' && type !== 'neutral') return null;

    return (
      <div className={`flex justify-between items-center py-2 border-b border-slate-50 last:border-0 ${type === 'total' ? 'bg-blue-50/50 -mx-4 px-4 py-3 mt-2 rounded-b-lg' : ''}`}>
        <div className="flex flex-col">
          <span className={`${type === 'total' ? 'font-bold' : 'text-sm'}`}>{label}</span>
          {subtext && <span className="text-[10px] text-slate-400">{subtext}</span>}
        </div>
        <div className={`flex items-center gap-1 font-mono ${colorClass}`}>
          {type !== 'total' && type !== 'neutral' && Icon}
          {formatCurrency(value)}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${isProjected ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'} p-4 shadow-sm`}>
      {isProjected && (
        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
          WITH SOLAR
        </div>
      )}
      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">{title}</h3>
      
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between items-end mb-2 pb-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">{isProjected ? "New Billable Usage" : "Billable Usage"}</span>
          <span className="font-mono font-bold text-slate-800">{data.units.toLocaleString()} kWh</span>
        </div>

        <Row label="Base Charge" value={data.baseCharge} type="add" subtext="Tariff block rates" />
        <Row label="Retail Charge" value={data.retailCharge} type="add" subtext="Applied if usage > 600kWh" />
        <Row label="EE Incentive" value={data.discount} type="sub" subtext="Block-based discount" />
        
        {data.eeIncentiveAdjustment && data.eeIncentiveAdjustment !== 0 ? (
           <Row label="EE Incentive Adj." value={data.eeIncentiveAdjustment} type="add" subtext="Export adjustment" />
        ) : null}

        <div className="my-1 border-t border-slate-100"></div>
        
        <Row label="Service Tax (8%)" value={data.serviceTax} type="add" subtext="On portion > 600kWh" />
        <Row label="KWTBB (1.6%)" value={data.kwtbb} type="add" subtext="Renewable Energy Fund" />
        
        {(data.exportCredit && data.exportCredit < 0) ? (
          <Row 
            label="Export Credit" 
            value={data.exportCredit} 
            type="sub" 
            subtext={`${data.exportUnits?.toLocaleString() ?? 0} units @ RM0.20`} 
          />
        ) : null}
        
        <Row label="Total Bill" value={data.finalTotal} type="total" />
      </div>
    </div>
  );
};