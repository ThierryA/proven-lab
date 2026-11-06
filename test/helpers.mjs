import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const rj = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), 'utf8'));
export const core = () => rj('corpus', 'wp', 'source', 'core.json');
export const cliData = () => rj('corpus', 'wp', 'cli', 'commands.json');
export const domains = () => rj('content', 'domains.json');
export function walk(dir, ext) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : []; });
}
/** Fenced code blocks from all blueprints: [{ file, lang, code }] */
export function blueprintBlocks() {
  const out = [];
  for (const f of walk(join(ROOT, 'content', 'blueprints'), '.md')) {
    const md = readFileSync(f, 'utf8');
    for (const m of md.matchAll(/```(\w*)\n([\s\S]*?)```/g)) out.push({ file: f.split('/').pop(), lang: m[1], code: m[2] });
  }
  return out;
}
