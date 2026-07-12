
import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck, User, Phone, Mail, MapPin, CreditCard, UserCheck, Home,
  FileText, Camera, Banknote, Copy, Check, CheckCircle2, RefreshCw, Info,
  FolderOpen, Plus, Trash2, ChevronDown, Globe,
  type LucideIcon
} from 'lucide-react';

const STORE_KEY = 'atap_submission_cases_v1';
const LEGACY_KEY = 'atap_submission_checklist_v1';

type Lang = 'en' | 'zh';

interface ApplicantInfo { fullName: string; phone: string; email: string; }
interface AltContact {
  fullName: string; phone: string; ic: string; address: string; sameAddress: boolean; email: string;
}
interface ChecklistData {
  applicant: ApplicantInfo;
  isOwner: boolean;
  alt: AltContact;
  docs: Record<string, boolean>;
}
interface CaseRecord { id: string; name: string; updatedAt: number; data: ChecklistData; }
interface Store { cases: CaseRecord[]; activeId: string; lang: Lang; }

interface DocItem {
  id: string;
  icon: LucideIcon;
  onlyIfNonOwner?: boolean;
  bank?: { name: string; bank: string; account: string };
  en: { title: string; remark?: string };
  zh: { title: string; remark?: string };
}

const DOCUMENTS: DocItem[] = [
  {
    id: 'tnb_bills', icon: FileText,
    en: { title: '3 Months TNB Bills', remark: 'Can be a clear photo of the physical bill, or a PDF bill from the TNB app with the name uncensored.' },
    zh: { title: '3 个月 TNB 电费单', remark: '可以是实体账单的清晰照片，或从 TNB App 下载、姓名未遮挡的 PDF 账单。' },
  },
  {
    id: 'ic', icon: CreditCard,
    en: { title: "Applicant's IC — Front & Back Photos", remark: 'If you want to cross/watermark it, please write “For TNB only”.' },
    zh: { title: '申请人身份证 — 正反面照片', remark: '如需加水印／划线，请注明「For TNB only」。' },
  },
  {
    id: 'ownership', icon: Home,
    en: { title: 'House Ownership Document', remark: 'Cukai Taksiran / Cukai Tanah / Geran / SPA — any one of these.' },
    zh: { title: '房屋拥有权文件', remark: '门牌税 (Cukai Taksiran) / 地税 (Cukai Tanah) / 地契 (Geran) / 买卖合约 (SPA) 任选其一。' },
  },
  {
    id: 'meter', icon: Camera,
    en: { title: 'TNB Meter Photos', remark: '2 photos — (1) close enough to see the barcode & fuse boxes, (2) slightly further to capture the whole TNB meter.' },
    zh: { title: 'TNB 电表照片', remark: '2 张照片 —（1）近距离可看清条形码与保险丝盒，（2）稍远可拍到整个 TNB 电表。' },
  },
  {
    id: 'frontview', icon: Camera,
    en: { title: 'House Front-view Photo' },
    zh: { title: '房屋正面照片' },
  },
  {
    id: 'relationship', icon: FileText, onlyIfNonOwner: true,
    en: { title: 'Marriage Cert / Birth Cert / Tenancy Agreement', remark: 'Any one — required because the TNB applicant is not one of the house owners.' },
    zh: { title: '结婚证书 / 出生证书 / 租约', remark: '任选其一 — 因 TNB 申请人非屋主，故需提供。' },
  },
  {
    id: 'booking_slip', icon: Banknote,
    bank: { name: 'ASTERN TECHNOLOGIES SDN BHD', bank: 'AmBank', account: '8881044897418' },
    en: { title: 'Booking Fee Transaction Slip', remark: "Please write the applicant's full name in the transfer remark." },
    zh: { title: '订金转账收据', remark: '请在转账备注中填写申请人全名。' },
  },
];

