---
nav: "Existing site on WP Engine"
title: "Existing site on WP Engine: the WP Engine MCP server"
summary: "When the site is already hosted on WP Engine, connect the WP Engine MCP server: account and hosting tools, site Abilities, the knowledge base, and a sandbox with WP-CLI on the site's server. Content changes go through Abilities or WP-CLI; file changes need a backup, staging first and the user's approval."
---

# Existing site on WP Engine: the WP Engine MCP server

> **Runbook step 2 · Workspace,** when the site already runs on WP Engine: content changes, fixes, and checks on staging or production. **Next:** build in step 3, ship in step 6 (`wpe-deployment`).

Work locally with Local (`local-development`). When the site already runs on WP Engine, when the user wants to change content on a hosted environment, or when they want to build with nothing installed (`build-on-wpengine`), use the **WP Engine MCP server**. It acts with the signed-in user's WP Engine permissions.

## 1. Connect it

```bash
claude mcp add --transport http --scope user wpengine https://api.ai.wpengine.com/v1/mcp
```

Then, in Claude Code, run `/mcp`, select `wpengine`, choose **Authenticate** and sign in with the WP Engine account. Sign-in is OAuth: do not add an `Authorization` header or an API key. The user needs a WP Engine account with WP Engine AI access. The kit's `.mcp.json` already lists this server, so each teammate only has to authenticate.

Check it: ask for the user's sites (`list_account_sites`).

**Running Abilities on a site needs one more connection, once per site and per person:** the site needs the WP Engine AI plugin (`wpe-hub`) and the user opens `{site_url}/wp-admin/admin.php?page=power-overview&action=trigger_wp_connection` while logged in to that site, then clicks **Connect WordPress User**. Listing sites and searching the knowledge base work without it.

The server is in closed beta: read its current tool list rather than assuming names.

## 2. What it provides

| Group | Tools (examples) | Use for |
|---|---|---|
| Sites and knowledge base | `list_account_sites`, `get_site_knowledge_base`, `search_knowledge_base`, `fetch_knowledge_base_document` | Find a site; search its content |
| Abilities | `search_abilities`, `list_site_abilities`, `run_site_ability` | Act inside WordPress as the connected user, e.g. `wp-engine-ai/create-posts`, `update-posts`, `manage-terms`, `upload-image-from-url` |
| Hosting | `wpe_list_accounts`, `wpe_list_sites`, `wpe_list_installs`, `wpe_create_backup`, `wpe_get_backup_status`, `wpe_purge_cache`, domains, SSL, users | Environments, backups, caches, domains |
| sandbox | `sandbox_bash`, `sandbox_read`, `sandbox_edit`, `sandbox_write` | WP-CLI and files on the site's server, in `/sites/<install name>` |

Three different IDs, never interchangeable: the **WordPress site ID** (`site_…`, from `list_account_sites`) for Abilities and the knowledge base; the **hosting site ID** (UUID, from `wpe_list_sites`) for hosting site tools; the **install ID** (UUID, from `wpe_list_installs`) for one environment (production, staging, development), used by backups, caches and the sandbox. Never guess an ID; look it up.

## 3. Content changes on a hosted site

Prefer, in this order:

1. **An Ability** with `run_site_ability`: it runs with WordPress permissions and validation. Find it with `search_abilities` and match its input schema exactly.
2. **WP-CLI in the sandbox** with `sandbox_bash`, for example:

```bash
wp post create --post_type=post --post_title="Launch notes" --post_status=draft --porcelain
wp post list --post_type=page --fields=ID,post_title,post_status --format=json
wp search-replace 'http://old.test' 'https://new.test' --dry-run
```

Rules: create and update as **drafts** unless the user asks to publish; show the user what will change before bulk updates; run `wp search-replace` with `--dry-run` first; export the database (`wp db export`) before anything you cannot undo.

## 4. File and code changes: be careful

A file changed on a live server bypasses Git, review and deployment, and can take the site down. So:

1. **Ship code through the normal path:** commit to the repository and deploy to staging, then production (`wpe-deployment`: WP Engine's GitHub Action, or a Local push to staging). Do not develop on production in the sandbox. The one exception is the no-install path (`build-on-wpengine`): new code is written on a **staging** environment, never production, and promoted after the user checks it.
2. **If a file must change on the server** (an urgent fix, a config the user asks for):
   - Get the user's explicit approval for that file and that environment.
   - Work on **staging or development** first, production only after the user confirms.
   - Create a backup first: `wpe_create_backup` (preview, then `confirm: true` after approval) and wait for `wpe_get_backup_status` to report completed.
   - `sandbox_read` the file, then make the smallest `sandbox_edit`. Do not rewrite whole files with `sandbox_write`.
   - Never touch WordPress core or `wp-config.php`, and never delete files, unless the user asks for exactly that.
   - Check the result: `php -l <file>` and a request to the site; purge the cache with `wpe_purge_cache` if needed (preview, then confirm).
   - Report every changed file and line, and put the same change in the repository so the next deploy keeps it.
3. **Hosting actions that change things** (backups restore, installs, domains, users, cache purges) use a preview, then `confirm: true` only after the user approves. Deletions and restores also need the confirmed name. Never restore a backup or copy an environment over another without explicit approval.

## 5. Local and hosted together

- **Build locally** in Local, with tests and WP-CLI.
- **Deploy code** through Git (`wpe-deployment`: staging on push, production after approval), or push the Local site to a **staging** environment (`local_wpe_push` in Local's MCP server). A push replaces the environment's files and database: never push to production without the user's explicit approval, because it overwrites live content.
- **Change content on the hosted site** with Abilities or WP-CLI as above, rather than pushing a local database over live content.
- **Pull** the hosted site into Local (`local_wpe_pull`) to reproduce an issue.
