import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

export type Shot = 'wide' | 'close';

// The presenter take, or until it exists the look's still (else a dark placeholder).
const Picture = ({ clip, still, offset }: { clip?: string; still?: string; offset: number }) =>
  clip ? <OffthreadVideo src={staticFile(clip)} startFrom={offset} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  : still ? <Img src={staticFile(still)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  : <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 35%, #3a3128 0%, ${theme.ink2} 70%)` }} />;

// Framing like a studio camera: a slow push on the wide shot, a punch-in on the face for the close shot.
const useFraming = (shot: Shot) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const push = interpolate(frame, [0, durationInFrames], [0, 0.03]);
  return { transform: `scale(${(shot === 'close' ? 1.3 : 1.02) + push})`, transformOrigin: '50% 8%' };
};

// `offset` is where this section starts in the take, so the picture runs on without a break.
// `side` moves the presenter right to make room for a list.
export const Presenter = ({ clip, still, side, shot = 'wide', offset = 0 }: { clip?: string; still?: string; side?: boolean; shot?: Shot; offset?: number }) => {
  const framing = useFraming(shot);
  if (!side) return <AbsoluteFill style={{ overflow: 'hidden' }}><AbsoluteFill style={framing}><Picture clip={clip} still={still} offset={offset} /></AbsoluteFill></AbsoluteFill>;
  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '56%', overflow: 'hidden' }}>
      <AbsoluteFill style={framing}><Picture clip={clip} still={still} offset={offset} /></AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${theme.ink} 0%, transparent 30%)` }} />
    </div>
  );
};
