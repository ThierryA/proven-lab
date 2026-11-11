---
description: Build a quick prototype - a working version in minutes, on your computer (WordPress Playground or Local) or in the cloud, with the same building blocks and none of the ceremony
argument-hint: "[the idea to try]"
---

Build a quick prototype of: $ARGUMENTS

Follow `get_blueprint prototype`:

1. If `.provenlab/project.md` exists, read it; a prototype for an existing site is built where that site lives.
2. Ask only **where it runs**, in plain words: "On your computer, nothing to install" (WordPress Playground, recommended) · "On your computer with Local" (if they use it) · "In the cloud on WP Engine" (needs an account; gives a link others can open). Say the plan in two lines, then build.
3. Build with the same foundations as a full project: `get_template` with `plugin`, core building blocks (post types, registered meta, roles, Abilities), the always-on rules, `frontend-design` for anything people see, with sample content.
4. **Quick check only:** a few real requests or WP-CLI commands prove it works, and the pages load. No test suites, no static analysis, no staging.
5. Write `.provenlab/project.md` with **Mode: prototype**, where it runs and its address.
6. Give the link and what to try. Offer the next step: change something, or make it a real project (the `start` command adds GitHub, a plan for what is missing, the full checks on demand, and staging).

If the `provenlab` tools are not available, use `curl "{{BASE}}/api/<tool>?<args>"` instead.
