---
nav: "Ship: staging, then production"
title: "Ship: staging, then production"
summary: "Ship to a WP Engine staging environment, then to production after the user checks it: from a Git repository with WP Engine's GitHub Action, or without a repository. Managed WordPress for the application layer, the Headless Platform for a custom app, and how to stay portable."
agent_does:
  - "Sets up a repository and automatic deploys if you want them."
  - "Deploys to staging and sends you the link."
  - "Deploys to production after your approval."
you_do:
  - "Check staging."
  - "Approve the production release."
---

# Ship: staging, then production

> **Runbook step 6 · Ship,** for developers (non-developers: `wpengine-cloud`, section 5). Every release goes to staging first and to production only after the user says yes.

Deploying on WP Engine is **optional**; Proven Lab recommends it. Nothing in the Core API requires it, and the Cloud AI API works from any host. WP Engine adds managed WordPress, the Headless Platform for custom apps, staging and production environments, and SSH access with WP-CLI for coding agents.

Each setup in `architecture` needs one or two deployments: always WordPress, plus your app if the admin or frontend is a custom app.

**Every deployment goes to staging first, then production.** Production is only updated after the user has looked at staging and said yes.

## 1. Ask about the repository at the start

At the start of a project, ask the user once, in plain words:

- **Create a new repository** (recommended for developers): `git init`, a WordPress `.gitignore`, and, if the GitHub CLI is signed in (`gh auth status`), `gh repo create <name> --private --source=. --push`.
- **Use an existing repository:** clone it, or add it as `origin` and work on a branch.
- **No repository:** fine for a quick prototype or for someone who does not code. Deploy with section 4 or `wpengine-cloud`, and offer a repository again before the first production release.

What goes in the repository: your code only, never WordPress core, uploads or secrets. Typically `wp-content/plugins/<app>/` (the app: data model, Abilities, routes), `wp-content/themes/<theme>/`, plus a custom app folder and the tests and tooling from `best-practices`.

## 2. WP Engine environments

A WP Engine **site** groups up to three **environments** (installs): production, staging and development. With the WP Engine MCP server (`wpengine-cloud`): `wpe_list_sites` and `wpe_list_installs` to find them, `wpe_create_site` and `wpe_create_install` to create missing ones (preview, then `confirm: true` after the user approves; an install name is 3 to 14 lowercase letters and digits, globally unique, and takes 5 to 15 minutes to become active). Without the MCP server, the user creates them in the WP Engine User Portal.

## 3. From a Git repository: staging, then production

WP Engine's GitHub Action (`wpengine/github-action-wpe-site-deploy`) copies the repository to an environment over the SSH Gateway with rsync, optionally lints PHP, runs a post-deploy script and clears the cache.

**One-time setup**, only when the user wants automatic deploys from GitHub. The SSH key below is for GitHub Actions, not for the agent (the agent keeps using the WP Engine MCP server). With the user's approval:

1. A passwordless SSH key for deployments: `ssh-keygen -t ed25519 -N "" -C "wpengine-deploy" -f ~/.ssh/wpengine_deploy`.
2. The public key on the WP Engine account: `wpe_create_ssh_key` with the contents of `~/.ssh/wpengine_deploy.pub` (preview, then confirm), or **SSH Gateway** keys in the User Portal.
3. The private key as a repository secret: `gh secret set WPE_SSHG_KEY_PRIVATE < ~/.ssh/wpengine_deploy`.
4. The environment names as repository variables: `gh variable set WPE_STAGING_ENV --body <staging install>` and `gh variable set WPE_PRODUCTION_ENV --body <production install>`.
5. A `production` environment in the repository settings (**Settings → Environments**) with the user as required reviewer, so production waits for an approval click. Where required reviewers are not available, production runs only when started by hand (below).

**`.github/workflows/deploy.yml`**: every push to `main` deploys to staging; production follows after staging succeeds, only when the workflow is started by hand (**Actions → Deploy → Run workflow**), and waits for the `production` approval:

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: wpengine/github-action-wpe-site-deploy@v3
        with:
          WPE_SSHG_KEY_PRIVATE: ${{ secrets.WPE_SSHG_KEY_PRIVATE }}
          WPE_ENV: ${{ vars.WPE_STAGING_ENV }}
          SRC_PATH: "wp-content/"
          REMOTE_PATH: "wp-content/"
          PHP_LINT: TRUE
          SCRIPT: "wp-content/deploy/post-deploy.sh"
  production:
    needs: staging
    if: github.event_name == 'workflow_dispatch'
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: wpengine/github-action-wpe-site-deploy@v3
        with:
          WPE_SSHG_KEY_PRIVATE: ${{ secrets.WPE_SSHG_KEY_PRIVATE }}
          WPE_ENV: ${{ vars.WPE_PRODUCTION_ENV }}
          SRC_PATH: "wp-content/"
          REMOTE_PATH: "wp-content/"
          PHP_LINT: TRUE
          SCRIPT: "wp-content/deploy/post-deploy.sh"
