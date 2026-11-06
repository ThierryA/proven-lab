#!/usr/bin/env node
// Proven Lab web server: serves the built site (site/dist) plus /mcp and /api/<tool>.
// Zero framework. Listens on PORT (WP Engine Headless Platform expects 8080 or 3000).
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { join, normalize, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kitHandler } from '../packages/mcp-server/src/handler.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = process.env.STATIC_DIR || join(ROOT, 'site', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.sh': 'text/plain; charset=utf-8', '.yaml': 'application/yaml', '.yml': 'application/yaml', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml' };
const SECURITY = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'SAMEORIGIN' };

async function resolveFile(pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return null; }
  if (rel.includes('\0')) return null;
  const abs = normalize(join(STATIC, rel));
  if (abs !== STATIC && !abs.startsWith(STATIC + sep)) return null; // path traversal guard
  for (const candidate of [abs, join(abs, 'index.html'), abs + '.html']) {
    try { if ((await stat(candidate)).isFile()) return candidate; } catch {}
  }
  return null;
}

export function createApp() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/healthz') { res.writeHead(200, { 'content-type': 'application/json', ...SECURITY }); return res.end('{"ok":true}'); }
      if (await kitHandler(req, res, url)) return;
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { allow: 'GET, HEAD', ...SECURITY }); return res.end('Method Not Allowed'); }
      const file = await resolveFile(url.pathname);
      if (!file) {
        let body = 'Not found';
        const nf = await readFile(join(STATIC, '404.html')).catch(() => null);
        res.writeHead(404, { 'content-type': nf ? TYPES['.html'] : 'text/plain; charset=utf-8', ...SECURITY });
        return res.end(nf || body);
      }
      const ext = extname(file);
      const immutable = file.includes(`${sep}_astro${sep}`);
      res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': immutable ? 'public, max-age=31536000, immutable' : ext === '.html' ? 'public, max-age=0, must-revalidate' : 'public, max-age=3600', ...SECURITY });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file).pipe(res);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT) || 8080;
  createApp().listen(port, '0.0.0.0', () => console.log(`Proven Lab listening on :${port}`));
}
