// The AI presenter, made with HeyGen. Two steps:
//
// 1. Studio (once):  HEYGEN_API_KEY=... npm run presenter -- --studio
//    HeyGen Image puts you in the studio: your photos ("identity") keep your face, and each camera's reference
//    shot ("cameras": one person in the studio set, any person) gives the setting, pose, clothes and light.
//    Writes presenter/cam-<camera>.jpg, and a copy in public/host/_shared/ for previews.
//    No cameras? Your first identity photo is used as it is.
//
// 2. Clips:  HEYGEN_API_KEY=... npm run presenter [episode-id] [--dry-run] [--force]
//    HeyGen Voice speaks each scene's narration, then Avatar 6 animates that scene's camera portrait with it.
//    public/host/<episode>/<scene>.mp4; the intro line once in public/host/_shared/.
//
//    npm run presenter -- --voices     list public voices for "voiceId" (or use your own voice clone)
//
// Everything is cached (manifest.json): only what changed is generated again. The key comes from the environment.
import { readFile, writeFile, mkdir, readdir, copyFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, extname } from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const force = args.includes('--force');
const only = args.find((a) => !a.startsWith('--'));
const key = process.env.HEYGEN_API_KEY;
if (!key && !dry) { console.error('Set HEYGEN_API_KEY in your environment (not in a file in this repo). Create one at https://platform.heygen.com/api-keys'); process.exit(1); }

const cfg = JSON.parse(await readFile('presenter.json', 'utf8'));
const identity = cfg.identity || [cfg.photo];
const cameras = cfg.cameras || {};
const SHARED = join('public', 'host', '_shared');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (x) => createHash('sha1').update(x).digest('hex');
const exists = (p) => access(p).then(() => true, () => false);
const mediaType = (p) => ({ '.png': 'image/png', '.webp': 'image/webp' }[extname(p).toLowerCase()] || 'image/jpeg');
const b64 = async (p) => ({ type: 'base64', media_type: mediaType(p), data: (await readFile(p)).toString('base64') });

async function api(path, body, headers = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.heygen.com${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-api-key': key, 'content-type': 'application/json', ...headers },
      body: body && JSON.stringify(body),
    });
    if ((res.status === 429 || res.status === 503) && attempt < 6) { await sleep(2000 * 2 ** attempt); continue; }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`HeyGen ${res.status} on ${path}: ${JSON.stringify(json.error || json)}`);
    return json.data;
  }
}
const poll = async (path) => {
  for (;;) {
    await sleep(6000);
    const s = await api(path);
    if (s.status === 'completed') return s;
    if (s.status === 'failed' || s.status === 'cancelled') throw new Error(`HeyGen: ${s.failure_code}: ${s.failure_message}`);
    process.stdout.write('.');
  }
};
const download = async (url, to) => writeFile(to, Buffer.from(await (await fetch(url)).arrayBuffer()));
const manifestOf = async (dir) => JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8').catch(() => '{"scenes":{},"stills":{}}'));
const saveManifest = (dir, m) => writeFile(join(dir, 'manifest.json'), JSON.stringify(m, null, 2));

if (args.includes('--voices')) {
  const data = await api('/v3/models/audio/voices?type=public');
  for (const v of data.voices || data) console.log(`${v.voice_id || v.id}  ${v.name}  ${v.gender || ''} ${v.language || ''}`);
  process.exit(0);
}

// The portrait each camera uses: the studio image if made, else the first identity photo.
const portrait = async (cam) => ((await exists(`presenter/cam-${cam}.jpg`)) ? `presenter/cam-${cam}.jpg` : identity[0]);

await mkdir(SHARED, { recursive: true });

