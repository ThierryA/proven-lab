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
export const GROUP_ORDER = ['Data model', 'Data access', 'Users & access', 'Extension', 'Rendering', 'Interfaces', 'Platform'];
export function sidebar() {
  const groups = GROUP_ORDER.map((g) => ({ title: g, items: domains().filter((d) => d.group === g).map((d) => ({ label: d.title, href: `/docs/api/${d.slug}` })) }));
  const tags = {};
  for (const o of wpe().operations) { const t = (o.tags || []).find((x) => !x.startsWith('Product')) || 'Other'; (tags[t] ||= []).push({ label: o.operationId, href: `/docs/wpe/${o.operationId}`, method: o.method }); }
  return {
    guides: [...blueprints().map((b) => ({ label: b.title, href: `/docs/${b.slug}` })), { label: 'Connect your agent', href: '/docs/connect' }],
    core: groups,
    wpe: Object.entries(tags).map(([title, items]) => ({ title, items })),
  };
}
