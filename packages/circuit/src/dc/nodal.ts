// Analytic DC operating point over a resistor network (D-086, M05-T03).
//
// Ported from the canonical BLOCKS sim, lineage blocks.sim/blocks-1
// (originals/blocks/files/src-extracted/sim.js), whose solve() and
// solveDense() are line for line the BOSS ones at boss-src/src/sim.js lines
// 63 to 154 (designs/blocks/legacy/boss-src). Dense modified nodal analysis,
// Gaussian elimination with partial pivoting, Float64 throughout. The
// stamping order, the ground row and the leak are kept as BOSS has them so
// the result is BOSS's to the last bit on the same element list; the parity
// test is packages/circuit/test/nodal.test.ts against the dumped scenes.
//
// Element values arrive as built (resistance from extraction, source volts
// from the catalog pin row); the constants below are solver numerics and
// the legacy LED model, each with its sim.js line.

import type { Ohm, Volt } from "@hackbuild/spec";
import { circuitError } from "../path1d.js";

/** Smallest element resistance; a lower value is stamped as this, ohm (sim.js line 67). */
export const NODAL_MIN_OHM: Ohm = 1e-3;
/** An open switch or high impedance input, ohm (sim.js lines 76 and 92). */
export const NODAL_OPEN_OHM: Ohm = 1e9;
/** Conductance from every non-ground node to ground so floating nets stay defined, S (sim.js line 124). */
export const NODAL_LEAK_S = 1e-12;
/** Newton passes over the LED states before the last solve is kept (sim.js line 106). */
export const NODAL_MAX_ITERATIONS = 40;
/** Newton stops when the largest LED voltage step is under this, V (sim.js line 129). */
export const NODAL_STEP_V: Volt = 1e-4;
/** A pivot under this is a singular matrix (sim.js line 147). */
export const NODAL_PIVOT_MIN = 1e-18;

/**
 * Legacy BOSS LED model, kept only to reproduce BOSS (sim.js lines 111 to
 * 118 and 136): off below vf with 1e-9 S, else (V - vf) / (seriesOhm + 20).
 * The 20 ohm is BOSS's own junction term and the 1.8 V start is its Newton
 * seed. Device-accurate diodes go through eecircuit (M05-T01), never here.
 */
export const LED_PWL_LEGACY = { offS: 1e-9, junctionOhm: 20, seedV: 1.8 } as const;

/** One element between two node indices; node indices run 0 to nodeCount - 1. */
export type DcElement =
  | { readonly kind: "resistor"; readonly a: number; readonly b: number; readonly ohm: Ohm; readonly tag?: string }
  | { readonly kind: "vsource"; readonly pos: number; readonly neg: number; readonly volts: Volt; readonly tag?: string }
  | {
      /** Legacy piecewise linear LED (LED_PWL_LEGACY); BOSS reproduction only. */
      readonly kind: "ledPwl"; readonly anode: number; readonly cathode: number;
      /** Forward voltage, V. */
      readonly vfV: Volt;
      /** Printed series path, ohm; the model adds LED_PWL_LEGACY.junctionOhm. */
      readonly seriesOhm: Ohm;
      readonly tag?: string;
    };

export interface DcNetwork {
  readonly nodeCount: number;
  /** The node held at 0 V. */
  readonly ground: number;
  readonly elements: readonly DcElement[];
}

export interface DcSolution {
  /** Node voltage by node index, V. */
  readonly volts: Float64Array;
  /**
   * Current per element in input order, A: a resistor from a to b, an LED
   * from anode to cathode, a source the MNA branch current (into pos from
   * the circuit is negative when the source delivers power).
   */
  readonly amps: Float64Array;
  /** Newton passes run, 1 when there is no LED. */
  readonly iterations: number;
  /** False when the LED states still moved by NODAL_STEP_V or more after NODAL_MAX_ITERATIONS. */
  readonly converged: boolean;
}

function checkNode(i: number, n: number, path: string): number {
  if (!Number.isInteger(i) || i < 0 || i >= n) {
    throw circuitError({ code: "E_SCHEMA", path, got: i, expected: `a node index 0 to ${n - 1}`, hint: "number nodes from 0 and give nodeCount" });
  }
  return i;
}

function checkValue(v: number, path: string, positive: boolean): number {
  if (!Number.isFinite(v) || (positive && !(v > 0))) {
    throw circuitError({ code: "E_SCHEMA", path, got: v, expected: positive ? "a finite number above 0" : "a finite number", hint: "give every element value as a finite number" });
  }
  return v;
}

/** solveDense (sim.js lines 142 to 154): null when a pivot is under NODAL_PIVOT_MIN. */
function solveDense(A: Float64Array, b: Float64Array, n: number): Float64Array | null {
  const M = Float64Array.from(A);
  const x = Float64Array.from(b);
  for (let c = 0; c < n; c++) {
    let piv = c;
    let best = Math.abs(M[c * n + c]!);
    for (let r = c + 1; r < n; r++) {
      const v = Math.abs(M[r * n + c]!);
      if (v > best) { best = v; piv = r; }
    }
    if (best < NODAL_PIVOT_MIN) return null;
    if (piv !== c) {
      for (let j = 0; j < n; j++) { const t = M[c * n + j]!; M[c * n + j] = M[piv * n + j]!; M[piv * n + j] = t; }
      const t = x[c]!; x[c] = x[piv]!; x[piv] = t;
    }
    const d = M[c * n + c]!;
    for (let r = c + 1; r < n; r++) {
      const f = M[r * n + c]! / d;
      if (!f) continue;
      for (let j = c; j < n; j++) M[r * n + j]! -= f * M[c * n + j]!;
      x[r]! -= f * x[c]!;
    }
  }
  for (let c = n - 1; c >= 0; c--) {
    let s = x[c]!;
    for (let j = c + 1; j < n; j++) s -= M[c * n + j]! * x[j]!;
    x[c] = s / M[c * n + c]!;
  }
  return x;
}

