#!/usr/bin/env node
// Chunked render. A long or heavy render in one pass crashes the Chrome tab (one 1080p Main died about 760 frames in,
// with "Page crashed!" or a silent stall), so this bundles once, renders the composition's audio mix, renders
// fixed-size chunks, each in a fresh browser, joins them with the ffmpeg concat demuxer (video stream copied, no
// re-encode), muxes the audio, checks the result and only then writes it under its name.
//
// Run from the generation's Remotion project (build/<generation-id>/remotion/):
//   node scripts/render-chunked.mjs --draft                            # Main → <repo>/output/<id>/draft-v<n>.mp4
//   node scripts/render-chunked.mjs --final <scope> --poster 1740 --loudnorm
//                                      # → <scope>_<seconds>s_<orientation>_<YYYYMMDD-HHMMSS>.mp4 and the same .jpg
//   node scripts/render-chunked.mjs --frames 900-1019 --name seam-960.mp4
//   node scripts/render-chunked.mjs --draft --format portrait --lang de   # → draft-portrait-de-v<n>.mp4
//
// Name the output with exactly one of:
//   --draft              the next free draft-v<n>.mp4, or draft-<deliverable>-v<n>.mp4 with --format or --lang
//   --final <scope>      the final's name, built from the composition's length and format (scope: kebab-case, no "_")
//   --name <file.mp4>    any other file name
// Options:
//   --comp <id>          composition (default Main)
//   --format <f>         render this orientation of the cut (landscape, portrait or 4x5) instead of the project's
//                        default. Only for a generation with several deliverables.
//   --lang <code>        render this language of the cut (de, pt-br), and end the final's scope with the code
//   --out-dir <dir>      output folder; default <repo>/output/<generation-id>/ when run inside build/<id>/remotion
//   --poster <frame>     after the checks pass, render this frame from source as a JPEG next to the video, same name
//   --frames a-b         render only this frame range (not with --final)
//   --audio <file>       mux this file instead of the composition's own audio mix (relative to the working directory
//                        or public/); the audio is AAC 320k at 48 kHz either way
//   --silent             make a video without audio; without it a silent result stops the render before it starts
//   --loudnorm           bring the audio to -14 LUFS integrated, under -1 dBTP (plain gain + oversampled limiter)
//   --props <json>       input props
//   --chunk N            frames per chunk (default 480; lower it, e.g. 240, if a chunk stalls at 4K)
//   --concurrency N      browser tabs per chunk (default 4, more is not faster; a stalled or crashed chunk is retried
//                        at half, down to 1)
//   --resume             reuse the finished chunks of an interrupted run; they are re-rendered if anything they
//                        depend on changed (composition, range, chunk size, props, size, encode settings, sources)
//   --overwrite          replace an existing output file
// Chunks are written to out/chunks-<comp>[-<deliverable>]-<range>/ inside the project (gitignored). Encoding: H.264 High, CRF 16,
// yuv420p, BT.709 (tv range), PNG intermediates, +faststart. The joined file is checked with checkVideo (see
// check-video.mjs). A failed encode or audio check leaves it in the work folder and exits 1. Repeated frames (and
// nothing else) still write the file, and exit 1 so they get fixed.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {ensureBrowser, makeCancelSignal, renderMedia, renderStill} from '@remotion/renderer';
import {audioSeconds, bundleHash, bundleProject, checkVideo, CHROMIUM, DELAY_RENDER_TIMEOUT, deliverable, ENCODE, ensureDir, expectFormat, fail, frameRange, isMeasurable, isSilent, loudness, LOUDNESS, num, orientationOf, parseArgs, parseProps, pickComposition, projectRoot, resolveOutDir, tempDir, timestamp} from './_common.mjs';

