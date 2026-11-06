---
nav: "Verify with WP-CLI"
title: "Verify with WP-CLI"
summary: WP-CLI (wp) is the official command-line tool for WordPress. Agents use it to install, seed, inspect and verify a site without a browser, in every setup, locally and on remote hosts.
agent_does:
  - "Checks every change with WordPress's command-line tool instead of guessing."
  - "Reports what it checked."
you_do:
  - "Nothing."
---

# Verify with WP-CLI

> **Runbook step 5 · Verify,** for everyone. Prove every change with `wp`, locally or through the WP Engine MCP server's sandbox. **Next:** developers, `best-practices`; then step 6, `wpe-deployment`.

Agents should not have to click through WP Admin, and they should not guess whether code worked. **`wp` gives them a deterministic, scriptable interface to the Core API.** Use it to set up environments, create test data, inspect state, and prove that the model you wrote actually registered. Look up any command with the MCP tools `list_cli_commands` and `get_cli_command`; the full tree is generated from the WP-CLI release, so flags are exact.

## 1. Stand up a local site

```bash
wp core download
wp config create --dbname=app --dbuser=root --dbpass=secret
wp db create
wp core install --url=http://localhost:8080 --title="App" --admin_user=admin --admin_email=dev@example.com --skip-email
wp rewrite structure '/%postname%/' --hard
```

Use `wp core version`, `wp core check-update` and `wp config list` to inspect the environment before choosing APIs (many functions have a `since` version; see `get_function`).

## 2. Verify the data model you registered

After writing and activating the plugin (`wp plugin activate <app>`, see `custom-app`), prove it:

```bash
wp post-type list --fields=name,public,show_in_rest
wp taxonomy list --fields=name,object_type,show_in_rest
wp eval 'var_dump( get_registered_meta_keys( "post", "project" ) );'
wp eval 'var_dump( get_registered_meta_keys( "user" ) );'
wp post create --post_type=project --post_title="Smoke test" --meta_input='{"budget":1200}' --porcelain
wp post meta get <id> budget
curl -s localhost:8080/wp-json/wp/v2/projects | head -c 300     # REST exposure check (needs the site served)
```

`wp eval` and `wp eval-file` run PHP inside a fully loaded WordPress. They are the agent's REPL for any Core API (`get_function` tells you what to call).

## 3. Users, roles, capabilities and application passwords

```bash
wp user create editor1 editor1@example.com --role=editor --porcelain
wp role list
wp cap list editor                        # inspect capabilities
wp user application-password create admin node-app --porcelain   # credential for a Node backend
wp user application-password list admin
```

Test authorization with the real user: `wp --user=editor1 eval 'var_dump( current_user_can( "edit_posts" ) );'`.

## 4. Seed, import, migrate

```bash
wp post generate --count=20 --post_type=project     # fake content for UI work
wp plugin install wordpress-importer --activate   # wp import needs it
wp import content.xml --authors=create
wp media import ./images/*.jpg --porcelain
wp search-replace 'http://old.test' 'https://new.test' --dry-run
wp db export backup.sql && wp db import backup.sql
```

Always `--dry-run` first on `search-replace`, and export the database before destructive work.

## 5. Operate: cache, cron, rewrites, options

```bash
wp cache flush && wp transient delete --all
wp cron event list && wp cron event run --due-now
wp rewrite flush
wp option get siteurl && wp option update blogdescription "New tagline"
wp maintenance-mode status
```

## 6. Scaffold code

`wp scaffold plugin`, `wp scaffold post-type`, `wp scaffold taxonomy`, `wp scaffold child-theme`, `wp scaffold plugin-tests`. Use them for boilerplate, then edit. For blocks, use `npx @wordpress/create-block` (`wp scaffold block` is deprecated).

## 7. Machine-friendly output

Prefer structured output so you can parse results:

- `--format=json` on `list` and `get` commands (other formats such as `csv`, `yaml`, `ids` or `count` vary by command).
- `--porcelain` prints only the primary value, usually the new ID (for `user application-password create`, the password).
- `--fields=ID,post_title` limits columns.
- `--quiet` suppresses success lines; check the exit code instead.
- `--skip-plugins --skip-themes` isolates your code from third-party plugin breakage when debugging.

## 8. Remote targets

- `wp --path=/var/www/site --url=https://site.test <cmd>` targets a specific install or multisite blog.
- `wp --ssh=user@host/path <cmd>` runs against a remote install on other hosts where the user already has SSH access. Never on WP Engine: use the WP Engine MCP server's `sandbox_bash`, which handles access itself.
- Docker setups: `--ssh=docker:<container>` or `docker compose exec wordpress wp ...`.

## 9. On WP Engine: the WP Engine MCP sandbox

When the site is on WP Engine, agents run WP-CLI through the **WP Engine MCP server** (`wpengine-cloud`): `sandbox_bash` runs a command in a sandboxed session next to the site, in `/sites/<install name>`, and `sandbox_read`, `sandbox_edit` and `sandbox_write` handle files. The MCP server opens the session with the user's WP Engine sign-in. **Do not generate SSH keys, add keys to the account or configure the SSH Gateway for yourself**: connect the WP Engine MCP server and let it handle access.

```bash
wp core version
wp post-type list --format=json
wp search-replace 'old.test' 'new.test' --dry-run
```

Each session is a container with WP-CLI, `mysql`, bash and Composer. Never set up or use SSH to WP Engine yourself: the MCP server connects for you.

What the sandbox means for an agent:
- **Isolated:** a new container per session, separate per site. No root or sudo, and server processes and logs are not visible.
- **Short-lived:** the session times out after 10 minutes. Long-running processes die with it, so batch big jobs.
- **Only the site persists:** files outside `/sites/<environment>/` (home, `/tmp`) are discarded. Keep scripts in `_wpeprivate/`, which is not web-accessible.
- **Limits:** 5 sessions per user at a time.
- Take a backup before changing a live environment.

## Rules for agents
1. Verify with `wp` after every model change; do not assume registration worked.
2. Never run `wp db reset`, `wp site empty`, `wp post delete --force` or `wp search-replace` (without `--dry-run`) against a shared or production environment without explicit user approval.
3. Use `--porcelain` / `--format=json` and check exit codes; do not scrape human text.
4. Keep credentials (application passwords) out of the repo; create them via `wp user application-password create` and store in `.env`.
5. Works the same for standard and headless architectures: the CLI talks to the Core API, not to the frontend.
