export type Line = { kind: 'prompt' | 'out' | 'ok' | 'ask'; text: string };
export type Node = { title: string; sub?: string };

type Base = { id: string; narration: string; label?: string };
export type Scene =
  | (Base & { type: 'title'; kicker?: string; heading: string; sub?: string })
  | (Base & { type: 'terminal'; lines: Line[] })
  | (Base & { type: 'diagram'; nodes: Node[] })
  | (Base & { type: 'card'; heading: string; url: string; sub?: string });

export type TutorialScript = { id: string; title: string; scenes: Scene[] };

export type TutorialProps = {
  script: TutorialScript;
  version: string;
  // Filled by calculateMetadata: frames per scene, and whether a voice file exists.
  timing?: { frames: number; voice: boolean }[];
};
