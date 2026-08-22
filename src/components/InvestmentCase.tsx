import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Share2, Download, Loader2, Globe, RotateCcw, CheckCircle2, X, Sun, Battery,
  ShieldCheck, TrendingUp, Leaf, Zap, Home,
} from 'lucide-react';
import { calculateScenario } from './PlanRecommender';
import { getKwhFromBill, calculateBill } from '../utils/billingEngine';
import { PANEL_WATTAGE, BATTERY_NOMINAL_KWH } from '../constants';
import { captureFixedWidthElement, shareCanvas, downloadCanvas, ShareOutcome } from '../utils/shareImage';

/**
 * Investment Case — a one-page portrait poster an agent generates for a specific customer and
 * sends straight to WhatsApp. It argues one thing: the monthly bill is money already being spent,
 * so solar is not an expense but an investment that pays back and then keeps paying.
 *
 * Every figure is priced through calculateScenario (the recommender's own path) so the poster can
 * never quote a price the recommender would not. The three headline figures are then editable —
 * an agent negotiating a specific deal can type over the system price or the monthly saving, and
 * the whole poster and chart re-derive from what they typed. Edited fields show a reset arrow.
 *
 * The poster is portrait, renders at a fixed 1200px width and is only scaled for preview, so the
 * exported image is identical on a phone and a desktop.
 */

const POSTER_WIDTH = 1200;

/**
 * astern_logo.png is a 1920x1080 canvas with the mark sitting in the middle and a lot of empty
 * space around it (measured content box below). Rendering the file at any height therefore draws a
 * mark barely half the height you asked for, floating off-centre. These numbers let the header
 * scale and crop it to its real edges.
 */
const LOGO = { natW: 1920, natH: 1080, x: 671, y: 233, w: 568, h: 607 };

const logoBox = (targetH: number) => {
  const s = targetH / LOGO.h;
  return {
    wrap: {
      width: Math.ceil(LOGO.w * s),
      height: targetH,
      position: 'relative' as const,
      overflow: 'hidden',
      flexShrink: 0,
    },
    img: {
      position: 'absolute' as const,
      left: -LOGO.x * s,
      top: -LOGO.y * s,
      width: LOGO.natW * s,
      height: LOGO.natH * s,
      maxWidth: 'none',
    },
  };
};

type Lang = 'en' | 'zh';
type Plan = 'cc36' | 'cc60' | 'cash';

