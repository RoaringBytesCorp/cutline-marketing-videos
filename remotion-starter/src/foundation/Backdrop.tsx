// PLACEHOLDER backdrop: a neutral, slowly living field (soft bloom, two drifting glows, vignette), driven by the
// GLOBAL frame so it is continuous across cuts. Main renders it once behind every scene; a standalone scene passes
// its start frame as frameOffset. The foundation agent replaces it with the brand's look.
import React from 'react';
import {noise2D} from '@remotion/noise';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FPS} from '../video';
import {colors} from './tokens';

export type BackdropProps = {
  /** Added to useCurrentFrame() to get the global frame. */
  frameOffset?: number;
};

const Glow: React.FC<{cx: number; cy: number; size: number; color: string; opacity: number}> = ({cx, cy, size, color, opacity}) => (
  <div
    style={{
      position: 'absolute',
      left: cx - size / 2,
      top: cy - size / 2,
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle closest-side, ${color} 0%, ${color}00 100%)`,
      opacity,
    }}
  />
);

export const Backdrop: React.FC<BackdropProps> = ({frameOffset = 0}) => {
  const {width, height} = useVideoConfig();
  const g = useCurrentFrame() + frameOffset;
  const t = g / FPS;
  const n = (seed: string) => noise2D(seed, t * 0.035, 0);
  const d = Math.max(width, height);
  return (
    <AbsoluteFill style={{background: colors.background, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 68% 62% at 50% 45%, #ffffff 0%, rgba(255,255,255,0) 72%)'}} />
      <Glow cx={width * (0.22 + n('a-x') * 0.1)} cy={height * (0.24 + n('a-y') * 0.12)} size={d * (0.78 + n('a-s') * 0.08)} color={colors.accentSoft} opacity={0.9} />
      <Glow cx={width * (0.8 + n('b-x') * 0.1)} cy={height * (0.78 + n('b-y') * 0.12)} size={d * (0.82 + n('b-s') * 0.08)} color={colors.accentWarmSoft} opacity={0.75} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 85% 80% at 50% 50%, rgba(21,25,30,0) 60%, rgba(21,25,30,0.06) 100%)'}} />
    </AbsoluteFill>
  );
};
