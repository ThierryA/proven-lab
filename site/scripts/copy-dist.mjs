import { cp, rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pub = join(root, 'site', 'public');
for (const f of ['llms.txt', 'llms-full.txt', 'AGENTS.md', 'stats.json', 'wpe-operations.json', 'install.sh']) await cp(join(root, 'dist', f), join(pub, f));
for (const d of ['openapi', 'tools', 'domains', 'blueprints', 'overviews', 'kit']) { await rm(join(pub, d), { recursive: true, force: true }); await cp(join(root, 'dist', d), join(pub, d), { recursive: true }); }
