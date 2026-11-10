// HTTP surface shared by the standalone MCP server and the Proven Lab web server:
//   /mcp           streamable-HTTP MCP (stateless, with fingerprinted session IDs; see below)
//   /api/<tool>    plain REST mirror of every tool (see dist/openapi/provenlab-api.yaml)
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.mjs';
import { callTool } from './core.mjs';
import { TOOLS } from './tools.mjs';
import { INSTRUCTIONS, listPrompts } from './prompts.mjs';
import { createHash, randomUUID } from 'node:crypto';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS' };
export const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', ...CORS }); res.end(JSON.stringify(body)); };
const readBody = async (req) => { const c = []; let n = 0; for await (const x of req) { n += x.length; if (n > 1_000_000) throw new Error('body too large'); c.push(x); } return c.length ? JSON.parse(Buffer.concat(c).toString()) : undefined; };

// Clients load the tool and prompt (command) lists once per session. To make new commands and tools appear on
// their own after a deploy, session IDs carry a fingerprint of what this server offers. When the offer changes,
// older session IDs get a 404, and MCP clients then start a new session (spec: a 404 on a request with a session
// ID means "re-initialize"), which reloads the lists. Every instance computes the same fingerprint, so nothing is
// stored and unrelated deploys keep sessions alive.
let fingerprintPromise;
export const fingerprint = () => (fingerprintPromise ||= listPrompts().then((prompts) =>
  createHash('sha1').update(JSON.stringify({ tools: TOOLS, prompts, instructions: INSTRUCTIONS })).digest('hex').slice(0, 12)));
const isInitialize = (body) => (Array.isArray(body) ? body : [body]).some((m) => m && m.method === 'initialize');

/** Returns true if the request was handled. */
export async function kitHandler(req, res, url) {
  if (!(url.pathname === '/mcp' || url.pathname.startsWith('/api/'))) return false;
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return true; }
  try {
    if (url.pathname === '/mcp') {
      const fp = await fingerprint();
      const body = req.method === 'POST' ? await readBody(req) : undefined;
      const sid = req.headers['mcp-session-id'];
      if (sid && !String(sid).startsWith(`pl-${fp}-`) && !isInitialize(body)) {
        // Proven Lab changed since this session started: ask the client to start a new one.
        res.writeHead(404, { 'content-type': 'application/json', ...CORS });
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Session expired: Proven Lab was updated. Start a new session to load the latest tools and commands.' }, id: null }));
        return true;
      }
      if (req.method === 'DELETE') { res.writeHead(204, CORS); res.end(); return true; }
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: isInitialize(body) ? () => `pl-${fp}-${randomUUID()}` : undefined });
      res.on('close', () => { transport.close(); server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
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
