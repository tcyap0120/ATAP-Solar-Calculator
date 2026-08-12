import React, { useEffect, useState } from 'react';
import {
  FileText, Image as ImageIcon, X, FolderOpen, File as FileIcon, RefreshCw,
  Zap, BatteryCharging, Sun, Cable, PlugZap, Cpu, ShieldCheck, PowerOff,
  Share2, Check, Loader2, CheckSquare, Square,
} from 'lucide-react';

/**
 * Info Docs — reference material agents can pull up and send during a visit.
 *
 * TO ADD A DOCUMENT: drop the file into `public/info-docs/` and redeploy. Nothing else.
 * `scripts/generate-info-docs-manifest.mjs` indexes the folder on every dev/build and writes
 * manifest.json, which this page reads. Put files in a subfolder to group them under a heading,
 * and prefix a filename with a number (e.g. "01-warranty.pdf") to control ordering.
 *
 * TO GIVE A PDF A REAL COVER IMAGE: save a screenshot of its first page next to it with the same
 * name — "GoodWe SP Inverter Datasheet.pdf" + "GoodWe SP Inverter Datasheet.jpg". The image is
 * used as the card thumbnail instead of an icon, and is not listed as a separate document.
 */
type InfoDoc = {
  id: string;
  title: string;
  category: string;
  type: 'image' | 'pdf' | 'file';
  /** Path relative to public/info-docs/ — may include a subfolder. */
  file: string;
  /** Optional cover image path, relative to public/info-docs/. */
  thumb?: string;
};

const docUrl = (file: string) =>
  `${(import.meta as any).env.BASE_URL}info-docs/${file.split('/').map(encodeURIComponent).join('/')}`;

/** Absolute URL — what a recipient needs when we fall back to sharing a link. */
const absoluteDocUrl = (file: string) => new URL(docUrl(file), window.location.href).toString();

const baseName = (file: string) => file.split('/').pop() || file;

