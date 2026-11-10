---
description: Explain the project visually - the basics by default (where it is hosted, its addresses, how changes go live), or the technical view with --dev
argument-hint: "[--dev] [what to explain]"
---

Explain this visually: $ARGUMENTS

**Choose the level.** If the request starts with `--dev` (or asks for the developer or technical view), give the **developer explanation**. Otherwise give the **basic explanation**, even if the user did not say "basic". A named subject ("the booking flow") narrows either one.

**Look first, do not guess.** Read `.provenlab/project.md` (environments, URLs, repository, deploy setup) and `.provenlab/plan.md` if they exist, then the project itself. On a running site: `wp option get home`, `wp option get siteurl`, `wp post-type list`, `wp menu list`, `wp plugin list`. On WP Engine: `wpe_list_installs` and `wpe_get_install` for each environment's address. If something is unknown (for example, no production yet), say so instead of inventing it.

## Basic explanation (default)

For anyone, in plain words, with no technical names:

1. **What it is:** the site in one sentence (what it does, for whom).
2. **Where it lives:** each place the site exists and who hosts it, for example "on your computer (Local)", "staging on WP Engine: a private copy for checking changes", "live on WP Engine".
3. **The addresses**, as a short list of clickable links: the live site, staging, WP Admin for each (where content is edited), and the GitHub repository if there is one.
4. **How a change goes live:** the path in a few steps, for example "I make the change on your computer → save it to GitHub → it appears on staging for you to check → after your OK it goes live", and what the user does at each step (check the staging link, say yes).
5. **Who signs in where:** WP Admin, the WP Engine User Portal, GitHub, and what each one is for.

Show it as **one simple picture**: the places the site lives, connected by arrows for how changes travel, each labeled with its address. Then the list of links and three or four short sentences.

## Developer explanation (`--dev`)

The technical structure: the plugin (post types, fields, taxonomies, roles and capabilities, REST routes, Abilities, hooks used), the theme (templates, patterns), how WordPress, any custom app and the Cloud AI API fit together (`get_blueprint architecture`), the repository layout, and the deploy pipeline (branches, GitHub Actions, environments). Use one visual per idea: a data model diagram, an architecture diagram, a deploy pipeline.

## How to draw

Use the best your app supports (runbook, "Explain visually"):

- **Generative UI** if your app can render interactive visuals (widgets, artifacts, canvases, HTML or SVG): boxes and arrows, short labels, clickable links in the basic view, details on click or hover where it helps.
- Otherwise a **Mermaid** diagram: `flowchart` for where it lives, pages, architecture and deploys; `erDiagram` for the data model; `sequenceDiagram` for a request or an AI flow.
- Otherwise a compact text tree or table.

Keep each visual to one idea and about 15 boxes at most. Label in the user's words. End by offering the other level ("Want the technical view?" or "Want the basics?") or to zoom into one part.
