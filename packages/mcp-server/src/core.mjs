import { readFile } from 'node:fs/promises';
import { howToCall } from './ai-call.mjs';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// In the repo, read the freshly built dist/ (it wins over any stale bundled copy); a published package has no
// sibling dist/ and reads the data bundled into ./data by prepack.
const repoDist = join(here, '..', '..', '..', 'dist');
const DIST = process.env.PROVEN_DIST || (existsSync(join(repoDist, 'entities.json')) ? repoDist : join(here, '..', 'data'));
const rj = async (f) => JSON.parse(await readFile(join(DIST, f), 'utf8'));

let state;
async function load() {
  if (state) return state;
  const [entities, domains, blueprints, wpe, docs, cli] = await Promise.all(['entities.json', 'domains.json', 'blueprints.json', 'wpe-operations.json', 'docs.json', 'cli-commands.json'].map(rj));
  const index = [];
  const add = (type, id, name, text, extra = {}) => index.push({ type, id, name, nameLc: name.toLowerCase(), textLc: text.toLowerCase(), ...extra });
  for (const f of entities.functions) add('function', f.name, f.name, f.summary + ' ' + f.description, { summary: f.summary, url: f.url });
  for (const c of entities.classes) add('class', c.name, c.name, c.summary + ' ' + c.description, { summary: c.summary, url: c.url });
  for (const m of entities.methods) add('method', `${m.class}::${m.name}`, `${m.class}::${m.name}`, m.summary, { summary: m.summary, url: m.url });
  for (const h of entities.hooks) add('hook', h.name, h.name, h.summary + ' ' + h.description, { summary: h.summary, url: h.url });
  for (const d of docs) add(d.source === 'wpengine' ? 'ai-doc' : 'handbook', d.id, d.name, d.markdown.slice(0, 4000), { summary: d.markdown.slice(0, 160).replace(/\s+/g, ' '), url: d.url });
  for (const c of cli.commands) add('cli', c.path, c.path, c.description + ' ' + c.longdesc.slice(0, 1500), { summary: c.description, url: `https://developer.wordpress.org/cli/commands/${c.path.replace(/^wp /, '').replace(/ /g, '/')}/` });
  state = { cli, cliMap: new Map(cli.commands.map((c) => [c.path.replace(/^wp /, ''), c])), entities, domains, blueprints, wpe, docs, index, fn: new Map(entities.functions.map((x) => [x.name, x])), cls: new Map(entities.classes.map((x) => [x.name, x])), hook: new Map(entities.hooks.map((x) => [x.name, x])), op: new Map(wpe.operations.map((o) => [o.operationId, o])) };
  return state;
}

const near = (map, name) => [...map.keys()].filter((k) => k.toLowerCase().includes(name.toLowerCase())).slice(0, 8);
const notFound = (kind, name, map) => ({ error: `${kind} not found: ${name}`, didYouMean: near(map, name.replace(/\(\)$/, '')) });
const fmtParams = (r) => r.params.map((p) => ({ type: p.type, name: p.name, description: p.description }));