const MIME: Record<string, string> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
};
const mimeFor = (file: string) => MIME[(file.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';

/**
 * Pick an icon and colour from the document name so the grid is scannable at a glance rather
 * than a wall of identical grey pages. First match wins, so order matters.
 */
const ICON_RULES: { match: RegExp; Icon: typeof Zap; tint: string }[] = [
  { match: /\b(ev|charger|charging)\b/i, Icon: PlugZap, tint: 'text-violet-500 bg-violet-50' },
  { match: /batter/i, Icon: BatteryCharging, tint: 'text-emerald-500 bg-emerald-50' },
  { match: /inverter/i, Icon: Zap, tint: 'text-amber-500 bg-amber-50' },
  { match: /optimi[sz]er/i, Icon: Cpu, tint: 'text-cyan-600 bg-cyan-50' },
  { match: /(cable|wire|solarflex|helukabel|h1z2z2)/i, Icon: Cable, tint: 'text-slate-500 bg-slate-100' },
  { match: /(outage|blackout|backup|power\s*cut)/i, Icon: PowerOff, tint: 'text-rose-500 bg-rose-50' },
  { match: /(panel|solar|trina|module|\d{3}w)/i, Icon: Sun, tint: 'text-orange-500 bg-orange-50' },
  { match: /(warrant|insur|guarantee)/i, Icon: ShieldCheck, tint: 'text-blue-500 bg-blue-50' },
];

const visualFor = (doc: InfoDoc) => {
  if (doc.type === 'image') return { Icon: ImageIcon, tint: 'text-blue-500 bg-blue-50' };
  const hit = ICON_RULES.find(r => r.match.test(doc.title));
  if (hit) return { Icon: hit.Icon, tint: hit.tint };
  return doc.type === 'pdf'
    ? { Icon: FileText, tint: 'text-slate-400 bg-slate-100' }
    : { Icon: FileIcon, tint: 'text-slate-400 bg-slate-100' };
};

export const InfoDocs: React.FC = () => {
  const [docs, setDocs] = useState<InfoDoc[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [lightbox, setLightbox] = useState<InfoDoc | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  // Multi-select mode for sending several documents in one go.
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = () => {
    setFailed(false);
    // cache-bust so a redeploy doesn't serve a stale manifest
    fetch(`${(import.meta as any).env.BASE_URL}info-docs/manifest.json?t=${Date.now()}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(data => setDocs(Array.isArray(data?.docs) ? data.docs : []))
      .catch(() => { setDocs([]); setFailed(true); });
  };

  useEffect(load, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Close the lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  /**
   * Share one or more documents. Best case (phones) hands the actual files to the OS share
   * sheet, so they land in WhatsApp/email as real attachments. Where that is unsupported we
   * degrade to sharing links, then to copying links to the clipboard.
   */
  const share = async (items: InfoDoc[], busyId: string) => {
    if (items.length === 0) return;
    const nav = navigator as any;
    const links = items.map(d => absoluteDocUrl(d.file));
    const title = items.length === 1 ? items[0].title : `${items.length} documents`;

    setSharingId(busyId);
    try {
      // 1. Real file attachments.
      if (nav.canShare && nav.share) {
        try {
          const files = await Promise.all(items.map(async d => {
            const res = await fetch(docUrl(d.file));
            if (!res.ok) throw new Error(String(res.status));
            const blob = await res.blob();
            return new File([blob], baseName(d.file), { type: blob.type || mimeFor(d.file) });
          }));
          if (nav.canShare({ files })) {
            await nav.share({ files, title });
            return;
          }
        } catch (err: any) {
          // User dismissed the share sheet — that is a completed interaction, not a failure.
          if (err?.name === 'AbortError') return;
          // Anything else (fetch failure, unsupported payload): fall through to link sharing.
        }
      }

      // 2. Share a link instead.
      if (nav.share) {
        try {
          await nav.share({ title, text: title, url: links[0] });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }

      // 3. Desktop: copy the link(s).
      await navigator.clipboard.writeText(links.join('\n'));
      setToast(items.length === 1 ? 'Link copied to clipboard' : `${items.length} links copied to clipboard`);
    } catch {
      setToast('Could not share this file');
    } finally {
      setSharingId(null);
    }
  };

  const toggleSelected = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  const categories = Array.from(new Set((docs ?? []).map(d => d.category)));
  const selectedDocs = (docs ?? []).filter(d => selected.has(d.id));

  const renderCard = (doc: InfoDoc) => {
    const { Icon, tint } = visualFor(doc);
    const cover = doc.thumb ?? (doc.type === 'image' ? doc.file : null);
    const isSelected = selected.has(doc.id);
    const isSharing = sharingId === doc.id;

    const inner = (
      <>
        <div className={`h-20 flex items-center justify-center overflow-hidden ${cover ? 'bg-slate-100' : tint}`}>
          {cover ? (
            <img
              src={docUrl(cover)}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Icon size={26} strokeWidth={1.75} />
          )}
        </div>
        <div className="px-2.5 py-2 flex items-start gap-1.5 flex-1">
          <Icon size={12} className="mt-[3px] shrink-0 text-slate-400" />
          <span className="text-[11px] font-semibold leading-snug text-slate-700 group-hover:text-blue-700 transition-colors">
            {doc.title}
          </span>
        </div>
      </>
    );

    const cls =
      `group w-full bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col text-left transition-all ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-200 hover:shadow-md hover:border-blue-300'
      }`;

    return (
      <div key={doc.id} className="relative">
        {selectMode ? (
          <button onClick={() => toggleSelected(doc.id)} className={cls} title={doc.title}>
            {inner}
          </button>
        ) : doc.type === 'image' ? (
          <button onClick={() => setLightbox(doc)} className={cls} title={doc.title}>
            {inner}
          </button>
        ) : (
          <a href={docUrl(doc.file)} target="_blank" rel="noopener noreferrer" className={cls} title={`Open ${doc.title}`}>
            {inner}
          </a>
        )}

        {selectMode ? (
          <div className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center shadow-sm ${isSelected ? 'bg-blue-600 text-white' : 'bg-white/90 text-slate-400 border border-slate-200'}`}>
            {isSelected ? <Check size={14} strokeWidth={3} /> : <Square size={12} />}
          </div>
        ) : (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); share([doc], doc.id); }}
            disabled={isSharing}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:border-blue-600 hover:text-white active:scale-95 transition-all disabled:opacity-60"
            title={`Share ${doc.title}`}
            aria-label={`Share ${doc.title}`}
          >
            {isSharing ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
          </button>
        )}
      </div>
    );
  };

  const hasDocs = (docs?.length ?? 0) > 0;

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderOpen size={24} className="text-blue-600" />
            Info Docs
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Reference images and PDFs — tap to open, or share straight to WhatsApp, email and more.
          </p>
        </div>
        <div className="shrink-0 mt-1 flex items-center gap-2">
          {hasDocs && (
            <button
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                selectMode
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600'
              }`}
              title="Select several documents to share at once"
            >
              <CheckSquare size={13} /> {selectMode ? 'Cancel' : 'Select'}
            </button>
          )}
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
            title="Reload the document list"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {docs === null ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
          Loading documents…
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
          <FolderOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600">No documents yet</p>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Drop images or PDFs into{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono text-xs">public/info-docs/</code>{' '}
            and redeploy — they are indexed automatically. Use a subfolder to group them under a heading.
          </p>
          {failed && (
            <p className="text-xs text-amber-600 mt-3">
              Manifest not found. It is generated on <code className="font-mono">npm run dev</code> / <code className="font-mono">npm run build</code>.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              {/* A lone "General" group needs no heading — it would just say "General". */}
              {!(categories.length === 1 && category === 'General') && (
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">{category}</h3>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {docs.filter(d => d.category === category).map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky action bar while selecting. */}
      {selectMode && (
        <div className="fixed bottom-0 inset-x-0 md:left-64 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] animate-in slide-in-from-bottom-2 duration-200">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-600">
              {selected.size === 0 ? 'Select documents to share' : `${selected.size} selected`}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set((docs ?? []).map(d => d.id)))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                Select all
              </button>
              <button
                onClick={() => share(selectedDocs, '__bulk__')}
                disabled={selected.size === 0 || sharingId === '__bulk__'}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
              >
                {sharingId === '__bulk__'
                  ? <><Loader2 size={13} className="animate-spin" /> Preparing…</>
                  : <><Share2 size={13} /> Share{selected.size > 0 ? ` (${selected.size})` : ''}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); share([lightbox], lightbox.id); }}
            className="absolute top-4 right-16 h-10 px-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-2 text-sm font-semibold text-white transition-colors"
            title="Share this image"
          >
            {sharingId === lightbox.id ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />} Share
          </button>
          <img
            src={docUrl(lightbox.file)}
            alt={lightbox.title}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
