// Markdown for docs pages: blueprint slugs written as `slug` become links, and fenced code
// is highlighted at build time with Shiki in the site's own theme.
import { Marked } from 'marked';
import { createHighlighter } from 'shiki';
import { blueprints, overviews } from './data.mjs';

const theme = {
  name: 'provenlab',
  type: 'dark',
  colors: { 'editor.background': '#121214', 'editor.foreground': '#d9d7d0' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#6e6d69', fontStyle: 'italic' } },
    { scope: ['keyword', 'storage', 'storage.type', 'keyword.control', 'keyword.operator.new', 'entity.name.tag', 'support.function.builtin.shell', 'constant.language.null'], settings: { foreground: '#facc48' } },
    { scope: ['string', 'string.quoted', 'punctuation.definition.string', 'string.unquoted.argument'], settings: { foreground: '#b9c39f' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.other.option', 'constant.character.escape', 'support.constant'], settings: { foreground: '#e3a77b' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call', 'entity.name.command', 'support.type.property-name', 'meta.object-literal.key', 'entity.name.type', 'support.class'], settings: { foreground: '#ecebe6' } },
    { scope: ['variable', 'variable.other', 'variable.parameter', 'punctuation.definition.variable', 'entity.other.attribute-name'], settings: { foreground: '#a6a49e' } },
    { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: '#8a8984' } },
  ],
};

const LANGS = ['php', 'javascript', 'typescript', 'bash', 'json', 'yaml', 'xml', 'sql', 'html', 'css'];
const ALIAS = { js: 'javascript', ts: 'typescript', sh: 'bash', shell: 'bash', zsh: 'bash', yml: 'yaml', console: 'bash' };
const highlighter = await createHighlighter({ themes: [theme], langs: LANGS });

const slugs = new Set([...blueprints(), ...overviews()].map((b) => b.slug));
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const md = new Marked({
  renderer: {
    codespan({ text }) {
      return slugs.has(text) ? `<a href="/docs/${text}"><code>${text}</code></a>` : false;
    },
    code({ text, lang }) {
      const requested = (lang || '').trim().split(/\s+/)[0].toLowerCase();
      const resolved = ALIAS[requested] || requested;
      const html = LANGS.includes(resolved)
        ? highlighter.codeToHtml(text, { lang: resolved, theme: 'provenlab' })
        : `<pre class="shiki"><code>${escapeHtml(text)}</code></pre>`;
      const label = requested && requested !== 'text' ? requested : '';
      return `<div class="code-block"${label ? ` data-lang="${label}"` : ''}>${html}</div>`;
    },
  },
});
export const render = (src) => md.parse(src);
