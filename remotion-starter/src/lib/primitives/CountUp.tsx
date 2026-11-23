import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, progress} from '../motion';

export type CountUpProps = {
  from?: number;
  to: number;
  start?: number;
  duration?: number;
  easing?: (t: number) => number;
  decimals?: number;
  /** Thousands separator (default ","). */
  separator?: string;
  /** Decimal separator (default "."). For German-style numbers pass separator="." and decimalSeparator=",". */
  decimalSeparator?: string;
  prefix?: string;
  suffix?: string;
  /** 'count' re-typesets the number; 'roll' spins each digit like an odometer (a negative from/to counts instead). */
  mode?: 'count' | 'roll';
  style?: React.CSSProperties;
};

export const formatNumber = (v: number, decimals = 0, separator = ',', decimalSeparator = '.'): string => {
  let fixed = v.toFixed(decimals);
  if (Number(fixed) === 0) fixed = fixed.replace('-', ''); // a value that rounds to zero has no sign
  const [int, dec] = fixed.split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return dec ? `${withSep}${decimalSeparator}${dec}` : withSep;
};

/** Value of a count-up at a frame (exported for syncing other motion to the count). */
export const countValue = (frame: number, from: number, to: number, start: number, duration: number, easing: (t: number) => number = ease.out): number => from + (to - from) * progress(frame, start, start + duration, easing);

const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

// One odometer column. An invisible in-flow 0 gives it the font's own digit width and baseline, so the number lines
// up with the prefix, suffix and separators at any line-height; the strip of digits moves behind it, one line box
// per digit. The clip is a clip-path, not overflow, because overflow would move the column's baseline to its bottom.
const Column: React.FC<{pos: number}> = ({pos}) => (
  <span style={{display: 'inline-block', position: 'relative', clipPath: 'inset(0 -0.5em)'}}>
    <span style={{visibility: 'hidden'}}>0</span>
    <span style={{position: 'absolute', left: 0, top: 0, width: '100%', textAlign: 'center', transform: `translateY(${(-pos * 100) / STRIP.length}%)`}}>
      {STRIP.map((d, i) => (
        <span key={i} style={{display: 'block'}}>
          {d}
        </span>
      ))}
    </span>
  </span>
);

/** `units` is the value in its smallest displayed unit (value × 10^decimals), so every column is a power of ten. */
const Odometer: React.FC<{units: number; intDigits: number; decimals: number; separator: string; decimalSeparator: string}> = ({units, intDigits, decimals, separator, decimalSeparator}) => {
  const cols: React.ReactNode[] = [];
  for (let k = intDigits + decimals - 1; k >= 0; k--) {
    const p = 10 ** k;
    const carry = k === 0 ? units % 1 : Math.max(0, Math.min(1, (units % p) - (p - 1)));
    const pos = (Math.floor(units / p) % 10) + carry;
    const place = k - decimals; // 0 = ones, 3 = thousands, negative = a fraction digit
    if (place > 0 && units < p && carry === 0) continue; // a leading zero: no column yet
    cols.push(<Column key={k} pos={pos} />);
    if (place > 0 && place % 3 === 0) cols.push(<span key={`s${k}`}>{separator}</span>);
    if (place === 0 && decimals > 0) cols.push(<span key="dec">{decimalSeparator}</span>);
  }
  return <>{cols}</>;
};

/** Eased number count with tabular figures and a thousands separator. */
export const CountUp: React.FC<CountUpProps> = ({from = 0, to, start = 0, duration = 45, easing = ease.out, decimals = 0, separator = ',', decimalSeparator = '.', prefix = '', suffix = '', mode = 'count', style}) => {
  const frame = useCurrentFrame();
  let number: React.ReactNode;
  if (mode === 'roll' && from >= 0 && to >= 0) {
    // Roll between the rounded end values in display units, so the last digit always comes to rest on a figure.
    const scale = 10 ** decimals;
    const fromUnits = Math.round(from * scale);
    const toUnits = Math.round(to * scale);
    const units = Math.max(0, countValue(frame, fromUnits, toUnits, start, duration, easing));
    const intDigits = String(Math.floor(Math.max(fromUnits, toUnits, units) / scale)).length;
    number = <Odometer units={units} intDigits={intDigits} decimals={decimals} separator={separator} decimalSeparator={decimalSeparator} />;
  } else {
    const v = countValue(frame, from, to, start, duration, easing);
    number = formatNumber(decimals ? v : Math.round(v), decimals, separator, decimalSeparator);
  }
  return (
    <span style={{fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', whiteSpace: 'pre', display: 'inline-block', ...style}}>
      {prefix}
      {number}
      {suffix}
    </span>
  );
};
