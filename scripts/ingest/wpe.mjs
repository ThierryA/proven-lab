// Pulls the WP Engine AI API OpenAPI spec and the developer docs (via sitemap).
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseHtml } from 'node-html-parser';
import { ROOT, fetchRetry, toMarkdown, writeJson, writeText } from './lib.mjs';

const cfg = JSON.parse(await readFile(join(ROOT, 'sources.config.json'), 'utf8')).wpe;

async function sitemapUrls(url) {
  const { body } = await fetchRetry(url);
  const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const nested = locs.filter((l) => l.endsWith('.xml'));
  if (!nested.length) return locs;
  return (await Promise.all(nested.map(sitemapUrls))).flat();
}

export async function ingestWpe(log = console.log) {
  const { body: spec } = await fetchRetry(cfg.openapi);
  await writeText('wpe/openapi.yaml', spec);
  log('wpe openapi.yaml saved');

  const urls = (await sitemapUrls(cfg.sitemap)).filter((u) => cfg.includePrefixes.some((p) => new URL(u).pathname.startsWith(p)));
  const docs = [];
  for (let i = 0; i < urls.length; i += 6) {
    const batch = await Promise.all(urls.slice(i, i + 6).map(async (url) => {
      try {
        const { body } = await fetchRetry(url);
        const root = parseHtml(body);
        const main = root.querySelector('main .sl-markdown-content') || root.querySelector('main');
        if (!main) return null;
        main.querySelectorAll('.sr-only, .copy, nav, script, style').forEach((n) => n.remove());
        const title = root.querySelector('h1')?.text.trim() || new URL(url).pathname;
        const path = new URL(url).pathname;
        return {
          id: `wpe:doc:${path.replace(/^\/docs\/|\/$/g, '').replace(/\//g, ':')}`,
          source: 'wpengine', kind: 'doc', name: title, url, markdown: toMarkdown(main.innerHTML),
        };
      } catch (e) { log(`skip ${url}: ${e.message}`); return null; }
    }));
    docs.push(...batch.filter(Boolean));
  }
  await writeJson('wpe/docs.json', docs);
  await writeJson('wpe/manifest.json', { fetchedAt: new Date().toISOString(), pages: docs.length });
  log(`wpe docs: ${docs.length} pages`);
}
