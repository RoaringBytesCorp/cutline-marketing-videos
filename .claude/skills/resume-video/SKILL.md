---
name: resume-video
description: Pick up an earlier marketing video generation. Lists the generations with their status, loads the chosen one's brief and memory, summarizes where it stands and continues. Use when someone wants to continue, revise or re-render an earlier video.
argument-hint: "[generation name or ID]"
---

# Resume a video

The request: $ARGUMENTS

1. **Pick the generation.** If the request names one, match it against the folder names in `generations/`. Otherwise list every generation except `_template` with its status, and ask which one:

   ```sh
   grep -H -m1 '^- \*\*Status:\*\*' generations/*/memory.md | grep -v '^generations/_template/'
   ```

2. **Read** the generation's `brief.md` and `memory.md` in full before doing anything else.
3. **Check the files** the remaining work needs:
   - Renders are in Git LFS. `git lfs ls-files -I "output/<id>/**"` marks a file that's only a pointer with `-` instead of `*`. If any are, run `git lfs pull`. Re-render from `build/<id>/` only what was never committed.
   - `node_modules` is gitignored: run `npm ci` in `build/<id>/remotion/` if it's missing.
   - Raw app captures aren't in git. If a fix needs them and they aren't on this machine, re-run `app-capture`.
4. **Check the tools** the remaining work needs, as the `new-video` skill lists them, since this may be a different machine. Ask the user for anything missing.
5. **Summarize** the status, the latest render, the open items, the workstreams still `pending` or `running`, and the next steps, then continue. Don't re-ask what `brief.md` already answers, and don't re-run workstreams that are `done` or `skipped`. If the generation is `done` and the user asks for changes, set it back to `in review`.
