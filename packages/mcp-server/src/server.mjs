import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TOOLS } from './tools.mjs';
import { callTool } from './core.mjs';
import { INSTRUCTIONS, listPrompts, getPrompt } from './prompts.mjs';

export function createServer() {
  const server = new Server({ name: 'provenlab', version: '0.2.0' }, { capabilities: { tools: {}, prompts: {} }, instructions: INSTRUCTIONS });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
    try {
      const result = await callTool(params.name, params.arguments || {});
      // Guides are markdown: send them as text instead of an escaped JSON string.
      const text = typeof result === 'string' ? result : result && typeof result.markdown === 'string' && !result.error ? result.markdown : JSON.stringify(result);
      return { content: [{ type: 'text', text }], isError: Boolean(result?.error) };
    } catch (e) {
      return { content: [{ type: 'text', text: String(e.message || e) }], isError: true };
    }
  });
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: await listPrompts() }));
  server.setRequestHandler(GetPromptRequestSchema, async ({ params }) => getPrompt(params.name, params.arguments || {}));
  return server;
}
