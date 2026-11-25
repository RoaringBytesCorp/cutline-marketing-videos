# Cutline video skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A portable `skills/cutline-video/` folder that lets one Claude Code session make a studio-grade motion-graphics marketing video from any folder, with no subagents and no repo clone.

**Architecture:** `SKILL.md` runs the flow step by step and loads one reference file per step. Two small Node scripts in `assets/` do the deterministic parts: creating a generation (folders, templates, `.gitignore` merge, starter copy) and the code-fallback music track with its beat map. A byte-identical copy of the repo's Remotion starter, with its docs reworded for a single session, renders the video with the existing scripts unchanged.

**Tech Stack:** Markdown (skill and references), Node ≥ 20 ESM with no dependencies (`node:test`, `node:fs`), the existing Remotion 4.0.539 starter.

**Spec:** `docs/superpowers/specs/2026-11-25-cutline-video-skill-design.md`

## Global Constraints

- The skill lives in `skills/cutline-video/` and must work after being copied alone to `~/.claude/skills/cutline-video/`. Nothing in it may reference files outside the folder, except the workspace it creates.
- Nothing in the existing setup changes: `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `remotion-starter/`, `generations/_template/`. The only repo file outside `skills/`, `tests/` and `docs/` that changes is `README.md`.
- Skill text (`SKILL.md`, `references/**`, the starter's `README.md`, `src/foundation/**`, `src/scenes/**`, `remotion.config.ts`) never names subagents, agents, `CLAUDE.md`, the main session, `voiceover.json`, `xcrun`, `simctl`, `adb` or `emulator`.
- `assets/remotion-starter/src/lib/**`, `scripts/**`, `package.json`, `package-lock.json`, `tsconfig.json` and `public/**` are byte-identical to `remotion-starter/`.
- Workspace: the current folder if it contains `generations/`, otherwise `./cutline/`. Layout inside: `generations/<id>/`, `build/<id>/`, `output/<id>/`, `.env`, `.env.example`, `.gitignore`.
- Generation ID: `<slug>_<YYYYMMDD-HHMMSS>`, where the slug is lowercased with accents stripped, each run of characters other than `a-z0-9` replaced by one `-`, and hyphens trimmed from both ends.
- File naming: `[scope]_[duration]_[orientation]_[timestamp].mp4`, with the poster as the same name plus `.jpg`.
- One run makes one orientation, one language and one length.
- Music tempo: one beat = `60 * fps / bpm` frames, which must be a whole number (at 60 fps: 100, 120, 144 and 150 BPM work; 128 doesn't). The track is WAV, 48 kHz, 24-bit, stereo, exactly the video's length.
- Self-check: at most 3 drafts, then show the user the draft and the remaining issues.
- Platform: macOS supported, Linux best effort, Windows unsupported.
- Remotion needs a company licence beyond small teams; the skill says so once.

## Review Focus

1. **The skill runs inside someone's existing code repo, which has its own `.gitignore`:** their lines are kept, the missing protective lines are appended once, and nothing lands at their repo root. → Task 2 tests.
2. **A generation name full of accents and punctuation ("Café Launch — v2!"):** gives a valid ID with no `_` inside the slug. → Task 2 tests.
3. **The user asks for 128 BPM, or a duration that isn't a whole number of frames:** the synth refuses with a message naming the value and suggesting a tempo that works, instead of writing an off-grid beat map. → Task 3 tests.
4. **No `ELEVENLABS_API_KEY`, or the key is present but empty:** the skill takes the code fallback without printing `.env`. → Task 4 test (research.md wording).
5. **The user asks for 16:9 and 9:16 in one request:** intake says one version per run and offers the second as a later run that reuses research. → Task 4 test (intake.md wording).

---

## File map

```
skills/cutline-video/
  SKILL.md                         Task 5
  references/
    conventions.md                 Task 4   workspace, IDs, naming, brief/memory rules, privacy, .env, resume
    intake.md                      Task 4   inputs, tool checks, demo-account confirmation, one-version rule
    quality-bar.md                 Task 4   Quality bar minus LFS, voiceover, iOS/Android
    research.md                    Task 4   design system, marketing, logos, web capture, music
    build.md                       Task 4   foundation then scenes
    self-check.md                  Task 4   review checklist, 3-draft cap
    permissions.md                 Task 4   optional settings.json allow-list
  assets/
    remotion-starter/              Task 1
    templates/brief.md             Task 2
    templates/memory.md            Task 2
    templates/gitignore            Task 2
    templates/env.example          Task 2
    new-generation.mjs             Task 2
    music-synth.mjs                Task 3
tests/cutline-video/
  helpers.mjs                      Task 1
  starter.test.mjs                 Task 1
  smoke.test.mjs                   Task 1   (runs only with CUTLINE_SMOKE=1)
  new-generation.test.mjs          Task 2
  music-synth.test.mjs             Task 3
  references.test.mjs              Task 4
  skill.test.mjs                   Task 5
README.md                          Task 6
```

Templates live under `assets/templates/` rather than the spec's `references/templates/`. They are files the script copies, not text Claude reads, so they belong in `assets/` (my call).

`new-generation.mjs` is my addition within "left to the builder". The spec's step 3, together with the `.gitignore` merge, is privacy-critical and mechanical, so a tested script does it instead of prose. The spec says the synth "normalizes with ffmpeg". Instead, the synth peak-normalizes to -3 dBFS in JS, keeping it dependency-free, and loudness is set at final render with `render-chunked.mjs --loudnorm` (my call).

Run all tests from the repo root: `node --test tests/cutline-video/`.

### Task 0: Branch

- [ ] **Step 1:** `git checkout -b cutline-video-skill` from `main`.

---

### Task 1: Bundled starter

**Files:**
- Create: `skills/cutline-video/assets/remotion-starter/` (copy of `remotion-starter/` excluding `node_modules/` and `out/`)
- Modify (in the copy only): `README.md`, comments in `src/foundation/*.ts(x)`, `src/scenes/_stub.tsx`, `remotion.config.ts` if needed
- Test: `tests/cutline-video/helpers.mjs`, `tests/cutline-video/starter.test.mjs`, `tests/cutline-video/smoke.test.mjs`

**Interfaces:**
- Produces: `helpers.mjs` exports `REPO` (absolute repo root), `SKILL` (absolute `skills/cutline-video`), `read(rel: string): string` (relative to `SKILL`), `FORBIDDEN: RegExp[]` = `[/\bsub-?agents?\b/i, /\bagents?\b/i, /CLAUDE\.md/, /main session/i, /voiceover\.json/, /\bxcrun\b|\bsimctl\b|\badb\b|\bemulator\b/i]`, and `assertClean(text: string, label: string): void`, which fails naming the first match and its line.
- Produces: the starter at `assets/remotion-starter/`, used by Task 2's script and referenced by `build.md`.

- [ ] **Step 1: Write `starter.test.mjs`**
  - `identical: lib, scripts, package files, public`: walks `src/lib`, `scripts`, `public`, plus `package.json`, `package-lock.json` and `tsconfig.json` in both trees, and asserts the same file list and equal bytes.
  - `no node_modules or out in the copy`.
  - `docs are single-session`: `assertClean` on the copy's `README.md`, every file in `src/foundation/`, `src/scenes/_stub.tsx` and `remotion.config.ts`.
  - `README points at the skill`: the copy's README contains `references/quality-bar.md` and `references/build.md`, and does not contain `remotion-starter/src/lib` (the promotion paths don't apply outside the repo).
- [ ] **Step 2: Write `smoke.test.mjs`**, skipped unless `process.env.CUTLINE_SMOKE === '1'`. In a temp dir it copies the starter to `<tmp>/build/smoke_20261125-000000/remotion`, then runs `npm ci`, `npx tsc --noEmit` and `node scripts/render-chunked.mjs --frames 0-119 --name smoke.mp4 --silent` with that folder as `cwd`. It asserts:
  - `npm ci` and `tsc` exit 0
  - `<tmp>/output/smoke_20261125-000000/smoke.mp4` exists. The render may exit 1 only for repeated frames, since the placeholder may be static; the script still writes the file in that case.
  - `ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=width,height,nb_read_frames -of csv=p=0` on the file prints `3840,2160,120`

  Timeout 15 min.
- [ ] **Step 3: Run** `node --test tests/cutline-video/starter.test.mjs`. Expected: FAIL (the copy doesn't exist).
- [ ] **Step 4: Copy:** `rsync -a --exclude node_modules --exclude out remotion-starter/ skills/cutline-video/assets/remotion-starter/`.
- [ ] **Step 5: Reword the copy's docs.** The README's 13 sections stay. Rewrite every mention of agents and the main session as "you" (one session), as follows:
  - §1: replace `cp -R remotion-starter …` with "`new-generation.mjs` copies the starter (see `references/conventions.md`)".
  - §2: drop the pre-approved-commands sentence and point at `references/permissions.md`.
  - §3: ownership becomes "scene files are per scene; `src/lib/` is read-only".
  - §10: drop the parallel-render concurrency note.
  - §11: retitle "Before you call it done".
  - §13: replace with "`src/lib/` is read-only; if it has a bug, note it in `memory.md` and work around it in `src/foundation/`".
  - Line 9: point to `references/quality-bar.md` and `references/build.md` instead of `CLAUDE.md`.
  - The `src/foundation/` and `_stub.tsx` comments: "the foundation agent" becomes "the foundation step".
- [ ] **Step 6: Run** `node --test tests/cutline-video/starter.test.mjs`. Expected: PASS. Then run `CUTLINE_SMOKE=1 node --test tests/cutline-video/smoke.test.mjs`. Expected: PASS.
- [ ] **Step 7: Commit** with the message `Add the bundled Remotion starter for the cutline-video skill`.

---

### Task 2: Generation script and templates

**Files:**
- Create: `skills/cutline-video/assets/new-generation.mjs`, `assets/templates/{brief.md,memory.md,gitignore,env.example}`
- Test: `tests/cutline-video/new-generation.test.mjs`

**Interfaces:**
- Consumes: `assets/remotion-starter/` (Task 1).
- Produces the CLI `node <skill>/assets/new-generation.mjs --name "<name>" [--cwd <dir>] [--based-on <earlier-id>]`, which prints one JSON line `{"workspace": abs, "id": string, "generation": abs, "build": abs, "output": abs, "remotion": abs}` and exits 0. Exported for tests: `slugify(name: string): string`, `resolveWorkspace(cwd: string): string`, `mergeGitignore(existing: string | null, template: string): string`.
- Behaviour:
  - Workspace = `cwd` if `cwd/generations` exists, else `cwd/cutline` (created).
  - Creates `generations/<id>/` from the brief and memory templates, with `<id>` and today's date filled in.
  - Creates `build/<id>/` and `output/<id>/`, and copies the starter to `build/<id>/remotion` without `node_modules`. It does not run `npm ci`; the skill does that.
  - Writes `.env.example` from the template if it's absent, and merges `.gitignore`.
  - With `--based-on`, it copies `design-system/`, `logos/`, `marketing/` and `capture/` from `build/<earlier>/` when they exist, and writes "Based on: `<earlier>`" into the brief.
  - It refuses (exit 1) if the slug is empty or the generation folder already exists.
- `templates/gitignore` lines: `.env`, `.env.*`, `!.env.example`, `.DS_Store`, `node_modules/`, `.auth/`, `build/*/capture/screens/`, `build/*/capture/recordings/`, `build/*/capture/components/`, `build/*/capture/assets/`, `build/*/capture/structure/account.*`, `output/*/capture-private/`, `build/*/remotion/out/`.
- `templates/env.example`: `ELEVENLABS_API_KEY=`, `APP_USERNAME=`, `APP_PASSWORD=`, each with a one-line comment.
- Templates: derived from `generations/_template/`, with these changes:
  - brief: drop "Deliverables", the iOS/Android boot line, voiceover and sound effects, and captions. The Creative brief section contains the full creative-brief text from `CLAUDE.md`, with `[Duration]` and `[Scope of the video]` left as placeholders.
  - memory: workstream rows Design system, Marketing materials, Logos, Web capture, Music, Storyboard, Foundation, Scenes. The storyboard table has no Voiceover column. Renders and Log are kept.

- [ ] **Step 1: Write the failing tests**
  - `slugify`: `"Onboarding Flow v2!"` → `"onboarding-flow-v2"`, `"Café Launch — v2!"` → `"cafe-launch-v2"`, `"__x__"` → `"x"`, `"!!!"` → `""`.
  - `resolveWorkspace`: on an empty temp dir it returns `<tmp>/cutline`; on a temp dir containing `generations/` it returns the dir itself.
  - `mergeGitignore`: with `null` it returns the template. With `"dist/\n.env\n"` it keeps `dist/` first and appends each missing template line exactly once. Applying it twice gives the same result.
  - `CLI end to end`: in a temp dir holding a pre-existing `.gitignore` with `dist/`, run with `--name "Café Launch — v2!"`. Assert:
    - the JSON `id` matches `/^cafe-launch-v2_\d{8}-\d{6}$/` and `workspace` is `<tmp>/cutline`
    - `<tmp>/.gitignore` is untouched, and `<tmp>/cutline/.gitignore` contains `output/*/capture-private/`
    - `build/<id>/remotion/package.json` exists, with no `node_modules`
    - `brief.md` contains the id and has no `<slugified-name>` placeholder left
    - `memory.md` has no `Voiceover` row
  - `CLI refuses an empty slug`: `--name "!!!"` exits 1 with a message on stderr.
  - `--based-on copies research`: create `build/old_20260101-000000/logos/a.svg` in the workspace. A run with `--based-on old_20260101-000000` copies it, and the brief contains `old_20260101-000000`.
  - `templates are single-session`: `assertClean` on `brief.md` and `memory.md`. `brief.md` contains `Make a dynamic [Duration] motion graphics video`.
- [ ] **Step 2: Run** `node --test tests/cutline-video/new-generation.test.mjs`. Expected: FAIL (module not found).
- [ ] **Step 3: Write the templates and implement `new-generation.mjs`.** Use `String.prototype.normalize('NFD')` with the combining marks removed for accents, and `fs.cpSync` with a `filter` that skips `node_modules`. The timestamp is local time in the `YYYYMMDD-HHMMSS` format. Run the CLI only when `import.meta.url` is the entry point, so tests can import the exports.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Add generation script and templates to the cutline-video skill`.

---

### Task 3: Music synth and beat map

**Files:**
- Create: `skills/cutline-video/assets/music-synth.mjs`
- Test: `tests/cutline-video/music-synth.test.mjs`

**Interfaces:**
- Produces the CLI `node <skill>/assets/music-synth.mjs --bpm <n> --seconds <n> --out-dir <dir> [--fps 60] [--lift <seconds>] [--offset-frames 0] [--beatmap-only]`. It writes `<dir>/music.wav` (unless `--beatmap-only`) and `<dir>/beatmap.json`, then exits 0.
- `beatmap.json` matches the starter's `Beatmap` type `{bpm, fps, accents: {frame, type, strength?}[], ranges: {type, startFrame, endFrame, peakFrame?}[]}`, plus `timeSignature: "4/4"` and `firstDownbeatFrame`. Contents:
  - accents: `beat` on every beat (strength 0.5), `bar` on every 4th beat (strength 1), and one `lift` at `--lift`, snapped to the nearest bar (default: the bar nearest 60% of the length)
  - ranges: `intro` from 0 to the end of bar 2, `build` from there to the lift, `lift` from the lift to 2 bars before the end, `outro` for the rest, with the last range ending at `totalFrames - 1`
  - every frame is `offset + k * framesPerBeat`, and nothing is at or after `totalFrames`
- WAV: PCM 24-bit little-endian, 48000 Hz, 2 channels, exactly `round(seconds * 48000)` sample frames, peak at -3 dBFS ±0.1. It has a kick on each beat, a hat on off-beats, a bass on bar roots, and a pad that swells into the lift and resolves over the last bar with a 0.5 s fade. Generation is deterministic: a seeded PRNG, with no `Math.random`.
- Errors (exit 1, message on stderr):
  - `60 * fps / bpm` isn't a whole number: the message names the bpm and lists the nearest working tempos, e.g. `128 BPM puts beats between frames at 60 fps; try 120, 144 or 150`
  - `seconds * fps` isn't a whole number
  - `bpm` outside 60–200
  - `--lift` outside the track

- [ ] **Step 1: Write the failing tests** (each in a temp dir; the WAV header is parsed in the test, at offset 22 for channels, 24 for sample rate and 34 for bits, and the `data` chunk size gives the frame count)
  - `writes a 10 s 120 BPM track`: channels 2, rate 48000, bits 24, frames 480000. Decoded peak is between -3.1 and -2.9 dBFS.
  - `beat map is on the grid`: for 120 BPM at 60 fps, every accent frame `% 30 === 0`. Bar accents are every 120 frames starting at 0. Exactly one `lift`, at a bar. Ranges are contiguous from 0 to 599.
  - `offset shifts the grid`: `--beatmap-only --offset-frames 12` writes no `music.wav`, and every accent frame `% 30 === 12`.
  - `deterministic`: two runs give identical WAV bytes.
  - `rejects 128 BPM at 60 fps`: exit 1, and stderr contains `128` and `120`.
  - `rejects 10.005 s`: exit 1.
- [ ] **Step 2: Run** `node --test tests/cutline-video/music-synth.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement `music-synth.mjs`.** Use a `Float32Array` per channel, simple oscillators and envelopes (sine kick with a pitch drop, noise hat, saw bass through a one-pole low-pass, detuned-saw pad), then peak-normalize and quantize to 24-bit. Use mulberry32 as the PRNG.
- [ ] **Step 4: Run** the tests. Expected: PASS. Listen once with `afplay` to a 30 s, 120 BPM render. If it's harsh or clipped, adjust the mix levels and keep the tests green.
- [ ] **Step 5: Commit** with the message `Add code-fallback music synth with beat map`.

---

### Task 4: Reference files

**Files:**
- Create: `skills/cutline-video/references/{conventions,intake,quality-bar,research,build,self-check,permissions}.md`
- Test: `tests/cutline-video/references.test.mjs`

**Interfaces:**
- Consumes: the CLIs from Tasks 2 and 3, quoted exactly. The starter scripts' flags: `render-chunked.mjs --draft | --final <scope> --poster <frame> [--loudnorm] [--silent]`, `contact-sheet.mjs --comp Main --every 60 --safe`, `check-video.mjs <file>`.
- Produces: the file names `SKILL.md` links to in Task 5. `<skill-dir>` is the notation every reference uses for the skill's base directory.

Distil each file from its sources (spec table "Reference files"), written to "you", one session, in the repo's plain style. Each file starts with one line saying when to read it. Contents each test pins:

| File | Must contain (test assertions, exact substrings) |
|---|---|
| conventions.md | `new-generation.mjs`, `./cutline/`, `[scope]_[duration]_[orientation]_[timestamp]`, `date '+%Y-%m-%d %H:%M'`, `capture-private/`, `Never print`, `grep -H -m1 '^- \*\*Status:\*\*' generations/*/memory.md` (resume listing), `--based-on` |
| intake.md | `command -v node ffmpeg ffprobe`, `APP_USERNAME`, `APP_PASSWORD`, `demo data`, `one orientation, one language and one length`, `macOS`, `Remotion` and `licen` (licence note), `screenshots` (alternative to web capture) |
| quality-bar.md | `3840×2160`, `2160×3840`, `2160×2700`, `60 fps`, `CRF 16`, `yuv420p`, `BT.709`, `+faststart`, `top 15%, bottom 35%, left 6% and right 15%`, `5% margin`, `motion blur`, `2×`, and it must **not** contain `Git LFS` |
| research.md | `design-system/`, `tokens.ts`, `preview.png`, `marketing/extract.md`, `logos/index.md`, `Playwright`, `components.json`, `device scale factor of 2`, `grep -c '^ELEVENLABS_API_KEY=.' .env`, `music-synth.mjs`, `--beatmap-only`, `100, 120, 144 and 150`, `music-preview.m4a`, `audio.md` |
| build.md | `FOUNDATION.md`, `src/foundation/`, `src/lib/` and `read-only`, `rest`, `pass-through`, `npx tsc --noEmit`, `npx remotion still`, `foundation-showcase` |
| self-check.md | `render-chunked.mjs --draft`, `contact-sheet.mjs --comp Main --every 60 --safe`, `check-video.mjs`, `must-fix`, `3 drafts`, `self-check-v` (notes saved to `output/<id>/self-check-v<n>.md`) |
| permissions.md | a fenced `json` block that parses with `JSON.parse` and has `permissions.allow` containing `Bash(node scripts/render-chunked.mjs *)`, `Bash(node scripts/contact-sheet.mjs *)`, `Bash(node scripts/check-video.mjs *)`, `Bash(npx remotion still *)`, `Bash(ffmpeg *)`, `Bash(ffprobe *)`; no entry may contain `.env` |

Content each file must carry beyond the pinned strings (sources are in parentheses):
- **conventions.md** (CLAUDE.md Folders, File naming, Generations; resume-video):
  - what goes in each workspace folder
  - poster frame rule
  - memory.md upkeep after every step
  - user feedback recorded in their words
  - credentials and personal data described by kind and location, never by value
  - `.env` loaded with `node --env-file=.env`
  - the "another cut" path through `--based-on`
- **intake.md** (new-video §1):
  - the 12 inputs reduced to: scope, platform, format and duration, design system and fonts, marketing, logos, features or "decide for me", music, web app URL and demo account or user screenshots, CTA and end card, language, audience/tone
  - ask everything in one message, with a suggested name
  - the demo-account warning and confirmation, recorded in brief.md
  - the one-version rule: what to say and how to queue the next run
- **quality-bar.md** (CLAUDE.md Quality bar): every subsection, without the LFS, voiceover, `.srt` and simulator lines. App Store previews are reduced to "follow Apple's current App Preview specification".
- **research.md** (the design-system, marketing, logo, app-capture-web and audio-music agents): one section per step, in this order: design system, marketing, logos, web capture, music.
  - Music decision order: the user's file (record its licence) → ElevenLabs if the grep count is `1` (the `POST https://api.elevenlabs.io/v1/music` call from a node script run with `node --env-file=.env`; check the endpoint against current ElevenLabs docs when writing; prompt names the BPM, length and structure; convert to 48 kHz/24-bit WAV with ffmpeg; find the first downbeat and pass it to `music-synth.mjs --beatmap-only --offset-frames`) → otherwise `music-synth.mjs`.
  - The capture privacy rules: read-only account use, clean frame, placeholders in committed files, URLs without query strings.
