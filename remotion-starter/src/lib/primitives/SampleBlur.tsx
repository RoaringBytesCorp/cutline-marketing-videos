// Time-centred sub-frame motion blur with an adaptive sample count. Promoted from a generation's scene code. All of
// the library's sampled blur runs through here (<MotionBlur> is <FreezeBlur> with a fixed count and an on/off range).
//  * It replaces @remotion/motion-blur's CameraMotionBlur, which stacks n `plus-lighter` layers pre-scaled by
//    opacity(1/n) in 8 bits, so colours shift slightly (each channel lands on n × round(v / n)); whose samples cover
//    [f + 1 − shutter, f + 1], so the picture leads the frame by about 0.7 frame at 180° and jumps when the blur
//    switches on or off; and which drops samples near frame 0 of its Sequence, so a scene's first frames lose blur.
//  * Here samples are centred on the frame (offsets ±shutter/2), so switching the blur on or off never shifts the
//    picture, and they are averaged by a binary tree: each node adds its two halves at opacity 0.5 (`plus-lighter`,
//    isolated), a true average even on transparent content, rounded once per level.
//  * <SampleBlur> takes explicit times from a pure pose function, so two scenes sharing one trajectory produce
//    identical blur on both sides of a seam. <FreezeBlur> samples a subtree that animates from useCurrentFrame().
import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Freeze, useCurrentFrame} from 'remotion';
import {UNIT} from '../../video';

/** Shutter as a fraction of a frame (0.5 = 180°, film-like). */
export const SHUTTER = 0.5;
/** Max spacing between samples along the smear, frame px (1.6 at 1080p, 3.2 at 4K). */
export const SAMPLE_SPACING = 1.6 * UNIT;
/** Upper bound for the sample count (rounded up to a power of two for the tree). */
export const MAX_SAMPLES = 32;
/**
 * Below this exposure (frame px) motion renders sharp: a 2–3 sample blur adds nothing visible, and samples are
 * drawn flattened (2D), where text snaps to whole pixels, so a slow settle would jitter.
 */
export const MIN_BLUR_TRAVEL = 4 * UNIT;

/** Samples needed for an exposure that travels `travel` frame px during the shutter. 1 = no blur. */
export const samplesFor = (travel: number, max = MAX_SAMPLES, spacing = SAMPLE_SPACING): number =>
  Math.abs(travel) < MIN_BLUR_TRAVEL ? 1 : Math.min(max, Math.ceil(Math.abs(travel) / spacing));

/** Travel (frame px) of a rect during the shutter around frame f: the largest corner displacement. */
export const rectTravel = (rect: (t: number) => {x: number; y: number; w: number; h: number}, f: number, shutter = SHUTTER): number => {
  const a = rect(f - shutter / 2);
  const b = rect(f + shutter / 2);
  return Math.hypot(Math.max(Math.abs(b.x - a.x), Math.abs(b.x + b.w - a.x - a.w)), Math.max(Math.abs(b.y - a.y), Math.abs(b.y + b.h - a.y - a.h)));
};

/** Inspection switch: wrap a tree in <BlurOffContext.Provider value> to render every blurred element sharp. */
export const BlurOffContext = createContext(false);

const InSampleContext = createContext(false);
const OuterFrameContext = createContext<number | null>(null);

/** The real (integer) frame, also inside blur samples: for values that must not smear, like a counter's digits. */
export const useOuterFrame = (): number => {
  const f = useCurrentFrame();
  const outer = useContext(OuterFrameContext);
  return outer ?? f;
};

/**
 * Transform suffix that keeps slowly moving text off Chrome's whole-pixel snapping: axis-aligned text holds, then
 * jumps 1 px. A tiny 3D tilt composites the layer in 3D (smooth). Inside blur samples the tree's filter flattens
 * 3D, so there a tiny 2D tilt is used instead. Append it to the transform of slowly drifting text.
 */
export const useSubpixel = (): string => (useContext(InSampleContext) ? 'rotate(0.04deg)' : 'rotateX(0.01deg)');

/** n rounded up to a power of two, and the n time-centred sample times around f. */
export const sampleTimes = (f: number, samples: number, shutter = SHUTTER): number[] => {
  const n = Math.min(MAX_SAMPLES, 2 ** Math.ceil(Math.log2(Math.max(1, samples))));
  return Array.from({length: n}, (_, i) => f + shutter * ((i + 0.5) / n - 0.5));
};

const HALF: React.CSSProperties = {mixBlendMode: 'plus-lighter', filter: 'opacity(0.5)'};

const Tree: React.FC<{times: number[]; leaf: (t: number) => React.ReactNode}> = ({times, leaf}) => {
  if (times.length === 1) return <>{leaf(times[0])}</>;
  const h = times.length / 2;
  return (
    <AbsoluteFill style={{isolation: 'isolate'}}>
      <AbsoluteFill style={HALF}>
        <Tree times={times.slice(0, h)} leaf={leaf} />
      </AbsoluteFill>
      <AbsoluteFill style={HALF}>
        <Tree times={times.slice(h)} leaf={leaf} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export type SampleBlurProps = {
  /** The frame to expose, in the same clock as `render` (often the global frame). */
  f: number;
  /** Sample count (rounded up to a power of two). 1 renders a single sharp sample. Use samplesFor(travel). */
  n: number;
  shutter?: number;
  /** Draws the element at fractional frame t, absolutely positioned in the parent's space. Must be pure. */
  render: (t: number) => React.ReactNode;
};

/** Explicit sampling of a pure pose function: the seam-safe blur. */
export const SampleBlur: React.FC<SampleBlurProps> = ({f, n, shutter = SHUTTER, render}) => {
  const off = useContext(BlurOffContext);
  if (n <= 1 || off) return <>{render(f)}</>;
  return (
    <OuterFrameContext.Provider value={f}>
      <InSampleContext.Provider value>
        <Tree times={sampleTimes(f, n, shutter)} leaf={(t) => <AbsoluteFill>{render(t)}</AbsoluteFill>} />
      </InSampleContext.Provider>
    </OuterFrameContext.Provider>
  );
};

export type FreezeBlurProps = {n: number; shutter?: number; children: React.ReactNode};

/** Freeze-based sampling for a subtree that animates from useCurrentFrame(). Centred, so no frame-0 dropout after it. */
export const FreezeBlur: React.FC<FreezeBlurProps> = ({n, shutter = SHUTTER, children}) => {
  const frame = useCurrentFrame();
  const off = useContext(BlurOffContext);
  if (n <= 1 || off) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <OuterFrameContext.Provider value={frame}>
      <InSampleContext.Provider value>
        <Tree times={sampleTimes(frame, n, shutter)} leaf={(t) => <Freeze frame={t}>{children}</Freeze>} />
      </InSampleContext.Provider>
    </OuterFrameContext.Provider>
  );
};
