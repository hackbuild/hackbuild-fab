// The Motion IR runner (M07-T11 step 1). Ops run in order against a
// machine's state. A move reaches its end value at the op; a commit
// evaluates the machine's commit rule on that state, synchronously, and
// appends the committed state. Frames are samples of the timeline drawn
// after the run: they read states and never write one, so no frame
// schedule can move an outcome (CHK-MOT-06). This is the OGEE viewer's
// sweep() lesson (viewer_template.html lines 565 to 586): under software GL
// two frames fired in 700 ms and nothing latched while the commit waited
// for a frame at full stroke.

import { canonicalize, commandError, sha256Hex, type Hash, type MotionOp, type MotionProgram, type MotionRunResult, type StateVar } from "@hackbuild/spec";

/** A machine the runner drives: immutable states, named variables, one commit rule. */
export interface MachineModel<S> {
  readonly machine: string;
  /** The committed state at power on. */
  init(): S;
  /** A state variable's value, in its own unit. */
  get(s: S, v: StateVar): number;
  /** A new state with one variable set; E_REF for a name the machine lacks. */
  put(s: S, v: StateVar, value: number): S;
  /** The machine's commit rule on this state. */
  commit(s: S): S;
  /** The flat canonical form: every variable, each in its own unit. */
  view(s: S): Readonly<Record<StateVar, number>>;
}

/** When frames are drawn, as times from the program start, s. */
export interface FrameSchedule {
  readonly id: string;
  times(durationS: number): readonly number[];
}

/** One frame every period from 0 to the end, the end included. */
export function periodic(id: string, periodS: number): FrameSchedule {
  return {
    id,
    times: (d) => {
      const out: number[] = [];
      for (let k = 0; k * periodS < d - 1e-12; k += 1) out.push(k * periodS);
      out.push(d);
      return out;
    },
  };
}

/** The three schedules of CHK-MOT-06 (M07-T11 step 6): every frame at 60 Hz, two frames per 700 ms sweep, none. */
export const FRAME_SCHEDULES: readonly FrameSchedule[] = [
  periodic("every frame", 1 / 60),
  periodic("two frames in 700 ms", 0.7),
  { id: "no frames", times: () => [] },
];

/** A drawn frame: time and the flat state on screen. */
export interface Frame {
  /** Time from the program start, s. */
  readonly t: number;
  readonly view: Readonly<Record<StateVar, number>>;
}

export interface RunOutput {
  readonly result: MotionRunResult;
  /** Program length, s. */
  readonly durationS: number;
  readonly frames: readonly Frame[];
}

/** The viewer's easing (viewer_template.html line 564). */
export const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

type MoveOp = Extract<MotionOp, { op: "move" }>;

interface Segment<S> {
  readonly t0: number;
  readonly t1: number;
  readonly base: S;
  readonly moves: readonly { readonly target: StateVar; readonly from: number; readonly to: number; readonly profile: MoveOp["profile"] }[];
}

function shape(profile: MoveOp["profile"], f: number): number {
  if (profile === "ease") return ease(f);
  if (profile === "verbatim") return f;
  throw commandError({
    code: "E_SCHEMA", path: "/ops/profile", got: profile, expected: "ease or verbatim",
    hint: "a trapezoid profile belongs to the planners (M07-T12); a program move is ease or verbatim", record: "motion-latch",
  });
}

/** Run a program; frames, when a schedule is given, are drawn from the finished timeline. */
export function runProgram<S>(m: MachineModel<S>, program: MotionProgram, schedule?: FrameSchedule): RunOutput {
  let s = m.init();
  let t = 0;
  const states: Readonly<Record<StateVar, number>>[] = [];
  const keys: { t: number; s: S }[] = [{ t: 0, s }];
  const segments: Segment<S>[] = [];
  const ops = program.ops;
  for (let k = 0; k < ops.length; k += 1) {
    const op = ops[k]!;
    if (op.op === "set") {
      s = m.put(s, op.target, op.value);
    } else if (op.op === "move") {
      const group: MoveOp[] = [op];
      while (ops[k + 1]?.op === "move" && (ops[k + 1] as MoveOp).join === true) group.push(ops[++k] as MoveOp);
      const dur = Math.max(...group.map((g) => g.s ?? 0));
      const base = s;
      const moves = group.map((g) => ({ target: g.target, from: m.get(base, g.target), to: g.to, profile: g.profile }));
      for (const g of moves) shape(g.profile, 1);
      if (dur > 0) segments.push({ t0: t, t1: t + dur, base, moves });
      for (const g of moves) s = m.put(s, g.target, g.to);
      t += dur;
    } else if (op.op === "commit") {
      s = m.commit(s);
      states.push(m.view(s));
    } else if (op.op === "dwell") {
      t += op.s;
    } else {
      const from = m.get(s, op.axis), to = from + op.halfSteps;
      const dur = op.rate > 0 ? Math.abs(op.halfSteps) / op.rate : 0;
      if (dur > 0) segments.push({ t0: t, t1: t + dur, base: s, moves: [{ target: op.axis, from, to, profile: "verbatim" }] });
      s = m.put(s, op.axis, to);
      t += dur;
    }
    keys.push({ t, s });
  }
  const endHash = sha256Hex(canonicalize(m.view(s))) as Hash;
  const frames = schedule === undefined ? [] : schedule.times(t).map((ft) => ({ t: ft, view: m.view(pictureAt(m, keys, segments, ft)) }));
  return { result: { program: program.id, states, violations: [], endHash }, durationS: t, frames };
}

/** The state on screen at time ft: inside a move, its base with the moved variables between their ends; else the last key at or before ft. */
function pictureAt<S>(m: MachineModel<S>, keys: readonly { t: number; s: S }[], segments: readonly Segment<S>[], ft: number): S {
  const seg = segments.find((g) => ft > g.t0 && ft < g.t1);
  if (seg !== undefined) {
    const f = (ft - seg.t0) / (seg.t1 - seg.t0);
    let s = seg.base;
    for (const g of seg.moves) s = m.put(s, g.target, g.from + (g.to - g.from) * shape(g.profile, f));
    return s;
  }
  let last = keys[0]!.s;
  for (const k of keys) if (k.t <= ft) last = k.s;
  return last;
}

/** A declared expectation set against the measured one (D-074): pass only when equal as sets. */
export interface SetExpectation {
  readonly pass: boolean;
  readonly measured: readonly string[];
  readonly declared: readonly string[];
  /** Declared and not measured. */
  readonly missing: readonly string[];
  /** Measured and not declared. */
  readonly extra: readonly string[];
}

export function expectSet(measured: readonly string[], declared: readonly string[]): SetExpectation {
  const m = [...new Set(measured)].sort(), d = [...new Set(declared)].sort();
  const missing = d.filter((x) => !m.includes(x)), extra = m.filter((x) => !d.includes(x));
  return { pass: missing.length === 0 && extra.length === 0, measured: m, declared: d, missing, extra };
}
