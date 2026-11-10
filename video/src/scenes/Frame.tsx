import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { theme } from '../theme';

// The chrome around every scene: wordmark, section label, version, subtle grid.
export const Frame = ({ label, version, children }: { label?: string; version: string; children: ReactNode }) => (
  <AbsoluteFill
    style={{
      backgroundImage: `linear-gradient(${theme.ink2} 1px, transparent 1px), linear-gradient(90deg, ${theme.ink2} 1px, transparent 1px)`,
      backgroundSize: '80px 80px',
    }}
  >
    <div style={{ position: 'absolute', top: 56, left: 96, right: 96, display: 'flex', justifyContent: 'space-between', fontFamily: theme.mono, fontSize: 26, color: theme.fg3 }}>
      <span>
        <span style={{ color: theme.signal }}>■</span> <span style={{ color: theme.fg }}>Proven Lab</span>
        {label && <span style={{ marginLeft: 32 }}>{label}</span>}
      </span>
      <span>v{version}</span>
    </div>
    <AbsoluteFill style={{ padding: '150px 96px 220px', justifyContent: 'center' }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);
