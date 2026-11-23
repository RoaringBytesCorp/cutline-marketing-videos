// Shared helpers for the render scripts. Run the scripts with the generation's Remotion project as the working
// directory: `node scripts/render-chunked.mjs …` from build/<generation-id>/remotion/.
import {execFileSync, spawn, spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/** The Remotion project this script belongs to (the folder holding scripts/). */
export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Encoding settings from the Quality bar. The renderer API ignores remotion.config.ts, so they are passed explicitly.
 * libx264 with yuv420p at the medium preset encodes H.264 High.
 */
export const ENCODE = {codec: 'h264', crf: 16, pixelFormat: 'yuv420p', colorSpace: 'bt709', imageFormat: 'png', x264Preset: 'medium'};
export const CHROMIUM = {gl: 'angle'}; // GPU compositing on macOS (blur, 3D transforms), as in remotion.config.ts
export const DELAY_RENDER_TIMEOUT = 120000;
/** --loudnorm target: integrated loudness in LUFS (± tolerance) and the true-peak ceiling in dBTP. */
export const LOUDNESS = {target: -14, tolerance: 0.5, truePeak: -1};

export const fail = (msg) => {
  console.error(`\n${msg}\n`);
  process.exit(1);
};

/* ------------------------------------------------------------------ temp folders */

const temp = [];
/** Remove this folder when the process ends, also after a failure, Ctrl-C or kill. */
export const removeOnExit = (dir) => {
  temp.push(dir);
  return dir;
};
process.on('exit', () => {
  for (const dir of temp) fs.rmSync(dir, {recursive: true, force: true});
  // A browser that was starting when the script stopped would outlive it: end whatever child processes are left.
  const children = spawnSync('pgrep', ['-P', String(process.pid)], {encoding: 'utf8'}).stdout ?? '';
  for (const pid of children.split('\n').filter(Boolean)) {
    try {
      process.kill(Number(pid));
    } catch {
      // already gone
    }
  }
});
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));

export const tempDir = (prefix) => removeOnExit(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
export const ensureDir = (dir) => fs.mkdirSync(dir, {recursive: true});

/* ---------------------------------------------------------------------- options */

const editDistance = (a, b) => {
  let row = Array.from({length: b.length + 1}, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
};

/**
 * `values` take one value (--key value or --key=value), `flags` take none, and up to `positionals` bare arguments
 * land in `_`. An unknown option stops the script with a suggestion. -h or --help prints the script's header.
 */
export const parseArgs = (argv, {values = [], flags = [], positionals = 0}, scriptUrl) => {
  const out = {_: []};
  const known = [...values, ...flags];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      console.log(fs.readFileSync(new URL(scriptUrl), 'utf8').split('\nimport ')[0]);
      process.exit(0);
    }
    if (!a.startsWith('--')) {
      if (out._.length >= positionals) fail(`Unexpected argument "${a}". Options start with --.`);
      out._.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    const key = a.slice(2, eq === -1 ? undefined : eq);
    if (!known.includes(key)) {
      const near = known.find((k) => k.startsWith(key) || key.startsWith(k)) ?? known.find((k) => editDistance(key, k) <= 2);
      fail(`Unknown option --${key}.${near ? ` Did you mean --${near}?` : ''} Run with --help for the options.`);
    }
    if (flags.includes(key)) {
      if (eq !== -1) fail(`--${key} takes no value.`);
      out[key] = true;
    } else if (eq !== -1) out[key] = a.slice(eq + 1);
    else {
      const next = argv[++i];
      if (next === undefined || next.startsWith('--')) fail(`--${key} needs a value.`);
      out[key] = next;
    }
  }
  return out;
};

export const num = (v, def, name) => {
  if (v === undefined) return def;
  const n = Number(v);
  if (v === '' || !Number.isFinite(n)) fail(`--${name} needs a number, got "${v}".`);
  return n;
};

/** A frame range "a-b" inside 0..last, or the default. */
export const frameRange = (v, last, what, def = [0, last]) => {
  if (v === undefined) return def;
  const m = v.match(/^(\d+)-(\d+)$/);
  if (!m) fail('--frames takes a range like 0-479.');
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a > b || b > last) fail(`--frames ${a}-${b} is outside ${what} (0-${last}).`);
  return [a, b];
};

const FORMATS = ['landscape', 'portrait', '4x5'];

/**
 * The deliverable a run is for, from --format and --lang: another orientation or language of the same cut.
 * `props` are the input props src/video.ts reads. `slug` (portrait, de or portrait-de; '' with neither option) goes
 * into the names of drafts, contact sheets and work folders.
 */
