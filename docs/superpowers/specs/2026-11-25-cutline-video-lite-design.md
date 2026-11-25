# Cutline video lite: one-file skill design

Date: 2026-11-25. This builds on `2026-11-25-cutline-video-skill-design.md`.

## Intent

The folder skill needs its `references/` and `assets/` next to `SKILL.md`. The user wants something that can be shared as a single `SKILL.md`, which on each run tells Claude how to create every folder and file it needs.

## Approaches

- **A. Rebuild from instructions on each run (chosen by the user).** One `SKILL.md`. Claude creates the workspace and a minimal Remotion project from small inline skeletons, and writes its own helpers from short specs. The cost: it gives up the bundled motion library, chunked-render script and video-check script, so quality varies more between runs.
- B. One `SKILL.md` that downloads the kit from a hosted URL. Rejected by the user, because it needs hosting.
- C. Everything embedded in one file (about 175k tokens). Rejected: every run would pay for the whole file in context.

## Design

- **Where it lives:** `skills/cutline-video-lite/SKILL.md` with `name: cutline-video-lite`. It's installed as `~/.claude/skills/cutline-video-lite/SKILL.md`. The folder skill stays as it is.
- **Size:** at most 500 lines. The references are condensed into it, keeping the pinned values: Quality bar, safe zones, naming, privacy rules, the one-version rule, the 3-draft cap and the two approval stops.
- **Workspace setup (inline):** the same rules as the folder skill: the current folder or a parent if it holds `generations/`, `build/` and `output/`, else `./cutline/`. Shell steps compute the slug and ID, run `mkdir -p`, and write `brief.md`, `memory.md`, `.gitignore` (append missing lines; never overwrite an existing one) and `.env.example` from inline templates. A `git check-ignore` warning covers host repos.
- **Remotion project (inline skeleton):** Claude writes these files into `build/<id>/remotion/` and runs `npm install`:
  - `package.json`, pinned to Remotion 4.0.539, React 19.2.x and TypeScript 5.9
  - `tsconfig.json` and `remotion.config.ts`
  - `src/index.ts`, `src/Root.tsx`, `src/video.ts`
  - a minimal `src/Main.tsx`
- **Helpers Claude writes from specs:** easing curves and spring presets, grain, a safe-zone overlay, and a beat helper. Each spec is a few lines, with the exact values (for example the safe-zone percentages).
- **Rendering without scripts:** the long render is done as shell steps. Claude renders 480-frame chunks with `npx remotion render --frames=a-b` using the Quality bar's encode flags, joins them with ffmpeg concat (`-c copy -movflags +faststart`), and muxes the music. The poster is rendered with `npx remotion still`.
- **Checks without scripts:**
  - `ffprobe`: codec, profile, pixel format, colour, resolution, fps and frame count
  - ffmpeg `freezedetect`: holds
  - ffmpeg `ebur128`: loudness
  - a contact sheet: `npx remotion still` at every 60th frame, tiled with ffmpeg
- **Music:** the user's track, else ElevenLabs if the key is set, else a short synth spec Claude writes as a node script: the grid rule, the WAV format, the structure and `beatmap.json`.

## Verification

- A test checks the file: frontmatter, steps 1–8, at most 500 lines, no agent wording, and the pinned values present.
- A smoke test extracts the inline skeleton files from `SKILL.md` into a temp folder, runs `npm install` and `tsc`, and renders 60 frames at 4K.

## Non-goals

The same as the folder skill. Also: no byte-for-byte parity with the folder skill's library or scripts.
