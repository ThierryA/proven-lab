# Changelog

Proven Lab uses one version for everything it ships: the Claude Code plugin, the `@provenlab/mcp` package and MCP server, the project kit, the skill, the templates, the runbook and the HTTP API. The version lives in `package.json`; `npm run build` stamps it everywhere.

**To release:** `npm version minor` (or `patch` / `major`), add a section for the new version and date at the top of the list below, written from the commits since the last tag (`git log v<previous>..HEAD`), build, commit, and tag `v<version>`. This file is public: only released versions appear here.

## 0.3.2 · 2026-11-11

- Faster, cheaper verification: every change gets a quick check with WP-CLI and real requests; the full checks (coding standards, PHPUnit, PHPStan, Plugin Check, the verify script) run on demand, when you ask or run `/provenlab:check`, preferably on your computer or in CI. Agents no longer install test suites or run long checks in the WP Engine sandbox unless you ask.
- `/provenlab:explain` gives the basics by default: where the site is hosted, its addresses, how a change goes live and who signs in where. Add `--dev` for the technical view.
- Home page: a short video, "Why pay agents to rebuild battle-tested software?".

## 0.3.1 · 2026-11-10

- Commands work without the plugin: each one is published at `proven-lab.com/commands/<name>.md` and through the new `get_command` tool, so agents that only have the link follow a command when the user asks for it in plain words ("plan this", "explain the structure").
- New commands and tools appear on their own after a deploy: MCP session IDs carry a fingerprint of what the server offers, and a session started before a change is asked to start a new one, which reloads the lists. Sessions opened before this release need one reconnect.

## 0.3.0 · 2026-11-10

- How to update: plugin, MCP server and project kit, on the Start building page and in the kit setup guide.
- New command `/provenlab:explain` (and MCP prompt `explain`): explains the site's structure, data model, architecture, plan or deploy path with generative UI, else Mermaid.
- Agents explain structures visually (site pages, data model, architecture, plan, deploy path): generative UI when their app supports it, else Mermaid, else a compact tree. Used by `/provenlab:start`, `:plan`, `:ship` and the existing-project summary.
- Changelog kept up to date with every change, and published at proven-lab.com/changelog.

## 0.2.0 · 2026-11-10

**Agent kit**
- Three always-on rules: never change WordPress core; never edit third-party plugins or themes (hooks, child themes and documented extension points only); core APIs before custom code, with a need-to-API table and no custom database tables without the user's explicit agreement.
- Runbook rewritten as six steps with project memory (`.provenlab/project.md`), a developer / non-developer decision table, and rules for no WP Engine account, the WP Engine MCP server being unavailable, reusing plugins, custom tables, and recovering from fatal errors.
- New or existing project first; workspace on the user's computer (Local) or in the cloud (WP Engine).
- Git and GitHub: asked during onboarding, commit every verified step, commit before pushing, push policy, deploy to staging on push.
- Slash commands in the Claude Code plugin: `/provenlab:start`, `:plan`, `:git-connect`, `:check`, `:ship`; the same commands as MCP prompts for other clients.
- Jump-start templates (`get_template`): plugin, block child theme, GitHub deploy workflow, verify script, headless client.
- Skill packaged with `references/` (runbook and guides) and `templates/`, in the kit and the plugin.
- Guides: frontend design, existing projects, block-first Classic, per-user authorization for custom apps, staging-then-production shipping, WP Engine AI plugins with no API key.

**MCP server and API**
- Server instructions sent on connect; prompts; the runbook via `get_blueprint runbook`; read-only tool annotations.
- `get_ai_operation`: readable fields and complete PHP calls with the site connection.
- `search_docs`: better ranking, guides indexed, typo suggestions; `Class::method` and dynamic hook lookups.

**Site**
- Docs organized by runbook step, with a summary of what the agent does and what you do on each guide.
- Start building page, home page redesign, stronger contrast.

## 0.1.0 · 2026-11-03

- First release: WordPress Core API, WP-CLI and Cloud AI API references extracted from source; MCP server and HTTP API; project kit; Claude Code plugin; docs site.
