import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';
import { enter } from './anim';
import { Presenter } from './Presenter';
import type { Scene } from '../types';

type Props = { scene: Extract<Scene, { type: 'host' }>; clip?: string; still?: string; series: string; title: string; version: string };

// The presenter on camera: full frame, or beside a short list of points.
export const HostScene = ({ scene, clip, still, series, title, version }: Props) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const points = scene.points ?? [];
  return (
    <AbsoluteFill>
      <Presenter clip={clip} still={still} variant={points.length ? 'side' : 'full'} shot={scene.shot} />
      {/* Studio grade: a soft vignette so text reads over any set. */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.45) 100%)' }} />
      <div style={{ position: 'absolute', top: 56, left: 96, fontFamily: theme.mono, fontSize: 26, color: theme.fg, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
        <span style={{ color: theme.signal }}>■</span> Proven Lab
      </div>
      <div style={{ position: 'absolute', top: 56, right: 96, fontFamily: theme.mono, fontSize: 26, color: theme.fg3 }}>v{version}</div>

      {points.length > 0 && <Points points={points} />}

      {scene.callout && <Callout text={scene.callout} />}
      {scene.lowerThird && <LowerThird series={series} title={title} />}
    </AbsoluteFill>
  );
};

// Series and episode name, in for a few seconds at the start of the scene.
export const LowerThird = ({ series, title }: { series: string; title: string }) => {
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

// A short line typed into a small terminal in the bottom right: in for about four seconds, then gone.
export const Callout = ({ text }: { text: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = 12;
  const typed = Math.floor(interpolate(frame, [start + 6, start + 6 + text.length * 0.9], [0, text.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const life = fps * 4.2;
  const opacity = interpolate(frame, [start, start + 6, start + life - 8, start + life], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rise = interpolate(frame, [start, start + 8], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cursor = Math.floor(frame / (fps / 2)) % 2 === 0;
  return (
    <div style={{ position: 'absolute', right: 72, bottom: 72, maxWidth: 760, opacity, transform: `translateY(${rise}px)` }}>
      <div style={{ background: 'rgba(11,11,12,0.86)', border: `1px solid ${theme.line2}`, borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.45)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${theme.line}` }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 10, height: 10, borderRadius: 5, background: theme.line2 }} />)}
        </div>
        <div style={{ padding: '14px 22px 16px', fontFamily: theme.mono, fontSize: 30, lineHeight: 1.35, color: theme.fg, whiteSpace: 'pre-wrap' }}>
          <span style={{ color: theme.signal }}>$ </span>
          {text.slice(0, typed)}
          <span style={{ display: 'inline-block', width: '0.6ch', height: '1.05em', verticalAlign: 'text-bottom', marginLeft: 2, background: cursor ? theme.signal : 'transparent' }} />
        </div>
      </div>
    </div>
  );
};

// A numbered list on the left, each point in turn across the scene.
export const Points = ({ points }: { points: string[] }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', left: 96, top: 0, bottom: 0, width: '44%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 36 }}>
      {points.map((p, i) => (
        <div key={i} style={{ ...enter(frame, fps, 10 + (i * (durationInFrames - 40)) / points.length), display: 'flex', gap: 24, fontSize: 52, fontWeight: 500, lineHeight: 1.2 }}>
          <span style={{ color: theme.signal, fontFamily: theme.mono }}>{String(i + 1).padStart(2, '0')}</span>
          <span>{p}</span>
        </div>
      ))}
    </div>
  );
};
