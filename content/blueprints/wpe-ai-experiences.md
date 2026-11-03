---
title: AI experiences with the WP Engine AI API
summary: Wire the WP Engine AI API (gateway, knowledge base, agents, sessions, site connector, MCP) into a WordPress-backed app, from PHP and from Node.
---

# AI experiences: WordPress + WP Engine AI API

Base URL `https://api.ai.wpengine.com/v1`. OpenAI-compatible chat completions; also an Anthropic-style `/v1/messages`. Authoritative spec: `openapi.yaml` in this kit (synced from the live spec). Look up any operation with the MCP tool `get_wpe_operation`.

## Capabilities and where they map

| WP Engine AI API | Operations | WordPress side |
|---|---|---|
| **AI Gateway** | `createChatCompletion`, `createMessage`, `createImageGeneration`, `createImageAltText`, `summarizeContent`, `suggestTaxonomy`, `createSpeech`, `createTranscription`, `listModels` | `wp_ai_client_prompt()` (WP 7.0+ AI Client) via the connector, or direct HTTP |
| **Knowledge Base** | `createCollection`, `indexDocument`, `bulkIndexDocuments`, `searchCollection`, `deleteDocument` | sync content from `save_post`, `transition_post_status`, `delete_post` |
| **Agents / Sessions** | `createAgent`, `createSession`, `sendSessionEvents`, `listSessionEvents`, `createResponseFeedback` | chat UI in Node or a block |
| **Site connector** | `registerSite`, `heartbeatSite`, `updateSitePrimaryCollection` | registers the WordPress site, sets its primary KB collection |
| **MCP server** | `POST/GET/DELETE /v1/mcp` (streamable HTTP, OAuth) | lets Claude Code / Desktop use the site's knowledge |
| **Usage** | `getCredits`, `getAnalytics` | admin dashboard in Node |

## Auth

Bearer token. `wpe_` = account key (service-to-service), `wpe_pat_` = user key. Keys have scopes (Chat, Image, Speech, Transcribe, MCP) at read/write. **Keep keys server-side.** For browsers, mint short-lived `wpbs_` tokens from your server (the spec's auth notes name `POST /v1/browser/client_secret`; it is not in the published path list yet, so verify against the live docs) instead of shipping a key. `/v1/models` is public.

## Pattern 1: gateway from Node (any OpenAI client works)

```js
import OpenAI from 'openai';
const ai = new OpenAI({ baseURL: 'https://api.ai.wpengine.com/v1', apiKey: process.env.WPE_AI_KEY });
const r = await ai.chat.completions.create({
  model: 'google/gemini-3.5-flash',            // discover ids via GET /v1/models
  messages: [{ role: 'user', content: 'Summarize this post: ...' }],
});
```

Responses, Embeddings and legacy Completions APIs are not supported; use Chat Completions or `/v1/messages`.

## Pattern 2: gateway from PHP inside WordPress

On WordPress 7.0+, call models through the core AI Client and let the site owner configure the WP Engine connector under Settings → Connectors. Check `wp_ai_client_prompt` and `wp_get_connectors` with `get_function`.

```php
$text = wp_ai_client_prompt( 'Write an excerpt for: ' . $content )->generate_text();
```

The builder (`WP_AI_Client_Prompt_Builder`) forwards fluent calls to the underlying PHP AI Client, and `using_abilities()` lets the model call your registered Abilities as tools. Confirm the exact fluent methods with `get_function wp_ai_client_prompt` and the class docs for the installed version. Honour `wp_ai_client_prevent_prompt`.

## Pattern 3: RAG over site content

1. Create a collection (`createCollection`) and register the site with it (`registerSite`, `updateSitePrimaryCollection`).
2. Initial load with `bulkIndexDocuments`, mapping WP posts to documents (id = post ID, text = `wp_strip_all_tags( $post->post_content )`, metadata = permalink, type, terms).
3. Keep in sync:

```php
add_action( 'save_post', function ( $id, $post ) {
	if ( wp_is_post_revision( $id ) || 'publish' !== $post->post_status ) return;
	wp_remote_post( WPE_AI_BASE . "/kb/collections/" . WPE_AI_COLLECTION . "/documents", [
		'headers' => [ 'Authorization' => 'Bearer ' . WPE_AI_KEY, 'Content-Type' => 'application/json' ],
		'body'    => wp_json_encode( [ /* document per getOperation schema */ ] ),
		'timeout' => 15,
	] );
}, 10, 2 );
add_action( 'before_delete_post', fn( $id ) => /* deleteDocument */ null );
```

Do heavy sync in a scheduled event (`wp_schedule_single_event`) rather than inline on save for large sites. Check the exact document body in `get_wpe_operation indexDocument`.

4. Query with `searchCollection` from Node or PHP and feed hits into chat completion as context.

## Pattern 4: agent + sessions for a chat experience

`createAgent` (instructions, model, KB collections, tools) then per visitor `createSession`, `sendSessionEvents`, and stream/poll `listSessionEvents`. Collect thumbs up/down with `createResponseFeedback`. Authenticate the browser with a short-lived `wpbs_` token.

## Pattern 5: expose WordPress to agents

Two complementary directions:
- **Site → agents**: register Abilities (`wp_register_ability`) and expose them with the WordPress MCP Adapter (`mcp_adapter_init`), so external agents can act on the site. Abilities are private unless marked public.
- **Knowledge → agents**: the WP Engine AI MCP server (`/v1/mcp`) serves the indexed knowledge to Claude Code/Desktop over OAuth.

## Cheap wins using purpose-built endpoints
- `createImageAltText` on `add_attachment`.
- `suggestTaxonomy` in an editor-side "suggest tags" action (ability).
- `summarizeContent` for excerpts and meta descriptions.
