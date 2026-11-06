// Downloads the official WP-CLI release, verifies its published checksum, and dumps the full
// command tree with `wp cli cmd-dump` (authoritative, versioned, no WordPress install needed).
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { CORPUS, ROOT, fetchRetry, writeJson } from './lib.mjs';

export async function ingestWpCli({ log = console.log } = {}) {
  const { body: rel } = await fetchRetry('https://api.github.com/repos/wp-cli/wp-cli/releases/latest', { json: true });
  const tag = rel.tag_name;
  const asset = (n) => rel.assets.find((a) => a.name === n)?.browser_download_url;
  const base = `wp-cli-${tag.replace(/^v/, '')}.phar`;
  const dir = join(CORPUS, 'raw', 'wp-cli');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  log(`downloading WP-CLI ${tag}`);
  const phar = Buffer.from(await (await fetch(asset(base))).arrayBuffer());
  const expected = (await (await fetch(asset(`${base}.sha512`))).text()).trim().split(/\s+/)[0];
  const actual = createHash('sha512').update(phar).digest('hex');
  if (expected !== actual) throw new Error(`WP-CLI checksum mismatch: expected ${expected.slice(0, 12)}…, got ${actual.slice(0, 12)}…`);
  const pharPath = join(dir, 'wp-cli.phar');
  await writeFile(pharPath, phar);
  // Run from the repo root (never from inside the download dir); no WordPress is loaded.
  const json = execFileSync('php', ['-d', 'memory_limit=512M', pharPath, 'cli', 'cmd-dump', '--skip-plugins', '--skip-themes', '--allow-root'], { cwd: ROOT, maxBuffer: 1 << 28 });
  const tree = JSON.parse(json);
  const commands = [];
  const walk = (node, path, top) => {
    for (const c of node.subcommands || []) {
      const p = [...path, c.name];
      const long = (c.longdesc || '').split(/\n## GLOBAL PARAMETERS[\s\S]*$/)[0].trim();
      commands.push({ id: `wpcli:${p.join(' ')}`, source: 'wp-cli', kind: 'cli', path: `wp ${p.join(' ')}`, name: c.name, top: top || c.name, depth: p.length, description: c.description, synopsis: c.synopsis || '', longdesc: long, hasChildren: (c.subcommands || []).length > 0 });
      walk(c, p, top || c.name);
    }
  };
  walk(tree, [], null);
  await writeJson('wp/cli/commands.json', { version: tag.replace(/^v/, ''), commands });
  log(`wp-cli ${tag}: ${commands.length} commands (sha512 verified)`);
  await rm(dir, { recursive: true, force: true });
}
