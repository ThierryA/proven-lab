---
nav: "AI features (no API key)"
title: "AI features: the WP Engine AI plugins, no API key"
summary: "The default way to add AI to a WordPress site: install the WP Engine AI plugins, connect the site once in WP Admin, and every AI feature (PHP, frontend chat, agents, search over content) uses the site's connection instead of an API key."
agent_does:
  - "Installs the WP Engine AI plugins."
  - "Adds the AI features you asked for (chat, dictation, summaries, search) with no API key."
you_do:
  - "Click Connect once in WP Admin and sign in to WP Engine."
---

# AI features: the WP Engine AI plugins, no API key

> **Runbook step 4 · AI,** the default for every AI feature on a WordPress site. Code that runs outside WordPress: `ai-features`. **Next:** step 5, `wp-cli-for-agents`.

Use these plugins by default for every AI feature on a WordPress site. The site connects to the Cloud AI API once; after that, PHP code, the frontend chat widget and agents get short-lived credentials from that connection. Nobody creates, stores or rotates an API key.

## 1. Install

WordPress 7.0 or newer (the connector uses the core AI Client). Install the hub first; the others need it:

```bash
wp plugin install "https://wp-product-info.wpesvc.net/v1/plugins/wpe-hub?download" --activate
wp plugin install "https://wp-product-info.wpesvc.net/v1/plugins/wpe-ai-connector?download" --activate
wp plugin install "https://wp-product-info.wpesvc.net/v1/plugins/wpe-ai-chatbot?download" --activate
wp plugin install "https://wp-product-info.wpesvc.net/v1/plugins/power-coworker?download" --activate
```

| Plugin (slug) | Name in WP Admin | Install when |
|---|---|---|
| `wpe-hub` | WP Engine AI | Always: the site connection, knowledge base sync and ready-made Abilities (`wp-engine-ai/*`) |
| `wpe-ai-connector` | WP Engine AI Connector | Always: the `wpengine` provider for `wp_ai_client_prompt()` (text, images, text to speech) |
| `wpe-ai-chatbot` | WP Engine AI Chatbot | The site needs a visitor-facing chat |
| `power-coworker` | WP Engine AI Coworker | Editors want AI agents in WP Admin that act on the site |

In Local, run these in the site shell or use Local's MCP tools (`wp_plugin_install`, `wp_plugin_activate`). On a hosted site, use the WP Engine MCP server's sandbox (`wpengine-cloud`).

## 2. Connect the site (once, by a person)

An administrator opens **WP Engine AI** in WP Admin (`/wp-admin/admin.php?page=power-overview`), clicks **Connect**, signs in with their WP Engine account and picks a project. This step cannot be automated: there is no WP-CLI command or constant for it. Ask the user to do it, then check:

```bash
wp eval 'var_dump( function_exists( "wpe_auth_is_connected" ) && wpe_auth_is_connected() );'
```

The connection is tied to the site URL: a copied or migrated site has to connect again.

## 3. Use it

| Need | Do this (no API key) |
|---|---|
| Text, images or speech from PHP | `wp_ai_client_prompt()` with the `wpengine` provider (below) |
| A chat for visitors | WP Engine AI Chatbot: enable it in **WP Engine AI → Chatbot**; it appears as a floating widget, a side panel, or the `power-chatbot/embedded-chatbot` block |
| An interactive AI feature in the browser (assistant, Q&A, guided form) | **Browser talks to the Cloud AI API directly** with a short-lived session token, like the chatbot (section 4) |
| A one-shot AI result tied to WordPress data (summary on save, alt text, title suggestion) | Server side: the connector from PHP (below), or your own REST route that calls it |
| AI from a custom app (Node) | The token never leaves WordPress: give the app a WordPress REST route that calls the connector, and call it with an application password |
| Search over the site's content | Turn on knowledge base sync (below); ground agents in it, as the chatbot and Coworker do |
| Agents that act on the site | WP Engine AI Coworker in WP Admin, or the hub's `wp-engine-ai/*` Abilities through the WP Engine MCP server |
| Speech to text, alt text, summaries, taxonomy suggestions, knowledge base, agents: any other Cloud AI API endpoint | `wpe_auth_api_request()` from a WordPress route, with the site connection (sections 5 and 6) |

### Text from PHP

```php
$text = wp_ai_client_prompt( 'Write a two-sentence summary of: ' . $content )
	->using_provider( 'wpengine' )
	->generate_text();
if ( is_wp_error( $text ) ) {
	// Not connected, request not allowed (see below), or the request failed.
}
```

