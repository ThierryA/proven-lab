// Real WordPress run (opt-in: WP_REAL=1). Boots WordPress in WordPress Playground, installs the headless blueprint's
// must-use plugins verbatim, and verifies the Core Runtime API behaves as the docs claim.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { blueprintBlocks } from './helpers.mjs';

const enabled = process.env.WP_REAL === '1';
const PORT = Number(process.env.WP_PORT) || 9411;
let proc, base;

const phpBlocks = blueprintBlocks().filter((b) => b.file === 'custom-app.md' && b.lang === 'php').map((b) => b.code);
const model = '<?php\n' + phpBlocks.find((c) => c.includes('register_post_type'));
const abilities = '<?php\n' + phpBlocks.find((c) => c.includes('wp_register_ability('));

const DIAG = `<?php
$GLOBALS['diag'] = [];
add_action( 'doing_it_wrong_run', function ( $f, $m ) { $GLOBALS['diag'][] = "$f: $m"; }, 10, 2 );
add_filter( 'doing_it_wrong_trigger_error', '__return_false' );
`;
const VERIFY = `<?php
require __DIR__ . '/wp-load.php';
function call( $method, $route, $body = null ) {
	$r = new WP_REST_Request( $method, $route );
	if ( $body ) { $r->set_header( 'content-type', 'application/json' ); $r->set_body( wp_json_encode( $body ) ); }
	return rest_do_request( $r );
}
$o = [ 'wp' => get_bloginfo( 'version' ) ];
$o['post_type']  = post_type_exists( 'project' );
$o['taxonomy']   = taxonomy_exists( 'project_status' );
$o['post_meta']  = array_keys( get_registered_meta_keys( 'post', 'project' ) );
$o['user_meta']  = array_keys( get_registered_meta_keys( 'user' ) );
wp_set_current_user( 1 );
$res = call( 'POST', '/wp/v2/projects', [ 'title' => 'Smoke', 'status' => 'publish', 'meta' => [ 'budget' => 1200 ] ] );
$d = $res->get_data(); $id = $d['id'] ?? 0;
$o['create'] = $res->get_status(); $o['rest_meta'] = $d['meta'] ?? null;
$o['schema_has_meta'] = isset( call( 'OPTIONS', '/wp/v2/projects' )->get_data()['schema']['properties']['meta'] );
$u = call( 'POST', '/wp/v2/users/me', [ 'meta' => [ 'job_title' => 'CTO' ] ] );
$o['user_meta_update'] = $u->get_status(); $o['user_meta_value'] = $u->get_data()['meta']['job_title'] ?? null;
$o['abilities'] = function_exists( 'wp_get_abilities' ) ? array_map( fn( $a ) => $a->get_name(), array_values( wp_get_abilities() ) ) : null;
$ability = function_exists( 'wp_get_ability' ) ? wp_get_ability( 'app/archive-project' ) : null;
$o['ability_registered'] = (bool) $ability;
if ( $ability ) { $ex = $ability->execute( [ 'id' => $id ] ); $o['ability_result'] = is_wp_error( $ex ) ? $ex->get_error_message() : $ex; clean_post_cache( $id ); $o['status_after'] = get_post_status( $id ); }
$ab = call( 'POST', '/wp-abilities/v1/abilities/app/archive-project/run', [ 'input' => [ 'id' => $id ] ] );
$o['ability_rest_status'] = $ab->get_status();
wp_set_current_user( 0 );
$o['anon_create'] = call( 'POST', '/wp/v2/projects', [ 'title' => 'x' ] )->get_status();
$o['anon_ability_rest_status'] = call( 'POST', '/wp-abilities/v1/abilities/app/archive-project/run', [ 'input' => [ 'id' => $id ] ] )->get_status();
$o['diag'] = $GLOBALS['diag'];
echo 'RESULT:' . wp_json_encode( $o );
`;

let result;
before(async () => {
  if (!enabled) return;
  const bp = { preferredVersions: { php: '8.3', wp: 'latest' }, steps: [
    { step: 'writeFile', path: '/wordpress/wp-content/mu-plugins/000-diag.php', data: DIAG },
    { step: 'writeFile', path: '/wordpress/wp-content/mu-plugins/app-model.php', data: model },
    { step: 'writeFile', path: '/wordpress/wp-content/mu-plugins/app-abilities.php', data: abilities },
    { step: 'writeFile', path: '/wordpress/verify.php', data: VERIFY },
  ] };
  const file = join(mkdtempSync(join(tmpdir(), 'provenlab-wp-')), 'blueprint.json');
  writeFileSync(file, JSON.stringify(bp));
  proc = spawn('npx', ['-y', '@wp-playground/cli@latest', 'server', `--blueprint=${file}`, `--port=${PORT}`], { stdio: 'ignore', detached: true });
  base = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const body = await fetch(`${base}/verify.php`).then((r) => r.text()).catch(() => '');
    if (body.includes('RESULT:')) { result = JSON.parse(body.slice(body.indexOf('RESULT:') + 7)); return; }
    if (body && !body.includes('not ready') && i > 5) throw new Error('verify.php failed: ' + body.replace(/<[^>]+>/g, ' ').slice(0, 400));
  }
  throw new Error('WordPress Playground did not become ready');
}, { timeout: 420000 });
after(() => { if (proc) try { process.kill(-proc.pid); } catch {} });

const t = (name, fn) => test(name, { skip: !enabled && 'set WP_REAL=1 to run against a real WordPress' }, fn);

t('custom-app model registers on a real WordPress', () => {
  assert.equal(result.post_type, true);
  assert.equal(result.taxonomy, true);
  assert.ok(result.post_meta.includes('budget'));
  assert.ok(result.user_meta.includes('job_title'), 'user meta registered via register_meta(user)');
});

t('REST exposes registered meta and the schema for form generation', () => {
  assert.equal(result.create, 201);
  assert.deepEqual(result.rest_meta, { budget: 1200 });
  assert.equal(result.schema_has_meta, true);
  assert.equal(result.user_meta_update, 200);
  assert.equal(result.user_meta_value, 'CTO');
});

t('capabilities are enforced by WordPress, not the UI', () => {
  assert.equal(result.anon_create, 401);
});

t('the Abilities blueprint registers and executes', () => {
  assert.ok(result.ability_registered, `ability not registered; registered: ${JSON.stringify(result.abilities)}; diag: ${JSON.stringify(result.diag)}`);
  assert.deepEqual(result.ability_result, { archived: true });
  assert.equal(result.status_after, 'archived', 'the ability really changed the post status');
  assert.equal(result.ability_rest_status, 200);
  assert.ok([401, 403].includes(result.anon_ability_rest_status), `anon ability status ${result.anon_ability_rest_status}`);
});
