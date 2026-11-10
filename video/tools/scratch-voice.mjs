// Scratch narration for previews, made with the Mac's built-in voice (`say`): free and offline.
// public/scratch/<tutorial>/<scene>.wav, used only for scenes without a HeyGen presenter clip.
//   npm run scratch            (SCRATCH_VOICE=Samantha to pick a voice; `say -v '?'` lists them)
// Runs before `npm run studio` and `npm run render`. Elsewhere than macOS it does nothing.
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

if (process.platform !== 'darwin') { console.log('scratch voice: macOS only, skipped'); process.exit(0); }
const voice = process.env.SCRATCH_VOICE;
const cfg = JSON.parse(await readFile('presenter.json', 'utf8'));

async function run(dir, items) {
  await mkdir(dir, { recursive: true });
  const manifestPath = join(dir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{"scenes":{}}'));
  for (const { id, text } of items) {
    const hash = createHash('sha1').update(JSON.stringify([text, voice])).digest('hex');
    if (manifest.scenes[id]?.hash === hash) continue;
    const out = join(dir, `${id}.wav`);
    execFileSync('say', [...(voice ? ['-v', voice] : []), '-o', out, '--data-format=LEI16@44100', text]);
    // 16-bit mono at 44.1 kHz after a 44-byte header (close enough for timing).
    const duration = ((await stat(out)).size - 44) / (44100 * 2);
    manifest.scenes[id] = { hash, duration };
    console.log(`scratch ${out} ${duration.toFixed(1)}s`);
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

await run(join('public', 'scratch', '_shared'), [{ id: 'hello', text: cfg.intro }]);
for (const f of (await readdir('tutorials')).filter((x) => x.endsWith('.json'))) {
  const script = JSON.parse(await readFile(join('tutorials', f), 'utf8'));
  await run(join('public', 'scratch', script.id), script.scenes.map((s) => ({ id: s.id, text: s.narration })));
}
