// Corotational beam FE for a double curved beam click element, ported from
// SNAPFE (originals/pip/files/haft-src/src/snapfe.js, lineage row
// snapfe/pip-haft-9; the pip-controller copy differs only in its header
// comment). Half model of one cosine arch: centre rotation and axial motion
// are held by the shuttle, so the antisymmetric mode is suppressed as in a
// double beam. Displacement control at the centre. Units mm, N, MPa.
//
// Arithmetic order, float64, the dense Gaussian elimination with partial
// pivot, the 40-iteration Newton loop and both convergence tests are kept as
// in the source (M01-T01 step 2); the parity goldens of M01-T02 depend on it.

import { commandError } from "@hackbuild/spec";

/** Inputs of one arch curve (snapfe.js line 19). */
export interface BeamInput {
  /** Span of the whole arch, mm. */
  readonly l: number;
  /** Rise of the arch at its centre, mm. */
  readonly h: number;
  /** Thickness in the bending plane, mm. */
  readonly t: number;
  /** Width across the bending plane, mm. */
  readonly w: number;
  /** Young's modulus, MPa. */
  readonly E: number;
  /** Elements over the half span, count. */
  readonly nel: number;
  /** Displacement steps after the unloaded point, count. */
  readonly steps: number;
  /** Centre travel at the last step as a multiple of h, ratio. */
  readonly dmax: number;
}

/** Inputs of a whole click element: one arch curve times the arch count. */
export interface ElementInput extends BeamInput {
  /** Arches in the element, count; the shuttle force is this times one arch. */
  readonly arches: number;
}

/** One load step of the curve. */
export interface CurvePoint {
  /** Centre travel, mm. */
  readonly d: number;
  /** Shuttle force, N (one arch in `curve`, the whole element in `summarize`). */
  readonly F: number;
  /** Largest element strain, fraction (0.025 is 2.5 percent). */
  readonly e: number;
}

export interface Curve {
  /** steps + 1 points, travel 0 first. */
  readonly pts: readonly CurvePoint[];
  /** False when any load step failed to converge; the curve is then not trusted. */
  readonly ok: boolean;
}

export interface Summary extends Curve {
  /** True when the force has a first local maximum before the last point. */
  readonly snap: boolean;
  /** Force at the first local maximum, N; 0 without a snap. */
  readonly peak: number;
  /** Travel at the peak, mm; 0 without a snap. */
  readonly dPeak: number;
  /** Smallest force after the peak up to travel 2 h, N; 0 without a snap. */
  readonly valley: number;
  /** Travel at the valley, mm; 0 without a snap. */
  readonly dValley: number;
  /** Fractional force drop 1 - valley / peak, ratio; 0 without a snap. */
  readonly drop: number;
  /** True when the valley force is negative: the element latches. */
  readonly bistable: boolean;
  /** Largest element strain up to travel 2 h, fraction. */
  readonly emax: number;
}

function schema(path: string, got: unknown, expected: string): never {
  throw commandError({
    code: "E_SCHEMA", path, got, expected,
    hint: `set ${path.slice(1)} to ${expected}`, record: "viewer-sim",
  });
}

function checkBeam(p: BeamInput): void {
  for (const k of ["l", "h", "t", "w", "E", "dmax"] as const) {
    if (!Number.isFinite(p[k]) || !(p[k] > 0)) schema(`/${k}`, p[k], "a positive finite number");
  }
  for (const k of ["nel", "steps"] as const) {
    if (!Number.isInteger(p[k]) || p[k] < 1) schema(`/${k}`, p[k], "a positive integer");
  }
}

/** Dense Gaussian elimination with partial pivot (snapfe.js lines 7 to 18); null when a pivot vanishes. */
export function solveLin(K: readonly (readonly number[])[], f: readonly number[], n: number): number[] | null {
  const A = K.map((r) => r.slice());
  const b = f.slice();
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r]![i]!) > Math.abs(A[p]![i]!)) p = r;
    if (p !== i) {
      [A[i], A[p]] = [A[p]!, A[i]!];
      [b[i], b[p]] = [b[p]!, b[i]!];
    }
    const Ai = A[i]!;
    const d = Ai[i]!;
    if (Math.abs(d) < 1e-300) return null;
    for (let r = i + 1; r < n; r++) {
      const Ar = A[r]!;
      const m = Ar[i]! / d;
      if (!m) continue;
      for (let c = i; c < n; c++) Ar[c] = Ar[c]! - m * Ai[c]!;
      b[r] = b[r]! - m * b[i]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const Ai = A[i]!;
    let s = b[i]!;
    for (let c = i + 1; c < n; c++) s -= Ai[c]! * x[c]!;
    x[i] = s / Ai[i]!;
  }
  return x;
}

