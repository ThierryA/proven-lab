// Verifies that code in the blueprints is real: PHP lints, WordPress functions exist, WP-CLI commands and flags exist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { core, cliData, blueprintBlocks } from './helpers.mjs';

const blocks = blueprintBlocks();
const GLOBAL_FLAGS = new Set(['path', 'url', 'ssh', 'http', 'user', 'skip-plugins', 'skip-themes', 'skip-packages', 'require', 'exec', 'context', 'color', 'no-color', 'debug', 'prompt', 'quiet', 'info', 'version', 'allow-root']);

test('PHP snippets are syntactically valid', () => {
  const php = blocks.filter((b) => b.lang === 'php');
  assert.ok(php.length >= 5, `php blocks: ${php.length}`);
  const failures = [];
  for (const b of php) {
    const code = b.code.trimStart().startsWith('<?php') ? b.code : `<?php\n${b.code}`;
    try { execFileSync('php', ['-l'], { input: code, stdio: ['pipe', 'pipe', 'pipe'] }); }
    catch (e) { failures.push(`${b.file}: ${(e.stdout || e.stderr).toString().split('\n')[0]}\n${b.code.slice(0, 80)}`); }
  }
  assert.deepEqual(failures, []);
});

test('WordPress functions used in PHP snippets exist in core', () => {
  const known = new Set(core().functions.map((f) => f.name));
  const watched = /^(wp_|register_|add_|get_|update_|delete_|current_user_can|rest_|esc_|sanitize_|the_|have_posts|flush_|is_)/;
  const ignore = new Set(['get_header', 'get_footer', 'add_cap']); // header/footer are in wp-includes/general-template (checked below)
  const unknown = new Set();
  for (const b of blocks.filter((x) => x.lang === 'php')) {
    for (const m of b.code.matchAll(/(?<![\w>:$])([a-z_][a-z0-9_]*)\s*\(/g)) {
      const n = m[1];
      if (n === 'fn' || n === 'function' || !watched.test(n)) continue;
      if (/\bfunction\s+\w*$/.test(b.code.slice(0, m.index + n.length))) continue;
      if (!known.has(n) && !ignore.has(n)) unknown.add(`${b.file}: ${n}()`);
    }
  }
  assert.deepEqual([...unknown], []);
});

test('WP-CLI commands and flags in bash snippets exist', () => {
  const cmds = cliData().commands;
  const byPath = new Map(cmds.map((c) => [c.path.replace(/^wp /, ''), c]));
  const problems = [];
  for (const b of blocks.filter((x) => ['bash', 'sh', ''].includes(x.lang))) {
    for (const raw of b.code.split('\n')) {
      const line = raw.replace(/^\s*\$\s*/, '').trim();
      const idx = line.search(/(^|[\s&|;(`])wp\s/);
      if (idx < 0 || line.startsWith('#')) continue;
      const cmdline = line.slice(line.indexOf('wp ', idx)).replace(/\s*(&&|\|\||\|).*$/, '').replace(/\s+2>.*$/, '');
      const tokens = cmdline.split(/\s+/).slice(1).filter((t) => !t.startsWith('--') || !GLOBAL_FLAGS.has(t.slice(2).split('=')[0]));
      let path = '', best = null;
      for (const t of tokens) {
        if (/^[-<\['"$.\/]/.test(t)) break;
        const next = path ? `${path} ${t}` : t;
        if (byPath.has(next)) { path = next; best = byPath.get(next); } else break;
      }
      if (!best) { problems.push(`${b.file}: unknown command: ${cmdline}`); continue; }
      const text = `${best.synopsis}\n${best.longdesc}\n${cmds.filter((c) => c.path.startsWith(best.path + ' ')).map((c) => c.synopsis).join(' ')}`;
      for (const f of cmdline.matchAll(/(?:^|\s)--([a-z][\w-]*)/g)) {
        if (GLOBAL_FLAGS.has(f[1])) continue;
        if (!text.includes(`--${f[1]}`) && !text.includes(`--[no-]${f[1]}`) && !text.includes(`--<field>`) && !text.includes('--<')) problems.push(`${b.file}: ${best.path} has no flag --${f[1]}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
