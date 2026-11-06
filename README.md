# Proven Lab

Docs, an MCP server and tool schemas that let coding agents build on the WordPress **Core API** (Proven Lab's name for the WordPress core PHP APIs), **WP-CLI** and the **Cloud AI API**. When a user asks an agent to "create a Node app on WordPress", the agent looks up exact signatures, hooks and commands instead of guessing, and reuses WordPress instead of rebuilding it.

## How it works

```
sources ──► ingest ──► corpus/ ──► build ──► dist/ ──► MCP server · OpenAPI · tools · llms.txt · site
```

| Source | How it's pulled |
|---|---|
| WordPress core PHP APIs (functions, classes, methods, **hooks**) | Downloads the release tarball and statically extracts docblocks with `scripts/php/extract.php` (tokenizer only, never executes WordPress) |
| WP-CLI commands | Downloads the WP-CLI release, verifies its SHA-512 checksum and runs `wp cli cmd-dump` |
| WordPress handbooks (plugin, theme, blocks, REST, APIs, advanced admin, ...) | developer.wordpress.org REST API |
| Cloud AI API | published `openapi.yaml` + docs crawled via sitemap |
| Blueprints and domain map | hand-written in `content/` (names validated against the corpus) |

## For developers and agents

- **MCP server:** `claude mcp add --transport http provenlab <homepage>/mcp` (Cursor, VS Code and others: see `/docs/connect`).
- **Project kit:** ask an agent to follow `<homepage>/kit/SETUP.md`, or run `curl -fsSL <homepage>/install.sh | sh`. Adds `AGENTS.md`, `CLAUDE.md`, MCP configs for Claude Code, Cursor and VS Code, and a Claude Code skill. Templates: `content/kit/`.
- **Claude Code plugin:** `/plugin install provenlab --marketplace ThierryA/proven-lab`. Generated into `plugins/provenlab/` and `.claude-plugin/marketplace.json` by the build; do not edit those by hand.
- **npm (not published yet):** `npx @provenlab/mcp` (stdio server), `npx @provenlab/mcp init` (kit, merging existing MCP configs).

`<homepage>` is `homepage` in `package.json`; `SITE_URL` overrides it at build time.

## Commands

```bash
npm install
npm run sync            # ingest everything + build dist/  (WP_VERSION=7.0 to pin)
npm run mcp             # MCP server over stdio
npm run mcp:http        # /mcp (streamable HTTP) and /api/<tool>
```

Add the MCP server to Claude Code: `claude mcp add provenlab -- node /path/to/provenlab/packages/mcp-server/src/index.mjs`, or over HTTP: `claude mcp add --transport http provenlab https://<host>/mcp`.

## Run and deploy

```bash
npm install
npm run build      # builds data artifacts + the site
npm start          # serves site + /mcp + /api/<tool> on PORT (default 8080)
```

One Node process serves the website, the MCP endpoint (`/mcp`), the REST mirror of the tools (`/api/<tool>`) and `/healthz`. It listens on `PORT` (default 8080), needs no framework at runtime (only the MCP SDK), and builds from the committed data snapshot in `corpus/`, so the build needs no network and no PHP. This matches WP Engine's Headless Platform (build `npm run build`, start `npm start`, port 8080 or 3000, Node per `.nvmrc`). Refresh the data with `npm run sync` and commit the result. Set `SITE_URL` at build time for absolute links in `llms.txt` and the OpenAPI files; without it they are relative.

## Tests

```bash
npm test                              # build + all tests: data integrity, blueprint code, server, MCP (HTTP + stdio), link crawl
WP_REAL=1 node --test test/wordpress.test.mjs   # real WordPress 7.x via WordPress Playground: runs the blueprint code
```

The blueprint tests lint every PHP snippet, check every WordPress function and every WP-CLI command and flag against the generated data, and the real-WordPress test executes the custom app blueprint (post types, registered meta over REST, user meta, capabilities, an Ability that changes a post's status).

## Outputs (`dist/`)
`llms.txt`, `llms-full.txt`, `AGENTS.md`, `domains/*.md`, `blueprints/*.md`, `cli/*.md`, `entities.json`, `docs.json`, `cli-commands.json`, `wpe-operations.json`, `stats.json`, `openapi/{provenlab-api,wpe-ai}.yaml`, `tools/{openai,anthropic}.json`.

## Roadmap
- Scheduled GitHub Action running `npm run sync` and publishing
- Publish `@provenlab/mcp` to npm (needs an npm org named `provenlab`)
- Index hooks/methods per WP version (`WP_VERSION`) and diff between versions
- More blueprints (WooCommerce, multisite, auth flows)
