// Elevation shadows: soft, neutral and layered (a tight contact shadow plus a wide ambient one), so lifted UI reads
// as depth rather than as a drop-shadow effect. Offsets and blurs are 1080p values scaled by UNIT (2 at 4K).
// For a brand-tinted set, call makeElevation({ink: 'r, g, b'}) in src/foundation.
import {UNIT} from '../video';
import {mix} from './motion';

export type ElevationOptions = {
  /** Shadow colour as an "r, g, b" triplet (default neutral slate 31, 38, 44). */
  ink?: string;
  /** px multiplier (default UNIT from src/video.ts). */
  unit?: number;
};
export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

const DEFAULT_INK = '31, 38, 44';

/** The colour and length formatters every shadow below shares. */
const shadowParts = ({ink = DEFAULT_INK, unit = UNIT}: ElevationOptions) => ({
  c: (a: number) => `rgba(${ink}, ${a.toFixed(3)})`,
  p: (v: number) => `${+(v * unit).toFixed(2)}px`,
});

/** Box-shadow presets 0 (flat) to 5 (floating). */
export const makeElevation = (opts: ElevationOptions = {}): Record<ElevationLevel, string> => {
  const {c, p} = shadowParts(opts);
  return {
    0: 'none',
    1: `0 ${p(1)} ${p(2)} ${c(0.06)}, 0 ${p(2)} ${p(4)} ${c(0.06)}`,
    2: `0 ${p(1)} ${p(2)} ${c(0.05)}, 0 ${p(4)} ${p(10)} ${c(0.06)}, 0 ${p(10)} ${p(24)} ${c(0.06)}`,
    3: `0 ${p(2)} ${p(4)} ${c(0.05)}, 0 ${p(10)} ${p(22)} ${c(0.08)}, 0 ${p(24)} ${p(48)} ${c(0.08)}`,
    4: `0 ${p(3)} ${p(6)} ${c(0.06)}, 0 ${p(16)} ${p(36)} ${c(0.1)}, 0 ${p(40)} ${p(80)} ${c(0.1)}`,
    5: `0 ${p(4)} ${p(10)} ${c(0.07)}, 0 ${p(24)} ${p(56)} ${c(0.12)}, 0 ${p(64)} ${p(128)} ${c(0.14)}`,
  };
};

/** Default neutral elevation set at the project's resolution: elevation[3]. */
export const elevation = makeElevation();

/** Continuous elevation for lifts: 0 (resting) to 1 (high). Use while an element rises toward the camera. */
export const liftShadow = (lift: number, opts: ElevationOptions = {}): string => {
  const l = Math.max(0, lift);
  const {c, p} = shadowParts(opts);
  return `0 ${p(mix(1, 6, l))} ${p(mix(2, 14, l))} ${c(mix(0.05, 0.08, l))}, 0 ${p(mix(2, 48, l))} ${p(mix(4, 110, l))} ${c(mix(0.04, 0.16, l))}`;
};

/** CSS filter version of a level. It follows alpha, so use it for SVG, cut-outs and irregular shapes. */
export const dropShadowFilter = (level: 1 | 2 | 3 | 4 | 5, opts: ElevationOptions = {}): string => {
  const {c, p} = shadowParts(opts);
  return `drop-shadow(0 ${p([0, 2, 6, 12, 20, 32][level])} ${p([0, 4, 12, 24, 40, 64][level])} ${c([0, 0.08, 0.1, 0.12, 0.14, 0.16][level])})`;
};
