// Frame-relative units. The library's px defaults are written for a 1080p frame and multiplied by the frame unit,
// so a default looks the same at 1080p and 4K. Explicit px props are always frame px.
import {useVideoConfig} from 'remotion';

/** 1080p reference unit for a frame size: the short side / 1080 (2 for 3840×2160, 2160×3840 and 2160×2700). */
export const frameUnit = (width: number, height: number): number => Math.min(width, height) / 1080;

/** The current composition's reference unit. */
export const useFrameUnit = (): number => {
  const {width, height} = useVideoConfig();
  return frameUnit(width, height);
};
