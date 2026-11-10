// search_docs ranking: field-weighted BM25 over identifier tokens, summaries and descriptions, with WordPress
// vocabulary expansion, intent detection (WP-CLI, hooks, guides, Cloud AI API), and priors that demote deprecated
// and private APIs and promote APIs the handbooks and reference mention often.

const STOP = new Set('a an the to of for in on with by from and or is are be it its this that how do i my me we our your can when what which into as at use using via its'.split(' '));
const stem = (w) => (w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') ? w.slice(0, -1) : w);
export function tokens(s) {
  const out = [];
  for (const raw of String(s || '').split(/[^A-Za-z0-9_]+/)) {
    if (!raw) continue;
    if (raw === '__' || raw === '_e' || raw === '_x' || raw === '_n') { out.push(raw); continue; }
    for (const part of raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[_\s]+/)) { const w = part.toLowerCase(); if (w && !STOP.has(w)) out.push(stem(w)); }
  }
  return out;
}

// WordPress vocabulary: plain words agents use -> terms WordPress uses. Generic, not tuned to individual queries.
const EXPAND = {
  escape: ['esc'], field: ['meta'], custom: ['meta'], setting: ['option', 'register'], save: ['update', 'add', 'save'], store: ['update', 'add'],
  create: ['insert', 'add', 'create', 'new'], new: ['insert', 'add', 'create'], add: ['insert', 'register', 'add'], remove: ['delete', 'remove'], delete: ['delete', 'trash'],
  permanently: ['force', 'delete'], retrieve: ['get'], fetch: ['get'], read: ['get'], check: ['can', 'is', 'verify'], verify: ['verify', 'check'],
  capability: ['cap', 'can'], permission: ['cap', 'can'], logged: ['current', 'user', 'login'], login: ['login', 'signon'], log: ['login'],
  recurring: ['schedule', 'event'], cron: ['schedule', 'event', 'cron'], later: ['schedule', 'single', 'event'], once: ['single'], schedule: ['schedule', 'event'],
  temporarily: ['transient'], cache: ['cache', 'transient'], expiration: ['transient'], expire: ['transient'], email: ['mail'], mail: ['mail'],
  http: ['remote', 'http'], request: ['remote', 'request'], external: ['remote'], upload: ['upload', 'sideload', 'handle'],
  activated: ['activation'], activate: ['activation', 'activate'], deactivated: ['deactivation'], translate: ['__', 'gettext', 'translate'], translation: ['__', 'gettext'],
  saved: ['save'], display: ['the', 'content'], output: ['esc', 'echo'], html: ['html', 'kses'], safe: ['kses', 'esc', 'sanitize'], sql: ['prepare', 'wpdb'], database: ['db', 'wpdb'],
  endpoint: ['rest', 'route'], route: ['route', 'rest'], api: ['rest'], javascript: ['script'], js: ['script'], stylesheet: ['style'], css: ['style'],
  ai: ['ai', 'client', 'prompt'], generate: ['prompt', 'generate'], transcribe: ['transcription'], audio: ['transcription', 'audio'], speech: ['speech'],
  url: ['url', 'link'], image: ['image', 'attachment', 'img'], attribute: ['attr'], attr: ['attribute'], message: ['msg'], parameter: ['param'], argument: ['arg'],
  authentication: ['auth'], administrator: ['admin'], translation: ['__', 'gettext', 'translate'], translated: ['translate'], existing: ['update'], string: ['text'], role: ['role'], menu: ['menu', 'page'], hook: [], fire: [], fires: [],
};
const PHRASES = [
  [/main query/, ['pre_get_posts', 'pre', 'get', 'post']], [/custom (field|meta)/, ['meta', 'register']], [/command line|from the shell|terminal|wp-cli|\bcli\b/, []],
  [/block\.json/, ['block', 'type', 'metadata', 'register']], [/application password/, ['application', 'password']], [/rewrite rule/, ['rewrite', 'rule']],
  [/(post|content) is saved|when a post is saved/, ['save_post', 'save', 'post']], [/user logs in/, ['wp_login', 'login']],
  [/object cache/, ['wp', 'cache'], ['object']], [/cache (data|value|result)s?/, ['transient', 'cache']],
];

const TYPE_WEIGHT = { function: 1.25, hook: 1, class: 1, method: 0.8, cli: 0.9, handbook: 0.7, 'ai-doc': 0.75, 'smart-search-doc': 0.25, guide: 0.9 };
const FIELD = { name: 3.2, summary: 1.4, text: 0.45 };
const K1 = 1.2, B = 0.6;

