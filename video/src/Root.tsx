import { Composition, Still, staticFile } from 'remotion';
import { Episode } from './Episode';
import { Thumbnail } from './Thumbnail';
import { episodes } from '../episodes';
import type { EpisodeProps, Word } from './types';
import pkg from '../../package.json';

export const FPS = 30;

// Without a take, estimate from the words (about 150 a minute).
const estimate = (text: string) => text.split(/\s+/).length / 2.5;

type Take = { duration: number; starts?: number[]; words?: Word[] };
type Manifest = { take?: Take; still?: string };
// Written by tools/presenter.mjs (host/) and tools/scratch-voice.mjs (scratch/). Missing = not made yet.
const read = async (path: string): Promise<Manifest> => {
  try {
    const res = await fetch(staticFile(path));
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
};
const exists = async (file: string) => {
  try { return (await fetch(staticFile(file), { method: 'HEAD' })).ok; } catch { return false; }
};

export const RemotionRoot = () => (
  <>
    {episodes.map((episode) => (
      <Composition
        key={episode.id}
        id={episode.id}
        component={Episode}
        fps={FPS}
        width={1920}
        height={1080}
        durationInFrames={FPS * 60}
        defaultProps={{ episode, version: pkg.version } as EpisodeProps}
        calculateMetadata={async ({ props }) => {
          const e = props.episode;
          const host = await read(`host/${e.id}/manifest.json`);
          const scratch = await read(`scratch/${e.id}/manifest.json`);
          const got = host.take ?? scratch.take;
          const duration = got ? got.duration : e.sections.reduce((n, x) => n + estimate(x.text), 0);
          const starts = got?.starts ?? e.sections.map((_, i) => e.sections.slice(0, i).reduce((n, x) => n + estimate(x.text), 0));
          const take = {
            duration, starts, words: host.take?.words,
            still: host.still,
            clip: host.take ? `host/${e.id}/take.mp4` : undefined,
            scratch: !host.take && scratch.take ? `scratch/${e.id}/take.wav` : undefined,
            music: e.music && (await exists(e.music.file)) ? e.music.file : undefined,
          };
          // A few seconds after the last word for the music to breathe.
          return { durationInFrames: Math.ceil((duration + 3.5) * FPS), props: { ...props, take } };
        }}
      />
    ))}
    {episodes.filter((e) => e.thumbnail).map((e) => (
      <Still key={`${e.id}-thumbnail`} id={`${e.id}-thumbnail`} component={Thumbnail} width={1280} height={720}
        defaultProps={{ frame: `host/${e.id}/frame.jpg`, lines: e.thumbnail!.lines, series: e.series }} />
    ))}
  </>
);
