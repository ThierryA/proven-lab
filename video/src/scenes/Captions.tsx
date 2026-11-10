import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

// Shows the narration one sentence at a time, timed by length.
export const Captions = ({ text }: { text: string }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sentences = text.match(/[^]+?[.!?]+(?=\s|$)/g)?.map((s) => s.trim()) ?? [text];
  const total = sentences.reduce((n, s) => n + s.length, 0);
  const usable = durationInFrames - 20;
  let start = 0;
  const idx = sentences.findIndex((s) => {
    start += (s.length / total) * usable;
    return frame < start;
  });
  const current = sentences[idx === -1 ? sentences.length - 1 : idx];
  const opacity = interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, display: 'flex', justifyContent: 'center', opacity }}>
      <div style={{ maxWidth: 1400, textAlign: 'center', fontSize: 38, lineHeight: 1.35, color: theme.fg, background: 'rgba(11,11,12,0.85)', padding: '14px 28px', borderRadius: 8 }}>
        {current}
      </div>
    </div>
  );
};
