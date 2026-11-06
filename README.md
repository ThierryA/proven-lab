# Proven

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

Add the MCP server to Claude Code: `claude mcp add proven -- node /path/to/packages/mcp-server/src/index.mjs`

## Run and deploy

```bash
npm install
npm run build      # builds data artifacts + the site
npm start          # serves site + /mcp + /api/<tool> on PORT (default 8080)
```

One Node process serves the website, the MCP endpoint (`/mcp`), the REST mirror of the tools (`/api/<tool>`) and `/healthz`. It listens on `PORT` (default 8080), has no runtime dependencies beyond the MCP SDK, and builds from the committed data snapshot in `corpus/`, so the build needs no network and no PHP. This matches WP Engine's Headless Platform (build `npm run build`, start `npm start`, port 8080 or 3000, Node per `.nvmrc`). Refresh the data with `npm run sync` and commit the result.

## Tests

```bash
npm test                              # build + 19 tests: data integrity, blueprint code, server, MCP (HTTP + stdio), link crawl
WP_REAL=1 node --test test/wordpress.test.mjs   # real WordPress 7.x via WordPress Playground: runs the blueprint code
```

The blueprint tests lint every PHP snippet, check every WordPress function and every WP-CLI command and flag against the generated data, and the real-WordPress test executes the headless blueprint (post types, registered meta over REST, user meta, capabilities, Abilities).

## Outputs (`dist/`)
`llms.txt`, `llms-full.txt`, `AGENTS.md`, `domains/*.md`, `blueprints/*.md`, `entities.json`, `wpe-operations.json`, `openapi/{kit-api,wpe-ai}.yaml`, `tools/{openai,anthropic}.json`.

## Roadmap
- Scheduled GitHub Action running `npm run sync` and publishing
- Publish `@proven/mcp` to npm (needs an npm org named proven); deploy `mcp:http`
- Index hooks/methods per WP version (`WP_VERSION`) and diff between versions
- More blueprints (WooCommerce, multisite, auth flows)
