import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const dist = (...p) => join(process.cwd(), '..', 'dist', ...p);
const rj = (f) => JSON.parse(readFileSync(dist(f), 'utf8'));
export const domains = () => rj('domains.json');
export const blueprints = () => rj('blueprints.json');
export const overviews = () => rj('overviews.json');
export const wpe = () => rj('wpe-operations.json');
export const cli = () => JSON.parse(readFileSync(dist('cli-commands.json'), 'utf8'));
export const stats = () => rj('stats.json');
export const domainMd = (slug) => readFileSync(dist('domains', `${slug}.md`), 'utf8');
const pkgRoot = JSON.parse(readFileSync(join(process.cwd(), '..', 'package.json'), 'utf8'));
export const BASE = (process.env.SITE_URL || pkgRoot.homepage || '').replace(/\/$/, '');
// The docs menu follows the runbook in AGENTS.md: one group per step, guides in the order agents use them.
export const RUNBOOK = [
  { title: 'Start', pages: [['Start building', '/docs/connect']] },
  { title: '1 · New or existing', slugs: ['architecture', 'existing-project'] },
  { title: '2 · Workspace', slugs: ['local-development', 'wpengine-cloud', 'git-workflow'] },
  { title: '3 · Build', slugs: ['classic-wordpress', 'custom-app', 'frontend-design'] },
  { title: '4 · AI', slugs: ['wpe-ai-plugins', 'ai-features'] },
  { title: '5 · Verify', slugs: ['wp-cli-for-agents', 'best-practices'] },
  { title: '6 · Ship', slugs: ['wpe-deployment'] },
];
export const runbookGroups = () => RUNBOOK.map((g) => ({
  title: g.title,
  items: g.pages ? g.pages.map(([label, href]) => ({ label, href })) : g.slugs.map((slug) => blueprints().find((b) => b.slug === slug)).filter(Boolean).map((b) => ({ label: b.nav || b.title, href: `/docs/${b.slug}`, summary: (b.agent_does || []).join(' ') || b.summary })),
}));
export const connectMd = () => readFileSync(join(process.cwd(), 'src', 'content', 'connect.md'), 'utf8').replaceAll('{{BASE}}', BASE).replaceAll('{{MCP_URL}}', `${BASE}/mcp`);
export const GROUP_ORDER = ['Data model', 'Data access', 'Users & access', 'Extension', 'Rendering', 'Interfaces', 'Services'];
// Groups that are not model tools; shown below a separator. 'Sites' is displayed as 'Site connection'.
export const ACCOUNT = ['Site connection', 'Analytics', 'Credits'];
const TAG_LABEL = { Sites: 'Site connection' };
export function sidebar() {
  const groups = GROUP_ORDER.map((g) => ({ title: g, items: domains().filter((d) => d.group === g).map((d) => ({ label: d.title, href: `/docs/api/${d.slug}` })) }));
  const byTag = (section) => {
    const tags = {};
    for (const o of wpe().operations.filter((x) => x.section === section)) { const raw = (o.tags || []).find((x) => !x.startsWith('Product')) || 'Other'; const t = TAG_LABEL[raw] || raw; (tags[t] ||= []).push({ label: o.operationId, href: `/docs/ai-api/${o.operationId}`, method: o.method }); }
    return Object.entries(tags).map(([title, items]) => ({ title, items })).sort((a, b) => ACCOUNT.indexOf(a.title) - ACCOUNT.indexOf(b.title));
  };
  return {
    guides: runbookGroups(),
    core: groups,
    cli: [{ title: 'Commands', items: cli().tops.map((t) => ({ label: `wp ${t.top}`, href: `/docs/cli/${t.top}` })) }],
    ai: byTag('ai').filter((g) => !ACCOUNT.includes(g.title)),
    account: byTag('ai').filter((g) => ACCOUNT.includes(g.title)),
  };
}
