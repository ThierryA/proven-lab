# Start building

Build with the coding agent you already use. Nothing to install, no account or API key for Proven Lab.

## 1. Open your agent

Any coding agent that can read web pages works:

- **Claude Code**, in the terminal, the desktop app or your editor
- **Codex**, in the terminal, the app or your editor
- **Cursor**, **GitHub Copilot**, **Gemini CLI**, **Windsurf**, or the agent built into your editor

## 2. Describe what you want, and add the Proven Lab link

A new app or a change to a site you already have: write your request in your own words and end it with the link:

```text
Build a members directory.
Use Proven Lab: {{BASE}}
```

[See more example requests ↓](#examples)

With just the link you can also ask in plain words for what the commands do: "plan this first", "explain the site structure", "connect it to GitHub", "check it", "ship it".

## 3. Answer a few questions

Your agent reads the Proven Lab instructions and first asks whether this is a new project or a change to something you already have. Then it asks only what it needs (the kind of site, where to build it, or where your existing project lives), does the work, and shows you the result. You sign in where needed and approve before anything goes live.

<a id="examples"></a>

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

**Claude Code:** install the plugin: the Proven Lab tools, the skill, and the commands `/provenlab:start`, `/provenlab:plan`, `/provenlab:git-connect`, `/provenlab:check`, `/provenlab:explain` and `/provenlab:ship` (other MCP clients get the same commands as prompts):

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

## Updating

Each release has a version and a [changelog](/changelog).

- **Claude Code plugin:** run `/plugin marketplace update provenlab`, then `/plugin update provenlab@provenlab`, and restart Claude Code. From a terminal: `claude plugin marketplace update provenlab && claude plugin update provenlab@provenlab`.
- **MCP server only:** nothing to do; the tools, instructions and prompts update on the server. Start a new session to pick them up.
- **Project kit files** (`AGENTS.md`, the skill in `.claude/skills/provenlab/`): ask your agent `Update Proven Lab in this project by following {{BASE}}/kit/SETUP.md`. It replaces only Proven Lab's own files and keeps yours.

## For tool builders

- **Tools over HTTP:** `GET {{BASE}}/api/<tool>?<args>`, for example `{{BASE}}/api/get_function?name=register_meta`.
- **Function calling:** `{{BASE}}/tools/openai.json` and `{{BASE}}/tools/anthropic.json`; **OpenAPI:** `{{BASE}}/openapi/provenlab-api.yaml`.
- **Plain text:** `{{BASE}}/llms.txt`, `{{BASE}}/llms-full.txt` and `{{BASE}}/AGENTS.md`.
- Tools: `list_domains`, `get_domain`, `search_docs`, `get_function`, `get_class`, `get_hook`, `list_cli_commands`, `get_cli_command`, `list_blueprints`, `get_blueprint`, `list_ai_operations`, `get_ai_operation`.
