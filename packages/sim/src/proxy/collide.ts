// Two-level sphere proxy collision, ported from sim_r4.html collide() (lines
// 519 to 591, canonical lineage row davit.collide/r4-page; davit.html lines
// 508 to 580 hold the same code, copy row davit.collide/r3-page). Coarse groups cull, fine
// points decide: a pair touches when an unmasked point of one body lies
// closer than the touch distance to an unmasked point of the other.
//
// One deliberate change from the legacy runtime: the line commented "arms
// cannot meet" is gone, so a left arm body is tested against a right arm
// body like any other pair (M02-T06 step 2). Masks are per pair, per side
// of the pair, keyed by the sorted body names and flipped when a pair is
// visited in the other order.

import { applyPoint, type Mat4 } from "../place.js";
import type { Proxy } from "./decode.js";

/** One posed body: its name (sorted-key part), proxy key, arm side and world matrix. */
export interface PosedBody {
  readonly n: string;
  readonly k: string;
  readonly side: "" | "R" | "L";
  readonly m: Mat4;
}

/** Mask pair as stored: one flag per fine point of each side, keyed `${a}|${b}` with a below b. */
export interface MaskPair { readonly a: string; readonly b: string; readonly A: Uint8Array; readonly B: Uint8Array }
export type MaskMap = ReadonlyMap<string, MaskPair>;

export interface Contact {
  readonly a: string;
  readonly b: string;
  readonly sideA: "" | "R" | "L";
  readonly sideB: "" | "R" | "L";
  /** Fine point indices into the proxies of a and b as named, and their distance, mm (computed). */
  readonly ia: number;
  readonly ib: number;
  readonly distMm: number;
  /** True when the pair has a mask entry (declared pair). */
  readonly declared: boolean;
  /** distMm is under the touch distance. A declared pair also reports its closest unmasked approach inside lookMm without a hit. */
  readonly hit: boolean;
}

/** Result of one pair at one relative pose; null when nothing came inside reach. */
export type PairCache = Map<string, Contact | null>;

export interface CollideOptions {
  /**
   * A pair's result depends only on the relative pose of its two bodies, and a
   * sweep that moves one joint repeats most relative poses. The cache is valid
   * for one proxy set, one mask map and one lookMm.
   */
  readonly cache?: PairCache;
  readonly touchMm: number;
  /** Declared pairs are scanned to this reach so the closest unmasked approach is reported, mm. */
  readonly lookMm: number;
}

const scratch = new Int32Array(1 << 16);

export const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

interface Placed { readonly lo: number[]; readonly hi: number[]; readonly gs: Float64Array; pts: Float64Array | null }

function placeGroups(body: PosedBody, px: Proxy): Placed {
  const m = body.m;
  const gs = new Float64Array(px.groups.length);
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < px.groups.length; i += 6) {
    const p = applyPoint(m, [px.groups[i]!, px.groups[i + 1]!, px.groups[i + 2]!]);
    const r = px.groups[i + 3]!;
    gs[i] = p[0]; gs[i + 1] = p[1]; gs[i + 2] = p[2]; gs[i + 3] = r; gs[i + 4] = px.groups[i + 4]!; gs[i + 5] = px.groups[i + 5]!;
    for (let a = 0; a < 3; a += 1) {
      lo[a] = Math.min(lo[a]!, p[a]! - r);
      hi[a] = Math.max(hi[a]!, p[a]! + r);
    }
  }
  return { lo, hi, gs, pts: null };
}

function worldPoints(body: PosedBody, px: Proxy): Float64Array {
  const e = body.m;
  const out = new Float64Array(px.n * 3);
  for (let i = 0; i < px.n; i += 1) {
    const x = px.pts[i * 3]!, y = px.pts[i * 3 + 1]!, z = px.pts[i * 3 + 2]!;
    out[i * 3] = e[0]! * x + e[1]! * y + e[2]! * z + e[3]!;
    out[i * 3 + 1] = e[4]! * x + e[5]! * y + e[6]! * z + e[7]!;
    out[i * 3 + 2] = e[8]! * x + e[9]! * y + e[10]! * z + e[11]!;
  }
  return out;
}

/** Visit every body pair whose coarse boxes come within reach; the callback gets the placed data. */
function eachNearPair(
  bodies: readonly PosedBody[],
  proxies: ReadonlyMap<string, Proxy>,
  reachOf: (key: string) => number,
  visit: (a: PosedBody, b: PosedBody, pa: Placed, pb: Placed, reach: number) => void,
): void {
  const placed = bodies.map((b) => placeGroups(b, proxies.get(b.k)!));
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i]!, b = bodies[j]!;
      const reach = reachOf(pairKey(a.n, b.n));
      const A = placed[i]!, B = placed[j]!;
      if (A.lo[0]! > B.hi[0]! + reach || B.lo[0]! > A.hi[0]! + reach || A.lo[1]! > B.hi[1]! + reach || B.lo[1]! > A.hi[1]! + reach || A.lo[2]! > B.hi[2]! + reach || B.lo[2]! > A.hi[2]! + reach) continue;
      visit(a, b, A, B, reach);
    }
  }
}

