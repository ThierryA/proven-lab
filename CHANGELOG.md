# Changelog

Proven Lab uses one version for everything it ships: the Claude Code plugin, the `@provenlab/mcp` package and MCP server, the project kit, the skill, the templates, the runbook and the HTTP API. The version lives in `package.json`; `npm run build` stamps it everywhere.

**Every change** gets a line under **Unreleased** in the same commit. **To release:** `npm version minor` (or `patch` / `major`), rename **Unreleased** to the new version and date, add a fresh empty **Unreleased** section, build, commit, and tag `v<version>`.

## Unreleased

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
