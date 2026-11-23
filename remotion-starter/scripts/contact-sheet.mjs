#!/usr/bin/env node
// Contact sheet: render full-resolution stills of a composition at chosen frames, then label and tile them with
// ffmpeg. Bundles once and reuses one browser (much faster than one `npx remotion still` per frame).
//
// Run from the generation's Remotion project (build/<generation-id>/remotion/):
//   node scripts/contact-sheet.mjs --comp S2Feature --frames 0,60,120,240,479
//   node scripts/contact-sheet.mjs --comp Main --every 120 --safe --cols 5
//   node scripts/contact-sheet.mjs --comp Main --frames 239,240,719,720 --cols 2 --name seams
//
// Options:
//   --comp <id>          composition (required)
//   --frames a,b,c       frames to render ('last' = the final frame). Or --every N (0, N, 2N … last).
//   --cols N             columns (default 4)
//   --thumb W            tile width in the sheet (default 640; the full-resolution stills are kept separately)
//   --safe               draw the safe-zone overlay (input prop showSafeZone: true)
//   --safe-preset a,b    presets for the overlay (default: the project's SAFE_ZONES), e.g. social-9x16
//   --format <f>         the deliverable's orientation (landscape, portrait or 4x5), when the generation has several
//   --lang <code>        the deliverable's language (de, pt-br), when the generation has several
//   --props <json>       extra input props
//   --name <slug>        output name (default <comp>-sheet, then -<deliverable> with --format or --lang, then -safe)
//   --out-dir <dir>      output folder; default <repo>/output/<generation-id>/ inside build/<id>/remotion
//   --concurrency N      stills rendered in parallel (default 2; keep it at 3 or less while other agents render)
//   --scale N            still scale (default 1 = full resolution)
//   --keep-stills        also keep the full-resolution stills in the output folder (about 8 MB each at 4K)
// Output: <out-dir>/<name>.png (labelled tiles). The full-resolution stills go to out/<name>-stills/f<frame>.png in
// the project (gitignored), or to <out-dir>/<name>-stills/ with --keep-stills. With --safe they carry the overlay.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {ensureBrowser, openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {bundleProject, CHROMIUM, DELAY_RENDER_TIMEOUT, deliverable, ensureDir, expectFormat, fail, num, parseArgs, parseProps, pickComposition, projectRoot, resolveOutDir, tempDir} from './_common.mjs';

const args = parseArgs(process.argv.slice(2), {values: ['comp', 'format', 'lang', 'frames', 'every', 'cols', 'thumb', 'safe-preset', 'props', 'name', 'out-dir', 'concurrency', 'scale'], flags: ['safe', 'keep-stills']}, import.meta.url);
const comp = args.comp ?? fail('usage: node scripts/contact-sheet.mjs --comp <id> --frames a,b,c | --every N [--cols 4] [--safe]');
const cols = Math.max(1, Math.floor(num(args.cols, 4, 'cols')));
const thumb = Math.max(64, Math.floor(num(args.thumb, 640, 'thumb')));
const scale = num(args.scale, 1, 'scale');
const concurrency = Math.max(1, Math.floor(num(args.concurrency, 2, 'concurrency')));
const safe = Boolean(args.safe) || args['safe-preset'] !== undefined;
const {slug} = deliverable(args);
const name = args.name ?? `${comp}-sheet${slug ? `-${slug}` : ''}${safe ? '-safe' : ''}`;
const outDir = resolveOutDir(args);

const inputProps = {...parseProps(args)};
if (safe) inputProps.showSafeZone = true;
if (args['safe-preset']) inputProps.safePreset = args['safe-preset'].split(',').map((s) => s.trim());

const serveUrl = await bundleProject();
await ensureBrowser();
const browser = await openBrowser('chrome', {chromiumOptions: CHROMIUM});
const composition = await pickComposition({serveUrl, id: comp, inputProps, puppeteerInstance: browser});
expectFormat(args, composition);
const last = composition.durationInFrames - 1;
let frames;
if (args.every !== undefined) {
  const n = Math.max(1, Math.floor(num(args.every, 1, 'every')));
  frames = [];
  for (let f = 0; f <= last; f += n) frames.push(f);
  if (frames[frames.length - 1] !== last) frames.push(last);
} else {
  frames = (args.frames ?? `0,${Math.floor(last / 2)},${last}`)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s === 'last' ? last : Number(s)));
}
const bad = frames.filter((f) => !Number.isInteger(f) || f < 0 || f > last);
if (bad.length) fail(`Frames outside ${comp} (0-${last}): ${bad.join(', ')}`);

const stillsDir = path.join(args['keep-stills'] ? outDir : path.join(projectRoot, 'out'), `${name}-stills`);
if (!args['keep-stills']) fs.rmSync(stillsDir, {recursive: true, force: true}); // only this sheet's frames
ensureDir(outDir);
ensureDir(stillsDir);
const stillPath = (f) => path.join(stillsDir, `f${String(f).padStart(4, '0')}.png`);
console.log(`${comp}: ${frames.length} stills at ${composition.width * scale}×${composition.height * scale}${safe ? ' with the safe-zone overlay' : ''}`);
const queue = [...frames];
const worker = async () => {
  while (queue.length) {
    const frame = queue.shift();
    await renderStill({composition, serveUrl, frame, output: stillPath(frame), inputProps, imageFormat: 'png', scale, puppeteerInstance: browser, overwrite: true, timeoutInMilliseconds: DELAY_RENDER_TIMEOUT, chromiumOptions: CHROMIUM});
    console.log(`  f${frame}`);
  }
};
await Promise.all(new Array(Math.min(concurrency, frames.length)).fill(0).map(worker));

// Label each tile (with the SheetLabel composition: this ffmpeg has no drawtext), then tile.
const tmp = tempDir('sheet-');
let labelComp = null;
try {
  labelComp = await selectComposition({serveUrl, id: 'SheetLabel', inputProps: {text: ''}, puppeteerInstance: browser, logLevel: 'error'});
} catch {
  console.log('No SheetLabel composition in Root.tsx: tiles will be unlabelled.');
}
for (let i = 0; i < frames.length; i++) {
  const frame = frames[i];
  const dst = path.join(tmp, `${String(i).padStart(4, '0')}.png`);
  if (labelComp) {
    const text = `${comp}   f${frame}   ${(frame / composition.fps).toFixed(2)} s${safe ? '   safe zone' : ''}`;
    const labelPng = path.join(tmp, `label-${i}.png`);
    await renderStill({composition: {...labelComp, width: thumb, props: {text}}, serveUrl, frame: 0, output: labelPng, inputProps: {text}, imageFormat: 'png', puppeteerInstance: browser, overwrite: true});
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', stillPath(frame), '-i', labelPng, '-filter_complex', `[0]scale=${thumb}:-2:flags=lanczos[a];[a][1]vstack=inputs=2`, dst]);
  } else {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', stillPath(frame), '-vf', `scale=${thumb}:-2:flags=lanczos`, dst]);
  }
}
await browser.close({silent: true});
const rows = Math.ceil(frames.length / cols);
const sheet = path.join(outDir, `${name}.png`);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, '%04d.png'), '-vf', `tile=${cols}x${rows}:padding=6:margin=6:color=0x0a0d0f`, '-frames:v', '1', sheet]);
console.log(`Contact sheet: ${sheet}`);
console.log(`Full-resolution stills: ${stillsDir}/`);