const T = {
  en: {
    title: 'Submission Checklist',
    subtitle: 'Fill in the applicant details and tick off each required document before submission.',
    reset: 'Reset',
    clientCase: 'Client Case',
    caseName: 'Case / Client Name',
    casePlaceholder: 'e.g. Ahmad — Jalan 5',
    newCase: 'New Case',
    del: 'Delete',
    lastUpdated: 'Updated',
    docsReady: 'Documents ready',
    applicant: 'TNB User / Applicant',
    fullName: 'Full Name', nameHint: 'As per IC',
    phone: 'Phone Number', email: 'Email Address',
    ownerQ: 'Is the TNB user one of the house owners?',
    yes: 'Yes', no: 'No',
    nonOwnerNote: 'An extra document (Marriage / Birth Cert or Tenancy Agreement) is required below.',
    altContact: 'Alternative Contact',
    ic: 'IC Number', address: 'Address', sameAsAbove: 'Same as above', fullAddress: 'Full address',
    requiredDocs: 'Required Documents',
    bookingBank: 'Booking Fee — Bank Account',
    copy: 'Copy', copied: 'Copied',
    allDone: 'All documents ticked — ready to submit!',
    remaining: (n: number) => `${n} document(s) remaining`,
    copySummary: 'Copy Summary', copiedSummary: 'Copied Summary',
    caseDefault: 'Case',
    confirmDelete: 'Delete this client case?',
    confirmReset: "Clear this case's data?",
    isOwnerLabel: 'Is one of the house owners',
    documents: 'Documents',
    emailPh: 'name@email.com', phonePh: '01x-xxxxxxx', icPh: 'xxxxxx-xx-xxxx', namePh: 'Full name',
  },
  zh: {
    title: '提交清单',
    subtitle: '请填写申请人资料，并在提交前勾选每项所需文件。',
    reset: '重置',
    clientCase: '客户档案',
    caseName: '档案 / 客户名称',
    casePlaceholder: '例如：Ahmad — Jalan 5',
    newCase: '新增档案',
    del: '删除',
    lastUpdated: '更新于',
    docsReady: '文件准备进度',
    applicant: 'TNB 用户 / 申请人',
    fullName: '全名', nameHint: '与身份证一致',
    phone: '电话号码', email: '电邮地址',
    ownerQ: 'TNB 用户是否为其中一位屋主？',
    yes: '是', no: '否',
    nonOwnerNote: '下方需额外提供文件（结婚证书 / 出生证书或租约）。',
    altContact: '备用联络人',
    ic: '身份证号码', address: '地址', sameAsAbove: '同上', fullAddress: '完整地址',
    requiredDocs: '所需文件',
    bookingBank: '订金 — 银行账户',
    copy: '复制', copied: '已复制',
    allDone: '所有文件已勾选 — 可以提交！',
    remaining: (n: number) => `还剩 ${n} 份文件`,
    copySummary: '复制摘要', copiedSummary: '已复制摘要',
    caseDefault: '档案',
    confirmDelete: '确定删除此客户档案？',
    confirmReset: '确定清除此档案的资料？',
    isOwnerLabel: '是否为屋主之一',
    documents: '文件',
    emailPh: 'name@email.com', phonePh: '01x-xxxxxxx', icPh: 'xxxxxx-xx-xxxx', namePh: '全名',
  },
} as const;

const DEFAULT_DATA: ChecklistData = {
  applicant: { fullName: '', phone: '', email: '' },
  isOwner: true,
  alt: { fullName: '', phone: '', ic: '', address: '', sameAddress: false, email: '' },
  docs: {},
};

let idSeq = 0;
const genId = () => `case_${Date.now().toString(36)}_${(idSeq++).toString(36)}`;

const makeCase = (name: string, data?: ChecklistData): CaseRecord => ({
  id: genId(),
  name,
  updatedAt: Date.now(),
  data: data ?? DEFAULT_DATA,
});

