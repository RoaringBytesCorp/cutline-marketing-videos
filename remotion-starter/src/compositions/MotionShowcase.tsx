// MotionShowcase: every src/lib export in use, one board per 90 frames. A visual test of the library in the current
// FORMAT: boards lay their cells out to fit any frame (16:9, 9:16, 4:5). Each cell is drawn in a 900×560 design box
// and scaled to fit, so px values inside cells are design px, not frame px.
// It tests the library, so it uses a private neutral palette, font stack and ground instead of the brand layer
// (src/foundation), whose names change in every generation. Only the format-related SAFE_ZONES comes from there.
//   node scripts/contact-sheet.mjs --comp MotionShowcase --every 90 --cols 4
//   npx remotion still MotionShowcase ../../../output/<id>/showcase-f1300.png --frame=1300 --props='{"showSafeZone":true}'
import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {
  anticipate,
  BlurOffContext,
  clamp01,
  CountUp,
  countValue,
  DrawPath,
  Drift,
  driftAt,
  dropShadowFilter,
  ease,
  elevation,
  enter,
  exit,
  flip,
  Float,
  formatNumber,
  frameUnit,
  FreezeBlur,
  Grain,
  GRAIN_TEXTURE,
  insideRect,
  keyframes,
  Layer,
  lerpRect,
  liftShadow,
  makeElevation,
  MaskReveal,
  mix,
  MotionBlur,
  Parallax,
  PopIn,
  presence,
  progress,
  pulse,
  pulses,
  rectCenter,
  rectStyle,
  rectTravel,
  Ripple,
  SAFE_PRESETS,
  SafeZone,
  safeRect,
  SampleBlur,
  samplesFor,
  sampleTimes,
  SceneRoot,
  SheetLabel,
  ShineSweep,
  SmearBlur,
  springAt,
  springDuration,
  springs,
  SquashStretch,
  squashStretch,
  Stage3D,
  stagger,
  TextRoll,
  typedChars,
  TypeOn,
  useDrift,
  useFrameUnit,
  useGlobalFrame,
  useOuterFrame,
  useSafeRect,
  useScene,
  useSceneFrame,
  useSubpixel,
  velocity,
  wobble,
  type EaseName,
  type Rect,
  type SafePresetName,
  type SafeZoneSpec,
  type SpringName,
} from '../lib';
import {SAFE_ZONES} from '../foundation/layout';

const BOARD = 90;
const W = 900;
const H = 560;
const C = {
  background: '#eceff2',
  surface: '#ffffff',
  ink: '#15191e',
  inkMuted: '#5a636e',
  line: '#d3d8de',
  accent: '#3b5bdb',
  accentSoft: '#dbe2ff',
  accentWarm: '#f08c4b',
  accentWarmSoft: '#fde6d6',
} as const;
const FONT = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const DISPLAY = FONT;

/* ---------------------------------------------------------------- helpers */

const T: React.FC<{x: number; y: number; size?: number; weight?: number; color?: string; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y, size = 20, weight = 500, color = C.ink, children, style}) => (
  <div style={{position: 'absolute', left: x, top: y, fontFamily: FONT, fontSize: size, fontWeight: weight, color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', ...style}}>{children}</div>
);

const Tile: React.FC<{w: number; h: number; color?: string; radius?: number; children?: React.ReactNode; style?: React.CSSProperties}> = ({w, h, color = C.accent, radius = 16, children, style}) => (
  <div style={{width: w, height: h, borderRadius: radius, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 20, ...style}}>{children}</div>
);

const GRAD = `linear-gradient(135deg, ${C.accent}, ${C.accentWarm})`;

/** Plots fn over t in [0, 1] with a dot at t. */
const Graph: React.FC<{x: number; y: number; w: number; h: number; fn: (t: number) => number; t: number; label?: string; min?: number; max?: number; color?: string}> = ({x, y, w, h, fn, t, label, min = -0.3, max = 1.3, color = C.accent}) => {
  const Y = (v: number) => h - ((v - min) / (max - min)) * h;
  const pts = Array.from({length: 97}, (_, i) => `${((i / 96) * w).toFixed(1)},${Y(fn(i / 96)).toFixed(1)}`).join(' ');
  const tc = clamp01(t);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h}}>
      <svg width={w} height={h} style={{position: 'absolute', overflow: 'visible'}}>
        <rect width={w} height={h} rx={10} fill={C.surface} stroke={C.line} strokeWidth={1.5} />
        <line x1={0} x2={w} y1={Y(0)} y2={Y(0)} stroke={C.line} strokeWidth={1.5} strokeDasharray="5 5" />
        <line x1={0} x2={w} y1={Y(1)} y2={Y(1)} stroke={C.line} strokeWidth={1.5} strokeDasharray="5 5" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        <line x1={tc * w} x2={tc * w} y1={0} y2={h} stroke={C.inkMuted} strokeOpacity={0.35} strokeWidth={1.5} />
        <circle cx={tc * w} cy={Y(fn(tc))} r={7} fill={color} stroke="#fff" strokeWidth={2} />
      </svg>
      {label ? <T x={4} y={h + 8} size={17} color={C.inkMuted}>{label}</T> : null}
    </div>
  );
};

const Bar: React.FC<{x: number; y: number; w: number; value: number; label: string; color?: string}> = ({x, y, w, value, label, color = C.accent}) => (
  <>
    <T x={x} y={y - 2} size={19} color={C.inkMuted}>{label}</T>
    <div style={{position: 'absolute', left: x + 290, top: y, width: w, height: 26, borderRadius: 13, background: C.line}} />
    <div style={{position: 'absolute', left: x + 290, top: y, width: Math.max(0, w * clamp01(value)), height: 26, borderRadius: 13, background: color}} />
    <T x={x + 300 + w} y={y - 1} size={19}>{value.toFixed(2)}</T>
  </>
);

/* ------------------------------------------------------------------ boards */

const EASES = Object.keys(ease) as EaseName[];
const SPRINGS = Object.keys(springs) as SpringName[];

const CurvesGraphs: React.FC = () => {
  const t = (useCurrentFrame() - 8) / 60;
  return (
    <>
      {EASES.map((name, i) => (
        <Graph key={name} x={8 + (i % 6) * 149} y={40 + Math.floor(i / 6) * 270} w={124} h={196} fn={ease[name]} t={t} label={name} />
      ))}
    </>
  );
};

