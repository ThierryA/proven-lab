# WP Agentic Kit

Developer kit for building AI experiences on **WordPress core APIs** + the **WP Engine AI API**. Agents get exact, current documentation and tools so they can say "create me a Node app on WordPress" and compose proven systems instead of rebuilding them.

## How it works

```
sources ──► ingest ──► corpus/ ──► build ──► dist/ ──► MCP server · OpenAPI · tools · llms.txt · site
```

| Source | How it's pulled |
|---|---|
| WordPress core PHP APIs (functions, classes, methods, **hooks**) | Downloads the release tarball and statically extracts docblocks with `scripts/php/extract.php` (tokenizer only, never executes WP) |
| WordPress handbooks (plugin, theme, blocks, REST, APIs, advanced admin, ...) | developer.wordpress.org REST API |
| WP Engine AI API | live `openapi.yaml` + docs crawled via sitemap |
| Blueprints and domain map | hand-written in `content/` (names validated against the corpus) |

## Commands

```bash
npm install
npm run sync            # ingest everything + build dist/  (WP_VERSION=7.0 to pin)
npm run mcp             # MCP server over stdio
npm run mcp:http        # /mcp (streamable HTTP) and /api/<tool>
cd site && npm run build   # developer site + one-pager
```

Add the MCP server to Claude Code: `claude mcp add wp-agentic-kit -- node /path/to/packages/mcp-server/src/index.mjs`

## Outputs (`dist/`)
`llms.txt`, `llms-full.txt`, `AGENTS.md`, `domains/*.md`, `blueprints/*.md`, `entities.json`, `wpe-operations.json`, `openapi/{kit-api,wpe-ai}.yaml`, `tools/{openai,anthropic}.json`.

## Roadmap
- Scheduled GitHub Action running `npm run sync` and publishing
- Publish `wp-agentic-kit-mcp` to npm; deploy `mcp:http`
- Index hooks/methods per WP version (`WP_VERSION`) and diff between versions
- More blueprints (WooCommerce, multisite, auth flows)
