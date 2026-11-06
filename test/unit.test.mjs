// Data and content integrity. Runs against the committed corpus, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, core, cliData, domains, rj } from './helpers.mjs';

test('corpus has the expected breadth', () => {
  const c = core();
  assert.ok(c.functions.length > 3500, `functions: ${c.functions.length}`);
  assert.ok(c.classes.length > 300);
  assert.ok(c.methods.length > 3500);
  assert.ok(c.hooks.length > 3000);
  assert.ok(cliData().commands.length > 400);
});

test('core extraction is accurate for key APIs', () => {
  const c = core();
  const fn = (n) => c.functions.find((f) => f.name === n);
  for (const n of ['register_post_type', 'register_taxonomy', 'register_meta', 'register_post_meta', 'register_setting', 'add_action', 'wp_insert_post', 'wp_register_ability', 'wp_ai_client_prompt', 'register_rest_route']) {
    const f = fn(n);
    assert.ok(f, `missing function ${n}`);
    assert.ok(f.signature.startsWith(`${n}(`), `${n} signature: ${f.signature}`);
    assert.ok(f.summary.length > 5, `${n} has a summary`);
    assert.ok(f.file.startsWith('wp-includes/'), `${n} source: ${f.file}`);
  }
  assert.ok(fn('register_meta').params.length >= 3, 'register_meta params parsed');
  assert.ok(fn('register_post_type').tags.since.length >= 3, 'since history kept');
  assert.ok(c.hooks.some((h) => h.name === 'save_post' && h.type === 'action'));
  assert.ok(c.hooks.some((h) => h.dynamic && h.name.includes('{$')), 'dynamic hooks keep their variable parts');
});

test('built artifacts exist; functions and hooks are deduplicated; stubs are excluded', () => {
  const e = rj('dist', 'entities.json');
  const fnames = e.functions.map((f) => f.name);
  assert.equal(new Set(fnames).size, fnames.length, 'duplicate function names in dist');
  const add = e.functions.find((f) => f.name === 'add_action');
  assert.equal(add.file, 'wp-includes/plugin.php', 'add_action must come from plugin.php, not the noop.php stub');
  assert.match(add.summary, /action hook/i);
  assert.ok(e.functions.every((f) => !f.file.endsWith('noop.php') && !f.file.includes('pclzip')));
  const names = e.hooks.map((h) => h.name);
  assert.equal(new Set(names).size, names.length, 'duplicate hook names in dist');
  const save = e.hooks.find((h) => h.name === 'save_post');
  assert.match(save.summary, /saved/i);
  assert.ok(save.locations.length >= 2);
});

test('domain map: unique slugs, valid groups, every name exists in core', () => {
  const c = core(); const ds = domains();
  const F = new Set(c.functions.map((x) => x.name)), C = new Set(c.classes.map((x) => x.name)), H = new Set(c.hooks.map((x) => x.name));
  const slugs = ds.map((d) => d.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  const groups = new Set(ds.map((d) => d.group));
  assert.ok(!groups.has('Platform'), 'Platform group must not exist');
  assert.deepEqual([...groups].sort(), ['Data access', 'Data model', 'Extension', 'Interfaces', 'Rendering', 'Services', 'Users & access']);
  const missing = ds.flatMap((d) => [...d.functions.filter((n) => !F.has(n)).map((n) => `${d.slug}: fn ${n}`), ...d.classes.filter((n) => !C.has(n)).map((n) => `${d.slug}: class ${n}`), ...d.hooks.filter((n) => !H.has(n)).map((n) => `${d.slug}: hook ${n}`)]);
  assert.deepEqual(missing, []);
  const placement = Object.fromEntries(ds.map((d) => [d.slug, d.group]));
  assert.equal(placement.media, 'Services'); assert.equal(placement['http-client'], 'Services'); assert.equal(placement['cron-cache'], 'Services');
  assert.equal(placement.abilities, 'Interfaces'); assert.equal(placement['ai-client'], 'Interfaces');
});

test('WP Engine operations: Sites are Deployment; Credits and Analytics stay in the AI API; no MCP', () => {
  const { operations } = rj('dist', 'wpe-operations.json');
  const deployment = operations.filter((o) => o.section === 'deployment').map((o) => o.operationId).sort();
  assert.deepEqual(deployment, ['deleteSite', 'getSite', 'heartbeatSite', 'registerSite', 'updateSitePrimaryCollection']);
  const ai = operations.filter((o) => o.section === 'ai');
  assert.ok(ai.length >= 30);
  assert.ok(ai.every((o) => !(o.tags || []).includes('Sites')));
  for (const id of ['createChatCompletion', 'searchCollection', 'createAgent', 'createSession', 'getCredits', 'getAnalytics']) assert.ok(ai.some((o) => o.operationId === id), id);
  assert.ok(operations.every((o) => !(o.tags || []).includes('MCP') && !/mcp/i.test(o.operationId) && !o.path.includes('/mcp')), 'WP Engine MCP endpoints must not be documented');
});

test('WP Engine MCP is removed from docs, search data and the published spec', () => {
  const docs = rj('dist', 'docs.json');
  assert.deepEqual(docs.filter((d) => /:mcp/.test(d.id)).map((d) => d.id), []);
  const yaml = readFileSync(join(ROOT, 'dist', 'openapi', 'wpe-ai.yaml'), 'utf8');
  assert.ok(!yaml.includes('/v1/mcp') && !yaml.includes('oauth-protected-resource'), 'MCP paths/metadata present');
  assert.ok(!/JSON-RPC/i.test(yaml), 'MCP JSON-RPC schemas still bundled');
  assert.ok(yaml.includes('/v1/chat/completions'));
  for (const f of ['llms.txt', 'llms-full.txt']) assert.ok(!/\/v1\/mcp|mcpStreamableHttp/.test(readFileSync(join(ROOT, 'dist', f), 'utf8')), f);
});

test('blueprints have front matter and the expected set', () => {
  const bps = rj('dist', 'blueprints.json');
  assert.deepEqual(bps.map((b) => b.slug).sort(), ['architecture', 'classic-wordpress', 'custom-app', 'wp-cli-for-agents', 'wpe-ai-experiences', 'wpe-deployment']);
  for (const b of bps) { assert.ok(b.title && b.summary && b.md.length > 500, b.slug); }
});

test('llms.txt covers every section', () => {
  const t = readFileSync(join(ROOT, 'dist', 'llms.txt'), 'utf8');
  for (const s of ['# Proven', 'WordPress core API domains', 'WP-CLI', 'AI API and Deployment', 'Machine interfaces', '@proven/mcp']) assert.ok(t.includes(s), s);
});

test('tool definitions are consistent across formats', () => {
  const oa = rj('dist', 'tools', 'openai.json'), an = rj('dist', 'tools', 'anthropic.json');
  assert.equal(oa.length, 12); assert.equal(an.length, 12);
  assert.deepEqual(oa.map((t) => t.function.name), an.map((t) => t.name));
  for (const t of oa) assert.equal(t.function.parameters.type, 'object');
});
