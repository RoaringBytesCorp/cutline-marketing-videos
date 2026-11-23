import React from 'react';
import {evolvePath} from '@remotion/paths';
import {useCurrentFrame} from 'remotion';
import {ease, progress as prog} from '../motion';

export type DrawPathProps = {
  /**
   * SVG path data. Subpaths (several M commands) all draw at once, each from its own start and at the same speed,
   * so the drawing is complete when the longest has finished: at progress = longest length / total length. To draw
   * them one after another, use one <DrawPath> per subpath.
   */
  d: string;
  viewBox: string;
  width?: number | string;
  height?: number | string;
  stroke?: string;
  strokeWidth?: number;
  start?: number;
  duration?: number;
  easing?: (t: number) => number;
  /** Controlled draw progress 0..1. */
  progress?: number;
  /** Fill colour faded in once the stroke is drawn (optional). */
  fill?: string;
  /** Local frame the fill starts fading in (default: when the draw ends). */
  fillAt?: number;
  linecap?: 'round' | 'butt' | 'square';
  /**
   * Keep the stroke `strokeWidth` px wide whatever the viewBox is scaled to. Needs numeric `width` and `height`,
   * which give the scale; it throws without them.
   */
  nonScalingStroke?: boolean;
  style?: React.CSSProperties;
};

/** Px per viewBox unit of an <svg> with a numeric size (default preserveAspectRatio: the smaller of the two axes). */
const viewBoxScale = (viewBox: string, width: number | string, height: number | string): number | null => {
  const [, , vw, vh] = viewBox.trim().split(/[\s,]+/).map(Number);
  return typeof width === 'number' && typeof height === 'number' && vw > 0 && vh > 0 ? Math.min(width / vw, height / vh) : null;
};

/** Stroke draw-on for a path (via @remotion/paths evolvePath). */
export const DrawPath: React.FC<DrawPathProps> = ({d, viewBox, width = '100%', height = '100%', stroke = 'currentColor', strokeWidth = 2, start = 0, duration = 30, easing = ease.inOut, progress, fill, fillAt, linecap = 'round', nonScalingStroke, style}) => {
  const frame = useCurrentFrame();
  const p = progress ?? prog(frame, start, start + duration, easing);
  const {strokeDasharray, strokeDashoffset} = evolvePath(Math.max(0.0001, p), d);
  // Not vector-effect: non-scaling-stroke, which measures the dash in screen px instead of path units (pathLength
  // included), so the draw-on would stop short or finish early. Dividing the width by the viewBox scale looks the same.
  const scale = nonScalingStroke ? viewBoxScale(viewBox, width, height) : 1;
  if (scale === null) throw new Error('<DrawPath nonScalingStroke> needs numeric width and height props, so it can work out how far its viewBox is scaled.');
  const fillOpacity = fill ? prog(frame, fillAt ?? start + duration, (fillAt ?? start + duration) + 12, ease.out) : 0;
  return (
    <svg viewBox={viewBox} width={width} height={height} style={{overflow: 'visible', ...style}}>
      {fill ? <path d={d} fill={fill} fillOpacity={fillOpacity} stroke="none" /> : null}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth / scale}
        strokeLinecap={linecap}
        strokeLinejoin="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        opacity={p <= 0 ? 0 : 1}
      />
    </svg>
  );
};
