import { useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { enter } from './anim';
import type { Scene } from '../types';

// Boxes joined by arrows, appearing left to right.
export const DiagramScene = ({ scene }: { scene: Extract<Scene, { type: 'diagram' }> }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const step = (durationInFrames * 0.6) / scene.nodes.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {scene.nodes.map((n, i) => {
        const a = enter(frame, fps, 6 + i * step);
        const last = i === scene.nodes.length - 1;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <div style={{ opacity: a.opacity, color: theme.signal, fontSize: 56, margin: '0 28px' }}>→</div>}
            <div style={{ ...a, width: 340, minHeight: 290, boxSizing: 'border-box', padding: '40px 32px', borderRadius: 14, border: `2px solid ${last ? theme.signal : theme.line2}`, background: theme.ink2 }}>
              <div style={{ fontSize: 44, fontWeight: 500 }}>{n.title}</div>
              {n.sub && <div style={{ fontSize: 30, color: theme.fg2, marginTop: 12 }}>{n.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
