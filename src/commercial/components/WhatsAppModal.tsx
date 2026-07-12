import React, { useMemo, useState } from 'react';
import { CalculationResult } from '../types';

export interface CommercialWhatsAppModalData {
  systemSizeKw: number;
  panels: number;
  brandName: string;
  /** Kept for callers; optional in template */
  meterName?: string;
  tariff?: number;
  sunHours?: number;
  taxRate: number;
  result: CalculationResult;
  inverterSize?: string;
  billAmount: string;
  targetKwh: string;
  opStartHour: number;
  opEndHour: number;
  noLoadDays: string;
  roofLimit: string;
}

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CommercialWhatsAppModalData;
}

function formatHour12(hour: number, lang: 'zh' | 'en'): string {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  if (lang === 'en') {
    const am = h < 12;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:00 ${am ? 'am' : 'pm'}`;
  }
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${am ? '上午' : '下午'} ${h12}:00`;
}

function roofLimitDisplay(roof: string, lang: 'zh' | 'en'): string {
  const t = roof.trim();
  if (!t || t === '0') {
    return lang === 'zh' ? '还未确认' : 'Not confirmed';
  }
  return t;
}

function formatMaintenanceWhatsAppLine(r: CalculationResult, lang: 'zh' | 'en'): string | null {
  const d = r.breakdownOpex.maintenanceDetails;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (!d || d.cost <= 0) return null;
  if (lang === 'zh') {
    const cadence = d.freq <= 1 ? '每年一次' : `每${d.freq}年一次`;
    return `* 维修费： RM ${fmt(d.cost)}（建议${cadence}）`;
  }
  if (d.freq <= 1) {
    return `- Maintenance: RM ${fmt(d.cost)} (once per year)`;
  }
  return `- Maintenance: RM ${fmt(d.cost)} (once per ${d.freq} years)`;
}

function buildShareText(data: CommercialWhatsAppModalData, lang: 'zh' | 'en'): string {
  const r = data.result;
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmt2 = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Match the calculator card's "Monthly Savings" headline = gross bill savings
  // (self-consumption + export), excluding the ATAP "extra" value.
  const monthlyDisplaySavings = (r.savingsFromSelfConsumption + r.savingsFromExport) / 12;
  // Round monthly savings down to the nearest RM10; annual = rounded monthly × 12.
  const monthlySavingsRounded = Math.floor(monthlyDisplaySavings / 10) * 10;
  const annualSavingsRounded = monthlySavingsRounded * 12;
  const billNum = parseFloat(data.billAmount);
  // Bill-reduction % matches the card (gross savings incl. ATAP value = annualSavings / 12).
  const savingsPct =
    !isNaN(billNum) && billNum > 0 ? (r.annualSavings / 12 / billNum) * 100 : 0;

  // Final prices for the WhatsApp quote (commercial):
  //   Final price after SST = System Price (gross) × 1.012
  //   Net price after CA     = System Price (gross) × 1.012 × (1 − tax rate)   [= ×0.76 at 24%]
  const SST_MULTIPLIER = 1.012;
  const priceAfterSST = r.totalPrice * SST_MULTIPLIER;
  const netPriceAfterCA = r.totalPrice * SST_MULTIPLIER * (1 - data.taxRate);

  const daysNoLoad = parseFloat(data.noLoadDays) || 0;
  const operatingDaysPerMonth = Math.max(0, 30 - daysNoLoad);

  const licenseInspectionAnnual =
    r.breakdownOpex.stLicense + r.breakdownOpex.chargeman + r.breakdownOpex.visitingEngineer;

  const maintenanceLine = formatMaintenanceWhatsAppLine(r, lang);

  const taxPct = (data.taxRate * 100).toFixed(0);
  const billDisplay = !isNaN(billNum) && billNum > 0 ? `RM ${fmt2(billNum)}` : '—';
  const usageDisplay = data.targetKwh.trim() || '—';

  if (lang === 'zh') {
    return [
      `⚡ *商业太阳能方案提案* ⚡`,
      `--------------------------------`,
      `📄 *基本资料*`,
      `* 电费单: 约 ${billDisplay}`,
      `* 用电量: 约 ${usageDisplay} kWh`,
      `* 营运天数: ${operatingDaysPerMonth} 天/月`,
      `* 营运时间: ${formatHour12(data.opStartHour, 'zh')} 至 ${formatHour12(data.opEndHour, 'zh')}`,
      `* 屋顶限制: ${roofLimitDisplay(data.roofLimit, 'zh')}`,
      `* 公司税率 (假设): ${taxPct}%`,
      ``,
      `☀️ *推荐系统方案*`,
      `* 系统容量: ${data.systemSizeKw.toFixed(2)} kWp`,
      `* 太阳能电板: ${data.panels} 片`,
      `* 逆变器: ${data.brandName || '—'}`,
      ``,
      `💰 *投资与回报*`,
      `* 每月预计节省电费: RM ${fmt(monthlySavingsRounded)}+- (${savingsPct.toFixed(1)}%)`,
      `* 每年预计节省电费: RM ${fmt(annualSavingsRounded)}+-`,
      `* 系统价格 (未含税): RM ${fmt(r.totalPrice)}`,
      `* 含SST最终价格: RM ${fmt(priceAfterSST)}`,
      `* 回本期: 约 ${r.roiYearsNoTax.toFixed(2)} 年`,
      `* 扣税后价格 (CA): RM ${fmt(netPriceAfterCA)}`,
      `* 回本期 (扣税后): 约 ${r.roiYearsCA.toFixed(2)} 年`,
      ``,
      `⚙️ *维护开销*`,
      ...(maintenanceLine ? [maintenanceLine] : []),
      ...(licenseInspectionAnnual > 0
        ? [`- 执照及检测费：每年 RM ${fmt(licenseInspectionAnnual)}`]
        : []),
    ].join('\n');
  }

  return [
    `⚡ *Commercial Solar Proposal* ⚡`,
    `--------------------------------`,
    `📄 *User Profile*`,
    `* Bill: approx. ${billDisplay}`,
    `* Usage: approx. ${usageDisplay} kWh`,
    `* Operating days: ${operatingDaysPerMonth} days/mo`,
    `* Operating hours: ${formatHour12(data.opStartHour, 'en')} to ${formatHour12(data.opEndHour, 'en')}`,
    `* Roof limit (panels): ${roofLimitDisplay(data.roofLimit, 'en')}`,
    `* Corporate tax rate (assumed): ${taxPct}%`,
    ``,
    `☀️ *Proposed System*`,
    `* System size: ${data.systemSizeKw.toFixed(2)} kWp`,
    `* Solar panels: ${data.panels} pcs`,
    `* Inverter: ${data.brandName || '—'}`,
    ``,
    `💰 *Investment & Returns*`,
    `* Est. monthly bill savings: RM ${fmt(monthlySavingsRounded)}+- (${savingsPct.toFixed(1)}%)`,
    `* Est. annual bill savings: RM ${fmt(annualSavingsRounded)}+-`,
    `* System price (excl. tax): RM ${fmt(r.totalPrice)}`,
    `* Final price (incl. SST): RM ${fmt(priceAfterSST)}`,
    `* Payback: ~${r.roiYearsNoTax.toFixed(2)} yr`,
    `* Price after CA (net of tax): RM ${fmt(netPriceAfterCA)}`,
    `* Payback (after CA): ~${r.roiYearsCA.toFixed(2)} yr`,
    ``,
    `⚙️ *Operating Cost*`,
    ...(maintenanceLine ? [maintenanceLine] : []),
    ...(licenseInspectionAnnual > 0
      ? [`- Licence & inspection (ST, chargeman, visiting engineer): RM ${fmt(licenseInspectionAnnual)}/yr`]
      : []),
  ].join('\n');
}

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, data }) => {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  const text = useMemo(() => buildShareText(data, lang), [data, lang]);

  if (!isOpen) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onClose();
    } catch {
      alert(lang === 'zh' ? '无法复制，请手动选取文字复制。' : 'Could not copy. Select and copy manually.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-slate-800">
            {lang === 'zh' ? 'WhatsApp / 分享文案' : 'WhatsApp / share text'}
          </h2>
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setLang('zh')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                lang === 'zh' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              中文
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              EN
            </button>
          </div>
        </div>
        <pre className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto mb-4">
          {text}
        </pre>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
          >
            {lang === 'zh' ? '关闭' : 'Close'}
          </button>
          <button
            type="button"
            onClick={copy}
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
          >
            {lang === 'zh' ? '复制文案' : 'Copy text'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppModal;
