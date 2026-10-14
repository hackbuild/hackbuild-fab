// Insertion by search (M02-T09), ported from COTTER hook_fit.py `search()`
// (designs/cotter/legacy/tools/hook_fit.py lines 44 to 71, lineage
// cotter.hook-fit/r5). A rigid 2D section starts seated in an obstacle and
// a best-first search over a grid of poses (tilt about the origin, then x
// and y translation) looks for one whose least x passes the obstacle face.
// The search runs extraction from the seated pose, which is insertion
// reversed.
//
// Kept from the source: the same eleven neighbour moves in the same order,
// priority -minX - tiltWeight * tilt with ties broken by push order, a
// state counted when it is popped, the clear test on the popped pose, the
// limit test on grid index times step (the same float products the source
// compares), and the budget test after each expansion. The sections are
// manifold CrossSections (D-163); shapely's prepared intersects becomes
// "the intersection is not empty", which differs only on a touching
// boundary, and the obstacle is inset before the search for that reason.
//
// The sim measures: `reached` says whether a clearing pose was found and
// `stop` why the search ended. Whether a case should insert is declared by
// its scene and compared by the caller.

import type { CrossSection, SimplePolygon } from "manifold-3d";
import { kernel, loadManifold, scope } from "@hackbuild/mesh";

/** A grid state: tilt index, x index, y index. Pose = rotate by tilt * tiltStep deg about the origin, then translate by (x, y) * xyStep mm. */
export type InsertState = readonly [t: number, i: number, j: number];

/** The eleven moves of hook_fit.py line 62, in its order. */
export const INSERT_MOVES: readonly InsertState[] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 0], [1, 0, 1], [1, 0, -1], [1, 1, 1], [1, 1, -1],
];

/** Closed interval [lo, hi]. */
export type Range = readonly [lo: number, hi: number];

/** Search settings; every value comes from profile (hookFit.*). */
export interface InsertSettings {
  /** deg */
  readonly tiltStep: number;
  /** mm */
  readonly xyStep: number;
  /** Popped poses before the search gives up, count. */
  readonly budget: number;
  /** Least x the moving section must pass, mm. */
  readonly clearX: number;
  /** Priority credit per degree of tilt, mm/deg. */
  readonly tiltWeight: number;
  /** deg */
  readonly tilt: Range;
  /** mm */
  readonly x: Range;
  /** mm */
  readonly y: Range;
}

export interface InsertInput {
  /** The moving section in its seated pose, as CrossSection polygons. */
  readonly moving: readonly SimplePolygon[];
  /** The obstacle, already inset, as CrossSection polygons. */
  readonly obstacle: readonly SimplePolygon[];
  readonly settings: InsertSettings;
  /** Keep the popped states in order (the oracle golden holds the same list). */
  readonly trace?: boolean;
}

export interface InsertPose {
  readonly state: InsertState;
  /** deg */
  readonly tiltDeg: number;
  /** mm */
  readonly xMm: number;
  /** mm */
  readonly yMm: number;
  /** Least x of the section at this pose, mm (computed). */
  readonly minXMm: number;
}

export interface InsertResult {
  /** A clearing pose was found (computed). */
  readonly reached: boolean;
  /** clear: a popped pose passed clearX; exhausted: no state left; budget: the budget ran out; seated: the start pose already overlaps. */
  readonly stop: "clear" | "exhausted" | "budget" | "seated";
  /** Popped poses, count (computed). */
  readonly poses: number;
  /** Largest tilt among popped poses, deg (computed). */
  readonly maxTiltDeg: number;
  /** The clearing pose, or null. */
  readonly clearing: InsertPose | null;
  /** Pushed states, count (computed). */
  readonly pushed: number;
  /** Popped states in order, when asked. */
  readonly path?: readonly InsertState[];
}

/** Binary min-heap on (priority, push order); the order is total, so the pop sequence equals Python heapq's. */
class Queue {
  readonly #p: number[] = [];
  readonly #n: number[] = [];
  readonly #s: InsertState[] = [];
  #count = 0;

  get size(): number {
    return this.#s.length;
  }

  #less(a: number, b: number): boolean {
    const pa = this.#p[a]!;
    const pb = this.#p[b]!;
    return pa < pb || (pa === pb && this.#n[a]! < this.#n[b]!);
  }

