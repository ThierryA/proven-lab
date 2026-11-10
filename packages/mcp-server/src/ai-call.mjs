// How to call a Cloud AI API operation: from WordPress with the site connection (no API key), from the browser
// where a session token allows it, and when an API key is the only option. Also a readable view of the request
// and response (dereferenced fields instead of $refs). Shared by get_ai_operation and the docs site.
const BASE = 'https://api.ai.wpengine.com';
const PUBLIC = new Set(['listModels', 'getModelSchema']);
const BROWSER = new Set(['sendSessionEvents', 'listSessionEvents']);

export const deref = (s, components, depth = 0) => {
  if (!s || depth > 6) return s;
  if (s.$ref) { const [, kind, name] = s.$ref.match(/^#\/components\/(\w+)\/(.+)$/) || []; return deref(components?.[kind]?.[name], components, depth + 1); }
  if (s.allOf) return s.allOf.map((x) => deref(x, components, depth + 1)).reduce((a, b) => ({ ...a, ...b, properties: { ...(a.properties || {}), ...(b.properties || {}) }, required: [...(a.required || []), ...(b.required || [])] }), {});
  return s;
};
const tag = (o) => (o.tags || []).find((t) => !t.startsWith('Product')) || '';
const oneLine = (t, n = 160) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, n);
const typeOf = (p) => (p.type === 'array' ? `${p.items?.type || 'object'}[]` : p.type || (p.oneOf || p.anyOf ? 'one of several' : p.enum ? 'enum' : 'object'));

/** Request body fields and response content, readable without $refs. */
export function describeOperation(o, components) {
  const content = o.requestBody?.content || {};
  const contentType = Object.keys(content)[0];
  const schema = contentType ? deref(content[contentType].schema, components) : null;
  const required = new Set(schema?.required || []);
  const fields = schema?.properties ? Object.entries(schema.properties).map(([name, raw]) => {
    const p = deref(raw, components) || {};
    return { name, type: typeOf(p), required: required.has(name), ...(p.default !== undefined ? { default: p.default } : {}), ...(p.enum ? { enum: p.enum } : {}), description: oneLine(p.description, 220) };
  }) : [];
  const params = (o.parameters || []).map((x) => deref(x, components)).map((p) => ({ name: p.name, in: p.in, required: Boolean(p.required), type: typeOf(deref(p.schema, components) || {}), description: oneLine(p.description, 160) }));
  const responses = {};
  for (const [code, raw] of Object.entries(o.responses || {})) {
    const r = deref(raw, components) || {};
    const types = Object.keys(r.content || {});
    const json = r.content?.['application/json']?.schema ? deref(r.content['application/json'].schema, components) : null;
    responses[code] = { description: oneLine(r.description, 120), contentTypes: types, ...(code.startsWith('2') && json?.properties ? { fields: Object.keys(json.properties) } : {}) };
  }
  const ok = Object.entries(responses).find(([c]) => c.startsWith('2'))?.[1];
  const binary = Boolean(ok && ok.contentTypes.length && !ok.contentTypes.some((t) => t.includes('json')));
  return { contentType, fields, params, responses, binary };
}

const sample = (f) => {
  if (/base64/i.test(f.description)) return 'base64_encode( $audio_bytes )';
  if (f.name === 'mime_type') return "'audio/webm'";
  if (f.default !== undefined) return typeof f.default === 'string' ? `'${f.default}'` : JSON.stringify(f.default);
  if (f.required && f.enum) return `'${f.enum[0]}'`;
  return '$' + f.name;
};
const note = (f) => (f.name === 'mime_type' ? "the recording's type; defaults to audio/wav, and browsers record audio/webm" : oneLine(f.description, 90));

function phpSnippet(o, d) {
  const vars = (o.path.match(/\{(\w+)\}/g) || []).map((p) => p.slice(1, -1));
  const url = `'${BASE}${o.path.replace(/\{(\w+)\}/g, "' . rawurlencode( $$$1 ) . '")}'`.replace(/ \. ''$/, '');
  const body = d.fields.length ? [
    `\t'body'    => wp_json_encode( array(`,
    ...d.fields.filter((f) => f.required).map((f) => `\t\t'${f.name}' => ${sample(f)},`),
    ...d.fields.filter((f) => !f.required).map((f) => `\t\t// '${f.name}' => ${sample(f)}, // optional: ${note(f)}`),
    `\t) ),`,
  ] : [];
  const header = ['// WordPress, WP Engine AI plugin connected (Connect in WP Admin): no API key.'];
  if (vars.length) header.push(`// Path parameters: ${vars.map((v) => `$${v}`).join(', ')}.`);
  if (d.binary) {
    // wpe_auth_api_request() JSON-decodes the body, so binary responses (audio) are fetched with the site token.
    return [...header, `// The response is binary (${d.responses[Object.keys(d.responses).find((c) => c.startsWith('2'))].contentTypes.join(', ')}), so send the site token yourself.`,
      '$token = wpe_auth_get_token();', 'if ( is_wp_error( $token ) ) {', '\treturn $token; // Not connected.', '}',
      `$response = wp_remote_request( ${url}, array(`, `\t'method'  => '${o.method}',`,
      `\t'headers' => array( 'Authorization' => 'Bearer ' . $token, 'Content-Type' => 'application/json' ),`, ...body, `\t'timeout' => 60,`, ') );',
      "if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {", "\treturn new WP_Error( 'ai_request_failed', 'The Cloud AI API request failed.' );", '}',
      '$bytes = wp_remote_retrieve_body( $response ); // Save with wp_upload_bits() or stream it to the browser.'].join('\n');
  }
  return [...header, `$response = wpe_auth_api_request( ${url}, array(`, `\t'method'  => '${o.method}',`,
    ...(d.fields.length ? [`\t'headers' => array( 'Content-Type' => 'application/json' ),`] : []), ...body, `\t'timeout' => 60,`, ') );',
    'if ( is_wp_error( $response ) ) {', '\treturn $response; // Not connected, or the request failed.', '}',
    "// $response['status'] is the HTTP status; $response['body'] is the decoded JSON" + (d.responses['200']?.fields ? ` (${d.responses['200'].fields.join(', ')}).` : '.')].join('\n');
}

export function howToCall(o, components) {
  const t = tag(o);
  if (PUBLIC.has(o.operationId)) return { auth: 'none', summary: 'Public: no credentials needed. Call it from anywhere.' };
  if (t === 'Sites') return { auth: 'site-oauth', summary: 'Called by the WP Engine AI plugin itself with the site\'s OAuth credentials when the user clicks Connect. Do not call it from your code.' };
  if (t === 'Analytics' || t === 'Credits') return { auth: 'account-login', summary: 'Account login only (WP Engine User Portal). Neither the site connection nor an API key can call it.' };
  const d = describeOperation(o, components);
  return {
    auth: 'site-connection',
    summary: 'Default: call it from WordPress with the site connection, no API key. Use `wpe_auth_api_request()` (WP Engine AI plugin) from a capability- or nonce-checked REST route; a custom app (Node) calls that route with an application password.'
      + (d.binary ? ' The response is binary, so the snippet sends the site token from `wpe_auth_get_token()` with `wp_remote_request()`.' : '')
      + (BROWSER.has(o.operationId) ? ' For interactive features the browser may call it directly with a short-lived browser session token (blueprint wpe-ai-plugins, section 4).' : '')
      + ' Use an API key only for code that runs outside WordPress and cannot call a WordPress route.',
    php: phpSnippet(o, d),
  };
}
