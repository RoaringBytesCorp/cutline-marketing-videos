import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {FreezeBlur} from './SampleBlur';

export type MotionBlurProps = {
  children: React.ReactNode;
  /** Turn the blur on only for these local frames [from, to] (inclusive). Outside, children render once (cheap). */
  activeRange?: [number, number];
  /** Or force on/off. */
  active?: boolean;
  /**
   * Sub-frame samples, rounded up to a power of two (at most 32). Render cost ≈ samples × the child's cost on
   * active frames. 8 = fast UI moves, 16 = whip pans and flying cards, 32 only for very fast, small elements.
   */
  samples?: number;
  /** 180 = film-like; 270–360 = longer smear for stylised swooshes. */
  shutterAngle?: number;
};

/**
 * True sub-frame motion blur for a subtree: <FreezeBlur> with a fixed sample count, a shutter in degrees and an
 * on/off range. The samples are centred on the frame, so the picture does not shift when the blur switches on or
 * off. Children must be absolutely positioned in a full-frame layer (it wraps them in AbsoluteFill) and must animate
 * from useCurrentFrame() (not useGlobalFrame()).
 */
export const MotionBlur: React.FC<MotionBlurProps> = ({children, activeRange, active, samples = 8, shutterAngle = 180}) => {
  const frame = useCurrentFrame();
  const on = active ?? (activeRange ? frame >= activeRange[0] && frame <= activeRange[1] : true);
  return (
    <FreezeBlur n={on ? samples : 1} shutter={shutterAngle / 360}>
      {children}
    </FreezeBlur>
  );
};

export type SmearBlurProps = {
  children: React.ReactNode;
  /** Blur along x / y in px (std deviation). Drive from velocity: e.g. |vx| × 0.35. Values < 0.3 disable it. */
  x?: number;
  y?: number;
  style?: React.CSSProperties;
};

/**
 * Cheap directional blur (an SVG Gaussian with separate x/y deviation). One render, no sub-frame sampling.
 * Good for fast horizontal or vertical moves of flat UI; for curved or rotating motion use <MotionBlur>.
 */
export const SmearBlur: React.FC<SmearBlurProps> = ({children, x = 0, y = 0, style}) => {
  const raw = useId();
  const id = `smear-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const sx = Math.abs(x);
  const sy = Math.abs(y);
  const on = sx >= 0.3 || sy >= 0.3;
  return (
    <div style={{...style, filter: on ? `url(#${id})` : undefined}}>
      {on ? (
        <svg width={0} height={0} style={{position: 'absolute'}}>
          {/* The region is in the element's own px: it starts 3σ before the box and is open-ended after it, so the
              smear is never cut off however small the element is (a region in % of the box clips fast small things). */}
          <filter id={id} filterUnits="userSpaceOnUse" x={-3 * sx} y={-3 * sy} width={100000} height={100000} colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} />
          </filter>
        </svg>
      ) : null}
      {children}
    </div>
  );
};
