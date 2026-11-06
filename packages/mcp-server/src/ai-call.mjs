// How to call a Cloud AI API operation: from WordPress with the site connection (no API key),
// from the browser where a session token allows it, and when an API key is the only option.
// Shared by the MCP tool get_ai_operation and the docs site.
const BASE = 'https://api.ai.wpengine.com';
const PUBLIC = new Set(['listModels', 'getModelSchema']);
const BROWSER = new Set(['sendSessionEvents', 'listSessionEvents']);

const deref = (s, components, depth = 0) => {
  if (!s || depth > 6) return s;
  if (s.$ref) { const [, kind, name] = s.$ref.match(/^#\/components\/(\w+)\/(.+)$/) || []; return deref(components?.[kind]?.[name], components, depth + 1); }
  if (s.allOf) return s.allOf.map((x) => deref(x, components, depth + 1)).reduce((a, b) => ({ ...a, ...b, properties: { ...(a.properties || {}), ...(b.properties || {}) }, required: [...(a.required || []), ...(b.required || [])] }), {});
  return s;
};
const tag = (o) => (o.tags || []).find((t) => !t.startsWith('Product')) || '';

function phpSnippet(o, components) {
  const vars = (o.path.match(/\{(\w+)\}/g) || []).map((p) => p.slice(1, -1));
  const url = `'${BASE}${o.path.replace(/\{(\w+)\}/g, "' . rawurlencode( $$$1 ) . '")}'`.replace(/ \. ''$/, '');
  const schema = deref(o.requestBody?.content?.['application/json']?.schema, components);
  const required = schema?.required || [];
  const lines = [`$response = wpe_auth_api_request( ${url}, array(`, `\t'method'  => '${o.method}',`];
  if (schema) {
    const fields = required.length ? required.map((f) => `'${f}' => $${f}`).join(', ') : '/* fields from the request body */';
    lines.push(`\t'headers' => array( 'Content-Type' => 'application/json' ),`, `\t'body'    => wp_json_encode( array( ${fields} ) ),`);
  }
  lines.push(`\t'timeout' => 60,`, ') );', 'if ( is_wp_error( $response ) ) {', '\treturn $response; // Not connected, or the request failed.', '}', "// $response['status'] is the HTTP status; $response['body'] is the decoded JSON.");
  const header = ['// WordPress, WP Engine AI plugin connected (Connect in WP Admin): no API key.'];
  if (vars.length) header.push(`// Path parameters: ${vars.map((v) => `$${v}`).join(', ')}.`);
  return [...header, ...lines].join('\n');
}

export function howToCall(o, components) {
  const t = tag(o);
  if (PUBLIC.has(o.operationId)) return { auth: 'none', summary: 'Public: no credentials needed. Call it from anywhere.' };
  if (t === 'Sites') return { auth: 'site-oauth', summary: 'Called by the WP Engine AI plugin itself with the site\'s OAuth credentials when the user clicks Connect. Do not call it from your code.' };
  if (t === 'Analytics' || t === 'Credits') return { auth: 'account-login', summary: 'Account login only (WP Engine User Portal). Neither the site connection nor an API key can call it.' };
  return {
    auth: 'site-connection',
    summary: 'Default: call it from WordPress with the site connection, no API key. Use `wpe_auth_api_request()` (WP Engine AI plugin) from a capability- or nonce-checked REST route; a custom app (Node) calls that route with an application password.'
      + (BROWSER.has(o.operationId) ? ' For interactive features the browser may call it directly with a short-lived browser session token (blueprint wpe-ai-plugins, section 4).' : '')
      + ' Use an API key only for code that runs outside WordPress and cannot call a WordPress route.',
    php: phpSnippet(o, components),
  };
}
