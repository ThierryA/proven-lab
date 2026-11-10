// The presenter take, made with HeyGen from your digital twin. For each episode:
//   1. HeyGen Voice speaks the whole script in your cloned voice and returns the timing of every word.
//   2. Avatar 6 lip-syncs that audio with your look in one continuous clip: public/host/<episode>/take.mp4.
// The word timings drive the edit (src/Episode.tsx) and the subtitles (tools/render.mjs).
//
//   HEYGEN_API_KEY=... npm run presenter [episode-id] [--dry-run] [--force]
//   HEYGEN_API_KEY=... npm run presenter -- --twin-info     your looks and voices, for presenter.json
//   HEYGEN_API_KEY=... npm run presenter -- --consent       record consent for your twin (once, required by HeyGen)
//
// presenter.json: "twin.cameras.a" is the look (setting and outfit), "twin.motionFrom" your recorded twin look whose
// footage drives the motion, "twin.voiceId" your cloned voice. A take is only made again when its text or these
// settings change (manifest.json); --dry-run shows the minutes first. The key comes from the environment only.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { sectionStarts, fullText } from './align.mjs';

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const force = args.includes('--force');
const only = args.find((a) => !a.startsWith('--'));
const key = process.env.HEYGEN_API_KEY;
if (!key && !dry) { console.error('Set HEYGEN_API_KEY in your environment (not in a file in this repo). Create one at https://platform.heygen.com/api-keys'); process.exit(1); }

const cfg = JSON.parse(await readFile('presenter.json', 'utf8'));
const twin = cfg.twin;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (x) => createHash('sha1').update(x).digest('hex');
const list = (res) => (Array.isArray(res) ? res : res.data || res.voices || []);

