import { useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { enter } from './anim';
import type { Scene } from '../types';

export const CardScene = ({ scene }: { scene: Extract<Scene, { type: 'card' }> }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ ...enter(frame, fps), fontSize: 110, fontWeight: 500, margin: 0 }}>{scene.heading}</h2>
      <div style={{ ...enter(frame, fps, 8), display: 'inline-block', marginTop: 48, padding: '24px 48px', background: theme.signal, color: theme.ink, fontFamily: theme.mono, fontSize: 52, borderRadius: 10 }}>{scene.url}</div>
      {scene.sub && <p style={{ ...enter(frame, fps, 16), fontSize: 38, color: theme.fg2, marginTop: 44 }}>{scene.sub}</p>}
    </div>
  );
};
