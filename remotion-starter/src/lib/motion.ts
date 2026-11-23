// Motion language: named curves, spring presets and small deterministic helpers.
// Rules (see README.md): everything eases (anticipation → move → overshoot → settle);
// linear only for constant spins, scrolls and marching dashes.
import {Easing, interpolate, measureSpring, spring, type SpringConfig} from 'remotion';
import {FPS} from '../video';

/* ------------------------------------------------------------- curves */

/** Named cubic-bezier curves. Use with interpolate(..., {easing: ease.out}) or the helpers below. */
export const ease = {
  /** Default entrance: fast start, long soft landing (expo-out family). */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** Gentler entrance for large surfaces. */
  outSoft: Easing.bezier(0.25, 0.8, 0.25, 1),
  /** Exit: accelerates away, no landing. */
  in: Easing.bezier(0.7, 0, 0.84, 0),
  /** Exit for small elements (shorter tail). */
  inSoft: Easing.bezier(0.5, 0, 0.75, 0),
  /** Position/camera move between two rests: slow-out, fast middle, slow-in. */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** Snappier move with a hard middle (whip pans, swooshes). */
  whip: Easing.bezier(0.8, 0, 0.1, 1),
  /** Anticipation: pulls back below 0 before going (back-in). */
  backIn: Easing.bezier(0.36, 0, 0.66, -0.56),
  /** Overshoot landing: passes 1 and settles back (back-out). */
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1),
  /** Subtle overshoot landing for text and UI. */
  backOutSoft: Easing.bezier(0.22, 1.3, 0.36, 1),
  /** Anticipation + overshoot in one move. */
  backInOut: Easing.bezier(0.68, -0.6, 0.32, 1.6),
  /** Constant speed. ONLY for spins, scrolls, marching dashes. */
  linear: Easing.linear,
} as const;
export type EaseName = keyof typeof ease;

/* ------------------------------------------------------------ springs */

/**
 * Spring presets. All are under-damped, so they overshoot and settle.
 * Settle times (to within 0.5%) are noted; use springDuration(preset) to get them exactly, in frames.
 */
export const springs = {
  /** UI pops, chips, icons. ~6% overshoot, settles in ~0.4 s. */
  snappy: {damping: 14, mass: 0.6, stiffness: 180, overshootClamping: false},
  /** Playful pops, badges, the CTA button. ~23% overshoot, wobbles, ~0.8 s. */
  bouncy: {damping: 9, mass: 0.7, stiffness: 160, overshootClamping: false},
  /** Large surfaces, panels, camera settles. ~4% overshoot, ~0.85 s. */
  soft: {damping: 12, mass: 1, stiffness: 70, overshootClamping: false},
  /** Heavy objects (product shots, cards landing, stamps). ~10% overshoot, slow and weighty, ~1.2 s. */
  heavy: {damping: 22, mass: 2.4, stiffness: 140, overshootClamping: false},
} as const satisfies Record<string, Partial<SpringConfig>>;
export type SpringName = keyof typeof springs;

/**
 * Spring value at `frame`, starting at `start` (0 before it). Goes 0 → 1 with the preset's overshoot.
 * `durationInFrames` stretches the spring to an exact length (the overshoot shape is kept).
 */
export const springAt = (
  frame: number,
  start: number,
  preset: SpringName | Partial<SpringConfig> = 'snappy',
  opts: {from?: number; to?: number; durationInFrames?: number; reverse?: boolean} = {},
): number => {
  const config = typeof preset === 'string' ? springs[preset] : preset;
  // A stretched spring is cut off where it is within the rest threshold of `to`, then snaps to it on the next frame.
  // The default 0.5% is a visible tick on a large move, so stretch a longer tail (0.05%).
  const durationRestThreshold = opts.durationInFrames === undefined ? undefined : 0.0005;
  return spring({frame: frame - start, fps: FPS, config, from: opts.from ?? 0, to: opts.to ?? 1, durationInFrames: opts.durationInFrames, durationRestThreshold, reverse: opts.reverse});
};

/** How many frames a preset takes to settle. */
export const springDuration = (preset: SpringName | Partial<SpringConfig> = 'snappy'): number =>
  measureSpring({fps: FPS, config: typeof preset === 'string' ? springs[preset] : preset});

