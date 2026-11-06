// Turns the raw corpus into agent-ready artifacts under dist/.
import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { ROOT, CORPUS } from '../ingest/lib.mjs';
import { TOOLS } from '../../packages/mcp-server/src/tools.mjs';

const DIST = join(ROOT, 'dist');
const rj = async (p) => JSON.parse(await readFile(join(CORPUS, p), 'utf8'));
const w = async (rel, data) => { const p = join(DIST, rel); await mkdir(join(p, '..'), { recursive: true }); await writeFile(p, typeof data === 'string' ? data : JSON.stringify(data)); };

await rm(DIST, { recursive: true, force: true });
const core = await rj('wp/source/core.json');
const domains = JSON.parse(await readFile(join(ROOT, 'content/domains.json'), 'utf8'));
const wpeDocs = await rj('wpe/docs.json');
const spec = YAML.parse(await readFile(join(CORPUS, 'wpe/openapi.yaml'), 'utf8'));
const refUrl = { function: (n) => `https://developer.wordpress.org/reference/functions/${n.toLowerCase()}/`, hook: (n) => `https://developer.wordpress.org/reference/hooks/${n.replace(/[{}$>\-\[\]'"]/g, '').replace(/\s+/g, '').toLowerCase()}/`, class: (n) => `https://developer.wordpress.org/reference/classes/${n.toLowerCase()}/` };

// domain tagging
const tag = new Map();
for (const d of domains) for (const kind of ['functions', 'classes', 'hooks']) for (const n of d[kind]) { const k = `${kind}:${n}`; tag.set(k, [...(tag.get(k) || []), d.slug]); }
const dom = (kind, name) => tag.get(`${kind}:${name}`) || [];

// A hook is often fired in several places; only one carries the docblock. Keep the best, remember all locations.
function dedupeHooks(hooks) {
  const groups = new Map();
  for (const h of hooks) groups.set(h.name, [...(groups.get(h.name) || []), h]);
  return [...groups.values()].map((g) => {
    const score = (h) => (/is documented in/i.test(h.summary) ? 0 : 2) + (h.params.length ? 1 : 0) + (h.summary ? 1 : 0);
    const best = [...g].sort((a, b) => score(b) - score(a))[0];
    return { ...best, locations: g.map((h) => `${h.file}:${h.line}`) };
  });
}
const since = (r) => r.tags.since?.[0]?.split(' ')[0] || '';
const entities = {
  wpVersion: core.version,
  functions: core.functions.map((r) => ({ ...r, domains: dom('functions', r.name), since: since(r), url: refUrl.function(r.name) })),
  classes: core.classes.map((r) => ({ ...r, domains: dom('classes', r.name), since: since(r), url: refUrl.class(r.name) })),
  methods: core.methods.map((r) => ({ ...r, since: since(r), url: `https://developer.wordpress.org/reference/classes/${r.class.toLowerCase()}/${r.name.toLowerCase()}/` })),
  hooks: dedupeHooks(core.hooks).map((r) => ({ ...r, domains: dom('hooks', r.name), since: since(r), url: refUrl.hook(r.name) })),
};
await w('entities.json', entities);

// WP Engine operations
const ops = [];
for (const [path, item] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(item)) {
  if (!op?.operationId) continue;
  const hosting = (op.tags || []).some((t) => ['Sites', 'Credits'].includes(t));
  ops.push({ section: hosting ? 'hosting' : 'ai', operationId: op.operationId, method: method.toUpperCase(), path, tags: op.tags, summary: op.summary, description: op.description, parameters: op.parameters, requestBody: op.requestBody, responses: op.responses, security: op.security });
}
await w('wpe-operations.json', { servers: ['https://api.ai.wpengine.com'], version: spec.info.version, components: spec.components, operations: ops });
await w('docs.json', [...wpeDocs, ...(await Promise.all((await readdir(join(CORPUS, 'wp/handbooks'))).map((f) => rj(`wp/handbooks/${f}`)))).flat()].map((d) => ({ id: d.id, source: d.source, handbook: d.handbook, name: d.name, url: d.url, markdown: d.markdown })));

