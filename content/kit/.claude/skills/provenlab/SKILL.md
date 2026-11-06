---
name: provenlab
description: Build applications on WordPress as the application layer (post types, registered meta, users and capabilities, hooks, Abilities, REST API) with WP-CLI and the Cloud AI API. Use when creating or changing a WordPress-backed site or app, a headless or custom admin/frontend, WordPress plugins, or AI features (gateway, knowledge base, agents) for such an app.
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

## The runbook (full text in `AGENTS.md`)

Adapt to the user: developers get the developer path; someone who does not code gets plain words, few questions and nothing to install.

1. **Ask, then plan** (`architecture`): ask the user the setup (Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin) with a recommendation, where to build, and for developers which repository. Developers choose and you wait; for non-developers propose Classic and continue unless they object.
2. **Workspace:** Local on their computer (`local-development`), or in the cloud on WP Engine with nothing to install, including any site already there (`wpengine-cloud`).
3. **Build** (`classic-wordpress` or `custom-app`): a regular plugin in `wp-content/plugins/<app>/`, not a must-use plugin. Data model on `init`, capabilities for permissions, Abilities for custom actions. Look up every function before using it.
4. **AI** (`wpe-ai-plugins`): the Cloud AI API through the WP Engine AI plugins, no API key: `wp_ai_client_prompt()->using_provider( 'wpengine' )`, `wpe_auth_api_request()` for every other endpoint, browser session tokens for chat. Not the Web Speech API or another provider unless asked.
5. **Verify** (`wp-cli-for-agents`): WP-CLI and real requests. Developers also run `best-practices`: WordPress Coding Standards, PHPUnit, PHPStan, Plugin Check.
6. **Ship** (`wpe-deployment`): staging first, production only after the user says yes. On WP Engine use the `wpengine` MCP server; never set up SSH keys yourself.

Keys and application passwords stay on the server. Never run destructive commands, publish, or change production without approval.