const CurvesTracks: React.FC = () => {
  const t = clamp01((useCurrentFrame() - 8) / 60);
  return (
    <>
      {EASES.map((name, i) => (
        <React.Fragment key={name}>
          <T x={0} y={14 + i * 50} size={19} color={C.inkMuted}>{name}</T>
          <div style={{position: 'absolute', left: 150, top: 30 + i * 50, width: 700, height: 2, background: C.line}} />
          <div style={{position: 'absolute', left: mix(150, 770, ease[name](t)), top: 14 + i * 50, width: 40, height: 34, borderRadius: 9, background: name === 'linear' ? C.inkMuted : C.accent}} />
        </React.Fragment>
      ))}
    </>
  );
};

const SpringGraphs: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {SPRINGS.map((name, i) => (
        <Graph key={name} x={20 + (i % 2) * 440} y={14 + Math.floor(i / 2) * 270} w={400} h={200} fn={(tt) => springAt(tt * 90, 0, name)} t={f / 90} label={`springs.${name} · springDuration ${springDuration(name)} f`} max={1.4} min={-0.1} />
      ))}
    </>
  );
};

const SpringPops: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {SPRINGS.map((name, i) => (
        <div key={name} style={{position: 'absolute', left: 40 + i * 215, top: 120}}>
          <Tile w={170} h={220} color={i % 2 ? C.accentWarm : C.accent} style={{transform: `scale(${springAt(f, 8 + i * 5, name)})`, transformOrigin: '50% 100%'}}>
            {name}
          </Tile>
          <T x={0} y={250} size={19} color={C.inkMuted}>springAt(f, {8 + i * 5}, &apos;{name}&apos;)</T>
        </div>
      ))}
    </>
  );
};

const SpringOptions: React.FC = () => {
  const f = useCurrentFrame();
  const rows: [string, number][] = [
    ['bouncy, natural length', springAt(f, 8, 'bouncy')],
    ['bouncy, durationInFrames 30', springAt(f, 8, 'bouncy', {durationInFrames: 30})],
    ['snappy, reverse (1 → 0)', springAt(f, 8, 'snappy', {reverse: true, durationInFrames: 40})],
    ['custom config, from 0.25', springAt(f, 8, {damping: 7, mass: 1, stiffness: 120}, {from: 0.25})],
  ];
  return (
    <>
      {rows.map(([label, v], i) => (
        <React.Fragment key={label}>
          <T x={20} y={30 + i * 130} size={20} color={C.inkMuted}>{label}</T>
          <div style={{position: 'absolute', left: 20, top: 84 + i * 130, width: 860, height: 2, background: C.line}} />
          <div style={{position: 'absolute', left: mix(20, 800, v), top: 62 + i * 130, width: 60, height: 46, borderRadius: 12, background: C.accent}} />
        </React.Fragment>
      ))}
    </>
  );
};

const HelperBars: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Bar x={20} y={60} w={420} value={progress(f, 10, 50, ease.inOut)} label="progress(f, 10, 50, inOut)" />
      <Bar x={20} y={160} w={420} value={enter(f, 10, 24)} label="enter(f, 10, 24)" />
      <Bar x={20} y={260} w={420} value={exit(f, 50, 14)} label="exit(f, 50, 14)" color={C.accentWarm} />
      <Bar x={20} y={360} w={420} value={presence(f, 10, 24, 62, 14)} label="presence(f, 10, 24, 62, 14)" />
      <Bar x={20} y={460} w={420} value={mix(0.2, 0.8, clamp01((f - 10) / 40))} label="mix(0.2, 0.8, clamp01(…))" color={C.inkMuted} />
    </>
  );
};

const StaggerRows: React.FC = () => {
  const f = useCurrentFrame();
  const froms = ['start', 'center', 'end'] as const;
  return (
    <>
      {froms.map((from, r) => (
        <React.Fragment key={from}>
          <T x={20} y={40 + r * 170} size={20} color={C.inkMuted}>stagger(i, 3, 8, {`{count: 9, from: '${from}'}`})</T>
          {Array.from({length: 9}, (_, i) => (
            <div key={i} style={{position: 'absolute', left: 40 + i * 94, top: 84 + r * 170, width: 64, height: 64, borderRadius: 32, background: r === 1 ? C.accentWarm : C.accent, transform: `scale(${springAt(f, stagger(i, 3, 8, {count: 9, from}), 'snappy')})`}} />
          ))}
        </React.Fragment>
      ))}
    </>
  );
};

const AnticipateCell: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Graph x={20} y={20} w={860} h={260} fn={(tt) => anticipate(tt * 60, 0, 60, 0.15)} t={(f - 10) / 60} label="anticipate(f, 10, 60, dip 0.15): dips back, goes, overshoots, settles" />
      <div style={{position: 'absolute', left: 20, top: 440, width: 860, height: 2, background: C.line}} />
      <div style={{position: 'absolute', left: mix(80, 760, anticipate(f, 10, 60, 0.15)), top: 380, width: 80, height: 60, borderRadius: 14, background: C.accent}} />
    </>
  );
};

const KeyframesCell: React.FC = () => {
  const f = useCurrentFrame();
  const kx: [number, number][] = [[8, 0], [28, 1], [48, 0.3], [68, 0.9]];
  const ky: [number, number][] = [[8, 1], [28, 0.15], [48, 0.55], [68, 0]];
  const pos = (fr: number) => ({x: 60 + keyframes(fr, kx) * 760, y: 60 + keyframes(fr, ky, ease.backOutSoft) * 420});
  return (
    <>
      {Array.from({length: 14}, (_, i) => {
        const p = pos(f - (i + 1) * 3);
        return <div key={i} style={{position: 'absolute', left: p.x - 9, top: p.y - 9, width: 18, height: 18, borderRadius: 9, background: C.accent, opacity: 0.5 - i * 0.033}} />;
      })}
      <div style={{position: 'absolute', left: pos(f).x - 22, top: pos(f).y - 22, width: 44, height: 44, borderRadius: 22, background: C.accentWarm}} />
      <T x={20} y={510} size={18} color={C.inkMuted}>keyframes(f, [[8,0],[28,1],[48,0.3],[68,0.9]]) on x; backOutSoft on y</T>
    </>
  );
};

const WobbleCell: React.FC = () => {
  const f = useCurrentFrame();
  const rot = wobble(f, 12, {amplitude: 24, frequency: 1.6, decay: 2.4});
  return (
    <>
      <div style={{position: 'absolute', left: 440, top: 30, width: 20, height: 20, borderRadius: 10, background: C.ink}} />
      <div style={{position: 'absolute', left: 300, top: 40, width: 300, height: 300, transform: `rotate(${rot}deg)`, transformOrigin: '50% 0%'}}>
        <div style={{position: 'absolute', left: 148, top: 0, width: 4, height: 120, background: C.ink}} />
        <Tile w={300} h={160} style={{position: 'absolute', top: 120}}>wobble()</Tile>
      </div>
      <Graph x={20} y={400} w={860} h={110} fn={(tt) => wobble(tt * 90, 12, {amplitude: 1, frequency: 1.6, decay: 2.4})} t={f / 90} min={-1.1} max={1.1} />
    </>
  );
};

