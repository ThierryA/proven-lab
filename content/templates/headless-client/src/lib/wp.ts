// Server-side WordPress REST client. Never import this from browser code: it holds the application password.
const WP_URL = process.env.WP_URL?.replace(/\/$/, '');
const AUTH = 'Basic ' + Buffer.from(`${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`).toString('base64');

export class WordPressError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function wp<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!WP_URL) throw new Error('WP_URL is not set');
  const res = await fetch(`${WP_URL}/wp-json${path}`, {
    ...init,
    headers: { Authorization: AUTH, 'Content-Type': 'application/json', ...init.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new WordPressError(res.status, body?.code ?? 'http_error', body?.message ?? res.statusText);
  return body as T;
}

export type Item = { id: number; title: { rendered: string }; status: string; meta: { {{prefix}}_price?: number } };

export const items = {
  list: (params: Record<string, string | number> = {}) =>
    wp<Item[]>(`/wp/v2/{{slug}}-items?${new URLSearchParams({ per_page: '20', _fields: 'id,title,status,meta', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })}`),
  get: (id: number) => wp<Item>(`/wp/v2/{{slug}}-items/${id}?_fields=id,title,status,meta`),
  create: (data: { title: string; status?: 'draft' | 'publish'; meta?: Item['meta'] }) =>
    wp<Item>('/wp/v2/{{slug}}-items', { method: 'POST', body: JSON.stringify({ status: 'draft', ...data }) }),
};

// Run an Ability through the REST API (Abilities registered with meta.public or show_in_rest).
export const runAbility = <T>(name: string, input: unknown) =>
  wp<T>(`/wp-abilities/v1/abilities/${name}/run`, { method: 'POST', body: JSON.stringify({ input }) });
