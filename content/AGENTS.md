# Proven Lab runbook for coding agents

*Proven Lab {{VERSION}}*

You build or change applications where **WordPress is the application layer**: data, users and permissions, validation, hooks, REST and Abilities come from WordPress. The admin and the frontend are WordPress or a custom app. AI comes from the Cloud AI API. WP Engine hosting is optional.

**Three rules that always apply:**

1. **Never change WordPress core.** No edits to `wp-admin/`, `wp-includes/` or the root `wp-*.php` files, ever; configuration goes through `wp config set`, never by editing core.
2. **Never edit plugins or themes the user did not write.** Change their behavior with their hooks (`add_action`, `add_filter`), a child theme, or the extension points they document (template overrides, settings, APIs), from the user's own plugin. If no hook exists, say so and propose an alternative; never patch the files (updates would erase the change).
3. **Use the core APIs; do not build what WordPress already has.** No custom database tables, custom login, custom roles storage, custom caching or custom HTTP code when a core API does it (table in step 3).

Follow the steps in order. Each step names its guides: `get_blueprint <slug>`, or `curl "{{BASE}}/api/get_blueprint?slug=<slug>"`.

## Access: nothing to install

- **Tools over HTTP:** `GET {{BASE}}/api/<tool>?<args>`. Guides are also markdown at `{{BASE}}/blueprints/<slug>.md`.
- **Proven Lab MCP server** (optional, faster): `claude mcp add --transport http provenlab {{MCP_URL}}`. A server added mid-session appears after a restart; keep using HTTP meanwhile.
- Do not ask the user to install anything before you start.

## 0. Project memory

If `.provenlab/project.md` exists, read it first and skip every question it answers. After step 2, write it (and keep it current):

```markdown
# Proven Lab project
- Proven Lab: {{VERSION}} (when the runbook shows a newer version, reread it and update the kit)
- User: developer | non-developer
- Project: new | existing (what it is)
- Setup: Classic | Headless Frontend | Headless Admin | Headless Frontend + Admin
- WordPress: local path or site URL; version
- Plugin: slug, PHP prefix, text domain; theme
- Environments: local / staging / production (WP Engine install names, if any)
- Git: GitHub repository URL or none; default branch; push policy (ask | auto); deploy on push (yes | no)
- AI: connected on which environments
```

## Who you are working with

Decide from the request and the environment, and ask once only if it is unclear ("Do you want to work with the code yourself, or should I handle everything?").

| Signal | Path |
|---|---|
| Mentions code, Git, tests, a terminal; or the folder is a repository | Developer |
| Describes the result only, no technical words | Non-developer |
| You run in a remote container (cloud agent, CI, pull request): no local apps, no browser sign-in | Developer path in the repository: branch, commits, pull request, CI. Do not try Local or interactive sign-in |

| | Developer | Non-developer |
|---|---|---|
| Questions | New or existing, setup, where to build, repository; wait for the answers | What the site is for and its name, plainly; propose the rest in one line and continue unless they object |
| Setup | Their choice | Classic: "I'll build it as a regular WordPress site" |
| Where to build | Local on their computer | In the cloud on WP Engine if they have an account; otherwise Local, guided step by step |
| Checks | Coding standards, PHPUnit, PHPStan, Plugin Check | WP-CLI checks, the pages load |
| Shipping | Staging, then production; GitHub Action if they want it | Staging link, then production after their yes |

Never ask a non-developer to run commands or edit files. When a person must act (signing in, clicking **Connect**, approving), say exactly where to click.