const mergeData = (partial: any): ChecklistData => ({
  ...DEFAULT_DATA,
  ...partial,
  applicant: { ...DEFAULT_DATA.applicant, ...(partial?.applicant || {}) },
  alt: { ...DEFAULT_DATA.alt, ...(partial?.alt || {}) },
  docs: { ...(partial?.docs || {}) },
});

const loadStore = (): Store => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p.cases) && p.cases.length > 0) {
        const cases: CaseRecord[] = p.cases.map((c: any) => ({
          id: c.id || genId(),
          name: c.name || 'Case',
          updatedAt: c.updatedAt || Date.now(),
          data: mergeData(c.data),
        }));
        const activeId = cases.some((c) => c.id === p.activeId) ? p.activeId : cases[0].id;
        const lang: Lang = p.lang === 'zh' ? 'zh' : 'en';
        return { cases, activeId, lang };
      }
    }
    // migrate legacy single-record checklist
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const c = makeCase('Case 1', mergeData(JSON.parse(legacy)));
      return { cases: [c], activeId: c.id, lang: 'en' };
    }
  } catch { /* ignore */ }
  const c = makeCase('Case 1');
  return { cases: [c], activeId: c.id, lang: 'en' };
};

// --- Reusable input field ---
const Field: React.FC<{
  label: string; icon: LucideIcon; value: string;
  onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}> = ({ label, icon: Icon, value, onChange, placeholder, type = 'text', disabled }) => (
  <label className="block">
    <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
      <Icon size={13} /> {label}
    </span>
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
    />
  </label>
);

