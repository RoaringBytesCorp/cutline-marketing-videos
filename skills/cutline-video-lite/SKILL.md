---
name: cutline-video-lite
description: Make a studio-grade motion-graphics marketing video (promo, product video, reel, trailer, launch or feature video) with Remotion, from brief to final 4K render, or resume one made earlier. One self-contained file that sets up everything it needs on each run. Use when someone asks for a marketing or product video, or to continue, revise or re-render one.
argument-hint: "[what the video is about | resume <name>]"
---

# Cutline video (lite)

The request: $ARGUMENTS

You are a small motion-design studio in one session. You take a brief, research the brand, storyboard to the music, build the video in Remotion, check it like a creative director, and deliver a 4K final. The bar is a showreel, not a demo. This file holds everything: it tells you how to create every folder and file the video needs.

- **Workspace:** a folder holding `generations/`, `build/` and `output/`. It's the current folder or a parent if one is a workspace, otherwise `./cutline/` inside the current folder. Never scatter these folders next to someone's code. Every path below is relative to the workspace. Once it exists, `cd` into it and stay there. Run Remotion commands in a subshell, `(cd build/<id>/remotion && <command>)`.
- **Memory:** `generations/<id>/memory.md` is the running state. After every meaningful step, add a log entry timed with `date '+%Y-%m-%d %H:%M'` and update "Current state", "Next steps" and the Workstreams table, so a new session can resume exactly there. Record user feedback close to their own words.
- **Secrets:** API keys and the demo account live in `<workspace>/.env`. Always give the user that full path. Never print `.env` values, `cat` or `source` the file, or ask for credentials in the chat. Check a variable with `grep -c '^NAME=.' .env`, and load the file into your own scripts with `node --env-file=.env <script>`. Never write credentials or personal data from captures into `brief.md`, `memory.md` or any file that could be committed. Describe them by kind and location instead.
- **Approvals:** stop for the user only where a step says so (the storyboard and the final).
- **Platform:** made for macOS (Linux may work). Videos render with Remotion, which needs a company licence beyond small teams. Mention this once on a user's first video.

## 1. Start or resume

Find the workspace: walk up from the current folder looking for `generations/`, `build/` and `output/` together, then try `./cutline/`. If the request says "resume", names an earlier video, or asks to change or re-render one:

1. `cd` into the workspace and list the generations: `grep -H -m1 '^- \*\*Status:\*\*' generations/*/memory.md`. Ask which one if it's unclear.
2. Read its `brief.md` and `memory.md` in full. Run `npm install` in `build/<id>/remotion/` if `node_modules` is missing, and check the tools (step 2).
3. Summarize the status, the latest render, the open items and the next steps, then continue from "Next steps". Don't redo `done` work. If the video is `done` and the user wants changes, set it back to `in review`.

Otherwise start a new video at step 2.

## 2. Intake

Check the tools with `command -v node ffmpeg ffprobe`; install with `brew install node ffmpeg` only after the user agrees. Then send **one message** asking for every input the request doesn't answer, plus a short name for the video (suggest one):

1. **Scope:** what the video introduces.
2. **Platform:** where it runs. This sets the orientation, length, safe zones and file size limit. An App Store preview follows Apple's current App Preview specification instead of the Quality bar's resolution.
3. **Format and duration:** one orientation (16:9, 9:16 or 4:5) and one length.
4. **Design system** (Figma, Storybook, tokens, guidelines or the site) and the brand **font files**.
5. **Marketing materials:** URLs or paths.
6. **Logos:** SVG preferred.
7. **Features:** a list, or "decide for me" (you propose a shortlist after research and the user confirms it).
8. **Music:** their own track (with its licence and BPM if known), generated, or none. Generated means ElevenLabs if `ELEVENLABS_API_KEY` is set in `<workspace>/.env`, otherwise a simpler track you make in code.
9. **Product screens:** a web app to capture, or screenshots they provide (native apps: screenshots at native resolution, @3x on iOS). For a web app, ask for the URLs, a demo account with its credentials put in `<workspace>/.env` as `APP_USERNAME` and `APP_PASSWORD`, and what may and may not appear on screen. Explain that captures show whatever the account holds and can end up in the video and in committed files. The account must hold only demo data: get the user's confirmation and record it, dated, in `brief.md`.
10. **Call to action and end card.**
11. **Language** of the on-screen copy.
12. **Audience, tone and reference videos** (optional; infer them from the marketing if skipped, marked "inferred").

