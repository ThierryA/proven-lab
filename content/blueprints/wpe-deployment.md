---
nav: "Ship: staging, then production"
title: "Ship: staging, then production"
summary: "Deploy to WP Engine: staging first when there is one (suggest creating it), then production after the user's yes; straight to production if the user does not want staging. Works with or without GitHub. Managed WordPress for the application layer, the Headless Platform for a custom app, and how to stay portable."
agent_does:
  - "Suggests a staging copy if there is none, and deploys there first."
  - "Sends you the staging link, then offers to put it live."
  - "Backs up and deploys to production when you say yes, with or without GitHub."
you_do:
  - "Say whether you want staging."
  - "Check staging, then approve the production release."
---

# Ship: staging, then production

> **Runbook step 6 · Ship,** for everyone. WP Engine is optional and recommended; the app is a plugin, so it deploys to any WordPress host. **Next:** report what is live and where.

## The flow

1. **Find the environments:** `wpe_list_installs` (WP Engine MCP server, `wpengine-cloud`).
2. **No staging environment?** Suggest one in a sentence: "I recommend a staging copy to check changes before they go live. Shall I create it?" On yes: `wpe_create_install` with `environment: staging` (preview, then `confirm: true`; ready in 5 to 15 minutes). On no: go to step 4.
3. **Deploy to staging,** send the user the staging link and what to check, and fix things until they are happy.
4. **Offer to put it live:** "Shall I deploy this to production?" Only on yes:
   - Production already has real content: `wpe_create_backup` first and wait for `wpe_get_backup_status`.
   - Deploy the code (below). Never copy an environment's database over a production site that has real content.
   - Check the live pages, purge the cache if needed (`wpe_purge_cache`), and tell the user what is live.

When the user skipped staging, say once that changes go straight to the live site, then deploy with a backup first.

## How to deploy

Use the first option that fits. GitHub is not required.

| Situation | Deploy with |
|---|---|
| Repository with WP Engine's GitHub Action set up | Push to `main` (staging), then run the workflow for production (section below) |
| Repository without the Action | Offer to set it up; if the user prefers not to, use the next row |
| No repository, or no GitHub | Write the plugin's files to the target environment with the WP Engine MCP server's `sandbox_write`, then `wp plugin activate <app>` in `sandbox_bash`. Changed files only. |
| Site built in Local | `local_wpe_push` (`local-development`) to staging. A push replaces the environment's files and database: to production only before launch |
| Production not launched yet | `wpe_copy_install` from staging to production (copies everything; the user types the production name to confirm) |

Code deploys never touch content: posts and uploads on production stay where they are. Before the first production release without a repository, offer one: it makes review, rollback and redeploys reliable.

## Automatic deploys with GitHub (optional)

WP Engine's GitHub Action (`wpengine/github-action-wpe-site-deploy`) copies the repository to an environment with rsync, lints PHP, runs a post-deploy script and clears the cache. Set it up only when the user wants it, with their approval. The SSH key is for GitHub Actions, not for you; you keep using the WP Engine MCP server.

1. Key pair: `ssh-keygen -t ed25519 -N "" -C "wpengine-deploy" -f ~/.ssh/wpengine_deploy`; public key to the account with `wpe_create_ssh_key`; private key with `gh secret set WPE_SSHG_KEY_PRIVATE < ~/.ssh/wpengine_deploy`.
2. Environment names: `gh variable set WPE_STAGING_ENV --body <staging install>` and `gh variable set WPE_PRODUCTION_ENV --body <production install>`.
3. Optional: a `production` environment in the repository settings with the user as required reviewer.
4. Add `.github/workflows/deploy.yml`. A push to `main` deploys staging; production runs when the workflow is started by hand (**Actions → Deploy → Run workflow**). Without staging, drop the `staging` job and the `needs` line.

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

`wp-content/deploy/post-deploy.sh` runs on the server after each deploy:

```bash
#!/bin/bash
set -e
wp rewrite flush
wp cache flush
```

The Action adds and updates files but never deletes them; add `--delete` to `FLAGS` only when the repository is the complete source of that folder. To undo a release, revert the commit and deploy again.

## A custom app: Headless Platform

For the headless setups (`custom-app`), WordPress deploys as above and the Node app runs on WP Engine's **Headless Platform** (or any Node host):

- It deploys from GitHub, Bitbucket or GitLab when the chosen branch changes: connect a `staging` branch to a staging environment and `main` to production. It runs `npm run build`, then `npm run start`; the app listens on port 8080 (default) or 3000.
- Any Node framework works. WPGraphQL, Faust.js and the Atlas Headless Extension are optional; an app that uses only the REST API needs none of them.
- Docs: <https://developers.wpengine.com/docs/headless-platform/>

## After deploying

- AI features: the WP Engine AI connection is per site URL, so ask the user to click **Connect** once on each environment (`wpe-ai-plugins`).
- Keep WP Engine-specific files (the workflow, Headless Platform settings) separate, so the app moves to another host by changing only the deploy step.

## Done when

The change is live where the user wanted it, you checked the live pages, and you told the user what changed and where.
