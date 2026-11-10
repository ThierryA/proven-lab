import { Composition, staticFile } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { Tutorial } from './Tutorial';
import { tutorials } from '../tutorials';
import type { TutorialProps } from './types';
import pkg from '../../package.json';

export const FPS = 30;
const PAD = 0.8; // seconds of air after each scene

// Without a voice file, estimate from the narration (about 150 words a minute).
const estimate = (text: string) => Math.max(3.5, text.split(/\s+/).length / 2.5);

export const RemotionRoot = () => (
  <>
    {tutorials.map((script) => (
      <Composition
        key={script.id}
        id={script.id}
        component={Tutorial}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={FPS * 60}
        defaultProps={{ script, version: pkg.version } as TutorialProps}
        calculateMetadata={async ({ props }) => {
          const timing = await Promise.all(
            props.script.scenes.map(async (s) => {
              try {
                const sec = await getAudioDurationInSeconds(staticFile(`voice/${props.script.id}/${s.id}.mp3`));
                return { frames: Math.ceil((sec + PAD) * FPS), voice: true };
              } catch {
                return { frames: Math.ceil((estimate(s.narration) + PAD) * FPS), voice: false };
              }
            }),
          );
          return { durationInFrames: timing.reduce((n, t) => n + t.frames, 0), props: { ...props, timing } };
        }}
      />
    ))}
  </>
);
