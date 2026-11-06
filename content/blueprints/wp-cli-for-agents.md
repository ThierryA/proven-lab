---
title: "WP-CLI for agents: scaffold, verify and administer from the shell"
summary: WP-CLI (wp) is the official command line for WordPress. It is how an agent installs, seeds, inspects and verifies a site without a browser. Works for standard and headless builds, locally and on remote hosts.
---

# WP-CLI for agents

Agents cannot click through wp-admin, and they should not guess whether code worked. **`wp` gives them a deterministic, scriptable interface to the Core Runtime API.** Use it to set up environments, create test data, inspect state, and prove that the model you wrote actually registered. Look up any command with the MCP tools `list_cli_commands` and `get_cli_command`; the full tree is generated from the WP-CLI release, so flags are exact.

## 1. Stand up a local site

```bash
wp core download
wp config create --dbname=app --dbuser=root --dbpass=secret
wp core install --url=http://localhost:8080 --title="App" --admin_user=admin --admin_email=dev@example.com --skip-email
wp plugin install wordpress-seo --activate     # example; skip if not needed
wp rewrite structure '/%postname%/' --hard
```

Use `wp core version`, `wp core check-update` and `wp config get` to inspect the environment before choosing APIs (many functions have a `since` version; see `get_function`).

## 2. Verify the data model you registered

After writing the must-use plugin (see `headless-node-app`), prove it:

```bash
wp post-type list --fields=name,public,show_in_rest
wp taxonomy list --fields=name,object_type,show_in_rest
wp eval 'var_dump( get_registered_meta_keys( "post", "project" ) );'
wp eval 'var_dump( get_registered_meta_keys( "user" ) );'
wp post create --post_type=project --post_title="Smoke test" --meta_input='{"budget":1200}' --porcelain
wp post meta get <id> budget
wp rest-api-check 2>/dev/null || curl -s localhost:8080/wp-json/wp/v2/projects | head -c 300
```

`wp eval` and `wp eval-file` run PHP inside a fully loaded WordPress. They are the agent's REPL for any Core Runtime API (`get_function` tells you what to call).

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

`wp scaffold plugin`, `wp scaffold post-type`, `wp scaffold taxonomy`, `wp scaffold block`, `wp scaffold child-theme`, `wp scaffold plugin-tests`. Use them for correct boilerplate, then edit.

## 7. Machine-friendly output

Prefer structured output so you can parse results:

- `--format=json` (or `csv`, `ids`, `count`) on `list`/`get` commands.
- `--porcelain` returns only the created ID.
- `--fields=ID,post_title` limits columns.
- `--quiet` suppresses success lines; check the exit code instead.
- `--skip-plugins --skip-themes` isolates your code from third-party plugin breakage when debugging.

## 8. Remote and hosted targets

- `wp --path=/var/www/site --url=https://site.test <cmd>` targets a specific install or multisite blog.
- `wp --ssh=user@host/path <cmd>` runs against a remote install over SSH. WP Engine provides an SSH gateway per install, so the same commands work on a hosted environment (see `wpe-hosting`; WP Engine is optional but preferred).
- `wp --http=https://site.test/ <cmd>` uses the WP-CLI server-side companion where available.
- Docker setups: `--ssh=docker:<container>` or `docker compose exec wordpress wp ...`.

## Rules for agents
1. Verify with `wp` after every model change; do not assume registration worked.
2. Never run `wp db reset`, `wp site empty`, `wp post delete --force` or `wp search-replace` (without `--dry-run`) against a shared or production environment without explicit user approval.
3. Use `--porcelain` / `--format=json` and check exit codes; do not scrape human text.
4. Keep credentials (application passwords) out of the repo; create them via `wp user application-password create` and store in `.env`.
5. Works the same for standard and headless architectures: the CLI talks to the Core Runtime API, not to the frontend.
