---
nav: "Architecture"
title: "Architecture: one WordPress runtime, your choice of admin and frontend"
summary: WordPress always runs, and its Core Runtime API does the work. The admin and the frontend each run inside WordPress or as a separate custom app. The Cloud AI API runs on its own infrastructure and provides models, search and agents.
---

# Architecture

Two runtimes, two choices.

<!-- diagram:start -->
```
                  YOUR APP (optional)        WORDPRESS RUNTIME · PHP (always)
                ┌────────────────────┐     ┌───────────────────────────────────┐
  ADMIN         │ Custom app         │ or  │ WP Admin                          │
  FRONTEND      │ Custom app         │ or  │ WordPress templating              │
  DATA & LOGIC  │ REST · Abilities ──┼────►│ Core Runtime API · WP-CLI         │
                └─────────┬──────────┘     └─────────────────┬─────────────────┘
                          ▼                                  ▼ content sync · site connection · Abilities
                ┌─────────────────────────────────────────────────────────────────┐
  AI            │ AI API · its own AI infrastructure · powers the agents          │
                │ Gateway · Knowledge base · Agents & sessions                    │
                └─────────────────────────────────────────────────────────────────┘
  On WP Engine, agents also run WP-CLI in a sandboxed SSH session next to the site.
```
<!-- diagram:end -->

## 1. WordPress always runs

WordPress runs on PHP in every setup. Its **Core Runtime API** (Proven Lab's name for the WordPress core PHP APIs) handles the data model, users, permissions and hooks (actions and filters), whichever admin and frontend you choose. Coding agents drive it with **WP-CLI**.

## 2. Admin: inside WordPress or a separate app

| Choice | Runs | Talks to WordPress |
|---|---|---|
| **WP Admin** | inside the WordPress runtime | directly |
| **Custom app** (Node, React…) | separately | REST API and Abilities |

## 3. Frontend: inside WordPress or a separate app

| Choice | Runs | Talks to WordPress |
|---|---|---|
| **WordPress templating** (classic) | inside the WordPress runtime | directly |
| **Custom app** (Node, Next.js…) | separately | REST API (or WPGraphQL) |

Running the admin or the frontend as a separate app is what *headless* means here: **Headless Frontend**, **Headless Admin**, or both.

## 4. The AI API provides models, search and agents

The Cloud AI API runs on WP Engine's infrastructure, not inside WordPress. It provides the gateway to models, the knowledge base for search, and agents with sessions for the AI features you build. It works with WordPress where needed: your code indexes content into the knowledge base, and the WP Engine AI plugin connects the site so WP Engine AI can use its Abilities.

**On WP Engine, coding agents can also use WP-CLI on the deployed site.** They run commands in a sandboxed SSH session next to the site (WP Engine SSH Gateway): inspect, seed, update and verify without a browser. See `wpe-deployment`.

## The four setups

| Setup | Admin | Frontend | Runtimes | Blueprint |
|---|---|---|---|---|
| **Classic** | WP Admin | WordPress templating | WordPress | `classic-wordpress` |
| **Headless Frontend** | WP Admin | Custom app | WordPress + your app | `custom-app` |
| **Headless Admin** | Custom app | WordPress templating | WordPress + your app | `custom-app` + `classic-wordpress` |
| **Headless Frontend + Admin** | Custom app | Custom app | WordPress + your app | `custom-app` |

The AI API plugs in the same way in every setup.

## For agents: how to choose

- "Build me a website" → **Classic**.
- "Build me an app" → **Headless Frontend + Admin**.
- Editors want WP Admin but the frontend is React/Next.js → **Headless Frontend**.
- A themed site, but a purpose-built admin instead of WP Admin → **Headless Admin**.
- Ask only if the request does not make it clear.

Whatever the setup: define the model once in a must-use plugin, let WordPress capabilities decide who can do what, turn custom actions into Abilities, and verify with WP-CLI (locally, or on WP Engine through the sandboxed SSH session).
