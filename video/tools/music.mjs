// Generates an instrumental music bed with ElevenLabs Music: public/music/<name>.mp3 (gitignored).
//   ELEVENLABS_API_KEY=... npm run music [name] [seconds] ["prompt"]
// Defaults: lofi-bed, 150 seconds, a laid-back lo-fi hip-hop beat with no vocals.
// Use a plan whose terms allow commercial use (publishing on YouTube). The key comes from the environment only.
// Or skip this and drop any licensed track at public/music/lofi-bed.mp3 (for example from the YouTube Audio Library).
import { writeFile, mkdir } from 'node:fs/promises';

const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('Set ELEVENLABS_API_KEY in your environment (not in a file in this repo).'); process.exit(1); }
const [name = 'lofi-bed', seconds = '150', prompt =
  'Instrumental lo-fi hip-hop beat, 88 BPM, laid-back West Coast open-world video game vibe: dusty boom-bap drums, ' +
  'warm Rhodes chords, deep round bass, vinyl crackle, subtle funk guitar licks, sunset city cruising mood. ' +
  'Steady groove with no build-ups or drops, mixed to sit under a voice. No vocals.'] = process.argv.slice(2);

const res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
  method: 'POST',
  headers: { 'xi-api-key': key, 'content-type': 'application/json' },
  body: JSON.stringify({ prompt, music_length_ms: Number(seconds) * 1000, model_id: 'music_v2_5', force_instrumental: true }),
});
if (!res.ok) { console.error(`ElevenLabs ${res.status}: ${await res.text()}`); process.exit(1); }
await mkdir('public/music', { recursive: true });
await writeFile(`public/music/${name}.mp3`, Buffer.from(await res.arrayBuffer()));
console.log(`wrote public/music/${name}.mp3`);
