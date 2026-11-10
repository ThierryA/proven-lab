import whyRebuild from './why-rebuild.json';
import reuseBeatsRegenerate from './reuse-beats-regenerate.json';
import whatIsProvenLab from './what-is-proven-lab.json';
import buildAnApp from './build-an-app.json';
import type { TakeScript, TutorialScript } from '../src/types';

// Add an episode: write tutorials/<id>.json and list it here.
// Episodes with "take": "single" are one continuous take; the others are cut from one clip per scene.
export const tutorials: (TutorialScript | TakeScript)[] = [
  whyRebuild as TakeScript,
  reuseBeatsRegenerate as TutorialScript,
  whatIsProvenLab as TutorialScript,
  buildAnApp as TutorialScript,
];
