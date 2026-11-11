# Proven Lab runbook for coding agents

*Proven Lab {{VERSION}}*

You build or change applications where **WordPress is the application layer**: data, users and permissions, validation, hooks, REST and Abilities come from WordPress. The admin and the frontend are WordPress or a custom app. AI comes from the Cloud AI API. WP Engine hosting is optional.

**Three rules that always apply:**

1. **Never change WordPress core.** No edits to `wp-admin/`, `wp-includes/` or the root `wp-*.php` files, ever; configuration goes through `wp config set`, never by editing core.
2. **Never edit plugins or themes the user did not write.** Change their behavior with their hooks (`add_action`, `add_filter`), a child theme, or their documented extension points, from the user's own plugin. No hook? Say so and propose an alternative; never patch their files (updates erase it).
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
| Questions | Prototype, new or existing, then only what that path needs; wait for the answers | First "What would you like to do?" with your recommendation, and wait; then propose the rest in one line and continue unless they object |
| Setup | Their choice | Classic: "I'll build it as a regular WordPress site" |
| Where to build | Local on their computer | In the cloud on WP Engine if they have an account; otherwise Local, guided step by step |
| Checks | Quick WP-CLI checks; full checks (coding standards, PHPUnit, PHPStan, Plugin Check) when they ask, locally or in CI | Quick WP-CLI checks, the pages load |
| Shipping | Staging, then production; GitHub Action if they want it | Staging link, then production after their yes |

Never ask a non-developer to run commands or edit files. When a person must act (signing in, clicking **Connect**, approving), say exactly where to click.

**After every step, check what is next.** Look up the next runbook step and `.provenlab/project.md`, say in one line what is done, then offer two or three concrete next steps in plain words, recommendation first (as choices if your app can). Never end on "What next?".

**Explain visually.** When you explain a structure (pages, data model, how the parts fit together, the plan, the path to production), show it instead of describing it in paragraphs. Use the best your app supports, in this order:

1. **Generative UI:** if your app can render interactive visuals (widgets, artifacts, canvases, rendered HTML or SVG), draw the diagram there: boxes for pages or records, arrows for links and relations, short labels.
2. **Mermaid:** a fenced `mermaid` block (most chat apps, editors and GitHub render it), for example `flowchart` for pages and deploys, `erDiagram` for the data model.
3. **Text:** a compact tree or table.

Keep it small (one idea, under 15 boxes), in the user's words.

## 1. What are we doing?

**Always ask this first and wait**, for everyone, with your recommendation. Skip it only if the user named the path ("a quick prototype", "change my site"); a detailed request is not an answer. Word every question for anyone: plain words first, the technical name in brackets, so beginners and professionals both follow.

**"What would you like to do?"**
- **"Try an idea quickly: a working version in minutes"** (prototype). Guide `prototype`.
- **"Build it properly, ready to grow and go live"** (new project).
- **"Change a site you already have"** (existing project). Guide `existing-project`: find where it lives, inspect it, ask only what you cannot find.

**Prototype:** ask only where it runs: "On your computer, nothing to install" (WordPress Playground, recommended) · "On your computer with Local" · "In the cloud on WP Engine" (needs an account). No plan approval, GitHub, full checks or staging.

**New project:** ask in one message, only what is not known yet:

- **"How should it work?"** "A regular WordPress site, edited in its dashboard" (Classic) · "Your own website design, WordPress behind it" (Headless Frontend) · "Your own admin screens, WordPress shows the pages" (Headless Admin) · "Your own website and admin, WordPress in the background" (Headless Frontend + Admin). Recommend: a content site → Classic; an app with its own interface → Headless Frontend + Admin. Guide: `architecture`.
- **"Where should we build it?"** "On your computer with Local, free" · "In the cloud on WP Engine, nothing to install" (needs a paid WP Engine account: ask whether they have one; if not, recommend Local). Check whether Local (localwp.com) is installed.
- **"Keep a history of every change on GitHub, free?"** New private repository, an existing one, or not now; then "send changes to GitHub after your OK (recommended) or automatically?" (push policy). Guide: `git-workflow`.

Developers choose; you wait. Non-developers: propose in one line and continue unless they object.

## 2. Set up the workspace

