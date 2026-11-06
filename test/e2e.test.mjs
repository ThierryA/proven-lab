// End-to-end: boots the real server, hits pages, API, and MCP over HTTP and stdio, and crawls every internal link.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createApp } from '../server/index.mjs';
import { ROOT, walk } from './helpers.mjs';

assert.ok(existsSync(join(ROOT, 'site', 'dist', 'index.html')), 'run `npm run build` first');
let server, base;
before(async () => { server = createApp(); await new Promise((r) => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
const get = (p, init) => fetch(base + p, init);
const raw = (path) => new Promise((resolve, reject) => { http.get({ host: '127.0.0.1', port: server.address().port, path }, (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve({ status: res.statusCode, body: b })); }).on('error', reject); });

test('healthz', async () => { const r = await get('/healthz'); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true }); });

test('pages render with the right content', async () => {
  const cases = [
    ['/', 'text/html', ['Why pay agents to rebuild a battle-tested platform', 'data-hero-term', 'current industry', 'the fix: ', 'One application layer', 'data-setup="classic"', 'WP Admin', 'WordPress templating', 'Core API', 'WP-CLI', 'Deployment', 'optional']],
    ['/docs', 'text/html', ['Documentation', 'Core API', 'AI API', 'Deployment', 'WP-CLI']],
    ['/docs/api/fields', 'text/html', ['register_meta', 'Fields (Meta)']],
    ['/docs/api/abilities', 'text/html', ['wp_register_ability']],
    ['/docs/cli/post', 'text/html', ['wp post create']],
    ['/docs/ai-api/searchCollection', 'text/html', ['searchCollection', '/v1/kb/collections']],
    ['/docs/ai-api/getCredits', 'text/html', ['Cloud AI API', 'Credits']],
    ['/docs/ai-api/registerSite', 'text/html', ['Cloud AI API', 'Site connection']],
    ['/docs/custom-app', 'text/html', ['register_post_meta']],
    ['/docs/classic-wordpress', 'text/html', ['single-project.php', 'WP Admin']],
    ['/docs/architecture', 'text/html', ['data-arch', 'Application layer', 'AI API', 'Classic', 'Headless Frontend', 'Headless Admin', 'Headless Frontend + Admin', 'Data &amp;', 'sandboxed SSH session']],
    ['/docs/wpe-deployment', 'text/html', ['Headless Platform', 'optional', 'sandboxed SSH session', '.ssh.wpengine.net']],
    ['/docs/connect', 'text/html', ['@provenlab/mcp']],
    ['/docs/core-api', 'text/html', ['Core API', 'Data model', '/docs/api/content-types']],
    ['/docs/cloud-ai-api', 'text/html', ['Cloud AI API', 'https://api.ai.wpengine.com/v1', 'Rate limits', '/docs/ai-api/createChatCompletion']],
    ['/llms.txt', 'text/plain', ['# Proven Lab']],
    ['/llms-full.txt', 'text/plain', ['register_post_type']],
    ['/AGENTS.md', 'text/markdown', ['WordPress is the application layer']],
    ['/openapi/provenlab-api.yaml', 'application/yaml', ['openapi: 3.1.0', 'get_function']],
    ['/openapi/cloud-ai-api.yaml', 'application/yaml', ['AI Gateway']],
    ['/tools/openai.json', 'application/json', ['get_cli_command']],
    ['/tools/anthropic.json', 'application/json', ['input_schema']],
  ];
  for (const [path, type, needles] of cases) {
    const r = await get(path); const body = await r.text();
    assert.equal(r.status, 200, path);
    assert.ok((r.headers.get('content-type') || '').startsWith(type), `${path}: ${r.headers.get('content-type')}`);
    for (const n of needles) assert.ok(body.includes(n), `${path} missing "${n}"`);
  }
});

test('sidebar separates Core API, WP-CLI, Cloud AI API and Deployment; no Platform; non-tool groups set apart', async () => {
  const page = await (await get('/docs/api/fields')).text();
  const html = page.slice(page.indexOf('<aside'), page.indexOf('</aside>'));
  const order = ['Guides', 'Core API', 'WP-CLI', 'Cloud AI API', 'Deployment'].map((t) => html.indexOf(t));
  assert.ok(order.every((i, k) => i > -1 && (k === 0 || i > order[k - 1])), `section order ${order}`);
  assert.ok(!/>\s*Platform\s*</.test(html) && !html.includes('WP Engine AI API'));
  const ai = html.slice(html.indexOf('Cloud AI API'), html.lastIndexOf('Deployment'));
  assert.ok(ai.includes('createChatCompletion') && ai.includes('getCredits') && ai.includes('registerSite') && !/mcpStreamable/i.test(ai));
  const sep = ai.indexOf('role="separator"');
  assert.ok(sep > ai.indexOf('createSession'), 'separator comes after the tool groups');
  assert.ok(ai.indexOf('getCredits') > sep && ai.indexOf('getAnalytics') > sep && ai.indexOf('registerSite') > sep, 'site connection, credits and analytics sit below the separator');
});

