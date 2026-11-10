// An episode is one continuous take: the presenter speaks every section in one clip, and the edit
// (framing, callouts, points, lower third) follows the timing of the words.
// What the screen shows in a screen-share section: a recording (public/screens/, muted), an image, or a
// replayed session (lines appear in step with the section: `user` is typed, the others print).
export type ScreenLine = { kind: 'user' | 'agent' | 'ask' | 'ok' | 'code' | 'file'; text: string };
export type Screen = { title?: string; video?: string; image?: string; lines?: ScreenLine[] };

export type Section = {
  id: string;
  text: string;
  // Studio (the presenter full frame, the default) or screen share (the screen, with the presenter on the side).
  screen?: Screen;
  chapter?: string;
  shot?: 'wide' | 'close';
  callout?: string;
  points?: string[];
  lowerThird?: boolean;
};
export type Music = { file: string; volume?: number; underVoice?: number };
export type Episode = {
  id: string;
  series: string;
  title: string;
  camera?: string;
  music?: Music;
  // YouTube thumbnail: a frame of the take (seconds) and a bold title in two or three short lines.
  thumbnail?: { at: number; lines: string[] };
  sections: Section[];
};
export type Word = { text: string; start_time: number; end_time: number };
export type EpisodeProps = {
  episode: Episode;
  version: string;
  // Filled by calculateMetadata.
  take?: { clip?: string; scratch?: string; still?: string; duration: number; starts: number[]; words?: Word[]; music?: string };
};
