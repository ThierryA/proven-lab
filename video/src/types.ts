export type Line = { kind: 'prompt' | 'out' | 'ok' | 'ask'; text: string };
export type Node = { title: string; sub?: string };

type Base = { id: string; narration: string; label?: string };
export type Scene =
  // The presenter on camera, in the studio. `camera` picks the studio angle (presenter.json "cameras"),
  // `shot` a wide or close framing, `callout` a short line that pops in beside them,
  // `points` a numbered list with the presenter to the right.
  | (Base & { type: 'host'; camera?: string; shot?: 'wide' | 'close'; callout?: string; points?: string[]; lowerThird?: boolean })
  | (Base & { type: 'title'; kicker?: string; heading: string; sub?: string })
  | (Base & { type: 'terminal'; lines: Line[] })
  | (Base & { type: 'diagram'; nodes: Node[] })
  | (Base & { type: 'card'; heading: string; url: string; sub?: string });

// `captions: false` keeps subtitles off the picture (studio style); every render also writes out/<id>.srt.
export type TutorialScript = { id: string; series: string; title: string; captions?: boolean; scenes: Scene[] };

// How a scene is voiced: a HeyGen presenter clip, else scratch narration (placeholder presenter), else silent.
export type Timing = { frames: number; clip?: string; scratch?: string; still?: string };

export type TutorialProps = {
  script: TutorialScript;
  version: string;
  intro: string;
  stills?: Record<string, string>; // studio portraits per camera, shown until the clips exist
  timing?: Timing[]; // filled by calculateMetadata, one per scene including the intro
};

// One continuous take: the presenter speaks every section in one clip, and the edit (shots, callouts,
// points, lower third) follows the timing of the words.
export type Section = {
  id: string;
  text: string;
  shot?: 'wide' | 'close';
  callout?: string;
  points?: string[];
  lowerThird?: boolean;
};
export type Music = { file: string; volume?: number; underVoice?: number };
export type TakeScript = {
  id: string;
  take: 'single';
  series: string;
  title: string;
  camera?: string;
  music?: Music;
  // YouTube thumbnail: a frame of the take (seconds) and a bold title in two or three short lines.
  thumbnail?: { at: number; lines: string[] };
  sections: Section[];
};
export type Word = { text: string; start_time: number; end_time: number };
export type TakeProps = {
  script: TakeScript;
  version: string;
  // Filled by calculateMetadata.
  take?: { clip?: string; scratch?: string; still?: string; duration: number; starts: number[]; words?: Word[]; music?: string };
};
