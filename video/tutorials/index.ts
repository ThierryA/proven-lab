import buildAnApp from './build-an-app.json';
import type { TutorialScript } from '../src/types';

// Add a tutorial: write tutorials/<id>.json and list it here.
export const tutorials: TutorialScript[] = [buildAnApp as TutorialScript];
