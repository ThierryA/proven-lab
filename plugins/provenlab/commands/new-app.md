---
description: Start a WordPress-backed app the Proven Lab way (choose a setup, model the data, verify with WP-CLI)
---

Start a new application on WordPress as the application layer, following the Proven Lab playbook.

1. Read the user's request in this conversation. If it does not say which setup to use, call `get_blueprint` with `architecture` and propose one of: Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin. Ask only if it is unclear.
2. Call `get_blueprint` for the matching guide (`classic-wordpress` or `custom-app`) and follow it step by step.
3. Before writing any WordPress call, check it with `get_function`, `get_class` or `get_hook`. Before running any WP-CLI command, check it with `get_cli_command`.
4. Put the data model in a must-use plugin (`wp-content/mu-plugins/`), registered on `init`.
5. Verify with WP-CLI and real HTTP requests, and report what you checked.

If the `provenlab` tools are not available, use `curl "https://h01j8ie82uxpc31tlr1b9sqsz.js.wpenginepowered.com/api/<tool>?<args>"` instead, and see https://h01j8ie82uxpc31tlr1b9sqsz.js.wpenginepowered.com/AGENTS.md.