- **build.md** (motion-foundation, scene-builder):
  - the foundation's 8 items, minus voiceover and several deliverables
  - check the showcase before any scene
  - scenes one at a time in storyboard order, each verified with stills at key frames and its seams
  - the animation rules from scene-builder
- **self-check.md** (video-review): the brief, design system, animation and technical checklists, a score out of 10, findings ranked must-fix/should-fix/nice-to-have with frame numbers, the 3-draft cap, and what to show the user after it.
- **permissions.md**: why prompts appear, the snippet, where to paste it (`.claude/settings.json` in the folder Claude Code runs from), and a note that the snippet allows nothing outside rendering and ffmpeg.

- [ ] **Step 1: Write `references.test.mjs`.** One test per file: it exists, `assertClean`, every pinned substring is present (and `Git LFS` is absent from quality-bar.md), and the permissions JSON assertions hold. Add one more test: each reference is ≤ 250 lines.
- [ ] **Step 2: Run** `node --test tests/cutline-video/references.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Write the seven files.**
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Add reference files for the cutline-video skill`.

---

### Task 5: SKILL.md

**Files:**
- Create: `skills/cutline-video/SKILL.md`
- Test: `tests/cutline-video/skill.test.mjs`

**Interfaces:**
- Consumes: every reference (Task 4), `assets/new-generation.mjs` (Task 2), `assets/music-synth.mjs` (Task 3), `assets/remotion-starter/` (Task 1).

