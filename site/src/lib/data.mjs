import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const dist = (...p) => join(process.cwd(), '..', 'dist', ...p);
const rj = (f) => JSON.parse(readFileSync(dist(f), 'utf8'));
export const domains = () => rj('domains.json');
export const blueprints = () => rj('blueprints.json');
export const wpe = () => rj('wpe-operations.json');
export const cli = () => JSON.parse(readFileSync(dist('cli-commands.json'), 'utf8'));
export const stats = () => rj('stats.json');
export const domainMd = (slug) => readFileSync(dist('domains', `${slug}.md`), 'utf8');
export const connectMd = () => readFileSync(join(process.cwd(), 'src', 'content', 'connect.md'), 'utf8');
export const GROUP_ORDER = ['Data model', 'Data access', 'Users & access', 'Extension', 'Rendering', 'Interfaces', 'Services'];
export const ACCOUNT = ['Analytics', 'Credits'];
export function sidebar() {
  const groups = GROUP_ORDER.map((g) => ({ title: g, items: domains().filter((d) => d.group === g).map((d) => ({ label: d.title, href: `/docs/api/${d.slug}` })) }));
  const byTag = (section) => {
    const tags = {};
    for (const o of wpe().operations.filter((x) => x.section === section)) { const t = (o.tags || []).find((x) => !x.startsWith('Product')) || 'Other'; (tags[t] ||= []).push({ label: o.operationId, href: `/docs/wpe/${o.operationId}`, method: o.method }); }
    return Object.entries(tags).map(([title, items]) => ({ title, items }));
  };
  const deploymentGuide = { label: 'Deploying on WP Engine', href: '/docs/wpe-deployment' };
  return {
    guides: [...blueprints().filter((b) => !['wpe-deployment', 'wp-cli-for-agents'].includes(b.slug)).map((b) => ({ label: b.title, href: `/docs/${b.slug}` })), { label: 'Connect your agent', href: '/docs/connect' }],
    core: groups,
    cli: [{ title: 'Commands', items: [{ label: 'WP-CLI for agents', href: '/docs/wp-cli-for-agents' }, ...cli().tops.map((t) => ({ label: `wp ${t.top}`, href: `/docs/cli/${t.top}` }))] }],
    ai: byTag('ai').filter((g) => !ACCOUNT.includes(g.title)),
    account: byTag('ai').filter((g) => ACCOUNT.includes(g.title)),
    deployment: [{ title: 'Overview', items: [deploymentGuide] }, ...byTag('deployment')],
  };
}
