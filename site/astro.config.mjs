import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export default defineConfig({
  site: process.env.SITE_URL || pkg.homepage,
  // Sitemap URLs match the canonical tags (no trailing slash).
  integrations: [sitemap({ serialize: (item) => ({ ...item, url: item.url.replace(/(.)\/$/, '$1') }) })],
  vite: { plugins: [tailwindcss()] },
});
