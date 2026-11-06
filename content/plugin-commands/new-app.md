---
description: Start a WordPress-backed app the Proven Lab way (choose a setup, model the data, verify with WP-CLI)
---

Start a new application on WordPress as the application layer, following the Proven Lab playbook.

1. Read the user's request. Unless it already names a setup, ask the user to choose one of Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin (one line each, from `get_blueprint architecture`), with your recommendation, and check whether Local (localwp.com) is installed: offer to create the site in Local, or recommend installing it (`get_blueprint local-development`). Wait for the answer before writing code.
2. Call `get_blueprint` for the matching guide (`classic-wordpress` or `custom-app`) and follow it step by step.
3. Before writing any WordPress call, check it with `get_function`, `get_class` or `get_hook`. Before running any WP-CLI command, check it with `get_cli_command`.
4. Put the data model in a must-use plugin (`wp-content/mu-plugins/`), registered on `init`. Set up PHPCS (WordPress Coding Standards) and PHPUnit from `get_blueprint best-practices` at the start.
5. Any AI capability (speech to text, summaries, chat, images, search) uses the Cloud AI API with the site connection, no API key: install and connect the WP Engine AI plugins, then `wp_ai_client_prompt()` or `wpe_auth_api_request()` from a WordPress route (`get_blueprint wpe-ai-plugins`; `get_ai_operation` gives the exact call).
6. Verify with WP-CLI, real HTTP requests, `vendor/bin/phpcs` and `vendor/bin/phpunit`, and report what you checked.

If the `provenlab` tools are not available, use `curl "{{BASE}}/api/<tool>?<args>"` instead, and see {{BASE}}/AGENTS.md.
