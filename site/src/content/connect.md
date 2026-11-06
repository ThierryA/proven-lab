# Connect your agent

Proven Lab runs as one Node server. It serves this site, an MCP endpoint at `/mcp`, and a REST mirror of the same tools at `/api/<tool>`.

## Claude Code (MCP over HTTP)

```bash
claude mcp add --transport http provenlab https://<your-provenlab-host>/mcp
```

## Claude Code (MCP over stdio, from a local checkout)

```bash
claude mcp add provenlab -- node /path/to/provenlab/packages/mcp-server/src/index.mjs
```

The npm package `@provenlab/mcp` is not published yet. Once it is: `claude mcp add provenlab -- npx @provenlab/mcp`.

## Other MCP clients

Point any client that supports streamable HTTP at `https://<your-provenlab-host>/mcp`. For stdio-only clients (such as Claude Desktop), add the stdio command above to the client's MCP configuration.

## OpenAI and Anthropic function calling

Load `/tools/openai.json` or `/tools/anthropic.json` as the tool list and send each call to `GET` or `POST /api/<tool>` (see `/openapi/provenlab-api.yaml`).

## OpenAPI (for example, GPT Actions)

Import `/openapi/provenlab-api.yaml`. The Cloud AI API spec is at `/openapi/cloud-ai-api.yaml`.

## Plain text for context windows

- `/llms.txt`: index
- `/llms-full.txt`: all guides and API pages in one file
- `/AGENTS.md`: playbook; copy it into your project root

## Tools

| Tool | Use |
|---|---|
| `list_domains` / `get_domain` | Core APIs grouped by task area |
| `search_docs` | Keyword search across functions, classes, hooks, handbooks, WP-CLI and WP Engine docs |
| `get_function` / `get_class` / `get_hook` | Exact signatures, parameters and source location |
| `list_cli_commands` / `get_cli_command` | WP-CLI commands with synopsis and options |
| `list_blueprints` / `get_blueprint` | End-to-end guides |
| `list_ai_operations` / `get_ai_operation` | Cloud AI API and Sites API operations |
