// Renders every episode (or one) to out/<id>.mp4, plus out/<id>.srt subtitles for YouTube.
//   npm run render [episode-id]
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const only = process.argv[2];
const ids = [];
for (const f of (await readdir('tutorials')).filter((x) => x.endsWith('.json'))) {
  const { id } = JSON.parse(await readFile(`tutorials/${f}`, 'utf8'));
  if (!only || id === only) ids.push(id);
}
await mkdir('out', { recursive: true });
const serveUrl = await bundle({ entryPoint: 'src/index.ts' });

// Same sentence timing as the on-screen captions (src/scenes/Captions.tsx).
const sentenceTimes = (text, frames) => {
  const sentences = text.match(/[^]+?[.!?]+(?=\s|$)/g)?.map((s) => s.trim()) ?? [text];
  const total = sentences.reduce((n, s) => n + s.length, 0);
  let start = 0;
  return sentences.map((s) => { const b = start; start += (s.length / total) * (frames - 20); return { text: s, start: b, end: start }; });
};
const ts = (sec) => {
  const ms = Math.round(sec * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id });
  const { script, intro, timing, take } = composition.props;
  const srt = [];
  let n = 0;
  if (script.take === 'single') {
    // From the word timings when the take exists: lines of up to 8 words, broken after punctuation.
    const words = take?.words ?? [];
    let line = [];
    const flush = () => { if (line.length) srt.push(`${++n}\n${ts(line[0].start_time)} --> ${ts(line[line.length - 1].end_time)}\n${line.map((w) => w.text).join(' ')}\n`); line = []; };
    const spoken = script.sections.map((s) => s.text).join(' ').split(/\s+/);
    // Use the script's own words (with punctuation) mapped onto the timed words when the counts line up.
    const sameCount = spoken.length === words.length;
    words.forEach((w, i) => {
      line.push(sameCount ? { ...w, text: spoken[i] } : w);
      if (line.length >= 8 || /[.!?,:]$/.test(line[line.length - 1].text) && line.length >= 4) flush();
    });
    flush();
  } else {
    const scenes = [{ narration: intro }, ...script.scenes];
    let offset = 0;
    scenes.forEach((s, i) => {
      for (const part of sentenceTimes(s.narration, timing[i].frames)) {
        srt.push(`${++n}\n${ts((offset + part.start) / composition.fps)} --> ${ts((offset + part.end) / composition.fps)}\n${part.text}\n`);
      }
      offset += timing[i].frames;
    });
  }
  await writeFile(`out/${id}.srt`, srt.join('\n'));
  console.log(`${id}: rendering ${(composition.durationInFrames / composition.fps).toFixed(1)}s`);
  await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: `out/${id}.mp4` });
  console.log(`  out/${id}.mp4, out/${id}.srt`);
}