// markdown helpers
const sig = (r) => `\`\`\`php\n${r.signature}\n\`\`\``;
const paramList = (r) => r.params.length ? '\n**Parameters**\n\n' + r.params.map((p) => `- \`${p.type}\` \`${p.name}\`: ${p.description.split('\n')[0]}`).join('\n') + '\n' : '';
const ret = (r) => r.tags.return ? `\n**Returns:** ${r.tags.return[0]}\n` : '';
const fnMd = (r) => `### ${r.name}()\n\n${r.summary}\n\n${sig(r)}${paramList(r)}${ret(r)}\n*Since ${r.since || '?'} · \`${r.file}:${r.line}\`*\n`;
const hookMd = (r) => `### ${r.type} \`${r.name}\`\n\n${r.summary}\n${paramList(r)}\n*Fired in \`${r.file}:${r.line}\`*\n`;
const byName = (arr) => new Map(arr.map((r) => [r.name, r]));
const F = byName(entities.functions), H = new Map(entities.hooks.map((h) => [h.name, h])), C = byName(entities.classes);

const domainPages = [];
for (const d of domains) {
  const md = [`# ${d.title}\n\n${d.summary}\n\n*WordPress ${core.version} · generated from source, do not edit.*\n`];
  md.push('## Functions\n', ...d.functions.map((n) => F.get(n)).filter(Boolean).map(fnMd));
  md.push('## Classes\n', ...d.classes.map((n) => C.get(n)).filter(Boolean).map((c) => `### ${c.name}\n\n${c.summary}\n\n*\`${c.file}:${c.line}\`*\n`));
  md.push('## Hooks\n', ...d.hooks.map((n) => H.get(n)).filter(Boolean).map(hookMd));
  const text = md.join('\n');
  domainPages.push({ ...d, md: text });
  await w(`domains/${d.slug}.md`, text);
}
await w('domains.json', domains.map(({ slug, group, title, summary, functions, classes, hooks }) => ({ slug, group, title, summary, functions, classes, hooks })));

