# Cutline - a Claude marketing video generator

It's a playbook that turns an AI assistant into a small video studio that makes polished, animated marketing videos for our products.

## Two ways to use it

| | 1. This repo | 2. The skill |
|---|---|---|
| How | Clone the repo and run `claude` inside it | Copy one file, `SKILL.md`, into `~/.claude/skills/` and run `claude` in any folder |
| Start a video | `/new-video`, `/resume-video` | `/cutline-video-lite`, or just ask for a marketing video |
| Workers | A team of agents, research and scenes built in parallel | One Claude session does every step in order |
| Product screens | iOS simulator, Android emulator, or web app | Web app, or screenshots you provide |
| Audio | Music, voiceover and captions | Music only |
| Versions per run | Several orientations and languages from one cut | One orientation, one language and one length |
| Building blocks | A shared motion library and tested render and check scripts | Claude writes a small Remotion project and its helpers on each run, so results vary more |
| Review | A fresh agent reviews every draft | Claude checks its own drafts, at most 3 |
| Best for | The full studio, on our machines | Handing the workflow to someone else quickly |

Both use the same Quality bar (4K, 60 fps, safe zones, beat-synced motion) and keep each video's brief and memory in `generations/`, so a video can be picked up again later.

### 1. Use this repo

Clone it, install the [tools](#tools), then run `claude` in the repo folder. Type `/new-video` to start a video, or `/resume-video` to pick up an earlier one. Everything below [Setup](#setup) describes this way.

### 2. Use the skill

`skills/cutline-video-lite/SKILL.md` is the whole workflow in a single file that you can share on its own; no clone, no agents. On each run it creates everything it needs: the folders, the brief and memory files, and a small Remotion project from code embedded in the file. It renders and checks with plain ffmpeg and Remotion commands.

```sh
mkdir -p ~/.claude/skills/cutline-video-lite
cp skills/cutline-video-lite/SKILL.md ~/.claude/skills/cutline-video-lite/
brew install node ffmpeg
```

Then open `claude` in any folder and type `/cutline-video-lite`, or just ask for a marketing video.
- **Where it works:** `./cutline/` inside that folder, so it never mixes its files with your code.
- **Keys and the demo account:** they go in `./cutline/.env`; the skill tells you the exact path.
- **Platform:** made for macOS. Linux may work, and Windows isn't supported.

## Setup

### Tools
The tools a video needs depend on what it captures. Claude checks for them when a video starts and asks you to install anything that's missing.

| Tool | Needed for | Install |
|---|---|---|
| Node (current LTS) | rendering and capture scripts | `brew install node` |
| ffmpeg | encoding and render checks | `brew install ffmpeg` |
| Xcode and a simulator runtime | iOS app capture | Xcode from the App Store, then the iOS runtime in Xcode › Settings › Components |
| Android SDK (`adb`, `emulator`) and an emulator image | Android app capture | `brew install --cask android-studio`, then create a device in Android Studio's Device Manager |

Web app capture uses Playwright, which each generation installs with npm.

Videos render with [Remotion](https://www.remotion.dev/license), which is free for individuals and small teams and needs a company licence beyond that. Check once that the organisation's licence covers this use.

`xcrun simctl` needs the full Xcode, not just the command line tools. If `xcode-select -p` doesn't point into `Xcode.app`, run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.

Android Studio installs the SDK in `~/Library/Android/sdk` but doesn't put it on the `PATH`. Claude's pre-approved commands only match the bare `adb` and `emulator` names, so add this to `~/.zshrc`:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

## How a video gets made
Each video task will get own brief/memory/assets saved into a generations/ folder. Why ? The reason is that you can pick up where you left off by telling it which generation to use, and add an extra feature to an existing video more easily.
Before you start you need to create the Brief, ask the agent what it needs, those answers will guide the flow. I've made it highly customizable from the get-go.
One generation makes one cut of a video. The same cut can come out in several orientations and languages; a different length is a new generation, which reuses the first one's research.

Type `/new-video` to start a video, or `/resume-video` to pick up an earlier one. Each step of production has its own agent in `.claude/agents/`.

## Product Screenshots
- it can use the iOS/Android simulator on the device
- it can use a web application locally or live, through Playwright
- user credentials can be added/extended per use into the .env

## Audio
- normal non-licensed beats from Claude
- or you can plugin an MCP or another API (by default i left ElevenLabs integration)
- Instead of background voice via ElevenLabs it can narrate

## Assets
The simplest way is to create a Design System in Claude Design by pointing it to a website, then this agent can use that Design System.

## Process

1. The brief. Someone asks for a video. Like a real agency, the AI first asks a set of questions: what's the video about, where will it be posted (TikTok, YouTube, LinkedIn…), how long should it be, what are the brand colors and fonts, which features should it show, what music or voiceover, and what viewers should do at the end.
2. Research. Several AI helpers work at the same time. One studies the brand's look, one reads the existing marketing material, one collects the logos, one opens the real app and takes screenshots, and one makes the music.
3. Storyboard. The AI writes a scene-by-scene plan with timings and on-screen text, set to the music. A person approves it, and listens to the music, before anything gets built.
4. Foundation. One helper builds the brand's building blocks: colors, type, the product's screens rebuilt in code, and the transitions.
5. Scenes. Helpers build each scene in parallel, all from the same building blocks, so the scenes match.
6. Draft and review. The scenes are put together into a full draft, and a helper that hasn't seen the work critiques it, like a second pair of eyes. Fixes and new drafts follow until the review finds nothing that must change.
7. Final render. The last draft becomes the final video file, with a poster image.
8. Your review. You watch it and ask for changes until you approve it.
