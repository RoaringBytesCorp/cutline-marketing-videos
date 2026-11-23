# Cutline: Marketing Videos

This is a Claude helper for producing professional motion-graphics marketing videos.

To start a video, follow the `new-video` skill: intake, tools, folders and brief. To continue an earlier one, follow `resume-video`. Both lead into the [production phases](#production-with-subagents).

## Folders

- `generations/<generation-id>/`: the memory of each generation (see [Generations](#generations)). Committed.
- `build/<generation-id>/`: every asset and resource the generation needs, such as logos, design tokens, marketing extracts, app captures, audio sources and scene source files. Committed, except the raw app captures (`capture/screens/`, `recordings/`, `components/` and `assets/`), which `.gitignore` keeps local because they show the account's data. Binary files go through Git LFS by extension (see `.gitattributes`); when a workstream adds a binary format not listed there, add it before committing.
- `remotion-starter/`: the Remotion project every generation renders from. It holds the shared motion library in `src/lib/` (easing curves, springs, motion and type primitives, motion blur, grain and the safe-zone overlay), placeholder brand files in `src/foundation/`, and the chunked render, contact sheet and video check scripts in `scripts/`. Its `README.md` documents the library and the commands. Each generation works in its own copy in `build/<generation-id>/remotion/`, so changing the starter never changes an existing generation. Committed.
- `output/<generation-id>/`: what the generation delivers and reviews: final videos, named as below, plus drafts, reviews and contact sheets. Never put files directly in `output/`, and never write videos anywhere else. Committed, with binaries in Git LFS. Full-resolution stills and frame sequences can be rendered again, so they stay in the Remotion project's gitignored `out/` unless one is evidence worth keeping. Anything holding real personal data, such as an account page screenshot, goes in `output/<generation-id>/capture-private/`, which is gitignored.
- `.env`: API keys and app credentials. It is gitignored. `.env.example` is committed and lists every variable name; copy it to `.env` and fill in the values. When a workstream needs a new key, add its name to `.env.example`. Scripts load the file themselves (`node --env-file=.env <script>`). Never print the values, `cat` or `source` the file, or write the values anywhere else.

### File naming

Name each video `[scope]_[duration]_[orientation]_[timestamp].[extension]`.

| Field         | Format                                                 | Example           |
|---------------|--------------------------------------------------------|-------------------|
| `scope`       | lowercase kebab-case slug, made like a generation name | `onboarding-flow` |
| `duration`    | whole seconds followed by `s`                          | `30s`             |
| `orientation` | `landscape` (16:9), `portrait` (9:16), `4x5` (4:5)     | `portrait`        |
| `timestamp`   | local render time, `date +%Y%m%d-%H%M%S`               | `20261118-101530` |
| `extension`   | container format, `mp4` by default                     | `mp4`             |

Example: `output/onboarding-flow-v2_20261117-143005/onboarding-flow_30s_portrait_20261118-101530.mp4`

`_` is the field separator, so no field may contain an underscore.

For a video made in more than one language, end the scope with the language code, for example `onboarding-flow-de`. A sidecar caption file takes the video's name with a `.srt` extension. A smaller copy made only so the user can open or send the video takes the video's name with `.preview.mp4`; it isn't the deliverable.

Every final render ships with a poster frame named like the video, with a `.jpg` extension. It's a full-resolution still of a frame that stands for the whole video, such as the hero shot or the end card, taken at rest rather than mid-move. Render it from the source; don't grab it from the encoded video.

## Generations

Each video request is a generation: one thread of work, which may produce several renders and revisions. Its folder in `generations/` holds its memory, so the thread can be picked up again in a later session.

A generation makes one cut: one duration, one storyboard and one music track. If the brief asks for several orientations or languages, each combination is a deliverable of that cut (see [Several deliverables](#several-deliverables)). A different duration is a different cut, so it gets a generation of its own, which reuses the first one's research as the `new-video` skill describes.

- **ID:** `[name]_[timestamp]`. `name` is a short name the user chooses for the generation, slugified: lowercase it, strip accents, replace every run of characters other than `a-z` and `0-9` with a single `-`, and trim hyphens from both ends. `timestamp` uses the format from the naming table and the time the generation started. Example: "Onboarding Flow v2!" becomes `generations/onboarding-flow-v2_20261117-143005/`.
- **`brief.md`:** the user's answers to the intake questions and the filled-in creative brief. If an answer changes later, update it here and note the change in `memory.md`.
- **`memory.md`:** the running state of the generation: status, next steps, open items, decisions, workstreams, storyboard, renders, and a dated log of user feedback, problems and what was done.

Keep `memory.md` current while you work, not only at the end. After each meaningful step (an agent finished, storyboard agreed, feedback received, render finished), add a log entry, with its time taken from `date '+%Y-%m-%d %H:%M'` rather than estimated, and update "Current state" and the Workstreams table, so an interrupted session can resume without redoing finished work. Record user feedback close to their own words.

Never write credential values, or personal data found in captures, in these files or in any other tracked file. Record the kind of data and where it's kept instead, for example "in `.env` as `APP_PASSWORD`" or "the account page shows an email and card digits; screenshot in `capture-private/`".

## Production with subagents

The main session coordinates and subagents do the heavy lifting. Only the main session talks to the user and writes `brief.md` and `memory.md`, so parallel agents never overwrite each other.

Each workstream has an agent in `.claude/agents/`, named in the phases below, and its definition holds its standing instructions. Launch each agent by name. Agents don't see the conversation, so give each one a self-contained prompt with:

- the generation ID
- one narrow task and the inputs it needs
- anything the task depends on that isn't in the generation's files yet

When an agent's standing instructions change, edit its definition rather than repeating the change in every prompt.

Launch independent agents in one message so they run in parallel. Do small tasks, like a single tweak or re-render, directly instead of spawning an agent.

Background agents can't answer permission prompts, so the commands they run are pre-approved in `.claude/settings.json`. If a workstream needs a tool that isn't listed there, add it before launching the agent.

1. **Research (parallel)**, as soon as intake is complete:
   - **Design system (`design-system-research`):** the tokens, the fonts and a preview sheet.
   - **Marketing materials (`marketing-research`):** key messages, proof points, and each feature with its evidence. If the brief says "decide for me", it ends with a feature shortlist: confirm it with the user and write it into `brief.md`.
   - **Logos (`logo-research`):** every variant needed, as vectors where possible.
   - **App capture (`app-capture`):** screenshots, recordings and animatable components of each feature, so launch it once the feature list is in the brief. It is the only agent that uses the app credentials, which its scripts read from `.env`.
   - **Audio (`audio-production`):** the music track, its beat map and a preview. Voiceover waits for the script.

   Meanwhile, copy the starter with `cp -R remotion-starter build/<generation-id>/remotion` and run `npm ci` in the copy. When research returns, write what it settled into `brief.md`, such as the confirmed features or an inferred audience and tone.
2. **Storyboard (main session):** combine the research into a scene list with frame ranges, copy and transitions, pitched at the brief's audience and tone and ending on its call to action. Put scene boundaries and key moments on the bars and hit points of the beat map, and write each scene's voiceover line if there's a voiceover. Most social video autoplays muted, so the on-screen copy must carry the message without sound, with the voiceover supporting it rather than replacing it. Write the storyboard into `memory.md` and confirm it with the user in one message, together with the music preview for them to listen to. Once they approve, the track and the frame ranges are locked. If there's a voiceover, launch `audio-production` again with the agreed script, and fit each scene to the measured line lengths in `audio/voiceover.json` before the foundation starts. Keep the storyboard current: when a later fix changes copy, timing or a transition, update it, because scene and review agents work from it.
3. **Foundation (one `motion-foundation` agent):** it turns the copy of the starter into the brand's foundation, the pieces every scene shares, so parallel scenes stay consistent, and documents them in `build/<generation-id>/remotion/FOUNDATION.md`. Check its showcase before launching the scenes, because a flaw here is repeated in every scene.
4. **Scenes (parallel `scene-builder` agents):** one agent per scene, or per group of short scenes. Give each its scene IDs and a render concurrency that lets the agents share the machine. Give both scenes of a pass-through seam to one agent, unless the foundation already defines the trajectory they share. When an agent reports a problem in the foundation or the library while others are still running, fix it once and send the fix to the running agents, so each scene doesn't build its own workaround.
5. **Draft (main session):** render the full cut with `node scripts/render-chunked.mjs --draft` from `build/<generation-id>/remotion/`. It writes `output/<generation-id>/draft-v<n>.mp4` at the final resolution and frame rate, with the composition's own audio mix, and checks the result (add `--silent` if the brief has no audio). Never render the full cut in a single `npx remotion render` pass: long renders stall or crash Chrome. Then render a contact sheet with the safe zones on (`node scripts/contact-sheet.mjs --comp Main --every 60 --safe`).
6. **Review (fresh `video-review` agent):** give an agent that hasn't seen the work the draft's path and number, the contact sheet, and the previous review if there is one. Give it the output, not your opinion of it. The main session decides which fixes to make, makes them directly or through `scene-builder` agents, renders the next draft and has a new fresh agent review it, until a review has no must-fix finding. If a pass fixed only things a measurement can confirm, such as a seam, a held frame or an encoding fault, confirm them with `node scripts/check-video.mjs` instead of another review.
7. **Final render (main session):** `node scripts/render-chunked.mjs --final <scope> --poster <frame>` renders the final under the naming convention, with its poster frame. Write the `.srt` from the voiceover lines and their start times if the brief asks for one, then run the checks in [Before a render is called done](#before-a-render-is-called-done).
8. **User review (main session):** give the user the render's path, set the status in `memory.md` to `in review` and ask for feedback. List any on-screen copy or claim that wasn't in the storyboard they approved, so they can confirm it. Decide the fixes, make them, and render again under a new timestamp so earlier renders are kept. Repeat until the user approves, then set the status to `done` with the approved render as the latest. If the user asks for changes to a `done` generation later, set it back to `in review`.

Agents never edit `src/lib/` in a generation's copy. If it has a bug, the main session fixes it there and makes the same fix in `remotion-starter/`. When a generation builds something generic that the library lacks, the main session ports it into `remotion-starter/src/lib/` once the generation is done, so the next generation starts with it.

### Several deliverables

When the brief lists more than one orientation or language, all of them come from the one storyboard, track and Remotion project:

- **Names:** name each deliverable by what varies: the orientation, the language code, or both, for example `portrait`, `de` or `portrait-de`.
- **Storyboard:** write each scene's copy and voiceover line in every language, and fit the scene to its longest line.
- **Foundation and scenes:** built once, for every deliverable: the layouts and safe zones of each orientation, and the copy of each language.
- **Phases 5 to 8:** run them once per deliverable. Pass its `--format <orientation>` and `--lang <code>` to the render, contact sheet and check scripts, also for the first deliverable. They name its drafts `draft-<deliverable>-v<n>.mp4`, and `--lang` ends the final's scope with the language code. Its reviews go in `review-<deliverable>-v<n>/`. Take the first deliverable through its review before drafting the others, so a fix they all share is made once.
- **Done:** when the user has approved every deliverable.

### If you are a subagent

These rules apply to every agent in `.claude/agents/`, on top of its own definition:

- You work for the main session, which coordinates the generation and talks to the user. You don't see that conversation, so everything you need is in your definition, the main session's message and the generation's files.
- Read `generations/<generation-id>/brief.md` first, and follow the [Quality bar](#quality-bar).
- Write only in the folders your definition names. Never edit `brief.md` or `memory.md`.
- A `cd` doesn't carry over to your next shell call. Type each command for the Remotion project as `cd build/<generation-id>/remotion && <command>`, with no absolute script path, `--prefix` or shell redirect, so it matches the pre-approved commands. If you need a command that `.claude/settings.json` doesn't allow, report the exact command rather than working around it.
- Return a short summary of what you produced and where, plus anything you couldn't do.

## Creative brief

Once the inputs are collected, fill in this brief and follow it. `[Duration]` and `[Scope of the video]` come from the brief's format and scope.

> Make a dynamic [Duration] motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. Go all out. Make it a video to introduce [Scope of the video]. Use actual product screenshots, logos and assets provided. Do it like a real professional production video, not like a demo or prototype. Add more animation and motion design. Avoid using screenshots raw; instead, break them down into components and icons so we can animate those too. Make the motions more juicy. Use the best motion design techniques you can.

## Quality bar

Every video must look like a professional studio production, not a demo. Production agents follow this section and the review agent checks against it.

### Resolution and assets

- Render at 2160p (3840×2160 landscape, 2160×3840 portrait, 2160×2700 4:5) at 60 fps unless the user asks for something else. An App Store preview follows Apple's current App Preview specifications instead.
- Use the highest-resolution source of every asset. Logos, icons and UI components should be vectors (SVG) or rebuilt in code so they stay sharp at any scale.
- Raster images must be at least 2× their largest on-screen size, including at the peak of a zoom. Never upscale a low-resolution image: recapture it, find a better source, or rebuild it as a vector.
- Capture apps at native resolution: iOS simulators at @3x, Android emulators at xxxhdpi, web pages at a device scale factor of 2 or more.
- Set text as live text in the brand typefaces, never baked into an image. Never substitute another typeface without the user's agreement. If a font is missing, or lacks the glyphs for a language in the brief, ask.
- Encode with H.264 High profile, CRF 16 or lower, `yuv420p`, BT.709 color and `-movflags +faststart`. Add subtle grain or dither to large gradients so they don't band.

### Usage rights

- The logos, fonts, design system, marketing materials and app the client provides are the client's trademarks and property, so use them in its videos without asking about licenses. Keep them in that client's generations: never copy them into `remotion-starter/` or into a generation for another client.
- Anything else, such as an external audio sample, stock footage or images, or a third-party icon set, needs a license that covers this use. Record where it came from and its license next to it in `build/<generation-id>/`.
- Take App Store and Google Play badges only from Apple's and Google's official artwork.

### Safe zones

- Keep key text, captions, logos and the call to action inside the safe zone of every target platform, clear of the interface the platform draws over the video. Backgrounds and motion can still run to the edges.
- Check each platform's current guidance. Defaults: for 9:16 video on TikTok, Instagram Reels and YouTube Shorts, keep the top 15%, bottom 35%, left 6% and right 15% clear. For every other format, keep a 5% margin on each edge.

### Animation

- Ease everything with custom curves or springs, using anticipation, overshoot and settle. Use linear motion only for constant spins and scrolls.
- Layer the motion: stagger groups and add overlapping action, follow-through and secondary motion so nothing moves as a rigid block.
- Add motion blur to fast movement.
- Keep the frame alive. During holds, use slow drift, parallax or light changes instead of a frozen frame, and keep text on screen long enough to read.
- Build depth with parallax layers, perspective, shadows and light.
- Motivate every transition: match cuts, morphs, mask wipes, and elements that carry over between scenes. Avoid plain crossfades and unmotivated cuts.
- Hit key moments on the beats of the music.
- Render frame by frame with deterministic timing; never screen-record an animation in real time. The output must have no stutter, dropped frames or jitter.

### Before a render is called done

- Run `node scripts/check-video.mjs <file>`. It checks the encoding, the resolution, the frame count, the audio, and that frame timing is even with no repeated frame inside a move. It also lists the stretches where nothing moves: check that each is an intended hold.
- Extract full-resolution stills from several moments, especially zooms and fast moves, and inspect them for blur, pixelation, jagged edges and banding.
- Overlay the safe zones on a contact sheet and check that no key text, caption or logo crosses them.
- Check that the file is within the size limit of each target platform in the brief.

Fix every failure and re-render before reporting the video as finished.