const STALL_MS = 300000; // a chunk that renders no frame for this long is aborted and retried
const args = parseArgs(process.argv.slice(2), {values: ['comp', 'format', 'lang', 'final', 'name', 'out-dir', 'poster', 'frames', 'audio', 'props', 'chunk', 'concurrency'], flags: ['draft', 'silent', 'loudnorm', 'resume', 'overwrite']}, import.meta.url);
const comp = args.comp ?? 'Main';
const chunk = Math.max(1, Math.floor(num(args.chunk, 480, 'chunk')));
const concurrency = Math.max(1, Math.floor(num(args.concurrency, 4, 'concurrency')));
const inputProps = parseProps(args);
const {slug} = deliverable(args);
if (['draft', 'final', 'name'].filter((k) => args[k] !== undefined).length !== 1) fail('Name the output with exactly one of --draft, --final <scope> or --name <file.mp4>.');
if (args.final !== undefined && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(args.final)) fail(`--final takes the scope as a lowercase kebab-case slug without "_", like onboarding-flow; got "${args.final}".`);
if (args.final !== undefined && args.frames !== undefined) fail('--final renders the whole composition: drop --frames.');
if (args.name !== undefined && (path.basename(args.name) !== args.name || path.extname(args.name).toLowerCase() !== '.mp4')) fail(`--name takes a file name ending in .mp4 (the folder is --out-dir), got "${args.name}".`);
if (args.silent && (args.audio !== undefined || args.loudnorm)) fail('--silent cannot be combined with --audio or --loudnorm.');
const outDir = resolveOutDir(args);

let audio = null; // null: the composition's own mix
if (args.audio !== undefined) {
  audio = [path.resolve(process.cwd(), args.audio), path.resolve(projectRoot, args.audio), path.resolve(projectRoot, 'public', args.audio)].find((c) => fs.existsSync(c)) ?? fail(`Audio file not found: ${args.audio}`);
  if (audioSeconds(audio) === null) fail(`No audio stream in ${audio}.`);
}

const serveUrl = await bundleProject();
await ensureBrowser();
const composition = await pickComposition({serveUrl, id: comp, inputProps});
expectFormat(args, composition);
const {fps, durationInFrames, width, height} = composition;
const [first, last] = frameRange(args.frames, durationInFrames - 1, comp);
const total = last - first + 1;
const seconds = (total / fps).toFixed(6);
const posterFrame = args.poster === undefined ? null : num(args.poster, 0, 'poster');
if (posterFrame !== null && (!Number.isInteger(posterFrame) || posterFrame < 0 || posterFrame >= durationInFrames)) fail(`--poster ${args.poster} is outside ${comp} (0-${durationInFrames - 1}).`);

let name = args.name;
if (args.draft) {
  // Each deliverable counts its own drafts: draft-v<n>.mp4, or draft-portrait-de-v<n>.mp4 with --format and --lang.
  const stem = `draft-${slug ? `${slug}-` : ''}v`;
  const taken = (fs.existsSync(outDir) ? fs.readdirSync(outDir) : []).map((f) => Number(f.match(new RegExp(`^${stem}(\\d+)\\.mp4$`))?.[1] ?? 0));
  name = `${stem}${Math.max(0, ...taken) + 1}.mp4`;
} else if (args.final !== undefined) {
  const orientation = orientationOf(composition) ?? fail(`${width}×${height} is not 16:9, 9:16 or 4:5, so it has no orientation name. Use --name.`);
  name = `${args.final}${args.lang ? `-${args.lang}` : ''}_${Math.round(durationInFrames / fps)}s_${orientation}_${timestamp()}.mp4`;
}
const out = path.join(outDir, name);
const poster = posterFrame === null ? null : out.replace(/\.mp4$/, '.jpg');
for (const f of [out, poster]) if (f && fs.existsSync(f) && !args.overwrite) fail(`${f} exists. Pass --overwrite to replace it.`);

const workDir = path.join(projectRoot, 'out', `chunks-${comp}${slug ? `-${slug}` : ''}-${first}-${last}`);
console.log(`${comp}: ${width}×${height} at ${fps} fps, frames ${first}-${last} (${total}) in chunks of ${chunk}, concurrency ${concurrency}`);
console.log(`Output: ${out}`);