if (args.includes('--studio')) {
  const missing = [];
  for (const p of [...identity, ...Object.values(cameras)]) if (!(await exists(p))) missing.push(p);
  if (missing.length) { console.error(`Missing: ${missing.map((p) => `video/${p}`).join(', ')} (README: Presenter).`); process.exit(1); }
  const shared = await manifestOf(SHARED);
  const ids = await Promise.all(identity.map(b64));
  for (const [cam, ref] of Object.entries(cameras)) {
    const hash = sha(JSON.stringify([...(await Promise.all(identity.map((p) => readFile(p)))).map(sha), sha(await readFile(ref))]));
    if (!force && shared.stills[cam]?.hash === hash && (await exists(`presenter/cam-${cam}.jpg`))) { console.log(`camera ${cam}: up to date`); continue; }
    if (dry) { console.log(`camera ${cam}: would generate from ${ref}`); continue; }
    process.stdout.write(`camera ${cam} `);
    const { generation_id } = await api('/v3/models/images', {
      model: 'heygen-image-1', identity_images: ids, reference_images: [await b64(ref)], aspect_ratio: '16:9', num_images: 1,
    }, { 'Idempotency-Key': `provenlab-cam-${cam}-${hash.slice(0, 16)}` });
    const done = await poll(`/v3/models/images/${generation_id}`);
    const png = `presenter/cam-${cam}.png`;
    await download(done.images[0].image_url, png);
    // A 1920-wide JPEG keeps uploads small; on macOS `sips` converts it, elsewhere the PNG is kept as is.
    try { execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', '1920', png, '--out', `presenter/cam-${cam}.jpg`], { stdio: 'ignore' }); }
    catch { await copyFile(png, `presenter/cam-${cam}.jpg`); }
    await copyFile(`presenter/cam-${cam}.jpg`, join(SHARED, `cam-${cam}.jpg`));
    shared.stills[cam] = { hash, file: `host/_shared/cam-${cam}.jpg` };
    await saveManifest(SHARED, shared);
    console.log(' done: open video/presenter/cam-' + cam + '.jpg to check it');
  }
  process.exit(0);
}

async function makeClip(text, image) {
  const speech = await api('/v3/models/audio/tts', { model: cfg.voiceModel, voice_id: cfg.voiceId, text, language: 'en' });
  const { video_id } = await api('/v3/models/avatars', {
    model: cfg.avatarModel,
    reference_images: [await b64(image)],
    audio: { type: 'url', url: speech.audio_url },
    resolution: cfg.resolution,
    motion_prompt: cfg.motionPrompt,
    output_width: 1920,
    output_height: 1080,
  });
  return poll(`/v3/models/videos/${video_id}`);
}

async function run(dir, label, items) {
  await mkdir(dir, { recursive: true });
  const manifest = await manifestOf(dir);
  const settings = { voiceId: cfg.voiceId, voiceModel: cfg.voiceModel, avatarModel: cfg.avatarModel, resolution: cfg.resolution, motionPrompt: cfg.motionPrompt };
  const todo = [];
  for (const s of items) {
    const image = await portrait(s.camera);
    const imageHash = (await exists(image)) ? sha(await readFile(image)) : 'missing';
    const hash = sha(JSON.stringify([s.text, settings, imageHash]));
    if (force || manifest.scenes[s.id]?.hash !== hash) todo.push({ ...s, image, hash });
  }
  const words = todo.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  console.log(`${label}: ${todo.length} clip(s) to make, about ${(words / 150).toFixed(1)} min of video`);
  for (const s of todo) {
    if (dry) { console.log(`  ${s.id} (camera ${s.camera}): ${s.text.slice(0, 64)}…`); continue; }
    if (!(await exists(s.image))) { console.error(`Missing presenter image video/${s.image} (README: Presenter).`); process.exit(1); }
    process.stdout.write(`  ${s.id} `);
    const done = await makeClip(s.text, s.image);
    await download(done.video_url, join(dir, `${s.id}.mp4`));
    manifest.scenes[s.id] = { hash: s.hash, duration: done.duration };
    await saveManifest(dir, manifest);
    console.log(` ${done.duration}s`);
  }
}

await run(SHARED, 'intro', [{ id: 'hello', text: cfg.intro, camera: 'a' }]);
for (const f of (await readdir('tutorials')).filter((x) => x.endsWith('.json'))) {
  const script = JSON.parse(await readFile(join('tutorials', f), 'utf8'));
  if (only && script.id !== only) continue;
  await run(join('public', 'host', script.id), script.id,
    script.scenes.map((s) => ({ id: s.id, text: s.narration, camera: s.camera || 'a' })));
}
