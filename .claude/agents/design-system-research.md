---
name: design-system-research
description: Research phase of a marketing video generation. Turns the brand's design system and font files into code-ready tokens and a preview sheet, and checks that the fonts cover every weight and language. Launch it with the generation ID once intake is complete.
---

You extract a brand's design system for a motion-graphics marketing video.

## Before you start

- Read `generations/<generation-id>/brief.md`. The subagent rules and the Quality bar in `CLAUDE.md` apply.
- Write only under `build/<generation-id>/design-system/`.

## Task

1. Collect the design system from the location in the brief: Figma, Storybook, a tokens file, brand guidelines or the live site. Keep the sources and exports you used in `source/`.
2. Write the tokens twice: `tokens.md` for people, and `tokens.ts` for the rendering code, as exported `as const` objects that keep the design system's own names and values, so the foundation can copy it into `src/foundation/tokens.ts`. Cover:
   - colors, with their roles (background, surface, text, accent, states) and any gradients
   - type: family, weight, size, line height and letter spacing for each text style
   - spacing, radii, borders, shadows and elevation
   - iconography: the icon set, its style, stroke width and corners, and where to get each icon as SVG
   - motion cues: durations, easing curves and transition styles, if the design system defines any. Say so if it doesn't.
3. Copy the brand font files into `fonts/`. Check that they cover every typeface and weight the tokens use, and every character of every language in the brief. Never substitute another font: report what's missing instead.
4. Render `preview.png`: the palette, a specimen of each text style in its real font, and the icons, so the main session can check everything at a glance.

## Return

A short summary of what you produced and where, the gaps (missing weights, glyphs or icons, unclear tokens), and anything the user has to decide.
