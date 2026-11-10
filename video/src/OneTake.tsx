import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion';
import { theme } from './theme';
import { Presenter } from './scenes/Presenter';
import { Callout, LowerThird, Points } from './scenes/HostScene';
import type { TakeProps } from './types';

// One continuous presenter take. Sections only change the framing (a punch-in, like a second camera)
// and bring in graphics; the picture and voice never break.
export const OneTake = ({ script, version, take }: TakeProps) => {
  const { fps, durationInFrames } = useVideoConfig();
  const t = take ?? { duration: durationInFrames / fps, starts: script.sections.map(() => 0) };
  const at = (sec: number) => Math.round(sec * fps);
  const music = script.music;

  return (
    <AbsoluteFill style={{ background: theme.ink, color: theme.fg, fontFamily: theme.sans }}>
      {script.sections.map((s, i) => {
        const from = at(t.starts[i]);
        const to = i + 1 < script.sections.length ? at(t.starts[i + 1]) : durationInFrames;
        return (
          <Sequence key={s.id} from={from} durationInFrames={Math.max(1, to - from)} name={s.id}>
            {/* The presenter clip runs continuously below; this layer only sets the framing for the section. */}
            <Presenter clip={t.clip} still={t.still} variant={s.points ? 'side' : 'full'} shot={s.shot} offset={from} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.45) 100%)' }} />
            {s.points && <Points points={s.points} />}
            {s.callout && <Callout text={s.callout} />}
            {s.lowerThird && <LowerThird series={script.series} title={script.title} />}
          </Sequence>
        );
      })}

      <div style={{ position: 'absolute', top: 56, left: 96, fontFamily: theme.mono, fontSize: 26, color: theme.fg, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
        <span style={{ color: theme.signal }}>■</span> Proven Lab
      </div>
      <div style={{ position: 'absolute', top: 56, right: 96, fontFamily: theme.mono, fontSize: 26, color: theme.fg3 }}>v{version}</div>

      {t.scratch && <Audio src={staticFile(t.scratch)} />}
      {t.music && music && <Audio src={staticFile(t.music)} loop volume={(f) => musicVolume(f / fps, durationInFrames / fps, music, t.words)} />}
    </AbsoluteFill>
  );
};

// The music ducks under the voice: low while words are spoken, up in real pauses and after the last word,
// then fades out. Without word timings (scratch preview), it stays low except for the last seconds.
const musicVolume = (t: number, end: number, music: { volume?: number; underVoice?: number }, words?: { start_time: number; end_time: number }[]) => {
  const full = music.volume ?? 0.35;
  const under = music.underVoice ?? 0.08;
  const fadeOut = interpolate(t, [end - 1.5, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (!words?.length) return interpolate(t, [end - 4, end - 2.5], [under, full], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * fadeOut;
  // Speech segments: words closer than 0.7 s count as one stretch of talking.
  const segments: [number, number][] = [];
  for (const w of words) {
    const last = segments[segments.length - 1];
    if (last && w.start_time - last[1] < 0.7) last[1] = w.end_time;
    else segments.push([w.start_time, w.end_time]);
  }
  // Distance in seconds to the nearest speech (0 inside it), eased over 0.25 s before and 0.5 s after.
  let level = full;
  for (const [a, b] of segments) {
    if (t >= a - 0.25 && t <= b + 0.5) {
      const k = t < a ? (a - t) / 0.25 : t > b ? (t - b) / 0.5 : 0;
      level = Math.min(level, under + (full - under) * k);
    }
  }
  return level * fadeOut;
};
