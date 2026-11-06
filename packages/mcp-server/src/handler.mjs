// HTTP surface shared by the standalone MCP server and the Proven Lab web server:
//   /mcp           streamable-HTTP MCP (stateless)
//   /api/<tool>    plain REST mirror of every tool (see dist/openapi/provenlab-api.yaml)
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.mjs';
import { callTool } from './core.mjs';
import { TOOLS } from './tools.mjs';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS' };
export const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', ...CORS }); res.end(JSON.stringify(body)); };
const readBody = async (req) => { const c = []; let n = 0; for await (const x of req) { n += x.length; if (n > 1_000_000) throw new Error('body too large'); c.push(x); } return c.length ? JSON.parse(Buffer.concat(c).toString()) : undefined; };

/** Returns true if the request was handled. */
export async function kitHandler(req, res, url) {
  if (!(url.pathname === '/mcp' || url.pathname.startsWith('/api/'))) return false;
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return true; }
  try {
    if (url.pathname === '/mcp') {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => { transport.close(); server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.method === 'POST' ? await readBody(req) : undefined);
      return true;
    }
    const name = url.pathname.slice('/api/'.length);
    if (!TOOLS.some((t) => t.name === name)) { json(res, 404, { error: `unknown tool: ${name}`, tools: TOOLS.map((t) => t.name) }); return true; }
    const args = req.method === 'POST' ? (await readBody(req)) || {} : Object.fromEntries(url.searchParams);
    if (typeof args.limit === 'string') args.limit = Number(args.limit);
    json(res, 200, await callTool(name, args));
  } catch (e) { json(res, 400, { error: String(e.message || e) }); }
  return true;
}
