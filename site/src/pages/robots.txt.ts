// Search engines may index every page. /api/ and /mcp are endpoints for agents, not pages.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /mcp\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