**One run makes one orientation, one language and one length.** If the user asks for more, say so, agree which comes first, and offer the rest as later runs that reuse this run's research (step 8). Note them under "Open items". Never silently build only the first.

## 3. Create the video

Once you have the name, create the generation. Compute the ID with the slug block below (`NAME` is the name; it uses node, so accents become plain letters), then the timestamp:

```sh slug
node -e 'console.log(process.argv[1].normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""))' "$NAME"
```

The ID is `<slug>_<date +%Y%m%d-%H%M%S>`. If the slug is empty, ask for another name. Shell variables don't carry over between commands, so print the ID once and type it literally wherever `<id>` appears. Then, in the workspace (create `./cutline/` first if there's none, and `cd` into it):

1. `mkdir -p generations/<id> build/<id>/remotion output/<id>`.
2. Write `generations/<id>/brief.md` and `memory.md` from the templates in "Reference: templates", with the ID and today's date filled in.
3. If `.env.example` is missing, write it from the `env.example` template.
4. Protect `.gitignore`: write the `gitignore` template to `gitignore.template` in the workspace, run the block below (it appends only the missing lines and keeps the user's own), then delete `gitignore.template`.

   ```sh gitignore-merge
   touch .gitignore
   while IFS= read -r line; do
     case "$line" in ''|'#'*) continue ;; esac
     grep -qxF -- "$line" .gitignore || printf '%s\n' "$line" >> .gitignore
   done < gitignore.template
   ```
5. If the workspace is inside a git repository, run `git check-ignore -v build/<id> output/<id>`. If either is ignored by the host repo's `.gitignore`, tell the user those files won't be versioned. Tell them too that rendered `.mp4`s and `.wav`s stay out of git unless they set up Git LFS.
6. Write the Remotion project from "Reference: Remotion project" into `build/<id>/remotion/` (each block's `file=` is its path), then `(cd build/<id>/remotion && npm install)`. If you add another `@remotion/*` package, pin it to `4.0.539`.

Write each intake answer into `brief.md` as it arrives. When intake is complete, fill in the creative brief there and set the status to `in production`.

## 4. Research

Do these in order, logging each in `memory.md`. Cite the source of every fact.

1. **Design system → `build/<id>/design-system/`:** keep the sources in `source/`. Write `tokens.md` and `tokens.ts` (`as const` objects with the design system's own names): colours with roles, type styles, spacing, radii, shadows, icons (where to get each as SVG), and motion cues if any. Copy the fonts into `fonts/` and check every weight and glyph is there. Never substitute a font: ask. Render a `preview.png` and look at it.
2. **Marketing → `build/<id>/marketing/extract.md`:** key messages, taglines (verbatim), proof points (with source and date; flag weak ones), features (the product's names and the evidence), calls to action, and audience and tone. Quote; never invent, round or strengthen a claim. For "decide for me", end with a ranked shortlist and confirm it with the user.
3. **Logos → `build/<id>/logos/`:** every variant (full, wordmark, symbol, lockups, colour, white, black), the app icon, and official store badges only from Apple and Google. Clean each SVG (`viewBox`, no embedded rasters, outlined text, animatable parts in groups) and keep the original. Never upscale or trace a raster. Write `index.md`.
4. **Product screens → `build/<id>/capture/`:** use exactly these folders, which `.gitignore` keeps out of git: `screens/`, `recordings/`, `components/`, `assets/`, and the browser login state in `capture/.auth/`. Scripts go in `capture/scripts/`.
   - **Screenshots the user gave:** copy them into `screens/` and check the resolution. Crop each component at native resolution into `components/`, name the icons to rebuild as SVG (SF Symbols, Material or the design system's set), and list each component's position and size in `components.json`.
   - **A web app:** first check that `brief.md` records the demo-data confirmation; if it doesn't, stop and ask. Run `npm i -D playwright && npx playwright install chromium` in `capture/`, and run the scripts from the workspace with `node --env-file=.env`. Use the account read-only. Capture at a device scale factor of 2 or more, with no banners or toasts, and record interactions whose timing matters. Take SVG icons straight from the page, record computed styles, and list each component's position and size in `components.json`.
   - Anything with real personal data goes in `output/<id>/capture-private/`. Write `report.md`.
   - Keep personal values out of committed files (use placeholders) and strip query strings from URLs.
5. **Music → `build/<id>/audio/`:** see "Reference: music".

When research is done, write what it settled (confirmed features, inferred audience) into `brief.md`.

## 5. Storyboard

Write a scene list with frame ranges, on-screen copy and transitions into the Storyboard section of `memory.md`. Pitch it at the brief's audience and tone, and end it on the call to action:

- Put scene boundaries and key moments on the bars and hits of `audio/beatmap.json`.
- The copy must carry the message muted.
- Motivate every transition: a match cut, a morph, a mask wipe, or an element that carries over.

Then **stop and ask for the user's approval** in one message, with the storyboard and `output/<id>/music-preview.m4a`. Once approved, the track and frame ranges are locked. Record the approval date.

## 6. Build

Work in `build/<id>/remotion/`. Copy `build/<id>/audio/music.wav` to `build/<id>/remotion/public/audio/` (copy it again whenever the music changes). Copy the fonts from `design-system/fonts/` to `public/fonts/`.

1. **Foundation first:**
   - Set `FORMAT` and `DURATION_IN_FRAMES` in `src/video.ts`, plus `BPM = beatmap.bpm` and `BEAT_OFFSET = beatmap.firstDownbeatFrame` from `build/<id>/audio/beatmap.json`. Time the storyboard's key moments from its `ranges` and its `lift` accent.
   - Write `src/brand.ts` with the tokens and the type scale, and load the brand fonts from `public/fonts/` with `@remotion/fonts` (fail loudly if one doesn't load).
   - Rebuild the product's screens as React components from `components.json`, the styles and the SVG icons, so each part can animate (never a raw screenshot as a static plate).
   - Plan every scene boundary as a **rest** (motion eases to zero velocity before the cut) or a **pass-through** (both sides sample one shared trajectory function of the global frame). Each scene gets its global start as the `from` prop, so its global frame is `from + useCurrentFrame()`. A transition (mask wipe, match cut, morph, whip) is drawn inside the scenes on both sides of the cut, from that shared function. Write the table in `FOUNDATION.md`, with the tokens, the type, the beats and the UI kit.
   - Render stills of the brand pieces and the transitions, and fix any flaw now; it would repeat in every scene.
2. **Scenes, one at a time in storyboard order:** each in `src/scenes/<SceneId>.tsx`, added to `SCENES` in `src/Main.tsx`.
   - Use the curves and springs in `src/motion.ts`, with anticipation, overshoot and settle.
   - Stagger and overlap, and add motion blur to fast moves. Write each moving element's pose as a pure function `pose(t)` of the global frame. Render it at 5–8 sample times spread over ±0.25 frame around the current one, stacked at opacity 1/(i+1), and wrap only the moving element. For straight moves of flat UI, an SVG `feGaussianBlur stdDeviation="<x> 0"` along the direction of motion is cheaper. Avoid frame-based blur components (they misbehave at scene seams) and isotropic `filter: blur()` (it reads as soft focus, not motion).
   - Keep holds alive with drift or parallax. Land key moments on `beat(n)` and `bar(n)`.
   - Set copy as live text inside `SAFE`, and long enough to read.
   - Everything must be a pure function of the frame: no `Math.random()` or `Date`.
   - Check each scene before the next: `npx tsc --noEmit`, and stills at key frames, zoom peaks and both seams (`npx remotion still Main out/s-<frame>.png --frame=<frame>`, plus `--props='{"showSafeZone":true}'`). Then mark it `done` in `memory.md`.

If the conversation gets long after the foundation, suggest continuing in a fresh session with `/cutline-video-lite resume <name>`.

## 7. Draft and self-check

Render the draft as in "Reference: render and check", to `output/<id>/draft-v<n>.mp4`, and make its contact sheet. Then judge it as a creative director and a technical QC:

- **The brief:** it looks like a showreel; screens are animated components; it introduces the scope and ends on the CTA; it reads muted.
- **Design system and animation:** colours, type, logos and icons (a substituted font is a must-fix), and every point of the Quality bar's animation list.
- **Technical:** the probe and hold checks; stills at zooms, fast moves and gradients, inspected for blur, pixelation, jaggies and banding; the contact sheet's safe zones; the loudness and a clean musical ending; no personal data.

Write `output/<id>/self-check-v<n>.md`: the verdict with a score out of 10 overall and per scene; the findings ranked must-fix, should-fix and nice-to-have, each with its frame, a still as evidence and a fix; and what works.

Fix and redraft until no must-fix finding is left, at most 3 drafts. After the third, show the user what's left and let them decide.

## 8. Final and user review

Render the final as in "Reference: render and check", named `[scope]_[duration]_[orientation]_[timestamp].mp4`. For example, `onboarding-flow_30s_portrait_20261118-101530.mp4`: `duration` is whole seconds plus `s`, orientation is `landscape`, `portrait` or `4x5`, and the timestamp is `date +%Y%m%d-%H%M%S`. No field may contain `_`. Render its poster from the source, at rest, with the same name as a `.jpg`. Run every check and fix any failure.

Give the user both paths, set the status to `in review`, and **ask for their approval or feedback**. List any copy or claim that wasn't in the approved storyboard. Render fixes under a new timestamp so earlier renders are kept. When they approve, set the status to `done`.

Another orientation, language or length is a new run. Create it as in step 3, then copy `design-system/`, `logos/`, `marketing/` and `capture/` from `build/<earlier-id>/` and `src/brand.ts` plus the UI components from its Remotion project. Note "Based on: `<earlier-id>`" in the brief.

## Reference: Quality bar

- **Resolution and encoding:** 3840×2160 landscape, 2160×3840 portrait, 2160×2700 4:5, at 60 fps unless the user asks otherwise. H.264 High, CRF 16, `yuv420p`, BT.709, `+faststart`; `remotion.config.ts` and the join command set these.
- **Assets:** vectors or code for logos, icons and UI. Rasters at least 2× their largest on-screen size, including at a zoom's peak; never upscale. Text is live, in the brand typefaces, never baked in or substituted.
- **Rights:** the client's own assets are fine to use. Anything else (a music track, stock, icon sets) needs a licence, recorded next to it in `build/<id>/`. Store badges come only from Apple's and Google's official artwork.
- **Safe zones:** key text, logos and the CTA stay inside the safe zone. For 9:16 on TikTok, Reels and Shorts, keep the top 15%, bottom 35%, left 6% and right 15% clear; for every other format, a 5% margin on each edge. `SAFE` in `src/video.ts` holds these.
- **Animation:** custom easing or springs with anticipation, overshoot and settle (linear only for constant spins and scrolls); layered, staggered motion with follow-through; motion blur on fast moves; living holds; depth through parallax, perspective, shadows and light; motivated transitions, never plain crossfades; hits on the beat; frame-by-frame deterministic rendering with no stutter or jitter; grain on large gradients so they don't band (`Grain` does this).
- **File size:** within each target platform's size limit (`ls -lh <file>`). Grain makes 4K60 files large, roughly 15–20 MB a second. If a final is over a platform's limit, make a copy for that platform with `-c:v libx264 -crf 20 -maxrate 40M -bufsize 80M -pix_fmt yuv420p -c:a copy -movflags +faststart`, or lower `Grain`'s opacity and render again. For the user to open or send quickly, make `<name>.preview.mp4` with `-vf scale=-2:1080 -crf 23`; it isn't the deliverable.

## Reference: render and check

Never render the whole video in one `npx remotion render` pass: long 4K renders stall or crash Chrome. Render 480-frame chunks, muted, from `build/<id>/remotion/`. A full render takes far longer than a command's default time limit, so run the loop with `run_in_background` (or one chunk per call with the maximum timeout). Start each new draft with `rm -rf out/chunks`. Running the loop again resumes it, because finished chunks are skipped. If a chunk fails, run it again with `--concurrency=2`. Set `N` to `DURATION_IN_FRAMES`:

```sh
mkdir -p out/chunks
for ((s=0; s<N; s+=480)); do
  e=$(( s+479 < N-1 ? s+479 : N-1 )); c="out/chunks/c$(printf %05d $s)"
  [ -s "$c.mp4" ] || { npx remotion render Main "$c.part.mp4" --frames=$s-$e --muted && mv "$c.part.mp4" "$c.mp4"; } || break
done
ls out/chunks/c?????.mp4 | sed "s|.*/|file '|; s|$|'|" > out/chunks/list.txt
```

Join the chunks without re-encoding and mux the music. `<out>` is `../../../output/<id>/draft-v<n>.mp4` or the final's name. For the final, set the music to -14 LUFS without squashing its dynamics. Measure `public/audio/music.wav` with the loudness check below, and add `-af "volume=<-14 minus its I>dB,aresample=192000,alimiter=limit=0.86:level=disabled,aresample=48000"` before `-c:a`:

```sh
ffmpeg -y -v error -f concat -safe 0 -i out/chunks/list.txt -i public/audio/music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart <out>
```

With no music:

```sh join-silent
ffmpeg -y -v error -f concat -safe 0 -i out/chunks/list.txt -c:v copy -movflags +faststart <out>
```

**Poster:** `npx remotion still Main ../../../output/<id>/<final name>.jpg --frame=<frame> --image-format=jpeg --jpeg-quality=95`.

**Checks**, on every draft and final:

- **Probe:** `ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=codec_name,profile,pix_fmt,color_space,width,height,r_frame_rate,nb_read_frames -of csv=p=0 <file>` must print `h264,High,<width>,<height>,yuv420p,bt709,60/1,<DURATION_IN_FRAMES>`.
- **Holds** (downscaled and blurred, so the grain doesn't hide them): `ffmpeg -i <file> -vf "scale=480:-2,gblur=sigma=2,freezedetect=n=-65dB:d=0.5" -map 0:v -f null - 2>&1 | grep freeze_`. Each freeze must be intended; otherwise add drift. For hitches inside a move, use `d=0.03`. If a stretch you know is still never shows up, the grain is louder than usual: try `-60dB`.
- **Loudness:** `ffmpeg -nostats -i <file> -vn -af ebur128=peak=true -f null - 2>&1 | grep -A13 'Summary:'`. A final should land near -14 LUFS with a true peak at or below -1 dBTP.
- **Contact sheet** (every 60th frame, with the safe zone drawn): with `cols=6` and `rows` = ceil(frames / 60 / 6), and for 9:16 the margins below (for other formats `0.05` on each edge), run

  ```sh
  ffmpeg -y -v error -i <file> -vf "select='not(mod(n\,60))',drawbox=x=iw*0.06:y=ih*0.15:w=iw*0.79:h=ih*0.50:color=red@0.8:t=6,scale=640:-2,tile=6x<rows>" -frames:v 1 -fps_mode vfr ../../../output/<id>/sheet-v<n>.png
  ```
- **Stills:** extract full-resolution ones at zooms and fast moves (`npx remotion still Main out/check-<f>.png --frame=<f>`) and look at them.

## Reference: music

Every route ends with the same files in `build/<id>/audio/`: `music.wav` (48 kHz, 24-bit, exactly the video's length); `beatmap.json`, as `{bpm, fps, firstDownbeatFrame, accents: [{frame, type: "beat"|"bar"|"lift"}], ranges: [{type: "intro"|"build"|"lift"|"outro", startFrame, endFrame}]}`; and `audio.md`, with how it was made and an external track's source and licence.

Preview it with `ffmpeg -i build/<id>/audio/music.wav -c:a aac -b:a 256k output/<id>/music-preview.m4a`.

A beat lasts `60 × fps / bpm` frames. Pick a tempo where that's a whole number: at 60 fps, 100, 120, 144 and 150 BPM work and 128 doesn't. Choose the route in this order:

1. **The user's track:** fit it to the length with ffmpeg (with an `afade=t=out` over the last 0.5 s), find the first downbeat as below, and write `beatmap.json` from its BPM. At a tempo that puts beats between frames, round each beat to the nearest frame and tell the user it's loose sync.
2. **ElevenLabs**, if `grep -c '^ELEVENLABS_API_KEY=.' .env` prints `1`. A node script run with `node --env-file=.env` calls `POST https://api.elevenlabs.io/v1/music` with the `xi-api-key` header and `{prompt, music_length_ms, model_id}`. Check the current models in ElevenLabs' music API reference first. The prompt gives the genre and mood from the tone, the exact BPM in 4/4, the length, and an intro → build → lift at the key moment → ending that resolves on the end card. Convert the result to 48 kHz/24-bit WAV at the exact length, find the first downbeat, and write `beatmap.json`.
3. **Otherwise, write `build/<id>/audio/synth.mjs`:** a dependency-free node script that writes the WAV and the beat map deterministically (seeded PRNG).
   - On the grid: a sine kick with a falling pitch on each beat, a noise hat on off-beats, a low-passed saw bass on the eighths, and a detuned-saw pad, over the chords Am–F–C–G, one per bar.
   - Structure: the intro is 2 bars of pad and hats; the build adds the kick and bass while the pad swells; the lift starts on a bar near 60% of the length with an impact; the last bar resolves to Am with a 0.5 s fade.
   - Peak-normalize to -3 dBFS.

To find the first downbeat (you can't listen), measure the loudness of every frame:

`ffmpeg -v error -i music.wav -af "asetnsamples=800,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=rms.txt" -f null -`

That's 800 samples per frame at 48 kHz and 60 fps. The first strong jump is the first downbeat. Compare the jumps near the end with the grid: drift beyond 2 frames means the BPM is wrong. Ask the user to listen to the preview.

## Reference: templates

```markdown template=brief.md
# Brief: <scope>

- **Generation ID:** `<id>`
- **Started:** <date>
- **Based on:** none

## Inputs

1. **Scope:**
2. **Target platform:**
3. **Format and duration:**
4. **Design system and fonts:**
5. **Marketing materials:**
6. **Logos:**
7. **Features:**
8. **Music:**
9. **Product screens:** <URL and where credentials are kept (never values), or the screenshots>; demo account confirmed on <date or "not yet">; what may and may not appear
10. **Call to action and end card:**
11. **Language:**
12. **Audience, tone and references:**

## Creative brief

> Make a dynamic [Duration] motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. Go all out. Make it a video to introduce [Scope of the video]. Use actual product screenshots, logos and assets provided. Do it like a real professional production video, not like a demo or prototype. Add more animation and motion design. Avoid using screenshots raw; instead, break them down into components and icons so we can animate those too. Make the motions more juicy. Use the best motion design techniques you can.
```

```markdown template=memory.md
# Memory: <scope>

## Current state

- **Status:** intake <!-- intake | in production | in review | done -->
- **Latest render:** none
- **Next steps:**

## Open items

## Decisions

## Workstreams

| Workstream | Status | Output |
|---|---|---|
| Design system | pending | |
| Marketing | pending | |
| Logos | pending | |
| Product screens | pending | |
| Music | pending | |
| Storyboard | pending | (below) |
| Foundation | pending | |
| Scenes | pending | |

## Storyboard

- **Music:** <file, BPM; approved on YYYY-MM-DD>

| # | Frames | Visuals and motion | On-screen copy | Transition out |
|---|---|---|---|---|

## Renders

| File | Self-check | Notes |
|---|---|---|

## Log
```

```gitignore template=gitignore
.env
.env.*
!.env.example
.DS_Store
node_modules/
.auth/
build/*/capture/screens/
build/*/capture/recordings/
build/*/capture/components/
build/*/capture/assets/
output/*/capture-private/
build/*/remotion/out/
output/**/*.mp4
build/*/audio/*.wav
build/*/remotion/public/audio/
```

```sh template=env.example
# Copy to .env and fill in. Never commit .env or paste its values into a chat.
ELEVENLABS_API_KEY=
APP_USERNAME=
APP_PASSWORD=
```

## Reference: Remotion project

```json file=package.json
{
  "name": "cutline-video",
  "private": true,
  "type": "module",
  "dependencies": {
    "@remotion/cli": "4.0.539", "@remotion/fonts": "4.0.539", "@remotion/noise": "4.0.539",
    "react": "19.2.9", "react-dom": "19.2.9", "remotion": "4.0.539"
  },
  "devDependencies": {"@types/node": "24.19.2", "@types/react": "19.2.18", "typescript": "5.9.3"}
}
```

```json file=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler", "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ES2022"], "strict": true, "resolveJsonModule": true,
    "esModuleInterop": true, "skipLibCheck": true, "isolatedModules": true, "noEmit": true, "types": ["node"]
  },
  "include": ["src", "remotion.config.ts"]
}
```

```ts file=remotion.config.ts
import {Config} from '@remotion/cli/config';

Config.setEntryPoint('src/index.ts');
Config.setVideoImageFormat('png'); // lossless frames: no banding on gradients
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer('angle'); // GPU compositing on macOS
Config.setDelayRenderTimeoutInMilliseconds(120000);
Config.setOverwriteOutput(true);
```

```ts file=src/index.ts
import {registerRoot} from 'remotion';
import {RemotionRoot} from './Root';

registerRoot(RemotionRoot);
```

```tsx file=src/Root.tsx
import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './video';

export const RemotionRoot: React.FC = () => (
  <Composition id="Main" component={Main} durationInFrames={DURATION_IN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{showSafeZone: false}} />
);
```

```ts file=src/video.ts
// Frame size, rate, length, safe zone and beat grid. Set FORMAT, DURATION_IN_FRAMES, BPM and BEAT_OFFSET from the brief and the music.
export type Format = 'landscape' | 'portrait' | '4x5';
export const FORMAT = 'landscape' as Format; // 'landscape' | 'portrait' | '4x5'
export const FPS = 60;
export const DURATION_IN_FRAMES = 10 * FPS;
const SIZES: Record<Format, [number, number]> = {landscape: [3840, 2160], portrait: [2160, 3840], '4x5': [2160, 2700]};
export const [WIDTH, HEIGHT] = SIZES[FORMAT];
/** Safe-zone margins as fractions of the frame. Key text, logos and the CTA stay inside. */
export const SAFE = FORMAT === 'portrait' ? {top: 0.15, right: 0.15, bottom: 0.35, left: 0.06} : {top: 0.05, right: 0.05, bottom: 0.05, left: 0.05};
export const BPM = 120;
/** Frame of the first downbeat. */
export const BEAT_OFFSET = 0;
export const beat = (n: number): number => Math.round(BEAT_OFFSET + (n * 60 * FPS) / BPM);
export const bar = (n: number): number => beat(4 * n);
```

```ts file=src/motion.ts
// Motion language: everything eases (anticipation → move → overshoot → settle). Linear only for constant spins and scrolls.
import {Easing, interpolate, spring, type SpringConfig} from 'remotion';
import {FPS} from './video';

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // default entrance
  outSoft: Easing.bezier(0.25, 0.8, 0.25, 1), // large surfaces
  in: Easing.bezier(0.7, 0, 0.84, 0), // exits
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // moves between rests
  whip: Easing.bezier(0.8, 0, 0.1, 1), // fast swooshes
  backIn: Easing.bezier(0.36, 0, 0.66, -0.56), // anticipation
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1), // overshoot landing
  backOutSoft: Easing.bezier(0.22, 1.3, 0.36, 1), // text and UI overshoot
  linear: Easing.linear,
} as const;

export const springs = {
  snappy: {damping: 14, mass: 0.6, stiffness: 180}, // UI, ~6% overshoot, ~0.4 s
  bouncy: {damping: 9, mass: 0.7, stiffness: 160}, // pops and the CTA, ~23%, ~0.8 s
  soft: {damping: 12, mass: 1, stiffness: 70}, // panels and camera, ~4%, ~0.85 s
  heavy: {damping: 22, mass: 2.4, stiffness: 140}, // weighty objects, ~10%, ~1.2 s
} as const satisfies Record<string, Partial<SpringConfig>>;

/** 0 → 1 with the preset's overshoot, starting at `start` (0 before it). */
export const springAt = (frame: number, start: number, preset: keyof typeof springs = 'snappy'): number =>
  spring({frame: frame - start, fps: FPS, config: springs[preset]});

/** Eased 0 → 1 between two frames, clamped. */
export const progress = (frame: number, start: number, end: number, easing: (t: number) => number = ease.out): number =>
  interpolate(frame, [start, Math.max(end, start + 1)], [0, 1], {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Start frame of item i, `step` frames apart. */
export const stagger = (i: number, step: number, base = 0): number => base + i * step;
```

```tsx file=src/Grain.tsx
// Deterministic film grain (a new pattern every frame, the same on every render) that breaks gradient banding.
import React, {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.12}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.ceil(width / 2);
  const h = Math.ceil(height / 2);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    let s = (Math.imul(frame + 1, 2654435761) >>> 0) || 1;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (s ^ (s << 13)) >>> 0; s = (s ^ (s >>> 17)) >>> 0; s = (s ^ (s << 5)) >>> 0; // xorshift32
      img.data[i] = img.data[i + 1] = img.data[i + 2] = s >>> 24;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [frame, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated', mixBlendMode: 'overlay', opacity, pointerEvents: 'none'}} />;
};
```

```tsx file=src/SafeZone.tsx
// Overlay of the safe zone, for checking stills: --props='{"showSafeZone":true}'.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {HEIGHT, SAFE, WIDTH} from './video';

export const SafeZone: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: SAFE.left * WIDTH, top: SAFE.top * HEIGHT, right: SAFE.right * WIDTH, bottom: SAFE.bottom * HEIGHT, border: `${Math.round(HEIGHT / 360)}px solid rgba(255,40,40,0.9)`}} />
  </AbsoluteFill>
);
```

```tsx file=src/Main.tsx
// The video: backdrop, the scenes back to back, grain and the optional safe-zone overlay. Music is muxed in at render time.
import React from 'react';
import {AbsoluteFill, Series, useCurrentFrame} from 'remotion';
import {Grain} from './Grain';
import {SafeZone} from './SafeZone';
import {springAt} from './motion';
import {DURATION_IN_FRAMES, HEIGHT} from './video';

/** The storyboard's scenes in order. Each gets its global start frame as `from`. */
const SCENES: {id: string; durationInFrames: number; component: React.FC<{from: number}>}[] = [];
const STARTS = SCENES.map((_, i) => SCENES.slice(0, i).reduce((sum, x) => sum + x.durationInFrames, 0));
const TOTAL = SCENES.reduce((sum, x) => sum + x.durationInFrames, 0);
if (SCENES.length > 0 && TOTAL !== DURATION_IN_FRAMES) throw new Error(`The scenes add up to ${TOTAL} frames, not DURATION_IN_FRAMES (${DURATION_IN_FRAMES}).`);

const Placeholder: React.FC = () => {
  const s = springAt(useCurrentFrame(), 0, 'bouncy');
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: 'system-ui', fontWeight: 700, fontSize: HEIGHT * 0.08, color: '#fff', opacity: Math.min(1, s), transform: `translateY(${(1 - s) * HEIGHT * 0.05}px) scale(${0.6 + 0.4 * s})`}}>Cutline</div>
    </AbsoluteFill>
  );
};

export const Main: React.FC<{showSafeZone: boolean}> = ({showSafeZone}) => (
  <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, #2a2f3a, #0d0f14)'}}>
    {SCENES.length === 0 ? (
      <Placeholder />
    ) : (
      <Series>
        {SCENES.map(({id, durationInFrames, component: Scene}, i) => (
          <Series.Sequence key={id} durationInFrames={durationInFrames} premountFor={60}>
            <Scene from={STARTS[i]} />
          </Series.Sequence>
        ))}
      </Series>
    )}
    <Grain />
    {showSafeZone ? <SafeZone /> : null}
  </AbsoluteFill>
);
```
