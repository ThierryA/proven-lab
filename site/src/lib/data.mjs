import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const dist = (...p) => join(process.cwd(), '..', 'dist', ...p);
const rj = (f) => JSON.parse(readFileSync(dist(f), 'utf8'));
export const domains = () => rj('domains.json');
export const blueprints = () => rj('blueprints.json');
export const wpe = () => rj('wpe-operations.json');
export const stats = () => rj('stats.json');
export const domainMd = (slug) => readFileSync(dist('domains', `${slug}.md`), 'utf8');
export const connectMd = () => readFileSync(join(process.cwd(), 'src', 'content', 'connect.md'), 'utf8');
export const GROUP_ORDER = ['Data model', 'Data access', 'Users & access', 'Extension', 'Rendering', 'Interfaces', 'Services'];
export function sidebar() {
  const groups = GROUP_ORDER.map((g) => ({ title: g, items: domains().filter((d) => d.group === g).map((d) => ({ label: d.title, href: `/docs/api/${d.slug}` })) }));
  const byTag = (section) => {
    const tags = {};
    for (const o of wpe().operations.filter((x) => x.section === section)) { const t = (o.tags || []).find((x) => !x.startsWith('Product')) || 'Other'; (tags[t] ||= []).push({ label: o.operationId, href: `/docs/wpe/${o.operationId}`, method: o.method }); }
    return Object.entries(tags).map(([title, items]) => ({ title, items }));
  };
  const hostingGuide = { label: 'Hosting on WP Engine', href: '/docs/wpe-hosting' };
  return {
    guides: [...blueprints().filter((b) => b.slug !== 'wpe-hosting').map((b) => ({ label: b.title, href: `/docs/${b.slug}` })), { label: 'Connect your agent', href: '/docs/connect' }],
    core: groups,
    ai: byTag('ai'),
    hosting: [{ title: 'Overview', items: [hostingGuide] }, ...byTag('hosting')],
  };
}
