# Building WordPress applications (agent playbook)

You are building an application where **WordPress is the application layer**: data model, users and permissions, validation, hooks, media, cron. The UI may be a Node app (admin and frontend), PHP templates, or both. wp-admin is optional.

## Tools you have (MCP server `proven`)
- `list_domains`, `get_domain`: start here to find the right core APIs for a task.
- `search_docs`: full-text search over core functions, classes, methods, hooks, handbooks and WP Engine docs.
- `get_function`, `get_class`, `get_hook`: exact signatures, parameters, since-versions and source location. **Look up before you write**; never guess argument names.
- `list_blueprints`, `get_blueprint`: end-to-end recipes (headless Node app, PHP-templated frontend, AI experiences).
- `list_cli_commands`, `get_cli_command`: WP-CLI (`wp`) commands, exact flags and examples. **WP-CLI is how you verify and administer a site from the shell.**
- `list_wpe_operations`, `get_wpe_operation`: the WP Engine API. Section `ai`: gateway, knowledge base, agents, sessions, credits. Section `deployment`: Sites.

## Workflow
1. Identify the setup (see `get_blueprint architecture`). WordPress is always the PHP runtime; the admin is WP Admin or a custom app, the frontend is WordPress templating or a custom app. **Classic** (WP Admin + templating) → `classic-wordpress`. **Headless** (WP Admin + custom frontend) or **Custom app** (custom admin + frontend) → `custom-app`. Default: "build me a website" → Classic, "build me an app" → Custom app. Ask only if unclear.
2. Model first. Register post types, taxonomies and **registered meta** (post, term, user) in a must-use plugin on `init`. Use `show_in_rest => true` for anything the Node/JS side must see.
3. Permissions come from WordPress capabilities. Never reimplement authorization in the UI only; enforce it in `permission_callback` / `auth_callback` / `current_user_can`.
4. Custom operations beyond CRUD become **Abilities** (`wp_register_ability`) so they are typed, permissioned and agent-discoverable.
5. Extend through hooks (`add_action`, `add_filter`). Never edit WordPress core or third-party plugins.
6. Deployment: WP Engine is preferred but optional. See `get_blueprint wpe-deployment`; keep host-specific code isolated so the app stays portable. WordPress deploys on managed WordPress; a custom app deploys on the Headless Platform or any Node host.
7. AI features: use the WP Engine AI API via `get_blueprint wpe-ai-experiences`. Keys stay server-side.
8. Verify with **WP-CLI** (`wp post-type list`, `wp eval`, `wp user application-password create`, `wp post create --porcelain`) and real HTTP requests against a local or staging WordPress, not by reading code. See `get_blueprint wp-cli-for-agents`. Use `--format=json` / `--porcelain`, and never run destructive commands on shared environments without approval.

## Hard rules
- Sanitize input, validate against schema, escape output. Use `$wpdb->prepare()` for any SQL.
- Check `since` on every API you use against the target WordPress version; guard newer APIs with `function_exists()`.
- Register on the right hook (`init` for types and meta, `rest_api_init` for routes, `wp_abilities_api_init` for abilities).
- Don't flush rewrite rules on every request; do it on activation.
- Secrets (application passwords, `wpe_` keys) never go to browser code or version control.
- Prefer WordPress core APIs over custom tables or custom auth.
