import whyRebuild from './why-rebuild.json';
import setupFirstSite from './setup-first-site.json';
import type { Episode } from '../src/types';

// Add an episode: write episodes/<id>.json and list it here.
export const episodes: Episode[] = [whyRebuild as Episode, setupFirstSite as Episode];
