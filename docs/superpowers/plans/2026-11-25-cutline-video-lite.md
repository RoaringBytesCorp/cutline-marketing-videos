# Cutline video lite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single `skills/cutline-video-lite/SKILL.md` that, on each run, has Claude create the workspace, the brief and memory files, and a minimal Remotion project, then make the video with plain shell commands.

**Architecture:** One Markdown file. The Remotion skeleton is embedded as fenced code blocks whose info string carries `file=<path>`, so Claude writes them out and a test can extract them. Templates use `template=<name>`. Rendering and checks are ffmpeg and Remotion CLI commands. Claude writes the music synth from a short spec when it's needed.

**Tech Stack:** Markdown, Remotion 4.0.539, React 19.2.9, TypeScript 5.9.3, ffmpeg/ffprobe, node:test.

**Spec:** `docs/superpowers/specs/2026-11-25-cutline-video-lite-design.md` (base: `2026-11-25-cutline-video-skill-design.md`)

## Global Constraints

- `SKILL.md` is at most 500 lines. Frontmatter `name: cutline-video-lite`. Steps `## 1.` to `## 8.` match the folder skill.
- No mention of agents, `CLAUDE.md`, the main session, simulators or `voiceover.json` (`assertClean` from `tests/cutline-video/helpers.mjs`).
- Pinned values: 3840×2160 / 2160×3840 / 2160×2700 at 60 fps; H.264 High, CRF 16, `yuv420p`, BT.709, `+faststart`; safe zones of top 15%, bottom 35%, left 6% and right 15% for 9:16, and a 5% margin otherwise; 480-frame chunks; 3 drafts; one orientation, one language and one length per run.
- The workspace rule and the slug rule are the same as the folder skill's.
- Nothing outside `skills/cutline-video-lite/`, `tests/cutline-video/lite*.test.mjs` and one README line changes.

## Review Focus

1. **Concatenated chunks:** they must give a file with the right frame count, with no repeated frame at a seam. → The smoke test concatenates 2 chunks and checks 120 frames.
2. **Accented or punctuated name:** the inline slug command must give the same result as the folder skill's `slugify`. → A test runs the extracted slug command on "Café Launch — v2!".
3. **Existing `.gitignore`:** the inline merge must append only the missing lines. → A test runs the extracted merge snippet twice on a fixture.
4. **Grain and the hold check:** the grain must not hide holds from the check. → `freezedetect` tolerance noted next to the grain; checked by eye in the smoke render. No automated test (ruling).
5. **A start folder that's a code repo:** the setup must warn through `git check-ignore`. → A string test only.

---

### Task 1: Tests

**Files:** create `tests/cutline-video/lite.test.mjs` and `tests/cutline-video/lite-smoke.test.mjs`.

- `lite.test.mjs` checks:
  - frontmatter
  - steps 1–8 in order
  - at most 500 lines
  - `assertClean`
  - the pinned strings: `3840×2160`, `CRF 16`, `yuv420p`, `top 15%, bottom 35%, left 6% and right 15%`, `--frames=`, `-c:v copy`, `+faststart`, `freezedetect`, `ebur128`, `3 drafts`, `one orientation, one language and one length`, `demo data`, `git check-ignore`, `Never print`
  - `approv` appears in steps 5 and 8
  - the `file=` blocks include `package.json`, `tsconfig.json`, `remotion.config.ts`, `src/index.ts`, `src/Root.tsx`, `src/video.ts`, `src/motion.ts`, `src/Grain.tsx`, `src/SafeZone.tsx` and `src/Main.tsx`, each exactly once
  - the `template=` blocks include `brief.md`, `memory.md`, `gitignore` and `env.example`
  - the extracted ```` ```sh slug ```` block gives `cafe-launch-v2` for `NAME='Café Launch — v2!'`
  - the extracted ```` ```sh gitignore-merge ```` block, run twice on a `.gitignore` holding `dist/` (with the template file present), keeps `dist/` first and adds each template line once
- `lite-smoke.test.mjs` runs only with `CUTLINE_SMOKE=1`. It:
  - extracts the `file=` blocks into `<tmp>/remotion`
  - runs `npm install` and `npx tsc --noEmit`
  - renders `--frames=0-59` and `--frames=60-119` with `--muted`
  - concatenates them with the skill's concat command (`-c:v copy -movflags +faststart`)
  - checks with `ffprobe` that the result is `h264,High,yuv420p,bt709,3840,2160,60/1` and has 120 frames

- [ ] Write both. Run `node --test tests/cutline-video/lite.test.mjs`. Expected: FAIL (no file).

### Task 2: SKILL.md

**Files:** create `skills/cutline-video-lite/SKILL.md`.

- **Sections:** preamble (workspace, paths, secrets, approvals), then `## 1. Start or resume` to `## 8. Final and user review`, then `## Reference: …` sections for the Quality bar, the Remotion skeleton, rendering and checks, and music.
- **Skeleton:**
  - `motion.ts` holds the starter's ease table and four spring presets (snappy, bouncy, soft, heavy), plus `springAt` and `progress`.
  - `Grain.tsx` uses SVG `feTurbulence` with `seed` set to the frame, at overlay opacity 0.12, so no texture file is needed.
  - `SafeZone.tsx` draws the platform margins from `video.ts`.
  - `Main.tsx` places the backdrop, a `Series` of scenes, `Grain`, the optional `Audio` and `SafeZone`, plus a placeholder title that animates with a spring until scenes replace it.
- **Rendering:** chunk loop with `npx remotion render Main … --frames=a-b --muted`, then ffmpeg concat with the music muxed in, `-c:v copy -c:a aac -b:a 320k -movflags +faststart`. The final adds `-af loudnorm=I=-14:TP=-1:LRA=11`.
- **Contact sheet:** ffmpeg `select` every 60th frame, `drawbox` at the safe-zone margins, and `tile`, all from the draft.

- [ ] Write it. Run `node --test tests/cutline-video/lite.test.mjs`, expecting PASS, then `CUTLINE_SMOKE=1 node --test tests/cutline-video/lite-smoke.test.mjs`, also expecting PASS.

### Task 3: README line

- [ ] Under "Quick version", add one paragraph on `skills/cutline-video-lite/SKILL.md`: a single file, installed as `~/.claude/skills/cutline-video-lite/SKILL.md`, with lower consistency. Then run `node --test tests/cutline-video/`, expecting all PASS.
