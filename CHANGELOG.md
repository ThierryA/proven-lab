# Changelog

Proven Lab uses one version for everything it ships: the Claude Code plugin, the `@provenlab/mcp` package and MCP server, the project kit, the skill, the templates, the runbook and the HTTP API. The version lives in `package.json`; `npm run build` stamps it everywhere. Bump it with `npm version minor` (or `patch` / `major`) for every release, add an entry here, and tag the commit `v<version>`.

## 0.2.0 · 2026-11-10

**Agent kit**
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
