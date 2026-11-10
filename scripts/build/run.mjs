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
// Public base URL: SITE_URL, else package.json homepage. Used for links in llms.txt, OpenAPI and the kit.
const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
// One version for everything Proven Lab ships (root package.json); the build stamps it into the plugin, the MCP
// package and server, the kit, the skill, the templates, the runbook, the OpenAPI spec and llms.txt.
const VERSION = pkg.version;
{
  const mp = join(ROOT, 'packages/mcp-server/package.json');
  const m = JSON.parse(await readFile(mp, 'utf8'));
  if (m.version !== VERSION) { m.version = VERSION; await writeFile(mp, JSON.stringify(m, null, 2) + '\n'); }
}
const site = (process.env.SITE_URL || pkg.homepage || '').replace(/\/$/, '');

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
  // Skip names that are only a variable (do_action( $hook_name ) inside plugin.php, WP_Hook, admin page hooks): not documentable hooks.
  for (const h of hooks) if (!/^\$[\w\[\]'"\->]+$/.test(h.name)) groups.set(h.name, [...(groups.get(h.name) || []), h]);
  return [...groups.values()].map((g) => {
    const score = (h) => (/is documented in/i.test(h.summary) ? 0 : 2) + (h.params.length ? 1 : 0) + (h.summary ? 1 : 0);
    const best = [...g].sort((a, b) => score(b) - score(a))[0];
    return { ...best, locations: g.map((h) => `${h.file}:${h.line}`) };
  });
}
function uniqueByName(rows) {
  const m = new Map();
  for (const r of rows) { const prev = m.get(r.name); if (!prev || (!prev.summary && r.summary)) m.set(r.name, r); }
  return [...m.values()];
}
const since = (r) => r.tags.since?.[0]?.split(' ')[0] || '';
const entities = {
  wpVersion: core.version,
  functions: uniqueByName(core.functions).map((r) => ({ ...r, domains: dom('functions', r.name), since: since(r), url: refUrl.function(r.name) })),
  classes: core.classes.map((r) => ({ ...r, domains: dom('classes', r.name), since: since(r), url: refUrl.class(r.name) })),
  methods: core.methods.map((r) => ({ ...r, since: since(r), url: `https://developer.wordpress.org/reference/classes/${r.class.toLowerCase()}/${r.name.toLowerCase()}/` })),
  hooks: dedupeHooks(core.hooks).map((r) => ({ ...r, domains: dom('hooks', r.name), since: since(r), url: refUrl.hook(r.name) })),
};
await w('entities.json', entities);

// WP Engine operations
const ops = [];
for (const [path, item] of Object.entries(spec.paths)) for (const [method, op] of Object.entries(item)) {
  if (!op?.operationId) continue;
  if ((op.tags || []).includes('MCP')) continue; // WP Engine's MCP endpoints are intentionally not documented for now
  ops.push({ section: 'ai', operationId: op.operationId, method: method.toUpperCase(), path, tags: op.tags, summary: op.summary, description: op.description, parameters: op.parameters, requestBody: op.requestBody, responses: op.responses, security: op.security });
}
await w('wpe-operations.json', { servers: ['https://api.ai.wpengine.com'], version: spec.info.version, components: spec.components, operations: ops });
await w('docs.json', [...wpeDocs.filter((d) => !/:mcp/.test(d.id)), ...(await Promise.all((await readdir(join(CORPUS, 'wp/handbooks'))).map((f) => rj(`wp/handbooks/${f}`)))).flat()].map((d) => ({ id: d.id, source: d.source, handbook: d.handbook, name: d.name, url: d.url, markdown: d.markdown })));

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
// Site-only markers (the site swaps the text diagram for the visual one); agents get plain markdown.
const stripMarkers = (md) => md.replace(/^<!-- diagram:(start|end) -->\n/gm, '');
const bpDir = join(ROOT, 'content/blueprints');
const blueprints = [];
for (const f of await readdir(bpDir)) {
  const raw = await readFile(join(bpDir, f), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = fm ? YAML.parse(fm[1]) : {};
  const slug = f.replace(/\.md$/, '');
  blueprints.push({ slug, ...meta, md: raw.replace(/^---[\s\S]*?---\n/, '') });
  await w(`blueprints/${f}`, stripMarkers(raw));
}
// Runbook order (AGENTS.md, steps 1 to 6): list_blueprints, llms.txt and the docs show guides in the order agents use them.
const RUNBOOK_ORDER = ['architecture', 'existing-project', 'local-development', 'wpengine-cloud', 'git-workflow', 'classic-wordpress', 'custom-app', 'frontend-design', 'wpe-ai-plugins', 'ai-features', 'wp-cli-for-agents', 'best-practices', 'wpe-deployment'];
const rank = (s) => (RUNBOOK_ORDER.indexOf(s) + 1 || 99);
blueprints.sort((a, b) => rank(a.slug) - rank(b.slug));
await w('blueprints.json', blueprints);

// overviews (one per reference section)
const ovDir = join(ROOT, 'content/overviews');
const overviews = [];
for (const f of await readdir(ovDir)) {
  const raw = await readFile(join(ovDir, f), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  overviews.push({ slug: f.replace(/\.md$/, ''), ...(fm ? YAML.parse(fm[1]) : {}), md: raw.replace(/^---[\s\S]*?---\n/, '') });
  await w(`overviews/${f}`, raw);
}
await w('overviews.json', overviews);

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

// Templates: verified starter files served by get_template and shipped in the skill.
const tplRoot = join(ROOT, 'content/templates');
const walkFiles = async (dir, base = dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map(async (e) => {
  const p = join(dir, e.name);
  return e.isDirectory() ? walkFiles(p, base) : [p.slice(base.length + 1)];
}))).flat();
const templates = [];
for (const name of (await readdir(tplRoot)).sort()) {
  const dir = join(tplRoot, name);
  const meta = JSON.parse(await readFile(join(dir, 'template.json'), 'utf8'));
  const files = [];
  for (const rel of (await walkFiles(dir)).filter((f) => f !== 'template.json').sort()) files.push({ path: rel, content: await readFile(join(dir, rel), 'utf8') });
  templates.push({ name, version: VERSION, ...meta, files });
}
await w('templates.json', templates);

// Slash commands: the Claude Code plugin's commands, also served as MCP prompts (one source).
{
  const cmds = [];
  for (const f of (await readdir(join(ROOT, 'content/plugin-commands'))).sort()) {
    const raw = await readFile(join(ROOT, 'content/plugin-commands', f), 'utf8');
    const fm = YAML.parse(raw.match(/^---\n([\s\S]*?)\n---\n/)?.[1] || '') || {};
    cmds.push({ name: f.replace(/\.md$/, ''), description: fm.description || '', argumentHint: fm['argument-hint'] || null, body: raw.replace(/^---[\s\S]*?---\n/, '').trim().replaceAll('{{BASE}}', site).replaceAll('{{MCP_URL}}', `${site}/mcp`) });
  }
  await w('commands.json', cmds);
  // Plain pages, so agents that only have the URL can follow a command when the user asks for it in words.
  for (const c of cmds) await w(`commands/${c.name}.md`, `# /provenlab:${c.name}\n\n${c.description}.\n\nWhen the user asks for this in plain words (or types the command), follow these steps. Where it says $ARGUMENTS, use what the user asked for.\n\n${c.body}\n`);
}

// URLs filled into the kit and the playbook
const mcpUrl = `${site}/mcp`;
const fill = (text) => text.replaceAll('{{BASE}}', site).replaceAll('{{MCP_URL}}', mcpUrl).replaceAll('{{VERSION}}', VERSION);

// AGENTS.md (drop into any project, or use as a system prompt)
const agentsMd = fill(await readFile(join(ROOT, 'content/AGENTS.md'), 'utf8'));
await w('AGENTS.md', agentsMd);

// Project kit: files an agent or a person drops into a project, plus SETUP.md and install.sh
const kitDir = join(ROOT, 'content/kit');
// The skill (Agent Skills format): SKILL.md, references/ (the runbook and every guide, read when a step needs it)
// and templates/ (verified starter files). Same files in the project kit and the Claude Code plugin.
const skillFiles = new Map();
skillFiles.set('SKILL.md', fill(await readFile(join(kitDir, '.claude/skills/provenlab/SKILL.md'), 'utf8')));
skillFiles.set('references/runbook.md', agentsMd);
for (const b of blueprints) skillFiles.set(`references/${b.slug}.md`, `# ${b.title}\n` + fill(stripMarkers(b.md)).replace(/^\s*# .*\n/, ''));
for (const t of templates) { skillFiles.set(`templates/${t.name}/template.json`, JSON.stringify({ version: VERSION, description: t.description, placeholders: t.placeholders, next: t.next }, null, 2) + '\n'); for (const f of t.files) skillFiles.set(`templates/${t.name}/${f.path}`, f.content); }
const skillPaths = [...skillFiles.keys()].map((k) => `.claude/skills/provenlab/${k}`);
const kitFiles = ['AGENTS.md', 'CLAUDE.md', '.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json', ...skillPaths];
for (const f of kitFiles) await w(`kit/${f}`, f === 'AGENTS.md' ? agentsMd : f.startsWith('.claude/skills/provenlab/') ? skillFiles.get(f.slice('.claude/skills/provenlab/'.length)) : fill(await readFile(join(kitDir, f), 'utf8')));
await w('kit/manifest.json', { version: VERSION, base: site, mcp: mcpUrl, files: kitFiles.map((path) => ({ path, url: `${site}/kit/${path}` })) });
await w('kit/SETUP.md', fill(await readFile(join(ROOT, 'content/kit-setup.md'), 'utf8')));
await w('install.sh', fill(await readFile(join(ROOT, 'scripts/kit/install.sh'), 'utf8')).replace('__FILES__', kitFiles.join(' ')));

// Claude Code plugin + marketplace, committed in the repo (generated so URLs and the skill match the kit)
{
  const P = (...p) => join(ROOT, ...p);
  const put = async (path, data) => { await mkdir(join(path, '..'), { recursive: true }); await writeFile(path, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n'); };
  const desc = 'Build on WordPress as the application layer with exact Core API, WP-CLI and Cloud AI API references, blueprints and a playbook for coding agents.';
  await put(P('.claude-plugin/marketplace.json'), { name: 'provenlab', description: 'Proven Lab plugins for Claude Code', owner: { name: 'Proven Lab' }, plugins: [{ name: 'provenlab', source: './plugins/provenlab', description: desc, version: VERSION }] });
  await put(P('plugins/provenlab/.claude-plugin/plugin.json'), { name: 'provenlab', description: desc, version: VERSION, author: { name: 'Proven Lab' }, homepage: site });
  await put(P('plugins/provenlab/.mcp.json'), fill(await readFile(join(kitDir, '.mcp.json'), 'utf8')));
  await rm(P('plugins/provenlab/skills/provenlab'), { recursive: true, force: true });
  for (const [k, v] of skillFiles) await put(P('plugins/provenlab/skills/provenlab', k), v);
  await rm(P('plugins/provenlab/commands'), { recursive: true, force: true });
  for (const f of await readdir(P('content/plugin-commands'))) await put(P('plugins/provenlab/commands', f), fill(await readFile(P('content/plugin-commands', f), 'utf8')));
}

// llms.txt + llms-full.txt
const llms = [
  '# Proven Lab', '', `Version ${VERSION}.`, '',
  '> Docs, an MCP server and tool schemas that let coding agents build on the WordPress Core API (post types, meta, users, hooks, blocks, Abilities API, AI Client), WP-CLI and the Cloud AI API (chat, images, text to speech, transcription, knowledge base search, agents and sessions). Generated from WordPress ' + core.version + ' source, WP-CLI ' + cliData.version + ' and a snapshot of the Cloud AI API OpenAPI spec.', '',
  `Agents: nothing to install. If a user asked you to build or update an app "with Proven Lab", read ${site}/AGENTS.md first, then call any tool over HTTP: GET ${site}/api/<tool>?<args> (for example ${site}/api/get_blueprint?slug=architecture). Connecting the MCP server at ${site}/mcp is optional.`, '',
  '## Start here', `- [Runbook for agents](${site}/AGENTS.md): read first. Six steps from the first question to production, for developers and non-developers`, `- [Set up a project](${site}/kit/SETUP.md): optional. Connect the MCP server and add the kit files`,
  '', '## Guides, in runbook order', ...blueprints.map((b) => `- [${b.title}](${site}/blueprints/${b.slug}.md): ${b.summary}`), '',
  '## Overviews', ...overviews.map((o) => `- [${o.title}](${site}/overviews/${o.slug}.md): ${o.summary}`), '',
  '## Commands (follow one when the user asks for it in plain words)', ...['start', 'plan', 'git-connect', 'check', 'explain', 'ship'].map((n) => `- [${n}](${site}/commands/${n}.md)`), '',
  '## Core API domains', ...domains.map((d) => `- [${d.group}: ${d.title}](${site}/domains/${d.slug}.md): ${d.summary}`), '',
  '## WP-CLI (`wp`): verify, scaffold and administer from the shell', ...cliPages.map((c) => `- [wp ${c.top}](${site}/cli/${c.top}.md): ${c.description}`), '',
  '## Cloud AI API', `- [OpenAPI spec](${site}/openapi/cloud-ai-api.yaml)`, `- [Operations index, incl. the Sites API](${site}/wpe-operations.json)`, '',
  '## Machine interfaces', `- MCP server: ${site}/mcp (streamable HTTP), or stdio via packages/mcp-server/src/index.mjs`, `- Proven Lab API (OpenAPI): ${site}/openapi/provenlab-api.yaml`, `- OpenAI function tools: ${site}/tools/openai.json`, `- Anthropic tools: ${site}/tools/anthropic.json`, '',
].join('\n');
await w('llms.txt', llms);
const wpeOpsMd = '## Cloud AI API operations\n\n' + ops.map((o) => `- [${o.section}] \`${o.method} ${o.path}\` **${o.operationId}**: ${o.summary || ''}`).join('\n');
await w('llms-full.txt', [llms, '\n---\n', agentsMd, ...overviews.map((o) => `\n---\n\n# ${o.title}\n\n${o.md.replace(/^\s*# .*\n/, '')}`), ...blueprints.map((b) => `\n---\n\n# ${b.title}\n\n${stripMarkers(b.md).replace(/^\s*# .*\n/, '')}`), '\n---\n', wpeOpsMd, ...domainPages.map((d) => `\n---\n\n${d.md}`), ...cliPages.map((c) => `\n---\n\n${c.md}`)].join('\n'));

// OpenAPI specs
await mkdir(join(DIST, 'openapi'), { recursive: true });
{
  // Published spec: the upstream spec minus the MCP endpoints.
  const pub = structuredClone(spec);
  for (const [path, item] of Object.entries(pub.paths)) if (Object.values(item).some((op) => op?.tags?.includes('MCP'))) delete pub.paths[path];
  // Drop component schemas that are no longer reachable (the MCP/JSON-RPC ones).
  const refs = new Set(); const seen = new Set();
  const visit = (node) => { if (!node || typeof node !== 'object') return; for (const [k, v] of Object.entries(node)) { if (k === '$ref' && typeof v === 'string') { const m = v.match(/^#\/components\/(\w+)\/(.+)$/); if (m && !seen.has(v)) { seen.add(v); refs.add(v); visit(pub.components?.[m[1]]?.[m[2]]); } } else visit(v); } };
  visit(pub.paths);
  for (const kind of ['schemas', 'parameters', 'responses', 'requestBodies']) for (const name of Object.keys(pub.components?.[kind] || {})) if (!refs.has(`#/components/${kind}/${name}`)) delete pub.components[kind][name];
  await writeFile(join(DIST, 'openapi/cloud-ai-api.yaml'), YAML.stringify(pub));
}
const kitApi = { openapi: '3.1.0', info: { title: 'Proven Lab API', version: VERSION, description: 'Search and retrieve WordPress Core API docs, WP-CLI commands, blueprints and Cloud AI API operations. The same 12 tools as the MCP server.' }, servers: [{ url: site || '/' }], paths: {} };
for (const t of TOOLS) {
  const props = t.inputSchema.properties || {};
  kitApi.paths[`/api/${t.name}`] = { get: { operationId: t.name, summary: t.description.split('\n')[0], description: t.description,
    parameters: Object.entries(props).map(([name, s]) => ({ name, in: 'query', required: (t.inputSchema.required || []).includes(name), schema: s })),
    responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } } } } };
}
await w('openapi/provenlab-api.yaml', YAML.stringify(kitApi));
await w('tools/openai.json', TOOLS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.inputSchema } })));
await w('tools/anthropic.json', TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })));
const isPublic = (f) => !(f.tags.access || []).includes('private') && !f.tags.deprecated;

await w('CHANGELOG.md', await readFile(join(ROOT, 'CHANGELOG.md'), 'utf8'));
await w('stats.json', { provenlab: VERSION, wordpress: core.version, functions: entities.functions.length, functionsPublic: entities.functions.filter(isPublic).length, cliLeafCommands: cliData.commands.filter((c) => !c.hasChildren).length, classes: entities.classes.length, methods: entities.methods.length, hooks: entities.hooks.length, wpeOperations: ops.length, wpeVersion: spec.info.version, cliCommands: cliData.commands.length, cliVersion: cliData.version, wpeDocs: wpeDocs.length, domains: domains.length, blueprints: blueprints.length, builtAt: new Date().toISOString() });
console.log('dist built', JSON.parse(await readFile(join(DIST, 'stats.json'), 'utf8')));
