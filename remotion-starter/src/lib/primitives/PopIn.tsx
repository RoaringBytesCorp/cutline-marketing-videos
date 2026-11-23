import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp01, ease, enter, mix, progress, springAt, type SpringName} from '../motion';
import {withTransform} from './transform';

type Pose = {scale?: number; rotate?: number; x?: number; y?: number; opacity?: number};

export type PopInProps = {
  children: React.ReactNode;
  /** Local frame the pop starts. */
  start?: number;
  /** Spring preset for the landing (overshoot + settle). */
  preset?: SpringName;
  /** Pose it pops in from (default scale 0.4, opacity 0). */
  from?: Pose;
  /** Local frame the exit starts (anticipation: a small swell, then shrinks away). */
  exitAt?: number;
  exitDuration?: number;
  exitTo?: Pose;
  /** CSS transform-origin. */
  origin?: string;
  /** A `transform` here is kept and applied outside the pop (e.g. a centring translate). */
  style?: React.CSSProperties;
  className?: string;
  /** Inline wrapper instead of block. */
  inline?: boolean;
};

/** Scale/opacity/rotation pop with spring overshoot and settle; optional anticipating exit. */
export const PopIn: React.FC<PopInProps> = ({children, start = 0, preset = 'bouncy', from = {}, exitAt, exitDuration = 12, exitTo = {}, origin = '50% 50%', style, className, inline}) => {
  const frame = useCurrentFrame();
  const s = springAt(frame, start, preset);
  const fade = enter(frame, start, 6, ease.out);
  const e = exitAt === undefined ? 0 : progress(frame, exitAt, exitAt + exitDuration, ease.backIn);
  const ef = exitAt === undefined ? 0 : progress(frame, exitAt, exitAt + exitDuration, ease.in);
  const scale = mix(mix(from.scale ?? 0.4, 1, s), exitTo.scale ?? 0.2, e);
  const rotate = mix(mix(from.rotate ?? 0, 0, s), exitTo.rotate ?? 0, e);
  const x = mix(mix(from.x ?? 0, 0, s), exitTo.x ?? 0, e);
  const y = mix(mix(from.y ?? 0, 0, s), exitTo.y ?? 0, e);
  const opacity = clamp01(mix(from.opacity ?? 0, 1, fade)) * (1 - ef * (1 - (exitTo.opacity ?? 0)));
  return (
    <div
      className={className}
      style={{
        display: inline ? 'inline-block' : 'block',
        transformOrigin: origin,
        opacity,
        ...style,
        transform: withTransform(`translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`, style),
      }}
    >
      {children}
    </div>
  );
};
