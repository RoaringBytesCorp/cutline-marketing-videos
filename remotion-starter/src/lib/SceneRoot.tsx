// Wraps every scene and provides its SceneContext. It draws nothing itself: Main draws the backdrop, grain and
// music once, and a standalone scene composition adds them at the scene's global offset (see compositions/Main.tsx).
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SceneContext, type SceneInfo} from './sceneContext';

export type SceneRootProps = {
  id: string;
  /** Global frame the scene starts on. */
  from: number;
  durationInFrames: number;
  standalone?: boolean;
  children: React.ReactNode;
};

export const SceneRoot: React.FC<SceneRootProps> = ({id, from, durationInFrames, standalone = false, children}) => {
  // Mounted inside the scene's <Sequence> (or at the top of a standalone composition), so this is the scene-local frame.
  const local = useCurrentFrame();
  const value: SceneInfo = {id, from, durationInFrames, standalone, globalFrame: local + from};
  return (
    <SceneContext.Provider value={value}>
      <AbsoluteFill>{children}</AbsoluteFill>
    </SceneContext.Provider>
  );
};
