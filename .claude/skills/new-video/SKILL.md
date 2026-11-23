---
name: new-video
description: Start a new marketing video generation. Runs intake (the inputs, the tools they need and a name for the generation), creates the generation folders, fills in the creative brief and starts production. Use when someone asks for a new video, reel, promo, trailer or App Store preview.
argument-hint: "[what the video is about]"
---

# New video

The request: $ARGUMENTS

## 1. Intake

1. Note which of the [inputs](#inputs) the request, and anything the user shared, already answers, and check the [tools](#tools) every generation needs.
2. Send one message that asks for every missing input and tool, and for a short name for the generation, with a suggestion based on the scope. Suggest a format and duration that suit the platform. Don't guess paths, URLs or credentials.
3. As soon as the user gives the name, create the [generation folders](#2-generation-folders) and write each answer into `brief.md` as it comes in. Check the app's tools once you know which app there is, and ask again for anything still missing.

A generation makes one cut ("Generations" in `CLAUDE.md`). If the answers ask for several orientations or languages, list each combination as a deliverable in `brief.md`, with the one to build first at the top. If they ask for several durations, each is a generation of its own: agree with the user which to make first, and start the others as [another cut](#another-cut-of-an-earlier-generation) once its research is done.

### Inputs

1. **Scope:** what the video introduces (a product, feature, release or campaign). It fills the brief and the filename.
2. **Target platform:** where the video will run: YouTube, LinkedIn, Instagram, TikTok, an App Store preview, a website, or several. The platform decides orientation, length, safe zones, captions and file size limits. If there are several, each may need its own orientation, which makes it a deliverable, or its own length, which makes it another generation. An App Store preview must follow Apple's current App Preview specifications, which override the resolution and frame rate in the Quality bar.
3. **Format and duration:** orientation and length. Without other requirements, use the Quality bar's defaults: 2160p, 60 fps, H.264 MP4.
4. **Design system:** URL or path to the design system to use (Figma, Storybook, tokens, brand guidelines), plus the brand font files (OTF, TTF or WOFF2) or where to get them. They're the client's own, so don't ask about their license.
5. **Marketing materials:** URL or path to existing materials (PDFs, docs, decks, copy).
6. **Logos:** URL or path to logo files. Prefer SVG or other vector formats.
7. **Features to present:** a list, or "decide for me". If Claude decides, `marketing-research` proposes a shortlist during research, and the user confirms it before the app capture and the storyboard.
8. **Audio:** the music, which is either generated (for example with ElevenLabs, or in code), sampled from an external source (file path or URL, plus its license) or none, and whether there's a voiceover and sound effects. ElevenLabs needs `ELEVENLABS_API_KEY` in `.env`.
9. **App access:** whether there is an iOS, Android or web app. If there is, ask:
   - how to boot the simulator or emulator locally (build commands, scheme, device)
   - the URLs of the web app
   - for the username and password of a demo account, put in `.env` as `APP_USERNAME` and `APP_PASSWORD`. Never ask for the values in the chat.
   - what the video may show: the fictional persona and sample data to use, and anything that must never appear

   Explain that screenshots and recordings show whatever the account holds, and that they can end up in the video and in committed files, so a real account can leak names, emails and other personal data. The account must be a demo account that holds only demo data. Ask the user to confirm this before any capture, and record the confirmation in `brief.md`.
10. **Call to action and end card:** what the viewer should do after watching, and what the last frame shows: a URL, App Store or Google Play badges, a tagline, or nothing.
11. **Captions and language:** the language of the on-screen text and any voiceover, with one video per language if there are several, and whether the voiceover gets captions: burned in, a sidecar `.srt` file, both, or none.
12. **Audience, tone and references (optional):** who the video is for, the tone to strike (for example playful, premium or technical), and links to videos whose style to follow. If the user skips this, infer the audience and tone from the marketing research and mark them as inferred in `brief.md`.

### Tools

- every generation: `command -v node ffmpeg ffprobe git-lfs`
- `.env`: it defines each variable the inputs need. Check without printing the value, for example `grep -c '^APP_USERNAME=.' .env`.
- iOS app: `xcrun simctl list runtimes` lists a runtime for the device. It needs the full Xcode, not just the command line tools.
- Android app: `command -v adb emulator`, and `emulator -list-avds` lists an image. They must be on the `PATH`, because the pre-approved commands in `.claude/settings.json` match only the bare names. If the Android SDK is in `~/Library/Android/sdk` but not on the `PATH`, ask the user to add it rather than calling the tools by their full path.
- web app: nothing to check at intake. Install Playwright with npm in `build/<generation-id>/capture/` before launching `app-capture`.

If a tool is missing, ask the user to install it and point them to the commands in the README. Don't install system tools without the user's go-ahead. Packages installed with npm inside `build/<generation-id>/` don't need asking.

## 2. Generation folders

Slugify the name as "Generations" in `CLAUDE.md` describes, then create the folders:

```sh
id="<slug>_$(date +%Y%m%d-%H%M%S)"
cp -R generations/_template "generations/$id"
mkdir -p "build/$id" "output/$id"
```

Fill in the generation ID and start date in `brief.md`.

### Another cut of an earlier generation

When the request is another cut for the same client and product, such as a different duration or a different story, it's a new generation that reuses the earlier one's research:

- Ask only for the inputs that differ. Copy the rest from the earlier `brief.md`, and record the earlier ID under "Based on".
- Copy the research the new cut can use from `build/<earlier-id>/` to `build/<new-id>/`: `design-system/`, `logos/`, `marketing/` and `capture/`. Mark those workstreams `done` in the new `memory.md`, with "copied from `<earlier-id>`" as the output. Raw captures are gitignored, so they are there to copy only on the machine that made them.
- Run `marketing-research` or `app-capture` again only for features the earlier cut didn't cover.
- The music, the storyboard and the Remotion project are new. Copy the project from `remotion-starter/` as usual, and give `motion-foundation` the earlier ID, so it ports the brand layer and the UI components from `build/<earlier-id>/remotion/` rather than rebuilding them.

## 3. Brief and production

Once intake is complete, fill in the creative brief in `brief.md`, set the status in `memory.md` to `in production`, and run the phases in "Production with subagents" in `CLAUDE.md` in order.
