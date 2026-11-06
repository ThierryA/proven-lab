import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TOOLS } from './tools.mjs';
import { callTool } from './core.mjs';

export function createServer() {
  const server = new Server({ name: 'provenlab', version: '0.1.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    try {
      const result = await callTool(params.name, params.arguments || {});
      return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }], isError: Boolean(result?.error) };
    } catch (e) {
      return { content: [{ type: 'text', text: String(e.message || e) }], isError: true };
    }
  });
  return server;
}
