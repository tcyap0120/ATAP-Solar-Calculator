import React, { useEffect, useState } from 'react';
import {
  FileText, Image as ImageIcon, X, FolderOpen, File as FileIcon, RefreshCw,
  Zap, BatteryCharging, Sun, Cable, PlugZap, Cpu, ShieldCheck, PowerOff,
} from 'lucide-react';

/**
 * Info Docs — reference material agents can pull up during a visit.
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

/**
 * Pick an icon and colour from the document name so the grid is scannable at a glance rather
 * than seven identical grey pages. First match wins, so order matters.
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

  const load = () => {
    setFailed(false);
    // cache-bust so a redeploy doesn't serve a stale manifest
    fetch(`${(import.meta as any).env.BASE_URL}info-docs/manifest.json?t=${Date.now()}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(data => setDocs(Array.isArray(data?.docs) ? data.docs : []))
      .catch(() => { setDocs([]); setFailed(true); });
  };

  useEffect(load, []);

  // Close the lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const categories = Array.from(new Set((docs ?? []).map(d => d.category)));

  const renderCard = (doc: InfoDoc) => {
    const { Icon, tint } = visualFor(doc);
    const cover = doc.thumb ?? (doc.type === 'image' ? doc.file : null);

    // Images open in the lightbox; everything else opens in a new tab.
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
      'group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col text-left hover:shadow-md hover:border-blue-300 transition-all';

    return doc.type === 'image' ? (
      <button key={doc.id} onClick={() => setLightbox(doc)} className={cls} title={doc.title}>
        {inner}
      </button>
    ) : (
      <a
        key={doc.id}
        href={docUrl(doc.file)}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        title={`Open ${doc.title}`}
      >
        {inner}
      </a>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderOpen size={24} className="text-blue-600" />
            Info Docs
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Reference images and PDFs to show customers during a visit.
          </p>
        </div>
        <button
          onClick={load}
          className="shrink-0 mt-1 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
          title="Reload the document list"
        >
          <RefreshCw size={13} /> Refresh
        </button>
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
