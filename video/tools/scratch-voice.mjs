// Scratch narration for previews, made with the Mac's built-in voice (`say`): free and offline.
// public/scratch/<episode>/take.wav, used only until the HeyGen take exists.
//   npm run scratch            (SCRATCH_VOICE=Samantha to pick a voice; `say -v '?'` lists them)
// Runs before `npm run studio` and `npm run render`. Elsewhere than macOS it does nothing.
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { estimatedStarts, fullText } from './align.mjs';

if (process.platform !== 'darwin') { console.log('scratch voice: macOS only, skipped'); process.exit(0); }
const voice = process.env.SCRATCH_VOICE;

for (const f of (await readdir('episodes')).filter((x) => x.endsWith('.json'))) {
  const episode = JSON.parse(await readFile(join('episodes', f), 'utf8'));
  const dir = join('public', 'scratch', episode.id);
  await mkdir(dir, { recursive: true });
  const manifestPath = join(dir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'));
  const text = fullText(episode.sections);
  const hash = createHash('sha1').update(JSON.stringify([episode.sections.map((s) => s.text), voice])).digest('hex');
  if (manifest.take?.hash === hash) continue;
  const out = join(dir, 'take.wav');
  execFileSync('say', [...(voice ? ['-v', voice] : []), '-o', out, '--data-format=LEI16@44100', text]);
  const duration = ((await stat(out)).size - 44) / (44100 * 2); // 16-bit mono at 44.1 kHz
  manifest.take = { hash, duration, starts: estimatedStarts(episode.sections, duration) };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`scratch ${out} ${duration.toFixed(1)}s`);
}
