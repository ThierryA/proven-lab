// Markdown for docs pages: blueprint slugs written as `slug` become links.
import { Marked } from 'marked';
import { blueprints } from './data.mjs';

const slugs = new Set(blueprints().map((b) => b.slug));
export const md = new Marked({
  renderer: {
    codespan({ text }) {
      return slugs.has(text) ? `<a href="/docs/${text}"><code>${text}</code></a>` : false;
    },
  },
});
export const render = (src) => md.parse(src);