/**
 * DC operating point of a network. Stamps resistors, then LEDs, then
 * sources, each in input order (BOSS order, sim.js lines 110 to 119), so a
 * BOSS element list solves to BOSS's numbers. Throws E_SCHEMA on a bad
 * node or value and E_KERNEL when elimination meets a pivot under
 * NODAL_PIVOT_MIN (BOSS returns ok false there, sim.js line 126).
 */
export function solveDc(net: DcNetwork): DcSolution {
  const n = net.nodeCount;
  if (!Number.isInteger(n) || n < 1) throw circuitError({ code: "E_SCHEMA", path: "/nodeCount", got: n, expected: "an integer above 0", hint: "count the nodes, ground included" });
  const gnd = checkNode(net.ground, n, "/ground");
  const R: { a: number; b: number; r: number; at: number }[] = [];
  const D: { a: number; k: number; vf: number; rs: number; at: number }[] = [];
  const V: { a: number; b: number; v: number; at: number }[] = [];
  net.elements.forEach((e, at) => {
    const p = `/elements/${at}`;
    if (e.kind === "resistor") {
      const r = checkValue(e.ohm, `${p}/ohm`, true);
      R.push({ a: checkNode(e.a, n, `${p}/a`), b: checkNode(e.b, n, `${p}/b`), r: r < NODAL_MIN_OHM ? NODAL_MIN_OHM : r, at });
    } else if (e.kind === "ledPwl") {
      D.push({ a: checkNode(e.anode, n, `${p}/anode`), k: checkNode(e.cathode, n, `${p}/cathode`), vf: checkValue(e.vfV, `${p}/vfV`, false), rs: checkValue(e.seriesOhm, `${p}/seriesOhm`, false), at });
    } else {
      V.push({ a: checkNode(e.pos, n, `${p}/pos`), b: checkNode(e.neg, n, `${p}/neg`), v: checkValue(e.volts, `${p}/volts`, false), at });
    }
  });

  const m = V.length;
  const size = n + m;
  const vd: number[] = D.map(() => LED_PWL_LEGACY.seedV);
  let x: Float64Array | null = null;
  let iterations = 0;
  let converged = false;
  for (let it = 0; it < NODAL_MAX_ITERATIONS; it++) {
    iterations = it + 1;
    const A = new Float64Array(size * size);
    const z = new Float64Array(size);
    const stamp = (i: number, j: number, v: number): void => { A[i * size + j]! += v; };
    for (const r of R) {
      const g = 1 / r.r;
      stamp(r.a, r.a, g); stamp(r.b, r.b, g); stamp(r.a, r.b, -g); stamp(r.b, r.a, -g);
    }
    D.forEach((d, di) => {
      const rs = d.rs + LED_PWL_LEGACY.junctionOhm;
      const on = vd[di]! > d.vf;
      const g = on ? 1 / rs : LED_PWL_LEGACY.offS;
      const ieq = on ? -d.vf / rs : 0;
      stamp(d.a, d.a, g); stamp(d.k, d.k, g); stamp(d.a, d.k, -g); stamp(d.k, d.a, -g);
      z[d.a]! -= ieq; z[d.k]! += ieq;
    });
    V.forEach((s, k) => {
      const r = n + k;
      stamp(s.a, r, 1); stamp(s.b, r, -1); stamp(r, s.a, 1); stamp(r, s.b, -1);
      z[r] = s.v;
    });
    // Ground row replaced by identity; the ground column stays, as BOSS has it.
    for (let j = 0; j < size; j++) A[gnd * size + j] = 0;
    A[gnd * size + gnd] = 1;
    z[gnd] = 0;
    for (let i = 0; i < n; i++) if (i !== gnd) A[i * size + i]! += NODAL_LEAK_S;
    x = solveDense(A, z, size);
    if (x === null) {
      throw circuitError({ code: "E_KERNEL", path: "/elements", got: `pivot under ${NODAL_PIVOT_MIN} with ${n} nodes, ${m} sources`, expected: "a nonsingular nodal matrix", hint: "two sources hold one node, or a source loop has no resistance; split the loop with a resistor", record: "copper-routing" });
    }
    let maxd = 0;
    D.forEach((d, di) => {
      const vnew = x![d.a]! - x![d.k]!;
      maxd = Math.max(maxd, Math.abs(vnew - vd[di]!));
      vd[di] = vnew;
    });
    if (maxd < NODAL_STEP_V) { converged = true; break; }
  }
  const sol = x!;
  const volts = sol.slice(0, n);
  const amps = new Float64Array(net.elements.length);
  for (const r of R) amps[r.at] = (volts[r.a]! - volts[r.b]!) / r.r;
  for (const d of D) {
    const v = volts[d.a]! - volts[d.k]!;
    amps[d.at] = v > d.vf ? (v - d.vf) / (d.rs + LED_PWL_LEGACY.junctionOhm) : 0;
  }
  V.forEach((s, k) => { amps[s.at] = sol[n + k]!; });
  return { volts, amps, iterations, converged };
}