export function buildSearch(entries, mentionCounts) {
  const N = entries.length;
  const df = new Map(); const fields = ['name', 'summary', 'text']; const avg = { name: 0, summary: 0, text: 0 };
  const docs = entries.map((e) => {
    const f = {};
    for (const k of fields) {
      const tf = new Map(); const toks = tokens(e[k]);
      for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
      f[k] = { tf, len: toks.length }; avg[k] += toks.length;
      for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    }
    const nameLc = String(e.id).toLowerCase();
    let prior = 1;
    if (e.deprecated) prior *= 0.15;
    if (e.private) prior *= 0.45;
    if (/^block_core_|^_wp_|^wp_ajax_|_customize_|^_/.test(nameLc) && e.type !== 'handbook') prior *= 0.6;
    if (/\{\$/.test(nameLc)) prior *= 0.85;
    if (e.type === 'method' && /controller::|_controller$/.test(nameLc)) prior *= 0.6;
    const m = mentionCounts.get(e.id) || 0;
    prior *= 1 + 0.22 * Math.log1p(m);
    return { e, f, prior, nameLc };
  });
  for (const k of fields) avg[k] = avg[k] / N || 1;
  const idf = (t) => { const d = df.get(t) || 0; return Math.log(1 + (N - d + 0.5) / (d + 0.5)); };

  return function search(query, { type, limit = 10 } = {}) {
    const q = String(query || '').toLowerCase();
    const base = tokens(q); const weights = new Map();
    for (const t of base) weights.set(t, Math.max(weights.get(t) || 0, 1));
    const via = new Map(); // expansion term -> the query terms it stands for, for coverage
    for (const t of base) for (const x of EXPAND[t] || []) { if (!weights.has(x)) weights.set(x, 0.55); if (!via.has(x)) via.set(x, new Set()); via.get(x).add(t); }
    const soft = new Set(); // query words a recognized phrase stands in for: low weight, not required for coverage
    for (const [re, extra, replaces = []] of PHRASES) if (re.test(q)) { for (const x of extra) weights.set(x, Math.max(weights.get(x) || 0, 0.8)); for (const x of replaces) { soft.add(x); weights.set(x, 0.3); } }
    const intent = {
      cli: /command line|from the shell|terminal|wp-cli|\bcli\b|\bshell\b/.test(q),
      hook: /\bhook\b|\baction\b|\bfilter\b|\bfires?\b|when (a|the|an) /.test(q),
      guide: /how to|guide|tutorial|handbook|explain|best practice/.test(q),
      ai: /transcri|speech|\bai\b|model|gateway|knowledge base|agent session|embedding/.test(q),
      workflow: /deploy|staging|production|workspace|set ?up|setup|local\b|headless|design|runbook|verify|ship|existing (site|project)|best practice|coding standard/.test(q),
    };
    const ident = q.trim().replace(/\(\)$/, '');
    const scored = [];
    for (const d of docs) {
      if (type && d.e.type !== type) continue;
      let s = 0; const covered = new Map();
      for (const [t, w] of weights) {
        let ts = 0;
        for (const k of fields) {
          const { tf, len } = d.f[k]; const c = tf.get(t); if (!c) continue;
          ts += FIELD[k] * idf(t) * (c * (K1 + 1)) / (c + K1 * (1 - B + B * len / avg[k]));
        }
        if (ts) { s += w * ts; if (base.includes(t)) covered.set(t, 1); else for (const b of via.get(t) || []) covered.set(b, Math.max(covered.get(b) || 0, 0.7)); }
      }
      if (!s) continue;
      const need = [...new Set(base)].filter((t) => !soft.has(t)); let cov = 0; for (const t of need) cov += covered.get(t) || 0;
      const coverage = need.length ? cov / need.length : 1;
      s *= 0.35 + 0.65 * coverage * coverage;
      // Short names that consist mostly of query terms are what agents look for (esc_attr for "escape attribute").
      const nameToks = d.f.name.len || 1; let nameHit = 0; for (const t of d.f.name.tf.keys()) if (weights.has(t)) nameHit++;
      s *= 0.75 + 0.5 * (nameHit / nameToks);
      let tw = TYPE_WEIGHT[d.e.type] || 1;
      if (intent.cli) tw *= d.e.type === 'cli' ? 2.4 : 0.6; else if (d.e.type === 'cli') tw *= 0.8;
      if (intent.hook && d.e.type === 'hook') tw *= 1.7;
      if (intent.guide && d.e.type === 'handbook') tw *= 1.8;
      if (intent.ai && d.e.type === 'ai-doc') tw *= 2;
      if (intent.workflow && d.e.type === 'guide') tw *= 3;
      if (/smart search/.test(q) && d.e.type === 'smart-search-doc') tw *= 4;
      s *= tw * d.prior;
      if (d.nameLc === ident || d.nameLc === 'wp ' + ident) s *= 4;
      scored.push([s, d.e]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, Math.min(limit, 30)).map(([score, e]) => ({ type: e.type, id: e.id, summary: e.summary, url: e.url, score: +score.toFixed(2), ...(e.deprecated ? { deprecated: true } : {}) }));
  };
}

// How often each API name appears across the handbooks and other reference entries: a proxy for how widely it is used.
export function mentionCounts(texts, names) {
  const want = new Set(names); const counts = new Map();
  for (const text of texts) {
    const seen = new Set();
    for (const m of String(text).matchAll(/[A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)?/g)) { const n = m[0]; if (want.has(n) && !seen.has(n)) { seen.add(n); counts.set(n, (counts.get(n) || 0) + 1); } }
  }
  return counts;
}

// "Did you mean": names close to a mistyped one (edit distance, or most of the same words).
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { let prev = dp[0]; dp[0] = i; for (let j = 1; j <= b.length; j++) { const tmp = dp[j]; dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; } }
  return dp[b.length];
}
export function suggest(name, names, limit = 3) {
  const lc = String(name).toLowerCase(); const words = lc.split('_').filter((w) => w.length > 2);
  const scored = [];
  for (const k of names) {
    const kl = k.toLowerCase(); const d = lev(lc, kl);
    const shared = words.filter((w) => kl.includes(w)).length;
    if (d <= 3 || shared >= Math.max(2, words.length - 1)) scored.push([d - shared * 0.5, k]);
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, limit).map((x) => x[1]);
}
