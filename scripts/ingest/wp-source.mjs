// Downloads a WordPress release and statically extracts core API docs from its source.
import { mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, CORPUS, writeJson } from './lib.mjs';

export async function ingestWpSource({ ref = 'latest', log = console.log } = {}) {
  const raw = join(CORPUS, 'raw', 'wordpress');
  await rm(raw, { recursive: true, force: true });
  await mkdir(raw, { recursive: true });
  const url = ref === 'latest' ? 'https://wordpress.org/latest.tar.gz' : `https://wordpress.org/wordpress-${ref}.tar.gz`;
  const tgz = join(CORPUS, 'raw', 'wordpress.tar.gz');
  log(`downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  await writeFile(tgz, Buffer.from(await res.arrayBuffer()));
  execFileSync('tar', ['-xzf', tgz, '-C', raw, '--strip-components=1']);
  const version = (await import('node:fs/promises')).readFile(join(raw, 'wp-includes/version.php'), 'utf8').then((s) => s.match(/\$wp_version\s*=\s*'([^']+)'/)?.[1] ?? 'unknown');
  const v = await version;
  log(`extracting WordPress ${v}`);
  // Static analysis only: the PHP script tokenizes files, it never includes them.
  const json = execFileSync('php', ['-d', 'memory_limit=2G', join(ROOT, 'scripts/php/extract.php'), raw, v], { maxBuffer: 1 << 30 });
  const data = JSON.parse(json);
  await writeJson('wp/source/core.json', data);
  log(`core ${v}: ${data.functions.length} functions, ${data.classes.length} classes, ${data.methods.length} methods, ${data.hooks.length} hooks`);
  await rm(raw, { recursive: true, force: true });
  await rm(tgz, { force: true });
}
