import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FPS} from '../../video';
import {splitGraphemes} from './graphemes';

export type TypeOnProps = {
  /** Typed one grapheme at a time, so an emoji or an accented letter never appears in halves. */
  text: string;
  start?: number;
  /** Characters per second (default 28). */
  cps?: number;
  /** Show a caret (solid while typing, then blinking). */
  caret?: boolean;
  caretColor?: string;
  /** Caret width in em. */
  caretWidth?: number;
  /**
   * Frames per full blink cycle once typing ends (on for half, off for half). Default 60 (1 s).
   * To blink on the music, pass a beat length, e.g. FRAMES_PER_BEAT from src/foundation/timing.
   */
  blinkPeriod?: number;
  /** Hide the caret from this local frame. */
  caretHideAt?: number;
  style?: React.CSSProperties;
  /** Reserve the full text width so surrounding layout doesn't shift while typing. */
  reserveWidth?: boolean;
};

// Keeps a whole-number product that floating point leaves just under (or over) the integer on the right frame.
const EPS = 1e-9;

/**
 * Number of characters visible at a frame (exported so scenes can sync other things to typing). `length` counts
 * graphemes, which is text.length for plain text without emoji or combining marks.
 */
export const typedChars = (frame: number, start: number, length: number, cps = 28): number => Math.max(0, Math.min(length, Math.floor(((frame - start) * cps) / FPS + EPS)));

/** Character type-on with a caret. Deterministic: characters appear on whole frames. */
export const TypeOn: React.FC<TypeOnProps> = ({text, start = 0, cps = 28, caret = true, caretColor = 'currentColor', caretWidth = 0.06, blinkPeriod = 60, caretHideAt, style, reserveWidth = false}) => {
  const frame = useCurrentFrame();
  const chars = splitGraphemes(text);
  const n = typedChars(frame, start, chars.length, cps);
  const typing = frame >= start && n < chars.length;
  // the first frame on which every character is visible
  const doneAt = start + Math.ceil((chars.length * FPS) / cps - EPS);
  const half = Math.max(1, blinkPeriod / 2);
  const blinkOn = typing || frame < start || Math.floor((frame - doneAt) / half) % 2 === 0;
  const showCaret = caret && frame >= start - 6 && (caretHideAt === undefined || frame < caretHideAt) && blinkOn;
  return (
    <span style={{position: 'relative', display: 'inline-block', whiteSpace: 'pre', ...style}}>
      {reserveWidth ? <span style={{visibility: 'hidden'}}>{text}</span> : null}
      <span style={reserveWidth ? {position: 'absolute', left: 0, top: 0} : undefined}>
        {chars.slice(0, n).join('')}
        <span
          style={{
            display: 'inline-block',
            width: `${caretWidth}em`,
            height: '1.05em',
            marginLeft: '0.04em',
            verticalAlign: '-0.15em',
            background: caretColor,
            borderRadius: '0.03em',
            opacity: showCaret ? 1 : 0,
          }}
        />
      </span>
    </span>
  );
};
