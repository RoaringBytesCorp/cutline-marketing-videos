// PLACEHOLDER frame geometry: the safe zones of the target platforms and the layout presets scenes share.
// The foundation agent sets SAFE_ZONES from the brief's platforms and designs LAYOUTS for the storyboard.
import {safeRect, type Rect, type SafeZoneSpec} from '../lib';
import {FORMAT, HEIGHT, u, WIDTH} from '../video';

export const FRAME: Rect = {x: 0, y: 0, w: WIDTH, h: HEIGHT};
export const CENTER = {x: WIDTH / 2, y: HEIGHT / 2} as const;

/**
 * PLACEHOLDER: the safe-zone presets of every target platform (the overlay shows each one). 9:16 social video uses
 * 'social-9x16'; every other format the 5% 'default'. Add custom margins for a platform the presets don't cover.
 */
export const SAFE_ZONES: SafeZoneSpec[] = FORMAT === 'portrait' ? ['social-9x16'] : ['default'];

/** The strictest safe rect: the intersection of every preset in SAFE_ZONES. Key text, logos and the CTA stay in it. */
export const SAFE: Rect = SAFE_ZONES.map((s) => safeRect(WIDTH, HEIGHT, s)).reduce((a, b) => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return {x, y, w: Math.min(a.x + a.w, b.x + b.w) - x, h: Math.min(a.y + a.h, b.y + b.h) - y};
});

/** PLACEHOLDER layout presets (frame px, inside SAFE). Keep copy in fixed slots so it doesn't jump between cuts. */
export const LAYOUTS = {
  /** Centred statement or end card. */
  centered: {copy: {x: SAFE.x + SAFE.w * 0.1, y: SAFE.y + SAFE.h * 0.3, w: SAFE.w * 0.8, h: SAFE.h * 0.4} as Rect},
  /** Copy across the top of the safe area, product below. */
  copyTop: {copy: {x: SAFE.x, y: SAFE.y, w: SAFE.w, h: u(200)} as Rect, ui: {x: SAFE.x, y: SAFE.y + u(220), w: SAFE.w, h: SAFE.h - u(220)} as Rect},
} as const;
