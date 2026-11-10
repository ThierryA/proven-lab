# Proven Lab videos

DevRel episodes with an AI presenter: your HeyGen digital twin, in a studio look, speaking the script in your cloned voice. Each episode is **one continuous take**. HeyGen returns the timing of every word, and [Remotion](https://www.remotion.dev) edits the take from those timings: wide and close framing, a lower third, short terminal callouts, numbered points, a lo-fi music bed that ducks under the voice, and subtitles. Each video shows the current Proven Lab version from the root `package.json`.

This folder is standalone: it is not part of the site build or the root workspaces.

## Make an episode

```bash
cd video
npm install
npm run studio                                    # preview: the Mac voice reads the script over the look's still
HEYGEN_API_KEY=... npm run presenter -- --dry-run  # minutes of video it would generate
HEYGEN_API_KEY=... npm run presenter              # the take: public/host/<id>/take.mp4
ELEVENLABS_API_KEY=... npm run music              # the music bed: public/music/lofi-bed.mp3
npm run render                                    # out/<id>.mp4 and out/<id>.srt
npm run thumbnail                                 # out/<id>-thumbnail.jpg (YouTube) and out/<id>-card.jpg (site)
```

Keys come from your environment only, never from a file in this repo. Takes, scratch narration, music and renders are gitignored.

**Cost.** A take costs about $5.50–6 per minute of HeyGen credit (about $13 for the 2-minute episode). It is only made again when the spoken text or the presenter settings change, so changing framing, callouts, points, music or the thumbnail costs nothing. Changing a word means a new take.

## The presenter (once)

1. In HeyGen, record your digital twin (about 15 seconds of you talking naturally) and make a look for the setting, for example a creator studio.
2. `npm run presenter -- --twin-info` lists your looks and voices. In `presenter.json`: `twin.cameras.a` is the studio look, `twin.motionFrom` your recorded twin look (its footage drives the motion), `twin.voiceId` your cloned voice.
3. `npm run presenter -- --consent` gives a link where you record your consent; HeyGen requires it before the API can use your twin. Review takes a few minutes.

`voiceModel` is `heygen-voice-1-turbo-free` (free until November 30, 2026; the script falls back to `heygen-voice-1`), `avatarModel` is `heygen-avatar-6`.

## Write an episode

Add `episodes/<id>.json` and list it in `episodes/index.ts`. Write the script first, as a person talks to camera, then split it into sections:

| field | what it does |
| --- | --- |
| `series`, `title` | shown in the lower third and on the thumbnail |
| `music` | `{ "file": "music/lofi-bed.mp3", "volume": 0.32, "underVoice": 0.07 }`: full in pauses and the outro, low under the words |
| `thumbnail` | `{ "at": 101, "lines": ["Why pay agents", "to rebuild?"] }`: a frame of the take (seconds) and a bold title |
| `sections[].text` | the words, spoken in one take |
| `sections[].shot` | `wide` or `close` (a punch-in on the same take, like a second camera) |
| `sections[].callout` | a short line typed into a small terminal, bottom right, for about four seconds |
| `sections[].points` | a numbered list on the left, the presenter moves right |
| `sections[].lowerThird` | series and title, usually on the first section |

`npm run music -- lofi-bed 150 "your description, no vocals"` makes a different track (an ElevenLabs paid plan whose terms allow commercial use).

## Publish

Upload `out/<id>.mp4` to YouTube with `out/<id>-thumbnail.jpg` and `out/<id>.srt`, and mark it as containing AI-generated content. For the site, set the YouTube ID in `site/src/data/videos.mjs` and copy `out/<id>-card.jpg` to `site/public/video/`.

## License

Remotion is free for individuals and companies of up to 3 people; larger companies need a [company license](https://www.remotion.pro). HeyGen and ElevenLabs usage is billed to your accounts.
