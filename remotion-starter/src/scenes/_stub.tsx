// FOUNDATION-OWNED helper for scene stubs (scene agents replace their stub; they don't edit this file).
// A stub can show its start handoff state on its first frame and its end handoff state on its last frame, so a
// stubbed Main already cuts on the agreed states; in between it cross-fades and shows the scene id and timecode.
// Its label uses a private neutral look, not the brand tokens, so replacing src/foundation never breaks it.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Drift, useGlobalFrame, useScene} from '../lib';
import {FPS, u} from '../video';
import {SAFE} from '../foundation/layout';

const FONT = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const INK = '#15191e';
const INK_MUTED = '#5a636e';
const LINE = '#d3d8de';
const TAG = '#f08c4b';

/** "mm:ss.ff" timecode for a global frame (ff = frames). */
const timecode = (globalFrame: number): string => {
  const s = Math.floor(globalFrame / FPS);
  const f = Math.floor(globalFrame - s * FPS);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(f).padStart(2, '0')}`;
};

export type StubSceneProps = {
  id: string;
  /** Start handoff state (shown on frame 0). */
  start?: React.ReactNode;
  /** End handoff state (shown on the last frame). */
  end?: React.ReactNode;
  note?: string;
};

export const StubScene: React.FC<StubSceneProps> = ({id, start, end, note}) => {
  const frame = useCurrentFrame();
  const g = useGlobalFrame();
  const scene = useScene();
  const duration = scene?.durationInFrames ?? 1;
  const last = duration - 1;
  const mid = duration / 2;
  const endMix = frame >= last ? 1 : frame <= 0 ? 0 : interpolate(frame, [mid - 15, mid + 15], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const showLabel = frame >= 2 && frame <= last - 2;
  return (
    <AbsoluteFill>
      {start && endMix < 1 ? <AbsoluteFill style={{opacity: 1 - endMix}}>{start}</AbsoluteFill> : null}
      {end && endMix > 0 ? <AbsoluteFill style={{opacity: endMix}}>{end}</AbsoluteFill> : null}
      {showLabel ? (
        <Drift seed={id} style={{position: 'absolute', left: SAFE.x, top: SAFE.y + SAFE.h - u(120), width: SAFE.w}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: u(16), fontFamily: FONT, background: 'rgba(255,255,255,0.92)', borderRadius: u(12), padding: `${u(14)}px ${u(20)}px`, boxShadow: `inset 0 0 0 ${u(1)}px ${LINE}`}}>
            <span style={{fontSize: u(15), fontWeight: 700, color: '#fff', background: TAG, borderRadius: u(4), padding: `${u(2)}px ${u(8)}px`, letterSpacing: '0.08em'}}>STUB</span>
            <span style={{fontSize: u(28), fontWeight: 700, color: INK}}>{id}</span>
            <span style={{fontSize: u(22), color: INK_MUTED, fontVariantNumeric: 'tabular-nums'}}>
              {timecode(g)} · f{g} (local {frame} / {last})
            </span>
            {note ? <span style={{fontSize: u(18), color: INK_MUTED}}>{note}</span> : null}
          </div>
        </Drift>
      ) : null}
    </AbsoluteFill>
  );
};
