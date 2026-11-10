import { Composition, staticFile } from 'remotion';
import { Tutorial, withIntro } from './Tutorial';
import { OneTake } from './OneTake';
import { tutorials } from '../tutorials';
import type { TakeProps, TakeScript, Timing, TutorialProps, TutorialScript } from './types';
import pkg from '../../package.json';
import presenter from '../presenter.json';

export const FPS = 30;
const PAD = 0.6; // seconds of air after each scene

// Without a presenter clip, estimate from the narration (about 150 words a minute).
const estimate = (text: string) => Math.max(2.5, text.split(/\s+/).length / 2.5);

// Clip lengths, written by tools/presenter.mjs. Missing manifest = no clips yet.
type Manifest = { scenes: Record<string, { duration: number; starts?: number[]; words?: { text: string; start_time: number; end_time: number }[] }>; stills?: Record<string, { file: string }> };
const read = async (dir: string, kind = 'host'): Promise<Manifest> => {
  try {
    const res = await fetch(staticFile(`${kind}/${dir}/manifest.json`));
    return res.ok ? await res.json() : { scenes: {} };
  } catch {
    return { scenes: {} };
  }
};
const manifest = async (dir: string, kind = 'host') => (await read(dir, kind)).scenes;

const isTake = (s: TutorialScript | TakeScript): s is TakeScript => (s as TakeScript).take === 'single';

// Music files live in public/music/ (gitignored); a missing file just means no music yet.
const exists = async (file: string) => {
  try { return (await fetch(staticFile(file), { method: 'HEAD' })).ok; } catch { return false; }
};

const takeComposition = (script: TakeScript) => (
  <Composition
    key={script.id}
    id={script.id}
    component={OneTake}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={FPS * 60}
    defaultProps={{ script, version: pkg.version } as TakeProps}
    calculateMetadata={async ({ props }) => {
      const s = props.script;
      const still = (await read('_shared')).stills?.[s.camera ?? 'a']?.file;
      const clip = (await manifest(s.id)).take;
      const scratch = (await manifest(s.id, 'scratch')).take;
      const music = s.music && (await exists(s.music.file)) ? s.music.file : undefined;
      const got = clip ?? scratch;
      const duration = got ? got.duration : s.sections.reduce((n, x) => n + estimate(x.text), 0);
      const starts = got?.starts ?? s.sections.map((_, i) => s.sections.slice(0, i).reduce((n, x) => n + estimate(x.text), 0));
      const take = {
        duration, starts, still, music, words: clip?.words,
        clip: clip ? `host/${s.id}/take.mp4` : undefined,
        scratch: !clip && scratch ? `scratch/${s.id}/take.wav` : undefined,
      };
      return { durationInFrames: Math.ceil((duration + 1.5) * FPS), props: { ...props, take } };
    }}
  />
);

export const RemotionRoot = () => (
  <>
    {tutorials.filter(isTake).map(takeComposition)}
    {tutorials.filter((s): s is TutorialScript => !isTake(s)).map((script) => (
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
