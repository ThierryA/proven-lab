---
title: Deploying on WP Engine (optional, preferred)
summary: Standard managed WordPress or the Headless Platform. How WP Engine fits, what the Sites API does, and how to stay portable.
---

# Deploying on WP Engine

Deploying on WP Engine is **optional** but the **preferred** choice for this project. Nothing in the Core Runtime API requires it, and the AI API is reachable from any host with an API key. WP Engine adds managed WordPress, the AI API's site integration, and a headless platform.

Each setup in `architecture` needs one or two runtimes deployed: always WordPress, plus your app if the admin or frontend is a custom app.

## The WordPress runtime: managed WordPress

Managed WordPress runs the WordPress runtime for every setup. For **Classic** (`classic-wordpress`) it is the only thing you deploy.

## Your app's runtime: Headless Platform

For **Headless** and **Custom app** (`custom-app`), WP Engine's **Headless Platform** runs your Node app next to WordPress:

- Frontend deploys from GitHub, Bitbucket or GitLab; pushing to the chosen branch deploys. It builds with `npm run build` and starts with `npm run start`, and the app must listen on port 8080 (default) or 3000.
- The WordPress side is made headless with the **WPGraphQL**, **Faust.js** and **Atlas Headless Extension** plugins.
- **Faust.js** is WP Engine's open-source toolkit for Next.js: previews, authentication against WordPress, and the WordPress template hierarchy in the frontend. Check the Faust.js docs for the supported Next.js and WordPress versions.
- The same Core Runtime API model (post types, registered meta with `show_in_rest` / `show_in_graphql`, capabilities, Abilities) applies. WPGraphQL is an alternative to REST for reads.
- Docs: <https://developers.wpengine.com/docs/headless-platform/> · <https://github.com/wpengine/faustjs>

You can also run your custom app on any Node host; WordPress stays on its own runtime either way.

## Agents on WP Engine: sandboxed SSH and WP-CLI

On WP Engine, agents are not limited to APIs. They can open a **sandboxed SSH session** next to the site (the SSH Gateway) and run **WP-CLI directly**: check versions, verify the data model, seed content, run updates and search-replace.

```bash
ssh myenv@myenv.ssh.wpengine.net "cd /sites/myenv && wp post-type list --format=json"
```

Each session is an isolated container that times out after 10 minutes; only the site folder persists. Details and limits: `wp-cli-for-agents`, section 9.

## Deployment API: Sites

These operations connect a deployed WordPress site to WP Engine AI. They are about the site, not about calling models. Credits (balance) are part of the AI API.

| Operation | Use |
|---|---|
| `registerSite` | Register or update a WordPress site in the account (a **site connection**, normally done by the site administrator through the WP Engine AI plugin) |
| `getSite` | Read a site and its primary knowledge base collection |
| `updateSitePrimaryCollection` | Set or clear the site's primary KB collection |
| `heartbeatSite` | Refresh the site's current state |
| `deleteSite` | Deregister a site |

A site connection makes the site visible to the whole account. Running abilities on a site additionally needs a per-person WordPress account connection; connecting a site grants nobody the right to act on it.

## Staying portable

- Keep WP Engine specifics (site registration, headless deploy config) in one module so the app still runs on another host.
- The gateway and knowledge base use plain HTTPS with a bearer key, so they work from any host.
