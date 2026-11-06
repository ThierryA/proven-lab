#!/usr/bin/env node
// Standalone MCP/API server (no website). For the full site + API use `npm start` at the repo root.
import { createServer as createHttp } from 'node:http';
import { kitHandler, json } from './handler.mjs';

const port = process.env.PORT || 8787;
createHttp(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!(await kitHandler(req, res, url))) json(res, 404, { error: 'not found', mcp: '/mcp' });
}).listen(port, () => console.error(`provenlab mcp on :${port}`));
