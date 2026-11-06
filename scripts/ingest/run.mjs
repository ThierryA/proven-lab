import { ingestWp } from './wp.mjs';
import { ingestWpe } from './wpe.mjs';
import { ingestWpSource } from './wp-source.mjs';
import { ingestWpCli } from './wpcli.mjs';
const which = process.argv[2] || 'all';
if (which === 'all' || which === 'wpe') await ingestWpe();
if (which === 'all' || which === 'wp') await ingestWp();
if (which === 'all' || which === 'wp' || which === 'source') await ingestWpSource({ ref: process.env.WP_VERSION || 'latest' });
if (which === 'all' || which === 'wp' || which === 'cli') await ingestWpCli();
