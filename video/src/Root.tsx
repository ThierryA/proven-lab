import { Composition, staticFile } from 'remotion';
import { Tutorial, withIntro } from './Tutorial';
import { tutorials } from '../tutorials';
import type { Timing, TutorialProps } from './types';
import pkg from '../../package.json';
import presenter from '../presenter.json';

export const FPS = 30;
const PAD = 0.6; // seconds of air after each scene

// Without a presenter clip, estimate from the narration (about 150 words a minute).
const estimate = (text: string) => Math.max(2.5, text.split(/\s+/).length / 2.5);

// Clip lengths, written by tools/presenter.mjs. Missing manifest = no clips yet.
const manifest = async (dir: string): Promise<Record<string, { duration: number }>> => {
  try {
    const res = await fetch(staticFile(`host/${dir}/manifest.json`));
    return res.ok ? (await res.json()).scenes : {};
  } catch {
    return {};
  }
};

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
        defaultProps={{ script, version: pkg.version, intro: presenter.intro } as TutorialProps}
        calculateMetadata={async ({ props }) => {
          const clips = { _shared: await manifest('_shared'), [props.script.id]: await manifest(props.script.id) };
          const timing: Timing[] = withIntro(props.script, props.intro).map((s) => {
            const dir = s.id === 'hello' ? '_shared' : props.script.id;
            const clip = clips[dir][s.id];
            return clip
              ? { frames: Math.ceil((clip.duration + PAD) * FPS), clip: `host/${dir}/${s.id}.mp4` }
              : { frames: Math.ceil((estimate(s.narration) + PAD) * FPS) };
          });
          return { durationInFrames: timing.reduce((n, t) => n + t.frames, 0), props: { ...props, timing } };
        }}
      />
    ))}
  </>
);