**Explain visually.** When you explain a structure (the site's pages and navigation, the data model, how WordPress, the custom app and the Cloud AI API fit together, the plan, the path from local to staging to production), show it instead of describing it in paragraphs. Use the best your app supports, in this order:

1. **Generative UI:** if your app can render interactive visuals (widgets, artifacts, canvases, rendered HTML or SVG), draw the diagram there: boxes for pages or records, arrows for links and relations, short labels.
2. **Mermaid:** a fenced `mermaid` block (most chat apps, editors and GitHub render it), for example `flowchart` for pages and deploys, `erDiagram` for the data model.
3. **Text:** a compact tree or table.

Keep it small (one idea per visual, under about 15 boxes) and label in the user's words; for non-developers, no technical names in the visual.

## 1. New or existing project?

Find out first, from the request or with one question.

**Existing project:** guide `existing-project`. Find where it lives, inspect it, read its setup from the code. Ask only what you cannot find.

**New project:** ask in one message, only what the user has not said yet:

- **Which setup?** Classic (WP Admin and WordPress templating) · Headless Frontend (WP Admin and your own frontend app) · Headless Admin (your own admin app and WordPress templating) · Headless Frontend + Admin (your own admin and frontend app). Recommend one: a content site → Classic; an app with its own interface → Headless Frontend + Admin. Guide: `architecture`.
- **Where to build?** Check whether Local (localwp.com) is installed. Offer: on your computer with Local, or in the cloud on WP Engine with nothing to install. **The cloud needs a WP Engine account** (paid): ask whether they have one; without one, say so and recommend Local (free).
- **GitHub?** Developers: a new private repository, an existing one, or none for now. Non-developers, plainly: "I can keep a history of every change on GitHub (free), so nothing is lost. Want that?" Also ask the push policy once: push after your OK (default) or automatically. Guide: `git-workflow`.

Developers: wait for the answers and never pick the setup for them. Non-developers: follow the tables above.

## 2. Set up the workspace

- **On the user's computer:** `local-development`.
- **In the cloud, and every site already on WP Engine:** `wpengine-cloud`. If the WP Engine MCP server is unavailable or refuses access (it is in beta), tell the user, build locally instead, and deploy with the GitHub Action or a plugin zip (`wpe-deployment`).
- **Existing project:** work where it lives (`existing-project`).
- **GitHub:** connect it now if the user wants it (`git-workflow`): `gh auth status`, create or connect the repository, `.gitignore`, first commit and push.
- Turn on error logging on local and staging sites: `wp config set WP_DEBUG true --raw` and `wp config set WP_DEBUG_LOG true --raw`.

Then write `.provenlab/project.md`.

## 3. Build

- **Reuse before building.** A maintained plugin that does the job beats new code: payments and shops → WooCommerce; forms → an existing forms plugin when the user agrees. Build what is specific to the app.
- **Start from the template:** `get_template` with `plugin` and the slug: a regular plugin in `wp-content/plugins/<slug>/`, activated with `wp plugin activate <slug>`. Never a must-use plugin, a theme's `functions.php`, or WordPress core.
- **Conventions from the first line:** prefix every post type, meta key, option, hook and function with the plugin prefix (or a namespace); one text domain; register on the right hook.
- **Model first, with core data structures:** post types, taxonomies and registered meta on `init`, with `show_in_rest => true` for anything a custom app uses.
- **Core API first** (look each one up before using it):

| The app needs | Use |
|---|---|
| Records (bookings, members, products, notes) | A post type + registered meta (`register_post_type`, `register_post_meta`) |
| Categories, tags, statuses, relationships between records | Taxonomies (`register_taxonomy`), or post meta holding the related ID |
| Data about users | User meta (`register_meta( 'user', ... )`); roles and capabilities (`add_role`, `map_meta_cap`) |
| Settings | Options with the Settings API (`register_setting`) |
| Sign-in, accounts, permissions | Core users, application passwords, capabilities: never custom auth |
| Files and images | The media library (`media_handle_upload`, `wp_get_attachment_url`) |
| Scheduled and background work | WP-Cron (`wp_schedule_event`), or Action Scheduler if already installed |
| Caching | Transients and the object cache (`set_transient`, `wp_cache_get`) |
| Calls to other services, email | `wp_remote_get` / `wp_remote_post`, `wp_mail` |
| Custom endpoints and actions | `register_rest_route`, Abilities (`wp_register_ability`) |
| Search and queries | `WP_Query`, `WP_User_Query`, `WP_Term_Query`; the Cloud AI API knowledge base for meaning-based search |

- **No custom database tables** unless the user explicitly agrees after you explain why core structures cannot work (for example, millions of rows queried in ways meta cannot index). Then create them with `dbDelta()` on activation, prefixed, with a schema version option and cleanup in `uninstall.php`.
- **Permissions** are WordPress capabilities in `permission_callback`, `auth_callback` and `current_user_can()`, never only in the interface. Custom actions are **Abilities**.
- **By setup:** Classic → `classic-wordpress` (block theme first). Headless → `custom-app`. Anything people see → `frontend-design`.
- **Look up before you write:** `get_function`, `get_class`, `get_hook`; `get_cli_command` before running WP-CLI.

## 4. Add AI, if the app needs it

Guide: `wpe-ai-plugins`. AI uses the Cloud AI API through the WP Engine AI plugins, with **no API key**: install them with WP-CLI, ask the user to click **Connect** once, then:

- `wp_ai_client_prompt()->using_provider( 'wpengine' )` for text and images;
- `wpe_auth_api_request()` for every other endpoint: transcription (`createTranscription`), alt text, summaries, the knowledge base, agents. `get_ai_operation` returns the fields and a PHP call;
- a short-lived browser session token for interactive chat.

Connecting needs a WP Engine account with AI access, and requests use credits: say so before you start. Without an account, explain that and, only with the user's consent, use the WordPress AI Client with another provider they choose (the `wp_ai_client_prompt()` code stays the same). Not the Web Speech API unless the user asks. Code outside WordPress: `ai-features`.

## 5. Verify

- Prove behavior with **WP-CLI** and real HTTP requests, not by rereading code: `wp-cli-for-agents`, or `get_template` with `verify-script`. Locally run `wp` in the site; on WP Engine use the WP Engine MCP server's `sandbox_bash`.
- A fatal error in your plugin breaks `wp` too: `wp --skip-plugins plugin deactivate <slug>`, read `wp-content/debug.log`, fix, reactivate.
- Developers: the checks in `best-practices` (coding standards, PHPUnit, PHPStan, Plugin Check).
- Report what you checked and the results.
- **Commit** each verified change with a clear message (`git-workflow`); never commit broken code or secrets.

## 6. Ship

Guide: `wpe-deployment`.

- **No staging environment?** Suggest one. If the user does not want it, deploy straight to production with a backup first.
- **Staging:** deploy, send the link and what to check, then offer production. Production only after the user's yes.
- **Commit, then push** (always commit before pushing), following the push policy in `.provenlab/project.md`.
- **Deploy the plugin and the theme.** With GitHub and WP Engine, a push to `main` deploys to staging through WP Engine's GitHub Action; production runs after the user's yes. Without GitHub: files through the WP Engine MCP server.
- Never copy another environment's database over a production site with real content.
- WP Engine is optional: the app is a plugin and a theme, so it deploys to any WordPress host.

## Hard rules

- Never change WordPress core; never edit third-party plugins or themes (hooks, child themes and documented extension points only); core APIs before custom code; no custom tables without the user's explicit agreement.
- Sanitize input, validate against the REST or ability schema, escape output. `$wpdb->prepare()` for any SQL.
- Check `since` against the target WordPress version; guard newer APIs with `function_exists()`.
- Hooks: `init` for types and meta, `rest_api_init` for routes, `wp_abilities_api_categories_init` then `wp_abilities_api_init` for Abilities.
- Flush rewrite rules once, after registering the post types, in the activation hook or with `wp rewrite flush`; never on every request.
- Secrets (application passwords, API keys) never go to browser code or version control.
- On WP Engine, use the WP Engine MCP server (`https://api.ai.wpengine.com/v1/mcp`, OAuth sign-in) for WP-CLI and files; it connects for you. Never generate SSH keys or configure the SSH Gateway.
- Git: always commit before pushing; never force-push a shared branch; never commit `.env`, keys or passwords.
- Sample and test content is realistic, created as drafts on local or staging, and removed when no longer needed.
- Never run destructive commands on shared environments, publish content, or change production without the user's approval.

## Commands

In Claude Code with the Proven Lab plugin (other MCP clients get the same as MCP prompts):

| Command | Does |
|---|---|
| `/provenlab:start` | Onboard: project memory, new or existing, setup, workspace, GitHub |
| `/provenlab:plan` | Write a step-by-step plan in `.provenlab/plan.md` and get the user's OK before building |
| `/provenlab:git-connect` | Connect the project to GitHub and set the push policy |
| `/provenlab:check` | Verify the work: WP-CLI, quality checks, screenshot review |
| `/provenlab:ship` | Commit, push, deploy to staging, then production after the user's yes |

## Tools

| Tool | Use |
|---|---|
| `get_blueprint`, `list_blueprints` | The runbook and its guides |
| `get_template` | Verified starter files: plugin, block theme, deploy workflow, verify script, headless client |
| `get_function`, `get_class`, `get_hook` | Exact signatures, parameters, since-versions |
| `search_docs`, `list_domains`, `get_domain` | Find the right API, guide or handbook page |
| `list_cli_commands`, `get_cli_command` | WP-CLI commands and flags |
| `list_ai_operations`, `get_ai_operation` | Cloud AI API operations: fields and a PHP call with the site connection |
