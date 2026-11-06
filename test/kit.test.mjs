// The project kit, installer, init command and Claude Code plugin.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
// Async exec: the test server runs in this process, so a synchronous child would block it.
const run = (sh, cwd) => promisify(execFile)('sh', ['-c', sh], { cwd, env: { ...process.env, PROVENLAB_URL: base } }).then((r) => r.stdout);
import { createApp } from '../server/index.mjs';
import { init } from '../packages/mcp-server/src/init.mjs';
import { ROOT, rj } from './helpers.mjs';

const KIT = ['AGENTS.md', 'CLAUDE.md', '.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json', '.claude/skills/provenlab/SKILL.md'];
const home = rj('package.json').homepage;
let server, base;
before(async () => { server = createApp(); await new Promise((r) => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
const tmp = () => mkdtempSync(join(tmpdir(), 'provenlab-kit-'));

test('kit files, manifest, setup guide and installer are served with real URLs', async () => {
  const manifest = await (await fetch(`${base}/kit/manifest.json`)).json();
  assert.deepEqual(manifest.files.map((f) => f.path), KIT);
  assert.equal(manifest.mcp, `${home}/mcp`);
  for (const f of KIT) {
    const r = await fetch(`${base}/kit/${f}`); const body = await r.text();
    assert.equal(r.status, 200, f);
    assert.ok(!body.includes('{{'), `${f} has unfilled placeholders`);
  }
  assert.equal(JSON.parse(await (await fetch(`${base}/kit/.mcp.json`)).text()).mcpServers.provenlab.url, `${home}/mcp`);
  assert.equal(JSON.parse(await (await fetch(`${base}/kit/.vscode/mcp.json`)).text()).servers.provenlab.type, 'http');
  const setup = await (await fetch(`${base}/kit/SETUP.md`)).text();
  assert.ok(setup.includes(`claude mcp add --transport http provenlab ${home}/mcp`));
  const sh = await fetch(`${base}/install.sh`);
  assert.ok((sh.headers.get('content-type') || '').startsWith('text/plain'));
  assert.ok((await sh.text()).startsWith('#!/bin/sh'));
  const connect = await (await fetch(`${base}/docs/connect`)).text();
  assert.ok(connect.includes(`${home}/mcp`) && connect.includes('install.sh') && connect.includes('--marketplace ThierryA/proven'));
  assert.ok(!connect.includes('your-provenlab-host'));
});

test('install.sh adds the kit to an empty project and respects existing files', async () => {
  const sh = await (await fetch(`${base}/install.sh`)).text();
  const dir = tmp();
  await run(sh, dir);
  for (const f of KIT) assert.ok(existsSync(join(dir, f)), `missing ${f}`);
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8').trim(), '@AGENTS.md');

  const dir2 = tmp();
  writeFileSync(join(dir2, 'CLAUDE.md'), '# My project rules\n');
  writeFileSync(join(dir2, '.mcp.json'), '{"mcpServers":{"other":{"type":"http","url":"https://x.test/mcp"}}}');
  const out = await run(sh, dir2);
  assert.ok(readFileSync(join(dir2, 'CLAUDE.md'), 'utf8').startsWith('# My project rules') && readFileSync(join(dir2, 'CLAUDE.md'), 'utf8').includes('@AGENTS.md'));
  assert.ok(JSON.parse(readFileSync(join(dir2, '.mcp.json'), 'utf8')).mcpServers.other, 'existing .mcp.json untouched');
  assert.match(out, /kept your existing: .mcp.json/);
});

test('init merges MCP configs and CLAUDE.md without losing the project\'s content', async () => {
  const dir = tmp();
  mkdirSync(join(dir, '.vscode'));
  writeFileSync(join(dir, '.vscode/mcp.json'), '{"servers":{"other":{"type":"stdio","command":"x"}}}');
  writeFileSync(join(dir, 'CLAUDE.md'), '# Rules\n');
  writeFileSync(join(dir, 'AGENTS.md'), '# Our agents file\n');
  const report = await init({ cwd: dir, base, log: () => {} });
  const vs = JSON.parse(readFileSync(join(dir, '.vscode/mcp.json'), 'utf8')).servers;
  assert.ok(vs.other && vs.provenlab?.url === `${home}/mcp`);
  assert.match(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), /^# Rules[\s\S]*@AGENTS\.md/);
  assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), '# Our agents file\n');
  assert.deepEqual(report.kept, ['AGENTS.md']);
  assert.deepEqual(report.merged.sort(), ['.vscode/mcp.json', 'CLAUDE.md']);
  const again = await init({ cwd: dir, base, log: () => {} });
  assert.deepEqual(again.added, []); assert.ok(again.kept.includes('.vscode/mcp.json') && again.kept.includes('CLAUDE.md'));
});

test('Claude Code plugin matches the site and the kit', () => {
  const market = rj('.claude-plugin', 'marketplace.json');
  assert.equal(market.plugins[0].source, './plugins/provenlab');
  const plugin = rj('plugins', 'provenlab', '.claude-plugin', 'plugin.json');
  assert.equal(plugin.name, market.plugins[0].name);
  assert.equal(rj('plugins', 'provenlab', '.mcp.json').mcpServers.provenlab.url, `${home}/mcp`);
  assert.equal(readFileSync(join(ROOT, 'plugins/provenlab/skills/provenlab/SKILL.md'), 'utf8'), readFileSync(join(ROOT, 'dist/kit/.claude/skills/provenlab/SKILL.md'), 'utf8'));
  assert.equal(rj('packages', 'mcp-server', 'package.json').homepage, home, 'npm package homepage must match the site');
  const cli = spawnSync('claude', ['plugin', 'validate', ROOT], { encoding: 'utf8' });
  if (cli.error) return; // Claude Code CLI not installed (CI): structure checks above still ran
  assert.match(cli.stdout + cli.stderr, /Validation passed/);
});
