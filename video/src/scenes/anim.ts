import { interpolate, spring } from 'remotion';

// Fade and rise in, starting at frame `at`.
export const enter = (frame: number, fps: number, at = 0) => {
  const p = spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: 18 });
  return { opacity: p, transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)` };
};
