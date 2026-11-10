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
type Manifest = { scenes: Record<string, { duration: number }>; stills?: Record<string, { file: string }> };
const read = async (dir: string, kind = 'host'): Promise<Manifest> => {
  try {
    const res = await fetch(staticFile(`${kind}/${dir}/manifest.json`));
    return res.ok ? await res.json() : { scenes: {} };
  } catch {
    return { scenes: {} };
  }
};
const manifest = async (dir: string, kind = 'host') => (await read(dir, kind)).scenes;

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
          const scratch = { _shared: await manifest('_shared', 'scratch'), [props.script.id]: await manifest(props.script.id, 'scratch') };
          const stills = Object.fromEntries(Object.entries((await read('_shared')).stills ?? {}).map(([k, v]) => [k, v.file]));
          const timing: Timing[] = withIntro(props.script, props.intro).map((s) => {
            const dir = s.id === 'hello' ? '_shared' : props.script.id;
            const still = stills[(s.type === 'host' && s.camera) || 'a'];
            const clip = clips[dir][s.id];
            if (clip) return { frames: Math.ceil((clip.duration + PAD) * FPS), clip: `host/${dir}/${s.id}.mp4` };
            const voice = scratch[dir][s.id];
            if (voice) return { frames: Math.ceil((voice.duration + PAD) * FPS), scratch: `scratch/${dir}/${s.id}.wav`, still };
            return { frames: Math.ceil((estimate(s.narration) + PAD) * FPS), still };
          });
          return { durationInFrames: timing.reduce((n, t) => n + t.frames, 0), props: { ...props, timing } };
        }}
      />
    ))}
  </>
);
