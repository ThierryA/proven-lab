# Set up Proven Lab in a project

Instructions for a coding agent (or a person). Base URL: `{{BASE}}`. Work in the project's root directory. Do not delete or overwrite anything the project already has; merge as described below and tell the user what you changed.

## 1. Connect the MCP server

The server is `provenlab`, streamable HTTP, at `{{MCP_URL}}`. No API key is needed.

| Client | How |
|---|---|
| Claude Code | `claude mcp add --transport http provenlab {{MCP_URL}}` (add `--scope project` to share it through `.mcp.json`) |
| Cursor | `.cursor/mcp.json`: `{"mcpServers": {"provenlab": {"url": "{{MCP_URL}}"}}}` |
| VS Code | `.vscode/mcp.json`: `{"servers": {"provenlab": {"type": "http", "url": "{{MCP_URL}}"}}}` |
| Other MCP clients | Add a streamable HTTP server with the URL above |
| No MCP support | Call the same tools over HTTP: `curl "{{BASE}}/api/<tool>?<args>"` |

Also add the **WP Engine MCP server** (`wpengine`, `https://api.ai.wpengine.com/v1/mcp`, streamable HTTP, OAuth) for hosted sites: `claude mcp add --transport http --scope user wpengine https://api.ai.wpengine.com/v1/mcp`, then authenticate in `/mcp`. The kit's MCP config files include both servers.

## 2. Add the project files

Fetch each file from `{{BASE}}/kit/<path>`:

| Path | Purpose | If the file already exists |
|---|---|---|
| `AGENTS.md` | The runbook for every agent | Keep the project's file and add a section `## Proven Lab` with one line: follow the runbook in `.claude/skills/provenlab/references/runbook.md` (also at `{{BASE}}/AGENTS.md`) |
| `CLAUDE.md` | Makes Claude Code read `AGENTS.md` | Add the line `@AGENTS.md` if it is not there |
| `.mcp.json` | Claude Code project MCP config (`provenlab` and `wpengine`) | Add both entries under `mcpServers`; keep the other servers |
| `.cursor/mcp.json` | Cursor MCP config (`provenlab` and `wpengine`) | Add both entries under `mcpServers` |
| `.vscode/mcp.json` | VS Code MCP config (`provenlab` and `wpengine`) | Add both entries under `servers` |
| `.claude/skills/provenlab/` | The skill: `SKILL.md`, `references/` (runbook and guides) and `templates/` (starter files) | Replace it only if it is an older Proven Lab skill |

The full file list is at `{{BASE}}/kit/manifest.json`. If the Proven Lab Claude Code plugin is already installed, skip the skill and the MCP entries: the plugin provides them. A person can run `curl -fsSL {{BASE}}/install.sh | sh` instead; it adds missing files and leaves existing ones alone.

## Updating an existing setup

Compare the version in the project (the `Proven Lab` line in `.provenlab/project.md`, or the runbook's header) with `version` in `{{BASE}}/kit/manifest.json`. If the manifest is newer: replace `.claude/skills/provenlab/` with the files from the manifest, replace `AGENTS.md` only if it is Proven Lab's runbook (if the project has its own `AGENTS.md`, keep it and keep its one-line pointer), keep the user's MCP entries, update the version in `.provenlab/project.md`, and tell the user what changed (`{{BASE}}/CHANGELOG.md`).

## 3. Verify

1. Call `list_domains` (or `curl "{{BASE}}/api/list_domains"`): it returns task areas such as `content-types`.
2. Call `get_function` with `register_meta`: the signature starts with `register_meta( $object_type, $meta_key, $args`.
3. In Claude Code, the user may need to approve the project server once (run `/mcp`).

## 4. Start building

Follow the runbook from step 0: read `.provenlab/project.md` if it exists, then find out whether this is a new or an existing project (ask the user if the request does not say). For a new project, the runbook's step 1 covers the setup (Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin) and where to build.