// Audio first, so a missing or silent track stops the render before the chunks.
let audioIn = []; // ffmpeg input arguments
if (!args.silent) {
  if (audio) {
    if (audioSeconds(audio) < (last + 1) / fps - 1 / fps) fail(`${audio} is ${audioSeconds(audio).toFixed(2)} s, shorter than the video (frames ${first}-${last} end at ${((last + 1) / fps).toFixed(2)} s).`);
    audioIn = ['-ss', (first / fps).toFixed(6), '-t', seconds, '-i', audio];
  } else {
    console.log('Rendering the audio mix…');
    const mix = path.join(tempDir('audio-mix-'), 'audio.wav');
    await renderMedia({composition, serveUrl, inputProps, codec: 'wav', outputLocation: mix, frameRange: [first, last], concurrency, chromiumOptions: CHROMIUM, timeoutInMilliseconds: DELAY_RENDER_TIMEOUT, overwrite: true, logLevel: 'error'}).catch((e) => fail(`The audio mix failed: ${e.message.split('\n').slice(0, 6).join('\n')}`));
    audioIn = ['-t', seconds, '-i', mix];
  }
  if (isSilent(loudness(audioIn))) fail(`${audio ?? `The audio of ${comp}`} is silent${audio ? '' : ' (no <Audio> in the composition, or MUSIC_SRC is not set)'}. Fix it, pass --audio <file>, or pass --silent for a video without audio.`);
}

// The work folder, once everything above is valid. Earlier chunks are kept only for --resume, and only if they match.
const metaFile = path.join(workDir, 'meta.json');
const meta = {comp, frames: [first, last], chunk, width, height, fps, props: inputProps, encode: ENCODE, bundle: bundleHash(serveUrl)};
let reuse = false;
if (args.resume && fs.existsSync(metaFile)) {
  const old = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const changed = Object.keys(meta).filter((k) => JSON.stringify(old[k]) !== JSON.stringify(meta[k]));
  reuse = changed.length === 0;
  if (!reuse) console.log(`--resume: the earlier chunks do not match this render (changed: ${changed.map((k) => (k === 'bundle' ? 'sources' : k)).join(', ')}), rendering all of it again.`);
} else if (args.resume) console.log('--resume: no earlier chunks for this composition and range.');
if (!reuse) fs.rmSync(workDir, {recursive: true, force: true});
ensureDir(workDir);
ensureDir(outDir);
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));

const retryable = (e) => /stall|crash|target closed|protocol error|timed? ?out|disconnected|econnreset|browser/i.test(e.message);

const renderChunk = async (a, b, c, file) => {
  const part = file.replace(/\.mp4$/, '.part.mp4');
  const {cancelSignal, cancel} = makeCancelSignal();
  let lastChange = Date.now();
  let lastCount = -1;
  let lastPrint = 0;
  let stalled = false;
  const watchdog = setInterval(() => {
    if (Date.now() - lastChange > STALL_MS) {
      stalled = true;
      cancel();
    }
  }, 5000);
  const t0 = Date.now();
  try {
    await renderMedia({
      ...ENCODE,
      composition,
      serveUrl,
      inputProps,
      outputLocation: part,
      frameRange: [a, b],
      concurrency: c,
      muted: true,
      chromiumOptions: CHROMIUM,
      timeoutInMilliseconds: DELAY_RENDER_TIMEOUT,
      cancelSignal,
      overwrite: true,
      logLevel: 'error',
      onProgress: ({renderedFrames, encodedFrames}) => {
        const n = renderedFrames + encodedFrames;
        if (n !== lastCount) {
          lastCount = n;
          lastChange = Date.now();
        }
        if (renderedFrames - lastPrint >= 60) {
          lastPrint = renderedFrames;
          console.log(`  ${renderedFrames}/${b - a + 1} frames`);
        }
      },
    });
  } catch (e) {
    if (stalled) throw new Error(`stalled: no frame rendered for ${STALL_MS / 1000} s`);
    throw e;
  } finally {
    clearInterval(watchdog);
  }
  fs.renameSync(part, file);
  const secs = (Date.now() - t0) / 1000;
  console.log(`  done in ${secs.toFixed(0)} s (${((b - a + 1) / secs).toFixed(1)} fps)`);
};

