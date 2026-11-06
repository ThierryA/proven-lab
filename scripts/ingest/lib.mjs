import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import TurndownService from 'turndown';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CORPUS = join(ROOT, 'corpus');
const UA = 'proven-ingest/0.1 (+docs sync for AI agents)';

export async function fetchRetry(url, { tries = 4, json = false } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return { res, body: json ? await res.json() : await res.text() };
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 800 * 2 ** i));
    }
  }
}

/** Fetch every page of a WP REST collection. */
export async function fetchAllWp(base, type, fields) {
  const q = (p) => `${base}/${type}?per_page=100&page=${p}&_fields=${fields.join(',')}`;
  const first = await fetchRetry(q(1), { json: true });
  const pages = Number(first.res.headers.get('x-wp-totalpages') || 1);
  const out = [...first.body];
  for (let p = 2; p <= pages; p += 4) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(4, pages - p + 1) }, (_, i) => fetchRetry(q(p + i), { json: true }))
    );
    for (const b of batch) out.push(...b.body);
  }
  return out;
}

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
td.remove(['script', 'style', 'nav', 'svg', 'button']);
export const toMarkdown = (html) => td.turndown(html || '').replace(/\n{3,}/g, '\n\n').trim();
export const stripTags = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#0?39;|&#8217;/g, "'").replace(/&quot;/g, '"').trim();

export async function writeJson(rel, data) {
  const p = join(CORPUS, rel);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 1));
  return p;
}
export async function writeText(rel, text) {
  const p = join(CORPUS, rel);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, text);
}
