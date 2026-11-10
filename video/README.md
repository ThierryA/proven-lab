# Proven Lab videos

DevRel episodes with an AI presenter, made from versioned scripts. A photo of the presenter is brought to life by [HeyGen](https://www.heygen.com) (Avatar 6 animates the photo, HeyGen Voice speaks the narration), and [Remotion](https://www.remotion.dev) cuts it together with Proven Lab's screens: terminals, diagrams, lower thirds and captions. Change a script, re-run, and the episode stays in step with the product. Each video shows the current Proven Lab version from the root `package.json`.

This folder is standalone: it is not part of the site build or the root workspaces.

## Use

```bash
cd video
npm install
npm run studio                                   # preview and scrub in the browser
HEYGEN_API_KEY=... npm run presenter -- --dry-run   # what would be generated, and how many minutes
HEYGEN_API_KEY=... npm run presenter             # make the presenter clips
npm run render                                   # every episode -> out/<id>.mp4
```

Without presenter clips the episode still renders, silent with captions and a placeholder where the presenter goes, timed from the narration.

## Presenter

Settings are in `presenter.json`:

| field | what it does |
| --- | --- |
| `photo` | the presenter's photo, default `presenter/photo.jpg` |
| `intro` | the line that opens every episode: "Hey, this is the AI inside of me speaking." Made once, reused everywhere |
| `voiceId` | a HeyGen voice; list public ones with `npm run presenter -- --voices`, or use your own voice clone |
| `voiceModel` | `heygen-voice-1-turbo-free` (free until November 30, 2026), then `heygen-voice-1` |
| `avatarModel` | `heygen-avatar-6`, or `heygen-avatar-6-turbo` for faster, cheaper drafts |
| `motionPrompt` | how the presenter moves and comes across |

The photo: landscape (16:9), head and shoulders, looking at the camera, good light, a background you are happy to see in every video. Use a photo of someone who has agreed to be the presenter. The `presenter/` folder is gitignored, so the photo never lands in this public repo.

Clips are cached: `npm run presenter` only generates scenes whose text, photo or settings changed (`public/host/*/manifest.json`), so a re-run costs only what changed. `--force` regenerates everything. Keep `HEYGEN_API_KEY` in your environment, never in a file here; create one at platform.heygen.com/api-keys.

## Write an episode

Add `tutorials/<id>.json` and list it in `tutorials/index.ts`. An episode has a `series` (for example "How to Proven Lab"), a `title`, and scenes. Every scene has `narration` (spoken by the presenter and captioned) and a type:

| type | shows | fields |
| --- | --- | --- |
| `host` | the presenter on camera; with `points`, beside a short numbered list | `points`, `lowerThird` (series and title) |
| `terminal` | lines appearing, prompts typed out; presenter in the corner | `lines`: `{ kind: prompt \| out \| ok \| ask, text }` |
| `diagram` | boxes joined by arrows; presenter in the corner | `nodes`: `{ title, sub }` |
| `title` | a big heading | `kicker`, `heading`, `sub` |
| `card` | an end card with a link | `heading`, `url`, `sub` |

Screens can have a `label` (for example `02 / Build`). Write narration the way a person talks to camera: short sentences, "you", one idea per scene. An agent can draft a new episode from a guide (`get_blueprint`) or a command: ask it to follow `tutorials/build-an-app.json` and to match what the product really does.

## License

Remotion is free for individuals and companies of up to 3 people; larger companies need a [company license](https://www.remotion.pro). HeyGen usage is billed to your HeyGen API plan.
