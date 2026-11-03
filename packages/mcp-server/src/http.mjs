#!/usr/bin/env node
// HTTP: streamable-HTTP MCP at /mcp plus a plain REST mirror at /api/<tool> (see dist/openapi/kit-api.yaml).
import { createServer as createHttp } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.mjs';
import { callTool } from './core.mjs';
import { TOOLS } from './tools.mjs';

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(body)); };
const readBody = async (req) => { const c = []; for await (const x of req) c.push(x); return c.length ? JSON.parse(Buffer.concat(c).toString()) : undefined; };

createHttp(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }); return res.end(); }
  try {
    if (url.pathname === '/mcp') {
      // stateless: fresh server + transport per request
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => { transport.close(); server.close(); });
      await server.connect(transport);
      return transport.handleRequest(req, res, await readBody(req));
    }
    const m = url.pathname.match(/^\/api\/(\w+)$/);
    if (m && TOOLS.some((t) => t.name === m[1])) return json(res, 200, await callTool(m[1], Object.fromEntries(url.searchParams)));
    json(res, 404, { error: 'not found', mcp: '/mcp', tools: TOOLS.map((t) => `/api/${t.name}`) });
  } catch (e) { json(res, 500, { error: String(e.message || e) }); }
}).listen(process.env.PORT || 8787, () => console.error(`wp-agentic-kit on :${process.env.PORT || 8787}`));