const S = {
  en: {
    headline: "It's Not an Expense — It's an Investment!",
    sub: 'Go solar and lock in your electricity cost. Stop paying for power you could own.',
    panels: 'Panels',
    batteries: 'Batteries',
    billNow: 'Current Monthly Bill',
    afterSolar: 'Monthly Savings with Solar',
    remaining: 'Remaining bill approx.',
    perMonth: '/mo',
    annualSaving: 'Saved Every Year',
    annualSub: 'Turning your bill into long-term returns',
    chartTitle: (y: number) => `${y}-Year Cumulative Cost (Estimated) — Without vs With Solar`,
    axisY: 'Cumulative Spend (RM)',
    legendWithout: 'Without solar (paying bills forever)',
    legendWith: 'With solar',
    legendWithSub: (m: number) => `(based on RM ${m} saved per month)`,
    breakEven: (y: string) => `Break-even in ~${y} years`,
    breakEvenSub: 'Pure profit after that',
    afterYears: (y: number) => `After ${y} years you will have:`,
    bullet1: 'Total saved approx.',
    bullet2: 'System still running',
    bullet2sub: '(panels last 30-40 years)',
    bullet3: 'Tariffs keep rising —',
    bullet3sub: 'your savings only grow',
    netTitle: (y: number) => `${y}-Year Net Benefit (Est.)`,
    year: 'yr',
    benefitsTitle: 'Why Solar Makes Sense',
    b1: 'Beat Rising Tariffs',
    b1s: 'Lock in your cost today',
    b2: 'Built to Last',
    b2s: '30-year performance warranty',
    b3: 'Battery Backup',
    b3s: 'Power through outages',
    b4: 'Property Value',
    b4s: 'A greener, better home',
    b5: 'Cleaner Future',
    b5s: 'Less carbon, every day',
    investTitle: 'Your Investment',
    totalPrice: 'System Total',
    installment: (n: number) => `Installment (${n} months)`,
    months: (n: number) => `${n} months`,
    cashflowTitle: (n: number) => `Cash Flow During Installment (first ${n} months)`,
    monthlySaved: 'Saved monthly',
    monthlyPay: 'Monthly payment',
    netMonthly: 'Net monthly',
    extraNote: (a: string, n: number) =>
      `Yes, about RM ${a} more per month for the first ${n} months — but you are paying off an asset you own, and it ends.`,
    afterEndTitle: (n: number) => `After Month ${n}`,
    afterEndBig: (a: string) => `Save RM ${a} every month!`,
    afterEndYear: (a: string) => `That is RM ${a} a year`,
    afterEndSub: 'The system keeps generating — pure return from here.',
    phase1: (n: number) => `Months 1–${n}: paying off your asset`,
    phase2: (n: number) => `From month ${n}: pure profit`,
    noPayment: 'No more payments',
    directSave: 'Direct monthly saving',
    yearlySave: 'Yearly saving',
    closing: 'Turn Your Electricity Bill Into Wealth',
    closingSub: (y: number) => `Invest today and build ${y} years of steady returns for your family.`,
    cashTitle: 'Paid in Full',
    cashSub: 'No installment, savings start immediately.',
    payback: 'Payback period',
    years: 'years',
    fromDayOne: 'From day one',
    preparedFor: 'Prepared for',
    by: 'By',
    disclaimer:
      'Estimates only, based on average usage and current tariffs. Actual results vary with weather, shading, roof orientation, consumption habits and tariff revisions.',
  },
  zh: {
    headline: '不是消费，是投资！',
    sub: '安装太阳能，锁定您的电费成本，把每月开销变成您的资产。',
    panels: '片电板',
    batteries: '粒电池',
    billNow: '目前每月电费',
    afterSolar: '安装太阳能后每月节省',
    remaining: '剩余电费约',
    perMonth: '/月',
    annualSaving: '每年为您节省',
    annualSub: '把电费变成您的长期收益',
    chartTitle: (y: number) => `${y}年累计支出对比（估算）— 不安装 vs 安装太阳能`,
    axisY: '累计支出（RM）',
    legendWithout: '不安装太阳能（持续付电费）',
    legendWith: '安装太阳能',
    legendWithSub: (m: number) => `（估算基于每月节省 RM ${m}）`,
    breakEven: (y: string) => `约 ${y} 年回本`,
    breakEvenSub: '之后开始纯赚',
    afterYears: (y: number) => `${y} 年后，您将拥有：`,
    bullet1: '累计节省约',
    bullet2: '系统仍可继续使用',
    bullet2sub: '（电板寿命可达 30–40 年）',
    bullet3: '电费持续上涨，',
    bullet3sub: '您的节省只会更多',
    netTitle: (y: number) => `${y}年净收益（估算）`,
    year: '年',
    benefitsTitle: '选择太阳能的好处',
    b1: '电费上涨不怕',
    b1s: '锁定长期电价',
    b2: '长效耐用',
    b2s: '电板 30 年性能保证',
    b3: '电池储能',
    b3s: '停电也不怕',
    b4: '提升房产价值',
    b4s: '绿色能源，更吸引',
    b5: '环保减碳',
    b5s: '为下一代创造更好环境',
    investTitle: '系统投资方案',
    totalPrice: '系统总价',
    installment: (n: number) => `分期付款（${n} 期）`,
    months: (n: number) => `${n} 个月`,
    cashflowTitle: (n: number) => `分期期间现金流（前 ${n} 个月）`,
    monthlySaved: '每月节省电费',
    monthlyPay: '每月分期付款',
    netMonthly: '每月现金流',
    extraNote: (a: string, n: number) =>
      `前 ${n} 个月每月多承担约 RM ${a}，但您已经在为自己的资产付款，分期结束后就不必再付了！`,
    afterEndTitle: (n: number) => `第 ${n} 个月开始`,
    afterEndBig: (a: string) => `每月直接节省 RM ${a}！`,
    afterEndYear: (a: string) => `每年节省 RM ${a}`,
    afterEndSub: '系统继续发电，为您创造长期收益！',
    phase1: (n: number) => `前 ${n} 个月：为资产付款阶段`,
    phase2: (n: number) => `第 ${n} 个月开始：纯赚阶段`,
    noPayment: '无需再付款',
    directSave: '每月直接节省',
    yearlySave: '每年节省',
    closing: '把每个月的电费，变成您的财富！',
    closingSub: (y: number) => `今天投资太阳能，未来 ${y} 年为您和家人创造稳定的现金流！`,
    cashTitle: '一次性付清',
    cashSub: '无需分期，节省立即开始。',
    payback: '回本期',
    years: '年',
    fromDayOne: '从第一天开始',
    preparedFor: '客户',
    by: '顾问',
    disclaimer:
      '以上为估算值，基于一般用电情况与现有电价。实际结果会因天气、遮挡、屋顶朝向、用电习惯及电价调整而有所不同。',
  },
} as const;

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const InvestmentCase: React.FC = () => {
  const [lang, setLang] = useState<Lang>('zh');
  const [phase, setPhase] = useState<'single' | 'three'>('three');
  const [bill, setBill] = useState<number>(1000);
  const [usage, setUsage] = useState<number>(() => Math.round(getKwhFromBill(1000)));
  const [daytimePercent, setDaytimePercent] = useState(30);
  const [panels, setPanels] = useState(21);
  const [batteries, setBatteries] = useState(2);

  // Discounts are chosen here rather than inherited from the rest of the app, so a poster can be
  // quoted with or without them without disturbing anyone else's screen.
  const [augustPromo, setAugustPromo] = useState(true);
  const [suriaRebate, setSuriaRebate] = useState(false);
  const [plan, setPlan] = useState<Plan>('cc36');
  const [horizon, setHorizon] = useState(20);
  const [tariffGrowth, setTariffGrowth] = useState(0);
  const [customer, setCustomer] = useState('');
  const [agent, setAgent] = useState('');

  // Auto-derived headline figures the agent may type over. null = follow the calculation.
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [savingsOverride, setSavingsOverride] = useState<number | null>(null);
  const [remainingOverride, setRemainingOverride] = useState<number | null>(null);

  const [busy, setBusy] = useState<null | 'download' | 'share'>(null);
  const [toast, setToast] = useState<{ text: string; whatsapp?: boolean } | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [posterHeight, setPosterHeight] = useState(0);
  const previewWrapRef = useRef<HTMLDivElement>(null);

  // Bill and usage are two views of the same number, so editing either re-derives the other.
  // They must agree: every figure on the poster is simulated from usage but presented against the
  // bill, and a mismatch shows up as savings + remaining not adding back to the bill.
  const handleBillChange = (v: number) => {
    setBill(v);
    setUsage(Math.round(getKwhFromBill(v)));
  };
  const handleUsageChange = (v: number) => {
    setUsage(v);
    setBill(Math.round(calculateBill(v).finalTotal));
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Scale the poster down to whatever room the screen has.
  //
  // This has to be an observer, not a one-off measurement: the page is mounted inside a hidden
  // container while another tab is showing, so at mount time the wrapper is 0px wide. Measuring
  // once gave a scale of 0 and the preview stayed invisible until the window happened to be
  // resized. Zero widths are ignored so a hidden tab never overwrites a good scale.
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      if (w > 0) setPreviewScale(Math.min(1, w / POSTER_WIDTH));
    };
    fit();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', fit);
      return () => window.removeEventListener('resize', fit);
    }
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A CSS transform does not affect layout, so the scaled poster would otherwise collapse its
  // parent to zero height and get clipped. Track the real height and reserve the scaled space.
  useEffect(() => {
    const el = posterRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => setPosterHeight(entries[0].contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scenario = useMemo(
    () => calculateScenario(panels, batteries, usage, daytimePercent, phase, bill, false, augustPromo, suriaRebate),
    [panels, batteries, usage, daytimePercent, phase, bill, augustPromo, suriaRebate]
  );

  const termMonths = plan === 'cc60' ? 60 : plan === 'cc36' ? 36 : 0;

  const autoPrice = !scenario
    ? 0
    : plan === 'cash'
      ? scenario.systemCostCash
      : plan === 'cc36'
        ? scenario.systemCostCC
        : scenario.systemCostCC60;

  const price = priceOverride ?? autoPrice;
  const savings = savingsOverride ?? (scenario?.monthlySavings ?? 0);

  // The remaining bill is derived from the two numbers beside it rather than read off the
  // simulation, so the poster's arithmetic always closes: saving + remaining = the bill shown.
  // Taking it from the simulated new bill instead left them a ringgit or two apart, because the
  // simulation prices the *usage* while the poster quotes the bill the customer typed.
  const remainingBill = remainingOverride ?? Math.max(0, bill - Math.round(savings));

  const installmentMonthly = termMonths > 0 ? price / termMonths : 0;
  const netMonthly = savings - installmentMonthly;
  const annualSaving = savings * 12;
  const kwp = panels * (PANEL_WATTAGE / 1000);

  /**
   * Cumulative outflow, year by year. Without solar it is just the bill forever. With solar it is
   * the remaining bill plus the system — spread across the installment term rather than dropped in
   * at year zero, so the green line has the shape the customer actually experiences.
   */
  const series = useMemo(() => {
    const g = tariffGrowth / 100;
    const termYears = termMonths / 12;
    const without: number[] = [];
    const withSolar: number[] = [];
    let cumWithout = 0;
    let cumRemaining = 0;

    for (let y = 0; y <= horizon; y++) {
      if (y > 0) {
        const f = Math.pow(1 + g, y - 1);
        cumWithout += bill * 12 * f;
        cumRemaining += remainingBill * 12 * f;
      }
      const paid = termYears > 0 ? price * Math.min(y, termYears) / termYears : price;
      without.push(cumWithout);
      withSolar.push(cumRemaining + paid);
    }
    return { without, withSolar };
  }, [bill, remainingBill, price, horizon, tariffGrowth, termMonths]);

  /** Where the green line crosses the red one — the point the system has paid for itself. */
  const breakEven = useMemo(() => {
    for (let y = 1; y <= horizon; y++) {
      const prev = series.without[y - 1] - series.withSolar[y - 1];
      const curr = series.without[y] - series.withSolar[y];
      if (curr >= 0) {
        if (curr === prev) return y;
        return (y - 1) + (0 - prev) / (curr - prev);
      }
    }
    return null;
  }, [series, horizon]);

  const totalWithout = series.without[horizon];
  const totalWith = series.withSolar[horizon];
  const netBenefit = totalWithout - totalWith;

  const t = S[lang];

  const fileName = `Solar-Investment-${customer ? customer.replace(/[^\w一-龥-]+/g, '_') + '-' : ''}${new Date().toISOString().slice(0, 10)}.jpg`;

  const runExport = async (mode: 'download' | 'share') => {
    if (busy || !posterRef.current) return;
    setBusy(mode);
    try {
      const canvas = await captureFixedWidthElement(posterRef.current);
      if (mode === 'download') {
        downloadCanvas(canvas, fileName);
        return;
      }
      const outcome: ShareOutcome = await shareCanvas(canvas, {
        fileName,
        title: t.headline,
        text: `${t.headline} — ${t.annualSaving}: RM ${fmt(annualSaving)}`,
      });
      if (outcome === 'copied') {
        setToast({
          text: lang === 'zh'
            ? '图片已复制。在 WhatsApp 聊天中按 Ctrl+V 粘贴发送。'
            : 'Image copied. Paste it into a WhatsApp chat with Ctrl+V.',
          whatsapp: true,
        });
      } else if (outcome === 'saved') {
        setToast({
          text: lang === 'zh'
            ? '图片已保存。在 WhatsApp 中作为附件发送。'
            : 'Image saved. Attach it in WhatsApp to send.',
          whatsapp: true,
        });
      }
    } catch (err) {
      console.error('Investment case export failed', err);
      alert('Failed to generate the image. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const resetOverrides = () => {
    setPriceOverride(null);
    setSavingsOverride(null);
    setRemainingOverride(null);
  };
  const hasOverrides = priceOverride !== null || savingsOverride !== null || remainingOverride !== null;

  return (
    <div className="space-y-4">
      {/* ---------------- Controls ---------------- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {lang === 'zh' ? '投资方案图' : 'Investment Case'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'zh'
                ? '生成一张可直接发送给客户的竖向海报'
                : 'Generate a portrait poster you can send straight to a customer'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setLang(l => (l === 'zh' ? 'en' : 'zh'))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold transition-colors"
            >
              <Globe size={16} />
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
            <button
              onClick={() => runExport('share')}
              disabled={!!busy}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors"
            >
              {busy === 'share' ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
              {busy === 'share'
                ? (lang === 'zh' ? '生成中…' : 'Preparing…')
                : (lang === 'zh' ? '分享到 WhatsApp' : 'Share to WhatsApp')}
            </button>
            <button
              onClick={() => runExport('download')}
              disabled={!!busy}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors"
            >
              {busy === 'download' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {lang === 'zh' ? '下载' : 'Download'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Field label={lang === 'zh' ? '电表类型' : 'Meter'}>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {(['single', 'three'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${phase === p ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  {p === 'single' ? (lang === 'zh' ? '单相' : '1Phase') : (lang === 'zh' ? '三相' : '3Phase')}
                </button>
              ))}
            </div>
          </Field>

          <Field label={lang === 'zh' ? '每月电费 (RM)' : 'Monthly Bill (RM)'} synced>
            <NumInput value={bill} onChange={handleBillChange} min={0} />
          </Field>

          <Field label={lang === 'zh' ? '用电量 (kWh)' : 'Usage (kWh)'} synced>
            <NumInput value={usage} onChange={handleUsageChange} min={0} />
          </Field>

          <Field label={lang === 'zh' ? '白天用量 %' : 'Daytime %'}>
            <NumInput value={daytimePercent} onChange={v => setDaytimePercent(Math.max(0, Math.min(100, v)))} min={0} max={100} />
          </Field>

          <Field label={lang === 'zh' ? '电板数量' : 'Panels'}>
            <NumInput value={panels} onChange={v => setPanels(Math.max(1, v))} min={1} />
          </Field>

          <Field label={lang === 'zh' ? '电池数量' : 'Batteries'}>
            <NumInput value={batteries} onChange={v => setBatteries(Math.max(0, v))} min={0} />
          </Field>

          <Field label={lang === 'zh' ? '付款方式' : 'Payment'}>
            <select
              value={plan}
              onChange={e => { setPlan(e.target.value as Plan); setPriceOverride(null); }}
              className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 bg-white outline-none focus:border-blue-500"
            >
              <option value="cc36">{lang === 'zh' ? '分期 36 期' : '36m Installment'}</option>
              <option value="cc60">{lang === 'zh' ? '分期 60 期' : '60m Installment'}</option>
              <option value="cash">{lang === 'zh' ? '现金' : 'Cash'}</option>
            </select>
          </Field>

          <Field
            label={lang === 'zh' ? '系统价格 (RM)' : 'System Price (RM)'}
            auto={priceOverride === null}
            onReset={priceOverride !== null ? () => setPriceOverride(null) : undefined}
          >
            <NumInput value={Math.round(price)} onChange={setPriceOverride} min={0} />
            {/* Ticking a discount clears any typed-over price, otherwise the tick would appear
                to do nothing. Type over it again afterwards to pin a negotiated figure. */}
            <div className="mt-1.5 space-y-1">
              <Tick2
                checked={augustPromo}
                onChange={v => { setAugustPromo(v); setPriceOverride(null); }}
                label={lang === 'zh' ? '八月促销' : 'August Promo'}
              />
              <Tick2
                checked={suriaRebate}
                onChange={v => { setSuriaRebate(v); setPriceOverride(null); }}
                label={lang === 'zh' ? 'RM3,000 回扣' : 'RM3,000 Rebate'}
              />
            </div>
          </Field>

          <Field
            label={lang === 'zh' ? '每月节省 (RM)' : 'Monthly Saving (RM)'}
            auto={savingsOverride === null}
            onReset={savingsOverride !== null ? () => setSavingsOverride(null) : undefined}
          >
            <NumInput value={Math.round(savings)} onChange={setSavingsOverride} min={0} />
          </Field>

          <Field
            label={lang === 'zh' ? '剩余电费 (RM)' : 'Remaining Bill (RM)'}
            auto={remainingOverride === null}
            onReset={remainingOverride !== null ? () => setRemainingOverride(null) : undefined}
          >
            <NumInput value={Math.round(remainingBill)} onChange={setRemainingOverride} min={0} />
          </Field>

          <Field label={lang === 'zh' ? '年限' : 'Horizon (yrs)'}>
            <NumInput value={horizon} onChange={v => setHorizon(Math.max(5, Math.min(40, v)))} min={5} max={40} />
          </Field>

          <Field label={lang === 'zh' ? '电价年涨 %' : 'Tariff Rise %/yr'}>
            <NumInput value={tariffGrowth} onChange={v => setTariffGrowth(Math.max(0, Math.min(20, v)))} min={0} max={20} step={0.5} />
          </Field>

          <Field label={lang === 'zh' ? '客户姓名' : 'Customer'}>
            <input
              value={customer}
              onChange={e => setCustomer(e.target.value)}
              placeholder={lang === 'zh' ? '可选' : 'Optional'}
              className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 placeholder:font-normal placeholder:text-slate-300"
            />
          </Field>

          <Field label={lang === 'zh' ? '顾问' : 'Agent'}>
            <input
              value={agent}
              onChange={e => setAgent(e.target.value)}
              placeholder={lang === 'zh' ? '可选' : 'Optional'}
              className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 placeholder:font-normal placeholder:text-slate-300"
            />
          </Field>
        </div>

        {hasOverrides && (
          <button
            onClick={resetOverrides}
            className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            <RotateCcw size={13} />
            {lang === 'zh' ? '恢复自动计算的数值' : 'Reset edited figures to calculated values'}
          </button>
        )}

        {!scenario && (
          <p className="mt-3 text-xs font-bold text-amber-600">
            {lang === 'zh'
              ? '没有此电板数量的价格，请调整电板数量。'
              : 'No price tier for this panel count — adjust the panel quantity.'}
          </p>
        )}
      </div>

      {/* ---------------- Preview ---------------- */}
      <div ref={previewWrapRef} className="overflow-hidden">
        <div
          style={{
            width: POSTER_WIDTH * previewScale,
            height: posterHeight ? posterHeight * previewScale : undefined,
          }}
        >
          <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: POSTER_WIDTH }}>
            <Poster
              ref={posterRef}
              t={t}
              lang={lang}
              panels={panels}
              batteries={batteries}
              kwp={kwp}
              bill={bill}
              usage={usage}
              savings={savings}
              remainingBill={remainingBill}
              annualSaving={annualSaving}
              price={price}
              plan={plan}
              termMonths={termMonths}
              installmentMonthly={installmentMonthly}
              netMonthly={netMonthly}
              horizon={horizon}
              series={series}
              breakEven={breakEven}
              netBenefit={netBenefit}
              totalWithout={totalWithout}
              totalWith={totalWith}
              customer={customer}
              agent={agent}
            />
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(30rem,calc(100%-2rem))] bg-slate-900 text-white text-sm rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-green-400 shrink-0" />
          <span className="flex-1 leading-snug">{toast.text}</span>
          {toast.whatsapp && (
            <button
              onClick={() => window.open('https://web.whatsapp.com', '_blank', 'noopener')}
              className="shrink-0 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-xs transition-colors"
            >
              {lang === 'zh' ? '打开' : 'Open'}
            </button>
          )}
          <button onClick={() => setToast(null)} className="shrink-0 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Control helpers                                                     */
/* ------------------------------------------------------------------ */

const Field: React.FC<{
  label: string; auto?: boolean; synced?: boolean; onReset?: () => void; children: React.ReactNode;
}> = ({ label, auto, synced, onReset, children }) => (
  <div>
    <label className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
      <span className="truncate">{label}</span>
      {synced && <span className="text-slate-300 normal-case tracking-normal">synced</span>}
      {auto === true && <span className="text-blue-400 normal-case tracking-normal">auto</span>}
      {onReset && (
        <button onClick={onReset} className="text-blue-500 hover:text-blue-700" title="Reset to calculated">
          <RotateCcw size={11} />
        </button>
      )}
    </label>
    {children}
  </div>
);

const Tick2: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked, onChange, label,
}) => (
  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer hover:text-blue-600 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
    />
    {label}
  </label>
);

/**
 * A number field that can be empty while you are typing in it.
 *
 * Clearing the box used to report 0 upward, which wrote "0" straight back into the input — so
 * selecting all, deleting, and typing 30 left you with "030". The half-typed text now lives in a
 * local draft: an empty box reports nothing and leaves the last committed value alone, and the
 * draft is dropped on blur (falling back to min, or 0) or as soon as the parent settles on a
 * different number than what was typed, which is how clamped fields snap back into view.
 */
const NumInput: React.FC<{
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}> = ({ value, onChange, min, max, step }) => {
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    if (draft === null || draft === '') return;
    const typed = parseFloat(draft);
    if (Number.isFinite(typed) && typed !== value) setDraft(null);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <input
      type="number"
      value={draft ?? (Number.isFinite(value) ? String(value) : '')}
      min={min}
      max={max}
      step={step}
      onChange={e => {
        const raw = e.target.value;
        setDraft(raw);
        const v = parseFloat(raw);
        if (Number.isFinite(v)) onChange(v);
      }}
      onBlur={() => {
        if (draft !== null && draft.trim() === '') onChange(min ?? 0);
        setDraft(null);
      }}
      className="w-full px-2 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
    />
  );
};

