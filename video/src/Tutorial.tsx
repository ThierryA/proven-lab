import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import { theme } from './theme';
import type { Scene, Timing, TutorialProps, TutorialScript } from './types';
import { TitleScene } from './scenes/TitleScene';
import { TerminalScene } from './scenes/TerminalScene';
import { DiagramScene } from './scenes/DiagramScene';
import { CardScene } from './scenes/CardScene';
import { HostScene } from './scenes/HostScene';
import { Presenter } from './scenes/Presenter';
import { Frame } from './scenes/Frame';
import { Captions } from './scenes/Captions';

// Every episode opens with the presenter's intro line (presenter.json "intro").
export const withIntro = (script: TutorialScript, intro: string): Scene[] => [
  { id: 'hello', type: 'host', narration: intro },
  ...script.scenes,
];

const screen = (scene: Scene) => {
  switch (scene.type) {
    case 'title': return <TitleScene scene={scene} />;
    case 'terminal': return <TerminalScene scene={scene} />;
    case 'diagram': return <DiagramScene scene={scene} />;
    case 'card': return <CardScene scene={scene} />;
    default: return null;
  }
};

export const Tutorial = ({ script, version, intro, timing }: TutorialProps) => (
  <AbsoluteFill style={{ background: theme.ink, color: theme.fg, fontFamily: theme.sans }}>
    <Series>
      {withIntro(script, intro).map((scene, i) => {
        const t: Timing = timing?.[i] ?? { frames: 120 };
        return (
          <Series.Sequence key={scene.id} durationInFrames={t.frames} name={scene.id}>
            {scene.type === 'host' ? (
              <HostScene scene={scene} clip={t.clip} series={script.series} title={script.title} version={version} />
            ) : (
              <>
                <Frame label={scene.label} version={version} inset>{screen(scene)}</Frame>
                <Presenter clip={t.clip} variant="corner" />
              </>
            )}
            {t.scratch && <Audio src={staticFile(t.scratch)} />}
            <Captions text={scene.narration} inset={scene.type !== 'host'} />
          </Series.Sequence>
        );
      })}
    </Series>
  </AbsoluteFill>
);
