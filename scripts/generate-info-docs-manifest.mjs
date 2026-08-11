/**
 * Scans public/info-docs/ and writes public/info-docs/manifest.json, which the Info Docs page
 * reads at runtime. Runs automatically before `npm run dev` and `npm run build` (see the
 * predev / prebuild scripts in package.json), so dropping a file into the folder is all that
 * is needed — no code changes.
 *
 * Conventions:
 *   public/info-docs/panel-650w.pdf                  -> category "General", title "Panel 650w"
 *   public/info-docs/Specifications/panel-650w.pdf   -> category "Specifications"
 *   public/info-docs/01-warranty.pdf                 -> sorts first, title "Warranty"
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'public', 'info-docs');
const MANIFEST = path.join(ROOT, 'manifest.json');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.bmp']);
const PDF_EXT = new Set(['.pdf']);

/**
 * Filename -> display title.
 *   "01-panel_datasheet-650w.pdf"            -> "Panel Datasheet 650w"
 *   "Helukabel SOLARFLEX-X H1Z2Z2-K.pdf"     -> "Helukabel SOLARFLEX-X H1Z2Z2-K"
 * A name that already contains spaces is treated as human-written and left alone apart from the
 * extension and any sort prefix — otherwise hyphens inside product codes would be mangled.
 */
const titleFromFilename = (filename) => {
  const base = path
    .basename(filename, path.extname(filename))
    .replace(/^[\d]+[-_.\s]+/, '');       // strip a leading sort prefix

  if (/\s/.test(base)) return base.trim();

  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const typeOf = (ext) => (IMAGE_EXT.has(ext) ? 'image' : PDF_EXT.has(ext) ? 'pdf' : 'file');

fs.mkdirSync(ROOT, { recursive: true });

const docs = [];

/** dir = absolute path, category = label for entries found directly inside it */
const scan = (dir, category) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || entry.name === 'manifest.json') continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // One level of nesting becomes the category name.
      scan(full, titleFromFilename(entry.name));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    const rel = path.relative(ROOT, full).split(path.sep).join('/');
    docs.push({
      id: rel.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase(),
      title: titleFromFilename(entry.name),
      category,
      type: typeOf(ext),
      file: rel,
    });
  }
};

scan(ROOT, 'General');

fs.writeFileSync(MANIFEST, JSON.stringify({ generatedAt: new Date().toISOString(), docs }, null, 2));

if (docs.length === 0) {
  console.log('[info-docs] no files found in public/info-docs/ — wrote empty manifest');
} else {
  const byCategory = docs.reduce((acc, d) => ({ ...acc, [d.category]: (acc[d.category] || 0) + 1 }), {});
  const summary = Object.entries(byCategory).map(([c, n]) => `${c}: ${n}`).join(', ');
  console.log(`[info-docs] indexed ${docs.length} file(s) — ${summary}`);
}
