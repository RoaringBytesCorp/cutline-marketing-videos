// Compositions: Main, one standalone composition per scene (same id as in SCENE_LIST), MotionShowcase (every library
// export, one board per 90 frames) and SheetLabel (a tool for scripts/contact-sheet.mjs).
import React from 'react';
import {Composition} from 'remotion';
import {Main, StandaloneScene, type CompProps} from './compositions/Main';
import {MotionShowcase, SHOWCASE_FRAMES} from './compositions/MotionShowcase';
import {SheetLabel} from './lib';
import {DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH} from './video';
import {loadAllFonts} from './foundation/fonts';
import {SCENE_ORDER, SCENES, SCENES_TOTAL_FRAMES, type SceneId} from './foundation/timing';
import {typeScale} from './foundation/type';

loadAllFonts(Object.values(typeScale));

if (SCENE_ORDER.length > 0 && SCENES_TOTAL_FRAMES !== DURATION_IN_FRAMES) {
  throw new Error(`The scenes in foundation/timing.ts add up to ${SCENES_TOTAL_FRAMES} frames, but DURATION_IN_FRAMES in video.ts is ${DURATION_IN_FRAMES}. Make them match.`);
}

const standalone = (id: SceneId): React.FC<CompProps> => {
  const C: React.FC<CompProps> = (props) => <StandaloneScene id={id} {...props} />;
  C.displayName = `Standalone(${id})`;
  return C;
};
// Built once, so each scene's composition keeps the same component across renders of the root.
const STANDALONE = new Map(SCENE_ORDER.map((id) => [id, standalone(id)]));

const defaultProps: CompProps = {showSafeZone: false};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={DURATION_IN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={defaultProps} />
    {SCENE_ORDER.map((id) => (
      <Composition key={id} id={id} component={STANDALONE.get(id)!} durationInFrames={SCENES[id].durationInFrames} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={defaultProps} />
    ))}
    <Composition id="MotionShowcase" component={MotionShowcase} durationInFrames={SHOWCASE_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={defaultProps} />
    <Composition id="SheetLabel" component={SheetLabel} durationInFrames={1} fps={FPS} width={640} height={34} defaultProps={{text: 'label'}} />
  </>
);
