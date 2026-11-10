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
      {t.music && music && (
        <Audio
          src={staticFile(t.music)}
          loop
          // Up at the start and the end, low under the voice.
          volume={(f) => interpolate(f, [0, fps * 2.5, fps * 3.5, durationInFrames - fps * 4, durationInFrames - fps * 1.5, durationInFrames],
            [music.volume ?? 0.35, music.volume ?? 0.35, music.underVoice ?? 0.08, music.underVoice ?? 0.08, music.volume ?? 0.35, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      )}
    </AbsoluteFill>
  );
};
