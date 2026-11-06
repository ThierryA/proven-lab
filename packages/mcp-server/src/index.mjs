#!/usr/bin/env node
// `npx @provenlab/mcp`        MCP server over stdio
// `npx @provenlab/mcp init`   add the Proven Lab kit to the current project (--force to overwrite)
if (process.argv[2] === 'init') {
  const { init } = await import('./init.mjs');
  await init({ force: process.argv.includes('--force') }).catch((e) => { console.error(`Proven Lab: ${e.message}`); process.exit(1); });
} else {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { createServer } = await import('./server.mjs');
  await createServer().connect(new StdioServerTransport());
}
