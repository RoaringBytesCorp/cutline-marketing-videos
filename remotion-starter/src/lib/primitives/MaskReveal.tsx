import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, progress as prog} from '../motion';

export type RevealDirection = 'left' | 'right' | 'up' | 'down' | 'center-x' | 'center-y' | 'circle';

export type MaskRevealProps = {
  children: React.ReactNode;
  /** Wipe direction: 'left' reveals from the left edge toward the right; 'up' reveals from the bottom upward. */
  direction?: RevealDirection;
  start?: number;
  duration?: number;
  easing?: (t: number) => number;
  /** Controlled progress 0..1 (overrides start/duration). */
  progress?: number;
  /** Soft edge width in px (0 = hard clip-path edge). */
  softness?: number;
  /** For 'circle': centre in % of the box. The circle reaches the farthest corner at progress 1. */
  originX?: number;
  originY?: number;
  /** Reverse at this local frame (wipe out in the same direction). */
  exitAt?: number;
  exitDuration?: number;
  style?: React.CSSProperties;
};

/** Directional / circular mask wipe. Hard edges use clip-path; soft edges and the circle use a gradient mask. */
export const MaskReveal: React.FC<MaskRevealProps> = ({children, direction = 'left', start = 0, duration = 24, easing = ease.out, progress, softness = 0, originX = 50, originY = 50, exitAt, exitDuration = 16, style}) => {
  const frame = useCurrentFrame();
  let p = progress ?? prog(frame, start, start + duration, easing);
  let reverse = false;
  if (exitAt !== undefined && frame >= exitAt) {
    p = 1 - prog(frame, exitAt, exitAt + exitDuration, ease.in);
    reverse = true;
  }
  const s: React.CSSProperties = {};
  const pc = (v: number) => `${(v * 100).toFixed(3)}%`;
  const px = (v: number) => `${v.toFixed(2)}px`;
  const f = softness;
  let mask: string | undefined;
  if (direction === 'circle') {
    // A radial mask sized to the farthest corner, so p = 1 covers the whole box from any origin (clip-path circle()
    // percentages don't). A hard edge keeps 1 px of feather for anti-aliasing.
    const e = Math.max(1, f);
    mask = `radial-gradient(circle farthest-corner at ${originX}% ${originY}%, black calc(${pc(p)} + ${px(p * e - e)}), transparent calc(${pc(p)} + ${px(p * e)}))`;
  } else if (f <= 0) {
    const q = 1 - p;
    // when exiting, the wipe continues in the same direction (the far edge leads)
    const clip: Record<Exclude<RevealDirection, 'circle'>, string> = reverse
      ? {
          left: `inset(0 0 0 ${pc(q)})`,
          right: `inset(0 ${pc(q)} 0 0)`,
          up: `inset(0 0 ${pc(q)} 0)`,
          down: `inset(${pc(q)} 0 0 0)`,
          'center-x': `inset(0 ${pc(q / 2)} 0 ${pc(q / 2)})`,
          'center-y': `inset(${pc(q / 2)} 0 ${pc(q / 2)} 0)`,
        }
      : {
          left: `inset(0 ${pc(q)} 0 0)`,
          right: `inset(0 0 0 ${pc(q)})`,
          up: `inset(${pc(q)} 0 0 0)`,
          down: `inset(0 0 ${pc(q)} 0)`,
          'center-x': `inset(0 ${pc(q / 2)} 0 ${pc(q / 2)})`,
          'center-y': `inset(${pc(q / 2)} 0 ${pc(q / 2)} 0)`,
        };
    s.clipPath = clip[direction];
  } else if (direction === 'center-x' || direction === 'center-y') {
    // Two soft edges moving apart from the centre, intersected: each feather slides from inside the band (p = 0,
    // nothing shows) to outside the box (p = 1, everything shows), like the single edge below.
    const d = direction === 'center-x' ? 'to right' : 'to bottom';
    const a = pc(0.5 - p / 2);
    const b = pc(0.5 + p / 2);
    mask = `linear-gradient(${d}, transparent calc(${a} + ${px(-p * f)}), black calc(${a} + ${px(f - p * f)})), linear-gradient(${d}, black calc(${b} + ${px(p * f - f)}), transparent calc(${b} + ${px(p * f)}))`;
    s.WebkitMaskComposite = 'source-in';
    s.maskComposite = 'intersect';
  } else {
    const to = {left: 'to right', right: 'to left', up: 'to top', down: 'to bottom'}[direction];
    mask = reverse
      ? `linear-gradient(${to}, transparent calc(${pc(1 - p)} + ${px(-p * f)}), black calc(${pc(1 - p)} + ${px(f - p * f)}))`
      : `linear-gradient(${to}, black calc(${pc(p)} + ${px(p * f - f)}), transparent calc(${pc(p)} + ${px(p * f)}))`;
  }
  if (mask) {
    s.maskImage = mask;
    s.WebkitMaskImage = mask;
  }
  return <div style={{...s, ...style}}>{children}</div>;
};
