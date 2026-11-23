import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FPS} from '../../video';
import {withTransform} from './transform';

/**
 * Squash & stretch scale factors around an impact frame.
 * Before impact (preFrames): stretch along the axis of travel. At impact: squash, then a damped wobble back to 1.
 * Volume is roughly preserved (the cross axis does the opposite).
 */
export const squashStretch = (frame: number, impact: number, intensity = 0.22, opts: {preFrames?: number; frequency?: number; decay?: number} = {}): {along: number; across: number} => {
  const {preFrames = 6, frequency = 2.6, decay = 6} = opts;
  let v = 0;
  if (frame < impact && frame >= impact - preFrames) {
    v = ((frame - (impact - preFrames)) / preFrames) * intensity * 0.6; // stretch builds into the hit
  } else if (frame >= impact) {
    const t = (frame - impact) / FPS;
    v = -intensity * Math.exp(-decay * t) * Math.cos(2 * Math.PI * frequency * t);
  }
  return {along: 1 + v, across: 1 - v * 0.8};
};

export type SquashStretchProps = {
  children: React.ReactNode;
  /** Local frame of the impact. */
  impact: number;
  intensity?: number;
  /** Axis of travel: 'y' for drops/slams, 'x' for horizontal hits. */
  axis?: 'x' | 'y';
  /** Pivot, usually the contact edge (e.g. '50% 100%' for something landing on a surface). */
  origin?: string;
  preFrames?: number;
  style?: React.CSSProperties;
};

export const SquashStretch: React.FC<SquashStretchProps> = ({children, impact, intensity = 0.22, axis = 'y', origin = '50% 100%', preFrames = 6, style}) => {
  const frame = useCurrentFrame();
  const {along, across} = squashStretch(frame, impact, intensity, {preFrames});
  const sx = axis === 'y' ? across : along;
  const sy = axis === 'y' ? along : across;
  return <div style={{transformOrigin: origin, ...style, transform: withTransform(`scale(${sx}, ${sy})`, style)}}>{children}</div>;
};
