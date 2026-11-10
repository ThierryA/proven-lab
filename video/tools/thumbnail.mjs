// Episode thumbnails: out/<id>-thumbnail.jpg (YouTube, 1280x720) and out/<id>-card.jpg (site card).
//   npm run thumbnail [episode-id]      needs the take (npm run presenter) and ffmpeg
import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const only = process.argv[2];
const ffmpeg = (args) => execFileSync('npx', ['remotion', 'ffmpeg', '-v', 'error', '-y', ...args], { stdio: 'inherit' });
for (const f of (await readdir('episodes')).filter((x) => x.endsWith('.json'))) {
  const s = JSON.parse(await readFile(`episodes/${f}`, 'utf8'));
  if (!s.thumbnail || (only && s.id !== only)) continue;
  const take = `public/host/${s.id}/take.mp4`;
  ffmpeg(['-ss', String(s.thumbnail.at), '-i', take, '-frames:v', '1', '-q:v', '2', `public/host/${s.id}/frame.jpg`]);
  execFileSync('npx', ['remotion', 'still', 'src/index.ts', `${s.id}-thumbnail`, `out/${s.id}-thumbnail.jpg`, '--image-format=jpeg', '--jpeg-quality=90'], { stdio: 'inherit' });
  // Site card: the same frame, centered on the presenter, small and light.
  ffmpeg(['-i', `public/host/${s.id}/frame.jpg`, '-vf', 'crop=iw*0.62:ih*0.62:iw*0.26:ih*0.04,scale=640:-2', '-q:v', '4', `out/${s.id}-card.jpg`]);
  console.log(`out/${s.id}-thumbnail.jpg, out/${s.id}-card.jpg`);
}
