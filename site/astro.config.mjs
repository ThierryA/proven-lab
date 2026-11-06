import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export default defineConfig({
  site: process.env.SITE_URL || pkg.homepage,
  vite: { plugins: [tailwindcss()] },
});
