# Start building

Build with the coding agent you already use. Nothing to install, no account or API key for Proven Lab.

## 1. Open your agent

Any coding agent that can read web pages works:

- **Claude Code**, in the terminal, the desktop app or your editor
- **Codex**, in the terminal, the app or your editor
- **Cursor**, **GitHub Copilot**, **Gemini CLI**, **Windsurf**, or the agent built into your editor

## 2. Describe what you want, and add the Proven Lab link

Write your request in your own words and end it with the link:

```text
Build a members directory.
Use Proven Lab: {{BASE}}
```

## 3. Answer a few questions

Your agent reads the Proven Lab instructions, asks what it needs (the kind of site, where to build it), builds it, and shows you the result. You sign in where needed and approve before anything goes live.

## Example requests

**A new app**

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

**A feature for a website you already run on WordPress**

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

**Not a developer? Nothing to install**

```text
I'm not technical and I don't have WordPress. Make me a website for my
dog-walking business where clients book walks and pay a deposit. Host it
on WP Engine and send me a link to check before it goes live.
Use Proven Lab: {{BASE}}
```

**Developers: start from a repository**

```text
Create a GitHub repo for a WordPress plugin that adds a job board to my
site, set up tests and coding standards, and deploy to my WP Engine
staging on every push, with production after I approve.
Use Proven Lab: {{BASE}}
```

**A site hosted on WP Engine**

```text
My site is hosted on WP Engine. On staging, add an events section with
a calendar and RSVPs, then show me before anything goes to production.
Use Proven Lab: {{BASE}}
```

## Optional: connect Proven Lab to your agent

Not needed to start. Connecting makes lookups faster and keeps the instructions in your project.

**Claude Code:** install the plugin (Proven Lab tools, skill and `/provenlab:new-app`):

```text
/plugin install provenlab --marketplace ThierryA/proven-lab
```

Or add only the tools: `claude mcp add --transport http provenlab {{MCP_URL}}` (add `--scope project` to share it with your team).

**Other agents:** add an MCP server named `provenlab` with the URL `{{MCP_URL}}`:

| Agent | Configuration |
|---|---|
| Cursor | `.cursor/mcp.json`: `{"mcpServers": {"provenlab": {"url": "{{MCP_URL}}"}}}` |
| VS Code (GitHub Copilot) | `.vscode/mcp.json`: `{"servers": {"provenlab": {"type": "http", "url": "{{MCP_URL}}"}}}` |
| Any agent with remote MCP | Server name `provenlab`, URL `{{MCP_URL}}` |

**Keep the instructions in a project:** ask your agent `Set up Proven Lab in this project by following {{BASE}}/kit/SETUP.md`, or run `curl -fsSL {{BASE}}/install.sh | sh` in the project folder. It adds `AGENTS.md` (read by most coding agents), `CLAUDE.md`, MCP configs and a Claude Code skill, and leaves existing files alone (or `npx @provenlab/mcp init` once the package is published).

## For tool builders

- **Tools over HTTP:** `GET {{BASE}}/api/<tool>?<args>`, for example `{{BASE}}/api/get_function?name=register_meta`.
- **Function calling:** `{{BASE}}/tools/openai.json` and `{{BASE}}/tools/anthropic.json`; **OpenAPI:** `{{BASE}}/openapi/provenlab-api.yaml`.
- **Plain text:** `{{BASE}}/llms.txt`, `{{BASE}}/llms-full.txt` and `{{BASE}}/AGENTS.md`.
- Tools: `list_domains`, `get_domain`, `search_docs`, `get_function`, `get_class`, `get_hook`, `list_cli_commands`, `get_cli_command`, `list_blueprints`, `get_blueprint`, `list_ai_operations`, `get_ai_operation`.