/* ------------------------------------------------------------ helpers */

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Eased 0 → 1 progress between two frames (clamped). A zero or negative length is a step at `start`. */
export const progress = (frame: number, start: number, end: number, easing: (t: number) => number = ease.out): number =>
  end <= start ? (frame >= start ? 1 : 0) : interpolate(frame, [start, end], [0, 1], {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Entrance progress: 0 before `start`, eased to 1 over `duration` frames. */
export const enter = (frame: number, start: number, duration = 24, easing: (t: number) => number = ease.out): number => progress(frame, start, start + duration, easing);

/** Exit progress: 1 before `start`, eased to 0 over `duration` frames. Multiply it into opacity/scale. */
export const exit = (frame: number, start: number, duration = 14, easing: (t: number) => number = ease.in): number => 1 - progress(frame, start, start + duration, easing);

/** Combined presence: enter at `inStart`, exit at `outStart` (omit to stay). */
export const presence = (frame: number, inStart: number, inDur = 24, outStart = Infinity, outDur = 14): number =>
  enter(frame, inStart, inDur) * (outStart === Infinity ? 1 : exit(frame, outStart, outDur));

/**
 * Stagger: start frame of item `i`. `step` frames apart (2–4 for letters/rows, 4–8 for cards).
 * Pass `from: 'center' | 'end'` to fan out from the middle or the last item.
 */
export const stagger = (i: number, step: number, base = 0, opts: {count?: number; from?: 'start' | 'center' | 'end'} = {}): number => {
  const {count = 0, from = 'start'} = opts;
  if (from === 'end' && count) return base + (count - 1 - i) * step;
  if (from === 'center' && count) return base + Math.abs(i - (count - 1) / 2) * step;
  return base + i * step;
};

/** Anticipate-then-go: dips to -`dip` over the first `share` of the move, then eases out past 1 and settles. */
export const anticipate = (frame: number, start: number, duration: number, dip = 0.12, share = 0.3): number => {
  if (duration <= 0) return frame >= start ? 1 : 0;
  const t = clamp01((frame - start) / duration);
  if (t <= 0) return 0;
  if (t < share) return -dip * Math.sin((t / share) * Math.PI * 0.5);
  const u = (t - share) / (1 - share);
  return mix(-dip, 1, ease.backOutSoft(u));
};

/** Damped oscillation after an impact (0 at impact, decays to 0). Use for wobble, squash settle, secondary motion. */
export const wobble = (frame: number, impact: number, opts: {amplitude?: number; frequency?: number; decay?: number} = {}): number => {
  const {amplitude = 1, frequency = 3, decay = 5} = opts;
  const t = (frame - impact) / FPS;
  if (t < 0) return 0;
  return amplitude * Math.exp(-decay * t) * Math.sin(2 * Math.PI * frequency * t);
};

/** Short pulse (0 → 1 → 0) on a beat, e.g. for scale bumps on every kick. */
export const pulse = (frame: number, at: number, attack = 3, release = 16): number => {
  if (frame < at - attack || frame > at + release) return 0;
  if (frame < at) return ease.out((frame - (at - attack)) / attack);
  return release > 0 ? 1 - ease.outSoft((frame - at) / release) : 1;
};

/** Sum of pulses on several beats (clamped to 1). */
export const pulses = (frame: number, ats: number[], attack = 3, release = 16): number => Math.min(1, ats.reduce((s, a) => s + pulse(frame, a, attack, release), 0));

/** Velocity (units per frame) of any frame → value function, by central difference. Drive motion blur from it. */
export const velocity = (fn: (f: number) => number, frame: number): number => (fn(frame + 0.5) - fn(frame - 0.5));

/** Interpolate along keyframes: kf = [[frame, value], ...], eased per segment. Two keys on one frame are a jump. */
export const keyframes = (frame: number, kf: [number, number][], easing: (t: number) => number = ease.inOut): number => {
  if (kf.length < 2) return kf.length ? kf[0][1] : 0;
  // interpolate() needs strictly increasing frames: nudge a repeated frame so the jump lands between two frames
  const frames: number[] = [];
  for (const [f] of kf) frames.push(frames.length && f <= frames[frames.length - 1] ? frames[frames.length - 1] + 1e-6 : f);
  return interpolate(
    frame,
    frames,
    kf.map((k) => k[1]),
    {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
};

/* ------------------------------------------------------------- rects */

export type Rect = {x: number; y: number; w: number; h: number};
export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), w: mix(a.w, b.w, t), h: mix(a.h, b.h, t)});
export const rectCenter = (r: Rect): {x: number; y: number} => ({x: r.x + r.w / 2, y: r.y + r.h / 2});
/** Rect → absolute-position CSS. */
export const rectStyle = (r: Rect): {position: 'absolute'; left: number; top: number; width: number; height: number} => ({position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h});
/** Transform that maps rect `from` onto rect `to` (translate + uniform-or-not scale), for FLIP-style morphs. */
export const flip = (from: Rect, to: Rect, t: number): string => {
  const r = lerpRect(from, to, t);
  return `translate(${r.x - from.x}px, ${r.y - from.y}px) scale(${r.w / from.w}, ${r.h / from.h})`;
};
