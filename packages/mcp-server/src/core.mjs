import { readFile } from 'node:fs/promises';
import { howToCall, describeOperation } from './ai-call.mjs';
import { buildSearch, mentionCounts, suggest } from './search.mjs';
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
  const templates = existsSync(join(DIST, 'templates.json')) ? await rj('templates.json') : [];
  const runbook = existsSync(join(DIST, 'AGENTS.md')) ? await readFile(join(DIST, 'AGENTS.md'), 'utf8') : '';
  const commands = existsSync(join(DIST, 'commands.json')) ? await rj('commands.json') : [];
  const index = [];
  const add = (type, id, name, text, extra = {}) => index.push({ type, id, name, nameLc: name.toLowerCase(), textLc: text.toLowerCase(), ...extra });
  for (const f of entities.functions) add('function', f.name, f.name, f.summary + ' ' + f.description, { summary: f.summary, url: f.url });
  for (const c of entities.classes) add('class', c.name, c.name, c.summary + ' ' + c.description, { summary: c.summary, url: c.url });
  for (const m of entities.methods) add('method', `${m.class}::${m.name}`, `${m.class}::${m.name}`, m.summary, { summary: m.summary, url: m.url });
  for (const h of entities.hooks) add('hook', h.name, h.name, h.summary + ' ' + h.description, { summary: h.summary, url: h.url });
  for (const d of docs) add(d.source === 'wpengine' ? 'ai-doc' : 'handbook', d.id, d.name, d.markdown.slice(0, 4000), { summary: d.markdown.slice(0, 160).replace(/\s+/g, ' '), url: d.url });
  for (const c of cli.commands) add('cli', c.path, c.path, c.description + ' ' + c.longdesc.slice(0, 1500), { summary: c.description, url: `https://developer.wordpress.org/cli/commands/${c.path.replace(/^wp /, '').replace(/ /g, '/')}/` });
  // Dynamic hook patterns such as save_post_{$post->post_type}, for get_hook.
  const dynamicHooks = entities.hooks.filter((h) => h.dynamic).map((h) => ({ hook: h, literal: h.name.replace(/\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_>\-\[\]'"]*/g, '').length, re: new RegExp('^' + h.name.split(/(\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_>\-\[\]'"]*)/).map((part, k) => (k % 2 ? '[A-Za-z0-9_\\-]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('') + '$') }));
  dynamicHooks.sort((a, b) => b.literal - a.literal);
  // Ranked search (see search.mjs).
  const isDep = (x) => Boolean(x.tags?.deprecated);
  const isPriv = (x) => (x.tags?.access || []).some((a) => /private/.test(a));
  const entries = [
    ...entities.functions.map((f) => ({ type: 'function', id: f.name, name: f.name, summary: f.summary, text: f.description, url: f.url, deprecated: isDep(f), private: isPriv(f) })),
    ...entities.classes.map((c) => ({ type: 'class', id: c.name, name: c.name, summary: c.summary, text: c.description, url: c.url, deprecated: isDep(c), private: isPriv(c) })),
    ...entities.methods.map((m) => ({ type: 'method', id: `${m.class}::${m.name}`, name: `${m.class} ${m.name}`, summary: m.summary, text: '', url: m.url, deprecated: isDep(m), private: isPriv(m) })),
    ...entities.hooks.map((h) => ({ type: 'hook', id: h.name, name: h.name, summary: h.summary, text: h.description, url: h.url, deprecated: isDep(h) })),
    ...docs.map((d) => ({ type: d.source !== 'wpengine' ? 'handbook' : /smart-search/.test(d.id) ? 'smart-search-doc' : 'ai-doc', id: d.id, name: d.name, summary: d.markdown.slice(0, 300), text: d.markdown.slice(0, 3000), url: d.url })),
    ...blueprints.map((b) => ({ type: 'guide', id: b.slug, name: `${b.title} ${b.nav || ''}`, summary: b.summary, text: b.md.slice(0, 4000), url: `https://proven-lab.com/docs/${b.slug}` })),
    ...cli.commands.map((c) => ({ type: 'cli', id: c.path, name: c.path, summary: c.description, text: c.longdesc.slice(0, 1200), url: `https://developer.wordpress.org/cli/commands/${c.path.replace(/^wp /, '').replace(/ /g, '/')}/` })),
  ];
  const counts = mentionCounts([...docs.map((d) => d.markdown), ...entities.functions.map((f) => f.description), ...entities.hooks.map((h) => h.description)], entries.filter((e) => e.type !== 'handbook' && e.type !== 'ai-doc').map((e) => e.id));
  const search = buildSearch(entries, counts);
  state = { dynamicHooks, templates, runbook, commands, search, cli, cliMap: new Map(cli.commands.map((c) => [c.path.replace(/^wp /, ''), c])), entities, domains, blueprints, wpe, docs, index, fn: new Map(entities.functions.map((x) => [x.name, x])), cls: new Map(entities.classes.map((x) => [x.name, x])), hook: new Map(entities.hooks.map((x) => [x.name, x])), op: new Map(wpe.operations.map((o) => [o.operationId, o])) };
  return state;
}

const near = (map, name) => { const sub = [...map.keys()].filter((k) => k.toLowerCase().includes(name.toLowerCase())).slice(0, 5); return [...new Set([...sub, ...suggest(name, map.keys(), 5)])].slice(0, 8); };
const notFound = (kind, name, map) => ({ error: `${kind} not found: ${name}`, didYouMean: near(map, name.replace(/\(\)$/, '')) });
const fmtParams = (r) => r.params.map((p) => ({ type: p.type, name: p.name, description: p.description }));

const handlers = {
  async get_command({ name } = {}) {
    const s = await load();
    const list = s.commands.filter((c) => c.name !== 'setup-project').map(({ name: n, description }) => ({ name: n, description }));
    if (!name) return { commands: list, usage: 'When the user asks for one of these in plain words, call get_command with its name and follow the steps.' };
    const c = s.commands.find((x) => x.name === String(name).replace(/^\/?(provenlab:)?/, ''));
    return c ? { name: c.name, description: c.description, markdown: c.body } : { error: `unknown command ${name}`, commands: list };
  },
  async get_template({ name, slug, title } = {}) {
    const s = await load();
    const list = s.templates.map(({ name: n, description }) => ({ name: n, description }));
    if (!name) return { templates: list, usage: 'Call get_template with a name and, for plugin and theme templates, a slug.' };
    const t = s.templates.find((x) => x.name === name);
    if (!t) return { error: `unknown template ${name}`, templates: list };
    const needsSlug = Object.keys(t.placeholders || {}).includes('slug');
    const cleanSlug = String(slug || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (needsSlug && !cleanSlug) return { error: `template ${name} needs a slug, e.g. "book-club"`, placeholders: t.placeholders };
    const words = cleanSlug.split('-').filter(Boolean);
    const vars = { slug: cleanSlug, prefix: words.join('_'), namespace: words.map((w) => w[0].toUpperCase() + w.slice(1)).join(''), name: title || words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') };
    const fill = (str) => str.replace(/\{\{(slug|prefix|namespace|name)\}\}/g, (_, k) => vars[k]);
    const base = name === 'plugin' ? `wp-content/plugins/${cleanSlug}/` : name === 'block-theme-child' ? `wp-content/themes/${cleanSlug}/` : '';
    return { name, description: t.description, variables: needsSlug ? vars : undefined, files: t.files.map((f) => ({ path: base + fill(f.path.replace(/__slug__/g, '{{slug}}')), content: fill(f.content) })), next: (t.next || []).map(fill) };
  },
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
    if (!query || typeof query !== 'string') return { error: 'Pass a search query, e.g. "register custom post type".' };
    const s = await load();
    return s.search(query, { type, limit: Number(limit) || 10 });
  },
  async get_function({ name }) {
    const s = await load(); const n = String(name || '').replace(/\(\)$/, '').replace(/^\\/, '');
    if (n.includes('::') || n.includes('->')) { const [cls, meth] = n.split(/::|->/); const m = s.entities.methods.find((x) => x.class === cls && x.name.toLowerCase() === meth.toLowerCase()); if (m) return { name: `${m.class}::${m.name}`, kind: 'method', signature: m.signature, summary: m.summary, description: m.description, params: fmtParams(m), returns: m.tags?.return?.[0], since: m.tags?.since, deprecated: m.tags?.deprecated, source: `${m.file}:${m.line}`, docs: m.url }; return s.cls.has(cls) ? { error: `method not found: ${n}`, hint: `Call get_class with "${cls}" for its methods.` } : notFound('class', cls, s.cls); }
    const f = s.fn.get(n);
    if (!f) return notFound('function', n, s.fn);
    return { name: f.name, signature: f.signature, summary: f.summary, description: f.description, params: fmtParams(f), returns: f.tags.return?.[0], since: f.tags.since, deprecated: f.tags.deprecated, see: f.tags.see, source: `${f.file}:${f.line}`, docs: f.url, domains: f.domains, wordpress: s.entities.wpVersion };
  },
  async get_class({ name }) {
    const s = await load(); const c = s.cls.get(name);
    if (!c) return notFound('class', name, s.cls);
    return { name: c.name, kind: c.kind, summary: c.summary, description: c.description, source: `${c.file}:${c.line}`, docs: c.url, methods: s.entities.methods.filter((m) => m.class === name).map((m) => ({ name: m.name, signature: m.signature, summary: m.summary, since: m.since })) };
  },
  async get_hook({ name }) {
    const s = await load(); let h = s.hook.get(name); let matchedPattern;
    if (!h) { const d = s.dynamicHooks.find((x) => x.literal >= 4 && x.re.test(name)); if (d) { h = d.hook; matchedPattern = d.hook.name; } }
    if (!h) return notFound('hook', name, s.hook);
    return { name: h.name, ...(matchedPattern ? { matched: `'${name}' is an instance of the dynamic hook ${matchedPattern}` } : {}), type: h.type, dynamic: h.dynamic, summary: h.summary, description: h.description, params: fmtParams(h), since: h.tags.since, firedIn: h.locations, docs: h.url };
  },
  async list_cli_commands({ filter } = {}) {
    const s = await load(); const f = filter?.toLowerCase();
    if (!f) return { note: 'Top-level commands only; pass a filter (e.g. "post", "user", "rewrite") to list subcommands.', commands: s.cli.commands.filter((c) => c.depth === 1).map((c) => ({ command: c.path, description: c.description })) };
    return s.cli.commands.filter((c) => c.path.toLowerCase().includes(f) || c.description.toLowerCase().includes(f)).slice(0, 80).map((c) => ({ command: c.path, description: c.description }));
  },
  async get_cli_command({ path }) {
    const s = await load(); const k = path.replace(/^wp\s+/, '').trim(); const c = s.cliMap.get(k);
    if (!c) return notFound('WP-CLI command', k, s.cliMap);
    return { command: c.path, description: c.description, usage: `${c.path} ${c.synopsis}`.trim(), details: c.longdesc, subcommands: c.hasChildren ? s.cli.commands.filter((x) => x.path.startsWith(c.path + ' ') && x.depth === c.depth + 1).map((x) => ({ command: x.path, description: x.description })) : undefined, wpCliVersion: s.cli.version, docs: `https://developer.wordpress.org/cli/commands/${k.replace(/ /g, '/')}/` };
  },
  async list_blueprints() { const s = await load(); return [{ slug: 'runbook', title: 'Runbook for agents (read first)', summary: 'The six steps from the first question to production, and the hard rules. Every other guide is one step of it.' }, ...s.blueprints.map(({ slug, title, summary }) => ({ slug, title, summary }))]; },
  async get_blueprint({ slug }) {
    const s = await load();
    if (slug === 'runbook' && s.runbook) return { slug, title: 'Runbook for agents', markdown: s.runbook };
    const b = s.blueprints.find((x) => x.slug === slug);
    return b ? { slug, title: b.title, markdown: b.md } : { error: `unknown blueprint ${slug}`, available: s.blueprints.map((x) => x.slug) };
  },
  async list_ai_operations({ filter } = {}) {
    const s = await load(); const f = filter?.toLowerCase();
    return s.wpe.operations.filter((o) => !f || [o.section, o.operationId, o.path, o.summary, ...(o.tags || [])].join(' ').toLowerCase().includes(f)).map((o) => ({ section: o.section, operationId: o.operationId, method: o.method, path: o.path, tags: o.tags, summary: o.summary }));
  },
  async get_ai_operation({ operationId }) {
    const s = await load(); const o = s.op.get(operationId);
    if (!o) return notFound('operation', operationId, s.op);
    const d = describeOperation(o, s.wpe.components);
    return { operationId: o.operationId, method: o.method, url: `${s.wpe.servers[0]}${o.path}`, summary: o.summary, description: o.description, howToCall: howToCall(o, s.wpe.components), parameters: d.params.length ? d.params : undefined, request: d.fields.length ? { contentType: d.contentType, fields: d.fields } : undefined, responses: d.responses };
  },
};

/** The slash commands (Claude Code plugin commands), also served as MCP prompts. */
export async function getCommands() { return (await load()).commands; }

export async function callTool(name, args = {}) {
  const h = handlers[name];
  if (!h) throw new Error(`Unknown tool: ${name}`);
  return h(args);
}
