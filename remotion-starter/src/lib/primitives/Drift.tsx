import React from 'react';
import {noise2D} from '@remotion/noise';
import {random, useCurrentFrame} from 'remotion';
import {FPS, UNIT} from '../../video';
import {useGlobalFrame} from '../sceneContext';
import {useFrameUnit} from '../units';
import {useSubpixel} from './SampleBlur';
import {withTransform} from './transform';

export type DriftOptions = {
  /** Seed: any string/number. Different seeds drift independently. */
  seed?: string | number;
  /** Max translation in frame px (default 8 × the frame unit: 16 px at 4K). */
  amplitude?: number;
  /** Max rotation in degrees. */
  rotate?: number;
  /** Max extra scale (0.01 = ±1%). */
  scale?: number;
  /** Cycles per second of the noise (0.05–0.3 feels alive but calm). */
  speed?: number;
  /** Use the global frame (continuous across scene cuts). Default true. */
  global?: boolean;
};

/** Smooth noise drift values for a frame (pure; use inside your own transforms). */
export const driftAt = (frame: number, {seed = 'drift', amplitude = 8 * UNIT, rotate = 0, scale = 0, speed = 0.12}: DriftOptions = {}) => {
  const t = (frame / FPS) * speed;
  return {
    x: noise2D(`${seed}-x`, t, 0) * amplitude,
    y: noise2D(`${seed}-y`, 0, t) * amplitude,
    r: noise2D(`${seed}-r`, t, t) * rotate,
    s: 1 + noise2D(`${seed}-s`, -t, t) * scale,
  };
};

/** Drift values for the current frame (global by default). */
export const useDrift = (opts: DriftOptions = {}) => {
  const local = useCurrentFrame();
  const global = useGlobalFrame();
  const unit = useFrameUnit();
  return driftAt(opts.global === false ? local : global, {amplitude: 8 * unit, ...opts});
};

export type DriftProps = DriftOptions & {children: React.ReactNode; style?: React.CSSProperties};

/**
 * Slow noise drift so holds stay alive (translate + optional rotate/scale). The transform ends in useSubpixel(), so
 * a slow move glides instead of ticking in whole pixels. A `style.transform` is kept and applied outside the drift.
 */
export const Drift: React.FC<DriftProps> = ({children, style, ...opts}) => {
  const d = useDrift(opts);
  const sub = useSubpixel();
  return <div style={{...style, transform: withTransform(`translate(${d.x}px, ${d.y}px) rotate(${d.r}deg) scale(${d.s}) ${sub}`, style)}}>{children}</div>;
};

export type FloatProps = {
  children: React.ReactNode;
  seed?: string | number;
  /** Bob height in frame px (default 10 × the frame unit: 20 px at 4K). */
  amplitude?: number;
  /** Max noise tilt in degrees. */
  rotate?: number;
  /** Bob period in frames (default 240 = 4 s at 60 fps). */
  period?: number;
  global?: boolean;
  style?: React.CSSProperties;
};

/** Gentle bob (sine on y + noise tilt), like an object floating. Different seeds bob out of phase. */
export const Float: React.FC<FloatProps> = ({children, seed = 'float', amplitude, rotate = 1.2, period = 240, global = true, style}) => {
  const local = useCurrentFrame();
  const g = useGlobalFrame();
  const unit = useFrameUnit();
  const sub = useSubpixel();
  const f = global ? g : local;
  // random(), not noise: noise2D is 0 at the origin for every seed
  const phase = random(`${seed}-p`) * Math.PI * 2;
  const y = Math.sin((f / period) * Math.PI * 2 + phase) * (amplitude ?? 10 * unit);
  const r = noise2D(`${seed}-r`, f / 400, 0) * rotate;
  return <div style={{...style, transform: withTransform(`translateY(${y}px) rotate(${r}deg) ${sub}`, style)}}>{children}</div>;
};
