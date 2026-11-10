# Proven Lab tutorial videos

AI-generated devrel tutorials, made with [Remotion](https://www.remotion.dev) (video as React code) and [ElevenLabs](https://elevenlabs.io) (narration). Each tutorial is one script in `tutorials/`: change the script, re-render, and the video stays in step with the product. The video shows the current Proven Lab version from the root `package.json`.

This folder is standalone: it is not part of the site build or the root workspaces.

## Use

```bash
cd video
npm install
npm run studio            # preview and scrub in the browser
npm run render            # every tutorial -> out/<id>.mp4
npm run render build-an-app
```

Without voice files the video runs silent, with captions, timed from the narration's length.

## Narration

```bash
ELEVENLABS_API_KEY=... npm run voice            # writes public/voice/<tutorial>/<scene>.mp3
ELEVENLABS_API_KEY=... npm run voice build-an-app --force   # regenerate after editing narration
```

Optional: `ELEVENLABS_VOICE_ID` (pick a voice in ElevenLabs) and `ELEVENLABS_MODEL`. With voice files present, each scene lasts as long as its narration. Keep the key in your environment, never in a file in this repo. Voice files and renders are gitignored.

## Write a tutorial

Add `tutorials/<id>.json` and list it in `tutorials/index.ts`. A tutorial is a list of scenes, each with `narration` (spoken and captioned) and one of these types:

| type | fields |
| --- | --- |
| `title` | `kicker`, `heading`, `sub` |
| `terminal` | `lines`: `{ kind: prompt \| out \| ok \| ask, text }` (prompts are typed out) |
| `diagram` | `nodes`: `{ title, sub }`, joined by arrows |
| `card` | `heading`, `url`, `sub` |

Every scene can have a `label` (for example `02 / Build`). An agent can write a new tutorial from a guide (`get_blueprint`) or a command: ask it to follow `tutorials/build-an-app.json`, keep the narration plain, and match what the product really does.

## License

Remotion is free for individuals and companies of up to 3 people; larger companies need a [company license](https://www.remotion.pro).
