import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import { theme } from './theme';
import type { Scene, TutorialProps } from './types';
import { TitleScene } from './scenes/TitleScene';
import { TerminalScene } from './scenes/TerminalScene';
import { DiagramScene } from './scenes/DiagramScene';
import { CardScene } from './scenes/CardScene';
import { Frame } from './scenes/Frame';
import { Captions } from './scenes/Captions';

const body = (scene: Scene) => {
  switch (scene.type) {
    case 'title': return <TitleScene scene={scene} />;
    case 'terminal': return <TerminalScene scene={scene} />;
    case 'diagram': return <DiagramScene scene={scene} />;
    case 'card': return <CardScene scene={scene} />;
  }
};

export const Tutorial = ({ script, version, timing }: TutorialProps) => (
  <AbsoluteFill style={{ background: theme.ink, color: theme.fg, fontFamily: theme.sans }}>
    <Series>
      {script.scenes.map((scene, i) => {
        const t = timing?.[i] ?? { frames: 150, voice: false };
        return (
          <Series.Sequence key={scene.id} durationInFrames={t.frames} name={scene.id}>
            <Frame label={scene.label} version={version}>{body(scene)}</Frame>
            {t.voice && <Audio src={staticFile(`voice/${script.id}/${scene.id}.mp3`)} />}
            <Captions text={scene.narration} />
          </Series.Sequence>
        );
      })}
    </Series>
  </AbsoluteFill>
);
