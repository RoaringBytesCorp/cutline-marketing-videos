// Main: the global Backdrop (continuous), the scenes back to back in a Series (each transparent, each wrapped in a
// SceneRoot that knows its start frame), the global Grain, the music, and the optional safe-zone overlay.
// StandaloneScene renders one scene exactly like its slice of Main: backdrop and grain at the scene's global
// offset, the music trimmed to it.
import React from 'react';
import {AbsoluteFill, Audio, Series, staticFile} from 'remotion';
import {Grain, SafeZone, SceneRoot, type SafeZoneSpec} from '../lib';
import {DURATION_IN_FRAMES} from '../video';
import {Backdrop} from '../foundation/Backdrop';
import {SAFE_ZONES} from '../foundation/layout';
import {MUSIC_SRC, SCENE_ORDER, SCENES, type SceneId} from '../foundation/timing';
import {SCENE_COMPONENTS} from '../scenes';
import {StubScene} from '../scenes/_stub';

export type CompProps = {
  /** Draw the safe-zone overlay (review only). The contact sheet's --safe sets it. */
  showSafeZone?: boolean;
  /** Override the presets the overlay shows (default: SAFE_ZONES from src/foundation/layout). */
  safePreset?: SafeZoneSpec | SafeZoneSpec[];
};

export const Main: React.FC<CompProps> = ({showSafeZone = false, safePreset}) => (
  <AbsoluteFill>
    <Backdrop />
    {SCENE_ORDER.length > 0 ? (
      <Series>
        {SCENE_ORDER.map((id) => {
          const Scene = SCENE_COMPONENTS[id];
          const def = SCENES[id];
          return (
            <Series.Sequence key={id} name={id} durationInFrames={def.durationInFrames} premountFor={60}>
              <SceneRoot id={id} from={def.from} durationInFrames={def.durationInFrames}>
                <Scene />
              </SceneRoot>
            </Series.Sequence>
          );
        })}
      </Series>
    ) : (
      // No scenes yet: a placeholder so the project renders.
      <SceneRoot id="Main" from={0} durationInFrames={DURATION_IN_FRAMES}>
        <StubScene id="Main" note="no scenes yet: list them in foundation/timing.ts, register them in scenes/index.ts" />
      </SceneRoot>
    )}
    <Grain />
    {MUSIC_SRC ? <Audio src={staticFile(MUSIC_SRC)} /> : null}
    {showSafeZone ? <SafeZone preset={safePreset ?? SAFE_ZONES} /> : null}
  </AbsoluteFill>
);

export const StandaloneScene: React.FC<CompProps & {id: SceneId}> = ({id, showSafeZone = false, safePreset}) => {
  const Scene = SCENE_COMPONENTS[id];
  const def = SCENES[id];
  return (
    <AbsoluteFill>
      <Backdrop frameOffset={def.from} />
      <SceneRoot id={id} from={def.from} durationInFrames={def.durationInFrames} standalone>
        <Scene />
      </SceneRoot>
      <Grain frameOffset={def.from} />
      {MUSIC_SRC ? <Audio src={staticFile(MUSIC_SRC)} trimBefore={def.from} /> : null}
      {showSafeZone ? <SafeZone preset={safePreset ?? SAFE_ZONES} label={id} /> : null}
    </AbsoluteFill>
  );
};
