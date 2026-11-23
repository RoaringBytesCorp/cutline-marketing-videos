import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, progress} from '../motion';
import {splitGraphemes} from './graphemes';

export type TextRollProps = {
  /** One string (use \n for line breaks) or an array of lines. */
  text: string | string[];
  /**
   * Unit that rolls: whole lines, words, or characters. 'char' splits by grapheme and sets each one on its own, so
   * kerning between letters is lost and joined scripts (Arabic, Devanagari…) break: use it for scripts without
   * shaping, and 'word' or 'line' for the rest.
   */
  mode?: 'line' | 'word' | 'char';
  start?: number;
  /** Frames between units (defaults: line 6, word 3, char 1.2). */
  stagger?: number;
  /** Frames each unit takes to roll in. */
  duration?: number;
  /** 'up' rolls in from below (default); 'down' from above. */
  direction?: 'up' | 'down';
  /** Land with a slight overshoot (default true). */
  overshoot?: boolean;
  /** Small tilt that straightens as the unit lands (deg). */
  tilt?: number;
  /** Roll out (upward) starting at this local frame. */
  exitAt?: number;
  exitStagger?: number;
  exitDuration?: number;
  /** Text style for the whole block (e.g. typeStyle() from src/foundation/type). */
  style?: React.CSSProperties;
  /** Per-line container style, e.g. alignment. */
  lineStyle?: React.CSSProperties;
  /** Style override per word (global word index across lines), e.g. to colour one word in the accent colour. */
  wordStyle?: (word: string, index: number) => React.CSSProperties | undefined;
  /** Sets text-align. Omit it to keep `style.textAlign` (or the inherited alignment). */
  align?: 'left' | 'center' | 'right';
};

// Each unit rolls behind its own mask. The mask clips above and below only (the roll is vertical), with room for
// ascenders and descenders; sideways it stays open, so tight tracking and italics don't lose ink at a word's edge.
const MASK: React.CSSProperties = {display: 'inline-block', verticalAlign: 'top', clipPath: 'inset(-0.08em -0.6em -0.14em -0.6em)'};
// A unit travels its own height (%) plus this many em, which carries tall glyphs and descenders fully past the mask.
const TRAVEL_PCT = 105;
const TRAVEL_EM = 0.3;

/** Per-line / per-word / per-char mask roll with stagger, overshoot and an optional staggered roll-out. */
export const TextRoll: React.FC<TextRollProps> = ({
  text,
  mode = 'word',
  start = 0,
  stagger,
  duration = 22,
  direction = 'up',
  overshoot = true,
  tilt = 6,
  exitAt,
  exitStagger,
  exitDuration = 14,
  style,
  lineStyle,
  wordStyle,
  align,
}) => {
  const frame = useCurrentFrame();
  const lines = Array.isArray(text) ? text : text.split('\n');
  const step = stagger ?? (mode === 'line' ? 6 : mode === 'word' ? 3 : 1.2);
  const exStep = exitStagger ?? step * 0.6;
  const sign = direction === 'up' ? 1 : -1;
  let unitIndex = 0;
  let wordIndex = 0;

  const unit = (content: string, key: string, extra?: React.CSSProperties) => {
    const i = unitIndex++;
    const s = start + i * step;
    const p = progress(frame, s, s + duration, overshoot ? ease.backOutSoft : ease.out);
    const pin = progress(frame, s, s + duration * 0.6, ease.out);
    // travel: 1 = a full roll below the line (above it for 'down'), 0 = at rest, negative = rolled out upward
    let travel = sign * (1 - p);
    let rot = sign * tilt * (1 - pin);
    let opacity = Math.min(1, pin * 1.6);
    if (exitAt !== undefined) {
      const e = progress(frame, exitAt + i * exStep, exitAt + i * exStep + exitDuration, ease.in);
      travel -= e;
      rot -= e * tilt * 0.5;
      opacity *= e >= 1 ? 0 : 1 - e * 0.3;
    }
    return (
      <span key={key} style={MASK}>
        <span
          style={{
            display: 'inline-block',
            transform: `translateY(calc(${(travel * TRAVEL_PCT).toFixed(3)}% + ${(travel * TRAVEL_EM).toFixed(4)}em)) rotate(${rot}deg)`,
            transformOrigin: '0% 100%',
            opacity,
            whiteSpace: 'pre',
            ...extra,
          }}
        >
          {content}
        </span>
      </span>
    );
  };

  return (
    <div style={align ? {...style, textAlign: align} : style}>
      {lines.map((line, li) => {
        let inner: React.ReactNode;
        if (mode === 'line') {
          inner = unit(line, `l${li}`);
          wordIndex += line.split(' ').length;
        } else {
          const words = line.split(' ');
          inner = words.map((w, wi) => {
            const ws = wordStyle?.(w, wordIndex++);
            const space = wi < words.length - 1 ? ' ' : '';
            if (mode === 'word') return <React.Fragment key={`w${li}-${wi}`}>{unit(w, `u${li}-${wi}`, ws)}{space}</React.Fragment>;
            return (
              <span key={`w${li}-${wi}`} style={{display: 'inline-block', whiteSpace: 'pre', ...ws}}>
                {splitGraphemes(w).map((c, ci) => unit(c, `c${li}-${wi}-${ci}`))}
                {space}
              </span>
            );
          });
        }
        return (
          <div key={li} style={{display: 'block', whiteSpace: 'pre', ...lineStyle}}>
            {inner}
          </div>
        );
      })}
    </div>
  );
};