/** inverse(a) x b of two rigid matrices, rounded to 1e-6, as a string. */
export function relativeKey(a: Mat4, b: Mat4): string {
  const o: string[] = [];
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      let v: number;
      if (c < 3) v = a[r]! * b[c]! + a[4 + r]! * b[4 + c]! + a[8 + r]! * b[8 + c]!;
      else v = a[r]! * (b[3]! - a[3]!) + a[4 + r]! * (b[7]! - a[7]!) + a[8 + r]! * (b[11]! - a[11]!);
      o.push((Math.round(v * 1e6) / 1e6 + 0).toString());
    }
  }
  return o.join(",");
}

/** Contacts at one pose: every pair with an unmasked point pair closer than touchMm (hit), and the closest approach of declared pairs. */
export function collide(bodies: readonly PosedBody[], proxies: ReadonlyMap<string, Proxy>, masks: MaskMap, opt: CollideOptions): Contact[] {
  const out: Contact[] = [];
  const reachOf = (key: string): number => (masks.has(key) ? opt.lookMm : opt.touchMm);
  eachNearPair(bodies, proxies, reachOf, (a, b, A, B, reach) => {
    const key = pairKey(a.n, b.n);
    const rel = opt.cache === undefined ? "" : `${a.n}#${a.k}|${b.n}#${b.k}|${relativeKey(a.m, b.m)}`;
    if (opt.cache !== undefined) {
      const hit = opt.cache.get(rel);
      if (hit !== undefined) {
        if (hit !== null) out.push({ ...hit, sideA: a.side, sideB: b.side });
        return;
      }
    }
    const mk = masks.get(key);
    const flipped = !(a.n < b.n);
    const mA = mk === undefined ? undefined : flipped ? mk.B : mk.A;
    const mB = mk === undefined ? undefined : flipped ? mk.A : mk.B;
    const pxA = proxies.get(a.k)!, pxB = proxies.get(b.k)!;
    const declared = mk !== undefined;
    const touch2 = opt.touchMm * opt.touchMm;
    let best = Infinity, bi = -1, bj = -1;
    scan: for (let ga = 0; ga < A.gs.length; ga += 6) {
      for (let gb = 0; gb < B.gs.length; gb += 6) {
        const dx = A.gs[ga]! - B.gs[gb]!, dy = A.gs[ga + 1]! - B.gs[gb + 1]!, dz = A.gs[ga + 2]! - B.gs[gb + 2]!;
        const rr = A.gs[ga + 3]! + B.gs[gb + 3]! + reach;
        if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
        A.pts ??= worldPoints(a, pxA);
        B.pts ??= worldPoints(b, pxB);
        const pa = A.pts, pb = B.pts;
        // Only points within reach of the other group's sphere can touch: filter the B side once, then each A point.
        const cax = A.gs[ga]!, cay = A.gs[ga + 1]!, caz = A.gs[ga + 2]!, ra = A.gs[ga + 3]! + reach;
        const cbx = B.gs[gb]!, cby = B.gs[gb + 1]!, cbz = B.gs[gb + 2]!, rb = B.gs[gb + 3]! + reach;
        let nb = 0;
        for (let jj = B.gs[gb + 4]!; jj < B.gs[gb + 5]!; jj += 1) {
          if (mB !== undefined && mB[jj] === 1) continue;
          const ex = pb[jj * 3]! - cax, ey = pb[jj * 3 + 1]! - cay, ez = pb[jj * 3 + 2]! - caz;
          if (ex * ex + ey * ey + ez * ez <= ra * ra) scratch[nb++] = jj;
        }
        if (nb === 0) continue;
        for (let ii = A.gs[ga + 4]!; ii < A.gs[ga + 5]!; ii += 1) {
          if (mA !== undefined && mA[ii] === 1) continue;
          const x = pa[ii * 3]!, y = pa[ii * 3 + 1]!, z = pa[ii * 3 + 2]!;
          const fx = x - cbx, fy = y - cby, fz = z - cbz;
          if (fx * fx + fy * fy + fz * fz > rb * rb) continue;
          for (let k = 0; k < nb; k += 1) {
            const jj = scratch[k]!;
            const ex = x - pb[jj * 3]!, ey = y - pb[jj * 3 + 1]!, ez = z - pb[jj * 3 + 2]!;
            const d2 = ex * ex + ey * ey + ez * ez;
            if (d2 < best) {
              best = d2; bi = ii; bj = jj;
              if (d2 < touch2 && reach <= opt.touchMm) break scan;
            }
          }
        }
      }
    }
    const res: Contact | null = bi >= 0 ? { a: a.n, b: b.n, sideA: a.side, sideB: b.side, ia: bi, ib: bj, distMm: Math.sqrt(best), declared, hit: best < touch2 } : null;
    if (opt.cache !== undefined) opt.cache.set(rel, res);
    if (res !== null) out.push(res);
  });
  return out;
}

