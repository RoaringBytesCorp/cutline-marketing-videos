// Safe zones: where key text, captions, logos and the call to action must stay, clear of the UI a platform draws
// over the video. Backgrounds and motion may still run to the edges. Everything in this file is sized from the
// composition (useVideoConfig), so it is right in every format and at every resolution.
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import type {Rect} from './motion';
import {frameUnit} from './units';

/** Margins as fractions of the frame width (left/right) and height (top/bottom). */
export type SafeMargins = {top: number; right: number; bottom: number; left: number};
export type SafePresetName = 'default' | 'social-9x16';
/** A preset name, or custom margins (for a platform the presets don't cover). */
export type SafeZoneSpec = SafePresetName | (SafeMargins & {label?: string});

export const SAFE_PRESETS: Record<SafePresetName, SafeMargins & {label: string}> = {
  /** Every format except 9:16 social: 5% on each edge. */
  default: {top: 0.05, right: 0.05, bottom: 0.05, left: 0.05, label: '5% every edge'},
  /** 9:16 on TikTok, Instagram Reels and YouTube Shorts: clear of the caption, buttons and progress bar. */
  'social-9x16': {top: 0.15, right: 0.15, bottom: 0.35, left: 0.06, label: 'TikTok / Reels / Shorts'},
};

const resolve = (spec: SafeZoneSpec): SafeMargins & {label: string; name: string} =>
  typeof spec === 'string' ? {...SAFE_PRESETS[spec], name: spec} : {label: 'custom', ...spec, name: 'custom'};

/** The safe rect for a frame size. Margins round outward (the safe area never exceeds the spec). */
export const safeRect = (width: number, height: number, preset: SafeZoneSpec = 'default'): Rect => {
  const m = resolve(preset);
  const left = Math.ceil(width * m.left);
  const top = Math.ceil(height * m.top);
  const right = Math.ceil(width * m.right);
  const bottom = Math.ceil(height * m.bottom);
  return {x: left, y: top, w: width - left - right, h: height - top - bottom};
};

/** Safe rect of the current composition. */
export const useSafeRect = (preset: SafeZoneSpec = 'default'): Rect => {
  const {width, height} = useVideoConfig();
  return safeRect(width, height, preset);
};

/** Is rect `r` fully inside `container` (for example a safe rect)? */
export const insideRect = (r: Rect, container: Rect): boolean =>
  r.x >= container.x && r.y >= container.y && r.x + r.w <= container.x + container.w && r.y + r.h <= container.y + container.h;

const COLORS = ['#ff1f6b', '#00b7ff', '#ffb300'];

export type SafeZoneProps = {
  /** One preset or several (each gets its own colour). Default 'default'. */
  preset?: SafeZoneSpec | SafeZoneSpec[];
  /** Extra text for the label, e.g. the scene id. */
  label?: string;
};

/** Review overlay: shades outside each safe rect and outlines it. Never leave it on in a final render. */
export const SafeZone: React.FC<SafeZoneProps> = ({preset = 'default', label}) => {
  const {width, height} = useVideoConfig();
  const k = frameUnit(width, height);
  const specs = Array.isArray(preset) ? preset : [preset];
  return (
    <AbsoluteFill style={{pointerEvents: 'none', zIndex: 9999}}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}}>
        {specs.map((spec, i) => {
          const r = safeRect(width, height, spec);
          const c = COLORS[i % COLORS.length];
          return (
            <g key={i}>
              <path d={`M0 0H${width}V${height}H0Z M${r.x} ${r.y}V${r.y + r.h}H${r.x + r.w}V${r.y}Z`} fill={c} fillOpacity={0.12} fillRule="evenodd" />
              <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="none" stroke={c} strokeWidth={2 * k} strokeDasharray={`${14 * k} ${8 * k}`} />
            </g>
          );
        })}
        <line x1={width / 2 - 16 * k} x2={width / 2 + 16 * k} y1={height / 2} y2={height / 2} stroke={COLORS[0]} strokeWidth={1.5 * k} />
        <line y1={height / 2 - 16 * k} y2={height / 2 + 16 * k} x1={width / 2} x2={width / 2} stroke={COLORS[0]} strokeWidth={1.5 * k} />
      </svg>
      {specs.map((spec, i) => {
        const r = safeRect(width, height, spec);
        const m = resolve(spec);
        const pct = (v: number) => `${+(v * 100).toFixed(1)}%`;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: r.x + 8 * k,
              top: r.y + 8 * k + i * 30 * k,
              padding: `${3 * k}px ${8 * k}px`,
              borderRadius: 6 * k,
              background: 'rgba(255, 255, 255, 0.88)',
              boxShadow: `inset 0 0 0 ${1.5 * k}px ${COLORS[i % COLORS.length]}`,
              fontFamily: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
              fontSize: 15 * k,
              fontWeight: 600,
              color: COLORS[i % COLORS.length],
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            SAFE {m.name} · {m.label} · T {pct(m.top)} R {pct(m.right)} B {pct(m.bottom)} L {pct(m.left)} · {r.x},{r.y} {r.w}×{r.h}
            {label && i === 0 ? ` · ${label}` : ''}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
