import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, progress} from '../motion';

export type ShineSweepProps = {
  children: React.ReactNode;
  start?: number;
  duration?: number;
  /** Band angle in degrees (0 = vertical band moving left → right). */
  angle?: number;
  /** Band half-width as a fraction of the sweep across the element (0.1–0.4). */
  width?: number;
  /** Peak opacity of the highlight. */
  opacity?: number;
  color?: string;
  /** Match the child's corner radius so the shine is clipped to its shape. */
  radius?: number | string;
  /** Repeat every N frames after the first sweep (0 = once). */
  repeatEvery?: number;
  style?: React.CSSProperties;
};

/** A light band that sweeps across its child (buttons, cards, logo plates). */
export const ShineSweep: React.FC<ShineSweepProps> = ({children, start = 0, duration = 36, angle = 20, width = 0.22, opacity = 0.55, color = '255, 255, 255', radius = 0, repeatEvery = 0, style}) => {
  const frame = useCurrentFrame();
  let f = frame;
  if (repeatEvery > 0 && frame > start) f = start + ((frame - start) % repeatEvery);
  const p = progress(f, start, start + duration, ease.inOut);
  const visible = frame >= start && p > 0 && p < 1;
  const pos = -width + p * (1 + 2 * width);
  const a = (v: number) => `rgba(${color}, ${v})`;
  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  return (
    <div style={{position: 'relative', display: 'inline-block', ...style}}>
      {children}
      {visible ? (
        // An angled gradient's line runs corner to corner, so at both ends of the sweep the whole band is outside
        // the element, whatever its shape (a rotated band would already cover a corner of a square or tall card).
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            pointerEvents: 'none',
            background: `linear-gradient(${90 + angle}deg, ${a(0)} ${pct(pos - width)}, ${a(opacity)} ${pct(pos)}, ${a(0)} ${pct(pos + width)})`,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}
    </div>
  );
};
