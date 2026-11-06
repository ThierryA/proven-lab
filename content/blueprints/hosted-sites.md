---
nav: "Existing site on WP Engine"
title: "Existing site on WP Engine: the WP Engine MCP server"
summary: "When the site already runs on WP Engine, you work through the WP Engine MCP server: hosting tools, site Abilities, the knowledge base, and a sandbox with WP-CLI next to the site. Content changes go through Abilities or WP-CLI as drafts; file changes need the user's approval, a backup and staging first."
agent_does:
  - "Connects to your WP Engine account."
  - "Changes content as drafts, and code on staging first."
  - "Backs up before anything risky."
you_do:
  - "Sign in to WP Engine."
  - "Approve changes, especially on the live site."
---

# Existing site on WP Engine: the WP Engine MCP server

> **Runbook step 2 · Workspace,** when the site already runs on WP Engine. **Next:** build in step 3, ship in step 6 (`wpe-deployment`).

You work through the WP Engine MCP server; it acts with the signed-in user's WP Engine permissions and handles access to the servers. The user only signs in and approves changes. Do not set up SSH keys or the SSH Gateway.

## 1. Connect

```bash
claude mcp add --transport http --scope user wpengine https://api.ai.wpengine.com/v1/mcp
```

Ask the user to sign in (`/mcp` → `wpengine` → **Authenticate**; OAuth, no API key). Check with `list_account_sites`. The server is in closed beta: read its tool list rather than assuming names.

To run Abilities on a site, the site needs the WP Engine AI plugin (`wpe-hub`) and the user connects once, logged in to that site: `{site_url}/wp-admin/admin.php?page=power-overview&action=trigger_wp_connection` → **Connect WordPress User**.

## 2. Tools and IDs

| Group | Tools | Use for |
|---|---|---|
| Sites, knowledge base | `list_account_sites`, `search_knowledge_base`, `fetch_knowledge_base_document` | Find a site; search its content |
| Abilities | `search_abilities`, `run_site_ability` | Act inside WordPress with its permissions (`wp-engine-ai/create-posts`, `update-posts`, `manage-terms`) |
| Hosting | `wpe_list_sites`, `wpe_list_installs`, `wpe_create_backup`, `wpe_get_backup_status`, `wpe_purge_cache` | Environments, backups, caches |
| Sandbox | `sandbox_bash`, `sandbox_read`, `sandbox_edit`, `sandbox_write` | WP-CLI and files in `/sites/<install name>` |

Three IDs, never interchangeable; look them up, never guess: WordPress site ID (`site_…`, `list_account_sites`) for Abilities and the knowledge base; hosting site ID (UUID, `wpe_list_sites`); install ID (UUID, `wpe_list_installs`) for one environment, used by backups, caches and the sandbox.

## 3. Content changes

1. Prefer an **Ability** (`search_abilities`, then `run_site_ability` with its exact input schema).
2. Otherwise **WP-CLI** in `sandbox_bash`:

```bash
wp post create --post_type=post --post_title="Launch notes" --post_status=draft --porcelain
wp search-replace 'http://old.test' 'https://new.test' --dry-run
```

Drafts unless the user asks to publish. Show what will change before bulk updates. `--dry-run` first for `wp search-replace`; `wp db export` before anything you cannot undo.

## 4. Code and file changes

- **New features ship as code:** build in step 3 and deploy to staging, then production (`wpe-deployment`). Never develop on production.
- **A file must change on the server** (an urgent fix the user asks for): get approval for that file and environment, work on staging first, `wpe_create_backup` and wait for `wpe_get_backup_status`, then `sandbox_read` and the smallest `sandbox_edit` (never a full rewrite, never core or `wp-config.php`). Check with `php -l` and a request, purge the cache, report every changed line, and put the same change in the repository.
- **Hosting changes** (restores, installs, domains, users, copies between environments) preview first and run with `confirm: true` only after the user's approval. Never copy an environment over production that has real content.

## Done when

The change is on staging, the user approved it, it is on production, and you reported what changed.