// blueprints
const bpDir = join(ROOT, 'content/blueprints');
const blueprints = [];
for (const f of await readdir(bpDir)) {
  const raw = await readFile(join(bpDir, f), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = fm ? YAML.parse(fm[1]) : {};
  const slug = f.replace(/\.md$/, '');
  blueprints.push({ slug, ...meta, md: raw.replace(/^---[\s\S]*?---\n/, '') });
  await w(`blueprints/${f}`, raw);
}
await w('blueprints.json', blueprints);

// WP-CLI
const cliData = await rj('wp/cli/commands.json');
const cliTop = [...new Set(cliData.commands.map((c) => c.top))];
function cliBody(long) {
  // WP-CLI longdesc is markdown-ish: "## OPTIONS", "[--x=<x>]\n: text" definition pairs, indented example blocks.
  const out = [];
  let code = [];
  const flush = () => { if (code.length) { out.push('```bash\n' + code.join('\n') + '\n```'); code = []; } };
  for (const block of long.split(/\n{2,}/)) {
    const lines = block.split('\n');
    if (lines.every((l) => /^ {4}/.test(l) || !l.trim())) { code.push(...lines.map((l) => l.slice(4))); continue; }
    flush();
    if (lines.length > 1 && /^: /.test(lines[1])) out.push(`- \`${lines[0].trim()}\`: ${lines.slice(1).join(' ').replace(/^: /, '')}`);
    else out.push(block.replace(/^## (.*)$/gm, '#### $1'));
  }
  flush();
  return out.join('\n\n').replace(/(\n- [^\n]*)\n\n(?=- )/g, '$1\n');
}
const cliMd = (c) => `${'#'.repeat(Math.min(c.depth + 1, 4))} \`${c.path}\`\n\n${c.description}\n\n${c.synopsis ? '```\n' + c.path + ' ' + c.synopsis.trim() + '\n```\n\n' : ''}${cliBody(c.longdesc)}\n`;
const cliPages = [];
for (const top of cliTop) {
  const group = cliData.commands.filter((c) => c.top === top);
  const head = group[0];
  const md = `# \`wp ${top}\`\n\n` + group.map(cliMd).join('\n');
  cliPages.push({ top, description: head.description, count: group.length, md });
  await w(`cli/${top}.md`, md);
}
await w('cli-commands.json', { version: cliData.version, commands: cliData.commands, tops: cliPages.map(({ top, description, count }) => ({ top, description, count })) });

// AGENTS.md (drop into any project, or use as a system prompt)
const agentsMd = await readFile(join(ROOT, 'content/AGENTS.md'), 'utf8');
await w('AGENTS.md', agentsMd);

// llms.txt + llms-full.txt
const site = process.env.SITE_URL || 'https://example.com';
const llms = [
  '# WP Agentic Kit', '',
  '> Docs and tools for AI agents that build applications on WordPress core APIs (post types, meta, users, hooks, blocks, Abilities, AI Client) combined with the WP Engine AI API (gateway, knowledge base, agents, MCP). Generated from WordPress ' + core.version + ' source and the live WP Engine AI API spec.', '',
  '## Start here', `- [Agent playbook](${site}/AGENTS.md): rules and workflow for agents building WordPress sites`,
  ...blueprints.map((b) => `- [${b.title}](${site}/blueprints/${b.slug}.md): ${b.summary}`), '',
  '## WordPress core API domains', ...domains.map((d) => `- [${d.group}: ${d.title}](${site}/domains/${d.slug}.md): ${d.summary}`), '',
  '## WP-CLI (`wp`): verify, scaffold and administer from the shell', ...cliPages.map((c) => `- [wp ${c.top}](${site}/cli/${c.top}.md): ${c.description}`), '',
  '## AI API and Hosting (WP Engine)', `- [OpenAPI spec](${site}/openapi/wpe-ai.yaml)`, `- [Operations index](${site}/wpe-operations.json)`, ...ops.slice(0, 0), '',
  '## Machine interfaces', `- MCP server: \`npx wp-agentic-kit-mcp\` (stdio) or ${site}/mcp (streamable HTTP)`, `- Kit API OpenAPI: ${site}/openapi/kit-api.yaml`, `- OpenAI function tools: ${site}/tools/openai.json`, `- Anthropic tools: ${site}/tools/anthropic.json`, '',
].join('\n');
await w('llms.txt', llms);
const wpeOpsMd = '## AI API and Hosting operations (WP Engine)\n\n' + ops.map((o) => `- [${o.section}] \`${o.method} ${o.path}\` **${o.operationId}**: ${o.summary || ''}`).join('\n');
await w('llms-full.txt', [llms, '\n---\n', agentsMd, ...blueprints.map((b) => `\n---\n\n# ${b.title}\n\n${b.md}`), '\n---\n', wpeOpsMd, ...domainPages.map((d) => `\n---\n\n${d.md}`), ...cliPages.map((c) => `\n---\n\n${c.md}`)].join('\n'));

// OpenAPI specs
await mkdir(join(DIST, 'openapi'), { recursive: true });
await cp(join(CORPUS, 'wpe/openapi.yaml'), join(DIST, 'openapi/wpe-ai.yaml'));
const kitApi = { openapi: '3.1.0', info: { title: 'WP Agentic Kit API', version: '0.1.0', description: 'Search and retrieve WordPress core API docs, blueprints and WP Engine AI API operations. Same capabilities as the MCP server.' }, servers: [{ url: site }], paths: {} };
for (const t of TOOLS) {
  const props = t.inputSchema.properties || {};
  kitApi.paths[`/api/${t.name}`] = { get: { operationId: t.name, summary: t.description.split('\n')[0], description: t.description,
    parameters: Object.entries(props).map(([name, s]) => ({ name, in: 'query', required: (t.inputSchema.required || []).includes(name), schema: s })),
    responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } } } } };
}
await w('openapi/kit-api.yaml', YAML.stringify(kitApi));
await w('tools/openai.json', TOOLS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } })));
await w('tools/anthropic.json', TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })));
await w('stats.json', { wordpress: core.version, functions: entities.functions.length, classes: entities.classes.length, methods: entities.methods.length, hooks: entities.hooks.length, wpeOperations: ops.length, cliCommands: cliData.commands.length, cliVersion: cliData.version, wpeDocs: wpeDocs.length, domains: domains.length, blueprints: blueprints.length, builtAt: new Date().toISOString() });
console.log('dist built', JSON.parse(await readFile(join(DIST, 'stats.json'), 'utf8')));
