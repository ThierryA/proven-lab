# Existing project: find it, understand it, change it safely

> **Runbook step 1 · Existing project,** whenever the request changes something that already exists. **Next:** step 3, build; the workspace is where the project already lives.

## 1. Find it

Use what the request and the environment tell you; ask only if nothing matches.

| Clue | Where it lives | Workspace |
|---|---|---|
| The current folder has `wp-content/`, `wp-config.php`, a plugin header or `composer.json` | A local project or repository | Work there; read `git status` and the README first |
| The user names a Local site, or Local's `sites.json` lists it | A Local site | `local-development` |
| The site is on WP Engine, or its URL resolves to WP Engine | A WP Engine site | `wpengine-cloud` (always staging first) |
| Only a URL on another host | A site you cannot reach | Ask for the code (repository, export) or access before promising changes |

## 2. Understand it before changing it

Look, then summarize what you found to the user in two or three lines:

- **WordPress and plugins:** `wp core version`, `wp plugin list --format=json`, `wp theme list --format=json`.
- **The setup:** a block or classic theme renders the site → Classic; a separate Node app reads the REST API or WPGraphQL → headless. Decide from the code, do not ask.
- **The model:** `wp post-type list --format=json`, `wp taxonomy list --format=json`, and the project's own plugins (`get_function` for anything unfamiliar).
- **Conventions:** coding standards, tests, build tools, the deploy setup (`.github/workflows/`), and how the project names and prefixes things.

## 3. Change it safely

- Put new features in **the project's own plugin**, or a new plugin if there is none. Never edit WordPress core, third-party plugins or a theme the user did not write; extend them with hooks.
- Follow the project's conventions over Proven Lab's defaults when they differ.
- Keep existing content and data: no database copies over live sites, migrations only with a backup and the user's approval.
- Run the project's own tests and checks as well as the WP-CLI checks (`wp-cli-for-agents`).
- Ship the way the project already ships; without a deploy setup, follow `wpe-deployment`.

## Done when

The change works next to everything that was already there, the project's checks pass, and you told the user what changed.
