import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, progress} from '../motion';
import {useFrameUnit} from '../units';

export type RippleProps = {
  /** Centre in the parent's px (the parent should be position:relative/absolute). */
  x: number;
  y: number;
  start?: number;
  count?: number;
  /** Frames between rings. */
  interval?: number;
  duration?: number;
  /** Final ring radius in frame px (default 160 × the frame unit). */
  maxRadius?: number;
  /** Ring colour (default currentColor: set `color` on a parent). */
  color?: string;
  /** Stroke width in frame px (default 3 × the frame unit). */
  strokeWidth?: number;
  /** Filled discs instead of rings. */
  filled?: boolean;
  /** Peak opacity. */
  opacity?: number;
};

/** Concentric rings expanding from a point (drop impacts, taps, accents on a beat). */
export const Ripple: React.FC<RippleProps> = ({x, y, start = 0, count = 3, interval = 6, duration = 36, maxRadius, color = 'currentColor', strokeWidth, filled = false, opacity = 0.6}) => {
  const frame = useCurrentFrame();
  const unit = useFrameUnit();
  const R = maxRadius ?? 160 * unit;
  const sw = strokeWidth ?? 3 * unit;
  if (frame < start || frame > start + (count - 1) * interval + duration) return null;
  const size = R * 2 + sw * 2;
  return (
    <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} style={{position: 'absolute', left: x - size / 2, top: y - size / 2, overflow: 'visible', pointerEvents: 'none'}}>
      {new Array(count).fill(0).map((_, i) => {
        const s = start + i * interval;
        const p = progress(frame, s, s + duration, ease.out);
        if (frame < s || p >= 1) return null;
        const r = Math.max(0.01, p * R);
        const o = opacity * (1 - progress(frame, s, s + duration, ease.inSoft));
        return filled ? <circle key={i} r={r} fill={color} opacity={o * 0.5} /> : <circle key={i} r={r} fill="none" stroke={color} strokeWidth={sw * (1 - p * 0.6)} opacity={o} />;
      })}
    </svg>
  );
};
