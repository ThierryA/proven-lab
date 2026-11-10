// Makes the presenter clips with HeyGen: a photo of the presenter (presenter.json "photo") speaks each scene's
// narration. HeyGen Voice turns the text into speech, then the Avatar 6 model animates the photo with it.
// Clips go to public/host/<tutorial>/<scene>.mp4; the intro line is made once in public/host/_shared/.
//
//   HEYGEN_API_KEY=... npm run presenter [tutorial-id] [--dry-run] [--force]
//   HEYGEN_API_KEY=... npm run presenter -- --voices        list public voices to choose "voiceId"
//
// A clip is only made again when its text, the photo or the presenter settings change (manifest.json), so a
// re-run costs only what changed. --dry-run lists what would be made. The key comes from the environment only.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, extname } from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const force = args.includes('--force');
const only = args.find((a) => !a.startsWith('--'));
const key = process.env.HEYGEN_API_KEY;
if (!key && !dry) { console.error('Set HEYGEN_API_KEY in your environment (not in a file in this repo). Create one at https://platform.heygen.com/api-keys'); process.exit(1); }

const cfg = JSON.parse(await readFile('presenter.json', 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.heygen.com${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-api-key': key, 'content-type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    if (res.status === 429 && attempt < 6) { await sleep(2000 * 2 ** attempt); continue; }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`HeyGen ${res.status} on ${path}: ${JSON.stringify(json.error || json)}`);
    return json.data;
  }
}

if (args.includes('--voices')) {
  const data = await api('/v3/models/audio/voices?type=public');
  for (const v of data.voices || data) console.log(`${v.voice_id || v.id}  ${v.name}  ${v.gender || ''} ${v.language || ''}`);
  process.exit(0);
}

let photo;
if (!dry) {
  photo = await readFile(cfg.photo).catch(() => null);
  if (!photo) { console.error(`Put the presenter photo at video/${cfg.photo} (see README: Presenter).`); process.exit(1); }
}
const photoHash = photo ? createHash('sha1').update(photo).digest('hex') : 'none';
const mediaType = { '.png': 'image/png', '.webp': 'image/webp' }[extname(cfg.photo).toLowerCase()] || 'image/jpeg';

async function makeClip(text) {
  const speech = await api('/v3/models/audio/tts', { model: cfg.voiceModel, voice_id: cfg.voiceId, text, language: 'en' });
  const { video_id } = await api('/v3/models/avatars', {
    model: cfg.avatarModel,
    reference_images: [{ type: 'base64', media_type: mediaType, data: photo.toString('base64') }],
    audio: { type: 'url', url: speech.audio_url },
    resolution: cfg.resolution,
    motion_prompt: cfg.motionPrompt,
    output_width: 1920,
    output_height: 1080,
  });
  for (;;) {
    await sleep(8000);
    const s = await api(`/v3/models/videos/${video_id}`);
    if (s.status === 'completed') return s;
    if (s.status === 'failed' || s.status === 'cancelled') throw new Error(`HeyGen: ${s.failure_code}: ${s.failure_message}`);
    process.stdout.write('.');
  }
}

// Make every clip in `items` that is missing or out of date, in `dir`.
async function run(dir, label, items) {
  await mkdir(dir, { recursive: true });
  const manifestPath = join(dir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{"scenes":{}}'));
  const settings = { ...cfg, intro: undefined, photoHash };
  const todo = items
    .map((s) => ({ ...s, hash: createHash('sha1').update(JSON.stringify([s.text, settings])).digest('hex') }))
    .filter((s) => force || manifest.scenes[s.id]?.hash !== s.hash);
  const words = todo.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  console.log(`${label}: ${todo.length} clip(s) to make, about ${(words / 150).toFixed(1)} min of video`);
  for (const s of todo) {
    if (dry) { console.log(`  ${s.id}: ${s.text.slice(0, 70)}…`); continue; }
    process.stdout.write(`  ${s.id} `);
    const done = await makeClip(s.text);
    await writeFile(join(dir, `${s.id}.mp4`), Buffer.from(await (await fetch(done.video_url)).arrayBuffer()));
    manifest.scenes[s.id] = { hash: s.hash, duration: done.duration };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(` ${done.duration}s`);
  }
}

await run(join('public', 'host', '_shared'), 'intro', [{ id: 'hello', text: cfg.intro }]);
for (const f of (await readdir('tutorials')).filter((x) => x.endsWith('.json'))) {
  const script = JSON.parse(await readFile(join('tutorials', f), 'utf8'));
  if (only && script.id !== only) continue;
  await run(join('public', 'host', script.id), script.id, script.scenes.map((s) => ({ id: s.id, text: s.narration })));
}
