---
name: provenlab
description: Build applications on WordPress as the application layer (post types, registered meta, users and capabilities, hooks, Abilities, REST API) with WP-CLI and the Cloud AI API. Use when creating or changing a WordPress-backed site or app, a headless or custom admin/frontend, WordPress plugins or must-use plugins, or AI features (gateway, knowledge base, agents) for such an app.
---

# Proven Lab: build on WordPress, don't rebuild it

Follow the playbook in `AGENTS.md` at the project root (the full version is at https://h01j8ie82uxpc31tlr1b9sqsz.js.wpenginepowered.com/AGENTS.md).

## Look things up instead of guessing

Use the `provenlab` MCP tools. If they are not connected, call the same tools over HTTP: `curl "https://h01j8ie82uxpc31tlr1b9sqsz.js.wpenginepowered.com/api/<tool>?<args>"`.

| Need | Tool |
|---|---|
| Pick a setup (Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin) | `get_blueprint` with `architecture` |
| Find the APIs for a task | `list_domains`, `get_domain` |
| Exact signature, parameters, `@since` | `get_function`, `get_class`, `get_hook` |
| A WP-CLI command and its flags | `get_cli_command` |
| A Cloud AI API endpoint | `get_ai_operation` |
| Anything else | `search_docs` |

## Non-negotiables

1. Choose the setup first (`get_blueprint architecture`); then follow `classic-wordpress` or `custom-app`.
2. Define the data model in a must-use plugin on `init`; `show_in_rest => true` for anything a custom app uses; post meta also needs `custom-fields` support.
3. Permissions are WordPress capabilities, enforced in `permission_callback` / `auth_callback`, never only in the UI.
4. Custom actions are Abilities (`wp_register_ability`).
5. Verify with WP-CLI and real requests before saying it works. Never run destructive commands on shared environments without approval.
6. Keys and application passwords stay on the server.