export const deliverable = (args) => {
  const {format, lang} = args;
  if (format !== undefined && !FORMATS.includes(format)) fail(`--format takes ${FORMATS.join(', ')}; got "${format}".`);
  if (lang !== undefined && !/^[a-z]{2,3}(-[a-z0-9]+)*$/.test(lang)) fail(`--lang takes a lowercase language code without "_", like de or pt-br; got "${lang}".`);
  return {slug: [format, lang].filter(Boolean).join('-'), props: {...(format && {format}), ...(lang && {lang})}};
};

/** Input props from --props '<json>', plus the deliverable's from --format and --lang. */
export const parseProps = (args) => {
  let props = {};
  try {
    if (args.props) props = JSON.parse(args.props);
  } catch (e) {
    fail(`--props is not valid JSON: ${e.message}`);
  }
  return {...props, ...deliverable(args).props};
};

/** The file-naming orientation of a frame size (landscape, portrait or 4x5), or null for any other aspect. */
export const orientationOf = ({width, height}) => (width * 9 === height * 16 ? 'landscape' : width * 16 === height * 9 ? 'portrait' : width * 5 === height * 4 ? '4x5' : null);

/** Stop when --format did not change the composition: the project's src/video.ts does not read the input prop. */
export const expectFormat = (args, composition) => {
  if (args.format === undefined || orientationOf(composition) === args.format) return;
  fail(`--format ${args.format} had no effect: ${composition.id} is ${composition.width}×${composition.height}.\nFORMAT in this project's src/video.ts must follow the "format" input prop, as it does in remotion-starter/src/video.ts.`);
};

/* ----------------------------------------------------------------------- output */

const GENERATION_DIR = /^(.*)[\\/]build[\\/]([^\\/]+)[\\/]remotion[\\/]?$/;

/** <repo>/output/<id>/ when the working directory (or this project) is <repo>/build/<id>/remotion, else null. */
export const generationOutputDir = () => {
  for (const dir of [process.cwd(), projectRoot]) {
    const m = path.resolve(dir).match(GENERATION_DIR);
    if (m) return path.join(m[1], 'output', m[2]);
  }
  return null;
};

/** --out-dir (relative to the working directory), else the generation's output folder, else stop with a message. */
export const resolveOutDir = (args) => {
  if (args['out-dir']) return path.resolve(process.cwd(), args['out-dir']);
  return generationOutputDir() ?? fail('This project is not at <repo>/build/<generation-id>/remotion, so there is no default output folder.\nPass --out-dir <dir>.');
};

/** Local time as YYYYMMDD-HHMMSS (the repo's file-naming timestamp). */
export const timestamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/* -------------------------------------------------------------- bundle, browser */

/** Bundle the project once (webpack), for every render that follows. The bundle is removed when the script ends. */
export const bundleProject = async () => {
  const {bundle} = await import('@remotion/bundler');
  console.log('Bundling…');
  return bundle({entryPoint: path.join(projectRoot, 'src', 'index.ts'), publicDir: path.join(projectRoot, 'public'), outDir: tempDir('remotion-bundle-'), onProgress: () => undefined});
};

/** Fingerprint of a bundle (code and public files): equal for equal sources. */
export const bundleHash = (dir) => {
  const hash = crypto.createHash('sha1');
  const walk = (d) => {
    for (const e of fs.readdirSync(d, {withFileTypes: true}).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (!e.name.endsWith('.map')) hash.update(path.relative(dir, p)).update(fs.readFileSync(p));
    }
  };
  walk(dir);
  return hash.digest('hex');
};

/** selectComposition; an unknown id stops with Remotion's one-line message, which lists the available ones. */
export const pickComposition = async (options) => {
  const {selectComposition} = await import('@remotion/renderer');
  try {
    return await selectComposition({chromiumOptions: CHROMIUM, timeoutInMilliseconds: DELAY_RENDER_TIMEOUT, logLevel: 'error', ...options});
  } catch (e) {
    if (/Could not find composition/.test(e.message)) fail(e.message.split('\n')[0]);
    throw e;
  }
};

/* ------------------------------------------------------------------------ audio */

/** Duration in seconds of a file's first audio stream, or null when it has none or cannot be read. */
export const audioSeconds = (file) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=duration:format=duration', '-of', 'json', file], {encoding: 'utf8'});
  if (r.status !== 0) return null;
  const {streams = [], format = {}} = JSON.parse(r.stdout);
  if (!streams.length) return null;
  return Number(streams[0].duration ?? format.duration);
};

