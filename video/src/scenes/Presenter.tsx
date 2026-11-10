import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { enter } from './anim';

export type Shot = 'wide' | 'close';

// Until the clips exist: the studio portrait as a still, else a silhouette in a warm studio light.
const Placeholder = ({ still, small }: { still?: string; small?: boolean }) =>
  still ? (
    <Img src={staticFile(still)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 35%, #3a3128 0%, #1d1a17 45%, #0e0d0c 100%)', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 100 80" style={{ width: small ? '60%' : '30%', opacity: 0.6, marginTop: small ? 30 : 160 }}>
        <circle cx="50" cy="28" r="15" fill="#4a423a" />
        <path d="M14 80c0-20 15-33 36-33s36 13 36 33z" fill="#4a423a" />
      </svg>
      {small && <div style={{ position: 'absolute', top: 12, fontFamily: theme.mono, fontSize: 18, color: theme.fg3 }}>presenter</div>}
    </AbsoluteFill>
  );

const Clip = ({ clip, still, small }: { clip?: string; still?: string; small?: boolean }) =>
  clip ? <OffthreadVideo src={staticFile(clip)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Placeholder still={still} small={small} />;

// Framing like a studio camera: a slow push on the wide shot, a punch-in on the face for the close shot.
const useFraming = (shot: Shot) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const push = interpolate(frame, [0, durationInFrames], [0, 0.03]);
  return { transform: `scale(${(shot === 'close' ? 1.3 : 1.02) + push})`, transformOrigin: '50% 8%' };
};

type Props = { clip?: string; still?: string; variant: 'full' | 'side' | 'corner'; shot?: Shot };

export const Presenter = ({ clip, still, variant, shot = 'wide' }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const framing = useFraming(shot);
  if (variant === 'full') {
    return <AbsoluteFill style={{ overflow: 'hidden' }}><AbsoluteFill style={framing}><Clip clip={clip} still={still} /></AbsoluteFill></AbsoluteFill>;
  }
  if (variant === 'side') {
    return (
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '56%', overflow: 'hidden' }}>
        <AbsoluteFill style={framing}><Clip clip={clip} still={still} /></AbsoluteFill>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${theme.ink} 0%, transparent 30%)` }} />
      </div>
    );
  }
  // Webcam-style box in the corner while a screen is shown.
  return (
    <div style={{ ...enter(frame, fps), position: 'absolute', right: 64, bottom: 48, width: 400, height: 225, borderRadius: 16, overflow: 'hidden', border: `2px solid ${theme.line2}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
      <Clip clip={clip} still={still} small />
    </div>
  );
};