const parts = [];
for (let a = first; a <= last; a += chunk) {
  const b = Math.min(last, a + chunk - 1);
  const file = path.join(workDir, `chunk-${String(a).padStart(6, '0')}-${String(b).padStart(6, '0')}.mp4`);
  parts.push(file);
  if (fs.existsSync(file)) {
    console.log(`Chunk ${a}-${b}: reusing ${path.basename(file)}`);
    continue;
  }
  for (let c = concurrency; ; c = Math.max(1, Math.floor(c / 2))) {
    console.log(`Chunk ${a}-${b} at concurrency ${c}…`);
    try {
      await renderChunk(a, b, c, file);
      break;
    } catch (e) {
      const kept = `Finished chunks are in ${workDir}; rerun with --resume to keep them.`;
      // An error in the composition fails the same way at any concurrency: only a stall, crash or timeout is retried.
      if (!retryable(e)) fail(`Chunk ${a}-${b} failed: ${e.message.split('\n').slice(0, 6).join('\n')}\n${kept}`);
      if (c <= 1) fail(`Chunk ${a}-${b} failed at concurrency 1: ${e.message}\n${kept}`);
      console.log(`Chunk ${a}-${b} failed at concurrency ${c} (${e.message.split('\n')[0]}); retrying at ${Math.max(1, Math.floor(c / 2))}.`);
    }
  }
}

// Loudness: a plain gain to the target, with peaks caught by a 4× oversampled limiter at 0.86 (-1.3 dBFS), about
// -1.2 dBTP after AAC. loudnorm's own second pass falls back to dynamic mode whenever the gain would clip, which
// squeezes the loudness range (4.7 → 2.6 LU on one track). The limiter lowers the loudness of a peaky track, so the
// gain is raised until the limited result is on target.
let audioFilter = [];
if (args.loudnorm) {
  const before = loudness(audioIn);
  if (!isMeasurable(before)) console.log('Loudness: the audio is too short to measure (under 0.4 s), left as it is.');
  else {
    const chain = (gain) => [`volume=${gain.toFixed(2)}dB`, 'aresample=192000', 'alimiter=limit=0.86:attack=1:release=60:level=disabled', 'aresample=48000'];
    let gain = LOUDNESS.target - before.i;
    let after = loudness(audioIn, chain(gain));
    for (let pass = 0; pass < 3 && Math.abs(after.i - LOUDNESS.target) > 0.1; pass++) {
      gain += LOUDNESS.target - after.i;
      after = loudness(audioIn, chain(gain));
    }
    audioFilter = ['-af', chain(gain).join(',')];
    console.log(`Loudness: measured ${before.i} LUFS / ${before.tp} dBTP; gain ${gain.toFixed(2)} dB + limiter gives ${after.i} LUFS / ${after.tp} dBTP before AAC.`);
  }
}

// Join: concat demuxer, video stream copied. The result goes to the work folder until it has passed the checks.
const list = path.join(workDir, 'list.txt');
fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'\n`).join(''));
const joined = path.join(workDir, 'joined.part.mp4');
const mux = args.silent ? ['-map', '0:v:0', '-c:v', 'copy', '-an'] : [...audioIn, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', ...audioFilter, '-c:a', 'aac', '-b:a', '320k', '-ar', '48000'];
console.log('Joining chunks…');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, ...mux, '-t', seconds, '-movflags', '+faststart', joined], {stdio: 'inherit'});

const {failed, motionFailed} = await checkVideo(joined, {name, width, height, fps, frames: total, audio: !args.silent, loudnorm: Boolean(args.loudnorm) && audioFilter.length > 0});
if (failed) fail(`${failed} check(s) failed. Nothing was written to ${outDir}; the joined file and the chunks are in ${workDir}.`);
fs.copyFileSync(joined, out); // not a rename: the output folder may be on another volume
if (poster) {
  await renderStill({composition, serveUrl, inputProps, frame: posterFrame, output: poster, imageFormat: 'jpeg', jpegQuality: 95, overwrite: true, chromiumOptions: CHROMIUM, timeoutInMilliseconds: DELAY_RENDER_TIMEOUT, logLevel: 'error'});
  console.log(`Poster (frame ${posterFrame}): ${poster}`);
}
fs.rmSync(workDir, {recursive: true, force: true});
console.log(`Written: ${out}`);
if (motionFailed) fail('The file was written, but it has repeated frames (listed above). Fix them and render again, or keep it if they are intended.');
