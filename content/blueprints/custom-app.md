---
title: "Custom app: your own admin, frontend, or both"
summary: WordPress stays the PHP runtime and does the work. Your Node app runs separately and owns the admin, the frontend, or both, talking to WordPress over REST and Abilities. Custom frontend only (with WP Admin) is what people call headless.
---

# Custom app on WordPress

**Admin:** custom app (or WP Admin) · **Frontend:** custom app · **Runtimes:** WordPress + your app.

**Prompt this blueprint answers:** "Create me a Node application that uses WordPress as the backend, with its own admin and frontend."

**Headless** (WP Admin + custom frontend): follow the same steps and skip step 3, editors keep using WP Admin.

## Architecture

```
Browser ──► Node app (Hono / Express / Next.js / Astro SSR)
              ├─ /admin/*   custom admin UI (auth'd users)  ──┐
              └─ /*         public frontend (SSR / ISR)     ──┤  server-side only
                                                              ▼
                                   WordPress (REST + Abilities API + core PHP APIs)
                                   └─ must-use plugin "app-model" defines the schema
```

WordPress provides: data model, users/roles/capabilities, validation, hooks, media pipeline, cron, search. Node provides: UI, routing, rendering. Credentials for WordPress live **only on the Node server**.

## Step 1: define the data model in PHP (must-use plugin)

Put this in `wp-content/mu-plugins/app-model.php`. Everything the Node app needs must be exposed to REST here, because REST exposure is opt-in.

Core APIs used (see `get_function` in the MCP server for full signatures): `register_post_type`, `register_taxonomy`, `register_post_meta`, `register_meta` (use `object_type = 'user'` for user meta), `register_setting`.

```php
add_action( 'init', function () {
	register_post_type( 'project', [
		'label'        => 'Projects',
		'public'       => true,
		'show_in_rest' => true,                 // required for /wp/v2/project
		'supports'     => [ 'title', 'editor', 'thumbnail', 'custom-fields', 'excerpt' ],
		'rest_base'    => 'projects',
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
- `show_in_rest => true` is **required** on post types, taxonomies and meta, or they are invisible to REST.
- A meta key must be registered (with `show_in_rest`) before REST will read or write it.
- Register on `init`. Do not call `flush_rewrite_rules()` on every request.
- Custom roles/caps: `add_role()` / `add_cap()` on activation, not on `init`.

## Step 2: authentication from Node

Use **Application Passwords** (core, WP 5.6+; requires HTTPS or `WP_ENVIRONMENT_TYPE` local). Create one per Node service user (`wp_validate_application_password`, `WP_Application_Passwords`), send as HTTP Basic:

```js
const auth = 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');
const wp = (path, init = {}) =>
  fetch(`${WP_URL}/wp-json${path}`, { ...init, headers: { Authorization: auth, 'Content-Type': 'application/json', ...init.headers } });
```

For **end-user login in your Node admin**, do not hand browsers the service credential. Either (a) verify user credentials server-side with each user's own application password and store a Node session, or (b) expose an Ability/REST route that validates a login and returns the user's capabilities. Map WordPress capabilities (`current_user_can`) to Node UI permissions via `GET /wp/v2/users/me?context=edit`.

## Step 3: the admin UI is CRUD over REST

| Admin feature | WordPress endpoint |
|---|---|
| List/search/filter content | `GET /wp/v2/projects?search=&status=any&per_page=20&_fields=id,title,meta` |
| Create / update / trash | `POST /wp/v2/projects`, `POST /wp/v2/projects/{id}`, `DELETE /wp/v2/projects/{id}` |
| Terms | `/wp/v2/project_status` |
| Media upload | `POST /wp/v2/media` (binary body + `Content-Disposition: attachment; filename=...`) |
| Users | `/wp/v2/users` (needs `list_users`/`create_users` caps) |
| Site settings | `/wp/v2/settings` (only options registered with `register_setting(..., show_in_rest)`) |
| Custom actions | Abilities: `POST /wp-abilities/v1/<namespace>/<ability>/run` |

Build forms from the schema: `OPTIONS /wp/v2/projects` returns a JSON Schema for the create/update payload. Generate form fields from that and your UI stays in sync with the PHP model.

## Step 4: custom actions as Abilities (not ad-hoc endpoints)

For anything beyond CRUD ("publish project and notify team", "generate summary"), register an ability. It is typed, permission-checked, discoverable by agents and callable from Node.

```php
add_action( 'wp_abilities_api_categories_init', fn() => wp_register_ability_category( 'app', [ 'label' => 'App', 'description' => 'Application actions.' ] ) );
add_action( 'wp_abilities_api_init', function () {
	wp_register_ability( 'app/archive-project', [
		'label'               => 'Archive project',
		'description'         => 'Moves a project to the archived status and notifies owners.',
		'category'            => 'app',
		'input_schema'        => [ 'type' => 'object', 'properties' => [ 'id' => [ 'type' => 'integer' ] ], 'required' => [ 'id' ] ],
		'output_schema'       => [ 'type' => 'object', 'properties' => [ 'archived' => [ 'type' => 'boolean' ] ] ],
		'execute_callback'    => function ( $input ) { /* wp_update_post(...) */ return [ 'archived' => true ]; },
		'permission_callback' => fn( $input ) => current_user_can( 'edit_post', $input['id'] ),
		'meta'                => [ 'show_in_rest' => true ],
	] );
} );
```

Always call `get_function wp_register_ability` to confirm current arguments for the installed WordPress version.

## Step 5: frontend rendering

- **SSR/ISR** from Node: fetch `GET /wp/v2/projects?slug=...&_embed` and render. Use `_fields` to cut payload size.
- **Block content**: `content.rendered` is already HTML. For custom rendering use `?context=edit` and `content.raw`, then `parse_blocks`-equivalent on Node (`@wordpress/block-serialization-default-parser`).
- **Cache invalidation**: add a `save_post` / `transition_post_status` hook in PHP that calls `wp_remote_post()` to a Node `/revalidate` webhook.
- **Previews**: authenticated request with `status=any` and `context=edit`.

## Step 6: project layout the agent should generate

```
app/
  wordpress/                 # docker-compose or WP Engine install + wp-content/
    mu-plugins/app-model.php
    mu-plugins/app-abilities.php
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