const handlers = {
  async list_domains() { const s = await load(); return s.domains.map(({ slug, group, title, summary }) => ({ slug, group, title, summary })); },
  async get_domain({ slug }) {
    const s = await load();
    const d = s.domains.find((x) => x.slug === slug);
    if (!d) return { error: `unknown domain ${slug}`, available: s.domains.map((x) => x.slug) };
    return { slug, title: d.title, summary: d.summary, wordpress: s.entities.wpVersion,
      functions: d.functions.map((n) => s.fn.get(n)).filter(Boolean).map((f) => ({ name: f.name, signature: f.signature, summary: f.summary, since: f.since })),
      classes: d.classes.map((n) => s.cls.get(n)).filter(Boolean).map((c) => ({ name: c.name, summary: c.summary })),
      hooks: d.hooks.map((n) => s.hook.get(n)).filter(Boolean).map((h) => ({ name: h.name, type: h.type, summary: h.summary })) };
  },
  async search_docs({ query, type, limit = 10 }) {
    const s = await load();
    const terms = query.toLowerCase().split(/[^a-z0-9_{}$>-]+/).filter(Boolean);
    const scored = [];
    for (const e of s.index) {
      if (type && e.type !== type) continue;
      let score = 0;
      for (const t of terms) {
        if (e.nameLc === t) score += 20; else if (e.nameLc.includes(t)) score += 8;
        if (e.textLc.includes(t)) score += 2;
      }
      if (terms.every((t) => e.nameLc.includes(t) || e.textLc.includes(t))) score += 5;
      if (score > 0) scored.push([score + (e.type === 'function' ? 1 : 0), e]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, Math.min(limit, 30)).map(([score, e]) => ({ type: e.type, id: e.id, summary: e.summary, url: e.url, score }));
  },
  async get_function({ name }) {
    const s = await load(); const n = name.replace(/\(\)$/, ''); const f = s.fn.get(n);
    if (!f) return notFound('function', n, s.fn);
    return { name: f.name, signature: f.signature, summary: f.summary, description: f.description, params: fmtParams(f), returns: f.tags.return?.[0], since: f.tags.since, deprecated: f.tags.deprecated, see: f.tags.see, source: `${f.file}:${f.line}`, docs: f.url, domains: f.domains, wordpress: s.entities.wpVersion };
  },
  async get_class({ name }) {
    const s = await load(); const c = s.cls.get(name);
    if (!c) return notFound('class', name, s.cls);
    return { name: c.name, kind: c.kind, summary: c.summary, description: c.description, source: `${c.file}:${c.line}`, docs: c.url, methods: s.entities.methods.filter((m) => m.class === name).map((m) => ({ name: m.name, signature: m.signature, summary: m.summary, since: m.since })) };
  },
  async get_hook({ name }) {
    const s = await load(); const h = s.hook.get(name);
    if (!h) return notFound('hook', name, s.hook);
    return { name: h.name, type: h.type, dynamic: h.dynamic, summary: h.summary, description: h.description, params: fmtParams(h), since: h.tags.since, firedIn: h.locations, docs: h.url };
  },
  async list_cli_commands({ filter } = {}) {
    const s = await load(); const f = filter?.toLowerCase();
    return s.cli.commands.filter((c) => !f || c.path.toLowerCase().includes(f) || c.description.toLowerCase().includes(f)).map((c) => ({ command: c.path, description: c.description }));
  },
  async get_cli_command({ path }) {
    const s = await load(); const k = path.replace(/^wp\s+/, '').trim(); const c = s.cliMap.get(k);
    if (!c) return notFound('WP-CLI command', k, s.cliMap);
    return { command: c.path, description: c.description, usage: `${c.path} ${c.synopsis}`.trim(), details: c.longdesc, subcommands: c.hasChildren ? s.cli.commands.filter((x) => x.path.startsWith(c.path + ' ') && x.depth === c.depth + 1).map((x) => ({ command: x.path, description: x.description })) : undefined, wpCliVersion: s.cli.version, docs: `https://developer.wordpress.org/cli/commands/${k.replace(/ /g, '/')}/` };
  },
  async list_blueprints() { const s = await load(); return s.blueprints.map(({ slug, title, summary }) => ({ slug, title, summary })); },
  async get_blueprint({ slug }) {
    const s = await load(); const b = s.blueprints.find((x) => x.slug === slug);
    return b ? { slug, title: b.title, markdown: b.md } : { error: `unknown blueprint ${slug}`, available: s.blueprints.map((x) => x.slug) };
  },
  async list_ai_operations({ filter } = {}) {
    const s = await load(); const f = filter?.toLowerCase();
    return s.wpe.operations.filter((o) => !f || [o.section, o.operationId, o.path, o.summary, ...(o.tags || [])].join(' ').toLowerCase().includes(f)).map((o) => ({ section: o.section, operationId: o.operationId, method: o.method, path: o.path, tags: o.tags, summary: o.summary }));
  },
  async get_ai_operation({ operationId }) {
    const s = await load(); const o = s.op.get(operationId);
    return o ? { baseUrl: s.wpe.servers[0], howToCall: howToCall(o, s.wpe.components), ...o, securitySchemes: Object.keys(s.wpe.components.securitySchemes || {}) } : notFound('operation', operationId, s.op);
  },
};

export async function callTool(name, args = {}) {
  const h = handlers[name];
  if (!h) throw new Error(`Unknown tool: ${name}`);
  return h(args);
}
