// Renders every episode (or one) to out/<id>.mp4, plus out/<id>.srt subtitles for YouTube (from the word timings).
//   npm run render [episode-id]
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const only = process.argv[2];
const ids = [];
for (const f of (await readdir('episodes')).filter((x) => x.endsWith('.json'))) {
  const { id } = JSON.parse(await readFile(`episodes/${f}`, 'utf8'));
  if (!only || id === only) ids.push(id);
}
await mkdir('out', { recursive: true });
const serveUrl = await bundle({ entryPoint: 'src/index.ts' });

const ts = (sec) => {
  const ms = Math.round(sec * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id });
  const { episode: script, take } = composition.props;
  const srt = [];
  let n = 0;
  {
    // From the word timings when the take exists: lines of up to 8 words, broken after punctuation.
    const words = take?.words ?? [];
    // The script's own spelling and punctuation, split the way HeyGen splits words ("battle-tested" is two),
    // so each timed word gets its written form back; pieces of one written word are joined without a space.
    const pieces = [];
    for (const word of script.sections.map((x) => x.text).join(' ').split(/\s+/)) {
      const parts = word.match(/[^\p{L}\p{N}'’]*[\p{L}\p{N}'’]+[^\p{L}\p{N}'’]*/gu) || [word];
      parts.forEach((p, k) => pieces.push({ text: p, joinNext: k < parts.length - 1 }));
    }
    // Match each timed word to the script pieces it covers ("lab.com" is one timed word, two pieces).
    const norm = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}'’]/gu, '');
    let p = 0;
    const written = words.map((w) => {
      const target = norm(w.text);
      let acc = '', from = p, text = '';
      while (p < pieces.length && acc.length < target.length) { acc += norm(pieces[p].text); p++; }
      if (acc !== target) { p = from; return { ...w, joinNext: false }; } // out of step: keep HeyGen's word
      for (let k = from; k < p; k++) text += pieces[k].text;
      return { ...w, text, joinNext: pieces[p - 1].joinNext };
    });
    const text = (line) => line.map((w, k) => w.text + (k < line.length - 1 && !w.joinNext ? ' ' : '')).join('');
    let line = [];
    const flush = () => { if (line.length) srt.push(`${++n}\n${ts(line[0].start_time)} --> ${ts(line[line.length - 1].end_time)}\n${text(line)}\n`); line = []; };
    words.forEach((w, i) => {
      line.push(written[i]);
      const last = line[line.length - 1];
      if (!last.joinNext && (line.length >= 8 || (/[.!?,:]$/.test(last.text) && line.length >= 4))) flush();
    });
    flush();
  }
  await writeFile(`out/${id}.srt`, srt.join('\n'));
  console.log(`${id}: rendering ${(composition.durationInFrames / composition.fps).toFixed(1)}s`);
  await renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: `out/${id}.mp4` });
  console.log(`  out/${id}.mp4, out/${id}.srt`);
}
