# Workspace on the user's computer: Local

> **Runbook step 2 · Workspace,** for developers and anyone who has Local. No Local and no wish to install anything: `wpengine-cloud`. **Next:** step 3, `classic-wordpress` or `custom-app`.

You set up the site. The user's only possible tasks: install Local if they want it, and agree on the site name.

## 1. Detect Local

Local is installed when its `sites.json` exists: `~/Library/Application Support/Local/` (macOS), `%APPDATA%\Local\` (Windows), `~/.config/Local/` (Linux).

```bash
test -f "$HOME/Library/Application Support/Local/sites.json" && echo "Local is installed"
```

`sites.json` lists each site's `name`, `domain` and `path`; WordPress is in `<path>/app/public`.

## 2. Local installed: create the site yourself

Connect Local's MCP server (WPE Coworker add-on) when `wpe-coworker-mcp-connection-info.json` exists in the same folder; start the `stdioPath` it names:

```bash
claude mcp add local -- node "$HOME/Library/Application Support/Local/addons/local-addon-wpe-coworker/bin/mcp-stdio.js"
```

A server added this way appears after the agent restarts; until then, continue without it.

Then:

1. `local_list_sites` (reuse a site the user names) or `local_create_site` with the agreed `name`.
2. `local_get_site` for the URL and `path`. Write the plugin to `<path>/app/public/wp-content/plugins/<app>/` and activate it with `wp_plugin_activate`.
3. Run WP-CLI through the `wp_*` tools (`wp_eval`, `wp_post_create`, `wp_post_list`). Ask before database imports or anything destructive.
4. Later, `local_wpe_push` sends the site to a WP Engine **staging** environment (step 6).

Without Local's MCP server: ask the user to create the site in Local (**+ Add Local site**) and give you its name, and read its `path` from `sites.json`. Run WP-CLI from Local's site shell (**Open site shell**): a plain `wp` in the folder usually cannot reach Local's database.

## 3. Local not installed

Offer the choice in one message, then continue with the answer:

> I can set this up on your computer with Local (free, https://localwp.com: install it and open it once), or build it directly on WP Engine with nothing to install and send you a link.

- Nothing to install: `wpengine-cloud`.
- Developers who prefer no app: `@wordpress/env` (`npx @wordpress/env start` in the plugin folder; needs Docker; WP-CLI with `npx @wordpress/env run cli wp ...`). WordPress Playground (`npx @wp-playground/cli@latest server --mount=.:/wordpress/wp-content/plugins/<slug>`) is fine for a quick look but has no WP-CLI.

## Done when

The site runs locally, you know its URL and folder, and `wp core version` answers there.
