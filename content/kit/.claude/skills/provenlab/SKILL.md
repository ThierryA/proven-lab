---
name: provenlab
description: Build applications on WordPress as the application layer (post types, registered meta, users and capabilities, hooks, Abilities, REST API) with WP-CLI and the Cloud AI API. Use when creating or changing a WordPress-backed site or app, a headless or custom admin/frontend, WordPress plugins or must-use plugins, or AI features (gateway, knowledge base, agents) for such an app.
---

# Proven Lab: build on WordPress, don't rebuild it

Follow the playbook in `AGENTS.md` at the project root (the full version is at {{BASE}}/AGENTS.md).

## Look things up instead of guessing

Use the `provenlab` MCP tools. If they are not connected, call the same tools over HTTP: `curl "{{BASE}}/api/<tool>?<args>"`.

| Need | Tool |
|---|---|
| Pick a setup (Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin) | `get_blueprint` with `architecture` |
| Find the APIs for a task | `list_domains`, `get_domain` |
| Exact signature, parameters, `@since` | `get_function`, `get_class`, `get_hook` |
| A WP-CLI command and its flags | `get_cli_command` |
| A Cloud AI API endpoint | `get_ai_operation` |
| Anything else | `search_docs` |

## Non-negotiables

1. Before writing code, ask the user which setup they want (Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin), with a one-line recommendation, and where WordPress runs locally: check for Local (localwp.com) first and create the site there, through Local's MCP server when available; if Local is missing, recommend it (`get_blueprint local-development`). Wait for the answer; never pick the setup for them. Then follow `classic-wordpress` or `custom-app` (`get_blueprint architecture` explains the setups).
2. Define the data model in a must-use plugin on `init`; `show_in_rest => true` for anything a custom app uses; post meta also needs `custom-fields` support.
3. Permissions are WordPress capabilities, enforced in `permission_callback` / `auth_callback`, never only in the UI.
4. Custom actions are Abilities (`wp_register_ability`).
5. Verify with WP-CLI and real requests before saying it works. Never run destructive commands on shared environments without approval.
6. Keys and application passwords stay on the server.
7. AI capabilities (speech to text, text to speech, chat, summaries, images, alt text, search, agents) use the Cloud AI API, called from the server: not the Web Speech API or another provider, unless the user asks (`get_blueprint ai-features`).
8. Follow `get_blueprint best-practices`: WordPress Coding Standards (PHPCS), PHPUnit tests with the WordPress test suite, PHPStan, Plugin Check. Its definition of done applies.