const PulseCell: React.FC = () => {
  const f = useCurrentFrame();
  const beats = [10, 30, 50, 70];
  return (
    <>
      <div style={{position: 'absolute', left: 120, top: 120, width: 220, height: 220, borderRadius: 110, background: C.accent, transform: `scale(${1 + 0.3 * pulses(f, beats)})`}} />
      <div style={{position: 'absolute', left: 560, top: 120, width: 220, height: 220, borderRadius: 110, background: C.accentWarm, transform: `scale(${1 + 0.3 * pulse(f, 45, 3, 30)})`}} />
      {beats.map((b, i) => (
        <div key={b} style={{position: 'absolute', left: 60 + i * 90, top: 430, width: 60, height: 14, borderRadius: 7, background: f >= b ? C.accent : C.line}} />
      ))}
      <T x={60} y={460} size={19} color={C.inkMuted}>pulses(f, [10, 30, 50, 70])</T>
      <T x={520} y={460} size={19} color={C.inkMuted}>pulse(f, 45, 3, 30)</T>
    </>
  );
};

const whipX = (fr: number) => 60 + 720 * (ease.whip(progress(fr, 12, 40, ease.linear)) - ease.whip(progress(fr, 52, 80, ease.linear)));

const VelocityCell: React.FC = () => {
  const f = useCurrentFrame();
  const v = velocity(whipX, f);
  return (
    <>
      <SmearBlur x={Math.abs(v) * 0.35} style={{position: 'absolute', left: whipX(f), top: 90, width: 70, height: 70}}>
        <Tile w={70} h={70} radius={14} />
      </SmearBlur>
      <T x={20} y={200} size={22}>velocity(whipX, f) = {v.toFixed(1)} px/f → SmearBlur x = |v| × 0.35</T>
      <Graph x={20} y={260} w={860} h={230} fn={(tt) => Math.abs(velocity(whipX, tt * 90)) / 60} t={f / 90} min={-0.05} max={1.05} color={C.accentWarm} label="|velocity| over the board" />
    </>
  );
};

const RA: Rect = {x: 60, y: 330, w: 170, h: 120};
const RB: Rect = {x: 380, y: 40, w: 460, h: 320};
const morphT = (f: number) => springAt(f, 10, 'soft') - springAt(f, 56, 'soft');

const Outline: React.FC<{r: Rect}> = ({r}) => <div style={{...rectStyle(r), borderRadius: 14, border: `2px dashed ${C.inkMuted}`, opacity: 0.5}} />;

const FlipCell: React.FC = () => {
  const t = morphT(useCurrentFrame());
  const c = rectCenter(lerpRect(RA, RB, t));
  return (
    <>
      <Outline r={RA} />
      <Outline r={RB} />
      <div style={{...rectStyle(RA), borderRadius: 14, background: GRAD, transform: flip(RA, RB, t), transformOrigin: '0 0'}} />
      <div style={{position: 'absolute', left: c.x - 12, top: c.y - 1, width: 24, height: 2, background: '#fff'}} />
      <div style={{position: 'absolute', left: c.x - 1, top: c.y - 12, width: 2, height: 24, background: '#fff'}} />
      <T x={20} y={500} size={18} color={C.inkMuted}>flip(from, to, t): one transform (corners stretch); rectCenter marks the centre</T>
    </>
  );
};

const LerpRectCell: React.FC = () => {
  const t = morphT(useCurrentFrame());
  return (
    <>
      <Outline r={RA} />
      <Outline r={RB} />
      <div style={{...rectStyle(lerpRect(RA, RB, t)), borderRadius: 14, background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 26}}>lerpRect</div>
      <T x={20} y={500} size={18} color={C.inkMuted}>rectStyle(lerpRect(a, b, t)): real layout (corners stay round)</T>
    </>
  );
};

const PopInPresets: React.FC = () => (
  <>
    {SPRINGS.map((name, i) => (
      <div key={name} style={{position: 'absolute', left: 40 + i * 215, top: 110}}>
        <PopIn start={8 + i * 6} preset={name} from={{scale: 0.3, rotate: -14, y: 40}} origin="50% 100%">
          <Tile w={170} h={220} color={i % 2 ? C.accentWarm : C.accent}>
            {name}
          </Tile>
        </PopIn>
        <T x={0} y={250} size={19} color={C.inkMuted}>preset=&apos;{name}&apos;</T>
      </div>
    ))}
  </>
);

const PopInStagger: React.FC = () => (
  <>
    {Array.from({length: 12}, (_, i) => (
      <div key={i} style={{position: 'absolute', left: 90 + (i % 4) * 190, top: 40 + Math.floor(i / 4) * 160}}>
        <PopIn start={stagger(i, 2, 6, {count: 12, from: 'center'})} exitAt={62 + stagger(i, 1.5, 0, {count: 12, from: 'end'})}>
          <Tile w={150} h={130} color={i % 3 === 0 ? C.accentWarm : C.accent}>
            {i + 1}
          </Tile>
        </PopIn>
      </div>
    ))}
    <T x={20} y={520} size={18} color={C.inkMuted}>start = stagger from centre; exitAt swells, then shrinks away</T>
  </>
);

const PopInPose: React.FC = () => (
  <>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{position: 'absolute', left: 80 + i * 260, top: 150}}>
        <PopIn start={8 + i * 8} preset="heavy" from={{x: -260, rotate: 24, scale: 0.7}} exitAt={66 + i * 4} exitTo={{x: 260, rotate: -20, scale: 0.6}}>
          <Tile w={220} h={220} radius={110} color={i === 1 ? C.accentWarm : C.accent}>
            heavy
          </Tile>
        </PopIn>
      </div>
    ))}
    <T x={20} y={520} size={18} color={C.inkMuted}>from / exitTo poses (x, rotate, scale, opacity)</T>
  </>
);

const DIRECTIONS = ['left', 'right', 'up', 'down', 'center-x', 'center-y', 'circle'] as const;

const MaskHard: React.FC = () => (
  <>
    {DIRECTIONS.map((d, i) => (
      <div key={d} style={{position: 'absolute', left: 20 + (i % 4) * 220, top: 20 + Math.floor(i / 4) * 270}}>
        <MaskReveal direction={d} start={8 + i * 3} duration={30} style={{width: 200, height: 200, borderRadius: 16, background: GRAD}}>
          <div />
        </MaskReveal>
        <T x={0} y={210} size={19} color={C.inkMuted}>{d}</T>
      </div>
    ))}
  </>
);

