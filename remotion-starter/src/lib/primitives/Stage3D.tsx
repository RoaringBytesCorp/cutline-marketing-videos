import React, {createContext, useContext} from 'react';
import {useFrameUnit} from '../units';

export type Camera3D = {x?: number; y?: number; z?: number; rotateX?: number; rotateY?: number; rotateZ?: number; scale?: number};

/** The enclosing stage's perspective, so <Layer keepSize> needs no perspective prop. */
const StageContext = createContext<{perspective: number} | null>(null);

export type Stage3DProps = {
  children: React.ReactNode;
  /**
   * CSS perspective in frame px. Default 1800 × the frame unit (3600 at 4K), which looks like 1800 at 1080p.
   * Smaller = stronger perspective (about 1.1 × the frame's short side is strong, 2.2 × subtle).
   */
  perspective?: number;
  /** Camera pose. x/y pan the world, z dollies (positive = toward the viewer). */
  camera?: Camera3D;
  /** Perspective origin (vanishing point), CSS. */
  origin?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
};

/**
 * 3D stage: a perspective box whose world is moved by the camera. Children are usually <Layer>s.
 * Note: opacity < 1, filter, overflow:hidden or mix-blend on the world flatten 3D; put them on layers instead.
 */
export const Stage3D: React.FC<Stage3DProps> = ({children, perspective, camera = {}, origin = '50% 50%', width = '100%', height = '100%', style}) => {
  const unit = useFrameUnit();
  const p = perspective ?? 1800 * unit;
  const {x = 0, y = 0, z = 0, rotateX = 0, rotateY = 0, rotateZ = 0, scale = 1} = camera;
  return (
    <StageContext.Provider value={{perspective: p}}>
      <div style={{position: 'absolute', left: 0, top: 0, width, height, perspective: `${p}px`, perspectiveOrigin: origin, ...style}}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) translate(${-x}px, ${-y}px) scale(${scale})`,
            transformOrigin: '50% 50%',
          }}
        >
          {children}
        </div>
      </div>
    </StageContext.Provider>
  );
};

export type LayerProps = {
  children: React.ReactNode;
  /** Depth in frame px: negative = farther away (moves less with the camera, looks smaller). */
  z?: number;
  /** Counter-scale so the layer keeps its on-screen size at rest despite its depth. */
  keepSize?: boolean;
  /** Perspective used by keepSize. Default: the enclosing <Stage3D>'s. */
  perspective?: number;
  x?: number;
  y?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  style?: React.CSSProperties;
};

/** A depth layer inside <Stage3D>. */
export const Layer: React.FC<LayerProps> = ({children, z = 0, keepSize = false, perspective, x = 0, y = 0, rotateX = 0, rotateY = 0, rotateZ = 0, style}) => {
  const stage = useContext(StageContext);
  const unit = useFrameUnit();
  const p = perspective ?? stage?.perspective ?? 1800 * unit;
  const k = keepSize ? (p - z) / p : 1;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transformStyle: 'preserve-3d',
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${k})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export type ParallaxProps = {children: React.ReactNode; depth: number; x: number; y: number; style?: React.CSSProperties};

/** Cheap 2D parallax: translates by (x, y) × depth. depth 0 = fixed, 1 = moves with the camera. */
export const Parallax: React.FC<ParallaxProps> = ({children, depth, x, y, style}) => (
  <div style={{position: 'absolute', inset: 0, transform: `translate(${x * depth}px, ${y * depth}px)`, ...style}}>{children}</div>
);
