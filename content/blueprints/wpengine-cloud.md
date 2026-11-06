---
nav: "In the cloud (WP Engine)"
title: "Workspace in the cloud: WP Engine"
summary: "Build in the cloud with nothing to install: you work through the WP Engine MCP server on a new or existing WP Engine site. Build and change on staging in its sandbox, send the user a link, and go live after their yes. The user only signs in and approves."
agent_does:
  - "Connects to your WP Engine account, and creates the site and a staging copy if needed."
  - "Builds or changes the app on staging, and sends you a link to check."
  - "Backs up, then puts it live after your yes."
you_do:
  - "Sign in to WP Engine once."
  - "Say yes to what the agent proposes."
  - "Check the staging link before it goes live."
---

# Workspace in the cloud: WP Engine

> **Runbook step 2 · Workspace,** for anyone without Local, every non-developer, and every site already on WP Engine. Section 5 covers going live (step 6). **Next:** step 3, `classic-wordpress` or `custom-app`, writing files in the sandbox.

You do everything through the WP Engine MCP server: it acts with the user's WP Engine permissions and handles access to the servers. The user only signs in, says yes to what you propose, and checks the link you send. Never ask them to run anything, and do not set up SSH keys or the SSH Gateway.

## 1. Connect

```bash
claude mcp add --transport http --scope user wpengine https://api.ai.wpengine.com/v1/mcp
```

Ask the user to sign in: `/mcp` → `wpengine` → **Authenticate** in Claude Code (OAuth, no API key); other clients add a remote MCP server with that URL. Check with `wpe_list_accounts`. The server is in closed beta: read its tool list rather than assuming names.

No WP Engine account: offer to set one up (https://wpengine.com/plans/) or switch to `local-development`.

## 2. Find or create the site

- **Existing site:** `wpe_list_sites`, `wpe_list_installs`. Work on its **staging** install; create one with `wpe_create_install` if it has none.
- **New site:** `wpe_create_site`, then `wpe_create_install` with `environment: staging` (a name of 3 to 14 lowercase letters and digits). Poll `wpe_get_install` until active (5 to 15 minutes) and tell the user it is on its way.
- Tools that change things preview first: explain in one sentence, then call again with `confirm: true` after the user's approval.

Three IDs, never interchangeable; look them up, never guess: the hosting site ID (UUID, `wpe_list_sites`), the install ID (UUID, `wpe_list_installs`) for one environment, used by the sandbox, backups and caches, and the WordPress site ID (`site_…`, `list_account_sites`) for Abilities and the knowledge base.

## 3. Build on staging

`sandbox_bash` runs on the chosen install in `/sites/<install name>` (10-minute sessions; only the site folder persists). Work on staging, never production.

- Write the plugin with `sandbox_write` to `wp-content/plugins/<app>/<app>.php`, then `wp plugin activate <app>`. Follow `classic-wordpress` or `custom-app`; look up every function with `get_function`.
- Change existing files with `sandbox_read` and the smallest `sandbox_edit`. Never touch WordPress core or `wp-config.php`.
- Check every file with `php -l` and verify with WP-CLI in `sandbox_bash` (`wp-cli-for-agents`). Add sample content so the user sees a real page.
- AI features: install the WP Engine AI plugins with WP-CLI (`wpe-ai-plugins`) and ask the user to click **Connect** once in the staging site's WP Admin.
- Keep a copy of every file you write in the user's working folder; for a site with a repository, commit the change there too.

Send the staging link (`wpe_get_install`, primary domain) with what to try, and iterate until the user is happy.

## 4. Content on a live site

Content (posts, pages, terms) is changed where it lives, usually production:

1. Prefer an **Ability**: `search_abilities`, then `run_site_ability` with its exact input schema. The site needs the WP Engine AI plugin (`wpe-hub`), and the user connects once, logged in to that site: `{site_url}/wp-admin/admin.php?page=power-overview&action=trigger_wp_connection` → **Connect WordPress User**.
2. Otherwise WP-CLI in `sandbox_bash`, for example `wp post create --post_status=draft --porcelain`.

Drafts unless the user asks to publish. Show what will change before bulk updates; `wp search-replace` with `--dry-run` first; `wp db export` before anything you cannot undo.

## 5. Go live (step 6)

Follow `wpe-deployment`: offer to deploy to production once the user is happy with staging (or straight away if they chose no staging), back up a live site first (`wpe_create_backup`), deploy the plugin's files, check the live pages, and tell the user what is live.

## Done when

The user approved staging, the change is live, and you reported what changed and where. Once the site matters and has no repository, offer one with automatic deploys (`wpe-deployment`), starting from the files you kept.