Default models are set in **Settings → Connectors → WP Engine AI Connector** (text, image, text to speech); `wpe_ai_connector_resolve_model_for( 'text_generation' )` returns the configured one.

**Who may make requests:** by default logged-in users who can `edit_posts`, WP-CLI and cron. Anonymous visitors are refused. To serve visitors, allow it only inside your own route, never globally:

```php
add_action( 'rest_api_init', function () {
	register_rest_route( 'my-app/v1', '/suggest', array(
		'methods'             => 'POST',
		'permission_callback' => fn( WP_REST_Request $r ) => (bool) wp_verify_nonce( (string) $r->get_header( 'x_wp_nonce' ), 'wp_rest' ),
		'args'                => array( 'text' => array( 'type' => 'string', 'required' => true, 'maxLength' => 2000 ) ),
		'callback'            => function ( WP_REST_Request $r ) {
			$allow = static fn() => true;
			add_filter( 'wpe_ai_connector_authorize_request', $allow );
			$text = wp_ai_client_prompt( 'Suggest a title for: ' . $r['text'] )->using_provider( 'wpengine' )->generate_text();
			remove_filter( 'wpe_ai_connector_authorize_request', $allow );
			return is_wp_error( $text ) ? $text : array( 'title' => $text );
		},
	) );
} );
```

Add your own rate limit (for example a transient per visitor) before calling the model: these requests spend the site's credits.

### Knowledge base sync

Off by default. Turn it on in **WP Engine AI** (or with the chatbot's or Coworker's knowledge base toggle), or as an administrator over REST: `POST /wp-json/wpe-kb/v1/settings` with `{"enabled": true}`. Published posts are then indexed and kept in sync on save, trash and delete. Choose post types with the `wpe/knowledgebase/indexed_post_types` filter and shape documents with `wpe/knowledgebase/document`.

## 4. Let the browser call the Cloud AI API directly

Do not route every AI request through your server. For interactive features, do what the WP Engine AI Chatbot does: the server creates an agent session once and mints a short-lived **browser session token**; the browser then sends and reads messages straight from the Cloud AI API. The API key or site credential never reaches the browser, and the server is not in the path of each message.

The chatbot does not use the connector. It uses the agents library that ships inside the WP Engine AI plugin (`\WPE\AI\Agents\Plugin::instance()`): `agents()` and `sessions()`.

**What a browser token can do:** only send and list events in its own session (`session_events: write`), for one agent, from the allowed origins, until it expires (10 minutes and 30 requests per minute by default). It cannot call chat completions, transcription or anything else, so one-shot generation and transcription stay on the server.

Server: create the agent once, then a nonce-protected, rate-limited route that starts a session and mints the token:

```php
add_action( 'rest_api_init', function () {
	register_rest_route( 'my-app/v1', '/assistant/session', array(
		'methods'             => 'POST',
		'permission_callback' => fn( WP_REST_Request $r ) => (bool) wp_verify_nonce( (string) $r->get_header( 'x_wp_nonce' ), 'wp_rest' ),
		'callback'            => function () {
			$ai       = \WPE\AI\Agents\Plugin::instance();
			$agent_id = get_option( 'my_app_agent_id' );
			if ( ! $agent_id ) { // Once: the model must support tools.
				$agent = $ai->agents()->create( array( 'name' => 'My app assistant', 'model' => 'google/gemini-3.5-flash', 'system_prompt' => 'Answer questions about this site.' ), 'my-app' );
				if ( is_wp_error( $agent ) ) {
					return $agent;
				}
				$agent_id = $agent['id'];
				update_option( 'my_app_agent_id', $agent_id, false );
			}
			$user    = is_user_logged_in() ? 'user-' . get_current_user_id() : wpe_auth_get_anonymous_user_id();
			$session = $ai->sessions()->create( array( 'agent' => $agent_id, 'owner_id' => $user ), 'my-app' );
			if ( is_wp_error( $session ) ) {
				return $session;
			}
			$token = $ai->sessions()->mint_browser_session( array(
				'user'                    => $user,
				'agent_id'                => $agent_id,
				'allowed_origins'         => array( untrailingslashit( home_url() ) ),
				'expires_at'              => time() + 600,
				'max_requests_per_minute' => 10,
				'is_anonymous'            => ! is_user_logged_in(),
			), 'my-app/1.0' );
			if ( is_wp_error( $token ) ) {
				return $token;
			}
			return array( 'session_id' => $session['id'], 'token' => $token['token'], 'expires_at' => $token['expires_at'] );
		},
	) );
} );
```

Browser: get a token, then talk to the API directly:

