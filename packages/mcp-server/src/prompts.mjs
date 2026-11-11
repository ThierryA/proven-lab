// MCP server instructions (sent to every client on connect) and prompts. The prompts are the same as the Claude
// Code plugin's slash commands (content/plugin-commands), so every MCP client gets /start, /plan, /git-connect,
// /check and /ship.
import { getCommands } from './core.mjs';

export const INSTRUCTIONS = `Proven Lab: build or change apps with WordPress as the application layer (data, users, permissions, hooks, REST, Abilities), WP-CLI, and the Cloud AI API for AI features. GitHub and WP Engine hosting are optional.

Follow the runbook: get_blueprint("runbook"). In short:
0. Read .provenlab/project.md if it exists and skip what it answers; write it after onboarding.
1. What are we doing? Ask in plain words, technical name in brackets: a quick prototype (get_blueprint "prototype": Playground recommended, or Local, or WP Engine; same building blocks, no plan, GitHub, full checks or staging), a new project (the setup, get_blueprint "architecture"; where to build; GitHub, get_blueprint "git-workflow"), or an existing site (get_blueprint "existing-project"). Developers choose; for non-developers propose in plain words.
2. Workspace: get_blueprint "local-development" or "wpengine-cloud"; connect GitHub if wanted.
3. Build the app as a regular plugin: start from get_template("plugin", slug). Look up APIs with get_function / get_hook / get_class. Anything people see follows get_blueprint "frontend-design".
4. AI: the Cloud AI API through the WP Engine AI plugins, no API key (get_blueprint "wpe-ai-plugins"; get_ai_operation gives the PHP call).
5. Verify: a quick check with WP-CLI and real requests on every change; the full checks on demand, locally or in CI. Then commit.
6. Ship: commit before pushing; staging first, production after the user's yes (get_blueprint "wpe-deployment").
Always: never change WordPress core; never edit third-party plugins or themes (use their hooks from the user's plugin); use core APIs (post types, meta, taxonomies, users, options, cron, transients), no custom tables without the user's explicit agreement. Never set up SSH keys for WP Engine (its MCP server connects for you). Explain structures (pages, data model, plan, deploy path) visually: generative UI if available, else Mermaid. Prompts: start, prototype, plan, git-connect, check, explain, ship; when the user asks for one in plain words, get_command gives its steps.`;

export async function listPrompts() {
  return (await getCommands()).filter((c) => c.name !== 'setup-project').map((c) => ({
    name: c.name,
    description: c.description,
    ...(c.argumentHint ? { arguments: [{ name: 'request', description: 'What to build or change, in your own words', required: false }] } : {}),
  }));
}

export async function getPrompt(name, args = {}) {
  const c = (await getCommands()).find((x) => x.name === name);
  if (!c) throw new Error(`Unknown prompt: ${name}`);
  const request = String(args.request || '').trim() || '(ask the user what they want)';
  return { description: c.description, messages: [{ role: 'user', content: { type: 'text', text: c.body.replaceAll('$ARGUMENTS', request) } }] };
}