export const SubmissionChecklist: React.FC = () => {
  const [store, setStore] = useState<Store>(loadStore);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }, [store]);

  const active = store.cases.find((c) => c.id === store.activeId) ?? store.cases[0];
  const data = active.data;
  const lang = store.lang;
  const t = T[lang];

  // --- mutations ---
  const updateData = (updater: (d: ChecklistData) => ChecklistData) =>
    setStore((s) => ({
      ...s,
      cases: s.cases.map((c) => (c.id === s.activeId ? { ...c, data: updater(c.data), updatedAt: Date.now() } : c)),
    }));
  const setApplicant = (patch: Partial<ApplicantInfo>) => updateData((d) => ({ ...d, applicant: { ...d.applicant, ...patch } }));
  const setAlt = (patch: Partial<AltContact>) => updateData((d) => ({ ...d, alt: { ...d.alt, ...patch } }));
  const setOwner = (v: boolean) => updateData((d) => ({ ...d, isOwner: v }));
  const toggleDoc = (id: string) => updateData((d) => ({ ...d, docs: { ...d.docs, [id]: !d.docs[id] } }));

  const renameActive = (name: string) => setStore((s) => ({ ...s, cases: s.cases.map((c) => (c.id === s.activeId ? { ...c, name } : c)) }));
  const selectCase = (id: string) => setStore((s) => ({ ...s, activeId: id }));
  const setLang = (l: Lang) => setStore((s) => ({ ...s, lang: l }));

  const newCase = () => setStore((s) => {
    const c = makeCase(`${T[s.lang].caseDefault} ${s.cases.length + 1}`);
    return { ...s, cases: [...s.cases, c], activeId: c.id };
  });

  const deleteCase = () => {
    if (!confirm(t.confirmDelete)) return;
    setStore((s) => {
      const rest = s.cases.filter((c) => c.id !== s.activeId);
      if (rest.length === 0) {
        const c = makeCase(`${T[s.lang].caseDefault} 1`);
        return { ...s, cases: [c], activeId: c.id };
      }
      return { ...s, cases: rest, activeId: rest[0].id };
    });
  };

  const resetActive = () => {
    if (confirm(t.confirmReset)) updateData(() => DEFAULT_DATA);
  };

  const visibleDocs = useMemo(() => DOCUMENTS.filter((d) => !d.onlyIfNonOwner || !data.isOwner), [data.isOwner]);
  const checkedCount = visibleDocs.filter((d) => data.docs[d.id]).length;
  const progress = visibleDocs.length > 0 ? (checkedCount / visibleDocs.length) * 100 : 0;

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch { /* ignore */ }
  };

  const buildSummary = () => {
    const a = data.applicant, alt = data.alt;
    const lines: string[] = [];
    lines.push(`📋 ${t.title}${active.name ? ` — ${active.name}` : ''}`);
    lines.push('----------------------------------------');
    lines.push(`👤 ${t.applicant}`);
    lines.push(`- ${t.fullName}: ${a.fullName || '-'}`);
    lines.push(`- ${t.phone}: ${a.phone || '-'}`);
    lines.push(`- ${t.email}: ${a.email || '-'}`);
    lines.push(`- ${t.isOwnerLabel}: ${data.isOwner ? t.yes : t.no}`);
    lines.push('');
    lines.push(`📇 ${t.altContact}`);
    lines.push(`- ${t.fullName}: ${alt.fullName || '-'}`);
    lines.push(`- ${t.phone}: ${alt.phone || '-'}`);
    lines.push(`- ${t.ic}: ${alt.ic || '-'}`);
    lines.push(`- ${t.address}: ${alt.sameAddress ? t.sameAsAbove : (alt.address || '-')}`);
    lines.push(`- ${t.email}: ${alt.email || '-'}`);
    lines.push('');
    lines.push(`📎 ${t.documents} (${checkedCount}/${visibleDocs.length})`);
    visibleDocs.forEach((doc) => lines.push(`${data.docs[doc.id] ? '✅' : '⬜'} ${doc[lang].title}`));
    return lines.join('\n');
  };

  const updatedStr = useMemo(() => {
    try { return new Date(active.updatedAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB'); }
    catch { return ''; }
  }, [active.updatedAt, lang]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <ClipboardCheck className="text-blue-600" size={26} />
            {t.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          {/* Language toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <Globe size={15} className="mx-1.5 text-slate-400" />
            {(['en', 'zh'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${lang === l ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {l === 'en' ? 'EN' : '中文'}
              </button>
            ))}
          </div>
          <button
            onClick={resetActive}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-red-300 hover:text-red-600"
          >
            <RefreshCw size={16} /> {t.reset}
          </button>
        </div>
      </div>

      {/* Case manager */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <FolderOpen size={13} /> {t.clientCase}
            </span>
            <div className="relative">
              <select
                value={store.activeId}
                onChange={(e) => selectCase(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {store.cases.map((c) => (
                  <option key={c.id} value={c.id}>{c.name || '—'}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <div className="flex-1">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <User size={13} /> {t.caseName}
            </span>
            <input
              value={active.name}
              onChange={(e) => renameActive(e.target.value)}
              placeholder={t.casePlaceholder}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={newCase}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-500"
            >
              <Plus size={16} /> {t.newCase}
            </button>
            <button
              onClick={deleteCase}
              disabled={store.cases.length <= 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
              title={t.del}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-slate-400">
          {store.cases.length} {t.clientCase}{lang === 'en' && store.cases.length > 1 ? 's' : ''} · {t.lastUpdated}: {updatedStr}
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-700">{t.docsReady}</span>
          <span className="font-bold text-blue-600">{checkedCount} / {visibleDocs.length}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT: Particulars */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
              <User className="text-blue-600" size={18} />
              {t.applicant}
            </h3>
            <div className="space-y-3">
              <Field label={t.fullName} icon={User} value={data.applicant.fullName} onChange={(v) => setApplicant({ fullName: v })} placeholder={t.nameHint} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t.phone} icon={Phone} type="tel" value={data.applicant.phone} onChange={(v) => setApplicant({ phone: v })} placeholder={t.phonePh} />
                <Field label={t.email} icon={Mail} type="email" value={data.applicant.email} onChange={(v) => setApplicant({ email: v })} placeholder={t.emailPh} />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserCheck size={16} className="text-blue-600" />
                {t.ownerQ}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setOwner(true)}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${data.isOwner ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-100'}`}
                >
                  {t.yes}
                </button>
                <button
                  onClick={() => setOwner(false)}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${!data.isOwner ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-100'}`}
                >
                  {t.no}
                </button>
              </div>
              {!data.isOwner && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  {t.nonOwnerNote}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
              <Phone className="text-blue-600" size={18} />
              {t.altContact}
            </h3>
            <div className="space-y-3">
              <Field label={t.fullName} icon={User} value={data.alt.fullName} onChange={(v) => setAlt({ fullName: v })} placeholder={t.namePh} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t.phone} icon={Phone} type="tel" value={data.alt.phone} onChange={(v) => setAlt({ phone: v })} placeholder={t.phonePh} />
                <Field label={t.ic} icon={CreditCard} value={data.alt.ic} onChange={(v) => setAlt({ ic: v })} placeholder={t.icPh} />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <MapPin size={13} /> {t.address}
                  </span>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={data.alt.sameAddress}
                      onChange={(e) => setAlt({ sameAddress: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {t.sameAsAbove}
                  </label>
                </div>
                <textarea
                  value={data.alt.sameAddress ? '' : data.alt.address}
                  disabled={data.alt.sameAddress}
                  onChange={(e) => setAlt({ address: e.target.value })}
                  placeholder={data.alt.sameAddress ? t.sameAsAbove : t.fullAddress}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <Field label={t.email} icon={Mail} type="email" value={data.alt.email} onChange={(v) => setAlt({ email: v })} placeholder={t.emailPh} />
            </div>
          </div>
        </div>

        {/* RIGHT: Documents */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 px-1 font-bold text-slate-800">
            <FileText className="text-blue-600" size={18} />
            {t.requiredDocs}
          </h3>

          {visibleDocs.map((doc, idx) => {
            const Icon = doc.icon;
            const checked = !!data.docs[doc.id];
            const dt = doc[lang];
            return (
              <div
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition ${checked ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white hover:border-blue-300'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>
                    {checked && <Check size={15} strokeWidth={3} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">{idx + 1}</span>
                      <Icon size={15} className="shrink-0 text-slate-400" />
                      <span className={`font-semibold ${checked ? 'text-emerald-800' : 'text-slate-800'}`}>{dt.title}</span>
                    </div>
                    {dt.remark && <p className="mt-1.5 pl-8 text-xs leading-relaxed text-slate-500">{dt.remark}</p>}

                    {doc.bank && (
                      <div onClick={(e) => e.stopPropagation()} className="mt-3 ml-8 cursor-default rounded-xl border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          <Banknote size={13} /> {t.bookingBank}
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div className="font-semibold text-slate-800">{doc.bank.name}</div>
                          <div className="text-slate-600">{doc.bank.bank}</div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-lg font-bold tracking-wide text-slate-900">{doc.bank.account}</span>
                            <button
                              onClick={() => copyText(doc.bank!.account, 'acc')}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-500"
                            >
                              {copied === 'acc' ? <><Check size={13} /> {t.copied}</> : <><Copy size={13} /> {t.copy}</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          {progress >= 100 ? (
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
              <CheckCircle2 size={18} /> {t.allDone}
            </span>
          ) : (
            <span className="text-slate-500">{t.remaining(visibleDocs.length - checkedCount)}</span>
          )}
        </div>
        <button
          onClick={() => copyText(buildSummary(), 'summary')}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-600"
        >
          {copied === 'summary' ? <><Check size={16} /> {t.copiedSummary}</> : <><Copy size={16} /> {t.copySummary}</>}
        </button>
      </div>
    </div>
  );
};

export default SubmissionChecklist;