/**
 * Integrated loudness (LUFS) and true peak (dBTP) of ffmpeg input arguments, after an optional filter chain.
 * Silence has a peak of -Infinity; anything under 0.4 s cannot be measured and reads -70 LUFS.
 */
export const loudness = (inputArgs, filters = []) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...inputArgs, '-vn', '-af', [...filters, 'ebur128=peak=true'].join(','), '-f', 'null', '-'], {encoding: 'utf8', maxBuffer: 1 << 28});
  const summary = r.stderr.slice(Math.max(0, r.stderr.lastIndexOf('Summary:')));
  const read = (re) => {
    const m = summary.match(re);
    return m ? (m[1] === '-inf' ? -Infinity : Number(m[1])) : NaN;
  };
  const found = {i: read(/I:\s+(-?[\d.]+|-inf) LUFS/), tp: read(/Peak:\s+(-?[\d.]+|-inf) dBFS/)};
  if (r.status !== 0 || Number.isNaN(found.i)) fail(`Could not measure the loudness of ${inputArgs[inputArgs.length - 1]}:\n${r.stderr.trim().split('\n').slice(-3).join('\n')}`);
  return found;
};
export const isSilent = ({tp}) => !(tp > -80);
export const isMeasurable = ({i}) => i > -69.9;

/* ----------------------------------------------------------------------- motion */

/**
 * Thresholds of the motion pass, calibrated on the drafts and reviews of an earlier generation.
 * Differences are the mean absolute luma difference (0-255) between consecutive frames, on frames area-scaled to a
 * quarter of their size (480×270 for 1080p, 960×540 for 4K), which averages most of the grain away.
 */
export const MOTION = {
  shrink: 4,
  identical: 0.04, // below this (and below half the floor) a frame is a copy of the one before; grain alone gives 0.08-0.3
  floorCap: 0.3, // upper bound of the noise floor, for clips that never rest
  still: 2, // × floor: at or below this nothing moves
  move: 3, // × floor: both neighbours of a repeated frame must move at least this much
  repeat: 0.3, // a frame inside a move is a repeat when its difference is under this × its slower neighbour's
  hold: 0.5, // seconds: still stretches from this length are listed as holds
  shortHold: 3, // frames: shorter still runs are not listed
};

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** d[k] = difference between frames k and k-1 (d[0] = 0); one entry per decoded frame. */
const frameDiffs = async (file, width, height) => {
  const [w, h] = [width, height].map((v) => Math.max(2, Math.round(v / MOTION.shrink / 2) * 2));
  const size = w * h;
  const ff = spawn('ffmpeg', ['-v', 'error', '-i', file, '-an', '-vf', `scale=${w}:${h}:flags=area,format=gray`, '-f', 'rawvideo', '-'], {stdio: ['ignore', 'pipe', 'inherit']});
  const closed = new Promise((resolve) => ff.on('close', resolve));
  const d = [];
  let prev = null;
  let pending = Buffer.alloc(0);
  for await (const data of ff.stdout) {
    pending = pending.length ? Buffer.concat([pending, data]) : data;
    let off = 0;
    for (; pending.length - off >= size; off += size) {
      let sum = 0;
      if (prev) for (let i = 0; i < size; i++) sum += Math.abs(pending[off + i] - prev[i]);
      d.push(sum / size);
      prev = Buffer.from(pending.subarray(off, off + size));
    }
    pending = pending.subarray(off);
  }
  if ((await closed) !== 0) fail(`ffmpeg could not decode ${file}.`);
  return d;
};

/**
 * Repeated frames and holds from the frame differences.
 * - repeats: a copy of the previous frame, or one or two frames inside a move whose difference dips under 30% of
 *   the slower neighbour's. A pose held for a frame is a stutter.
 * - holds: stretches of `MOTION.hold` seconds or more where nothing moves; shortHolds: the shorter ones.
 */
