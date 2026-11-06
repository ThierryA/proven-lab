---
nav: "Deploying on WP Engine"
title: Deploying on WP Engine (optional, preferred)
summary: Managed WordPress for the application layer, the Headless Platform for a custom app, SSH with WP-CLI for coding agents, and how to stay portable.
---

# Deploying on WP Engine

Deploying on WP Engine is **optional**; Proven Lab recommends it. Nothing in the Core API requires it, and the Cloud AI API works from any host. WP Engine adds managed WordPress, the Headless Platform for custom apps, and SSH access with WP-CLI for coding agents.

Each setup in `architecture` needs one or two deployments: always WordPress, plus your app if the admin or frontend is a custom app.

## WordPress: managed WordPress

Managed WordPress runs WordPress for every setup. For **Classic** (`classic-wordpress`) it is the only thing you deploy.

## Your app's runtime: Headless Platform

For **Headless Frontend**, **Headless Admin** and **Headless Frontend + Admin** (`custom-app`), WP Engine's **Headless Platform** runs your Node app next to WordPress:

- Your app deploys from GitHub, Bitbucket or GitLab; pushing to the chosen branch deploys. It builds with `npm run build` and starts with `npm run start`, and the app must listen on port 8080 (default) or 3000.
- The platform runs any Node framework (Next.js, Astro, Nuxt, SvelteKit, Remix and others). It can install the **WPGraphQL**, **Faust.js** and **WP Engine Atlas Headless Extension** plugins on the WordPress side; a custom app that uses only the REST API needs none of them.
- **Faust.js** is WP Engine's open-source toolkit for Next.js (Pages Router; requires the WPGraphQL and Faust.js plugins): previews and authentication against WordPress. Check the Faust.js docs for supported versions.
- The same Core API model (post types, registered meta, capabilities, Abilities) applies. With WPGraphQL, post types and taxonomies opt in with `show_in_graphql`; meta needs `register_graphql_field()`.
- Docs: <https://developers.wpengine.com/docs/headless-platform/> · <https://github.com/wpengine/faustjs>

You can also run your custom app on any Node host; WordPress stays on its own hosting either way.

## Agents on WP Engine: sandboxed SSH and WP-CLI

On WP Engine, a coding agent that uses your SSH key can open a **sandboxed SSH session** next to the site (the SSH Gateway) and run **WP-CLI directly**: check versions, verify the data model, seed content, run updates and search-replace.

```bash
ssh myenv@myenv.ssh.wpengine.net "cd /sites/myenv && wp post-type list --format=json"
```

Each session is an isolated container that times out after 10 minutes; only the site folder persists. Details and limits: `wp-cli-for-agents`, section 9.

## Connecting the site to the Cloud AI API

Separate from where it runs: the WP Engine AI plugin connects a WordPress site to the Cloud AI API on any host. See "Site connection" in `ai-features`.

## Staying portable

- Keep WP Engine-specific configuration (Headless Platform settings, SSH scripts) separate, so the app also runs on another host.
- The gateway and knowledge base use plain HTTPS with a bearer key, so they work from any host.
