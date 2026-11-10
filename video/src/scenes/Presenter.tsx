import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { enter } from './anim';

// The presenter clip (with its audio). Without a clip yet, a placeholder shows where they will be.
const Placeholder = ({ small }: { small?: boolean }) => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${theme.line} 0%, ${theme.ink2} 70%)`, alignItems: 'center', justifyContent: 'center' }}>
    <svg viewBox="0 0 100 100" style={{ width: small ? '55%' : '28%', opacity: 0.55 }}>
      <circle cx="50" cy="36" r="17" fill={theme.line2} />
      <path d="M16 96c0-21 15-34 34-34s34 13 34 34z" fill={theme.line2} />
    </svg>
    {small && <div style={{ position: 'absolute', bottom: 14, fontFamily: theme.mono, fontSize: 18, color: theme.fg3 }}>presenter</div>}
  </AbsoluteFill>
);

const Clip = ({ clip, small }: { clip?: string; small?: boolean }) =>
  clip ? <OffthreadVideo src={staticFile(clip)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Placeholder small={small} />;

export const Presenter = ({ clip, variant }: { clip?: string; variant: 'full' | 'side' | 'corner' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (variant === 'full') return <AbsoluteFill><Clip clip={clip} /></AbsoluteFill>;
  if (variant === 'side') {
    return (
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '52%', overflow: 'hidden' }}>
        <Clip clip={clip} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${theme.ink} 0%, transparent 22%)` }} />
      </div>
    );
  }
  // Webcam-style box in the corner while a screen is shown.
  return (
    <div style={{ ...enter(frame, fps), position: 'absolute', right: 64, bottom: 48, width: 400, height: 225, borderRadius: 16, overflow: 'hidden', border: `2px solid ${theme.line2}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
      <Clip clip={clip} small />
    </div>
  );
};
