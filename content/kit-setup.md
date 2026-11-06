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

## 2. Add the project files

Fetch each file from `{{BASE}}/kit/<path>`:

| Path | Purpose | If the file already exists |
|---|---|---|
| `AGENTS.md` | Playbook for every agent | Append a section `## Proven Lab` that says to follow `{{BASE}}/AGENTS.md`, and copy in its Workflow and Hard rules |
| `CLAUDE.md` | Makes Claude Code read `AGENTS.md` | Add the line `@AGENTS.md` if it is not there |
| `.mcp.json` | Claude Code project MCP config | Add the `provenlab` entry under `mcpServers`; keep the other servers |
| `.cursor/mcp.json` | Cursor MCP config | Add the `provenlab` entry under `mcpServers` |
| `.vscode/mcp.json` | VS Code MCP config | Add the `provenlab` entry under `servers` |
| `.claude/skills/provenlab/SKILL.md` | Claude Code skill: when and how to use the tools | Replace it only if it is an older Proven Lab skill |

The file list is also at `{{BASE}}/kit/manifest.json`. A person can run `curl -fsSL {{BASE}}/install.sh | sh` instead; it adds missing files and leaves existing ones alone.

## 3. Verify

1. Call `list_domains` (or `curl "{{BASE}}/api/list_domains"`): it returns task areas such as `content-types`.
2. Call `get_function` with `register_meta`: the signature starts with `register_meta( $object_type, $meta_key, $args`.
3. In Claude Code, the user may need to approve the project server once (run `/mcp`).

## 4. Start building

Read the playbook (`AGENTS.md`). Before writing code, ask the user which setup they want (Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin), and check whether Local (localwp.com) is installed to run WordPress locally (`get_blueprint local-development`); then follow the matching blueprint.
