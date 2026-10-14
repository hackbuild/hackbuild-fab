// The coincidence latch as a runner machine, shared by the OGEE16 and
// STIPPLE programs. State: row and column bar rises zR[i] and zC[j] (mm),
// the plate slide lp (mm) and the latched cells. The commit rule is the
// OGEE viewer's apply() (viewer_template.html lines 416 to 421; the
// printed viewer repeats it at lines 285 to 289): while the plate is at
// rest every cell whose lug clears the plate latches, and a plate pulled
// past CAM + 0.05 drops every pin. The machine's CoincidenceLatch supplies
// the tests; the rule is written once.

import { commandError, type MotionOp, type StateVar } from "@hackbuild/spec";
import type { CoincidenceLatch } from "../latch.js";
import type { MachineModel } from "../runner.js";

export interface LatchState {
  readonly zR: readonly number[];
  readonly zC: readonly number[];
  readonly lp: number;
  /** latched[i][j], 1 where the pin of cell i,j is held up. */
  readonly latched: readonly (readonly (0 | 1)[])[];
}

const VAR = /^(zR|zC)\[(\d+)\]$|^lp$|^latched\[(\d+)\]\[(\d+)\]$/;

function bad(m: string, v: string): never {
  throw commandError({
    code: "E_REF", path: `/ops/target`, got: v, expected: "zR[i], zC[j] or lp",
    hint: `machine ${m} has no state variable ${v}`, record: "motion-latch",
  });
}

export function latchMachine(l: CoincidenceLatch): MachineModel<LatchState> {
  const N = l.N;
  const parse = (v: StateVar): RegExpExecArray => {
    const x = VAR.exec(v);
    if (x === null) bad(l.machine, v);
    if (x[2] !== undefined && Number(x[2]) >= N) bad(l.machine, v);
    return x;
  };
  return {
    machine: l.machine,
    init: () => ({
      zR: new Array<number>(N).fill(0), zC: new Array<number>(N).fill(0), lp: 0,
      latched: Array.from({ length: N }, () => new Array<0 | 1>(N).fill(0)),
    }),
    get(s, v) {
      const x = parse(v);
      if (x[1] === "zR") return s.zR[Number(x[2])]!;
      if (x[1] === "zC") return s.zC[Number(x[2])]!;
      if (x[3] !== undefined) return s.latched[Number(x[3])]![Number(x[4])]!;
      return s.lp;
    },
    put(s, v, value) {
      const x = parse(v);
      if (x[3] !== undefined) bad(l.machine, v);
      if (x[1] === undefined) return { ...s, lp: value };
      const k = Number(x[2]);
      const arr = (x[1] === "zR" ? s.zR : s.zC).slice();
      arr[k] = value;
      return x[1] === "zR" ? { ...s, zR: arr } : { ...s, zC: arr };
    },
    commit(s) {
      let latched = s.latched.map((r) => r.slice());
      if (l.catching(s.lp)) {
        for (let i = 0; i < N; i += 1) for (let j = 0; j < N; j += 1) if (l.latches(i, j, s.zR, s.zC, s.lp)) latched[i]![j] = 1;
      }
      if (l.released(s.lp)) latched = latched.map((r) => r.map(() => 0 as const));
      return { ...s, latched };
    },
    view(s) {
      const out: Record<StateVar, number> = {};
      s.zR.forEach((v, i) => (out[`zR[${i}]`] = v));
      s.zC.forEach((v, j) => (out[`zC[${j}]`] = v));
      out.lp = s.lp;
      s.latched.forEach((r, i) => r.forEach((v, j) => (out[`latched[${i}][${j}]`] = v)));
      return out;
    },
  };
}

/** The latched cells of a flat state, as "i,j", row major. */
export function latchedCells(view: Readonly<Record<StateVar, number>>): string[] {
  const out: { i: number; j: number }[] = [];
  for (const [k, v] of Object.entries(view)) {
    const x = /^latched\[(\d+)\]\[(\d+)\]$/.exec(k);
    if (x !== null && v === 1) out.push({ i: Number(x[1]), j: Number(x[2]) });
  }
  return out.sort((a, b) => a.i - b.i || a.j - b.j).map((c) => `${c.i},${c.j}`);
}

/** One bar cycle: the named bars rise together to `to`, the latch commits, they return. */
export function barCycle(bars: readonly StateVar[], to: number, upS: number, downS: number, profile: "ease" | "verbatim"): MotionOp[] {
  return [
    ...bars.map((target, k): MotionOp => ({ op: "move", target, to, profile, s: upS, ...(k > 0 ? { join: true } : {}) })),
    { op: "commit" },
    ...bars.map((target, k): MotionOp => ({ op: "move", target, to: 0, profile, s: downS, ...(k > 0 ? { join: true } : {}) })),
  ];
}
