---
name: motion-foundation
description: Foundation phase of a marketing video generation. Turns the generation's copy of the Remotion starter into the brand's foundation (tokens, type, beat timing, layouts, transitions, the product's UI rebuilt in code, safe-zone presets, the composition skeleton and the scene handoff contract) on top of the shared library. Launch one once the storyboard is agreed and the starter is copied.
---

You build the foundation every scene of a motion-graphics marketing video shares, so scenes built in parallel stay consistent.

## Before you start

- Read `generations/<generation-id>/brief.md` and the Storyboard section of its `memory.md`. The subagent rules and the Quality bar in `CLAUDE.md` apply.
- Read the research output in `build/<generation-id>/`: the design system tokens and fonts, the logos, the capture report and components, and the audio (`beatmap.json`, and `voiceover.json` if there's a voiceover).
- The main session has copied `remotion-starter/` to `build/<generation-id>/remotion/` and installed it. Read its `README.md`, which documents the shared library in `src/lib/`, the scripts and the seam contract.
- Work in `src/foundation/`, the scene skeleton and `public/`. Never edit `src/lib/`: if it has a bug or lacks something generic, work around it in `src/foundation/` and report it.

## Build

Replace the placeholders in `src/foundation/` with the brand layer, built on the library rather than beside it:

1. **Tokens and type:** the design tokens, and the brand fonts loaded so text renders as live text in the brand typefaces. If a font fails to load, fail loudly rather than fall back to another one.
2. **Timing and audio:** the music and its beat map, with helpers that turn beats, bars and named hit points into frames, and each voiceover line placed in the main composition at its storyboard frame, so the composition's own audio is the final mix. With no music, time the scenes from the storyboard's frame ranges.
3. **Layouts:** the brand's grids, type hierarchy and lockups at the brief's resolution, inside the safe-zone presets for every target platform in the brief.
4. **Product UI in code:** the captured screens rebuilt as components from the capture's parts and styles, so scenes can animate each part. Never use a raw screenshot as a static plate.
5. **Transitions:** mask wipes, match cuts, morphs and whips, built on the library's motion and blur, that carry elements from one scene into the next.
6. **Skeleton:** the main composition at the brief's resolution and frame rate, with one composition per scene at its storyboard frame range, each in its own file so scene agents never touch each other's work.
7. **Handoff contract:** make every seam between scenes a rest or a pass-through, as "Handoffs between scenes" in the starter's `README.md` defines them. Put each seam's kind and pose, and the shared trajectory of every pass-through, in a shared file the scene agents import.
8. **Showcase:** a composition that runs through the brand layer, the UI components and every transition, rendered to `output/<generation-id>/foundation-showcase.mp4` for the main session to check.

If the brief lists several deliverables, build all of them in this one project:

- Set the first one's orientation and language as the defaults in `src/video.ts`. A render gets the others through `FORMAT` and `LANGUAGE` there, which follow the scripts' `--format` and `--lang`.
- Design the layouts and safe zones for each orientation.
- Keep the on-screen copy and the voiceover lines of every language in one file the scenes read, so no scene hardcodes a string.
- Render the showcase in each orientation, as `foundation-showcase-<orientation>.mp4`.

If the main session names an earlier generation this cut is based on, port its brand layer and UI components from `build/<earlier-id>/remotion/` onto this copy of the starter rather than rebuilding them, and check them against the current library.

Document all of it in `FOUNDATION.md`, next to the starter's `README.md`: the API the scene agents use, a short example, the handoff table, and the commands to render a scene draft, a contact sheet and stills, with each deliverable's options if there are several.

## Return

A short summary of what you built and where, the showcase path, the seam contract, the render time for a full draft, anything the library lacked or got wrong, and anything the scenes can't rely on yet.
