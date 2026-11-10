// Proven Lab's look, the same tokens as the site (site/src/styles/global.css).
import { loadFont as loadSans } from '@remotion/google-fonts/IBMPlexSans';
import { loadFont as loadMono } from '@remotion/google-fonts/IBMPlexMono';

const sans = loadSans('normal', { weights: ['400', '500'], subsets: ['latin'] });
const mono = loadMono('normal', { weights: ['400', '500'], subsets: ['latin'] });

export const theme = {
  ink: '#0b0b0c',
  ink2: '#121214',
  line: '#303035',
  line2: '#5f5f66',
  fg: '#ecebe6',
  fg2: '#b8b6af',
  fg3: '#94928b',
  signal: '#facc48',
  sans: sans.fontFamily,
  mono: mono.fontFamily,
};
