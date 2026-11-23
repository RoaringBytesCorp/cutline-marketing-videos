// Video format: the one place that sets the frame size, frame rate and length.
// Set DEFAULT_FORMAT for the generation's target platform; WIDTH and HEIGHT follow from FORMAT and from SHORT_SIDE.
// Components in src/lib size themselves from useVideoConfig(); the library's pure helpers (elevation, driftAt, the
// blur thresholds, springs) read UNIT and FPS from here, as do the brand layer (src/foundation) and scenes.
//
// A generation makes one cut, which can ship as several deliverables: one per orientation and language. They all
// render from this project. The input props `format` and `lang` choose the deliverable (the scripts' --format and
// --lang set them; with the Remotion CLI pass --props='{"format":"portrait","lang":"de"}'). Without them a render is
// the default deliverable.
import {getInputProps} from 'remotion';

export type Format = 'landscape' | 'portrait' | '4x5';

/**
 * Short side of the frame in px: 2160 (the Quality bar default) or 1080. Set it to 1080 only when the brief asks for
 * 1080p. UNIT follows, so layouts written with u() look the same in both.
 */
export const SHORT_SIDE: 2160 | 1080 = 2160;

/** Frame size of each format (3840×2160, 2160×3840 and 2160×2700 at 2160p; half of each at 1080p). */
export const FORMATS: Record<Format, {width: number; height: number; aspect: string}> = {
  landscape: {width: (SHORT_SIDE * 16) / 9, height: SHORT_SIDE, aspect: '16:9'},
  portrait: {width: SHORT_SIDE, height: (SHORT_SIDE * 16) / 9, aspect: '9:16'},
  '4x5': {width: SHORT_SIDE, height: (SHORT_SIDE * 5) / 4, aspect: '4:5'},
};

/** PLACEHOLDER: the generation's orientation, or the first deliverable's when the brief lists several. */
const DEFAULT_FORMAT: Format = 'landscape';
/** PLACEHOLDER: language code of the on-screen copy, or the first deliverable's when the brief lists several. */
const DEFAULT_LANGUAGE = 'en';

const {format, lang} = getInputProps() as {format?: string; lang?: string};
if (format !== undefined && !(format in FORMATS)) {
  throw new Error(`The input prop format is "${format}". It must be one of ${Object.keys(FORMATS).join(', ')}.`);
}

/** The orientation of this render. Layouts that differ between orientations branch on it. */
export const FORMAT: Format = (format as Format | undefined) ?? DEFAULT_FORMAT;
/** The language of this render. The foundation keeps the copy of every language in one place and picks by it. */
export const LANGUAGE: string = lang ?? DEFAULT_LANGUAGE;

export const WIDTH = FORMATS[FORMAT].width;
export const HEIGHT = FORMATS[FORMAT].height;
export const FPS = 60;

/** PLACEHOLDER: length of Main in frames (seconds × FPS). Must equal the sum of the scene durations once scenes exist. */
export const DURATION_IN_FRAMES = 10 * FPS;

/**
 * Reference unit: 1 UNIT = 1 px of a 1080p frame (the short side divided by 1080). It is 2 in every 2160p format
 * and 1 at 1080p. Use u() to write sizes you think of in 1080p terms: u(24) = 48 px at 4K.
 */
export const UNIT = Math.min(WIDTH, HEIGHT) / 1080;
export const u = (px1080: number): number => px1080 * UNIT;
