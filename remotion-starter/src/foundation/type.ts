// PLACEHOLDER video type scale. The foundation agent rebuilds it from the brand's typography: styles, weights,
// tracking and the minimum readable size for the target platform (28 here). Sizes are 1080p px multiplied by UNIT
// (2 at 4K). Root.tsx passes the scale to loadAllFonts(), which checks that the font files cover every weight in it.
import type React from 'react';
import {UNIT} from '../video';
import {colors} from './tokens';
import {fontStack} from './fonts';

type TypeSpec = {fontSize: number; lineHeight: number; fontWeight: number; letterSpacing?: string; textTransform?: 'uppercase'; family: keyof typeof fontStack; color?: string};

export const typeScale = {
  displayXL: {fontSize: 132, lineHeight: 1.0, fontWeight: 700, letterSpacing: '-0.035em', family: 'display'},
  displayL: {fontSize: 108, lineHeight: 1.02, fontWeight: 700, letterSpacing: '-0.03em', family: 'display'},
  displayM: {fontSize: 84, lineHeight: 1.05, fontWeight: 700, letterSpacing: '-0.025em', family: 'display'},
  headline: {fontSize: 60, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.015em', family: 'display'},
  sub: {fontSize: 34, lineHeight: 1.35, fontWeight: 400, family: 'text', color: colors.inkMuted},
  eyebrow: {fontSize: 28, lineHeight: 1.2, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', family: 'text', color: colors.accent},
  label: {fontSize: 28, lineHeight: 1.25, fontWeight: 500, family: 'text'},
  caption: {fontSize: 28, lineHeight: 1.35, fontWeight: 400, family: 'text', color: colors.inkMuted},
} as const satisfies Record<string, TypeSpec>;

export type TypeStyleName = keyof typeof typeScale;

/** CSS for a type style at the project's resolution, with optional overrides. */
export const typeStyle = (name: TypeStyleName, overrides: React.CSSProperties = {}): React.CSSProperties => {
  const s: TypeSpec = typeScale[name];
  return {
    fontFamily: fontStack[s.family],
    fontSize: s.fontSize * UNIT,
    lineHeight: s.lineHeight,
    fontWeight: s.fontWeight,
    letterSpacing: s.letterSpacing,
    textTransform: s.textTransform,
    color: s.color ?? colors.ink,
    fontKerning: 'normal',
    // never fake a weight or an italic the font files don't have
    fontSynthesis: 'none',
    ...overrides,
  };
};
