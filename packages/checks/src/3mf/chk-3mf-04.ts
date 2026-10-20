// CHK-3MF-04 split per D-070 (CHECKS.md 7.1, M00-T09 step 4). It runs at
// build time on Part IR outlines because bytes carry no body outlines; on
// bytes the same failure shows as --overlap volume (CHK-PRT-03).
//
// Rule coincidence: every non-structure insert keeps at least
// constant('3mf.coincidenceInset') (0.001 mm, inferred) from structure
// material. Measured is the smallest clearance from an insert boundary to a
// structure boundary; an insert reaching into structure material measures
// minus its depth, which is what a homothety about the centroid does to a
// COLLAR spiral.
// Rule pinch: inlay regions that touched at a point or along a zero-width
// neck sit at least 2 x constant('3mf.pinchInset') (0.02 mm, inferred,
// COTTER applyArt HAIR) apart. Measured is half the smallest gap between two
// insert components, the inset each side carries.
//
// Outlines arrive as rings the way geom's Section emits them (outer rings
// counter-clockwise, holes clockwise, mm), so a caller passes section.rings.

import type { CheckResult, ProfileLookup, Ring } from "@hackbuild/spec";

export const CHK_3MF_04 = "CHK-3MF-04" as const;
/** CHECKS.md 7.1: version 2.0.0 after the split. */
export const CHK_3MF_04_VERSION = "2.0.0";
/** Profile constant ids; geom reads the same two (packages/geom/src/inset.ts GEOM_CONSTANTS). */
export const INSET_CONSTANTS = { coincidence: "3mf.coincidenceInset", pinch: "3mf.pinchInset" } as const;

export interface BodyOutline {
  readonly body: string;
  /** Outer rings counter-clockwise, holes clockwise, mm. */
  readonly rings: readonly Ring[];
}

export interface Chk04Input {
  readonly part: string;
  /** Structure bodies, with the pockets the inserts fill as holes. */
  readonly structure: readonly BodyOutline[];
  /** Non-structure inserts as emitted, after both insets. */
  readonly inserts: readonly BodyOutline[];
}

interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