export const analyseMotion = (d, fps) => {
  const n = d.length;
  const live = d.slice(1).filter((v) => v >= MOTION.identical);
  const win = Math.min(live.length, Math.max(3, Math.round(fps / 4)));
  let floor = MOTION.floorCap; // the quietest quarter second
  for (let i = 0; win > 0 && i + win <= live.length; i++) floor = Math.min(floor, median(live.slice(i, i + win)));
  const identical = Math.min(MOTION.identical, floor / 2);
  const still = MOTION.still * floor;
  const move = MOTION.move * floor;
  const f2 = (v) => v.toFixed(2);

  const repeats = [];
  for (let a = 1; a < n; a++) {
    if (d[a] < identical) {
      let b = a;
      while (b + 1 < n && d[b + 1] < identical) b++;
      repeats.push({from: a, to: b, text: `identical to f${a - 1}`});
      a = b;
      continue;
    }
    for (const len of [1, 2]) {
      const b = a + len - 1;
      if (a < 2 || b + 1 >= n) break;
      const run = d.slice(a, b + 1);
      const peak = Math.max(...run);
      const slower = Math.min(d[a - 1], d[b + 1]);
      if (Math.min(...run) < identical || slower < move || peak >= MOTION.repeat * slower) continue;
      repeats.push({from: a, to: b, text: `${peak <= still ? 'repeats' : 'nearly repeats'} f${a - 1}: difference ${run.map(f2).join(', ')} between ${f2(d[a - 1])} and ${f2(d[b + 1])}`});
      a = b;
      break;
    }
  }

  const isStill = d.map((v, k) => k > 0 && v <= still);
  for (let k = 2; k + 1 < n; k++) if (!isStill[k] && isStill[k - 1] && isStill[k + 1]) isStill[k] = true; // a one-frame blip (a keyframe refresh) does not end a hold
  const holds = [];
  const shortHolds = [];
  for (let k = 1; k < n; k++) {
    if (!isStill[k]) continue;
    let b = k;
    while (b + 1 < n && isStill[b + 1]) b++;
    const seconds = (b - k + 1) / fps;
    if (seconds >= MOTION.hold) holds.push({from: k - 1, to: b, seconds});
    else if (b - k + 1 >= MOTION.shortHold) shortHolds.push({from: k - 1, to: b, seconds});
    k = b;
  }
  return {floor, repeats, holds, shortHolds};
};

/* ------------------------------------------------------------------------ check */

const probe = (file, args) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', ...args, '-of', 'json', file], {encoding: 'utf8', maxBuffer: 1 << 28}));

/** Names of the top-level MP4 boxes, in file order. */
const topLevelBoxes = (file) => {
  const fd = fs.openSync(file, 'r');
  const size = fs.fstatSync(fd).size;
  const head = Buffer.alloc(16);
  const boxes = [];
  for (let off = 0; off + 8 <= size; ) {
    fs.readSync(fd, head, 0, 16, off);
    let len = head.readUInt32BE(0);
    if (len === 1) len = Number(head.readBigUInt64BE(8));
    boxes.push(head.toString('latin1', 4, 8));
    if (len < 8) break; // 0: the box runs to the end of the file
    off += len;
  }
  fs.closeSync(fd);
  return boxes;
};

/**
 * Check an mp4 against the Quality bar and print the report. `expect` holds what the file should be; leave a field
 * out to skip its check:
 *   width, height, fps, frames   from the composition it was rendered from
 *   audio                        true: an audio stream as long as the video; false: none is needed
 *   loudnorm                     true: LOUDNESS target and true-peak ceiling
 *   maxHold                      seconds: a longer hold fails (holds are otherwise only listed)
 *   name                         the name to print instead of the file's path
 * Returns {failed, motionFailed}: the number of failed encode checks and of failed motion checks.
 */