/* ------------------------------------------------------------------ */
/* The poster                                                          */
/* ------------------------------------------------------------------ */

interface PosterProps {
  t: typeof S['en'] | typeof S['zh'];
  lang: Lang;
  panels: number;
  batteries: number;
  kwp: number;
  bill: number;
  usage: number;
  savings: number;
  remainingBill: number;
  annualSaving: number;
  price: number;
  plan: Plan;
  termMonths: number;
  installmentMonthly: number;
  netMonthly: number;
  horizon: number;
  series: { without: number[]; withSolar: number[] };
  breakEven: number | null;
  netBenefit: number;
  totalWithout: number;
  totalWith: number;
  customer: string;
  agent: string;
}

const NAVY = '#123a63';
const GREEN = '#16a34a';
const RED = '#dc2626';

const Poster = React.forwardRef<HTMLDivElement, PosterProps>((p, ref) => {
  const { t, lang } = p;
  const cjk = lang === 'zh';
  const font = cjk
    ? '"PingFang SC","Microsoft YaHei","Noto Sans SC","Hiragino Sans GB",sans-serif'
    : 'Inter,"Segoe UI",system-ui,sans-serif';

  return (
    <div
      ref={ref}
      style={{
        width: POSTER_WIDTH,
        background: '#ffffff',
        fontFamily: font,
        color: '#0f172a',
        boxSizing: 'border-box',
      }}
    >
      {/* Masthead — a solid band anchors the top of a tall page and gives the logo somewhere
          to sit that is not competing with the headline. */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #1b5a8c 100%)`,
        padding: '22px 36px 26px',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', flexShrink: 0 }}>
            <div style={logoBox(88).wrap}>
              <img
                src={`${(import.meta as any).env.BASE_URL}astern_logo.png`}
                alt="Astern Technologies"
                style={logoBox(88).img}
              />
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            {p.customer && (
              <div>
                {t.preparedFor}: <b style={{ color: '#fff', fontSize: 15 }}>{p.customer}</b>
              </div>
            )}
            {p.agent && (
              <div style={{ marginTop: 2 }}>
                {t.by}: <b style={{ color: '#fff', fontSize: 15 }}>{p.agent}</b>
              </div>
            )}
          </div>
        </div>

        <div style={{
          fontSize: cjk ? 60 : 50, fontWeight: 800, lineHeight: 1.08,
          letterSpacing: cjk ? 0 : -1, marginTop: 18,
        }}>
          {t.headline}
        </div>
        <div style={{ fontSize: 20, marginTop: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
          {t.sub}
        </div>
      </div>

      <div style={{ padding: '20px 36px 28px' }}>
        {/* System */}
        <div style={{
          border: `2px solid ${NAVY}`, borderRadius: 12, padding: '12px 22px',
          fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 12, marginBottom: 16, color: NAVY,
        }}>
          <Sun size={24} color="#f59e0b" />
          <span>{p.panels} {t.panels} · {p.kwp.toFixed(2)} kWp</span>
          {p.batteries > 0 && (
            <>
              <span style={{ opacity: 0.35 }}>+</span>
              <Battery size={24} color="#10b981" />
              <span>{p.batteries} {t.batteries} · {p.batteries * BATTERY_NOMINAL_KWH} kWh</span>
            </>
          )}
        </div>

        {/* Bill -> savings -> annual */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'stretch' }}>
          <StatCard
            label={t.billNow}
            value={`RM ${fmt(p.bill)}`}
            tone="slate"
            sub={`${fmt(p.usage)} kWh ${t.perMonth}`}
          />
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 32, color: '#cbd5e1', fontWeight: 800 }}>→</div>
          <StatCard
            label={t.afterSolar}
            value={`RM ${fmt(p.savings)}`}
            tone="green"
            sub={`${t.remaining} RM ${fmt(p.remainingBill)} ${t.perMonth}`}
          />
          <StatCard
            label={t.annualSaving}
            value={`RM ${fmt(p.annualSaving)}`}
            tone="greenSolid"
            sub={t.annualSub}
          />
        </div>

        {/* Investment + cash flow */}
        <div style={{ border: `2px solid ${NAVY}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ background: NAVY, color: '#fff', padding: '10px 18px', fontSize: 19, fontWeight: 800, textAlign: 'center' }}>
            {t.investTitle}
          </div>
          <div style={{ display: 'flex', padding: '16px 18px', textAlign: 'center', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#64748b', fontWeight: 700 }}>{t.totalPrice}</div>
              <div style={{ fontSize: 38, fontWeight: 800, color: NAVY, marginTop: 2 }}>RM {fmt(p.price)}</div>
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', background: '#e2e8f0' }} />
            <div style={{ flex: 1 }}>
              {p.termMonths > 0 ? (
                <>
                  <div style={{ fontSize: 14, color: '#64748b', fontWeight: 700 }}>{t.installment(p.termMonths)}</div>
                  <div style={{ fontSize: 38, fontWeight: 800, color: NAVY, marginTop: 2 }}>
                    RM {fmt2(p.installmentMonthly)}
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#64748b' }}> {t.perMonth}</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 14, color: '#64748b', fontWeight: 700 }}>{t.cashTitle}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: GREEN, marginTop: 8 }}>{t.cashSub}</div>
                </>
              )}
            </div>
          </div>

          {p.termMonths > 0 && (
            <div style={{ padding: '0 18px 18px' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1d4ed8', textAlign: 'center', marginBottom: 10 }}>
                  {t.cashflowTitle(p.termMonths)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <MiniStat label={t.monthlySaved} value={`RM ${fmt(p.savings)}`} color={GREEN} />
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#94a3b8' }}>−</span>
                  <MiniStat label={t.monthlyPay} value={`RM ${fmt2(p.installmentMonthly)}`} color="#1d4ed8" />
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#94a3b8' }}>=</span>
                  <MiniStat
                    label={t.netMonthly}
                    value={`${p.netMonthly < 0 ? '−' : '+'} RM ${fmt2(Math.abs(p.netMonthly))}`}
                    color={p.netMonthly < 0 ? RED : GREEN}
                  />
                </div>
                {p.netMonthly < 0 && (
                  <div style={{ marginTop: 10, fontSize: 13.5, color: '#334155', lineHeight: 1.5, background: '#fff', borderRadius: 8, padding: '9px 12px' }}>
                    💡 {t.extraNote(fmt2(Math.abs(p.netMonthly)), p.termMonths)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ background: NAVY, color: '#fff', padding: '10px 18px', fontSize: 19, fontWeight: 800 }}>
            {t.chartTitle(p.horizon)}
          </div>
          <div style={{ padding: 14 }}>
            <CashflowChart {...p} chartW={1100} chartH={420} />
          </div>
        </div>

        {/* What it adds up to */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'stretch' }}>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
              {t.afterYears(p.horizon)}
            </div>
            <div style={{ display: 'flex', gap: 18 }}>
              <div style={{ flex: 1 }}>
                <Tick text={t.bullet1} strong={`RM ${fmt(p.netBenefit)}`} />
              </div>
              <div style={{ flex: 1 }}>
                <Tick text={t.bullet2} sub={t.bullet2sub} />
                <Tick text={t.bullet3} sub={t.bullet3sub} />
              </div>
            </div>
          </div>
          <div style={{
            width: 330, flexShrink: 0,
            background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
            borderRadius: 14, padding: 16, color: '#fff', textAlign: 'center',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.95 }}>{t.netTitle(p.horizon)}</div>
            <div style={{ fontSize: 42, fontWeight: 800, marginTop: 2, lineHeight: 1.1 }}>RM {fmt(p.netBenefit)}</div>
          </div>
        </div>

        {/* Life after the installment */}
        <div style={{ border: '2px solid #bbf7d0', borderRadius: 14, padding: 18, background: '#f0fdf4', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#15803d' }}>
                {p.termMonths > 0 ? t.afterEndTitle(p.termMonths + 1) : t.fromDayOne}
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#166534', marginTop: 4, lineHeight: 1.15 }}>
                {t.afterEndBig(fmt(p.savings))}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                {t.afterEndYear(fmt(p.annualSaving))}
              </div>
              <div style={{ fontSize: 14, color: '#3f6212', marginTop: 6 }}>{t.afterEndSub}</div>
            </div>

            {p.termMonths > 0 && (
              <div style={{ display: 'flex', gap: 10, width: 620, flexShrink: 0 }}>
                <PhaseBox
                  title={t.phase1(p.termMonths)}
                  tone="blue"
                  rows={[
                    [t.monthlySaved, `RM ${fmt(p.savings)}`],
                    [t.monthlyPay, `RM ${fmt2(p.installmentMonthly)}`],
                    [t.netMonthly, `${p.netMonthly < 0 ? '−' : '+'} RM ${fmt2(Math.abs(p.netMonthly))}`],
                  ]}
                />
                <PhaseBox
                  title={t.phase2(p.termMonths + 1)}
                  tone="green"
                  rows={[
                    [t.noPayment, '✓'],
                    [t.directSave, `RM ${fmt(p.savings)}`],
                    [t.yearlySave, `RM ${fmt(p.annualSaving)}`],
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {/* Benefits */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginBottom: 12 }}>{t.benefitsTitle}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Benefit icon={<TrendingUp size={24} color="#f59e0b" />} title={t.b1} sub={t.b1s} />
            <Benefit icon={<ShieldCheck size={24} color="#16a34a" />} title={t.b2} sub={t.b2s} />
            <Benefit icon={<Battery size={24} color="#0ea5e9" />} title={t.b3} sub={t.b3s} />
            <Benefit icon={<Home size={24} color="#8b5cf6" />} title={t.b4} sub={t.b4s} />
            <Benefit icon={<Leaf size={24} color="#10b981" />} title={t.b5} sub={t.b5s} />
          </div>
        </div>

        {/* Closing */}
        <div style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, #1e5e8e 100%)`,
          borderRadius: 14, padding: '18px 24px', color: '#fff', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Zap size={28} color="#fbbf24" />
            {t.closing}
          </div>
          <div style={{ fontSize: 16, marginTop: 6, opacity: 0.9 }}>{t.closingSub(p.horizon)}</div>
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
          {t.disclaimer}
        </div>
      </div>
    </div>
  );
});
Poster.displayName = 'Poster';

/* ---------- poster pieces ---------- */

const StatCard: React.FC<{ label: string; value: string; sub: string; tone: 'slate' | 'green' | 'greenSolid' }> = ({
  label, value, sub, tone,
}) => {
  const styles = {
    slate: { bg: '#f8fafc', border: '#e2e8f0', label: '#64748b', value: '#0f172a', sub: '#94a3b8' },
    green: { bg: '#f0fdf4', border: '#bbf7d0', label: '#15803d', value: '#16a34a', sub: '#4d7c0f' },
    greenSolid: { bg: '#ecfdf5', border: '#6ee7b7', label: '#047857', value: '#047857', sub: '#047857' },
  }[tone];
  return (
    <div style={{
      flex: 1, background: styles.bg, border: `2px solid ${styles.border}`, borderRadius: 14,
      padding: '12px 16px', minWidth: 0,
    }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: styles.label, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: styles.value, lineHeight: 1.2, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 12, color: styles.sub, marginTop: 2 }}>{sub}</div>
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ flex: 1, background: '#fff', borderRadius: 10, padding: '8px 6px', textAlign: 'center', minWidth: 0 }}>
    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, lineHeight: 1.3 }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
  </div>
);