function boxOf(rings: readonly Ring[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) for (const [x, y] of r) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

function boxGap(a: Box, b: Box): number {
  const dx = Math.max(0, a.x0 - b.x1, b.x0 - a.x1);
  const dy = Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
  return Math.hypot(dx, dy);
}

function pointSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const cross = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

function segmentsCross(a: readonly [number, number], b: readonly [number, number], c: readonly [number, number], d: readonly [number, number]): boolean {
  const d1 = cross(c[0], c[1], d[0], d[1], a[0], a[1]);
  const d2 = cross(c[0], c[1], d[0], d[1], b[0], b[1]);
  const d3 = cross(a[0], a[1], b[0], b[1], c[0], c[1]);
  const d4 = cross(a[0], a[1], b[0], b[1], d[0], d[1]);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function segmentDistance(a: readonly [number, number], b: readonly [number, number], c: readonly [number, number], d: readonly [number, number]): number {
  if (segmentsCross(a, b, c, d)) return 0;
  return Math.min(
    pointSegment(a[0], a[1], c[0], c[1], d[0], d[1]), pointSegment(b[0], b[1], c[0], c[1], d[0], d[1]),
    pointSegment(c[0], c[1], a[0], a[1], b[0], b[1]), pointSegment(d[0], d[1], a[0], a[1], b[0], b[1]),
  );
}

/** Smallest distance between the boundaries of two ring sets, mm; 0 when they cross or touch. */
function boundaryDistance(p: readonly Ring[], q: readonly Ring[], bound = Infinity): number {
  let best = bound;
  for (const r of p) for (const s of q) {
    for (let i = 0; i < r.length; i += 1) {
      const a = r[i]!, b = r[(i + 1) % r.length]!;
      for (let j = 0; j < s.length; j += 1) {
        const dd = segmentDistance(a, b, s[j]!, s[(j + 1) % s.length]!);
        if (dd < best) {
          best = dd;
          if (best === 0) return 0;
        }
      }
    }
  }
  return best;
}

/** Even-odd containment over every ring of a region. */
function inside(rings: readonly Ring[], x: number, y: number): boolean {
  let c = false;
  for (const r of rings) {
    for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) {
      const [xi, yi] = r[i]!;
      const [xj, yj] = r[j]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
  }
  return c;
}

function boundaryPointDistance(rings: readonly Ring[], x: number, y: number): number {
  let best = Infinity;
  for (const r of rings) for (let i = 0; i < r.length; i += 1) {
    const a = r[i]!, b = r[(i + 1) % r.length]!;
    best = Math.min(best, pointSegment(x, y, a[0], a[1], b[0], b[1]));
  }
  return best;
}

const area2 = (r: Ring): number => {
  let s = 0;
  for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) s += r[j]![0] * r[i]![1] - r[i]![0] * r[j]![1];
  return s;
};

/** Each outer ring with the holes it holds, one component per printed island. */
function components(o: BodyOutline): { readonly body: string; readonly rings: Ring[]; readonly box: Box }[] {
  const outers = o.rings.filter((r) => area2(r) > 0).map((r) => ({ outer: r, holes: [] as Ring[], a: area2(r) })).sort((x, y) => x.a - y.a);
  for (const h of o.rings.filter((r) => area2(r) < 0)) {
    const host = outers.find((c) => h.length > 0 && inside([c.outer], h[0]![0], h[0]![1]));
    if (host !== undefined) host.holes.push(h);
  }
  return outers.map((c) => ({ body: o.body, rings: [c.outer, ...c.holes], box: boxOf([c.outer]) }));
}

function result(part: string, rule: "coincidence" | "pinch", lo: number, measured: number, bodies: string, constraint: string): CheckResult {
  const ok = measured >= lo;
  return {
    id: CHK_3MF_04, version: CHK_3MF_04_VERSION, verdict: ok ? "pass" : "fail", severity: "block",
    target: { level: "part", part }, constraint, origin: `hbf://check/${CHK_3MF_04}`,
    // hi is open: null, the open end of CHECKS.md 7.1 (D-225).
    legal: { kind: "interval", lo, hi: null, unit: "mm", nearest: ok ? measured : lo },
    measured, extra: { rule, bodies },
  };
}

function skip(part: string, rule: "coincidence" | "pinch", reason: string): CheckResult {
  return {
    id: CHK_3MF_04, version: CHK_3MF_04_VERSION, verdict: "skip", severity: "block", target: { level: "part", part },
    constraint: reason, origin: `hbf://check/${CHK_3MF_04}`, legal: { kind: "none" }, measured: "not run", extra: { rule },
  };
}

/** Coincidence clearance of one insert against one structure body, mm; negative when the insert reaches into it. */
function coincidence(ins: BodyOutline, st: BodyOutline): number {
  let depth = 0;
  for (const r of ins.rings) for (const [x, y] of r) {
    if (inside(st.rings, x, y)) depth = Math.max(depth, boundaryPointDistance(st.rings, x, y));
  }
  if (depth > 0) return -depth;
  return boundaryDistance(ins.rings, st.rings);
}

/** Both rules on one part's outlines: one result per rule. */
export function chk3mf04(input: Chk04Input, profile: Pick<ProfileLookup, "constant">): readonly CheckResult[] {
  const ci = profile.constant(INSET_CONSTANTS.coincidence).value;
  const pi = profile.constant(INSET_CONSTANTS.pinch).value;
  const out: CheckResult[] = [];

  if (input.inserts.length === 0 || input.structure.length === 0) {
    out.push(skip(input.part, "coincidence", "no non-structure insert sits beside a structure body"));
  } else {
    let best = Infinity;
    let pair = "";
    for (const ins of input.inserts) {
      const ib = boxOf(ins.rings);
      for (const st of input.structure) {
        if (boxGap(ib, boxOf(st.rings)) >= best) continue;
        const d = coincidence(ins, st);
        if (d < best) {
          best = d;
          pair = `${ins.body},${st.body}`;
        }
      }
    }
    out.push(result(input.part, "coincidence", ci, best, pair,
      `every non-structure insert clears structure material by at least constant 3mf.coincidenceInset ${ci} mm along its true edge normal (D-070)`));
  }

  const comps = input.inserts.flatMap(components);
  if (comps.length < 2) {
    out.push(skip(input.part, "pinch", "fewer than two insert components; no pair to measure"));
  } else {
    let best = Infinity;
    let pair = "";
    for (let i = 0; i < comps.length; i += 1) {
      for (let j = i + 1; j < comps.length; j += 1) {
        const a = comps[i]!, b = comps[j]!;
        if (boxGap(a.box, b.box) >= best) continue;
        const d = boundaryDistance(a.rings, b.rings, best);
        if (d < best) {
          best = d;
          pair = `${a.body},${b.body}`;
        }
      }
    }
    out.push(result(input.part, "pinch", pi, best / 2, pair,
      `insert regions sit at least 2 x constant 3mf.pinchInset ${pi} mm apart (COTTER HAIR, D-070)`));
  }
  return out;
}
