import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import type { Screen, ScreenLine } from '../types';

// Screen-share layout: the screen on the left, the presenter in a framed box on the right.
export const SCREEN = { left: 72, top: 120, width: 1290, height: 726 };
export const BOX = { right: 72, top: 270, width: 470, height: 576 };

const style: Record<ScreenLine['kind'], { mark: string; color: string }> = {
  user: { mark: '›', color: theme.fg },
  agent: { mark: ' ', color: theme.fg2 },
  ask: { mark: '?', color: theme.signal },
  ok: { mark: '✓', color: theme.signal },
  code: { mark: '$', color: theme.fg },
  file: { mark: '+', color: theme.fg2 },
};

// A replayed session: lines appear across the section, user lines typed out.
const Session = ({ lines }: { lines: ScreenLine[] }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const step = Math.max(8, (durationInFrames - 30) / lines.length);
  return (
    <div style={{ padding: '36px 40px', fontFamily: theme.mono, fontSize: 30, lineHeight: 1.6, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      {lines.map((l, i) => {
        const at = 8 + i * step;
        if (frame < at) return null;
        const s = style[l.kind];
        const chars = l.kind === 'user' ? Math.floor(interpolate(frame, [at, at + Math.min(step * 0.8, l.text.length * 0.6)], [0, l.text.length], { extrapolateRight: 'clamp' })) : l.text.length;
        const opacity = l.kind === 'user' ? 1 : interpolate(frame, [at, at + 6], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{ display: 'flex', gap: 18, opacity, color: s.color, marginTop: l.kind === 'user' && i > 0 ? 14 : 0, background: l.kind === 'user' ? 'rgba(255,255,255,0.04)' : 'transparent', padding: l.kind === 'user' ? '8px 12px' : '0 12px', borderRadius: 6 }}>
            <span style={{ color: l.kind === 'user' || l.kind === 'code' ? theme.signal : s.color, width: '1ch', flexShrink: 0 }}>{s.mark}</span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{l.text.slice(0, chars)}</span>
          </div>
        );
      })}
    </div>
  );
};

export const ScreenPanel = ({ screen, offset }: { screen: Screen; offset: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', ...SCREEN, opacity, borderRadius: 14, overflow: 'hidden', border: `1px solid ${theme.line2}`, background: theme.ink2, boxShadow: '0 30px 80px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${theme.line}`, flexShrink: 0 }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 13, height: 13, borderRadius: 7, background: theme.line2 }} />)}
        <span style={{ marginLeft: 14, fontFamily: theme.mono, fontSize: 20, color: theme.fg3 }}>{screen.title ?? ''}</span>
      </div>
      <div style={{ position: 'relative', flex: 1 }}>
        {screen.video ? <OffthreadVideo src={staticFile(screen.video)} muted startFrom={0} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
          : screen.image ? <Img src={staticFile(screen.image)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <Session lines={screen.lines ?? []} />}
      </div>
    </div>
  );
};

// The presenter box: the continuous take, cropped on head and shoulders.
export const PresenterBox = ({ clip, still, offset }: { clip?: string; still?: string; offset: number }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const media = { position: 'absolute' as const, width: '245%', height: '100%', left: '-72.5%', top: 0, objectFit: 'cover' as const, transform: 'scale(1.25)', transformOrigin: '50% 10%' };
  return (
    <div style={{ position: 'absolute', ...BOX, opacity, borderRadius: 14, overflow: 'hidden', border: `1px solid ${theme.line2}`, background: theme.ink2, boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}>
      {clip ? <OffthreadVideo src={staticFile(clip)} startFrom={offset} style={media} />
        : still ? <Img src={staticFile(still)} style={media} />
        : <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 35%, #3a3128 0%, ${theme.ink2} 70%)` }} />}
    </div>
  );
};
