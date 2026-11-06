#!/usr/bin/env node
// stdio transport: `npx @proven/mcp`
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.mjs';
await createServer().connect(new StdioServerTransport());