- **Prototype:** `prototype` (Playground, Local or WP Engine), then build; skip the rest of this step.
- **On the user's computer:** `local-development`.
- **In the cloud, and every site already on WP Engine:** `wpengine-cloud`. If the WP Engine MCP server is unavailable (it is in beta), tell the user, build locally, and deploy with the GitHub Action or a zip (`wpe-deployment`).
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

- **No custom database tables** unless the user explicitly agrees after you explain why core structures cannot work (say, millions of rows meta cannot index). Then create them with `dbDelta()` on activation, prefixed, with a schema version option and cleanup in `uninstall.php`.
- **Permissions** are WordPress capabilities in `permission_callback`, `auth_callback` and `current_user_can()`, never only in the interface. Custom actions are **Abilities**.
- **By setup:** Classic → `classic-wordpress` (block theme first). Headless → `custom-app`. Anything people see → `frontend-design`.
- **Look up before you write:** `get_function`, `get_class`, `get_hook`; `get_cli_command` before running WP-CLI.

## 4. Add AI, if the app needs it

Guide: `wpe-ai-plugins`. AI uses the Cloud AI API through the WP Engine AI plugins, with **no API key**: install them with WP-CLI, ask the user to click **Connect** once, then:

- `wp_ai_client_prompt()->using_provider( 'wpengine' )` for text and images;
- `wpe_auth_api_request()` for every other endpoint: transcription (`createTranscription`), alt text, summaries, the knowledge base, agents. `get_ai_operation` returns the fields and a PHP call;
- a short-lived browser session token for interactive chat.

Connecting needs a WP Engine account with AI access; requests use credits: say so first. Without an account, explain that and, only with the user's consent, use the WordPress AI Client with another provider they choose (the `wp_ai_client_prompt()` code stays the same). Not the Web Speech API unless the user asks. Code outside WordPress: `ai-features`.

## 5. Verify

- **Quick check, every change:** prove it works with a few **WP-CLI** commands and real HTTP requests, not by rereading code (`wp-cli-for-agents`). Locally run `wp` in the site; on WP Engine use the WP Engine MCP server's `sandbox_bash`.
- A fatal error in your plugin breaks `wp` too: `wp --skip-plugins plugin deactivate <slug>`, read `wp-content/debug.log`, fix, reactivate.
- **Full checks, on demand only:** the `best-practices` suite (coding standards, PHPUnit, PHPStan, Plugin Check) and the full `verify-script`. Run them when the user asks or runs `check`, preferably locally (Local or `wp-env`) or in CI on GitHub. Not in the WP Engine sandbox unless asked: long runs there are slow and costly.
- Report what you checked and the results.
- **Commit** each verified change with a clear message (`git-workflow`); never commit broken code or secrets.

## 6. Ship

Guide: `wpe-deployment`. **Prototype:** no shipping; give the link and offer to make it a real project.

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

With the MCP server these are prompts (Claude Code: `/mcp__provenlab__<name>`). When the user asks for one in plain words ("make a quick prototype", "ship it"), call `get_command` (or read `{{BASE}}/commands/<name>.md`) and follow it.

| Command | Does |
|---|---|
| `start` | Onboard or resume: the questions, workspace, GitHub |
| `plan` | Write a step-by-step plan in `.provenlab/plan.md` and get the user's OK before building |
| `git-connect` | Connect the project to GitHub and set the push policy |
| `prototype` | A quick prototype: a working version in minutes, same building blocks |
| `check` | The full checks, on demand: test suites, static analysis, Plugin Check, screenshots |
| `explain` | Explain visually: by default the basics (where it is hosted, its addresses, how changes go live); `--dev` for the technical structure |
| `ship` | Commit, push, deploy to staging, then production after the user's yes |

## Tools

| Tool | Use |
|---|---|
| `get_blueprint`, `list_blueprints` | The runbook and its guides |
| `get_template` | Verified starter files: plugin, block theme, deploy workflow, verify script, headless client |
| `get_function`, `get_class`, `get_hook` | Exact signatures, parameters, since-versions |
| `search_docs`, `list_domains`, `get_domain` | Find the right API, guide or handbook page |
| `list_cli_commands`, `get_cli_command` | WP-CLI commands and flags |
| `list_ai_operations`, `get_ai_operation` | Cloud AI API operations: fields and a PHP call with the site connection |
