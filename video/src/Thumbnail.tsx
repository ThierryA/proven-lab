import { AbsoluteFill, Img, staticFile } from 'remotion';
import { theme } from './theme';

// The YouTube thumbnail: the presenter on the right, a bold title on the left, Proven Lab's colors.
export const Thumbnail = ({ frame, lines, series }: { frame: string; lines: string[]; series: string }) => (
  <AbsoluteFill style={{ background: theme.ink, fontFamily: theme.sans }}>
    <Img src={staticFile(frame)} style={{ position: 'absolute', right: -160, top: 0, height: '100%', width: 'auto', transform: 'scale(1.35)', transformOrigin: '60% 18%' }} />
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${theme.ink} 30%, rgba(11,11,12,0.75) 52%, transparent 75%)` }} />
    <div style={{ position: 'absolute', left: 72, top: 0, bottom: 0, width: 760, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ fontFamily: theme.mono, fontSize: 34, color: theme.signal }}>
        <span>■</span> Proven Lab · {series}
      </div>
      <div style={{ marginTop: 28, fontSize: 112, fontWeight: 500, lineHeight: 1.0, letterSpacing: '-0.035em', color: theme.fg }}>
        {lines.map((l, i) => <div key={i} style={{ color: i === lines.length - 1 ? theme.signal : theme.fg }}>{l}</div>)}
      </div>
    </div>
  </AbsoluteFill>
);