test('404s, methods and path traversal', async () => {
  assert.equal((await get('/nope')).status, 404);
  assert.equal((await get('/docs/api/does-not-exist')).status, 404);
  assert.equal((await get('/', { method: 'POST' })).status, 405);
  for (const p of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/%2e%2e%2f%2e%2e%2fetc/passwd', '/docs/%00', '/%']) {
    const r = await raw(p);
    assert.ok([400, 404].includes(r.status), `${p} -> ${r.status}`);
    assert.ok(!r.body.includes('"workspaces"') && !r.body.includes('root:'), `${p} leaked a file`);
  }
});

test('REST mirror of the tools', async () => {
  const f = await (await get('/api/get_function?name=register_meta')).json();
  assert.match(f.signature, /^register_meta\(/); assert.equal(f.source, 'wp-includes/meta.php:' + f.source.split(':')[1]);
  const s = await (await get('/api/search_docs?query=register+user+meta&limit=5')).json();
  assert.ok(s.length > 0 && s.length <= 5);
  const post = await (await get('/api/search_docs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'application password', type: 'cli' }) })).json();
  assert.ok(post.every((x) => x.type === 'cli') && post.length > 0);
  const miss = await (await get('/api/get_function?name=register_postmeta')).json();
  assert.ok(miss.error && Array.isArray(miss.didYouMean));
  assert.equal((await get('/api/not_a_tool')).status, 404);
  const sites = await (await get('/api/list_ai_operations?filter=Sites')).json();
  assert.deepEqual(sites.map((o) => o.operationId).sort(), ['deleteSite', 'getSite', 'heartbeatSite', 'registerSite', 'updateSitePrimaryCollection']);
  const all = await (await get('/api/list_ai_operations')).json();
  assert.ok(all.some((o) => o.operationId === 'getCredits' && o.section === 'ai') && !all.some((o) => /mcp/i.test(o.operationId)));
  assert.ok(!(await (await get('/api/search_docs?query=mcp+server+oauth&type=ai-doc')).text()).includes('wpe:doc:ai:api:mcp'));
  assert.equal((await (await get('/api/get_ai_operation?operationId=mcpStreamableHttp')).json()).error?.startsWith('operation not found'), true);
  const cmd = await (await get('/api/get_cli_command?path=user%20application-password%20create')).json();
  assert.match(cmd.usage, /application-password create <user> <app-name>/);
});

async function exerciseMcp(client) {
  const { tools } = await client.listTools();
  assert.equal(tools.length, 12);
  const call = async (name, args) => { const r = await client.callTool({ name, arguments: args }); return { isError: r.isError, data: JSON.parse(r.content[0].text) }; };
  const domains = await call('list_domains', {});
  assert.ok(domains.data.length === 22 && domains.data.every((d) => d.group));
  const dom = await call('get_domain', { slug: 'content-types' });
  assert.ok(dom.data.functions.some((f) => f.name === 'register_post_type'));
  const fn = await call('get_function', { name: 'register_post_type()' });
  assert.match(fn.data.signature, /^register_post_type\( \$post_type/);
  const cls = await call('get_class', { name: 'WP_Query' });
  assert.ok(cls.data.methods.length > 20);
  const hook = await call('get_hook', { name: 'save_post' });
  assert.equal(hook.data.params.length, 3);
  const bp = await call('get_blueprint', { slug: 'custom-app' });
  assert.ok(bp.data.markdown.includes('register_post_meta'));
  assert.equal((await call('list_blueprints', {})).data.length, 10);
  const op = await call('get_ai_operation', { operationId: 'searchCollection' });
  assert.equal(op.data.method, 'POST'); assert.equal(op.data.path, '/v1/kb/collections/{id}/search');
  assert.ok((await call('list_cli_commands', { filter: 'cron' })).data.length >= 5);
  const bad = await call('get_function', { name: 'nope_nope' });
  assert.equal(bad.isError, true);
}

test('MCP over streamable HTTP', async () => {
  const client = new Client({ name: 'e2e', version: '1' });
  await client.connect(new StreamableHTTPClientTransport(new URL(base + '/mcp')));
  await exerciseMcp(client); await client.close();
});

test('MCP over stdio (the @provenlab/mcp bin)', async () => {
  const client = new Client({ name: 'e2e', version: '1' });
  await client.connect(new StdioClientTransport({ command: 'node', args: [join(ROOT, 'packages', 'mcp-server', 'src', 'index.mjs')] }));
  assert.equal(client.getServerVersion().name, 'provenlab');
  await exerciseMcp(client); await client.close();
});

test('every internal link and asset in the built site resolves', async () => {
  const hrefs = new Set();
  for (const f of walk(join(ROOT, 'site', 'dist'), '.html')) {
    const html = readFileSync(f, 'utf8');
    for (const m of html.matchAll(/(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)) if (m[1].startsWith('/') && !m[1].startsWith('//')) hrefs.add(m[1]);
  }
  assert.ok(hrefs.size > 110, `links found: ${hrefs.size}`);
  const bad = [];
  for (const h of hrefs) { const r = await get(h); if (r.status !== 200) bad.push(`${h} -> ${r.status}`); await r.arrayBuffer(); }
  assert.deepEqual(bad, []);
});
