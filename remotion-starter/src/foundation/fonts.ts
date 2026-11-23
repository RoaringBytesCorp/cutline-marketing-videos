// PLACEHOLDER font loading. Imported once by Root.tsx, so every composition waits for the fonts.
// The foundation agent puts the brand font files in public/fonts/ (licensed for this use; never substitute another
// face), lists them in FONT_FILES, and points fontStack at the brand families. Until then the list is empty and the
// stacks fall back to the system UI face, which is acceptable for the starter only.
// @remotion/fonts' loadFont() delays rendering until each face is ready; we also block on document.fonts.ready,
// and cancel the render if any file fails, rather than render with a fallback face. Once FONT_FILES lists files,
// loadAllFonts() also throws if a fontStack family or a type-scale weight is not among them.
import {loadFont} from '@remotion/fonts';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';

export type FontFile = {
  /** CSS family name to register. */
  family: string;
  /** Path inside public/fonts/, e.g. 'brand/Brand-Variable.woff2'. */
  file: string;
  /** '400', or a range for a variable font: '100 900'. */
  weight?: string;
  style?: 'normal' | 'italic';
};

/** PLACEHOLDER: e.g. {family: 'Brand Sans', file: 'brand-sans/BrandSans-Variable.woff2', weight: '100 900'}. */
export const FONT_FILES: FontFile[] = [];

const SYSTEM = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

/** PLACEHOLDER CSS font-family stacks: replace with '"Brand Display", sans-serif' and so on. */
export const fontStack = {
  display: SYSTEM,
  text: SYSTEM,
} as const;

/** A face a type style needs: one of the fontStack families at a weight. */
export type FontNeed = {family: keyof typeof fontStack; fontWeight: number};

const firstFamily = (stack: string): string => stack.split(',')[0].trim().replace(/^["']|["']$/g, '');

const coversWeight = (f: FontFile, weight: number): boolean => {
  const [lo, hi = lo] = (f.weight ?? '400').trim().split(/\s+/).map((w) => (w === 'normal' ? 400 : w === 'bold' ? 700 : Number(w)));
  return weight >= lo && weight <= hi;
};

/**
 * Throws when a fontStack family or a weight the type scale uses is not loaded by FONT_FILES. Without this the
 * browser quietly falls back to the next family in the stack (a typo in a family name renders in the system face) or
 * to another weight. While FONT_FILES is empty (the starter's system-face state) there is nothing to check.
 */
const checkFontCoverage = (needs: readonly FontNeed[]): void => {
  if (FONT_FILES.length === 0) return;
  const loaded = [...new Set(FONT_FILES.map((f) => f.family))].join(', ');
  for (const [key, stack] of Object.entries(fontStack)) {
    const family = firstFamily(stack);
    if (!FONT_FILES.some((f) => f.family === family)) {
      throw new Error(`fontStack.${key} starts with "${family}", but FONT_FILES only loads: ${loaded}. Fix the family name in src/foundation/fonts.ts or add the font file.`);
    }
  }
  for (const need of needs) {
    const family = firstFamily(fontStack[need.family]);
    if (!FONT_FILES.some((f) => f.family === family && (f.style ?? 'normal') === 'normal' && coversWeight(f, need.fontWeight))) {
      throw new Error(`The type scale uses "${family}" at weight ${need.fontWeight}, but no upright file in FONT_FILES covers that weight. Add the file or change the weight.`);
    }
  }
};

let started = false;

/** Call once with the faces the type scale needs, e.g. loadAllFonts(Object.values(typeScale)). */
export const loadAllFonts = (needs: readonly FontNeed[] = []): void => {
  if (started) return;
  started = true;
  checkFontCoverage(needs);
  const handle = delayRender('Brand fonts');
  Promise.all(FONT_FILES.map((f) => loadFont({family: f.family, url: staticFile(`fonts/${f.file}`), weight: f.weight ?? '400', style: f.style ?? 'normal'})))
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch((err) => cancelRender(err));
};