const Benefit: React.FC<{ icon: React.ReactNode; title: string; sub: string }> = ({ icon, title, sub }) => (
  <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{icon}</div>
    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{title}</div>
    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, marginTop: 2 }}>{sub}</div>
  </div>
);

const PhaseBox: React.FC<{ title: string; tone: 'blue' | 'green'; rows: [string, string][] }> = ({ title, tone, rows }) => {
  const c = tone === 'blue'
    ? { bg: '#eff6ff', border: '#bfdbfe', title: '#1d4ed8' }
    : { bg: '#f0fdf4', border: '#bbf7d0', title: '#15803d' };
  return (
    <div style={{ flex: 1, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: 10, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: c.title, marginBottom: 6, lineHeight: 1.3 }}>{title}</div>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 11.5, marginTop: 3 }}>
          <span style={{ color: '#475569' }}>{k}</span>
          <b style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>{v}</b>
        </div>
      ))}
    </div>
  );
};

const Tick: React.FC<{ text: string; strong?: string; sub?: string }> = ({ text, strong, sub }) => (
  <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
    <CheckCircle2 size={15} color={GREEN} style={{ flexShrink: 0, marginTop: 1 }} />
    <div style={{ fontSize: 12.5, lineHeight: 1.4, color: '#334155' }}>
      {text}
      {strong && <div style={{ fontSize: 19, fontWeight: 800, color: GREEN, lineHeight: 1.2 }}>{strong}</div>}
      {sub && <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>}
    </div>
  </div>
);

