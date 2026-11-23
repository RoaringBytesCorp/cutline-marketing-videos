// PLACEHOLDER brand tokens: neutral values so the starter renders. The foundation agent replaces this file with the
// design system's tokens, copied verbatim (names and values), and documents them in FOUNDATION.md.
// Sizes here are frame px (written as 1080p values through u(), so they are doubled at 4K).
import {u} from '../video';

export const colors = {
  background: '#eceff2',
  surface: '#ffffff',
  ink: '#15191e',
  inkMuted: '#5a636e',
  line: '#d3d8de',
  accent: '#3b5bdb',
  accentSoft: '#dbe2ff',
  accentWarm: '#f08c4b',
  accentWarmSoft: '#fde6d6',
} as const;

export const radii = {s: u(6), m: u(12), l: u(24), pill: 9999} as const;

export const spacing = {xs: u(8), s: u(16), m: u(24), l: u(40), xl: u(64)} as const;
