# Cutline video skill: design

Date: 2026-11-25

## Intent

Package what this repo does (brief, research, storyboard, Remotion build, render, checks) as one portable Claude Code skill that someone can drop into `~/.claude/skills/` and run from any folder. It's meant as a quick solution to offer people: no subagents, no repo to clone, no `CLAUDE.md` to install. The current repo, with its agents and phases, stays the full-strength version.

## Goals

- One self-contained folder, `skills/cutline-video/`, that works when copied anywhere Claude Code loads skills.
- One session does the whole video from start to finish, one phase after another, using the same Remotion starter, motion library and render scripts as the repo.
- Keeps what makes the output professional: the Quality bar (2160p60, H.264 High CRF 16, safe zones, eased and layered motion, motion blur, beat sync), live brand text, and UI rebuilt from captures rather than raw screenshots.
- A video can be resumed in a later session from its brief and memory files.

## Non-goals

- Subagents or parallel workstreams.
- iOS simulator and Android emulator capture. Web capture with Playwright, or screenshots the user provides, only.
- Voiceover and captions files.
- Several versions per run. One run makes one orientation, one language and one length (user's decision). When a request asks for more, intake says so and offers to make each extra version as its own run that reuses the first run's research (copy `design-system/`, `logos/`, `marketing/`, `capture/` from the earlier `build/<id>/`, as `new-video`'s "Another cut" does). The scripts' `--format`/`--lang` options stay in the starter but the skill doesn't use them.
- A separate fresh-eyes review loop. One self-check pass replaces it.
- Changing or removing anything in the existing repo setup (`CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `remotion-starter/`).
- Keeping the skill's copy of the starter in sync with `remotion-starter/` automatically.

## Anti-goals

- A demo-looking video: dropping the Quality bar to make the skill faster defeats the point.
- A `SKILL.md` that's too long to follow: the detail belongs in reference files the session loads at the step that needs them.
- Leaking credentials or personal data from captures into tracked files or the chat.

## Constraints

- A skill can't ship `.claude/settings.json`, so commands prompt for permission as they run. The skill ships an optional allow-list snippet that users can paste into their project settings.
- The render scripts work out their output folder from the path `<workspace>/build/<id>/remotion` → `<workspace>/output/<id>/` (`scripts/_common.mjs`, `generationOutputDir`). The skill keeps the repo's `generations/`, `build/`, `output/` layout in the folder it runs from (the workspace), so the scripts run unchanged.
- The workspace may not be a git repo. Git and Git LFS become optional.
- **Workspace location (builder's call):** if the current folder already has `generations/`, it is the workspace. Otherwise the skill creates and uses `./cutline/` inside the current folder, so it never scatters `generations/`, `build/`, `output/` next to someone's code. `.env` lives in the workspace.
- **`.gitignore` (builder's call):** on first run, write the workspace's `.gitignore` from the template, or, if one exists, append whichever template lines are missing. It always covers `.env`, `node_modules/`, `.auth/`, the raw capture folders and `output/*/capture-private/`.
- **Platform (builder's call):** macOS is supported, since the scripts use `pgrep` and Chromium `gl: 'angle'`. Linux is best effort and Windows is unsupported. The skill and README say so, and the scripts stay unchanged.
- Remotion needs a company licence beyond small teams. The skill mentions this once.

## Approaches

- **A. Self-contained skill folder (chosen).** `SKILL.md` covers the flow, `references/` holds the detail, and `assets/remotion-starter/` holds the starter. Portable and nothing else to install. The costs are slower, sequential production and permission prompts.
- **B. Thin skill pointing at a clone of this repo.** Fast to write, but it isn't a standalone offering, and the always-loaded `CLAUDE.md` assumes agents. Rejected.

The user picked A and accepted the cut list above.

## Design

### Layout

```
skills/cutline-video/
  SKILL.md
  references/
    intake.md          inputs to ask for, tool checks, demo-account confirmation
    conventions.md     workspace folders, generation IDs, file naming, brief/memory rules, privacy, .env rules
    quality-bar.md     the Quality bar from CLAUDE.md (resolution, assets, rights, safe zones, animation, done checks)
    research.md        design system, marketing, logos, web capture, music + beat map (from the 5 research agents)
    build.md           foundation then scenes (from motion-foundation and scene-builder)
    self-check.md      the review checklist (from video-review) the session runs on its own draft
    permissions.md     optional allow-list for .claude/settings.json
    templates/
      brief.md
      memory.md
      gitignore        raw-capture and secret patterns, written to the workspace on first run
  assets/
    remotion-starter/  copy of remotion-starter/ without node_modules or out/, docs adapted
    env.example        ELEVENLABS_API_KEY, APP_USERNAME, APP_PASSWORD
    music-synth.mjs    code fallback for the music track (see Music)
```

### SKILL.md flow

Frontmatter: `name: cutline-video`, a description that triggers on requests for a marketing video, promo, reel, trailer or product video, and on resuming one. `argument-hint: "[what the video is about | resume <name>]"`.

Body, about 150–250 lines, one section per step, each naming the reference file to read:

1. **Start or resume.** If the arguments or request name an existing generation, or `generations/` already has one the user means, resume it: read `brief.md` and `memory.md`, check `node_modules` and tools, summarize, and continue from "Next steps". Otherwise start a new one.
2. **Intake** (`intake.md`). One message asks for every missing input and a generation name. Inputs: scope, platform, format and duration, design system and fonts, marketing materials, logos, features (or "decide for me"), music (generated, file plus licence, or none; see Music below), web app URL and demo account (credentials in `.env` as `APP_USERNAME`/`APP_PASSWORD`, never in chat, plus confirmation that it holds only demo data), or screenshots to use instead, CTA and end card, language, and audience/tone (optional, inferred if skipped). Tool check: `node ffmpeg ffprobe`.
3. **Workspace and generation** (`conventions.md`). Create `generations/<id>/` from the templates, `build/<id>/`, `output/<id>/`, write `.gitignore` if absent, copy `assets/remotion-starter` to `build/<id>/remotion` and run `npm ci`. Fill in the brief, including the creative brief text from `CLAUDE.md`.
4. **Research** (`research.md`), done in order by the session: design tokens and fonts → marketing messages and features (confirm the shortlist if "decide for me") → logos as SVG → web capture with Playwright at DPR 2+, broken into components → music track and `beatmap.json` (tempo whose beat lands on a whole frame at 60 fps). Log each step in `memory.md`.
5. **Storyboard.** Scene list with frame ranges on the beat map, copy that works muted, transitions, ending on the CTA. Write it into `memory.md`, then stop and get the user's approval along with the music preview.
6. **Build** (`build.md`). Foundation first (tokens, fonts, timing, layouts, transitions, UI components rebuilt in code, safe zones, composition skeleton, `FOUNDATION.md`) and check its showcase still. Then scenes one by one, rendering stills of key frames for each.
7. **Draft and self-check** (`self-check.md`). Run `node scripts/render-chunked.mjs --draft`, the contact sheet with `--safe` and `check-video.mjs`. Inspect stills at zooms and fast moves, and walk the checklist. Fix must-fix items and redraft until the checklist passes, up to 3 drafts. After the third, stop and show the user the draft with the remaining issues, then let them decide (builder's call).
8. **Final** (`quality-bar.md` done checks). Run `render-chunked.mjs --final <scope> --poster <frame>` and the done checks, then give the user the path. Set status to `in review`, list any copy that wasn't in the approved storyboard, iterate on feedback with new timestamps, and set `done` on approval.

Throughout: keep `memory.md` current after each step, with times from `date`. Never print `.env` values or write personal data from captures into tracked files.

**Session length (builder's call):** the session runs straight through. The natural stops are the user's two approvals: storyboard and final. Because `memory.md` "Next steps" is updated after every step and scene, a context reset or a new session can resume through step 1. If the context gets heavy after the foundation, `SKILL.md` suggests carrying on in a fresh session with `/cutline-video resume <name>`.

### Music

The user decided: if the user brings no track, use ElevenLabs when `ELEVENLABS_API_KEY` is set in the workspace `.env`, checked without printing it (`grep -c '^ELEVENLABS_API_KEY=.' .env`). Otherwise synthesize a beat-locked track in code. A track the user supplies is used as is, with its licence recorded. In every case the result is `build/<id>/audio/music.wav` (48 kHz, 24-bit, exactly the video's length), a `beatmap.json` matching the starter's `Beatmap` type (`src/foundation/timing.ts`), `audio.md` recording how it was made, and `output/<id>/music-preview.m4a` for the storyboard approval. The tempo must put each beat on a whole frame at 60 fps (100, 120, 144, 150 BPM). `research.md` holds:
- the ElevenLabs music call (the endpoint, prompt shape and a node script run with `node --env-file=.env`)
- the code fallback: a small node script, kept in `references/` or `assets/`, that renders drums, bass and a pad on the beat grid to WAV with an intro, a lift at the key moment and a resolving end, then normalizes with ffmpeg

The skill ships `assets/env.example` listing `ELEVENLABS_API_KEY`, `APP_USERNAME` and `APP_PASSWORD`, which is copied to the workspace as `.env.example`.

### Reference files

Each one is distilled from its source rather than copied verbatim. Wording that names agents, the main session, `CLAUDE.md` or parallelism is rewritten for one session. Sources:

| File | Source |
|---|---|
| intake.md | `.claude/skills/new-video/SKILL.md` §1, minus iOS/Android and voiceover/captions |
| conventions.md | `CLAUDE.md` Folders, File naming, Generations; `resume-video` |
| quality-bar.md | `CLAUDE.md` Quality bar, minus Git LFS and App Store specifics beyond a pointer |
| research.md | `design-system-research`, `marketing-research`, `logo-research`, `app-capture` (web part), `audio-production` (music part) |
| build.md | `motion-foundation`, `scene-builder` |
| self-check.md | `video-review` |
| templates | `generations/_template/`, workstream table trimmed to the remaining workstreams |

### Bundled starter

`assets/remotion-starter/` is a copy of `remotion-starter/` with `src/lib/` and `scripts/` unchanged. Only `README.md` (and any code comments) that mention `CLAUDE.md`, agents or the repo get reworded to point at the skill's references. The repo README gets one line on how to refresh the copy (`rsync -a --exclude node_modules --exclude out remotion-starter/ skills/cutline-video/assets/remotion-starter/`, then re-apply the README edits).

### Distribution

The repo `README.md` gets a short section: copy `skills/cutline-video/` into `~/.claude/skills/` (or a project's `.claude/skills/`), install Node and ffmpeg, then ask Claude for a video or run `/cutline-video`.

## Left to the builder

- Exact wording and section order within each reference file, as long as each one is self-contained and names no agents.
- How much of the starter README to trim versus reword.
- Whether `SKILL.md` inlines the creative brief text or keeps it in `conventions.md`.
- Verification: copy the skill to a scratch workspace and confirm that the starter copies, `npm ci` succeeds, `npx tsc --noEmit` passes, and `render-chunked.mjs --draft` on the placeholder project writes to `output/<id>/`.
