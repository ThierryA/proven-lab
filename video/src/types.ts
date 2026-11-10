export type Line = { kind: 'prompt' | 'out' | 'ok' | 'ask'; text: string };
export type Node = { title: string; sub?: string };

type Base = { id: string; narration: string; label?: string };
export type Scene =
  // The presenter on camera. With `points`, they stand to the right of a short list.
  | (Base & { type: 'host'; points?: string[]; lowerThird?: boolean })
  | (Base & { type: 'title'; kicker?: string; heading: string; sub?: string })
  | (Base & { type: 'terminal'; lines: Line[] })
  | (Base & { type: 'diagram'; nodes: Node[] })
  | (Base & { type: 'card'; heading: string; url: string; sub?: string });

export type TutorialScript = { id: string; series: string; title: string; scenes: Scene[] };

// How a scene is voiced: a presenter clip, or nothing yet (silent, captions only, placeholder presenter).
export type Timing = { frames: number; clip?: string };

export type TutorialProps = {
  script: TutorialScript;
  version: string;
  intro: string;
  timing?: Timing[]; // filled by calculateMetadata, one per scene including the intro
};
