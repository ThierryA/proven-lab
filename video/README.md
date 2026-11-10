# Proven Lab videos

DevRel episodes with an AI presenter in a recording studio, made from versioned scripts. [HeyGen](https://www.heygen.com) puts the presenter in the studio from a few photos (HeyGen Image), brings them to life (Avatar 6) and speaks the narration (HeyGen Voice), and [Remotion](https://www.remotion.dev) cuts it together: two camera angles, wide and close shots, callouts, lower thirds, and Proven Lab's screens (terminals, diagrams) for how-to episodes. `what-is-proven-lab` is the studio episode; `build-an-app` is a how-to. Change a script, re-run, and the episode stays in step with the product. Each video shows the current Proven Lab version from the root `package.json`.

This folder is standalone: it is not part of the site build or the root workspaces.

## Use

```bash
cd video
npm install
npm run studio                                         # preview and scrub in the browser
HEYGEN_API_KEY=... npm run presenter -- --studio       # once: put you in the studio
HEYGEN_API_KEY=... npm run presenter -- --dry-run      # what would be generated, and how many minutes
HEYGEN_API_KEY=... npm run presenter                   # make the presenter clips
npm run render                                         # every episode -> out/<id>.mp4 and out/<id>.srt
```

Until the presenter clips exist, scenes use a **scratch voice**: the Mac's built-in voice reads the narration (free, offline, made automatically by `npm run studio` and `npm run render`, or `npm run scratch`), over your studio portrait if it exists, else a placeholder. It is only for checking timing and wording; each HeyGen clip replaces it. `SCRATCH_VOICE=Samantha` picks another Mac voice (`say -v '?'` lists them).

## Presenter

The presenter is you, made by AI, sitting in a recording studio. Put these in `video/presenter/` (gitignored, so no face ever lands in this public repo):

| file | what |
| --- | --- |
| `me-1.jpg`, `me-2.jpg`, `me-3.jpg` | 1 to 5 clear photos of you, face visible, looking at the camera |
| `studio-a.jpg` | camera A: a photo of one person seated in a recording studio, framed the way you want to appear (16:9, head and upper body). Any person: HeyGen keeps the setting, pose, clothes and light, and puts your face in |
| `studio-b.jpg` | camera B (optional): the same studio from a second angle, for cuts between two cameras |

The studio references can be photos you own, licensed stock, or images generated with an image tool. Then `npm run presenter -- --studio` makes `presenter/cam-a.jpg` and `cam-b.jpg`: open them and re-run with `--force` if you want another take. Each scene's clip animates the portrait of its `camera`.

Only use photos of yourself or of someone who has agreed to be the presenter.

Settings in `presenter.json`:

| field | what it does |
| --- | --- |
| `identity`, `cameras` | the photo files above |
| `intro` | the line that opens every episode: "Hey, this is the AI inside of me speaking." Made once, reused everywhere |
| `voiceId` | a HeyGen voice; list public ones with `npm run presenter -- --voices`. For your own voice, make an instant voice clone in HeyGen and use its ID |
| `voiceModel` | `heygen-voice-1-turbo-free` (free until November 30, 2026), then `heygen-voice-1` |
| `avatarModel` | `heygen-avatar-6`, or `heygen-avatar-6-turbo` for faster, cheaper drafts |
| `motionPrompt` | how the presenter moves and comes across |

Everything is cached (`manifest.json` files): only scenes whose text, portrait or settings changed are generated again, so a re-run costs only what changed. `--force` regenerates. Keep `HEYGEN_API_KEY` in your environment, never in a file here; create one at platform.heygen.com/api-keys.

## Write an episode

Add `tutorials/<id>.json` and list it in `tutorials/index.ts`. An episode has a `series` (for example "How to Proven Lab"), a `title`, `captions` (`false` keeps subtitles off the picture, studio style; the `.srt` is always written for YouTube), and scenes. Every scene has `narration` (spoken by the presenter and captioned) and a type:

| type | shows | fields |
| --- | --- | --- |
| `host` | the presenter on camera in the studio | `camera` (`a`, `b`), `shot` (`wide`, `close`), `callout` (a short line that pops in), `points` (numbered list beside the presenter), `lowerThird` (series and title) |
| `terminal` | lines appearing, prompts typed out; presenter in the corner | `lines`: `{ kind: prompt \| out \| ok \| ask, text }` |
| `diagram` | boxes joined by arrows; presenter in the corner | `nodes`: `{ title, sub }` |
| `title` | a big heading | `kicker`, `heading`, `sub` |
| `card` | an end card with a link | `heading`, `url`, `sub` |

Screens can have a `label` (for example `02 / Build`). Write narration the way a person talks to camera: short sentences, "you", one idea per scene. An agent can draft a new episode from a guide (`get_blueprint`) or a command: ask it to follow `tutorials/build-an-app.json` and to match what the product really does.

## License

Remotion is free for individuals and companies of up to 3 people; larger companies need a [company license](https://www.remotion.pro). HeyGen usage is billed to your HeyGen API plan.
