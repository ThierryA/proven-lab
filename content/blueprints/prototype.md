---
nav: "Quick prototype"
title: "Quick prototype: a working version in minutes"
summary: "The fast path: build a working version of an idea in minutes, on the user's computer (WordPress Playground, recommended, or Local) or in the cloud on WP Engine. Same building blocks and rules as a full project, so nothing is thrown away; skips the plan, GitHub, the full checks and staging."
agent_does:
  - "Builds a working version of your idea in minutes, on your computer or in the cloud."
  - "Uses the same building blocks and rules as a full project, so nothing is thrown away."
  - "Gives you a link to try it, and turns it into a real project when you are ready."
you_do:
  - "Say where it should run."
  - "Try it, then decide: change it, drop it, or make it a real project."
---

# Quick prototype: a working version in minutes

> **Runbook step 1 · What are we doing?** The user chose to try an idea quickly. **Next:** build (step 3), with the quick check (step 5). No shipping.

A prototype is the fastest way to see an idea working. It is built **the same way** as a full project, so the result has the same quality and becomes the real project later without a rewrite. What it skips is the ceremony around it.

## Same as a full project

- **The plugin template** (`get_template` with `plugin`) and the always-on rules: never change WordPress core, never edit other plugins or themes, core APIs first, no custom tables.
- **Core building blocks** (runbook, step 3): post types, registered meta, roles and capabilities, Abilities. Look up each function before using it.
- **Design** for anything people see (`frontend-design`): real content, the design tokens, one screenshot review at the most common width.
- **A quick check** (runbook, step 5): a few requests or WP-CLI commands that prove it works, and the pages load. It takes seconds and avoids showing something broken.

## Skipped

- The written plan and its approval round (describe the plan in two lines and go).
- GitHub, commits and the push policy.
- The full checks (test suites, static analysis, Plugin Check, the verify script, screenshots at three widths).
- Staging and production: the user gets one link to try it.

## Where it runs

Ask one question, in plain words, with the technical name in brackets:

- **"On your computer, nothing to install"** (WordPress Playground): recommended for a prototype.
- **"On your computer with Local"**: if the user already uses Local (check for it: `local-development`).
- **"In the cloud on WP Engine"**: needs a WP Engine account; gives a link others can open.

### WordPress Playground (recommended)

A full WordPress that runs from one command, with no app and no database to install. It needs Node.js (a recent version).

1. Write the plugin in the user's working folder: `<slug>/<slug>.php` and its files.
2. Start WordPress from the plugin folder. Playground detects the plugin, mounts it and activates it:

   ```bash
   cd <slug> && npx @wp-playground/cli@latest start
   ```

   Run it in the background. The site is at the address it prints (usually `http://127.0.0.1:9400`). The first start downloads WordPress and takes a couple of minutes; later starts are quick, and the site keeps its content between runs.
3. Add sample content so the user sees a real page: a blueprint with `wp-cli` steps (`--blueprint=blueprint.json`), or the REST API.
4. Quick check with real requests. Playground sets a cookie on the first request, so keep a cookie jar and follow redirects:

   ```bash
   curl -sL -c /tmp/pg.txt -b /tmp/pg.txt "http://127.0.0.1:9400/?rest_route=/wp/v2/types"
   ```

   Lint every PHP file with `php -l` if PHP is installed. There is no WP-CLI shell in Playground: check through requests and pages.
5. Give the user the address and what to try. It only runs on their computer: to share it, build it in the cloud.

### Local

Follow `local-development` (create the site with Local's tools, install the plugin), with the quick check only.

### WP Engine

Follow `wpengine-cloud` on a staging or development environment, with the quick check only (a few WP-CLI commands in `sandbox_bash`; no test suites in the sandbox).

## Project memory

Write a short `.provenlab/project.md`: **Mode: prototype**, where it runs and its address, and the idea in one sentence. The next agent then knows it is a prototype.

## When the prototype is approved

When the user says "make it a real project" (or runs `/provenlab:start`), keep the code and add what was skipped: GitHub and a first commit, a plan for what is missing (edge cases, polish, permissions review), the full checks on demand, then staging and production. From Playground, move the plugin folder into Local or a WP Engine environment; recreate the sample content there.
