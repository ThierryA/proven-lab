// Quality gates for what agents get: templates that are complete and parse, MCP instructions and prompts, and
// consistency between the runbook, guides, skill and tools.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { ROOT, walk } from './helpers.mjs';
import { callTool } from '../packages/mcp-server/src/core.mjs';
import { TOOLS } from '../packages/mcp-server/src/tools.mjs';
import { INSTRUCTIONS, listPrompts, getPrompt } from '../packages/mcp-server/src/prompts.mjs';

const read = (...p) => readFileSync(join(ROOT, ...p), 'utf8');

test('templates: complete, placeholders filled, PHP lints, JSON and YAML parse', async () => {
  const list = await callTool('get_template', {});
  assert.ok(list.templates.length >= 5);
  const hasPhp = (() => { try { execFileSync('php', ['-v']); return true; } catch { return false; } })();
  for (const { name } of list.templates) {
    const t = await callTool('get_template', { name, slug: 'book-club' });
    assert.ok(!t.error, `${name}: ${t.error}`);
    assert.ok(t.files.length && t.next.length, `${name} has files and next steps`);
    assert.ok(t.files.every((f) => !/\{\{\w+\}\}/.test(f.path + f.content)), `${name}: unfilled placeholder`);
    const php = t.files.filter((f) => f.path.endsWith('.php'));
    if (hasPhp) {
      const dir = mkdtempSync(join(tmpdir(), 'pl-tpl-'));
      for (const f of php) { const p = join(dir, f.path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, f.content); execFileSync('php', ['-l', p], { stdio: 'pipe' }); }
    }
    for (const f of t.files) {
      if (f.path.endsWith('.json')) JSON.parse(f.content);
      if (/\.ya?ml$/.test(f.path)) YAML.parse(f.content);
      if (f.path.endsWith('.sh')) execFileSync('bash', ['-n'], { input: f.content });
    }
  }
});

test('MCP: server instructions, prompts and the runbook as a guide', async () => {
  assert.ok(INSTRUCTIONS.length > 500 && INSTRUCTIONS.length < 2500, 'instructions are short but complete');
  for (const s of ['runbook', 'get_template', 'staging']) assert.ok(INSTRUCTIONS.includes(s), `instructions mention ${s}`);
  assert.deepEqual((await listPrompts()).map((p) => p.name), ['check', 'explain', 'git-connect', 'plan', 'ship', 'start']);
  const start = await getPrompt('start', { request: 'Build a members directory' });
  assert.match(start.messages[0].content.text, /Build a members directory[\s\S]*project\.md/);
  const list = await callTool('list_blueprints', {});
  assert.equal(list[0].slug, 'runbook');
  const cmd = await callTool('get_command', { name: '/provenlab:plan' });
  assert.match(cmd.markdown, /\.provenlab\/plan\.md/);
  assert.deepEqual((await callTool('get_command', {})).commands.map((c) => c.name), ['check', 'explain', 'git-connect', 'plan', 'ship', 'start']);
  assert.match((await callTool('get_blueprint', { slug: 'runbook' })).markdown, /^# Proven Lab runbook/);
});

test('consistency: guides, runbook, skill and commands only reference guides and tools that exist', async () => {
  const slugs = new Set(['runbook', ...readdirSync(join(ROOT, 'content/blueprints')).map((f) => f.replace(/\.md$/, ''))]);
  const tools = new Set(TOOLS.map((t) => t.name));
  const texts = [
    ['AGENTS.md', read('content/AGENTS.md')],
    ['SKILL.md', read('content/kit/.claude/skills/provenlab/SKILL.md')],
    ...readdirSync(join(ROOT, 'content/plugin-commands')).map((f) => [f, read('content/plugin-commands', f)]),
    ...walk(join(ROOT, 'content/blueprints'), '.md').map((f) => [f.split('/').pop(), readFileSync(f, 'utf8')]),
  ];
  for (const [file, md] of texts) {
    // Guide references: `slug` in backticks next to the word guide/blueprint/get_blueprint.
    for (const m of md.matchAll(/get_blueprint\s+`?([a-z0-9-]+)`?|get_blueprint\(\s*"([a-z0-9-]+)"|`([a-z0-9-]+)`(?=[^`\n]{0,40}\b(guide|section)\b)/g)) {
      const s = m[1] || m[2] || m[3]; if (s && /-/.test(s) && !/^(wp|wpe|power)-/.test(s) && /^[a-z]+(-[a-z]+)+$/.test(s) && !slugs.has(s)) assert.fail(`${file}: unknown guide \`${s}\``);
    }
    // Tool references.
    for (const m of md.matchAll(/`((?:get|list)_[a-z_]+|search_docs|check_php)`/g)) if (!tools.has(m[1]) && !/^get_(post|option|the|current|bloginfo|template_part|field|transient|sites|users|posts|terms|permalink|user|page|object)/.test(m[1]) && !/^list_(users|plugins|roles|account_sites|site_abilities|accounts)$/.test(m[1])) assert.fail(`${file}: unknown tool \`${m[1]}\``);
  }
});

test('consistency: agent-facing text keeps the rules that were decided', () => {
  const agents = read('content/AGENTS.md');
  const all = [agents, read('content/kit/.claude/skills/provenlab/SKILL.md'), ...walk(join(ROOT, 'content/blueprints'), '.md').map((f) => readFileSync(f, 'utf8'))].join('\n');
  assert.ok(agents.length < 16000, `AGENTS.md is ${agents.length} chars; keep the runbook short`);
  for (const s of ['Never change WordPress core', 'Never edit plugins or themes the user did not write', 'No custom database tables', 'Explain visually', 'Generative UI', 'mermaid']) assert.ok(agents.includes(s), `runbook rule: ${s}`);
  assert.ok(INSTRUCTIONS.includes('never change WordPress core'), 'MCP instructions carry the core rule');
  assert.ok(!/(in|as|use) a must-use plugin(?! is)/i.test(all.replace(/not a must-use plugin|never[^.]*must-use|must-use plugins? (cannot|have no|are skipped)|Use a must-use plugin only/gi, '')), 'no guide recommends a must-use plugin for the app');
  assert.ok(!/ssh-keygen|wpe_create_ssh_key/.test(all), 'agents never create SSH keys');
  for (const s of ['New or existing', 'staging', 'get_template', 'project.md']) assert.ok(agents.includes(s), `runbook mentions ${s}`);
});
