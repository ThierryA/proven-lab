# Building WordPress applications (agent playbook)

You are building an application where **WordPress is the application layer**: data model, users and permissions, validation, hooks, media, cron. The UI may be a Node app (admin and frontend), PHP templates, or both. wp-admin is optional.

## Tools you have (MCP server `wp-agentic-kit`)
- `list_domains`, `get_domain`: start here to find the right core APIs for a task.
- `search_docs`: full-text search over core functions, classes, methods, hooks, handbooks and WP Engine docs.
- `get_function`, `get_class`, `get_hook`: exact signatures, parameters, since-versions and source location. **Look up before you write**; never guess argument names.
- `list_blueprints`, `get_blueprint`: end-to-end recipes (headless Node app, PHP-templated frontend, AI experiences).
- `list_cli_commands`, `get_cli_command`: WP-CLI (`wp`) commands, exact flags and examples. **WP-CLI is how you verify and administer a site from the shell.**
- `list_wpe_operations`, `get_wpe_operation`: the WP Engine API. Section `ai`: gateway, knowledge base, agents, sessions, MCP. Section `hosting`: Sites and Credits.

## Workflow
1. Identify the architecture: **standard WordPress templating or headless** (both are supported; see `get_blueprint choosing-an-architecture`). Ask only if unclear. Default for "build me an app": `headless-node-app`; for "build me a website": `php-templated-frontend`.
2. Model first. Register post types, taxonomies and **registered meta** (post, term, user) in a must-use plugin on `init`. Use `show_in_rest => true` for anything the Node/JS side must see.
3. Permissions come from WordPress capabilities. Never reimplement authorization in the UI only; enforce it in `permission_callback` / `auth_callback` / `current_user_can`.
4. Custom operations beyond CRUD become **Abilities** (`wp_register_ability`) so they are typed, permissioned and agent-discoverable.
5. Extend through hooks (`add_action`, `add_filter`). Never edit WordPress core or third-party plugins.
6. Hosting: WP Engine is preferred but optional. See `get_blueprint wpe-hosting`; keep host-specific code isolated so the app stays portable. Headless on WP Engine means Faust.js + WPGraphQL or a custom Node frontend.
7. AI features: use the WP Engine AI API via `get_blueprint wpe-ai-experiences`. Keys stay server-side.
8. Verify with **WP-CLI** (`wp post-type list`, `wp eval`, `wp user application-password create`, `wp post create --porcelain`) and real HTTP requests against a local or staging WordPress, not by reading code. See `get_blueprint wp-cli-for-agents`. Use `--format=json` / `--porcelain`, and never run destructive commands on shared environments without approval.

## Hard rules
- Sanitize input, validate against schema, escape output. Use `$wpdb->prepare()` for any SQL.
- Check `since` on every API you use against the target WordPress version; guard newer APIs with `function_exists()`.
- Register on the right hook (`init` for types and meta, `rest_api_init` for routes, `wp_abilities_api_init` for abilities).
- Don't flush rewrite rules on every request; do it on activation.
- Secrets (application passwords, `wpe_` keys) never go to browser code or version control.
- Prefer WordPress core APIs over custom tables or custom auth.