/* ---------- the chart ---------- */

const CashflowChart: React.FC<PosterProps & { chartW?: number; chartH?: number }> = (p) => {
  const { t, series, horizon, breakEven } = p;

  const W = p.chartW ?? 646, H = p.chartH ?? 300;
  const M = { top: 28, right: 84, bottom: 52, left: 116 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;

  const maxY = Math.max(series.without[horizon], series.withSolar[horizon], 1);
  // Round the axis top up to a clean number so the gridline labels read well.
  const step = Math.pow(10, Math.floor(Math.log10(maxY / 4)));
  const niceStep = [1, 2, 2.5, 5, 10].map(m => m * step).find(s => maxY / s <= 4.5) ?? step * 10;
  const axisTop = Math.ceil(maxY / niceStep) * niceStep;

  const x = (year: number) => M.left + (year / horizon) * iw;
  const y = (val: number) => M.top + ih - (val / axisTop) * ih;

  const pts = (arr: number[]) => arr.map((v, i) => `${x(i)},${y(v)}`).join(' ');

  const gridVals: number[] = [];
  for (let v = 0; v <= axisTop + 0.001; v += niceStep) gridVals.push(v);

  const xTicks = [1, ...Array.from({ length: Math.floor(horizon / 5) }, (_, i) => (i + 1) * 5)]
    .filter((v, i, a) => v <= horizon && a.indexOf(v) === i);

  const dotYears = Array.from({ length: horizon + 1 }, (_, i) => i).filter(i => i > 0 && i % 2 === 0);

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <text x={4} y={14} fontSize={16} fill="#64748b" fontWeight={700}>{t.axisY}</text>

      {gridVals.map(v => (
        <g key={v}>
          <line x1={M.left} x2={M.left + iw} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
          <text x={M.left - 10} y={y(v) + 6} fontSize={16} fill="#94a3b8" textAnchor="end">
            {v === 0 ? 'RM 0' : `RM ${fmt(v)}`}
          </text>
        </g>
      ))}

      {xTicks.map(v => (
        <text key={v} x={x(v)} y={M.top + ih + 26} fontSize={17} fill="#64748b" textAnchor="middle" fontWeight={600}>
          {v}{t.year}
        </text>
      ))}

      {/* without solar */}
      <polyline points={pts(series.without)} fill="none" stroke={RED} strokeWidth={4} strokeLinejoin="round" />
      {dotYears.map(i => (
        <circle key={`r${i}`} cx={x(i)} cy={y(series.without[i])} r={4.5} fill={RED} />
      ))}

      {/* with solar */}
      <polyline points={pts(series.withSolar)} fill="none" stroke={GREEN} strokeWidth={4} strokeLinejoin="round" />
      {dotYears.map(i => (
        <circle key={`g${i}`} cx={x(i)} cy={y(series.withSolar[i])} r={4.5} fill={GREEN} />
      ))}

      {/* end labels */}
      <EndLabel x={x(horizon)} y={y(series.without[horizon])} text={`RM ${fmt(series.without[horizon])}`} color={RED} />
      <EndLabel x={x(horizon)} y={y(series.withSolar[horizon])} text={`RM ${fmt(series.withSolar[horizon])}`} color={GREEN} />

      {/* break-even — the marker sits on the true crossing, so it is interpolated between the
          two whole years the crossing falls between rather than snapped to the nearer one. */}
      {breakEven !== null && breakEven <= horizon && (() => {
        const lo = Math.floor(breakEven);
        const hi = Math.min(lo + 1, horizon);
        const frac = breakEven - lo;
        const crossVal = series.without[lo] + (series.without[hi] - series.without[lo]) * frac;
        return (
        <g>
          <line
            x1={x(breakEven)} x2={x(breakEven)} y1={M.top + ih} y2={y(crossVal)}
            stroke={GREEN} strokeWidth={1.5} strokeDasharray="4 3"
          />
          <circle cx={x(breakEven)} cy={y(crossVal)} r={8} fill="#fff" stroke={GREEN} strokeWidth={4} />
          <g transform={`translate(${Math.min(x(breakEven) + 12, M.left + iw - 210)}, ${M.top + ih - 118})`}>
            <rect width={206} height={56} rx={10} fill="#f0fdf4" stroke={GREEN} strokeWidth={2} />
            <text x={14} y={24} fontSize={17} fontWeight={800} fill="#15803d">{t.breakEven(breakEven.toFixed(1))}</text>
            <text x={14} y={44} fontSize={14} fill="#4d7c0f">{t.breakEvenSub}</text>
          </g>
        </g>
        );
      })()}

      {/* legend */}
      <g transform={`translate(${M.left + 12}, ${M.top + 10})`}>
        <circle cx={6} cy={0} r={5.5} fill={RED} />
        <text x={20} y={5} fontSize={16} fill="#334155" fontWeight={600}>{t.legendWithout}</text>
        <circle cx={6} cy={24} r={5.5} fill={GREEN} />
        <text x={20} y={29} fontSize={16} fill="#334155" fontWeight={600}>{t.legendWith}</text>
        <text x={20} y={47} fontSize={14} fill="#64748b">{t.legendWithSub(Math.round(p.savings))}</text>
      </g>
    </svg>
  );
};

const EndLabel: React.FC<{ x: number; y: number; text: string; color: string }> = ({ x, y, text, color }) => {
  const w = text.length * 9.6 + 20;
  return (
    <g transform={`translate(${x - w / 2}, ${y - 32})`}>
      <rect width={w} height={28} rx={8} fill={color} />
      <text x={w / 2} y={19} fontSize={16} fontWeight={800} fill="#fff" textAnchor="middle">{text}</text>
    </g>
  );
};
