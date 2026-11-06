// Pulls the WordPress Code Reference (functions, classes, methods, hooks) and all
// developer handbooks from developer.wordpress.org's public REST API.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, fetchAllWp, fetchRetry, toMarkdown, stripTags, writeJson, writeText } from './lib.mjs';

const cfg = JSON.parse(await readFile(join(ROOT, 'sources.config.json'), 'utf8')).wp;

async function termMap(tax) {
  const terms = await fetchAllWp(cfg.base, tax, ['id', 'name']).catch(() => []);
  return new Map(terms.map((t) => [t.id, t.name]));
}

export async function ingestWp(log = console.log) {
  const since = await termMap('wp-parser-since');
  const pkg = await termMap('wp-parser-package');
  const counts = {};

  for (const type of cfg.reference) {
    const kind = type.replace('wp-parser-', '');
    const rows = await fetchAllWp(cfg.base, type, ['id', 'slug', 'link', 'title', 'content', 'modified', 'wp-parser-since', 'wp-parser-package']);
    const docs = rows.map((r) => ({
      id: `wp:${kind}:${r.slug}`,
      source: 'wordpress',
      kind,
      name: stripTags(r.title.rendered),
      url: r.link,
      since: (r['wp-parser-since'] || []).map((i) => since.get(i)).filter(Boolean),
      package: (r['wp-parser-package'] || []).map((i) => pkg.get(i)).filter(Boolean),
      modified: r.modified,
      markdown: toMarkdown(r.content?.rendered),
    }));
    counts[kind] = docs.length;
    await writeJson(`wp/reference/${kind}.json`, docs);
    log(`wp ${kind}: ${docs.length}`);
  }

  for (const type of cfg.handbooks) {
    const rows = await fetchAllWp(cfg.base, type, ['id', 'slug', 'link', 'title', 'content', 'modified', 'parent']);
    const docs = rows.map((r) => ({
      id: `wp:handbook:${type.replace('-handbook', '')}:${r.slug}`,
      source: 'wordpress',
      kind: 'handbook',
      handbook: type.replace('-handbook', ''),
      name: stripTags(r.title.rendered),
      url: r.link,
      modified: r.modified,
      markdown: toMarkdown(r.content?.rendered),
    }));
    counts[type] = docs.length;
    await writeJson(`wp/handbooks/${type.replace('-handbook', '')}.json`, docs);
    log(`wp ${type}: ${docs.length}`);
  }

  for (const x of cfg.extra || []) {
    const { body } = await fetchRetry(x.url);
    await writeText(`wp/extra/${x.name}.md`, body);
    log(`wp extra: ${x.name}`);
  }
  await writeJson('wp/manifest.json', { fetchedAt: new Date().toISOString(), counts });
}
