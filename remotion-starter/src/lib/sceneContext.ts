// Which scene is rendering and where it sits on the global timeline. Provided by <SceneRoot>, which receives the
// scene's start frame from whoever mounts it (Main's <Series>, or a standalone scene composition). No scene table here.
import {createContext, useContext} from 'react';
import {useCurrentFrame} from 'remotion';

export type SceneInfo = {
  id: string;
  /** Global frame the scene starts on. */
  from: number;
  durationInFrames: number;
  /** True when the scene renders as its own composition rather than inside Main. */
  standalone: boolean;
  /** The global frame, captured at the scene root (correct at any nesting depth). */
  globalFrame: number;
};

export const SceneContext = createContext<SceneInfo | null>(null);

/** Current scene, or null outside a <SceneRoot> (for example in MotionShowcase). */
export const useScene = (): SceneInfo | null => useContext(SceneContext);

/**
 * Global (whole-video) frame. Read from the scene root, so it is right inside your own nested <Sequence>s.
 * Outside a scene root it falls back to useCurrentFrame(). Inside <MotionBlur> or <Freeze> it is NOT time-shifted:
 * animate from useCurrentFrame() there.
 */
export const useGlobalFrame = (): number => {
  const scene = useContext(SceneContext);
  const local = useCurrentFrame();
  return scene ? scene.globalFrame : local;
};

/** Frame counted from the scene's first frame, at any nesting depth. */
export const useSceneFrame = (): number => {
  const scene = useContext(SceneContext);
  const local = useCurrentFrame();
  return scene ? scene.globalFrame - scene.from : local;
};