Frontmatter:
- `name: cutline-video`
- `description:` "Make a studio-grade motion-graphics marketing video (promo, product video, reel, trailer, launch or feature video) with Remotion, from brief to final 4K render, or resume one made earlier. Use when someone asks for a marketing or product video, or to continue, revise or re-render one."
- `argument-hint: "[what the video is about | resume <name>]"`

Body: the spec's 8 steps as `## 1. Start or resume` … `## 8. Final and user review`. Each step is a few lines naming its reference and the exact command:
- Step 3: `node <skill-dir>/assets/new-generation.mjs --name "<name>"`, then `npm ci` in the printed `remotion` folder.
- Step 4: `music-synth.mjs`.
- Steps 7–8: the render commands.

Step 5 ends with an explicit stop for approval. A short preamble covers:
- `<skill-dir>` = the base directory shown when the skill loads
- the creative brief is in the brief template
- keep `memory.md` current
- the fresh-session tip after the foundation

- [ ] **Step 1: Write `skill.test.mjs`**
  - `frontmatter`: parses the `---` block. `name === 'cutline-video'`, the description includes `marketing` and `resume`, and `argument-hint` is present.
  - `steps`: the headings `## 1.` through `## 8.` appear in order.
  - `links resolve`: every `references/<x>.md` and `assets/<path>` mentioned in SKILL.md exists under `SKILL`.
  - `all references used`: every file in `references/` is mentioned in SKILL.md.
  - `approval stops`: the text contains `approval` in step 5 and in step 8.
  - `clean and short`: `assertClean`, ≤ 250 lines.
  - `portable`: no file under `skills/cutline-video/` (text files only) contains `remotion-starter/` outside `assets/remotion-starter`, `.claude/agents` or `generations/_template`.
