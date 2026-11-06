# Use your agent

Proven Lab runs at `{{BASE}}`. No account, API key or install is needed.

## Just ask

Give any coding agent that can fetch URLs the request and the Proven Lab URL:

```text
Build a members directory with Proven Lab: {{BASE}}
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
