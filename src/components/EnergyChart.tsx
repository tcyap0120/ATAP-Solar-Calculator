
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { SimulationResult } from '../types';
import { ArrowDown } from 'lucide-react';

interface EnergyChartProps {
  simulation: SimulationResult;
}

export const EnergyChart: React.FC<EnergyChartProps> = ({ simulation }) => {
  
  const mixData = [
    { name: 'Grid Import', value: simulation.gridImport, color: '#94a3b8' }, // Slate 400
    { name: 'Solar Direct', value: simulation.solarUtilized, color: '#f59e0b' }, // Amber 500
    { name: 'Battery', value: simulation.batteryDischarge, color: '#10b981' }, // Emerald 500
  ].filter(d => d.value > 0);

  const costData = [
    { name: 'Original', amount: simulation.originalBill.finalTotal, fill: '#ef4444' },
    { name: 'With Solar', amount: simulation.newBill.finalTotal, fill: '#10b981' },
  ];

  const savings = simulation.monthlySavings;
  const savingsPercent = simulation.originalBill.finalTotal > 0 
    ? (savings / simulation.originalBill.finalTotal) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Energy Mix Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide w-full text-left mb-4">Energy Source Mix</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={mixData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {mixData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${Math.round(value).toLocaleString()} kWh`, '']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Comparison Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Monthly Bill Comparison</h3>
        
        {/* Savings Overlay */}
        <div className="absolute top-14 right-8 bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex flex-col items-center shadow-sm z-10 animate-pulse">
           <div className="flex items-center text-emerald-600 font-bold text-sm">
             <ArrowDown size={16} />
             <span>{Math.round(savingsPercent)}%</span>
           </div>
           <span className="text-xs text-emerald-700">Save RM{Math.round(savings).toLocaleString()}</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `RM${val}`} />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                formatter={(value: number) => [`RM ${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`, 'Bill']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={60}>
                {costData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
