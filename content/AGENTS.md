# Proven Lab runbook for coding agents

You build or update applications where **WordPress is the application layer**: data model, users and permissions, validation, hooks, media and cron come from WordPress. The admin and the frontend are WordPress or a custom app. AI comes from the Cloud AI API. Hosting on WP Engine is optional and recommended.

Follow the six steps below in order. Each step names the one guide to read: `get_blueprint <slug>`, or `curl "{{BASE}}/api/get_blueprint?slug=<slug>"`.

## Access: nothing to install

- **Tools over HTTP:** `GET {{BASE}}/api/<tool>?<args>`, for example `curl "{{BASE}}/api/get_function?name=register_meta"`. Guides are also plain markdown at `{{BASE}}/blueprints/<slug>.md`.
- **Proven Lab MCP server** (optional, faster): `claude mcp add --transport http provenlab {{MCP_URL}}`.
- Do not ask the user to install anything before you start.

## Who you are working with

Read the request and adapt. Use the developer path when the user writes about code, Git, a terminal or tests; otherwise use the non-developer path. If unsure, ask once: "Do you want to work with the code yourself, or should I handle everything?"

| | Developer | Non-developer |
|---|---|---|
| Questions | Setup, where to build, repository; wait for the answers | What the site is for and its name, in plain words; propose the rest in one line and continue unless they object |
| Setup | Their choice (step 1) | Classic: "I'll build it as a regular WordPress site" |
| Where to build | Local on their computer | Directly on WP Engine, nothing to install |
| Repository | New, existing, or none for now | None; offer one later |
| Checks | Coding standards, PHPUnit, PHPStan, Plugin Check | PHP lint, WP-CLI checks, the pages load |
| Shipping | GitHub Action: staging, then production after approval | Staging link, then production after they say yes |

Never ask a non-developer to run commands or edit files. When a person must act (signing in, clicking **Connect**, approving), say exactly where to click.

## The runbook

### 1. Ask, then plan

Ask in one message, only what the user has not said yet:

- **Which setup?** Classic (WP Admin and WordPress templating) · Headless Frontend (WP Admin and your own frontend app) · Headless Admin (your own admin app and WordPress templating) · Headless Frontend + Admin (your own admin and frontend app). Recommend one in a line: a content site → Classic; an app with its own interface → Headless Frontend + Admin. Guide: `architecture`.
- **Where to build?** Check whether Local (localwp.com) is installed, then offer: on your computer with Local (recommended when installed), or directly on WP Engine with nothing to install (needs a WP Engine account), or WordPress Playground.
- **Developers: which repository?** Create a new one, use an existing one, or none for now.

Developers: wait for the answers and never pick the setup for them. Non-developers: follow the table above.

### 2. Set up the workspace

- **On the user's computer:** `local-development` (Local, with Local's MCP server when available; otherwise Playground or Docker).
- **Directly on WP Engine, nothing to install:** `build-on-wpengine` (the WP Engine MCP server creates the site and a staging environment; you build in its sandbox).
- **The site already runs on WP Engine:** `hosted-sites`.
- Developers with a repository: create or connect it now (`wpe-deployment`, section 1).

### 3. Build the app as a plugin

- **Classic:** `classic-wordpress`. **Any headless setup:** `custom-app` (Headless Admin also uses `classic-wordpress` for the frontend).
- The app is **a regular plugin** in `wp-content/plugins/<app>/`, activated with `wp plugin activate <app>`. Not a must-use plugin, never a theme's `functions.php`, never WordPress core.
- Model first: post types, taxonomies and registered meta on `init`, with `show_in_rest => true` for anything a custom app uses.
- Permissions are WordPress capabilities, enforced in `permission_callback`, `auth_callback` and `current_user_can()`, never only in the interface.
- Custom actions are **Abilities** (`wp_register_ability`). Extend through hooks; never edit core or third-party plugins.
- **Look up before you write:** `get_function`, `get_class`, `get_hook` for exact signatures; `get_cli_command` before running WP-CLI.

### 4. Add AI, if the app needs it

Guide: `wpe-ai-plugins`. Every AI capability uses the Cloud AI API through the WP Engine AI plugins, with **no API key**: install them with WP-CLI, ask the user to click **Connect** once in WP Admin, then:

- `wp_ai_client_prompt()->using_provider( 'wpengine' )` for text, images and speech;
- `wpe_auth_api_request()` for every other endpoint: transcription (`createTranscription`), alt text, summaries, the knowledge base, agents (`get_ai_operation` returns the exact PHP call);
- a short-lived browser session token for interactive chat, so the browser talks to the Cloud AI API directly.

Not the Web Speech API or another provider unless the user asks. Code outside WordPress and API keys: `ai-features`.

### 5. Verify

- Prove every change with **WP-CLI** and real HTTP requests, not by rereading code: `wp-cli-for-agents`. Locally run `wp` in the site; on WP Engine use the WP Engine MCP server's `sandbox_bash`.
- Developers: the quality checks and definition of done in `best-practices` (WordPress Coding Standards, PHPUnit, PHPStan, Plugin Check).
- Report what you checked and how.

### 6. Ship: staging, then production

Guide: `wpe-deployment` (non-developers: `build-on-wpengine`, section 5).

- **Always staging first.** Send the user the staging link and what to check. Production only after they say yes.
- From a repository: WP Engine's GitHub Action deploys to staging on every push to `main`, and to production after approval.
- Without a repository: push from Local to staging, or write the plugin's files on staging through the WP Engine MCP server.
- Never copy an environment over a production site that has real content. Back up before changing production.
- WP Engine is optional: the app is a plugin, so it deploys to any WordPress host.

## Hard rules

- Sanitize input, validate against the REST or ability schema, escape output. `$wpdb->prepare()` for any SQL.
- Check `since` on every API against the target WordPress version; guard newer APIs with `function_exists()`.
- Register on the right hook: `init` for types and meta, `rest_api_init` for routes, `wp_abilities_api_init` for Abilities.
- Flush rewrite rules once after changing post types (`wp rewrite flush` or the plugin's activation hook), never on every request.
- Secrets (application passwords, API keys) never go to browser code or version control.
- On WP Engine, use the WP Engine MCP server (`https://api.ai.wpengine.com/v1/mcp`, OAuth sign-in) for WP-CLI and files. Do not generate SSH keys or configure the SSH Gateway yourself.
- Never run destructive commands on shared environments, publish content, or change production without the user's approval.
- Prefer the Core API over custom tables or custom authentication.

## Tools

| Tool | Use |
|---|---|
| `list_blueprints`, `get_blueprint` | The guides named in this runbook |
| `list_domains`, `get_domain` | Find the Core API functions, classes and hooks for a task |
| `get_function`, `get_class`, `get_hook` | Exact signatures, parameters, since-versions |
| `search_docs` | Keyword search across everything |
| `list_cli_commands`, `get_cli_command` | WP-CLI commands and flags |
| `list_ai_operations`, `get_ai_operation` | Cloud AI API operations, with `howToCall` (a ready PHP call, no API key) |

Plain-text docs: `{{BASE}}/llms.txt` and `{{BASE}}/llms-full.txt`.
