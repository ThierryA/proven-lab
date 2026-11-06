---
title: Hosting on WP Engine (optional, preferred)
summary: Standard managed WordPress or the Headless Platform. How WP Engine fits, what its Sites and Credits APIs do, and how to stay portable.
---

# Hosting on WP Engine

Hosting with WP Engine is **optional** but the **preferred** choice for this project. Nothing in the Core Runtime API requires it, and the AI API is reachable from any host with an API key. WP Engine adds managed WordPress, the AI API's site integration, and a headless platform.

## Standard WordPress

Managed WordPress hosting runs the PHP templating setup (`php-templated-frontend`) and is also a fine backend for a custom Node frontend hosted elsewhere (`headless-node-app`).

## Headless on WP Engine

WP Engine's **Headless Platform** pairs a WordPress backend with a Node.js frontend host:

- Frontend deploys from GitHub, Bitbucket or GitLab; pushing to the chosen branch deploys. It builds with `npm run build` and starts with `npm run start`, and the app must listen on port 8080 (default) or 3000.
- The WordPress side is made headless with the **WPGraphQL**, **Faust.js** and **Atlas Headless Extension** plugins.
- **Faust.js** is WP Engine's open-source toolkit for Next.js: previews, authentication against WordPress, and the WordPress template hierarchy in the frontend. Check the Faust.js docs for the supported Next.js and WordPress versions.
- The same Core Runtime API model (post types, registered meta with `show_in_rest` / `show_in_graphql`, capabilities, Abilities) applies. WPGraphQL is an alternative to REST for reads.
- Docs: <https://developers.wpengine.com/docs/headless-platform/> · <https://github.com/wpengine/faustjs>

You can also host a fully custom Node frontend (see `headless-node-app`) anywhere, including on the Headless Platform.

## Hosting APIs (AI API: Sites and Credits)

These belong to hosting, not to the AI gateway. Use them when the site runs with WP Engine AI.

| Operation | Use |
|---|---|
| `registerSite` | Register or update a WordPress site in the account (a **site connection**, normally done by the site administrator through the WP Engine AI plugin) |
| `getSite` | Read a site and its primary knowledge base collection |
| `updateSitePrimaryCollection` | Set or clear the site's primary KB collection |
| `heartbeatSite` | Refresh the site's current state |
| `deleteSite` | Deregister a site |
| `getCredits` | Account credit balance (AI usage is metered in credits) |

A site connection makes the site visible to the whole account. Running abilities on a site additionally needs a per-person WordPress account connection; connecting a site grants nobody the right to act on it.

## Staying portable

- Keep WP Engine specifics (site registration, credits, headless deploy config) in one module so the app still runs on another host.
- The gateway and knowledge base use plain HTTPS with a bearer key, so they work from any host.
