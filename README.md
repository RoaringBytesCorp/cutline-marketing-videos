# Cutline - a Claude marketing video generator

It's a playbook that turns an AI assistant into a small video studio that makes polished, animated marketing videos for our products.

## Setup
Binary assets in `build/` and renders in `output/` (audio, images, fonts, video, PDFs) are stored with Git LFS. Install it once before cloning, or the files arrive as small pointer files:

```sh
brew install git-lfs
git lfs install
```

If you already cloned without it, run `git lfs pull` inside the repo.

The renders in `output/` add up to several GB. To clone without them, run `GIT_LFS_SKIP_SMUDGE=1 git clone <repo>`, then `git lfs pull --exclude="output/**"`.

### Tools
The tools a video needs depend on what it captures. Claude checks for them when a video starts and asks you to install anything that's missing.

| Tool | Needed for | Install |
|---|---|---|
| Node (current LTS) | rendering and capture scripts | `brew install node` |
| ffmpeg | encoding and render checks | `brew install ffmpeg` |
| Git LFS | assets and renders | see above |
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