- [ ] **Step 2: Run** `node --test tests/cutline-video/skill.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Write `SKILL.md`.**
- [ ] **Step 4: Run** `node --test tests/cutline-video/`. Expected: all PASS (the smoke test is skipped).
- [ ] **Step 5: Commit** with the message `Add SKILL.md for the cutline-video skill`.

---

### Task 6: README and portability check

**Files:**
- Modify: `README.md` (add a section after "How a video gets made")

- [ ] **Step 1:** Add the section `## Quick version: the cutline-video skill`. It covers:
  - what it is: one session, no agents, one version per run, web capture or user screenshots, no voiceover
  - install: `cp -R skills/cutline-video ~/.claude/skills/`, plus Node and ffmpeg
  - use: ask for a video or `/cutline-video`
  - platform: macOS
  - refresh after starter changes: `rsync -a --delete --exclude node_modules --exclude out --exclude README.md remotion-starter/ skills/cutline-video/assets/remotion-starter/`, then `node --test tests/cutline-video/starter.test.mjs`
- [ ] **Step 2: Portability run.**
  - Copy `skills/cutline-video` to a temp dir and run `node <tmp>/cutline-video/assets/new-generation.mjs --name "Smoke"` from a second, empty temp dir.
  - Then `npm ci` in the printed remotion folder, then `node scripts/render-chunked.mjs --frames 0-119 --name smoke.mp4 --silent`.
  - Expected: `output/smoke_<ts>/smoke.mp4` under `<tmp2>/cutline/` at 3840×2160 with 120 frames, judged by the same criteria as the smoke test.
- [ ] **Step 3:** Run `node --test tests/cutline-video/` and `CUTLINE_SMOKE=1 node --test tests/cutline-video/smoke.test.mjs`. Expected: PASS.
- [ ] **Step 4: Commit** with the message `Document the cutline-video skill in the README`.
