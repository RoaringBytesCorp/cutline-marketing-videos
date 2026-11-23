// How a primitive combines its animated transform with a transform the caller passes in `style`. Internal, not
// exported from the library barrel.
import type React from 'react';

/**
 * The caller's transform stays outermost and the animation plays inside it, so a centring translate(-50%, -50%) or a
 * base rotation keeps working while the element pops, drifts or squashes about its own transform-origin.
 */
export const withTransform = (animated: string, style?: React.CSSProperties): string => (style?.transform ? `${style.transform} ${animated}` : animated);
