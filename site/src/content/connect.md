# Connect your agent

The same knowledge is available in every format agents use.

## Claude Code / Claude Desktop (MCP, stdio)

```bash
claude mcp add proven -- npx @proven/mcp
```

## Any MCP client (streamable HTTP)

Run `npm run mcp:http` (or deploy it) and point your client at `https://your-host/mcp`.

## OpenAI / Anthropic function calling

Load `/tools/openai.json` or `/tools/anthropic.json` as your tool list and forward calls to `GET /api/<tool>` (see `/openapi/kit-api.yaml`).

## OpenAPI actions

Import `/openapi/kit-api.yaml`. For the WP Engine AI API itself, use `/openapi/wpe-ai.yaml`.

## Plain context

- `/llms.txt`: index
- `/llms-full.txt`: everything in one file
- `/AGENTS.md`: playbook; copy it into your project root

## Tools

| Tool | Use |
|---|---|
| `list_domains` / `get_domain` | Find core APIs by task area |
| `search_docs` | Search functions, classes, hooks, handbooks, WP Engine docs |
| `get_function` / `get_class` / `get_hook` | Exact signatures and parameters |
| `list_blueprints` / `get_blueprint` | End-to-end build recipes |
| `list_wpe_operations` / `get_wpe_operation` | WP Engine AI API reference |
