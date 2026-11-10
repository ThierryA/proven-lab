---
nav: "Custom app (headless)"
title: "Build: custom app (Headless Frontend, Headless Admin, or both)"
summary: WordPress keeps running and does the work. Your custom app (for example Node) runs separately and owns the admin, the frontend, or both, using WordPress over the REST API and the Abilities API. Covers the three headless setups.
agent_does:
  - "Builds the data model in a WordPress plugin."
  - "Builds your own admin and/or frontend app that talks to WordPress securely."
you_do:
  - "Nothing, unless the agent asks a question about what you want."
---

# Build: custom app (Headless Frontend, Headless Admin, or both)

> **Runbook step 3 · Build,** for any headless setup. **Next:** step 4, `wpe-ai-plugins` if the app needs AI; otherwise step 5, `wp-cli-for-agents`.

**Admin:** custom app or WP Admin · **Frontend:** custom app or WordPress templating · **Deploy:** WordPress + your app.

**Prompt this blueprint answers:** "Create me a Node application that uses WordPress as the backend, with its own admin and frontend."

- **Headless Frontend + Admin:** follow every step.
- **Headless Frontend** (WP Admin stays): skip step 3; editors keep using WP Admin.
- **Headless Admin** (WordPress templating stays): do step 3 and render the frontend with templates (`classic-wordpress`, step 2) instead of step 5.

## Architecture

```
Browser ──► Node app (Hono / Express / Next.js / Astro SSR)
              ├─ /admin/*   custom admin UI (auth'd users)  ──┐
              └─ /*         public frontend (SSR / ISR)     ──┤  server-side only
                                                              ▼
                                   WordPress (REST API + Abilities API + Core API)
                                   └─ plugin "app" defines the schema
```

WordPress provides the data model, users, roles and capabilities, request validation against schemas, hooks, media handling and cron. Node provides the UI, routing and rendering. Credentials for WordPress live **only on the Node server**.

## 1. Define the data model in PHP (a plugin)

Start from `get_template` with `plugin` and the app's slug: a regular plugin with a prefixed post type, registered meta, a REST route and an Ability. Everything the Node app needs must be exposed to REST there, because REST exposure is opt-in.

