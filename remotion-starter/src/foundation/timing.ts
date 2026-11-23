// PLACEHOLDER timing: the music's tempo and beat grid, the storyboard's named hits and the scene table.
// The foundation agent sets BPM / BEAT_OFFSET from the music (or loads a beatmap), fills HITS from the storyboard,
// lists the scenes in SCENE_LIST and registers their components in src/scenes/index.ts.
import {FPS} from '../video';

/* ---------------------------------------------------------------- music */

/** Music file in public/ (e.g. 'audio/music.wav'), played by Main and trimmed into standalone scenes. null = silent. */
export const MUSIC_SRC = null as string | null;

/** PLACEHOLDER tempo. At 120 BPM and 60 fps, 1 beat = 30 frames and 1 bar = 120 frames. */
export const BPM = 120;
export const BEATS_PER_BAR = 4;
/** Frame of the music's first downbeat (0 when the music starts on a downbeat at frame 0). */
export const BEAT_OFFSET = 0;
export const FRAMES_PER_BEAT = (60 / BPM) * FPS;
export const FRAMES_PER_BAR = FRAMES_PER_BEAT * BEATS_PER_BAR;

/** Seconds → frames (rounded to the nearest frame). */
export const sec = (t: number): number => Math.round(t * FPS);
/** Frames → seconds. */
export const toSec = (f: number): number => f / FPS;
/** Global frame of beat n (0-based, may be fractional: beat(1.5) = an 8th after beat 1). */
export const beat = (n: number): number => Math.round(BEAT_OFFSET + n * FRAMES_PER_BEAT);
/** Global frame of the downbeat of bar n (1-based: bar(1) is the first downbeat). */
export const bar = (n: number): number => Math.round(BEAT_OFFSET + (n - 1) * FRAMES_PER_BAR);
/** Beat frames in [from, to) on the global grid. */
export const beatsBetween = (from: number, to: number): number[] => {
  const out: number[] = [];
  // beat() rounds to a whole frame, so start one beat early and skip forward: a beat that rounds up onto `from` counts
  let n = Math.floor((from - BEAT_OFFSET) / FRAMES_PER_BEAT) - 1;
  while (beat(n) < from) n++;
  for (; beat(n) < to; n++) out.push(beat(n));
  return out;
};
/** "mm:ss.ff" timecode for a global frame (ff = frames). */
export const timecode = (globalFrame: number): string => {
  const s = Math.floor(globalFrame / FPS);
  const f = Math.round(globalFrame - s * FPS);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${String(f).padStart(2, '0')}`;
};

/* -------------------------------------------------------------- beatmap */

export type Accent = {frame: number; type: string; strength?: number; note?: string};
export type MusicRange = {type: string; startFrame: number; endFrame: number; peakFrame?: number; note?: string};
export type Beatmap = {bpm: number; fps: number; accents: Accent[]; ranges: MusicRange[]};

/** PLACEHOLDER: an optional beatmap from the audio workstream, e.g. `import beatmap from '../data/beatmap.json'`. */
export const BEATMAP = null as Beatmap | null;

/** Accents (global frames), optionally of one type. Empty without a beatmap. */
export const accents = (type?: string): Accent[] => (BEATMAP?.accents ?? []).filter((a) => !type || a.type === type);
/** Ranges such as risers, fills and breaths (global frames), optionally of one type. */
export const ranges = (type?: string): MusicRange[] => (BEATMAP?.ranges ?? []).filter((r) => !type || r.type === type);

/** PLACEHOLDER: the storyboard's named hits as global frames, e.g. {logoLands: 240, ctaHit: 2040}. */
export const HITS = {} as const satisfies Record<string, number>;

/* --------------------------------------------------------------- scenes */

export type SceneDef = {id: string; durationInFrames: number; title?: string};

/**
 * PLACEHOLDER scene table, in order. Main plays them back to back; each also gets a standalone composition with the
 * same id. The durations must add up to DURATION_IN_FRAMES in src/video.ts. Example:
 *   {id: 'S1Hook', durationInFrames: 240, title: 'Hook'},
 *   {id: 'S2Feature', durationInFrames: 480, title: 'Feature'},
 */
export const SCENE_LIST = [] as const satisfies readonly SceneDef[];

type ListedScene = (typeof SCENE_LIST)[number];
/** The listed scene ids as a union ('S1Hook' | 'S2Feature' …), or string while the list is empty. */
export type SceneId = [ListedScene] extends [never] ? string : ListedScene['id'];
export type PlacedScene = SceneDef & {id: SceneId; from: number};

const placeScenes = (): Record<SceneId, PlacedScene> => {
  const out: Record<string, PlacedScene> = {};
  let from = 0;
  for (const s of SCENE_LIST as readonly SceneDef[]) {
    out[s.id] = {...s, id: s.id as SceneId, from};
    from += s.durationInFrames;
  }
  return out as Record<SceneId, PlacedScene>;
};

/** Each scene with its global start frame. */
export const SCENES: Record<SceneId, PlacedScene> = placeScenes();
export const SCENE_ORDER: SceneId[] = (SCENE_LIST as readonly SceneDef[]).map((s) => s.id as SceneId);
/** Sum of the scene durations. */
export const SCENES_TOTAL_FRAMES = (SCENE_LIST as readonly SceneDef[]).reduce((n, s) => n + s.durationInFrames, 0);

/** Global frame → scene-local frame (negative or ≥ duration outside the scene). */
export const toLocal = (scene: SceneId, globalFrame: number): number => globalFrame - SCENES[scene].from;
/** Scene-local frame → global frame. */
export const toGlobal = (scene: SceneId, localFrame: number): number => localFrame + SCENES[scene].from;
/** Scene-local frames of the beats inside a scene. */
export const sceneBeats = (scene: SceneId): number[] => {
  const s = SCENES[scene];
  return beatsBetween(s.from, s.from + s.durationInFrames).map((f) => f - s.from);
};
/** Accents inside a scene, with their local frame. */
export const sceneAccents = (scene: SceneId, type?: string): (Accent & {local: number})[] => {
  const s = SCENES[scene];
  return accents(type)
    .filter((a) => a.frame >= s.from && a.frame < s.from + s.durationInFrames)
    .map((a) => ({...a, local: a.frame - s.from}));
};