```js
const { session_id, token } = await fetch('/wp-json/my-app/v1/assistant/session', {
  method: 'POST', headers: { 'X-WP-Nonce': wpApiSettings.nonce },
}).then((r) => r.json());

const events = `https://api.ai.wpengine.com/v1/sessions/${session_id}/events`;
await fetch(events, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ events: [{ type: 'user.message', content: [{ type: 'text', text: question }] }] }),
});
// Then GET the same URL with the same header until a session.status_idle event arrives,
// and render the agent.message events. Ask the server for a new token when it expires.
```

Rate-limit the session route per visitor (the chatbot allows 10 mints a minute) and keep the token's lifetime short. To ground the agent in the site's content, enable knowledge base sync and give the agent knowledge base grounding.

**Choosing:**

| Request | Where it runs |
|---|---|
| A conversation with an agent (chat, assistant, Q&A over the site) | Browser, with a browser session token |
| One-shot generation tied to WordPress data, or writes to WordPress | Server: the connector (`wp_ai_client_prompt()`) |
| Speech to text, images, anything a browser token cannot call | Server |

## 5. Call any Cloud AI API endpoint from PHP, no API key

The connector covers text, images and text to speech through the AI Client. **Everything else in the Cloud AI API is one function away:** the WP Engine AI plugin exposes `wpe_auth_api_request( $url, $args )`. It takes the same arguments as `wp_remote_request()`, adds the site's bearer token, retries once with a fresh token on `401` or `403`, and returns `array( 'status' => int, 'body' => array )` (the JSON already decoded) or a `WP_Error`.

```php
if ( ! function_exists( 'wpe_auth_api_request' ) || ! wpe_auth_is_connected() ) {
	return new WP_Error( 'ai_not_connected', 'Connect the site in WP Admin → WP Engine AI.', array( 'status' => 503 ) );
}
$response = wpe_auth_api_request( 'https://api.ai.wpengine.com/v1/content/summarize', array(
	'method'  => 'POST',
	'headers' => array( 'Content-Type' => 'application/json' ),
	'body'    => wp_json_encode( array( 'content' => $post->post_content ) ),
	'timeout' => 60,
) );
```

Every gateway operation (`createChatCompletion`, `createImageGeneration`, `createSpeech`, `createTranscription`, `createImageAltText`, `summarizeContent`, `suggestTaxonomy`), the knowledge base and agents and sessions work this way. Look up the request body with `get_ai_operation <operationId>`: its `howToCall` field gives the ready PHP call. Not callable with the site connection: analytics and credits (account login only) and the site connection operations (the plugin calls them itself).

Rules: call it only from a capability- or nonce-checked REST route, Ability, cron job or WP-CLI command; never expose it as an open proxy; rate-limit anything visitors can trigger, because requests spend the site's credits. A custom app (Node) calls your WordPress route with an application password, so the token never leaves WordPress. Other helpers: `wpe_auth_is_connected()`, `wpe_auth_get_project_id()`.

## 6. Speech to text (dictation, voice notes)

Transcription works with the site connection, no API key. The browser records audio (`MediaRecorder`, see `ai-features` Pattern 6) and posts the raw bytes to a WordPress route; the route sends them to `createTranscription` (base64 `audio`, `mime_type`, optional `language`; WAV, MP3, OGG, WebM or FLAC up to 25 MiB) and returns `{"text": "..."}`:

```php
add_action( 'rest_api_init', function () {
	register_rest_route( 'my-app/v1', '/transcribe', array(
		'methods'             => 'POST',
		'permission_callback' => fn() => current_user_can( 'edit_posts' ),
		'callback'            => function ( WP_REST_Request $request ) {
			$audio = $request->get_body();
			if ( '' === $audio || strlen( $audio ) > 25 * MB_IN_BYTES ) {
				return new WP_Error( 'invalid_audio', 'Send 1 byte to 25 MiB of audio.', array( 'status' => 400 ) );
			}
			$response = wpe_auth_api_request( 'https://api.ai.wpengine.com/v1/audio/transcriptions', array(
				'method'  => 'POST',
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode( array(
					'audio'     => base64_encode( $audio ),
					'mime_type' => strtok( (string) $request->get_header( 'content-type' ), ';' ),
				) ),
				'timeout' => 60,
			) );
			if ( is_wp_error( $response ) ) {
				return $response; // Not connected, or the request failed.
			}
			return new WP_REST_Response( $response['body'], $response['status'] ); // { text, model }
		},
	) );
} );
```

A custom app's server forwards the recording to this route with an application password. Do not use the browser's Web Speech API unless the user asks for it.

## When an API key is still needed

Only for code outside WordPress that cannot call a WordPress route. Analytics and credits need an account login. Then follow `ai-features`.