Rules that trip agents up:
- `show_in_rest => true` is **required** on post types, taxonomies and meta, or they are not in the REST API.
- Post meta only appears in a post type's REST responses if the post type supports `custom-fields`.
- A meta key must be registered with `show_in_rest` before the REST API reads or writes it.
- Register on `init`. Flush rewrite rules once, never on every request: `wp rewrite flush`, or an activation callback that registers the post types first and then calls `flush_rewrite_rules()` (the plugin template does this).
- `add_role()` and `WP_Role::add_cap()` write to the database. Run them once (`wp role create`, `wp cap add`, or a regular plugin's activation hook), not on every `init`.

## 2. Authentication from Node

Use **Application Passwords** (core, over HTTPS or on a `local` environment), sent as HTTP Basic auth from the server only. `get_template` with `headless-client` gives a typed client.

- **Server tasks and public reads:** a dedicated service user with a least-privilege role (only the capabilities the server needs, never an administrator). Create its password with `wp user application-password create <service-user> <app-name> --porcelain` and keep it in the server's environment.
- **Actions by signed-in users** (the custom admin): each user authorizes your app once with core's flow, so WordPress checks *their* capabilities on every request. Send them to `<WP_URL>/wp-admin/authorize-application.php?app_name=<App>&app_id=<uuid>&success_url=<https callback>`; after approval WordPress redirects to the callback with `site_url`, `user_login` and `password`. Store that password server-side (encrypted, tied to your session) and call the REST API as that user.
- Never one shared credential for everyone, never a custom login route, and never a credential in browser code.

`GET /wp/v2/users/me?context=edit` returns the user's roles and capabilities: use them to show or hide UI; WordPress enforces the real checks.

## 3. The admin UI is CRUD over REST

| Admin feature | WordPress endpoint |
|---|---|
| List/search/filter content | `GET /wp/v2/projects?status=any&per_page=20&_fields=id,title,meta` (add `search=`, taxonomy filters as needed) |
| Create / update / trash | `POST /wp/v2/projects`, `POST /wp/v2/projects/{id}`, `DELETE /wp/v2/projects/{id}` |
| Terms | `/wp/v2/project_status` |
| Media upload | `POST /wp/v2/media` with the file as the raw body, `Content-Type` set to its MIME type (override the helper's JSON default) and `Content-Disposition: attachment; filename=...`; or `multipart/form-data` with a `file` field |
| Users | `/wp/v2/users` (needs `list_users`/`create_users` caps) |
| Site settings | `/wp/v2/settings` (only options registered with `register_setting(..., show_in_rest)`) |
| Custom actions | Abilities: `POST /wp-abilities/v1/abilities/<namespace>/<ability>/run` with body `{"input": {...}}`; read-only abilities use `GET` with `?input=`, destructive and idempotent ones `DELETE` |

Build forms from the API: `OPTIONS /wp/v2/projects` returns the item schema and, under `endpoints`, the arguments each method accepts. Use the `POST` arguments for create and update forms. Generate form fields from that and your UI stays in sync with the PHP model.

## 4. Custom actions as Abilities (not ad-hoc endpoints)

For anything beyond CRUD ("archive a project", "generate a summary"), register an ability. It has an input and output schema, a permission check, is discoverable by agents and callable from Node over REST.

```php
add_action( 'wp_abilities_api_categories_init', fn() => wp_register_ability_category( 'app', [ 'label' => 'App', 'description' => 'Application actions.' ] ) );
add_action( 'wp_abilities_api_init', function () {
	wp_register_ability( 'app/archive-project', [
		'label'               => 'Archive project',
		'description'         => 'Sets a project to the archived status.',
		'category'            => 'app',
		'input_schema'        => [ 'type' => 'object', 'properties' => [ 'id' => [ 'type' => 'integer' ] ], 'required' => [ 'id' ] ],
		'output_schema'       => [ 'type' => 'object', 'properties' => [ 'archived' => [ 'type' => 'boolean' ] ] ],
		'execute_callback'    => function ( $input ) {
			$result = wp_update_post( [ 'ID' => $input['id'], 'post_status' => 'archived' ], true );
			return [ 'archived' => ! is_wp_error( $result ) ];
		},
		'permission_callback' => fn( $input ) => current_user_can( 'edit_post', $input['id'] ),
		'meta'                => [ 'show_in_rest' => true ],
	] );
} );
```

`meta.show_in_rest` exposes the ability through the REST API. Check `get_function wp_register_ability` for the arguments your WordPress version accepts.

## 5. Frontend rendering

Design the admin and the frontend with `frontend-design`: tokens, one component library, every state, screenshot review.

- **SSR/ISR** from Node: fetch `GET /wp/v2/projects?slug=...&_embed` and render. Use `_fields` to cut payload size.
- **Block content**: `content.rendered` is already HTML. For custom rendering use `?context=edit` and `content.raw`, then parse it on Node with `@wordpress/block-serialization-default-parser`.
- **Cache invalidation**: add a `save_post` / `transition_post_status` hook in PHP that calls `wp_remote_post()` to a Node `/revalidate` webhook.
- **Previews**: authenticated `GET /wp/v2/projects/<id>?context=edit` returns drafts and private posts; unsaved changes to a published post are in `GET /wp/v2/projects/<id>/autosaves`.

## 6. Project layout

```
wp-content/plugins/<slug>/   # the WordPress plugin (get_template plugin)
app/                         # the Node app
  src/lib/wp.ts              # server-side REST client (get_template headless-client)
  .env                       # WP_URL, WP_USER, WP_APP_PASSWORD (server only, not committed)
```

## Checklist before declaring done
1. `GET /wp-json/wp/v2/<rest_base>` returns the post type with its registered meta.
2. Node can create, edit, trash and upload media as a signed-in user, and the service user cannot do more than it needs.
3. A non-admin user hits a 403 on an admin-only action (capabilities are enforced by WordPress, not the UI).
4. No WordPress credentials in browser-delivered code.