async function api(path, body, meta) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.heygen.com${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-api-key': key, 'content-type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    if (meta) meta.requestId = res.headers.get('x-request-id');
    if ((res.status === 429 || res.status === 503) && attempt < 6) { await sleep(2000 * 2 ** attempt); continue; }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`HeyGen ${res.status} on ${path}: ${JSON.stringify(json.error || json)}`);
    return json.data;
  }
}
const poll = async (path) => {
  for (;;) {
    await sleep(8000);
    const s = await api(path);
    if (s.status === 'completed') return s;
    if (s.status === 'failed' || s.status === 'cancelled') throw new Error(`HeyGen: ${s.failure_code}: ${s.failure_message}`);
    process.stdout.write('.');
  }
};
const download = async (url, to) => writeFile(to, Buffer.from(await (await fetch(url)).arrayBuffer()));
const probe = (file) => {
  try { return Number(execFileSync('npx', ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim()); }
  catch { return undefined; }
};

if (args.includes('--twin-info')) {
  console.log('Looks (twin.cameras.a; your recorded digital_twin look is twin.motionFrom):');
  for (const l of list(await api('/v3/avatars/looks?ownership=private'))) console.log(`  ${l.id}  ${l.name}  (${l.avatar_type})`);
  console.log('Your voices (twin.voiceId):');
  for (const v of list(await api('/v3/models/audio/voices?type=private'))) console.log(`  ${v.voice_id}  ${v.name}`);
  process.exit(0);
}

if (args.includes('--consent')) {
  const ids = [...Object.values(twin.cameras), twin.motionFrom];
  const groups = [...new Set(list(await api('/v3/avatars/looks?ownership=private')).filter((l) => ids.includes(l.id)).map((l) => l.group_id))];
  for (const g of groups) {
    if ((await api(`/v3/avatars/${g}`)).consent_status === 'accepted') { console.log(`${g}: consent accepted`); continue; }
    console.log(`${g}: record your consent here (link valid 24 hours):\n  ${(await api(`/v3/avatars/${g}/consent`, {})).url}`);
  }
  process.exit(0);
}

// Your cloned voice with word timings. The free model first; the paid one if the free one is busy or refuses.
async function speakPart(text, previous) {
  const body = { voice_id: twin.voiceId, text, language: 'en', with_timestamps: true, ...(previous ? { previous_request_ids: [previous] } : {}) };
  for (const model of [cfg.voiceModel, 'heygen-voice-1']) {
    const meta = {};
    try { return { ...(await api('/v3/models/audio/tts', { ...body, model }, meta)), requestId: meta.requestId, model }; }
    catch (e) { if (model === 'heygen-voice-1') throw e; console.log(`\n  (${model}: ${e.message.slice(0, 120)}; trying heygen-voice-1)`); }
  }
}

// HeyGen Voice takes up to 5,000 characters per request. Longer scripts are spoken in parts at section
// boundaries (each part continues from the previous one for a consistent delivery), joined with a short pause,
// and uploaded as one audio file. Word timings are shifted to match.
const PART_LIMIT = 4500;
const PAUSE = 0.35;
async function speak(sections, dir) {
  const parts = [];
  for (const s of sections) {
    const last = parts[parts.length - 1];
    if (last && (last + ' ' + s.text).length <= PART_LIMIT) parts[parts.length - 1] = last + ' ' + s.text;
    else parts.push(s.text);
  }
  if (parts.length === 1) { const r = await speakPart(parts[0]); return { audio_url: r.audio_url, duration: r.duration, original_words: r.original_words }; }
  const files = [], words = [];
  let offset = 0, previous;
  for (const [i, text] of parts.entries()) {
    const r = await speakPart(text, previous);
    previous = r.requestId;
    const file = join(dir, `voice-${i}.wav`);
    await download(r.audio_url, file);
    for (const w of r.original_words) words.push({ ...w, start_time: w.start_time + offset, end_time: w.end_time + offset });
    offset += r.duration + PAUSE;
    files.push(file);
    process.stdout.write(`part ${i + 1}/${parts.length} `);
  }
  // Join with ffmpeg (a short silence between parts), as MP3 to keep the upload small.
  const joined = join(dir, 'voice.mp3');
  const inputs = files.flatMap((f) => ['-i', f]);
  const chain = files.map((_, i) => `[${i}:a]apad=pad_dur=${PAUSE}[a${i}]`).join(';') + ';' + files.map((_, i) => `[a${i}]`).join('') + `concat=n=${files.length}:v=0:a=1[out]`;
  execFileSync('npx', ['remotion', 'ffmpeg', '-v', 'error', '-y', ...inputs, '-filter_complex', chain, '-map', '[out]', '-ar', '44100', '-ac', '1', '-b:a', '192k', joined], { stdio: 'inherit' });
  const form = new FormData();
  form.append('file', new Blob([await readFile(joined)], { type: 'audio/mpeg' }), 'voice.mp3');
  const res = await fetch('https://api.heygen.com/v3/assets', { method: 'POST', headers: { 'x-api-key': key }, body: form });
  const up = await res.json();
  if (!res.ok) throw new Error(`HeyGen upload ${res.status}: ${JSON.stringify(up.error || up)}`);
  return { audio_asset_id: up.data.asset_id, duration: offset - PAUSE, original_words: words };
}

async function makeTake(episode) {
  const dir = join('public', 'host', episode.id);
  await mkdir(dir, { recursive: true });
  const manifestPath = join(dir, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{}'));
  const save = () => writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  const text = fullText(episode.sections);
  const look = twin.cameras[episode.camera || 'a'];
  const hash = sha(JSON.stringify([text, cfg.avatarModel, cfg.resolution, twin.voiceId, look, twin.motionFrom]));

  // The look's still, shown in previews until the take exists.
  if (!dry && !manifest.still) {
    const l = await api(`/v3/avatars/looks/${look}`);
    const raw = join(dir, 'still.src');
    await download(l.preview_image_url, raw);
    try { execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', '1920', raw, '--out', join(dir, 'still.jpg')], { stdio: 'ignore' }); manifest.still = `host/${episode.id}/still.jpg`; } catch {}
    await save();
  }
  if (!force && manifest.take?.hash === hash) {
    manifest.take.starts = sectionStarts(episode.sections, manifest.take.words); // sections may have moved
    await save();
    console.log(`${episode.id}: take up to date`);
    return;
  }
  console.log(`${episode.id}: one take, about ${(text.split(/\s+/).length / 180).toFixed(1)} min of video (${text.length} characters)`);
  if (dry) return;
  process.stdout.write('  voice ');
  const speech = await speak(episode.sections, dir);
  process.stdout.write(`${speech.duration.toFixed(1)}s, take `);
  const { video_id } = await api('/v3/videos', {
    type: 'avatar',
    avatar_id: look,
    ...(speech.audio_asset_id ? { audio_asset_id: speech.audio_asset_id } : { audio_url: speech.audio_url }),
    // The look gives the setting and outfit; your recorded twin footage gives the motion. No motion prompt.
    engine: { type: cfg.avatarModel, ...(twin.motionFrom && twin.motionFrom !== look ? { reference_look_id: twin.motionFrom } : {}) },
    resolution: cfg.resolution,
    aspect_ratio: '16:9',
    title: `Proven Lab: ${episode.title}`,
  });
  const done = await poll(`/v3/videos/${video_id}`);
  const file = join(dir, 'take.mp4');
  await download(done.video_url, file);
  manifest.take = { hash, duration: done.duration || probe(file) || speech.duration, words: speech.original_words, starts: sectionStarts(episode.sections, speech.original_words) };
  await save();
  console.log(` ${manifest.take.duration}s`);
}

for (const f of (await readdir('episodes')).filter((x) => x.endsWith('.json'))) {
  const episode = JSON.parse(await readFile(join('episodes', f), 'utf8'));
  if (!only || episode.id === only) await makeTake(episode);
}