const MaskSoft: React.FC = () => (
  <>
    {(['left', 'up', 'center-y', 'circle'] as const).map((d, i) => (
      <div key={d} style={{position: 'absolute', left: 20 + (i % 2) * 450, top: 20 + Math.floor(i / 2) * 270}}>
        <MaskReveal direction={d} start={8 + i * 4} duration={36} softness={70} style={{width: 410, height: 210, borderRadius: 16, background: GRAD}}>
          <div />
        </MaskReveal>
        <T x={0} y={216} size={19} color={C.inkMuted}>{d} · softness 70</T>
      </div>
    ))}
  </>
);

const MaskExit: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <MaskReveal direction="left" start={6} duration={24} exitAt={56} exitDuration={18} style={{position: 'absolute', left: 20, top: 30, width: 860, height: 200, borderRadius: 16, background: GRAD}}>
        <T x={30} y={70} size={40} weight={700} color="#fff">exitAt wipes out the same way</T>
      </MaskReveal>
      <MaskReveal direction="up" progress={0.5 + 0.5 * Math.sin(f / 9)} softness={40} style={{position: 'absolute', left: 20, top: 290, width: 860, height: 200, borderRadius: 16, background: C.ink}}>
        <T x={30} y={70} size={40} weight={700} color="#fff">controlled progress</T>
      </MaskReveal>
    </>
  );
};

const display = (size: number): React.CSSProperties => ({fontFamily: DISPLAY, fontSize: size, fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.03em', color: C.ink});

const TextWord: React.FC = () => (
  <div style={{position: 'absolute', left: 30, top: 60}}>
    <TextRoll text={'Motion that\nfeels made.'} mode="word" start={6} style={display(104)} wordStyle={(w) => (w === 'made.' ? {color: C.accent} : undefined)} />
    <T x={0} y={330} size={18} color={C.inkMuted}>mode word · overshoot · tilt · wordStyle</T>
  </div>
);

const TextChar: React.FC = () => (
  <div style={{position: 'absolute', left: 30, top: 120}}>
    <TextRoll text="Character roll" mode="char" start={6} stagger={1.5} style={display(96)} />
    <T x={0} y={250} size={18} color={C.inkMuted}>mode char · stagger 1.5</T>
  </div>
);

const TextLines: React.FC = () => (
  <div style={{position: 'absolute', left: 30, top: 60}}>
    <TextRoll text={['Lines roll in,', 'hold long enough', 'and roll out.']} mode="line" start={4} exitAt={58} style={display(64)} />
    <T x={0} y={330} size={18} color={C.inkMuted}>mode line · exitAt 58</T>
  </div>
);

const TextDown: React.FC = () => (
  <div style={{position: 'absolute', left: 30, top: 140}}>
    <TextRoll text="From above, no overshoot" mode="word" direction="down" overshoot={false} tilt={0} start={6} style={display(64)} />
    <T x={0} y={200} size={18} color={C.inkMuted}>direction down · overshoot false · tilt 0</T>
  </div>
);

const TYPE_TEXT = 'Typed on whole frames';

const TypeOnCell: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 30, top: 110, ...display(64)}}>
      <TypeOn text={TYPE_TEXT} start={6} cps={26} caretColor={C.accent} blinkPeriod={30} />
    </div>
    <div style={{position: 'absolute', left: 30, top: 270, fontFamily: FONT, fontSize: 40, color: C.inkMuted}}>
      <TypeOn text="reserveWidth, caret hides at 70" start={20} cps={30} reserveWidth caretHideAt={70} />
    </div>
    <T x={30} y={470} size={18} color={C.inkMuted}>blinkPeriod 30 (one beat at 120 BPM) after typing ends</T>
  </>
);

const TypedBar: React.FC = () => {
  const n = typedChars(useCurrentFrame(), 6, TYPE_TEXT.length, 26);
  return (
    <>
      <T x={30} y={120} size={44} weight={700}>{n} / {TYPE_TEXT.length} chars</T>
      <div style={{position: 'absolute', left: 30, top: 230, width: 840, height: 40, borderRadius: 20, background: C.line}} />
      <div style={{position: 'absolute', left: 30, top: 230, width: (840 * n) / TYPE_TEXT.length, height: 40, borderRadius: 20, background: C.accent}} />
      <T x={30} y={470} size={18} color={C.inkMuted}>typedChars(f, 6, length, 26) syncs other motion to the typing</T>
    </>
  );
};

const CountCell: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 30, top: 60}}>
      <CountUp to={12480} start={6} duration={50} prefix="$" style={display(110)} />
    </div>
    <div style={{position: 'absolute', left: 30, top: 230}}>
      <CountUp to={98.6} decimals={1} suffix="%" start={14} duration={50} easing={ease.backOutSoft} style={display(110)} />
    </div>
    <T x={30} y={470} size={18} color={C.inkMuted}>mode count · prefix · suffix · decimals · easing</T>
  </>
);

const RollCell: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 30, top: 140}}>
      <CountUp from={0} to={1273} mode="roll" start={6} duration={60} style={{...display(150), color: C.accent}} />
    </div>
    <T x={30} y={470} size={18} color={C.inkMuted}>mode roll: every digit spins like an odometer</T>
  </>
);

const CountBars: React.FC = () => {
  const f = useCurrentFrame();
  const targets = [3200, 5400, 2100, 7800, 6100];
  return (
    <>
      {targets.map((to, i) => {
        const v = countValue(f, 0, to, 6 + i * 4, 40, ease.backOutSoft);
        const h = (v / 8000) * 380;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: 60 + i * 165, top: 450 - h, width: 110, height: Math.max(0, h), borderRadius: '12px 12px 0 0', background: i === 3 ? C.accentWarm : C.accent}} />
            <T x={60 + i * 165} y={460} size={20}>{formatNumber(Math.round(v))}</T>
          </React.Fragment>
        );
      })}
      <T x={30} y={510} size={18} color={C.inkMuted}>countValue drives the bars, formatNumber labels them</T>
    </>
  );
};

const ICON_PATHS = [
  'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z M7.5 12.5l3 3 6-6.5',
  'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z',
  'M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20 9.5c0 6.1-8 11-8 11Z',
];

const DrawPaths: React.FC = () => (
  <>
    {ICON_PATHS.map((d, i) => (
      <div key={i} style={{position: 'absolute', left: 40 + i * 290, top: 90, width: 240, height: 240, color: i === 1 ? C.accentWarm : C.accent}}>
        <DrawPath d={d} viewBox="0 0 24 24" strokeWidth={1.4} start={6 + i * 8} duration={36} fill={i === 0 ? undefined : i === 1 ? C.accentWarmSoft : C.accentSoft} />
      </div>
    ))}
    <T x={30} y={470} size={18} color={C.inkMuted}>stroke draw-on (evolvePath), then the fill fades in</T>
  </>
);

