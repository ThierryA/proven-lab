---
nav: "No install: build on WP Engine"
title: "No install: build directly on WP Engine"
summary: "The easiest path for people who do not code or have nothing installed: the agent creates the site on WP Engine, builds on a staging environment through the WP Engine MCP server's sandbox, shows the result, then puts it live. No Local, no Git, no terminal for the user."
---

# No install: build directly on WP Engine

For people who describe what they want and let the agent do the rest ("vibe coding"): no Local, no Git, no terminal. The agent works on a **staging** environment on WP Engine through the WP Engine MCP server (`hosted-sites`) and its sandbox, shows the user a link, and only puts it live when they say yes.

Use this path when the user does not have Local, says they are not technical, or asks for the simplest option. A developer who wants a repository and local tests should use `local-development` and `wpe-deployment` instead.

## Talk to the user plainly

- Ask few questions, one message at a time, in everyday words: what the site is for, what visitors should be able to do, and the site's name. Choose the setup yourself (**Classic** unless they ask for a separate app) and say so in one line.
- Never ask them to run commands or edit files. Where a person must act (signing in, clicking **Connect**, approving a change), say exactly where to click.
- Before anything that costs money, changes a live site or cannot be undone, explain it in one sentence and wait for a yes.

## 1. Connect the WP Engine MCP server

The user needs a WP Engine account with WP Engine AI access.

- **Claude Code:** `claude mcp add --transport http --scope user wpengine https://api.ai.wpengine.com/v1/mcp`, then ask the user to run `/mcp`, choose `wpengine`, **Authenticate**, and sign in.
- **Claude Desktop or another MCP client:** add a remote MCP server with the URL `https://api.ai.wpengine.com/v1/mcp` and sign in when asked. See <https://developers.wpengine.com/docs/ai/api/mcp>.

Check it with `wpe_list_accounts`. Without a WP Engine account, offer to start one (<https://wpengine.com/plans/>) or switch to a local path (`local-development`, WordPress Playground).

## 2. Create the site and a staging environment

1. `wpe_list_sites` and `wpe_list_installs`: reuse an existing site if the user names one.
2. For a new site: `wpe_create_site` with the user's site name, then `wpe_create_install` for a **staging** environment (and **production** when they are ready to launch). Each call: preview first, explain it, then `confirm: true` after the user says yes. Install names are 3 to 14 lowercase letters and digits, unique across WP Engine.
3. Wait until `wpe_get_install` reports the environment as active (5 to 15 minutes), and tell the user it is coming.

## 3. Build on staging, in the sandbox

All work happens on the **staging** install, never on production. `sandbox_bash` runs commands in `/sites/<install name>`; sessions last 10 minutes and only the site folder persists.

1. Check the site: `wp core version`, `wp plugin list --format=json`.
2. Write the app as a **plugin**, new files only: `sandbox_write` to `wp-content/plugins/<app>/<app>.php` with a plugin header (data model, Abilities, routes), then `wp plugin activate <app>`; a theme or block templates for the look. Look up every WordPress function first with `get_function` / `get_hook`; follow `classic-wordpress` and `best-practices`.
3. Check each file: `php -l wp-content/plugins/<app>/<app>.php`, then verify with WP-CLI:

```bash
wp post-type list --fields=name,show_in_rest --format=json
wp eval 'var_dump( post_type_exists( "booking" ) );'
wp post create --post_type=booking --post_title="Test booking" --post_status=draft --porcelain
wp rewrite flush
```

4. Add sample content with WP-CLI so the user sees a real page, and remove test data they did not ask for.
5. AI features: install the WP Engine AI plugins with WP-CLI in the sandbox (`wpe-ai-plugins`) and ask the user to click **Connect** once in the staging site's WP Admin.
6. Edit existing files with `sandbox_read`, then the smallest `sandbox_edit`. Never change WordPress core or `wp-config.php`.

**Keep a copy of the code** in the user's working folder as you go (the same files you write to the server), so it can become a repository later and nothing lives only on the server.

## 4. Show the user

Send the staging link (the install's primary domain, from `wpe_get_install`) and a short list of what to try. Make changes until they are happy.

## 5. Go live: staging, then production

Only after the user says the staging site is right:

- **Production is new or empty (not launched yet):** copy staging to production with `wpe_copy_install`. It overwrites **everything** on production, files and database. Explain that in one sentence, then ask the user to type the production environment's name exactly as the confirmation.
- **Production is already live with real content:** never copy over it. Create a backup first (`wpe_create_backup`, then wait for `wpe_get_backup_status` to report completed), then put only the app's files on production: `sandbox_write` the same new files to the production install, run any needed WP-CLI steps (`wp rewrite flush`), and check the site.

Then check production (a request to the home page and the new pages, `wp post-type list`), purge the cache if needed (`wpe_purge_cache`, preview then confirm), connect production to WP Engine AI if the app uses AI (connections are per site URL), and tell the user what is live and where.

## 6. Afterwards

- Offer a repository and automatic deploys once the site matters (`wpe-deployment`): the copy of the code you kept is the starting point.
- For later changes, repeat sections 3 to 5: staging first, the user's yes, then production.
- Content (posts, pages, products) is changed on production directly with Abilities or WP-CLI, as drafts first (`hosted-sites`).
