// An episode is one continuous take: the presenter speaks every section in one clip, and the edit
// (framing, callouts, points, lower third) follows the timing of the words.
export type Section = {
  id: string;
  text: string;
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
