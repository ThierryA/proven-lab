#!/usr/bin/env node
// stdio transport: `npx wp-agentic-kit-mcp`
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.mjs';
await createServer().connect(new StdioServerTransport());
