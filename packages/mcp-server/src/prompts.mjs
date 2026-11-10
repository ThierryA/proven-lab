// MCP server instructions (sent to every client at initialize) and prompts (slash commands in MCP clients).
import { callTool } from './core.mjs';

export const INSTRUCTIONS = `Proven Lab: build or change apps with WordPress as the application layer (data, users, permissions, hooks, REST, Abilities), WP-CLI, and the Cloud AI API for AI features. WP Engine hosting is optional.

Follow the runbook: get_blueprint("runbook"). In short:
1. New or existing project? Existing: find and inspect it (get_blueprint "existing-project"). New: ask the setup (Classic or headless; get_blueprint "architecture"), where to build (Local, or in the cloud on WP Engine), and for developers which repository. Developers choose; for non-developers propose Classic in plain words.
2. Workspace: get_blueprint "local-development" or "wpengine-cloud".
3. Build the app as a regular plugin: start from get_template("plugin", slug). Look up every API with get_function / get_hook / get_class before using it. Anything people see follows get_blueprint "frontend-design".
4. AI: the Cloud AI API through the WP Engine AI plugins, no API key (get_blueprint "wpe-ai-plugins"; get_ai_operation gives the exact PHP call).
5. Verify: prove behavior with WP-CLI and real requests (get_template "verify-script").
6. Ship: staging first when there is one, production after the user's yes (get_blueprint "wpe-deployment").
Never edit WordPress core or third-party plugins; never set up SSH keys for WP Engine (its MCP server connects for you).`;

export const PROMPTS = [
  { name: 'build', description: 'Build a new WordPress-backed app or change an existing site, following the Proven Lab runbook.', arguments: [{ name: 'request', description: 'What to build or change, in your own words', required: true }] },
  { name: 'check', description: 'Review the work before handing it over: WP-CLI verification, the quality checks, and a screenshot review of anything people see.' },
  { name: 'ship', description: 'Deploy: suggest staging if there is none, deploy there, then offer production (WP Engine optional).' },
];

const text = (t) => ({ role: 'user', content: { type: 'text', text: t } });
const guide = async (slug) => (await callTool('get_blueprint', { slug })).markdown || '';

export async function getPrompt(name, args = {}) {
  if (name === 'build') {
    const request = String(args.request || '').trim() || '(ask the user what to build)';
    return { description: 'Proven Lab runbook', messages: [text(`Do this with Proven Lab:\n\n${request}\n\nFollow this runbook step by step. Start with step 1 (new or existing project) and ask only what the request does not already answer.\n\n---\n\n${await guide('runbook')}`)] };
  }
  if (name === 'check') {
    return { description: 'Proven Lab review', messages: [text(`Before handing the work over:\n1. Verify behavior with WP-CLI and real HTTP requests (get_template "verify-script" has a ready script).\n2. Developers: run the project's coding standards, static analysis and tests.\n3. Anything people see: take screenshots at 375, 768 and 1280 px wide and review them against the checklist below; fix before showing the user.\n4. Report exactly what you checked and the results.\n\n---\n\n${await guide('frontend-design')}`)] };
  }
  if (name === 'ship') {
    return { description: 'Proven Lab ship guide', messages: [text(`Ship the current project:\n\n${await guide('wpe-deployment')}`)] };
  }
  throw new Error(`Unknown prompt: ${name}`);
}
