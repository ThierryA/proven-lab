import reuseBeatsRegenerate from './reuse-beats-regenerate.json';
import whatIsProvenLab from './what-is-proven-lab.json';
import buildAnApp from './build-an-app.json';
import type { TutorialScript } from '../src/types';

// Add an episode: write tutorials/<id>.json and list it here.
export const tutorials: TutorialScript[] = [
  reuseBeatsRegenerate as TutorialScript,
  whatIsProvenLab as TutorialScript,
  buildAnApp as TutorialScript,
];
