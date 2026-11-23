# Remotion starter

Every generation renders from a copy of this project: Remotion 4.0.539, React 19.2.9, TypeScript 5.9 (strict), 2160p at 60 fps by default. It has three layers:

- `src/lib/`: the shared motion library (curves, springs, motion and text primitives, motion blur, depth, shadows, grain, safe zones, scene context). It's the same in every generation and nobody edits it inside a generation.
- `src/foundation/`: the brand layer for one generation. It ships as clearly marked placeholders (neutral tokens, a system font, 120 BPM, an empty scene list, a neutral backdrop) that the foundation agent replaces.
- `src/scenes/`: one folder per scene, written by the scene agents.

Read the repo's `CLAUDE.md` first, especially the Quality bar. Then read this file for the library, and the generation's `FOUNDATION.md` (next to this file in the copy) for the brand layer.

---

## 1. Start a generation

The main session copies the starter. It copies rather than imports, so that a later change to the starter never changes how an existing generation re-renders.

```sh
cp -R remotion-starter build/<generation-id>/remotion
cd build/<generation-id>/remotion
npm ci
```

Don't rename the package or change any versions. `npm ci` needs `package.json` and `package-lock.json` to match exactly.

The foundation agent then:

1. Sets `DEFAULT_FORMAT` (`'landscape'`, `'portrait'` or `'4x5'`), `DEFAULT_LANGUAGE` and `DURATION_IN_FRAMES` in `src/video.ts`.
2. Replaces every placeholder in `src/foundation/`:
   - `tokens.ts`: the design system's tokens, copied verbatim.
   - `fonts.ts`: the brand font files, in `public/fonts/`, listed in `FONT_FILES`, and `fontStack` pointed at their families. Once files are listed, the project refuses to start if a `fontStack` family or a weight in the type scale isn't among them.
   - `type.ts`: the video type scale.
   - `timing.ts`: BPM, beat offset or beatmap, `MUSIC_SRC`, named `HITS` and `SCENE_LIST`.
   - `layout.ts`: `SAFE_ZONES` for the target platforms, and the layout presets.
   - `Backdrop.tsx`: the brand's look.
