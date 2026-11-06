---
title: Standard WordPress or headless? Choosing an architecture
summary: Both are first-class. The same Core Runtime API model powers a PHP-templated site, a custom Node frontend, or a Faust.js/WPGraphQL headless app.
---

# Standard WordPress or headless?

This kit supports **both**. The data model, users, permissions, hooks and Abilities are identical; only the rendering and admin layers change. Decide the architecture first, then follow one blueprint.

| Architecture | Frontend renders with | Admin | Blueprint |
|---|---|---|---|
| **Standard (templated)** | WordPress PHP template hierarchy / block theme | wp-admin, or a custom Node admin over REST | `php-templated-frontend` |
| **Headless, custom Node** | Your Node app (Hono, Express, Next.js, Astro) over REST + Abilities | Your own Node admin | `headless-node-app` |
| **Headless, WP Engine toolkit** | Next.js with Faust.js + WPGraphQL | wp-admin for editors, or custom | `wpe-hosting` |
| **Hybrid** | PHP templates for public pages, Node for app-like areas | Node admin | both |

## How to decide

- Content-led site, SEO first, fewest moving parts → **Standard**.
- App-like product, custom UX, one team that lives in Node → **Headless, custom Node**.
- Editors need preview and the block editor, frontend is React/Next → **Headless with Faust.js**.
- Existing PHP theme plus a new app-like area → **Hybrid**.

## What never changes

1. Define the model once, in a must-use plugin: `register_post_type`, `register_taxonomy`, `register_meta` (post, term, user), `register_setting`.
2. Authorization is WordPress capabilities. Never reimplement it in a UI.
3. Custom operations are Abilities (`wp_register_ability`).
4. AI features come from the AI API (gateway, knowledge base, agents) and work identically in every architecture; keys stay server-side.
5. Hosting is independent of architecture. WP Engine is the preferred host for this project but optional (see `wpe-hosting`).

Ask the user only if the request does not make the architecture clear; otherwise default to **Headless, custom Node** for "build me an app" and **Standard** for "build me a website".