export const checkVideo = async (file, expect = {}) => {
  const [v] = probe(file, ['-select_streams', 'v:0', '-show_entries', 'stream=codec_name,profile,pix_fmt,width,height,color_space,color_transfer,color_primaries,color_range,r_frame_rate,avg_frame_rate,time_base']).streams;
  if (!v) fail(`No video stream in ${file}.`);
  const pts = probe(file, ['-select_streams', 'v:0', '-show_entries', 'packet=pts'])
    .packets.map((p) => Number(p.pts))
    .sort((x, y) => x - y);
  const [rateNum, rateDen] = v.r_frame_rate.split('/').map(Number);
  const fps = rateNum / rateDen;
  const at = (f) => `f${f} (${(f / fps).toFixed(2)} s)`;
  const span = (r) => (r.from === r.to ? at(r.from) : `f${r.from}-${r.to} (${(r.from / fps).toFixed(2)}-${(r.to / fps).toFixed(2)} s)`);

  const d = await frameDiffs(file, v.width, v.height);
  const frames = d.length;
  const steps = new Map();
  for (let i = 1; i < pts.length; i++) steps.set(pts[i] - pts[i - 1], (steps.get(pts[i] - pts[i - 1]) ?? 0) + 1);
  const [tbNum, tbDen] = v.time_base.split('/').map(Number);
  const boxes = topLevelBoxes(file);

  const checks = [
    ['codec H.264 High', v.codec_name === 'h264' && v.profile === 'High', `${v.codec_name} ${v.profile}`],
    ['pixel format yuv420p', v.pix_fmt === 'yuv420p', v.pix_fmt],
    ['BT.709 tags, tv range', v.color_space === 'bt709' && v.color_transfer === 'bt709' && v.color_primaries === 'bt709' && v.color_range === 'tv', `${v.color_space}/${v.color_transfer}/${v.color_primaries} ${v.color_range}`],
    ['faststart (moov before mdat)', boxes.includes('moov') && boxes.indexOf('moov') < boxes.indexOf('mdat'), boxes.join(' ')],
    [expect.fps ? `frame rate ${expect.fps}/1` : 'constant frame rate', v.r_frame_rate === (expect.fps ? `${expect.fps}/1` : v.avg_frame_rate), `${v.r_frame_rate} (average ${v.avg_frame_rate})`],
    [expect.frames ? `frame count ${expect.frames}` : 'frame count', pts.length === frames && (!expect.frames || frames === expect.frames), `${frames} decoded, ${pts.length} packets`],
    ['even timestamps', steps.size === 1 && Math.abs([...steps.keys()][0] - tbDen / tbNum / fps) < 1e-6, [...steps].map(([s, c]) => `${c}×${s}`).join(', ') + ` (time base ${v.time_base})`],
  ];
  if (expect.width) checks.push([`resolution ${expect.width}×${expect.height}`, v.width === expect.width && v.height === expect.height, `${v.width}×${v.height}`]);

  const seconds = audioSeconds(file);
  const slack = 1 / fps + 1024 / 48000; // one frame, plus one AAC packet: an AAC stream is a whole number of packets
  if (expect.audio) checks.push([`audio as long as the video (${(frames / fps).toFixed(3)} s)`, seconds !== null && Math.abs(seconds - frames / fps) <= slack, seconds === null ? 'no audio stream' : `${seconds.toFixed(3)} s`]);
  if (expect.audio && seconds !== null) {
    const heard = loudness(['-i', file]);
    checks.push(['audio is not silent', !isSilent(heard), `true peak ${heard.tp} dBTP`]);
    if (expect.loudnorm) {
      const ok = isMeasurable(heard) && Math.abs(heard.i - LOUDNESS.target) <= LOUDNESS.tolerance && heard.tp <= LOUDNESS.truePeak;
      checks.push([`loudness ${LOUDNESS.target} ±${LOUDNESS.tolerance} LUFS, true peak ≤ ${LOUDNESS.truePeak} dBTP`, ok, isMeasurable(heard) ? `${heard.i} LUFS, ${heard.tp} dBTP` : 'too short to measure']);
    }
  }

  const motion = analyseMotion(d, fps);
  const shown = (list, max = 12) => list.slice(0, max).join('; ') + (list.length > max ? `; and ${list.length - max} more` : '');
  const motionChecks = [['no repeated frames', motion.repeats.length === 0, motion.repeats.length ? `${motion.repeats.length} found` : 'none']];
  const tooLong = motion.holds.filter((r) => r.seconds > expect.maxHold);
  if (expect.maxHold !== undefined) motionChecks.push([`no hold over ${expect.maxHold} s`, tooLong.length === 0, tooLong.length ? shown(tooLong.map((r) => `${span(r)} ${r.seconds.toFixed(2)} s`)) : 'none']);

  console.log(`\n${expect.name ?? file}  ${v.width}×${v.height}, ${frames} frames, ${(frames / fps).toFixed(2)} s${seconds === null ? ', no audio' : ''}`);
  for (const [name, ok, got] of [...checks, ...motionChecks]) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: ${got}`);
  for (const r of motion.repeats.slice(0, 20)) console.log(`         ${span(r)} ${r.text}`);
  if (motion.repeats.length > 20) console.log(`         and ${motion.repeats.length - 20} more`);
  if (motion.holds.length) console.log(`  info holds (nothing moves for ${MOTION.hold} s or more; check that each is intended):\n${motion.holds.map((r) => `         ${span(r)} ${r.seconds.toFixed(2)} s`).join('\n')}`);
  if (motion.shortHolds.length) console.log(`  info short holds: ${shown(motion.shortHolds.map(span))}`);
  return {failed: checks.filter((c) => !c[1]).length, motionFailed: motionChecks.filter((c) => !c[1]).length};
};