3. Registers a stub for every scene in `src/scenes/index.ts`.
4. Builds the shared pieces the scenes need (the UI rebuilt in code, transition components, handoff helpers) in `src/foundation/` or `src/ui/`.
5. Writes `FOUNDATION.md` next to this file (see [section 12](#12-foundationmd)).
6. Checks that `grep -rn PLACEHOLDER src/` returns nothing. The word marks every placeholder in `src/video.ts` and `src/foundation/`, so a hit is something not yet replaced.

---

## 2. Run, preview, render

Run every command from the generation's project folder, `build/<generation-id>/remotion/`. An agent's shell returns to the repo root after every call, so type each command as `cd build/<id>/remotion && <command>`, with no absolute script paths, `--prefix` or shell redirects in the same command. Every command below except `npx remotion studio` is pre-approved in `.claude/settings.json`.

```sh
npx remotion studio            # interactive preview
npx remotion compositions      # Main, one composition per scene, MotionShowcase, SheetLabel (a tool)
npx tsc --noEmit               # strict typecheck; must pass before you report done
```

**Stills** are full resolution, lossless PNG. Renders go to the generation's `output/<generation-id>/` folder, never to `output/` itself.

```sh
npx remotion still S2Feature ../../../output/<id>/S2Feature-f120.png --frame=120
npx remotion still S2Feature ../../../output/<id>/S2Feature-f120-safe.png --frame=120 --props='{"showSafeZone":true}'
```

**A scene draft or slice** (at most about 480 frames per call; see [Performance](#10-performance)):

```sh
npx remotion render S2Feature ../../../output/<id>/S2Feature-draft.mp4 --concurrency=3
# a slice only:  --frames=120-359
```

**Main, a draft or the final** always goes through the chunked renderer:

```sh
node scripts/render-chunked.mjs --draft                             # → the next free draft-v<n>.mp4
node scripts/render-chunked.mjs --final <scope> --poster <frame>    # → <scope>_<seconds>s_<orientation>_<timestamp>.mp4 and .jpg
```

- Name the output with one of `--draft`, `--final <scope>` or `--name <file.mp4>`. `--poster <frame>` renders that frame from source as the poster JPEG. Outside `build/<id>/remotion`, pass `--out-dir`.
- The audio is the composition's own mix: the music and every other `<Audio>`. A silent mix stops the render. `--audio <file>` replaces it, `--silent` omits it, and `--loudnorm` (for the final) brings it to −14 LUFS under −1 dBTP.
- The video renders in 480-frame chunks (`--chunk`), each in a fresh browser at concurrency 4, joined without re-encoding. A stalled or crashed chunk is retried at half the concurrency. An error in the composition stops the render.
- The file is written only after it passes the checks below. Repeated frames alone still write it, and exit 1. `--resume` reuses an interrupted run's chunks, unless something they depend on changed. `--help` lists every option.

**Check a video**, any mp4. A bare file name is looked up in `output/<id>/`:

```sh
node scripts/check-video.mjs S2Feature-draft.mp4 --comp S2Feature     # --frames 120-359 for a slice
node scripts/check-video.mjs <final>.mp4 --loudnorm --max-hold 2
```

- It checks the encoding, the composition's size, frame rate and frame count (`--comp`, default Main), the timestamps and the audio (`--silent` if there is none).
- Its motion pass fails on a **repeated frame**: a copy of the frame before, or a frame in a move that moves under 30% as much as its neighbours (a stutter). It lists **holds**, where only the grain changes; `--max-hold S` makes longer ones fail.

**Contact sheet.** Labelled tiles of full-resolution stills:

```sh
node scripts/contact-sheet.mjs --comp S2Feature --frames 0,60,120,240,479 --cols 3
node scripts/contact-sheet.mjs --comp Main --every 60 --safe                    # with the safe-zone overlay
node scripts/contact-sheet.mjs --comp Main --every 60 --safe-preset social-9x16  # a specific preset
# → output/<id>/<name>.png; full-resolution stills in out/<name>-stills/ (by the sheet with --keep-stills)
```

**Another deliverable.** When the brief lists several orientations or languages, every command takes the deliverable. The scripts take `--format` and `--lang` and put the deliverable in the default file names; the Remotion CLI and the studio take the same two as input props:

```sh
node scripts/render-chunked.mjs --draft --format portrait --lang de               # → draft-portrait-de-v<n>.mp4
node scripts/render-chunked.mjs --final <scope> --format portrait --lang de       # → <scope>-de_<seconds>s_portrait_<timestamp>.mp4
node scripts/check-video.mjs draft-portrait-de-v1.mp4 --format portrait --lang de
node scripts/contact-sheet.mjs --comp Main --every 60 --safe --format portrait --lang de   # → Main-sheet-portrait-de-safe.png
npx remotion render S2Feature ../../../output/<id>/S2Feature-portrait-draft.mp4 --props='{"format":"portrait","lang":"de"}'
```

Without them a command renders the default deliverable (see [Format and units](#4-format-and-units)).

**Quick looks.** `--scale=0.5` on `npx remotion still|render` and the contact sheet renders at half resolution. Drafts for review and finals render at full resolution.

---

## 3. Files and ownership

```
remotion.config.ts, tsconfig.json, package*.json   starter (don't change)
scripts/*.mjs: render, contact sheet, video check  starter
public/textures/grain-512.png                      starter
public/fonts, audio, images…                       foundation
src/
  video.ts            FORMAT, LANGUAGE, WIDTH, HEIGHT, FPS, DURATION_IN_FRAMES, UNIT, u()   (foundation sets the defaults and the duration)
  index.ts, Root.tsx  compositions (foundation)
  lib/                the shared library (READ-ONLY in a generation)
  foundation/         brand layer: tokens, fonts, type, timing, layout, Backdrop (foundation)
  compositions/       Main + StandaloneScene, MotionShowcase (foundation)
  scenes/index.ts     scene registry (foundation)
  scenes/_stub.tsx    StubScene helper (foundation)
  scenes/<SceneId>.tsx, scenes/<SceneId>/**   one scene (its scene agent)
```

- **Scene agents** edit only `src/scenes/<SceneId>.tsx` and files under `src/scenes/<SceneId>/`. Keep the export name and the signature, `export const S2Feature: React.FC = () => …`, with no props.
- **Nobody edits `src/lib/` in a generation.** If it has a bug, report it; the main session fixes it in the copy and in `remotion-starter/src/lib/`. If you need something the library or foundation lacks, build it in your own folder by composing their parts (don't copy and modify them), and say so in your summary so it can be promoted.
- `src/lib/` never imports from `src/foundation/`. It may import from `src/video.ts`.
- Put new rasters in `src/scenes/<SceneId>/` and import them (Remotion bundles imports), or ask for them in `public/`. Every raster must be at least 2× its largest on-screen size.
- Everything must be a pure function of the frame. Don't use `Math.random()`, `Date` or real-time APIs; use seeded noise (`@remotion/noise`, `driftAt`).

---

## 4. Format and units

| `FORMAT` | Frame | Aspect | Typical platforms |
|---|---|---|---|
| `landscape` | 3840×2160 | 16:9 | YouTube, website, LinkedIn |
| `portrait` | 2160×3840 | 9:16 | TikTok, Reels, Shorts |
| `4x5` | 2160×2700 | 4:5 | Instagram and LinkedIn feed |

A render has one format and one language. `FORMAT` and `LANGUAGE` in `src/video.ts` are `DEFAULT_FORMAT` and `DEFAULT_LANGUAGE` unless the render passes the input props `format` and `lang`, which the scripts' `--format` and `--lang` set. An unknown format stops the render, and the scripts stop if `--format` doesn't change the frame size.

A generation makes one cut, so the duration, the scene list and the track are the same for every deliverable. Layouts are usually designed for one aspect, so if the brief asks for several orientations, the foundation designs the layouts and safe zones for each, chosen by `FORMAT`. If it asks for several languages, the foundation keeps the copy of each in one file, chosen by `LANGUAGE`, and scenes read their strings from it.

The sizes above are for `SHORT_SIDE = 2160` in `src/video.ts`. Set it to `1080` only when the brief asks for 1080p: every frame size halves, `UNIT` becomes 1, and layouts written with `u()` don't change.

- **Everything is in frame px**, so a 4K frame is twice as many px as 1080p.
- **`UNIT`** is the short side divided by 1080, which is 2 in every format above. `u(n)` = `n × UNIT` lets you write sizes you think of in 1080p terms: `u(24)` is 48 px.
- **Library defaults** that are lengths (Drift amplitude, Ripple radius, Stage3D perspective, elevation shadows, SafeZone strokes, Grain size, blur thresholds) are 1080p values multiplied by the frame unit, so they look the same in every format.
- **Explicit props are always frame px.** `<Drift amplitude={16}>` moves 16 px.
- **Scale UI as a whole** with `transform: scale()` (text and vectors stay sharp), never the text alone. Copy the viewer must read should land at about `u(28)` or more.

---

## 5. Motion language

1. **Everything eases**: anticipation, then the move, then overshoot, then settle. `ease.linear` is only for constant spins, scrolls and marching dashes.
2. **Stagger and overlap.** Never move a group as a rigid block.
   - Stagger 2–4 frames between letters, words and rows; 4–8 between cards and tiles; 6–10 between big layers.
   - Start the next action before the last one settles (overlapping action).
   - Let secondary parts lag 2–6 frames (follow-through), like icons after their tile and shadows after their card.
3. **Anticipation.** Big moves dip back first: `ease.backIn`, `anticipate()`, or a 6–10 frame squash before a jump.
4. **Overshoot and settle.** Land with `springs.snappy` (UI), `bouncy` (pops, the CTA), `soft` (panels, camera) or `heavy` (weighty objects), or with `ease.backOut` / `backOutSoft` on interpolations.
5. **Motion blur on fast moves only** ([section 7.4](#74-motion-blur)): whips, flying cards, swooshes. Don't blur slow UI.
6. **Keep holds alive.** Nothing freezes. Use `Drift`, `Float` or `driftAt`, a slow push-in (1–3% over a hold), light sweeps, or a small pulse on the beat. Push in on images and cards; move text by translation only, since a slow scale on text ticks in Chrome. Hold a short readable line for at least 72 frames (1.2 s).
7. **Depth**: parallax layers (`Stage3D` + `Layer`, or `Parallax`), soft shadows (`elevation`, `liftShadow`) and light.
8. **Motivated transitions only**: match cuts, morphs, mask wipes and elements that carry over. No plain crossfades.
9. **Hit the music.** Land the impact of a move on the beat, not its start. Begin the anticipation 6–12 frames before, accelerate into the hit, overshoot just after, and settle within the next beat. For risers, build continuously across the whole range.

---

## 6. Scenes and time

- Main draws the global `Backdrop`, plays the scenes back to back in a `<Series>`, then draws the global `Grain`, the music and the optional safe-zone overlay. Scenes are **transparent**, so don't paint a full-frame background unless the storyboard asks for one.
- Each scene is wrapped in `<SceneRoot id from durationInFrames>`. Main passes the scene's start frame from `SCENE_LIST`; no scene table is hard-coded in the library.
- Each scene also has a standalone composition with the same id (`StandaloneScene` in `compositions/Main.tsx`). It draws the backdrop and grain at the scene's global offset and trims the music to it, so it renders pixel-identical to its slice of Main.
- `useCurrentFrame()` is the **local** frame (0 = the scene's first frame), both in Main and standalone.
- `useGlobalFrame()` is the frame of the whole video, and `useSceneFrame()` the frame from the scene start. Both are read from the scene root, so they're right inside your own nested `<Sequence>`s.
  - Inside `<MotionBlur>`, `<FreezeBlur>` or `<Freeze>`, animate from `useCurrentFrame()`, because the context frame is not time-shifted there.
- `foundation/timing.ts` converts between clocks: `toLocal(id, global)`, `toGlobal(id, local)`, `sceneBeats(id)` and `sceneAccents(id, type)`.
- Use `<Sequence from durationInFrames>` (with `premountFor` if it holds images; that only smooths the Studio preview, renders ignore it), or return `null`, so nothing invisible stays mounted.

---

## 7. Library API

Import everything from the barrel:

```ts
import {ease, springAt, stagger, PopIn, TextRoll, SampleBlur, Grain, SafeZone, useGlobalFrame} from '../lib'; // '../../lib' from src/scenes/<SceneId>/…
```

`start`, `exitAt` and similar props are local frames. Every frame-count default (durations, staggers, `blinkPeriod`, `period`) is a 60 fps value; at another frame rate, pass your own. `MotionShowcase` exercises every export, one board per 90 frames:

```sh
node scripts/contact-sheet.mjs --comp MotionShowcase --frames 60,150,240,330,420,510,600,690,780,870,960,1050,1140,1230,1320,1410
```

### 7.1 Curves and springs (`lib/motion.ts`)

| `ease.*` | Use |
|---|---|
| `out` | default entrance |
| `outSoft` | large surfaces |
| `in`, `inSoft` | exits |
| `inOut` | moves between rests |
| `whip` | fast swooshes |
| `backIn` | anticipation |
| `backOut` | overshoot landing |
| `backOutSoft` | text and UI overshoot |
| `backInOut` | both at once |
| `linear` | constant motion only |

| `springs.*` | Overshoot | Settles in | Use |
|---|---|---|---|
| `snappy` | ~6% | ~0.4 s | UI |
| `bouncy` | ~23% | ~0.8 s | pops, the CTA |
| `soft` | ~4% | ~0.85 s | panels, camera |
| `heavy` | ~10% | ~1.2 s | weighty objects |

```ts
springAt(frame, start, 'bouncy')                     // 0 → 1 with overshoot (0 before start)
springAt(frame, start, 'soft', {durationInFrames: 40, from: 0, to: 1, reverse: false})
springAt(frame, start, {damping: 8, mass: 1, stiffness: 120})   // custom config
springDuration('heavy')                              // frames to settle
progress(frame, a, b, ease.inOut)                    // eased 0..1 between frames, clamped
enter(frame, start, 24) / exit(frame, start, 14) / presence(frame, in, inDur, out, outDur)
stagger(i, 4, base, {count, from: 'center'})         // start frame of item i ('start' | 'center' | 'end')
anticipate(frame, start, duration, dip = 0.12)       // -dip … 1 with overshoot
wobble(frame, impact, {amplitude, frequency, decay}) // damped oscillation (secondary motion)
pulse(frame, at, attack, release) / pulses(frame, [ats])   // 0 → 1 → 0 bumps on beats
keyframes(frame, [[0, 0], [30, 1], [60, 0.4]], ease.inOut)
velocity(fn, frame)                                  // units per frame (central difference): drive blur from it
mix(a, b, t), clamp01(v)
lerpRect(a, b, t), rectCenter(r), rectStyle(r), flip(fromRect, toRect, t)   // FLIP morphs, transform-origin 0 0
```

### 7.2 Entrances, text and numbers

```tsx
<PopIn start={stagger(i, 5, 20)} preset="bouncy" from={{scale: 0.4, rotate: -10, y: u(30)}} exitAt={200} origin="50% 100%">…</PopIn>
<MaskReveal direction="up" start={10} duration={20} softness={u(40)}>…</MaskReveal>   // left right up down center-x center-y circle; exitAt wipes out in the same direction; progress = controlled
<TextRoll text={'Two lines\nof copy.'} mode="word" start={0} stagger={3} style={typeStyle('displayXL')}
          wordStyle={(w) => (w === 'copy.' ? {color: colors.accent} : undefined)} exitAt={200} />   // mode line | word | char (char only for scripts without shaping); direction; overshoot; tilt; align
<TypeOn text="Typed on whole frames" start={30} cps={24} caretColor={colors.accent} blinkPeriod={FRAMES_PER_BEAT} reserveWidth />
<CountUp to={12480} start={40} duration={50} prefix="$" />   <CountUp from={248} to={273} mode="roll" start={…} />
```

- `typedChars(frame, start, length, cps)` syncs other motion to `TypeOn`. `TypeOn` types one grapheme at a time, so `length` is the grapheme count (`text.length` for plain text).
- `TypeOn`'s caret is solid while typing, then blinks with `blinkPeriod` frames per on/off cycle (default 60).
- `countValue(frame, from, to, start, duration, easing)` and `formatNumber(v, decimals, separator, decimalSeparator)` back `CountUp`. `CountUp` takes `decimals`, `separator` and `decimalSeparator` in both modes; `mode="roll"` sits on the text baseline and rolls the fraction digits too.

### 7.3 Paths, accents, holds

```tsx
<DrawPath d={pathD} viewBox="0 0 24 24" strokeWidth={1.5} start={0} duration={36} fill={colors.accentSoft} />   // progress, fillAt; nonScalingStroke needs numeric width and height
<div style={{color: colors.accent}}><Ripple x={x} y={y} start={120} count={3} interval={6} /></div>         // currentColor; maxRadius, filled
<ShineSweep start={60} duration={36} radius={u(18)} repeatEvery={120}>…</ShineSweep>
<SquashStretch impact={120} intensity={0.25} axis="y" origin="50% 100%">…</SquashStretch>   // squashStretch(frame, impact) for your own transforms
<Drift seed="card" amplitude={u(8)} rotate={0.6} scale={0.01}>…</Drift>   <Float amplitude={u(10)} period={240}>…</Float>
```

- `driftAt(frame, opts)` is the pure version of `Drift`, and `useDrift(opts)` the hook.
- Drift runs on the global frame by default, so it's continuous across cuts. Pass `global={false}` for the local frame.
- A `transform` in the `style` of `Drift`, `Float`, `PopIn` or `SquashStretch` is kept: it is applied outside the animation, so a centring `translate(-50%, -50%)` still works.
- A `DrawPath` whose `d` has several subpaths draws them all at once, each from its own start.

### 7.4 Motion blur

| Tool | How | Use it for |
|---|---|---|
| `SampleBlur` | Explicit sample times from a **pure pose function** `render(t)`, centred on the frame, averaged by a binary tree | anything fast, and **always near a seam** |
| `FreezeBlur` | The same sampling for a subtree that animates from `useCurrentFrame()` (via `<Freeze>`) | fast subtrees you can't express as `render(t)` |
| `MotionBlur` | `FreezeBlur` with a fixed sample count, a shutter in degrees and an on/off `activeRange` | a fast subtree that needs blur on some frames only |
| `SmearBlur` | One render, an SVG Gaussian along x/y | straight horizontal or vertical moves of flat UI |

```tsx
const pose = (t: number) => cardPose(t);                                      // pure function of a (fractional) frame
const n = samplesFor(rectTravel((t) => pose(t).rect, g));                     // 1 when slow: renders sharp
<SampleBlur f={g} n={n} render={(t) => <Card pose={pose(t)} />} />
<FreezeBlur n={16}>…</FreezeBlur>
<MotionBlur samples={8} shutterAngle={180} activeRange={[40, 70]}>…</MotionBlur>
<SmearBlur x={Math.abs(velocity(xAt, frame)) * 0.35}>…</SmearBlur>
```

- **Why not `CameraMotionBlur`** (`@remotion/motion-blur`, which the library no longer uses).
  - `CameraMotionBlur` exposes `[f + 1 − shutter, f + 1]`, so the picture leads the frame by about 0.7 frame at 180° and jumps when the blur switches on or off.
  - It averages with 8-bit pre-scaled layers, which shifts colours slightly.
  - It **drops samples near frame 0 of its `<Sequence>`**, so the first frames of a scene lose their blur.
  - `SampleBlur`, `FreezeBlur` and `MotionBlur` centre their samples (±shutter/2) and average exactly. With `SampleBlur`, both scenes at a seam can use the same `f` and `n`.
- **Shutter.** `SampleBlur` and `FreezeBlur` take `shutter` as a fraction of a frame (default `SHUTTER = 0.5`, a 180° film shutter). `MotionBlur` takes `shutterAngle` in degrees, and rounds `samples` up to a power of two.
- **Sample count.** `samplesFor(travel)` spaces samples about `u(1.6)` px apart along the smear, capped at 32 and rounded up to a power of two. Under `u(4)` px of travel it returns 1, so the element renders sharp. Constants: `SAMPLE_SPACING`, `MAX_SAMPLES`, `MIN_BLUR_TRAVEL`; `sampleTimes(f, n)` gives the times.
- **Values that must not smear** inside `FreezeBlur`, like a counter's digits: read `useOuterFrame()`.
- **Slowly drifting text** snaps to whole pixels in Chrome. Append `useSubpixel()` to its transform (`Drift` and `Float` already do).
- **Inspection:** `<BlurOffContext.Provider value>` renders every `SampleBlur`, `FreezeBlur` and `MotionBlur` sharp.
- **Cost** is about samples × the child's cost. Wrap only the moving element, and keep blur off when it's slow.
- Inside a blur sample, `<Sequence>`s before their `from` render nothing, so samples taken before a Sequence starts are empty.

### 7.5 Depth and shadows

```tsx
<Stage3D camera={{x: camX, rotateY: -8, z: dolly}}>              // perspective defaults to 1800 × unit (3600 px at 4K)
  <Layer z={-u(400)} keepSize>{background}</Layer>               // keepSize reads the stage's perspective
  <Layer z={0}>{ui}</Layer>
  <Layer z={u(200)}>{chip}</Layer>
</Stage3D>
<Parallax depth={0.4} x={-camX} y={0}>…</Parallax>                // cheap 2D version
```

- Don't put `opacity`, `filter`, `overflow: hidden` or blend modes on the stage's world, because they flatten the 3D. Put them on layers.
- **Shadows.**
  - `elevation[0..5]` are box-shadow presets at the project's resolution.
  - `liftShadow(lift)` is continuous, from 0 (resting) to 1 (high).
  - `dropShadowFilter(1..5)` is a CSS filter that follows alpha, for SVG and cut-outs.
  - `makeElevation({ink: 'r, g, b', unit})` builds a brand-tinted set, and the other two take the same `{ink, unit}` options.

### 7.6 Frame-level pieces

- **`<Grain />`**: deterministic per-frame film grain with an overlay blend at 0.16.
  - It dithers gradients so they don't band, at about ±1–2 levels on near-white.
  - Each grain texel covers `round(UNIT)` px, so 4K grain has the same size relative to the frame as 1080p grain.
  - Main draws it once. Don't add your own. Props: `frameOffset`, `opacity`, `blend`, `scale`.
- **`<SafeZone preset={…} label />`**: the review overlay. Never leave it on in a final.
  - Presets: `'default'` is 5% on every edge. `'social-9x16'` is top 15%, bottom 35%, left 6% and right 15%, for TikTok, Reels and Shorts.
  - Pass custom margins `{top, right, bottom, left}` (fractions) for another platform, or an array to show several.
  - It sizes itself from `useVideoConfig()`.
- **Safe-zone helpers.**
  - `safeRect(width, height, preset)` returns the safe `Rect` (margins rounded outward).
  - `useSafeRect(preset)` is the same for the current composition.
  - `insideRect(r, container)` checks containment, and `SAFE_PRESETS` lists the presets.
  - `foundation/layout.ts` exports `SAFE`, the intersection of the project's `SAFE_ZONES`. Keep key text, captions, logos and the CTA inside it.
- **`SceneRoot`, `SceneContext`, `useScene`, `useGlobalFrame`, `useSceneFrame`**: see [section 6](#6-scenes-and-time).
- **`frameUnit(w, h)`, `useFrameUnit()`**: the reference unit of a frame size, or of the current composition.
- **`SheetLabel`**: the label strip composition for the contact sheet. Keep it registered in `Root.tsx`.

---

## 8. Determinism and assets

- Load fonts only through `foundation/fonts.ts`. It delays rendering until every face is ready and fails the render if a file is missing. Never substitute a typeface.
- Use `<Img src={staticFile('images/…')}/>` for images (Remotion waits for decode), and let the browser scale large images down rather than cropping them in code.
- Never measure the DOM at render time (`measureText`, `getBoundingClientRect`). Give geometry as constants.

---

## 9. Handoffs between scenes

Scenes are built in parallel and cut back to back. At every boundary F, the outgoing scene's last frame (F−1) and the incoming scene's first frame (F) must join seamlessly. **Never repeat a pose while anything is moving.** A held pair of frames in the middle of a move reads as a hitch, and with motion blur it shows as two sharp frames inside a blurred whip. Every seam is one of two kinds:

- **Rest.** The motion really comes to rest: ease to zero velocity over several frames before F−1, so the two equal frames are a settle. The next scene then departs with an ease-in or anticipation.
- **Pass-through.** F−1 and F are consecutive samples of **one trajectory**, with the same path, velocity and direction.
  - Share the trajectory function (a pure function of the global frame) between the two scenes, instead of a fixed pose.
  - Use **identical blur sampling** on both frames: `SampleBlur` with the same `n` from the shared pose, so the blur doesn't drop out on the boundary frame.
  - Don't use `MotionBlur` or `FreezeBlur` here: both sample through `<Freeze>`.
  - `<Freeze>`-based samples taken before a scene's frame 0 collapse onto one pose, so compute explicit sample times from the shared trajectory.

The foundation's handoff table (in `FOUNDATION.md`) gives, for every F, the kind of seam, the exact state or the shared trajectory function, and the helper both sides render. Copy blocks that stay on screen across a cut must match exactly on both sides.

**Check every seam.**

1. **A held pose.** Render a slice across the seam. Its report must say `no repeated frames`:

   ```sh
   node scripts/render-chunked.mjs --frames 900-1019 --name seam-960.mp4 --overwrite
   ```
2. **A jump.** PSNR across the cut, against the pairs beside it:

   ```sh
   node scripts/contact-sheet.mjs --comp Main --frames 958,959,960,961 --cols 4 --name seam-960
   ffmpeg -i out/seam-960-stills/f0959.png -i out/seam-960-stills/f0960.png -filter_complex "[0][1]psnr" -f null -
   ```

   Run it for the pairs 958/959 and 960/961 too. A cut pair several dB below the in-scene pairs is a jump.

---

## 10. Performance

- **Never render a long Main in one pass.** In one generation a 1080p Main crashed the Chrome tab about 760 frames in, with `Page crashed!` or, under `--log=error`, a silent stall that lasted hours. The frames that crashed rendered fine as stills, so the cause is browser and GPU load, not a broken frame.
  - Use `node scripts/render-chunked.mjs`. Its defaults are 480-frame chunks at concurrency 4.
  - At 4K each frame holds four times the pixels. If a chunk stalls or crashes, lower `--chunk` (240, then 120) and `--concurrency` before anything else.
- Keep `--concurrency` at 3 or less for scene drafts while other agents render in parallel.
- Most of the cost is blur samples, large `filter: blur()` and `backdrop-filter`. Restrict blur to the moving layer and the frames that need it. Prefer `SmearBlur` for straight moves.
- Animate `transform` and `opacity`. Avoid animating `width`, `height`, `top` or `left` on large trees, because they trigger layout.
- Profile a heavy scene on a `--frames` slice before rendering all of it.

---

## 11. Before you report done

1. `npx tsc --noEmit` passes.
2. Render your scene, and a contact sheet with `--safe` that covers zooms and fast moves.
   - Inspect the full-resolution stills (in `out/<name>-stills/`) for blur, pixelation, jagged edges and banding.
   - No key text, caption, logo or CTA may cross the safe zone.
3. Check your first and last frames against the handoff table, as in [section 9](#9-handoffs-between-scenes).
4. Check the render: every check passes, and you intended every hold it lists:

   ```sh
   node scripts/check-video.mjs <SceneId>-draft.mp4 --comp <SceneId>
   ```
5. If the brief lists several deliverables, repeat steps 2 to 4 for each orientation, and render a contact sheet for each other language (see "Another deliverable" in [section 2](#2-run-preview-render)).
6. Return a short summary covering:
   - what you built and the render paths
   - anything you couldn't do
   - anything the library or foundation should gain

---

## 12. FOUNDATION.md

The foundation agent writes `FOUNDATION.md` next to this README in the generation's copy. It covers everything brand- and video-specific, so a scene agent needs only this README, `FOUNDATION.md`, the brief and the storyboard:

- **Tokens:** names and values, which colour does what, and the hero colour's rules.
- **Type:** the video type scale (style, size, line height, weight, use), the fonts loaded and their licences, and capitalisation rules.
- **Timing and beats:** BPM, beat and bar frames, the beatmap helpers, the scene table with global frames, and the key hits per scene (global and local frames).
- **Layout:** the safe zones of each target platform in px, the layout presets and copy slots, and the UI scale factors.
- **UI kit:** every component rebuilt from the product: its props, parts, geometry helpers, and the fictional data to use on screen.
- **Handoff table:** for every boundary F, the kind of seam (rest or pass-through), the state or shared trajectory on F−1 and F, and the helper both sides render.
- **The look:** the backdrop, its moods and anything global that scenes design around.
- Known simplifications, and what scene agents must not show (real personal data, real partners).

---

## 13. Changing the library

- **In a generation:** `src/lib/` is read-only. A bug fix is made by the main session in both the generation's copy and `remotion-starter/src/lib/`.
- **Promotion:** when a generation builds something generic the library lacks, the main session ports it to `remotion-starter/src/lib/` once the generation is done. It exports it from `src/lib/index.ts`, adds a cell to `MotionShowcase`, documents it here, and checks `npx tsc --noEmit` plus a contact sheet in all three formats.
- **Versions:** changing a dependency means updating `package.json` and running `npm install --package-lock-only`, so `npm ci` keeps working. Existing generations keep their own copies and versions.
