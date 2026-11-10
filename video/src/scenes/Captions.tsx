import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

// Splits narration into sentences, each timed by its length across the scene. Shared with the .srt export.
export const sentenceTimes = (text: string, frames: number) => {
  const sentences = text.match(/[^]+?[.!?]+(?=\s|$)/g)?.map((s) => s.trim()) ?? [text];
  const total = sentences.reduce((n, s) => n + s.length, 0);
  const usable = frames - 20;
  let start = 0;
  return sentences.map((s) => {
    const begin = start;
    start += (s.length / total) * usable;
    return { text: s, start: begin, end: start };
  });
};

// Shows the narration one sentence at a time, timed by length.
export const Captions = ({ text, inset }: { text: string; inset?: boolean }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const parts = sentenceTimes(text, durationInFrames);
  const current = (parts.find((p) => frame < p.end) ?? parts[parts.length - 1]).text;
  const opacity = interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: inset ? 64 : 0, right: inset ? 500 : 0, bottom: 64, display: 'flex', justifyContent: 'center', opacity }}>
      <div style={{ maxWidth: 1400, textAlign: 'center', fontSize: 38, lineHeight: 1.35, color: theme.fg, background: 'rgba(11,11,12,0.85)', padding: '14px 28px', borderRadius: 8 }}>
        {current}
      </div>
    </div>
  );
};