const DrawWave: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{position: 'absolute', left: 30, top: 150, width: 840, height: 160, color: C.accent}}>
        <DrawPath d="M0 50 C 50 0, 100 100, 150 50 S 250 0, 300 50 S 400 100, 450 50 S 550 0, 600 50" viewBox="0 0 600 100" width={840} height={160} strokeWidth={6} nonScalingStroke progress={keyframes(f, [[6, 0], [46, 1], [66, 1], [86, 0]])} />
      </div>
      <T x={30} y={470} size={18} color={C.inkMuted}>controlled progress (keyframes) · nonScalingStroke</T>
    </>
  );
};

const RippleCell: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', inset: 0, color: C.accent}}>
      <Ripple x={260} y={260} start={10} count={3} interval={7} maxRadius={200} strokeWidth={5} />
      <div style={{position: 'absolute', left: 230, top: 230, width: 60, height: 60, borderRadius: 30, background: C.accent, transform: `scale(${springAt(f, 6, 'bouncy')})`}} />
      <div style={{position: 'absolute', inset: 0, color: C.accentWarm}}>
        <Ripple x={660} y={260} start={30} count={2} interval={10} maxRadius={170} filled />
      </div>
      <T x={30} y={500} size={18} color={C.inkMuted}>rings (currentColor) · filled discs</T>
    </div>
  );
};

const DriftCards: React.FC = () => (
  <>
    {['a', 'b', 'c'].map((seed, i) => (
      <Drift key={seed} seed={seed} amplitude={30} rotate={3} scale={0.03} speed={0.6} style={{position: 'absolute', left: 60 + i * 270, top: 150}}>
        <Tile w={220} h={240} color={i === 1 ? C.accentWarm : C.accent}>
          seed {seed}
        </Tile>
      </Drift>
    ))}
    <T x={30} y={500} size={18} color={C.inkMuted}>seeded noise drift: translate, rotate, scale (global frame)</T>
  </>
);

const FloatCell: React.FC = () => (
  <>
    {[60, 90, 120].map((period, i) => (
      <Float key={period} seed={`f${i}`} amplitude={40} period={period} style={{position: 'absolute', left: 90 + i * 270, top: 180}}>
        <Tile w={170} h={170} radius={85} color={i === 1 ? C.accentWarm : C.accent}>
          {period} f
        </Tile>
      </Float>
    ))}
    <T x={30} y={500} size={18} color={C.inkMuted}>Float: sine bob + noise tilt (period in frames)</T>
  </>
);

const DriftReadout: React.FC = () => {
  const d = useDrift({seed: 'readout', amplitude: 40, rotate: 8, speed: 0.6});
  const sub = useSubpixel();
  return (
    <T x={30} y={440} size={20} style={{transform: `translateY(${d.y * 0.1}px) ${sub}`}}>
      useDrift → x {d.x.toFixed(1)} · y {d.y.toFixed(1)} · r {d.r.toFixed(2)}° (text drifts with useSubpixel)
    </T>
  );
};

const DriftPath: React.FC = () => {
  const f = useCurrentFrame();
  const at = (fr: number) => driftAt(fr, {seed: 'path', amplitude: 170, speed: 0.6});
  const pts = Array.from({length: 61}, (_, i) => {
    const p = at(f - i);
    return `${(450 + p.x * 2).toFixed(1)},${(200 + p.y).toFixed(1)}`;
  }).join(' ');
  const p = at(f);
  return (
    <>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <polyline points={pts} fill="none" stroke={C.accent} strokeOpacity={0.45} strokeWidth={4} strokeLinecap="round" />
        <circle cx={450 + p.x * 2} cy={200 + p.y} r={16} fill={C.accentWarm} />
      </svg>
      <DriftReadout />
      <T x={30} y={500} size={18} color={C.inkMuted}>driftAt(frame, opts) is pure: here, the last 60 frames of its path</T>
    </>
  );
};

const Card3D: React.FC<{x: number; y: number; w: number; h: number; color: string; label?: string}> = ({x, y, w, h, color, label}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 18, background: color, boxShadow: '0 20px 50px rgba(21,25,30,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 24, color: '#fff'}}>{label}</div>
);

const StageCell: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Stage3D perspective={1400} camera={{x: Math.sin(f / 16) * 90, y: Math.cos(f / 22) * 20, rotateY: Math.sin(f / 16) * 10, rotateX: 4, z: -60 + springAt(f, 4, 'soft') * 60}}>
        <Layer z={-500} keepSize>
          <Card3D x={60} y={50} w={780} h={440} color={C.accentSoft} />
        </Layer>
        <Layer z={-160}>
          <Card3D x={140} y={120} w={360} h={260} color={C.accent} label="z −160" />
        </Layer>
        <Layer z={0}>
          <Card3D x={430} y={200} w={300} h={210} color={C.accentWarm} label="z 0" />
        </Layer>
        <Layer z={240}>
          <Card3D x={300} y={330} w={170} h={110} color={C.ink} label="z 240" />
        </Layer>
      </Stage3D>
      <T x={20} y={520} size={18} color={C.inkMuted}>camera orbit · keepSize back layer · Layer reads the stage perspective</T>
    </>
  );
};

const ParallaxCell: React.FC = () => {
  const f = useCurrentFrame();
  const camX = Math.sin(f / 14) * 160;
  const depths = [0.15, 0.4, 0.7, 1];
  return (
    <>
      {depths.map((d, i) => (
        <Parallax key={d} depth={d} x={-camX} y={0}>
          <div style={{position: 'absolute', left: 120 + i * 150, top: 380 - i * 70, width: 300, height: 120 + i * 40, borderRadius: 20, background: [C.line, C.accentSoft, C.accent, C.accentWarm][i], opacity: 0.95}} />
        </Parallax>
      ))}
      <T x={20} y={520} size={18} color={C.inkMuted}>Parallax depth 0.15 · 0.4 · 0.7 · 1</T>
    </>
  );
};

const DropCell: React.FC = () => {
  const f = useCurrentFrame();
  const y = mix(30, 330, ease.in(progress(f, 8, 30, ease.linear)));
  return (
    <>
      <div style={{position: 'absolute', left: 60, top: 460, width: 780, height: 3, background: C.line}} />
      <div style={{position: 'absolute', left: 370, top: y, width: 130, height: 130}}>
        <SquashStretch impact={30} intensity={0.3}>
          <div style={{width: 130, height: 130, borderRadius: 65, background: C.accent}} />
        </SquashStretch>
      </div>
      <T x={20} y={500} size={18} color={C.inkMuted}>stretch into the hit, squash on frame 30, damped wobble back</T>
    </>
  );
};

