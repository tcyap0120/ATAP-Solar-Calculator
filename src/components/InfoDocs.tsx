import React, { useState } from 'react';
import { FileText, Image as ImageIcon, ExternalLink, X, FolderOpen } from 'lucide-react';

/**
 * Info Docs — reference material agents can pull up during a visit.
 *
 * TO ADD A DOCUMENT:
 *   1. Drop the file into `public/info-docs/` (create the folder if it isn't there yet).
 *   2. Add an entry to INFO_DOCS below. `file` is the name only — no path, no leading slash.
 *
 * Images open in a full-screen viewer; PDFs open inline with a button to pop out to a new tab.
 * Entries render in the order listed here, grouped by `category`.
 */
type InfoDoc = {
  id: string;
  title: string;
  /** Optional one-line note shown under the title. */
  description?: string;
  category: string;
  type: 'image' | 'pdf';
  /** Filename inside public/info-docs/ — e.g. "warranty-panel.pdf" */
  file: string;
};

const INFO_DOCS: InfoDoc[] = [
  // Examples — delete these two lines and add real entries:
  // { id: 'panel-spec', title: 'Panel Datasheet 650W', category: 'Specifications', type: 'pdf', file: 'panel-650w.pdf' },
  // { id: 'battery-photo', title: 'Battery Installation', description: 'Typical wall mount', category: 'Photos', type: 'image', file: 'battery-install.jpg' },
];

const docUrl = (file: string) => `${(import.meta as any).env.BASE_URL}info-docs/${file}`;

export const InfoDocs: React.FC = () => {
  const [lightbox, setLightbox] = useState<InfoDoc | null>(null);

  const categories = Array.from(new Set(INFO_DOCS.map(d => d.category)));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FolderOpen size={24} className="text-blue-600" />
          Info Docs
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Reference images and PDFs to show customers during a visit.
        </p>
      </div>

      {INFO_DOCS.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
          <FolderOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600">No documents yet</p>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Drop files into <code className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono text-xs">public/info-docs/</code>{' '}
            then list them in <code className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono text-xs">INFO_DOCS</code> at the
            top of <code className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono text-xs">src/components/InfoDocs.tsx</code>.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{category}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {INFO_DOCS.filter(d => d.category === category).map(doc => (
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
                        <FileText size={44} className="text-slate-300" />
                      </div>
                    )}

                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex items-start gap-2">
                        {doc.type === 'image'
                          ? <ImageIcon size={14} className="mt-0.5 shrink-0 text-slate-400" />
                          : <FileText size={14} className="mt-0.5 shrink-0 text-slate-400" />}
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-800 truncate">{doc.title}</div>
                          {doc.description && (
                            <div className="text-xs text-slate-400 mt-0.5">{doc.description}</div>
                          )}
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