/** One near pair: flat triples ia, ib, squared distance of every point pair under the margin. */
export type NearList = readonly number[];

export interface NearOptions {
  /** Pair keys to visit. */
  readonly wanted: ReadonlySet<string>;
  readonly marginMm: number;
  /** Keyed by relative pose; valid for one proxy set and one margin. */
  readonly cache: Map<string, NearList>;
  /** Restrict to bodies of this arm side and the unsided mount. */
  readonly side?: "R" | "L";
}

/**
 * Point pairs under marginMm for the wanted pairs. A pair's list depends only
 * on the relative pose of its two bodies, so a repeat is replayed from the
 * cache without placing anything; a miss runs the sphere groups of the two
 * bodies. The callback gets the pair's list, the relative key, and the world
 * points only on a miss (fresh true). Body names must be unique within the
 * side filter, so pass a side.
 */
export function nearPairs(
  bodies: readonly PosedBody[],
  proxies: ReadonlyMap<string, Proxy>,
  o: NearOptions,
  onPair: (a: PosedBody, b: PosedBody, list: NearList, rel: string, fresh: boolean, pa: Float64Array | null, pb: Float64Array | null) => void,
): void {
  const byName = new Map<string, PosedBody>();
  for (const b of bodies) if (o.side === undefined || b.side === "" || b.side === o.side) byName.set(b.n, b);
  for (const key of o.wanted) {
    const bar = key.indexOf("|");
    const a = byName.get(key.slice(0, bar)), b = byName.get(key.slice(bar + 1));
    if (a === undefined || b === undefined) continue;
    const rel = `${a.n}#${a.k}|${b.n}#${b.k}|${relativeKey(a.m, b.m)}`;
    const cached = o.cache.get(rel);
    if (cached !== undefined) { onPair(a, b, cached, rel, false, null, null); continue; }
    const pxA = proxies.get(a.k)!, pxB = proxies.get(b.k)!;
    const pa = worldPoints(a, pxA), pb = worldPoints(b, pxB);
    const list = pointsWithin(pa, pb, o.marginMm);
    o.cache.set(rel, list);
    onPair(a, b, list, rel, true, pa, pb);
  }
}

/**
 * Flat triples (ia, ib, squared distance) of the point pairs closer than
 * marginMm. Points outside the other cloud's box are dropped first, then the
 * second cloud goes into a hash grid of marginMm cells.
 */
export function pointsWithin(pa: Float64Array, pb: Float64Array, marginMm: number): number[] {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const boxOf = (p: Float64Array, lo: number[], hi: number[]): void => {
    for (let i = 0; i < p.length; i += 3) for (let a = 0; a < 3; a += 1) { lo[a] = Math.min(lo[a]!, p[i + a]!); hi[a] = Math.max(hi[a]!, p[i + a]!); }
  };
  const loB = [Infinity, Infinity, Infinity], hiB = [-Infinity, -Infinity, -Infinity];
  boxOf(pa, lo, hi);
  boxOf(pb, loB, hiB);
  const inside = (p: Float64Array, i: number, l: number[], h: number[]): boolean =>
    p[i]! >= l[0]! - marginMm && p[i]! <= h[0]! + marginMm && p[i + 1]! >= l[1]! - marginMm && p[i + 1]! <= h[1]! + marginMm && p[i + 2]! >= l[2]! - marginMm && p[i + 2]! <= h[2]! + marginMm;
  const cell = (v: number): number => Math.floor(v / marginMm);
  const grid = new Map<string, number[]>();
  for (let j = 0; j < pb.length; j += 3) {
    if (!inside(pb, j, lo, hi)) continue;
    const k = `${cell(pb[j]!)},${cell(pb[j + 1]!)},${cell(pb[j + 2]!)}`;
    const bucket = grid.get(k);
    if (bucket === undefined) grid.set(k, [j / 3]); else bucket.push(j / 3);
  }
  const m2 = marginMm * marginMm;
  const out: number[] = [];
  if (grid.size === 0) return out;
  for (let i = 0; i < pa.length; i += 3) {
    if (!inside(pa, i, loB, hiB)) continue;
    const cx = cell(pa[i]!), cy = cell(pa[i + 1]!), cz = cell(pa[i + 2]!);
    for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
      const bucket = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
      if (bucket === undefined) continue;
      for (const j of bucket) {
        const ex = pa[i]! - pb[j * 3]!, ey = pa[i + 1]! - pb[j * 3 + 1]!, ez = pa[i + 2]! - pb[j * 3 + 2]!;
        const d2 = ex * ex + ey * ey + ez * ez;
        if (d2 < m2) out.push(i / 3, j, d2);
      }
    }
  }
  return out;
}
