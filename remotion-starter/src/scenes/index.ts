// Scene registry (foundation-owned). The scene table (ids, durations, order) is SCENE_LIST in
// src/foundation/timing.ts; register each scene's component here under the same id. TypeScript fails until every
// listed scene has a component, so start each one from StubScene:
//   // src/scenes/S1Hook.tsx
//   export const S1Hook: React.FC = () => <StubScene id="S1Hook" />;
//   // here
//   import {S1Hook} from './S1Hook';
//   export const SCENE_COMPONENTS: Record<SceneId, React.FC> = {S1Hook};
import type React from 'react';
import type {SceneId} from '../foundation/timing';

export const SCENE_COMPONENTS: Record<SceneId, React.FC> = {};
