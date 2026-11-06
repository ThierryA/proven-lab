---
nav: "On your computer (Local)"
title: "Workspace on the user's computer: Local"
summary: "You set up WordPress on the user's computer with Local (localwp.com, by WP Engine): detect it, create the site through Local's MCP server when available, and fall back to Playground. The user only installs Local if they want it."
agent_does:
  - "Checks whether Local is on your computer."
  - "Creates the WordPress site in Local and installs your app in it."
  - "Uses Local's tools to test everything."
you_do:
  - "Install Local if you want to work on your computer (free)."
  - "Agree on the site's name."
---

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

Then:

1. `local_list_sites` (reuse a site the user names) or `local_create_site` with the agreed `name`.
2. `local_get_site` for the URL and `path`. Write the plugin to `<path>/app/public/wp-content/plugins/<app>/` and activate it with `wp_plugin_activate`.
3. Run WP-CLI through the `wp_*` tools (`wp_eval`, `wp_post_create`, `wp_post_list`). Ask before database imports or anything destructive.
4. Later, `local_wpe_push` sends the site to a WP Engine **staging** environment (step 6).

Without Local's MCP server: ask the user to create the site in Local (**+ Add Local site**) and give you its name, read its `path` from `sites.json`, and run `wp` in the site folder.

## 3. Local not installed

Offer the choice in one message, then continue with the answer:

> I can set this up on your computer with Local (free, https://localwp.com: install it and open it once), or build it directly on WP Engine with nothing to install and send you a link.

- Nothing to install: `wpengine-cloud`.
- Developers who prefer no app: WordPress Playground, `npx @wp-playground/cli@latest start` in the project folder. Docker only if they already use it.

## Done when

The site runs locally, you know its URL and folder, and `wp core version` answers there.