/** Force and strain against centre travel for one arch (snapfe.js lines 20 to 86). */
export function curve(p: BeamInput): Curve {
  checkBeam(p);
  const ne = p.nel, nn = ne + 1, nd = nn * 3;
  const E = p.E, A = p.w * p.t, I = p.w * p.t * p.t * p.t / 12;
  const X: number[] = [], Y: number[] = [];
  for (let i = 0; i < nn; i++) {
    const x = (p.l / 2) * i / ne;
    X.push(x);
    Y.push(p.h / 2 * (1 - Math.cos(2 * Math.PI * x / p.l)));
  }
  const L0: number[] = [], b0: number[] = [];
  for (let e = 0; e < ne; e++) {
    const dx = X[e + 1]! - X[e]!, dy = Y[e + 1]! - Y[e]!;
    L0.push(Math.hypot(dx, dy));
    b0.push(Math.atan2(dy, dx));
  }
  const U = new Array<number>(nd).fill(0);
  // node 0 holds all three dofs; the centre node holds u and theta, and its v is prescribed
  const fixed = new Set([0, 1, 2, 3 * ne, 3 * ne + 2]);
  const vdof = 3 * ne + 1;
  const free: number[] = [];
  for (let i = 0; i < nd; i++) if (!fixed.has(i) && i !== vdof) free.push(i);
  const nf = free.length;

  function assemble(): { K: number[][]; F: number[]; emax: number } {
    const K = Array.from({ length: nd }, () => new Array<number>(nd).fill(0));
    const F = new Array<number>(nd).fill(0);
    let emax = 0;
    for (let e = 0; e < ne; e++) {
      const d = [3 * e, 3 * e + 1, 3 * e + 2, 3 * e + 3, 3 * e + 4, 3 * e + 5] as const;
      const L0e = L0[e]!, b0e = b0[e]!;
      const x1 = X[e]! + U[d[0]]!, y1 = Y[e]! + U[d[1]]!, x2 = X[e + 1]! + U[d[3]]!, y2 = Y[e + 1]! + U[d[4]]!;
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), c = dx / L, s = dy / L;
      const cb0 = Math.cos(b0e), sb0 = Math.sin(b0e);
      const al = Math.atan2(s * cb0 - c * sb0, c * cb0 + s * sb0);
      const t1 = U[d[2]]! - al, t2 = U[d[5]]! - al, ul = L - L0e;
      const k = E * I / L0e;
      const N = E * A / L0e * ul, M1 = k * (4 * t1 + 2 * t2), M2 = k * (2 * t1 + 4 * t2);
      const eps = Math.abs(ul / L0e) + (p.t / 2) * Math.max(Math.abs(4 * t1 + 2 * t2), Math.abs(2 * t1 + 4 * t2)) / L0e;
      if (eps > emax) emax = eps;
      const B = [[-c, -s, 0, c, s, 0], [-s / L, c / L, 1, s / L, -c / L, 0], [-s / L, c / L, 0, s / L, -c / L, 1]] as const;
      const D = [[E * A / L0e, 0, 0], [0, 4 * k, 2 * k], [0, 2 * k, 4 * k]] as const;
      const q = [N, M1, M2] as const;
      const r = [-c, -s, 0, c, s, 0] as const, z = [s, -c, 0, -s, c, 0] as const;
      for (let a = 0; a < 6; a++) {
        const da = d[a]!;
        F[da] = F[da]! + (B[0][a]! * q[0] + B[1][a]! * q[1] + B[2][a]! * q[2]);
        const Kr = K[da]!;
        for (let bb = 0; bb < 6; bb++) {
          let v = 0;
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) v += B[i]![a]! * D[i]![j]! * B[j]![bb]!;
          v += N / L * z[a]! * z[bb]! + (M1 + M2) / (L * L) * (r[a]! * z[bb]! + z[a]! * r[bb]!);
          Kr[d[bb]!] = Kr[d[bb]!]! + v;
        }
      }
    }
    return { K, F, emax };
  }

  const out: CurvePoint[] = [];
  const steps = p.steps, dmax = p.dmax * p.h;
  let ok = true;
  for (let st = 0; st <= steps; st++) {
    U[vdof] = -dmax * st / steps;
    let conv = false;
    let res: ReturnType<typeof assemble> | undefined;
    for (let it = 0; it < 40; it++) {
      res = assemble();
      const Kr = res.K, Fr = res.F;
      const Kf = free.map((i) => free.map((j) => Kr[i]![j]!));
      const rf = free.map((i) => -Fr[i]!);
      let nr = 0;
      for (const v of rf) nr = Math.max(nr, Math.abs(v));
      if (nr < 1e-9 * E * A) { conv = true; break; }
      const du = solveLin(Kf, rf, nf);
      if (!du) break;
      let m = 0;
      for (let k = 0; k < nf; k++) {
        const fk = free[k]!;
        U[fk] = U[fk]! + du[k]!;
        m = Math.max(m, Math.abs(du[k]!));
      }
      if (m < 1e-12) { conv = true; break; }
    }
    if (!conv) ok = false;
    res = res ?? assemble();
    // the reaction at the prescribed dof is the internal force there; two half arches meet at the shuttle
    out.push({ d: -U[vdof]!, F: -2 * res.F[vdof]!, e: res.emax });
  }
  return { pts: out, ok };
}

/** Element curve and its readouts: peak is the first local maximum, valley the minimum after it up to travel 2 h (snapfe.js lines 87 to 99). */
export function summarize(p: ElementInput): Summary {
  if (!Number.isInteger(p.arches) || p.arches < 1) schema("/arches", p.arches, "a positive integer");
  const r = curve(p);
  const pts = r.pts.map((q) => ({ d: q.d, F: q.F * p.arches, e: q.e }));
  let pki = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    if (pts[i]!.F >= pts[i - 1]!.F && pts[i]!.F > pts[i + 1]!.F) { pki = i; break; }
  }
  const lim = 2 * p.h;
  const snap = pki > 0;
  let vl = Infinity, vli = pki;
  if (snap) for (let i = pki; i < pts.length && pts[i]!.d <= lim + 1e-9; i++) if (pts[i]!.F < vl) { vl = pts[i]!.F; vli = i; }
  const pk = snap ? pts[pki]!.F : 0;
  let emax = 0;
  for (const q of pts) if (q.d <= lim + 1e-9) emax = Math.max(emax, q.e);
  return {
    pts, ok: r.ok, snap, peak: pk, dPeak: snap ? pts[pki]!.d : 0, valley: snap ? vl : 0, dValley: snap ? pts[vli]!.d : 0,
    drop: snap && pk > 0 ? 1 - vl / pk : 0, bistable: snap && vl < 0, emax,
  };
}
