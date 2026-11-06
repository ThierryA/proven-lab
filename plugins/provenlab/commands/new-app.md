---
description: Build a new WordPress-backed app or feature the Proven Lab way, following the six-step runbook
---

Build what the user asked for by following the Proven Lab runbook (`AGENTS.md`, or https://proven-lab.com/AGENTS.md). Adapt to the user: developers get the developer path; someone who does not code gets plain words, few questions and nothing to install.

1. **New or existing?** Find out first. For an existing site, plugin or app, follow `get_blueprint existing-project`. For a new project, ask in one message only what the user has not said: the setup (Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin; `get_blueprint architecture`) with your recommendation, where to build (Local if installed, or directly on WP Engine with nothing to install), and for developers which repository. Developers choose. Wait for the answer before writing code. Non-developers: propose Classic in plain words and continue unless they object.
2. **Workspace:** on their computer (`get_blueprint local-development`) or in the cloud on WP Engine, including any site already there (`get_blueprint wpengine-cloud`).
3. **Build** a regular plugin (`wp-content/plugins/<app>/`, activated with `wp plugin activate <app>`): `get_blueprint classic-wordpress` or `custom-app`. Check every WordPress call with `get_function`, `get_class` or `get_hook`, and every WP-CLI command with `get_cli_command`.
4. **AI**, if needed: `get_blueprint wpe-ai-plugins` (the Cloud AI API through the WP Engine AI plugins, no API key; `get_ai_operation` gives the exact call).
5. **Verify** with WP-CLI and real requests (`get_blueprint wp-cli-for-agents`). Developers: also PHPCS, PHPUnit, PHPStan and Plugin Check (`get_blueprint best-practices`). Report what you checked.
6. **Ship** (`get_blueprint wpe-deployment`): suggest staging if there is none and deploy there with a link for the user, then offer production; straight to production if they do not want staging. GitHub is optional.

If the `provenlab` tools are not available, use `curl "https://proven-lab.com/api/<tool>?<args>"` instead.