const SquashPlot: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Graph x={20} y={30} w={860} h={190} fn={(tt) => squashStretch(tt * 90, 30, 0.3).along} t={f / 90} min={0.6} max={1.35} label="squashStretch(f, 30, 0.3).along" />
      <Graph x={20} y={280} w={860} h={190} fn={(tt) => squashStretch(tt * 90, 30, 0.3).across} t={f / 90} min={0.6} max={1.35} color={C.accentWarm} label=".across (volume kept)" />
    </>
  );
};

const ShineCell: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 140, top: 80}}>
      <ShineSweep start={8} duration={36} repeatEvery={40} radius={60}>
        <div style={{padding: '34px 70px', borderRadius: 60, background: C.accent, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 44}}>Get Started</div>
      </ShineSweep>
    </div>
    <div style={{position: 'absolute', left: 140, top: 260}}>
      <ShineSweep start={20} duration={44} angle={30} width={0.3} radius={24}>
        <div style={{width: 620, height: 200, borderRadius: 24, background: C.ink}} />
      </ShineSweep>
    </div>
    <T x={20} y={500} size={18} color={C.inkMuted}>repeatEvery keeps a hold alive · angle · width</T>
  </>
);

// Motion blur demos share one fast arc with a spin.
const arc = (fr: number) => {
  const p = ease.whip(progress(fr, 14, 44, ease.linear)) - ease.whip(progress(fr, 54, 84, ease.linear));
  return {x: 90 + p * 620, y: 330 - Math.sin(p * Math.PI) * 220, r: p * 540};
};
const SIDE = 90;
const Square: React.FC<{fr: number; color?: string}> = ({fr, color = C.accent}) => {
  const a = arc(fr);
  return <div style={{position: 'absolute', left: a.x, top: a.y, width: SIDE, height: SIDE, borderRadius: 18, background: color, transform: `rotate(${a.r}deg)`}} />;
};
const Mover: React.FC<{color?: string}> = ({color}) => <Square fr={useCurrentFrame()} color={color} />;
const arcTravel = (f: number) => rectTravel((t) => ({x: arc(t).x, y: arc(t).y, w: SIDE, h: SIDE}), f) + (Math.abs(arc(f + 0.25).r - arc(f - 0.25).r) * Math.PI * SIDE) / 360;

const MotionBlurCell: React.FC = () => (
  <>
    <MotionBlur samples={10} shutterAngle={270} activeRange={[12, 86]}>
      <Mover />
    </MotionBlur>
    <T x={20} y={500} size={18} color={C.inkMuted}>MotionBlur · samples 10 (→ 16) · 270° · activeRange</T>
  </>
);

const SampleBlurCell: React.FC = () => {
  const f = useCurrentFrame();
  const n = samplesFor(arcTravel(f) * 0.6); // design px are about 0.6 frame-unit px here
  const times = sampleTimes(f, n);
  return (
    <>
      <SampleBlur f={f} n={n} render={(t) => <Square fr={t} color={C.accentWarm} />} />
      <T x={20} y={20} size={22}>n {n} · sampleTimes {times[0].toFixed(2)} … {times[times.length - 1].toFixed(2)}</T>
      <T x={20} y={500} size={18} color={C.inkMuted}>time-centred samples from a pure pose · samplesFor(rectTravel)</T>
    </>
  );
};

const OuterFrameLabel: React.FC = () => <T x={20} y={20} size={22}>useOuterFrame() inside the samples = {useOuterFrame()} (sharp)</T>;

const FreezeBlurCell: React.FC = () => (
  <>
    <FreezeBlur n={16}>
      <Mover color={C.ink} />
      <OuterFrameLabel />
    </FreezeBlur>
    <T x={20} y={500} size={18} color={C.inkMuted}>FreezeBlur n 16: centred samples of a useCurrentFrame() subtree</T>
  </>
);

const SmearCell: React.FC = () => {
  const f = useCurrentFrame();
  const v = velocity(whipX, f);
  return (
    <>
      <SmearBlur x={Math.abs(v) * 0.35} style={{position: 'absolute', left: whipX(f), top: 220, width: SIDE, height: SIDE}}>
        <Tile w={SIDE} h={SIDE} radius={18} />
      </SmearBlur>
      <T x={20} y={500} size={18} color={C.inkMuted}>SmearBlur: one render, Gaussian along x from velocity</T>
    </>
  );
};

const NoBlurCell: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <BlurOffContext.Provider value>
        <SampleBlur f={f} n={32} render={(t) => <Square fr={t} color={C.inkMuted} />} />
      </BlurOffContext.Provider>
      <T x={20} y={500} size={18} color={C.inkMuted}>reference: BlurOffContext forces SampleBlur sharp</T>
    </>
  );
};

const EL = makeElevation({unit: 1}); // design px inside a cell

const ElevationCell: React.FC = () => (
  <>
    {([0, 1, 2, 3, 4, 5] as const).map((l) => (
      <div key={l} style={{position: 'absolute', left: 40 + l * 140, top: 150, width: 110, height: 150, borderRadius: 14, background: C.surface, boxShadow: EL[l], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.ink}}>{l}</div>
    ))}
    <T x={20} y={500} size={18} color={C.inkMuted}>makeElevation({'{unit: 1}'}) levels 0–5 · project set: elevation[0–{Object.keys(elevation).length - 1}]</T>
  </>
);

const LiftCell: React.FC = () => {
  const lift = morphT(useCurrentFrame());
  return (
    <>
      <div style={{position: 'absolute', left: 270, top: 140, width: 360, height: 220, borderRadius: 20, background: C.surface, transform: `translateY(${-lift * 70}px) scale(${1 + lift * 0.06})`, boxShadow: liftShadow(lift, {unit: 1}), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.ink}}>
        lift {lift.toFixed(2)}
      </div>
      <T x={20} y={500} size={18} color={C.inkMuted}>liftShadow(lift): contact shadow spreads as it rises</T>
    </>
  );
};

const DropShadowCell: React.FC = () => (
  <>
    {([1, 2, 3, 4, 5] as const).map((l) => (
      <svg key={l} viewBox="0 0 24 24" width={130} height={130} style={{position: 'absolute', left: 40 + (l - 1) * 170, top: 160, overflow: 'visible', filter: dropShadowFilter(l, {unit: 1})}}>
        <path d={ICON_PATHS[1]} fill={l % 2 ? C.accent : C.accentWarm} />
      </svg>
    ))}
    <T x={20} y={500} size={18} color={C.inkMuted}>dropShadowFilter(1–5) follows alpha (SVG, cut-outs)</T>
  </>
);

