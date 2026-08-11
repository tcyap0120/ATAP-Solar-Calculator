import React, { useEffect, useState } from 'react';
import { FileText, Image as ImageIcon, ExternalLink, X, FolderOpen, File as FileIcon, RefreshCw } from 'lucide-react';

/**
 * Info Docs — reference material agents can pull up during a visit.
 *
 * TO ADD A DOCUMENT: drop the file into `public/info-docs/` and redeploy. Nothing else.
 * `scripts/generate-info-docs-manifest.mjs` indexes the folder on every dev/build and writes
 * manifest.json, which this page reads. Put files in a subfolder to group them under a heading,
 * and prefix a filename with a number (e.g. "01-warranty.pdf") to control ordering.
 */
type InfoDoc = {
  id: string;
  title: string;
  category: string;
  type: 'image' | 'pdf' | 'file';
  /** Path relative to public/info-docs/ — may include a subfolder. */
  file: string;
};

const docUrl = (file: string) =>
  `${(import.meta as any).env.BASE_URL}info-docs/${file.split('/').map(encodeURIComponent).join('/')}`;

const TypeIcon: React.FC<{ type: InfoDoc['type']; size?: number; className?: string }> = ({ type, size = 14, className }) =>
  type === 'image' ? <ImageIcon size={size} className={className} />
    : type === 'pdf' ? <FileText size={size} className={className} />
      : <FileIcon size={size} className={className} />;

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
        <div className="space-y-8">
          {categories.map(category => (
            <div key={category}>
              {/* A lone "General" group needs no heading — it would just say "General". */}
              {!(categories.length === 1 && category === 'General') && (
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{category}</h3>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.filter(d => d.category === category).map(doc => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-blue-200 transition-all"
                  >
                    {doc.type === 'image' ? (
                      <button
                        onClick={() => setLightbox(doc)}
                        className="block w-full aspect-[4/3] bg-slate-100 overflow-hidden group"
                        title="Click to enlarge"
                      >
                        <img
                          src={docUrl(doc.file)}
                          alt={doc.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </button>
                    ) : (
                      <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center border-b border-slate-100">
                        <TypeIcon type={doc.type} size={44} className="text-slate-300" />
                      </div>
                    )}

                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex items-start gap-2">
                        <TypeIcon type={doc.type} className="mt-0.5 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-800 break-words">{doc.title}</div>
                        </div>
                      </div>
                      <a
                        href={docUrl(doc.file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                      >
                        Open <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
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
