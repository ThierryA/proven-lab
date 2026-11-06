---
nav: "Local development"
title: "Local development with Local"
summary: "Run WordPress on the developer's machine with Local (localwp.com, by WP Engine): check whether it is installed, suggest it if not, and create and drive sites through Local's MCP server when it is available."
---

# Local development with Local

[Local](https://localwp.com) (free, by WP Engine, macOS, Windows and Linux) is the recommended way to run WordPress on the developer's machine. It creates a complete site (web server, PHP, MySQL, WP-CLI) in one step, and it can push and pull to WP Engine.

## 1. Check whether Local is installed

Local keeps its data, including the list of sites, in one folder. If `sites.json` exists there, Local is installed and has been opened at least once.

| OS | Local data folder |
|---|---|
| macOS | `~/Library/Application Support/Local/` |
| Windows | `%APPDATA%\Local\` |
| Linux | `~/.config/Local/` |

```bash
test -f "$HOME/Library/Application Support/Local/sites.json" && echo "Local is installed"   # macOS
```

`sites.json` lists every site with its `name`, `domain` and `path`. WordPress itself is in `<path>/app/public`.

## 2. If Local is not installed

Suggest it to the user and wait for their answer:

> To run WordPress locally I recommend Local (free, by WP Engine): https://localwp.com. Install it, open it once, and tell me when it's ready. If you'd rather not, I can use WordPress Playground (no install, runs with Node) or Docker.

- **WordPress Playground:** `npx @wp-playground/cli@latest start` in the project folder.
- **Docker:** only if the user already uses it.

## 3. If Local is installed: use Local's MCP server

Local can expose its sites to agents through an MCP server provided by the **WPE Coworker** add-on (early access). It is enabled when `wpe-coworker-mcp-connection-info.json` exists in the Local data folder. Its `stdioPath` field is the server to start:

```bash
claude mcp add local -- node "$HOME/Library/Application Support/Local/addons/local-addon-wpe-coworker/bin/mcp-stdio.js"
```

Use the `stdioPath` from the file if it differs. If the add-on was installed with npm, `claude mcp add local -- wpe-coworker-mcp` works too. Local must be running.

Then, with the user's agreement on the site name:

1. `local_list_sites`: reuse an existing site if the user names one.
2. `local_create_site` with `name`: creates and starts a site with WordPress installed (admin user `admin`, password `admin`; change it for anything shared).
3. `local_get_site`: the site's URL and `path`. Write the must-use plugin to `<path>/app/public/wp-content/mu-plugins/`.
4. Verify with the `wp_*` tools (`wp_eval`, `wp_post_create`, `wp_post_list`) or WP-CLI.
5. `local_wpe_push` and `local_wpe_pull` sync the site with a WP Engine environment when the user is ready.

The add-on's tools include `wp_eval` and database import and export: use them on local sites only, and ask before destructive actions.

## 4. If Local is installed without the MCP server

1. Ask the user to create a site in Local (**+ Add Local site**) and tell you its name.
2. Find its `path` in `sites.json`; WordPress is in `<path>/app/public`.
3. For WP-CLI, ask the user to open the site's shell in Local (**Open site shell**), where `wp` is set up for that site, or use the community [local-wp-mcp](https://github.com/chrisfromthelc/local-wp-mcp) server.

## Proven Lab tools still apply

Local runs WordPress; the `provenlab` tools tell you which APIs to use. Keep looking up signatures with `get_function` and WP-CLI flags with `get_cli_command`.
