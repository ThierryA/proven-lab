---
nav: "Custom app (headless)"
title: "Build: custom app (Headless Frontend, Headless Admin, or both)"
summary: WordPress keeps running and does the work. Your custom app (for example Node) runs separately and owns the admin, the frontend, or both, using WordPress over the REST API and the Abilities API. Covers the three headless setups.
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

Put this in a regular plugin, `wp-content/plugins/app/app.php`, and activate it with `wp plugin activate app`. Not a must-use plugin: a plugin can be deactivated, has activation hooks and passes Plugin Check. Everything the Node app needs must be exposed to REST here, because REST exposure is opt-in.

Core APIs used (see `get_function` in the MCP server for full signatures): `register_post_type`, `register_post_status`, `register_taxonomy`, `register_post_meta`, `register_meta` (object type `user` for user meta), `register_setting`.

```php
/**
 * Plugin Name: App
 * Description: Data model, Abilities and routes for the app.
 * Requires at least: 6.9
 * Requires PHP: 8.1
 */

add_action( 'init', function () {
	register_post_type( 'project', [
		'label'        => 'Projects',
		'public'       => true,
		'show_in_rest' => true,                 // exposes /wp/v2/projects (see rest_base)
		'supports'     => [ 'title', 'editor', 'thumbnail', 'custom-fields', 'excerpt' ], // custom-fields: required for meta in REST
		'rest_base'    => 'projects',
	] );

	register_post_status( 'archived', [
		'label'  => 'Archived',
		'public' => false,
	] );

	register_taxonomy( 'project_status', 'project', [
		'hierarchical' => false,
		'show_in_rest' => true,
	] );

	register_post_meta( 'project', 'budget', [
		'type'         => 'number',
		'single'       => true,
		'show_in_rest' => true,                 // exposes it in the `meta` field
		'auth_callback' => fn() => current_user_can( 'edit_posts' ),
	] );

	// User meta is registered through register_meta() with object type 'user'.
	register_meta( 'user', 'job_title', [
		'type'         => 'string',
		'single'       => true,
		'show_in_rest' => true,
	] );
} );
```

Rules that trip agents up:
- `show_in_rest => true` is **required** on post types, taxonomies and meta, or they are not in the REST API.
- Post meta only appears in a post type's REST responses if the post type supports `custom-fields`.
- A meta key must be registered with `show_in_rest` before the REST API reads or writes it.
- Register on `init`. Flush rewrite rules once after adding or changing a post type (`wp rewrite flush`), never on every request: `wp rewrite flush`, or `register_activation_hook( __FILE__, 'flush_rewrite_rules' )` after registering the post type in the same callback.
- `add_role()` and `WP_Role::add_cap()` write to the database. Run them once (`wp role create`, `wp cap add`, or a regular plugin's activation hook), not on every `init`.

## 2. Authentication from Node

Use **Application Passwords** (core since WordPress 5.6; available over HTTPS, or on any site whose environment type is `local`). Create one for a dedicated service user with `wp user application-password create`, the user's profile screen, or `POST /wp/v2/users/<id>/application-passwords`, and send it as HTTP Basic auth:

```js
const auth = 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');
const wp = (path, init = {}) =>
  fetch(`${WP_URL}/wp-json${path}`, { ...init, headers: { Authorization: auth, 'Content-Type': 'application/json', ...init.headers } });
```

For **end-user login in your Node admin**, do not hand browsers the service credential. Either (a) have each user sign in with their own application password, verified server-side, and keep a Node session, or (b) register a REST route that calls `wp_authenticate()` and returns the user's ID and capabilities (rate-limit it). `GET /wp/v2/users/me?context=edit` returns the user's roles and primitive capabilities: use them to show or hide UI, but leave per-object checks (such as `edit_post` for one post) to WordPress, which enforces them on every request.

## 3. The admin UI is CRUD over REST

| Admin feature | WordPress endpoint |
|---|---|
| List/search/filter content | `GET /wp/v2/projects?status=any&per_page=20&_fields=id,title,meta` (add `search=`, taxonomy filters as needed) |
| Create / update / trash | `POST /wp/v2/projects`, `POST /wp/v2/projects/{id}`, `DELETE /wp/v2/projects/{id}` |
| Terms | `/wp/v2/project_status` |
| Media upload | `POST /wp/v2/media` with the file as the raw body, `Content-Type` set to its MIME type (override the helper's JSON default) and `Content-Disposition: attachment; filename=...`; or `multipart/form-data` with a `file` field |
| Users | `/wp/v2/users` (needs `list_users`/`create_users` caps) |
| Site settings | `/wp/v2/settings` (only options registered with `register_setting(..., show_in_rest)`) |
| Custom actions | Abilities: `POST /wp-abilities/v1/abilities/<namespace>/<ability>/run` with body `{"input": {...}}` (read-only abilities use `GET` with `?input=`) |

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

- **SSR/ISR** from Node: fetch `GET /wp/v2/projects?slug=...&_embed` and render. Use `_fields` to cut payload size.
- **Block content**: `content.rendered` is already HTML. For custom rendering use `?context=edit` and `content.raw`, then parse it on Node with `@wordpress/block-serialization-default-parser`.
- **Cache invalidation**: add a `save_post` / `transition_post_status` hook in PHP that calls `wp_remote_post()` to a Node `/revalidate` webhook.
- **Previews**: authenticated `GET /wp/v2/projects/<id>?context=edit` returns drafts and private posts; unsaved changes to a published post are in `GET /wp/v2/projects/<id>/autosaves`.

## 6. Project layout the agent should generate

```
app/
  wordpress/                 # docker-compose or WP Engine install + wp-content/
    plugins/app/app.php        # plugin header, data model
    plugins/app/includes/abilities.php
  server/                    # Node: Hono/Express/Next
    wp-client.ts             # fetch wrapper above, typed from OPTIONS schemas
    routes/admin/*  routes/site/*
  .env                       # WP_URL, WP_USER, WP_APP_PASSWORD (server only)
```

## Checklist before declaring done
1. `GET /wp-json/wp/v2/projects` returns the type; `meta.budget` present.
2. Node can create, edit, trash a project and upload media with the app password.
3. A non-admin user hits a 403 on an admin-only action (capabilities are enforced by WordPress, not the UI).
4. No WordPress credentials in browser-delivered code.
