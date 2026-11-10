// The guides' PHP snippets are valid PHP (syntax only; WordPress APIs themselves are WordPress's to test).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { blueprintBlocks } from './helpers.mjs';

const blocks = blueprintBlocks();

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
