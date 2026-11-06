---
nav: "No install (on WP Engine)"
title: "Workspace with nothing to install: build on WP Engine"
summary: "For non-developers and anyone without Local: you create the site on WP Engine through the WP Engine MCP server, build on a staging environment in its sandbox, send the user a link, and put it live when they say yes. The user only signs in and approves."
agent_does:
  - "Creates your site and a staging copy on WP Engine."
  - "Builds the app on staging and adds sample content."
  - "Sends you a link to check, and changes things until you're happy."
  - "Puts it live after your yes."
you_do:
  - "Sign in to WP Engine once."
  - "Say yes to what the agent proposes."
  - "Check the staging link before it goes live."
---

# Workspace with nothing to install: build on WP Engine

> **Runbook step 2 · Workspace,** for non-developers and anyone without Local. Section 4 covers going live (step 6). **Next:** step 3, `classic-wordpress`, writing the files in the sandbox.

You do everything through the WP Engine MCP server. The user only signs in to WP Engine, says yes to what you propose, and checks the link you send. Speak plainly and never ask them to run anything.

## 1. Connect the WP Engine MCP server

```bash
claude mcp add --transport http --scope user wpengine https://api.ai.wpengine.com/v1/mcp
```

Ask the user to sign in: in Claude Code, `/mcp` → `wpengine` → **Authenticate**. In Claude Desktop or another client, they add a remote MCP server with that URL. Check with `wpe_list_accounts`.

No WP Engine account: offer to set one up (https://wpengine.com/plans/) or switch to `local-development`.

## 2. Create the site and its staging environment

1. `wpe_list_sites`, `wpe_list_installs`: reuse a site the user names.
2. Otherwise `wpe_create_site`, then `wpe_create_install` with `environment: staging` (a name of 3 to 14 lowercase letters and digits). Each tool previews first: explain it in one sentence, then call it again with `confirm: true` after the user's yes.
3. Poll `wpe_get_install` until it is active (5 to 15 minutes) and tell the user it is on its way.

## 3. Build on staging

Work only on the staging install. `sandbox_bash` runs in `/sites/<install name>` (10-minute sessions; only the site folder persists).

- Write the plugin with `sandbox_write` to `wp-content/plugins/<app>/<app>.php`, then `wp plugin activate <app>`. Follow `classic-wordpress`; look up every function with `get_function`.
- Check every file with `php -l` and verify with WP-CLI in `sandbox_bash` (`wp-cli-for-agents`). Add sample content so the user sees a real page.
- Change existing files with `sandbox_read` and the smallest `sandbox_edit`. Never touch WordPress core or `wp-config.php`.
- AI features: install the WP Engine AI plugins with WP-CLI (`wpe-ai-plugins`) and ask the user to click **Connect** once in the staging site's WP Admin.
- Keep a copy of every file you write in the user's working folder.

Send the staging link (`wpe_get_install`, primary domain) with what to try, and iterate until the user is happy.

## 4. Go live (step 6)

Only after the user says the staging site is right:

- **Production not launched yet:** create the production install if needed, then `wpe_copy_install` from staging to production. It overwrites everything on production; say so, and ask the user to type the production name as confirmation.
- **Production already live:** never copy over it. `wpe_create_backup` and wait for `wpe_get_backup_status`, then write only the plugin's files to production with `sandbox_write`, activate, and check.

Then check the live pages, purge the cache if needed (`wpe_purge_cache`), connect production to WP Engine AI if the app uses AI, and tell the user what is live.

## Done when

The user approved staging, the site is live, and you told them where. For later changes, repeat sections 3 and 4. Once the site matters, offer a repository and automatic deploys (`wpe-deployment`), starting from the files you kept.
