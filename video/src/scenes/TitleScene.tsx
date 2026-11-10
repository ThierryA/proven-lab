import { useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { enter } from './anim';
import type { Scene } from '../types';

export const TitleScene = ({ scene }: { scene: Extract<Scene, { type: 'title' }> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div>
      {scene.kicker && <div style={{ ...enter(frame, fps), fontFamily: theme.mono, fontSize: 30, color: theme.signal, marginBottom: 32 }}>{scene.kicker}</div>}
      <h1 style={{ ...enter(frame, fps, 6), fontSize: 104, fontWeight: 500, lineHeight: 1.08, letterSpacing: '-0.02em', margin: 0, maxWidth: 1500 }}>{scene.heading}</h1>
      {scene.sub && <p style={{ ...enter(frame, fps, 14), fontSize: 44, color: theme.fg2, marginTop: 40 }}>{scene.sub}</p>}
    </div>
  );
};