```

`wp-content/deploy/post-deploy.sh` runs on the server after each deploy (path relative to the WordPress root), for example:

```bash
#!/bin/bash
set -e
wp rewrite flush
wp cache flush
```

Notes:

- The action is **non-destructive by default**: it adds and updates files but does not delete files missing from the repository. Add `--delete` to `FLAGS` only when the repository is the complete source of the deployed folder, and keep the default flags (`-azvr --inplace --exclude=.*`) when you set `FLAGS`.
- Code deploys never touch the database or uploads. Content created on production stays there; seed content on staging with WP-CLI, not by copying a database over production.
- A failed deploy leaves production as it was. To undo a bad release, revert the commit and deploy again; for anything worse, restore a backup (`wpengine-cloud`).
- Branch-per-environment works too: a `stage.yml` that deploys the `stage` branch to staging and a `main.yml` that deploys `main` to production.

**Releasing:** after the staging deploy, give the user the staging URL and what to check. Only when they say yes: run the workflow (or approve the waiting `production` job), then check production with a request and WP-CLI (`wpengine-cloud`, sandbox).

## 4. Without a repository

- **From Local:** `local_wpe_push` (Local's MCP server, `local-development`) or **Push** in Local, **to staging**. A push replaces the environment's files and database, so push to production only for a site that is not live yet, and only with the user's explicit approval.
- **Built on WP Engine** (no Local, no Git): see `wpengine-cloud`. The code is created on staging through the WP Engine MCP sandbox, then promoted to production.
- **Before launch**, promoting staging to production can be a full copy (`wpe_copy_install`). It overwrites **all** files and the database of the destination, so never use it once production has real content; deploy the code files instead.

Offer to put the code in a repository before the first production release: it is the only way to review, roll back and redeploy reliably.

## WordPress: managed WordPress

Managed WordPress runs WordPress for every setup. For **Classic** (`classic-wordpress`) it is the only thing you deploy.

## Your app's runtime: Headless Platform

For **Headless Frontend**, **Headless Admin** and **Headless Frontend + Admin** (`custom-app`), WP Engine's **Headless Platform** runs your Node app next to WordPress:

- Your app deploys from GitHub, Bitbucket or GitLab; pushing to the chosen branch deploys. Connect a `staging` branch to a staging environment and `main` to production, so the app follows the same staging-then-production path as WordPress. It builds with `npm run build` and starts with `npm run start`, and the app must listen on port 8080 (default) or 3000.
- The platform runs any Node framework (Next.js, Astro, Nuxt, SvelteKit, Remix and others). It can install the **WPGraphQL**, **Faust.js** and **WP Engine Atlas Headless Extension** plugins on the WordPress side; a custom app that uses only the REST API needs none of them.
- **Faust.js** is WP Engine's open-source toolkit for Next.js (Pages Router; requires the WPGraphQL and Faust.js plugins): previews and authentication against WordPress. Check the Faust.js docs for supported versions.
- The same Core API model (post types, registered meta, capabilities, Abilities) applies. With WPGraphQL, post types and taxonomies opt in with `show_in_graphql`; meta needs `register_graphql_field()`.
- Docs: <https://developers.wpengine.com/docs/headless-platform/> · <https://github.com/wpengine/faustjs>

You can also run your custom app on any Node host; WordPress stays on its own hosting either way.

## Agents on WP Engine: WP-CLI through the WP Engine MCP server

On WP Engine, a coding agent runs **WP-CLI directly next to the site** through the WP Engine MCP server's sandbox (`sandbox_bash`, `wpengine-cloud`). The MCP server handles access with the user's sign-in: do not generate SSH keys or set up the SSH Gateway for the agent.

Each session is an isolated container that times out after 10 minutes; only the site folder persists. Details and limits: `wp-cli-for-agents`, section 9.

## Connecting the site to the Cloud AI API

Separate from where it runs: the WP Engine AI plugin connects a WordPress site to the Cloud AI API on any host. Connect staging and production separately: the connection is tied to the site URL. See `wpe-ai-plugins`.

## Staying portable

- Keep WP Engine-specific configuration (the deploy workflow, Headless Platform settings, SSH scripts) separate, so the app also runs on another host.
- Code lives in the repository and deploys as files, so moving hosts means changing the deploy step, not the app.
