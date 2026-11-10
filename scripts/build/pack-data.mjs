// prepack: bundle the generated data the MCP server needs into the package.
import { cp, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'packages', 'mcp-server', 'data');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const f of ['entities.json', 'domains.json', 'blueprints.json', 'wpe-operations.json', 'docs.json', 'cli-commands.json', 'templates.json', 'AGENTS.md', 'commands.json']) await cp(join(root, 'dist', f), join(out, f));
