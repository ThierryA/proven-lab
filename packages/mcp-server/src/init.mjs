// `npx @provenlab/mcp init`: add the Proven Lab kit to the current project.
// Downloads the kit from the Proven Lab site, merges MCP configs, never overwrites the project's own files.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const exists = (p) => access(p).then(() => true, () => false);
const pkg = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'));

// Where each MCP config keeps its servers.
const MCP_KEYS = { '.mcp.json': 'mcpServers', '.cursor/mcp.json': 'mcpServers', '.vscode/mcp.json': 'servers' };

export async function init({ cwd = process.cwd(), base = process.env.PROVENLAB_URL || pkg.homepage, force = false, log = console.log, fetchImpl = fetch } = {}) {
  base = base.replace(/\/$/, '');
  const get = async (url) => { const r = await fetchImpl(url); if (!r.ok) throw new Error(`GET ${url}: HTTP ${r.status}`); return r.text(); };
  const manifest = JSON.parse(await get(`${base}/kit/manifest.json`));
  const report = { added: [], merged: [], kept: [] };

  for (const { path } of manifest.files) {
    const target = join(cwd, path);
    const body = await get(`${base}/kit/${path}`);
    const present = await exists(target);
    if (!present || force) {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, body);
      report.added.push(path);
    } else if (MCP_KEYS[path]) {
      const key = MCP_KEYS[path];
      const current = JSON.parse(await readFile(target, 'utf8'));
      const incoming = JSON.parse(body)[key];
      if (current[key]?.provenlab && JSON.stringify(current[key].provenlab) === JSON.stringify(incoming.provenlab)) { report.kept.push(path); continue; }
      current[key] = { ...(current[key] || {}), ...incoming };
      await writeFile(target, JSON.stringify(current, null, 2) + '\n');
      report.merged.push(path);
    } else if (path === 'CLAUDE.md') {
      const text = await readFile(target, 'utf8');
      if (/^@AGENTS\.md\s*$/m.test(text)) { report.kept.push(path); continue; }
      await writeFile(target, text.replace(/\s*$/, '\n\n@AGENTS.md\n'));
      report.merged.push(path);
    } else {
      report.kept.push(path);
    }
  }

  log('Proven Lab kit');
  if (report.added.length) log(`  added:  ${report.added.join(', ')}`);
  if (report.merged.length) log(`  merged: ${report.merged.join(', ')}`);
  if (report.kept.length) log(`  kept:   ${report.kept.join(', ')} (already present; merge by hand or see ${base}/kit/SETUP.md)`);
  log(`  MCP server: ${manifest.mcp}`);
  log("Next: restart your agent. In Claude Code, run /mcp and approve 'provenlab'.");
  return report;
}
