// Film grain and dither overlay. Deterministic per frame: a pre-baked 512² noise tile (public/textures/grain-512.png)
// whose offset jumps every frame by a hash of the frame. Overlay blend: invisible on flat mid-grey, about ±1–2 levels
// on near-white (enough to break gradient banding), stronger on mid-tones.
// Resolution-aware: each grain texel covers `scale` × `scale` frame px, with scale = round(short side / 1080), so grain
// at 3840×2160 has the same size relative to the frame as at 1920×1080 (texels 2×2 px at 4K, 1×1 px at 1080p).
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {frameUnit} from './units';

export const GRAIN_TEXTURE = 'textures/grain-512.png';
const TEX = 512;

export type GrainProps = {
  /** Added to useCurrentFrame() so a standalone scene gets the same grain as its slice of Main. */
  frameOffset?: number;
  /** Overlay strength (default 0.16). */
  opacity?: number;
  blend?: React.CSSProperties['mixBlendMode'];
  /** Frame px per grain texel (integer). Default: round(short side / 1080), at least 1. */
  scale?: number;
};

const hash = (n: number) => {
  let x = (n + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
};

export const Grain: React.FC<GrainProps> = ({frameOffset = 0, opacity = 0.16, blend = 'overlay', scale}) => {
  const {width, height} = useVideoConfig();
  const k = Math.max(1, Math.round(scale ?? frameUnit(width, height)));
  const tile = TEX * k;
  const h = hash(useCurrentFrame() + frameOffset);
  // whole-texel offsets, so the pixelated tile always lands on the pixel grid
  const ox = (h % TEX) * k;
  const oy = ((h >>> 9) % TEX) * k;
  // A constant grid one tile larger than the frame each way, so the same images stay mounted on every frame and
  // only the wrapper's offset changes.
  const cols = Math.ceil(width / tile) + 1;
  const rows = Math.ceil(height / tile) + 1;
  const tiles: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      tiles.push(
        <Img key={`${x}-${y}`} src={staticFile(GRAIN_TEXTURE)} style={{position: 'absolute', left: x * tile, top: y * tile, width: tile, height: tile, imageRendering: 'pixelated'}} />,
      );
  return (
    <AbsoluteFill style={{mixBlendMode: blend, opacity, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: cols * tile, height: rows * tile, transform: `translate(${-ox}px, ${-oy}px)`}}>{tiles}</div>
    </AbsoluteFill>
  );
};