const GrainCell: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 20, top: 20, width: 860, height: 300, borderRadius: 16, background: 'linear-gradient(90deg, #1b2230 0%, #6d7a8c 55%, #eef1f5 100%)'}} />
    <div style={{position: 'absolute', left: 20, top: 340, width: 420, height: 140, borderRadius: 16, background: `radial-gradient(circle at 30% 40%, ${C.accentSoft}, ${C.background})`}} />
    <div style={{position: 'absolute', left: 460, top: 340, width: 420, height: 140, borderRadius: 16, overflow: 'hidden', background: '#8a95a5'}}>
      <Grain opacity={0.6} />
    </div>
    <T x={20} y={500} size={18} color={C.inkMuted}>global Grain dithers these gradients · right: local Grain at 0.6 ({GRAIN_TEXTURE})</T>
  </>
);

const PRESET_NAMES = Object.keys(SAFE_PRESETS) as SafePresetName[];
const PRESET_COLORS = ['#ff1f6b', '#00b7ff'];

const SafeDiagram: React.FC = () => {
  const {width, height} = useVideoConfig();
  const s = Math.min(840 / width, 470 / height);
  const ox = (W - width * s) / 2;
  return (
    <>
      <div style={{position: 'absolute', left: ox, top: 10, width: width * s, height: height * s, background: C.surface, boxShadow: `inset 0 0 0 2px ${C.line}`}} />
      {PRESET_NAMES.map((p, i) => {
        const r = safeRect(width, height, p);
        return (
          <React.Fragment key={p}>
            <div style={{position: 'absolute', left: ox + r.x * s, top: 10 + r.y * s, width: r.w * s, height: r.h * s, border: `3px dashed ${PRESET_COLORS[i]}`}} />
            <T x={20} y={492 + i * 30 - 30} size={17} color={PRESET_COLORS[i]} weight={700}>
              safeRect({width}, {height}, &apos;{p}&apos;) = {r.x}, {r.y}, {r.w}×{r.h}
            </T>
          </React.Fragment>
        );
      })}
    </>
  );
};

const InsideCell: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const safe = useSafeRect('default');
  const s = Math.min(840 / width, 440 / height);
  const ox = (W - width * s) / 2;
  const box: Rect = {x: mix(-0.08, 0.86, 0.5 - 0.5 * Math.cos(f / 14)) * width, y: height * 0.42, w: width * 0.2, h: height * 0.14};
  const ok = insideRect(box, safe);
  return (
    <>
      <div style={{position: 'absolute', left: ox, top: 10, width: width * s, height: height * s, background: C.surface, boxShadow: `inset 0 0 0 2px ${C.line}`, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: safe.x * s, top: safe.y * s, width: safe.w * s, height: safe.h * s, border: `3px dashed ${PRESET_COLORS[0]}`}} />
        <div style={{position: 'absolute', left: box.x * s, top: box.y * s, width: box.w * s, height: box.h * s, borderRadius: 10, background: ok ? '#2f9e44' : '#e03131'}} />
      </div>
      <T x={20} y={480} size={20} weight={700} color={ok ? '#2f9e44' : '#e03131'}>
        insideRect(box, useSafeRect(&apos;default&apos;)) = {String(ok)}
      </T>
    </>
  );
};

const ContextReadout: React.FC = () => {
  const scene = useScene();
  const rows = [
    `useScene().id = ${scene?.id}, from ${scene?.from}`,
    `useCurrentFrame() = ${useCurrentFrame()} (inside <Sequence from={20}>)`,
    `useSceneFrame() = ${useSceneFrame()}`,
    `useGlobalFrame() = ${useGlobalFrame()}`,
    `useFrameUnit() = ${useFrameUnit()}`,
  ];
  return (
    <>
      {rows.map((r, i) => (
        <T key={r} x={30} y={80 + i * 56} size={26}>{r}</T>
      ))}
    </>
  );
};

const SceneContextCell: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <SceneRoot id="DemoScene" from={1350} durationInFrames={BOARD}>
      <T x={30} y={20} size={20} color={C.inkMuted}>{'<SceneRoot id="DemoScene" from={1350}>'} · frameUnit({width}, {height}) = {frameUnit(width, height)}</T>
      <Sequence from={20} layout="none">
        <ContextReadout />
      </Sequence>
    </SceneRoot>
  );
};

const SheetLabelCell: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: 30, top: 200, width: 640, height: 34, transform: 'scale(1.3)', transformOrigin: '0 0'}}>
      <SheetLabel text="MotionShowcase   f1395   23.25 s" />
    </div>
    <T x={30} y={470} size={18} color={C.inkMuted}>SheetLabel: the label strip scripts/contact-sheet.mjs renders</T>
  </>
);

type CellDef = {title: string; body: React.FC};
type BoardDef = {title: string; exports: string; cells: CellDef[]};

