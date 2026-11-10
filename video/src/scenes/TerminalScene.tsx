import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { enter } from './anim';
import type { Line, Scene } from '../types';

const style: Record<Line['kind'], { mark: string; color: string }> = {
  prompt: { mark: '>', color: theme.fg },
  out: { mark: ' ', color: theme.fg2 },
  ok: { mark: '✓', color: theme.signal },
  ask: { mark: '?', color: theme.signal },
};

// A terminal where lines appear over the scene; prompts are typed out.
export const TerminalScene = ({ scene }: { scene: Extract<Scene, { type: 'terminal' }> }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const step = (durationInFrames - 30) / scene.lines.length;
  return (
    <div style={{ ...enter(frame, fps), border: `1px solid ${theme.line}`, borderRadius: 14, background: theme.ink2, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 12, padding: '20px 24px', borderBottom: `1px solid ${theme.line}` }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 16, height: 16, borderRadius: 8, background: theme.line2 }} />)}
      </div>
      <div style={{ padding: '32px 40px', fontFamily: theme.mono, fontSize: 34, lineHeight: 1.7, minHeight: 520 }}>
        {scene.lines.map((line, i) => {
          const at = 10 + i * step;
          if (frame < at) return null;
          const s = style[line.kind];
          const chars = line.kind === 'prompt'
            ? Math.floor(interpolate(frame, [at, at + Math.min(step * 0.7, line.text.length * 0.9)], [0, line.text.length], { extrapolateRight: 'clamp' }))
            : line.text.length;
          return (
            <div key={i} style={{ display: 'flex', gap: 24, color: s.color, opacity: line.kind === 'prompt' ? 1 : enter(frame, fps, at).opacity }}>
              <span style={{ color: line.kind === 'prompt' ? theme.signal : s.color, width: '1ch' }}>{s.mark}</span>
              <span>{line.text.slice(0, chars)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
