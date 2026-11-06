---
title: "Architecture: one WordPress runtime, your choice of admin and frontend"
summary: WordPress is the PHP runtime and its API does the work. Admin and frontend each run inside WordPress or as a separate custom app. The AI API runs on its own infrastructure and powers the agents.
---

# Architecture

Two runtimes, two choices.

<!-- diagram:start -->
```
           ADMIN                              FRONTEND
   ┌───────────┴───────────┐         ┌───────────┴───────────┐
   WP Admin       Custom app         WordPress       Custom app
   (inside)       (separate)         templating      (separate)
      │               │              (inside)            │
      │               └──── REST · Abilities ────┐       │
      │                                          │◄──────┘
┌─────▼──────────────────────────────────────────▼──┐      ┌──────────────────────────────┐
│  WordPress · PHP runtime                          │      │  AI API · AI infrastructure  │
│  Core Runtime API: content types, fields, users,  │◄────►│  Gateway · Knowledge base    │
│  capabilities, hooks, Abilities, REST · WP-CLI    │      │  Agents & sessions           │
└───────────────────────────────────────────────────┘      └──────────────────────────────┘
```
<!-- diagram:end -->

## 1. WordPress is the PHP runtime

It is always there. The WordPress API (the **Core Runtime API**) handles the data model, users, permissions, hooks and actions, whichever admin and frontend you choose. Agents drive it with **WP-CLI**.

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

A separate frontend is what people call *headless*. That is the only difference.

## 4. The AI API powers the agents

The AI API runs on WP Engine's AI infrastructure, not inside WordPress. It provides the model gateway, the knowledge base for search, and agents with sessions. It talks to WordPress where needed: indexing content into the knowledge base, connecting the site, and calling Abilities.

## The three common setups

| Setup | Admin | Frontend | Runtimes to deploy | Blueprint |
|---|---|---|---|---|
| **Classic** | WP Admin | WordPress templating | WordPress | `classic-wordpress` |
| **Headless** | WP Admin | Custom app | WordPress + your app | `custom-app` |
| **Custom app** | Custom app | Custom app | WordPress + your app | `custom-app` |

Any mix works, for example a custom admin with WordPress templating. The AI API plugs in the same way in every setup.

## For agents: how to choose

- "Build me a website" → **Classic**.
- "Build me an app" → **Custom app**.
- Editors want WP Admin but the frontend is React/Next.js → **Headless**.
- Ask only if the request does not make it clear.

Whatever the setup: define the model once in a must-use plugin, let WordPress capabilities decide who can do what, turn custom actions into Abilities, and verify with WP-CLI.
