import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { enter } from './anim';
import { Presenter } from './Presenter';
import type { Scene } from '../types';

type Props = { scene: Extract<Scene, { type: 'host' }>; clip?: string; series: string; title: string; version: string };

// The presenter on camera: full frame, or beside a short list of points.
export const HostScene = ({ scene, clip, series, title, version }: Props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const points = scene.points ?? [];
  return (
    <AbsoluteFill>
      <Presenter clip={clip} variant={points.length ? 'side' : 'full'} />
      <div style={{ position: 'absolute', top: 56, left: 96, fontFamily: theme.mono, fontSize: 26, color: theme.fg, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
        <span style={{ color: theme.signal }}>■</span> Proven Lab
      </div>
      <div style={{ position: 'absolute', top: 56, right: 96, fontFamily: theme.mono, fontSize: 26, color: theme.fg3 }}>v{version}</div>

      {points.length > 0 && (
        <div style={{ position: 'absolute', left: 96, top: 0, bottom: 0, width: '44%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 36 }}>
          {points.map((p, i) => (
            <div key={i} style={{ ...enter(frame, fps, 10 + (i * (durationInFrames - 40)) / points.length), display: 'flex', gap: 24, fontSize: 52, fontWeight: 500, lineHeight: 1.2 }}>
              <span style={{ color: theme.signal, fontFamily: theme.mono }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}

      {scene.lowerThird && <LowerThird series={series} title={title} />}
    </AbsoluteFill>
  );
};

// Series and episode name, in for a few seconds at the start of the scene.
const LowerThird = ({ series, title }: { series: string; title: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = interpolate(frame, [fps * 5, fps * 5.5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const a = enter(frame, fps, 8);
  return (
    <div style={{ position: 'absolute', left: 96, bottom: 250, opacity: a.opacity * out, transform: a.transform, display: 'flex', alignItems: 'stretch' }}>
      <div style={{ width: 10, background: theme.signal }} />
      <div style={{ background: 'rgba(11,11,12,0.88)', padding: '20px 32px' }}>
        <div style={{ fontFamily: theme.mono, fontSize: 26, color: theme.signal }}>{series}</div>
        <div style={{ fontSize: 48, fontWeight: 500, marginTop: 6 }}>{title}</div>
      </div>
    </div>
  );
};
