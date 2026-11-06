# Use your agent

Proven Lab runs at `{{BASE}}`. No account, API key or install is needed.

## Just ask

Give any coding agent that can fetch URLs your request and the Proven Lab URL. Describe what you want in your own words; the URL is the only part that matters.

**Start a new app**

```text
Build a members directory.
Use Proven Lab: {{BASE}}
```

```text
Build a booking app for my yoga studio, with class schedules, member
passes and a waitlist that fills free spots automatically.
Use Proven Lab: {{BASE}}
```

```text
Create a Node app with its own admin and frontend where a small team
tracks client projects, deadlines and invoices.
Use Proven Lab: {{BASE}}
```

**Add a feature to a website you already run on WordPress**

```text
I have a website on WordPress. Create a recipe feature: ingredients and
steps as structured fields, a "what can I cook with what's in my fridge"
search, and a printable shopping list.
Use Proven Lab: {{BASE}}
```

```text
I have a WordPress site for my bookshop. Add a reading club area where
members vote on next month's book, and a page that shows the winner
with a summary written by AI.
Use Proven Lab: {{BASE}}
```

```text
I have a WordPress blog. Let me dictate draft posts from my phone, and
suggest categories and tags when I save them.
Use Proven Lab: {{BASE}}
```

```text
I have a WordPress site for my hardware store. Add an assistant that
answers questions about our products and opening hours from the content
already on the site.
Use Proven Lab: {{BASE}}
```

**Work on a site hosted on WP Engine**

```text
My site is hosted on WP Engine. On staging, add an events section with
a calendar and RSVPs, then show me before anything goes to production.
Use Proven Lab: {{BASE}}
```

The agent reads the playbook at `{{BASE}}/AGENTS.md`, asks you which setup you want, and looks up exact signatures, blueprints and WP-CLI commands by calling the tools over HTTP, for example `{{BASE}}/api/get_function?name=register_meta`. Everything below is optional: it makes lookups faster and keeps the playbook in your project.

## 1. Connect the MCP server

Optional. One command or one config entry, no files in your project.

```bash
claude mcp add --transport http provenlab {{MCP_URL}}
```

That is for Claude Code; add `--scope project` to share it with your team through `.mcp.json`. Other clients:

| Client | Configuration |
|---|---|
| Cursor | `.cursor/mcp.json`: `{"mcpServers": {"provenlab": {"url": "{{MCP_URL}}"}}}` |
| VS Code | `.vscode/mcp.json`: `{"servers": {"provenlab": {"type": "http", "url": "{{MCP_URL}}"}}}` |
| Any client with streamable HTTP | Server name `provenlab`, URL `{{MCP_URL}}` |
| No MCP support | Call the tools over HTTP: `curl "{{BASE}}/api/get_function?name=register_meta"` |

## 2. Add the kit to a project

Optional. The kit makes every agent that opens the project follow the same playbook: `AGENTS.md` (read by most coding agents), `CLAUDE.md` (imports `AGENTS.md` for Claude Code), MCP configs for Claude Code, Cursor and VS Code, and a Claude Code skill.

Ask your agent:

```text
Set up Proven Lab in this project by following {{BASE}}/kit/SETUP.md
```

Or run the installer in the project root. It adds missing files and leaves existing ones alone:

```bash
curl -fsSL {{BASE}}/install.sh | sh
```

Once the npm package is published, `npx @provenlab/mcp init` does the same and also merges existing MCP configs.

## 3. Claude Code plugin

Optional. One install adds the MCP server, the `provenlab` skill and two commands, `/provenlab:new-app` and `/provenlab:setup-project`:

```text
/plugin install provenlab --marketplace ThierryA/proven-lab
```

The plugin and its marketplace are in the public GitHub repository [ThierryA/proven-lab](https://github.com/ThierryA/proven-lab). To add the marketplace first and install later: `/plugin marketplace add ThierryA/proven-lab`, then `/plugin install provenlab@provenlab`.

## Other formats

- **OpenAI and Anthropic function calling:** load `{{BASE}}/tools/openai.json` or `{{BASE}}/tools/anthropic.json` and send each call to `GET` or `POST {{BASE}}/api/<tool>`.
- **OpenAPI** (for example, GPT Actions): `{{BASE}}/openapi/provenlab-api.yaml`. The Cloud AI API spec is at `{{BASE}}/openapi/cloud-ai-api.yaml`.
- **Plain text for context windows:** `{{BASE}}/llms.txt` (index), `{{BASE}}/llms-full.txt` (everything), `{{BASE}}/AGENTS.md` (playbook).

## Tools

| Tool | Use |
|---|---|
| `list_domains` / `get_domain` | Core API grouped by task area |
| `search_docs` | Keyword search across functions, classes, hooks, handbooks, WP-CLI and Cloud AI API docs |
| `get_function` / `get_class` / `get_hook` | Exact signatures, parameters and source location |
| `list_cli_commands` / `get_cli_command` | WP-CLI commands with synopsis and options |
| `list_blueprints` / `get_blueprint` | End-to-end guides |
| `list_ai_operations` / `get_ai_operation` | Cloud AI API operations |