const BOARDS: BoardDef[] = [
  {title: 'Curves', exports: 'ease.* · EaseName', cells: [{title: 'ease.* value over time', body: CurvesGraphs}, {title: 'ease.* position', body: CurvesTracks}]},
  {title: 'Springs', exports: 'springs · springAt · springDuration · SpringName', cells: [{title: 'springs presets', body: SpringGraphs}, {title: 'springAt scale pops', body: SpringPops}, {title: 'springAt options', body: SpringOptions}]},
  {title: 'Timing helpers', exports: 'progress · enter · exit · presence · mix · clamp01 · stagger · anticipate · keyframes', cells: [{title: 'progress / enter / exit / presence', body: HelperBars}, {title: 'stagger', body: StaggerRows}, {title: 'anticipate', body: AnticipateCell}, {title: 'keyframes', body: KeyframesCell}]},
  {title: 'Secondary motion', exports: 'wobble · pulse · pulses · velocity', cells: [{title: 'wobble', body: WobbleCell}, {title: 'pulse / pulses', body: PulseCell}, {title: 'velocity', body: VelocityCell}]},
  {title: 'Rects and FLIP', exports: 'Rect · lerpRect · rectCenter · rectStyle · flip', cells: [{title: 'flip', body: FlipCell}, {title: 'lerpRect + rectStyle', body: LerpRectCell}]},
  {title: 'PopIn', exports: 'PopIn', cells: [{title: 'PopIn presets', body: PopInPresets}, {title: 'PopIn stagger + exitAt', body: PopInStagger}, {title: 'PopIn from / exitTo', body: PopInPose}]},
  {title: 'MaskReveal', exports: 'MaskReveal', cells: [{title: 'MaskReveal hard edges', body: MaskHard}, {title: 'MaskReveal soft edges', body: MaskSoft}, {title: 'MaskReveal exitAt / progress', body: MaskExit}]},
  {title: 'TextRoll', exports: 'TextRoll', cells: [{title: 'TextRoll word', body: TextWord}, {title: 'TextRoll char', body: TextChar}, {title: 'TextRoll line + exit', body: TextLines}, {title: 'TextRoll down', body: TextDown}]},
  {title: 'TypeOn and CountUp', exports: 'TypeOn · typedChars · CountUp · countValue · formatNumber', cells: [{title: 'TypeOn', body: TypeOnCell}, {title: 'typedChars', body: TypedBar}, {title: 'CountUp count', body: CountCell}, {title: 'CountUp roll', body: RollCell}, {title: 'countValue + formatNumber', body: CountBars}]},
  {title: 'DrawPath and Ripple', exports: 'DrawPath · Ripple', cells: [{title: 'DrawPath + fill', body: DrawPaths}, {title: 'DrawPath progress', body: DrawWave}, {title: 'Ripple', body: RippleCell}]},
  {title: 'Drift and Float', exports: 'Drift · Float · driftAt · useDrift · useSubpixel', cells: [{title: 'Drift', body: DriftCards}, {title: 'Float', body: FloatCell}, {title: 'driftAt / useDrift', body: DriftPath}]},
  {title: 'Depth', exports: 'Stage3D · Layer · Parallax', cells: [{title: 'Stage3D + Layer', body: StageCell}, {title: 'Parallax', body: ParallaxCell}]},
  {title: 'Squash and shine', exports: 'SquashStretch · squashStretch · ShineSweep', cells: [{title: 'SquashStretch', body: DropCell}, {title: 'squashStretch()', body: SquashPlot}, {title: 'ShineSweep', body: ShineCell}]},
  {
    title: 'Motion blur',
    exports: 'MotionBlur · SampleBlur · FreezeBlur · samplesFor · rectTravel · sampleTimes · useOuterFrame · BlurOffContext · SmearBlur',
    cells: [
      {title: 'MotionBlur', body: MotionBlurCell},
      {title: 'SampleBlur', body: SampleBlurCell},
      {title: 'FreezeBlur', body: FreezeBlurCell},
      {title: 'SmearBlur', body: SmearCell},
      {title: 'BlurOffContext (sharp)', body: NoBlurCell},
    ],
  },
  {title: 'Shadow and texture', exports: 'makeElevation · elevation · liftShadow · dropShadowFilter · Grain · GRAIN_TEXTURE', cells: [{title: 'elevation', body: ElevationCell}, {title: 'liftShadow', body: LiftCell}, {title: 'dropShadowFilter', body: DropShadowCell}, {title: 'Grain', body: GrainCell}]},
  {
    title: 'Safe zones and scene context',
    exports: 'SAFE_PRESETS · safeRect · useSafeRect · insideRect · SafeZone (--safe) · SceneRoot · useScene · useSceneFrame · useGlobalFrame · frameUnit · useFrameUnit · SheetLabel',
    cells: [
      {title: 'safeRect presets (this format)', body: SafeDiagram},
      {title: 'insideRect', body: InsideCell},
      {title: 'SceneRoot + frame hooks', body: SceneContextCell},
      {title: 'SheetLabel', body: SheetLabelCell},
    ],
  },
];

export const SHOWCASE_FRAMES = BOARDS.length * BOARD;

/** Lays a board's cells out in the 5% safe area: picks the column count that gives the largest content scale. */
const Board: React.FC<{index: number; def: BoardDef}> = ({index, def}) => {
  const {width, height} = useVideoConfig();
  const k = frameUnit(width, height);
  const area = safeRect(width, height, 'default');
  const headH = 96 * k;
  const gap = 20 * k;
  const labelH = 44 * k;
  const pad = 14 * k;
  const gy = area.y + headH;
  const gh = area.h - headH;
  const n = def.cells.length;
  let best = {cols: 1, rows: n, s: 0, cw: 0, ch: 0};
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = (area.w - gap * (cols - 1)) / cols;
    const ch = (gh - gap * (rows - 1)) / rows;
    const s = Math.min((cw - 2 * pad) / W, (ch - labelH - pad) / H);
    if (s > best.s) best = {cols, rows, s, cw, ch};
  }
  const {cols, s, cw, ch} = best;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: area.x, top: area.y, fontFamily: DISPLAY, fontSize: 34 * k, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em'}}>
        {index + 1}/{BOARDS.length} · {def.title}
      </div>
      <div style={{position: 'absolute', left: area.x, top: area.y + 46 * k, width: area.w, fontFamily: FONT, fontSize: 17 * k, fontWeight: 500, color: C.inkMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{def.exports}</div>
      {def.cells.map((cell, i) => {
        const row = Math.floor(i / cols);
        const inRow = Math.min(cols, n - row * cols);
        const indent = ((cols - inRow) * (cw + gap)) / 2; // centre an incomplete last row
        const x = area.x + indent + (i % cols) * (cw + gap);
        const y = gy + row * (ch + gap);
        const Body = cell.body;
        return (
          <div key={cell.title} style={{position: 'absolute', left: x, top: y, width: cw, height: ch, borderRadius: 18 * k, background: 'rgba(255,255,255,0.72)', boxShadow: `inset 0 0 0 ${1.5 * k}px ${C.line}`, overflow: 'hidden'}}>
            <div style={{position: 'absolute', left: 18 * k, top: 12 * k, fontFamily: FONT, fontSize: 17 * k, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.inkMuted}}>{cell.title}</div>
            <div style={{position: 'absolute', left: (cw - W * s) / 2, top: labelH + (ch - labelH - pad - H * s) / 2, width: W, height: H, transform: `scale(${s})`, transformOrigin: '0 0'}}>
              <Body />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const MotionShowcase: React.FC<{showSafeZone?: boolean; safePreset?: SafeZoneSpec | SafeZoneSpec[]}> = ({showSafeZone = false, safePreset}) => (
  <AbsoluteFill style={{background: C.background}}>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 68% 62% at 50% 45%, #ffffff 0%, rgba(255,255,255,0) 72%)'}} />
    {BOARDS.map((def, i) => (
      <Sequence key={def.title} from={i * BOARD} durationInFrames={BOARD} name={`${i + 1} ${def.title}`}>
        <Board index={i} def={def} />
      </Sequence>
    ))}
    <Grain />
    {showSafeZone ? <SafeZone preset={safePreset ?? SAFE_ZONES} /> : null}
  </AbsoluteFill>
);
