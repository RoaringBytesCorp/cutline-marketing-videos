#!/usr/bin/env node
// Check a rendered mp4: a scene draft from `npx remotion render`, a full draft or a final. render-chunked.mjs runs
// the same checks on what it renders. Exits 1 if any check fails.
//
// Run from the generation's Remotion project (build/<generation-id>/remotion/):
//   node scripts/check-video.mjs S2Feature-draft.mp4 --comp S2Feature
//   node scripts/check-video.mjs draft-v1.mp4
//   node scripts/check-video.mjs <scope>_30s_landscape_<timestamp>.mp4 --loudnorm --max-hold 2
//   node scripts/check-video.mjs seam-960.mp4 --frames 900-1019
//
// <file> is relative to the working directory, or a file name in the generation's output folder.
// Options:
//   --comp <id>          the composition the file was rendered from (default Main): the file must have its size,
//                        frame rate and frame count
//   --frames a-b         the file is this frame range of the composition
//   --format <f>         the orientation the file was rendered with (landscape, portrait or 4x5), if it was given one
//   --lang <code>        the language the file was rendered with, if it was given one
//   --no-comp            do not compare with a composition (a file from another project, a --scale quick look)
//   --silent             the video is meant to have no audio (default: an audio stream as long as the video)
//   --loudnorm           also require -14 LUFS (±0.5) integrated and a true peak of -1 dBTP or lower
//   --max-hold S         fail when nothing moves for more than S seconds (default: holds are only listed)
// Checks: H.264 High, yuv420p, BT.709 tags and tv range, faststart, constant frame rate, frame count, evenly spaced
// timestamps, resolution, audio; then the motion pass, which compares consecutive frames:
//   repeated frames      a copy of the previous frame, or a frame inside a move that moves less than 30% as much
//                        as its neighbours (a held pose: a stutter, typical of a scene seam). Fails.
//   holds                stretches where nothing but the grain changes, with their time ranges. Listed.
import fs from 'node:fs';
import path from 'node:path';
import {ensureBrowser} from '@remotion/renderer';
import {bundleProject, checkVideo, expectFormat, fail, frameRange, generationOutputDir, num, parseArgs, parseProps, pickComposition} from './_common.mjs';

const args = parseArgs(process.argv.slice(2), {values: ['comp', 'frames', 'format', 'lang', 'max-hold'], flags: ['no-comp', 'silent', 'loudnorm'], positionals: 1}, import.meta.url);
const given = args._[0] ?? fail('usage: node scripts/check-video.mjs <file.mp4> [--comp <id>] [--frames a-b] [--format <f>] [--lang <code>] [--no-comp] [--silent] [--loudnorm] [--max-hold S]');
const file = [path.resolve(given), path.join(generationOutputDir() ?? '', given)].find((f) => fs.existsSync(f)) ?? fail(`File not found: ${given}`);
if (args['no-comp'] && ['comp', 'frames', 'format', 'lang'].some((k) => args[k] !== undefined)) fail('--no-comp cannot be combined with --comp, --frames, --format or --lang.');
const inputProps = parseProps(args);

const expect = {audio: !args.silent, loudnorm: Boolean(args.loudnorm), maxHold: num(args['max-hold'], undefined, 'max-hold')};
if (!args['no-comp']) {
  const comp = args.comp ?? 'Main';
  const serveUrl = await bundleProject();
  await ensureBrowser();
  const composition = await pickComposition({serveUrl, id: comp, inputProps});
  expectFormat(args, composition);
  const {width, height, fps, durationInFrames} = composition;
  const [first, last] = frameRange(args.frames, durationInFrames - 1, comp);
  Object.assign(expect, {width, height, fps, frames: last - first + 1});
  console.log(`Expecting ${comp}: ${width}×${height} at ${fps} fps, frames ${first}-${last}`);
}
const {failed, motionFailed} = await checkVideo(file, expect);
if (failed + motionFailed) fail(`${failed + motionFailed} check(s) failed.`);
