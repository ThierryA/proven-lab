// Generates the narration with ElevenLabs: public/voice/<tutorial>/<scene>.mp3 (gitignored).
//   ELEVENLABS_API_KEY=... npm run voice [tutorial-id] [--force]
// Optional: ELEVENLABS_VOICE_ID (default: a neutral stock voice), ELEVENLABS_MODEL (default eleven_multilingual_v2).
// The key comes from the environment only; never write it to a file in this repo.
import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';

const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('Set ELEVENLABS_API_KEY in your environment (not in a file in this repo).'); process.exit(1); }
const voice = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.find((a) => !a.startsWith('--'));

const files = (await readdir('tutorials')).filter((f) => f.endsWith('.json'));
for (const f of files) {
  const script = JSON.parse(await readFile(join('tutorials', f), 'utf8'));
  if (only && script.id !== only) continue;
  const dir = join('public', 'voice', script.id);
  await mkdir(dir, { recursive: true });
  let previous = '';
  for (const scene of script.scenes) {
    const out = join(dir, `${scene.id}.mp3`);
    const exists = await access(out).then(() => true, () => false);
    if (exists && !force) { console.log(`skip ${out} (exists; --force to redo)`); previous = scene.narration; continue; }
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      // previous_text keeps the delivery consistent from one scene to the next.
      body: JSON.stringify({ text: scene.narration, model_id: model, previous_text: previous || undefined }),
    });
    if (!res.ok) { console.error(`ElevenLabs ${res.status}: ${await res.text()}`); process.exit(1); }
    await writeFile(out, Buffer.from(await res.arrayBuffer()));
    console.log(`wrote ${out}`);
    previous = scene.narration;
  }
}