  #swap(a: number, b: number): void {
    [this.#p[a], this.#p[b]] = [this.#p[b]!, this.#p[a]!];
    [this.#n[a], this.#n[b]] = [this.#n[b]!, this.#n[a]!];
    [this.#s[a], this.#s[b]] = [this.#s[b]!, this.#s[a]!];
  }

  push(priority: number, s: InsertState): void {
    this.#p.push(priority);
    this.#n.push(this.#count++);
    this.#s.push(s);
    for (let k = this.#s.length - 1; k > 0; ) {
      const up = (k - 1) >> 1;
      if (!this.#less(k, up)) break;
      this.#swap(k, up);
      k = up;
    }
  }

  pop(): InsertState {
    const top = this.#s[0]!;
    const last = this.#s.length - 1;
    this.#swap(0, last);
    this.#p.pop();
    this.#n.pop();
    this.#s.pop();
    for (let k = 0; ; ) {
      const l = 2 * k + 1;
      const r = l + 1;
      let m = k;
      if (l < this.#s.length && this.#less(l, m)) m = l;
      if (r < this.#s.length && this.#less(r, m)) m = r;
      if (m === k) break;
      this.#swap(k, m);
      k = m;
    }
    return top;
  }

  get pushed(): number {
    return this.#count;
  }
}

const key = (s: InsertState): string => `${String(s[0])},${String(s[1])},${String(s[2])}`;

/**
 * Best-first search for a pose that takes `moving` clear of `obstacle`.
 * Every CrossSection is made and freed inside one scope (D-055); the
 * per-pose objects inside a nested scope per test, so the pool stays small.
 */
export async function insertSearch(input: InsertInput): Promise<InsertResult> {
  await loadManifold();
  return scope(() => {
    const CS = kernel().CrossSection;
    const { settings: st } = input;
    const moving = new CS(input.moving as SimplePolygon[], "Positive");
    const obstacle = new CS(input.obstacle as SimplePolygon[], "Positive");
    const rotated = new Map<number, CrossSection>();
    const rot = (t: number): CrossSection => {
      let r = rotated.get(t);
      if (r === undefined) {
        r = moving.rotate(t * st.tiltStep);
        rotated.set(t, r);
      }
      return r;
    };
    // Plain data out of a nested scope: does the pose overlap, and its least x.
    // The rotation is fetched first, so a cached copy belongs to the outer scope.
    const test = (s: InsertState, overlap: boolean): { readonly hits: boolean; readonly minX: number } => {
      const r = rot(s[0]);
      return scope(() => {
        const g = r.translate(s[1] * st.xyStep, s[2] * st.xyStep);
        return { hits: overlap && !g.intersect(obstacle).isEmpty(), minX: g.bounds().min[0] };
      });
    };
    const inside = (s: InsertState): boolean => {
      const t = s[0] * st.tiltStep;
      const x = s[1] * st.xyStep;
      const y = s[2] * st.xyStep;
      return st.tilt[0] <= t && t <= st.tilt[1] && st.x[0] <= x && x <= st.x[1] && st.y[0] <= y && y <= st.y[1];
    };

    const path: InsertState[] = [];
    const start: InsertState = [0, 0, 0];
    const done = (r: Omit<InsertResult, "path">): InsertResult => (input.trace === true ? { ...r, path } : r);
    if (test(start, true).hits) return done({ reached: false, stop: "seated", poses: 0, maxTiltDeg: 0, clearing: null, pushed: 0 });

    const pq = new Queue();
    pq.push(0, start);
    const seen = new Set<string>([key(start)]);
    let n = 0;
    let maxTilt = 0;
    while (pq.size > 0) {
      const s = pq.pop();
      n += 1;
      if (input.trace === true) path.push(s);
      maxTilt = Math.max(maxTilt, s[0] * st.tiltStep);
      const here = test(s, false).minX;
      if (here > st.clearX) {
        const clearing: InsertPose = { state: s, tiltDeg: s[0] * st.tiltStep, xMm: s[1] * st.xyStep, yMm: s[2] * st.xyStep, minXMm: here };
        return done({ reached: true, stop: "clear", poses: n, maxTiltDeg: maxTilt, clearing, pushed: pq.pushed });
      }
      for (const d of INSERT_MOVES) {
        const ns: InsertState = [s[0] + d[0], s[1] + d[1], s[2] + d[2]];
        if (!inside(ns)) continue;
        const k = key(ns);
        if (seen.has(k)) continue;
        seen.add(k);
        const r = test(ns, true);
        if (r.hits) continue;
        pq.push(-r.minX - st.tiltWeight * ns[0] * st.tiltStep, ns);
      }
      if (n > st.budget) return done({ reached: false, stop: "budget", poses: n, maxTiltDeg: maxTilt, clearing: null, pushed: pq.pushed });
    }
    return done({ reached: false, stop: "exhausted", poses: n, maxTiltDeg: maxTilt, clearing: null, pushed: pq.pushed });
  });
}
