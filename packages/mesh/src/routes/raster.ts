// The raster route (D-053): raster in XY, exact in Z. A TypeScript port of
// the seed rastermesh.js (packages/mesh/seed/rastermesh.js, the hbf seed
// with the TOGGLE healer from part2e.js, lineage rows healer/* and
// mesh.raster/*). Every Z slab is a Uint8 label grid (0 air, 1 to 255 a
// filament slot); faces are emitted only where two labels differ, so the
// per slot meshes never overlap and sum to the solid. Caps merge into greedy
// rectangles, walls into runs, and every face is conformed to the lattice
// vertices on its edges and fanned from its centroid; without the conform
// pass the parts are hole-free and still not manifold
// (knowledge/kernels/mesh-kernel.md section 1).
//
// Vertices land on the D-054 1/1024 mm grid. Each slab bound is snapped
// once and shared by every vertex on it, so exact Z holds by construction.

import type { Mm } from "@hackbuild/spec";
import { snap, type MeshData } from "../hash.js";
import { meshError } from "./prism.js";

/** One Z slab: a W x H label grid, row major (j * W + i), between z[0] and z[1] mm. */
export interface RasterSlab {
  readonly labels: Uint8Array;
  readonly z: readonly [Mm, Mm];
}

/** A label volume: cell size px mm, cell (0, 0) with its low corner at (x0, y0) mm, slabs ascending and contiguous in z. */
export interface RasterVolume {
  readonly width: number;
  readonly height: number;
  readonly px: Mm;
  readonly x0?: Mm;
  readonly y0?: Mm;
  readonly slabs: readonly RasterSlab[];
  /**
   * "dyadic" (default) snaps every slab bound to the D-054 1/1024 mm grid.
   * "given" keeps the bounds as declared, for a legacy parity run whose
   * layer grid has no dyadic form (COLLAR at 0.2 mm, M00-T11 step 4); XY
   * still snaps.
   */
  readonly zGrid?: "dyadic" | "given";
}

/** What fixPinches did (seed rastermesh.js fixPinches, TOGGLE part2e.js). */
export interface HealReport {
  /** Cells flipped, count. */
  readonly changed: number;
  /** True when a final full scan finds every window well formed. */
  readonly converged: boolean;
  /** Cells that reached three flips and were frozen, count. */
  readonly frozen: number;
  /** Windows still ill formed after the last pass, count. */
  readonly illFormed: number;
  /** Passes run, count; at most HEAL_MAX_PASSES. */
  readonly passes: number;
}

/** Healer limits (TOGGLE part2e.js lines 33 and 51 to 53). */
export const HEAL_MAX_PASSES = 200;
export const HEAL_FREEZE_FLIPS = 3;
/** Flipped cells above this fraction of the grid warn (mesh kernel record section 1), percent. */
export const HEAL_WARN_PERCENT = 0.2;

/** Window cells face adjacent within a 2x2x2 window: bit0 i, bit1 j, bit2 k. */
const CUBE_ADJ: readonly (readonly number[])[] = [[1, 2, 4], [0, 3, 5], [0, 3, 6], [1, 2, 7], [0, 5, 6], [1, 4, 7], [2, 4, 7], [3, 5, 6]];

function components(mask: readonly boolean[]): { readonly comp: number[]; readonly n: number } {
  const comp = new Array<number>(8).fill(-1);
  let n = 0;
  for (let s = 0; s < 8; s++) {
    if (!mask[s] || comp[s]! >= 0) continue;
    const stack = [s];
    comp[s] = n;
    while (stack.length > 0) {
      const c = stack.pop()!;
      for (const d of CUBE_ADJ[c]!) {
        if (mask[d] && comp[d]! < 0) {
          comp[d] = n;
          stack.push(d);
        }
      }
    }
    n++;
  }
  return { comp, n };
}

/** The label with the most face neighbours in count; ties break as the seed's sort does (insertion order of the keys, numeric keys ascending). */
function commonest(count: Map<number, number>): number | undefined {
  const keys = [...count.keys()].sort((a, b) => a - b);
  let best: number | undefined;
  for (const k of keys) if (best === undefined || count.get(k)! > count.get(best)!) best = k;
  return best;
}

function checkVolume(v: RasterVolume): void {
  if (!(Number.isInteger(v.width) && v.width > 0 && Number.isInteger(v.height) && v.height > 0)) {
    throw meshError({ code: "E_SCHEMA", path: "/width", got: [v.width, v.height], expected: "positive integer width and height", hint: "give the raster a positive integer size in cells" });
  }
  if (!(v.px > 0)) throw meshError({ code: "E_SCHEMA", path: "/px", got: v.px, expected: "a cell size above 0 mm", hint: "set the raster resolution above 0 mm per cell" });
  if (v.slabs.length === 0) throw meshError({ code: "E_SCHEMA", path: "/slabs", got: 0, expected: "at least one slab", hint: "declare at least one layer" });
  v.slabs.forEach((s, k) => {
    if (s.labels.length !== v.width * v.height) {
      throw meshError({ code: "E_SCHEMA", path: `/slabs/${k}/labels`, got: s.labels.length, expected: `${v.width * v.height} cells`, hint: "give every slab a label grid of width x height cells" });
    }
    const z0 = snap(s.z[0]);
    const z1 = snap(s.z[1]);
    if (!(z1 > z0)) throw meshError({ code: "E_SCHEMA", path: `/slabs/${k}/z`, got: s.z, expected: "z top above z bottom on the 1/1024 mm grid", hint: "give every slab a positive height" });
    const below = v.slabs[k - 1];
    if (below !== undefined && snap(below.z[1]) !== z0) {
      throw meshError({ code: "E_SCHEMA", path: `/slabs/${k}/z/0`, got: s.z[0], expected: `the top of slab ${k - 1}, ${snap(below.z[1])} mm`, hint: "stack slabs in ascending z with no gap or overlap" });
    }
  });
}

/**
 * Pinch repair. A 2x2x2 window (air padded above, below and outside the
 * grid) is well formed for label L when the L cells and the not-L cells are
 * each face connected in the window; otherwise one cell flips. A cell that
 * has flipped three times is frozen, so two windows that disagree about it
 * cannot flip it forever. After the first pass only windows near flipped
 * cells are revisited. Labels are healed in place.
 */
export function fixPinches(v: RasterVolume): HealReport {
  const W = v.width;
  const H = v.height;
  const K = v.slabs.length;
  const flips = new Map<number, number>();
  const lab = (i: number, j: number, k: number): number =>
    k < 0 || k >= K || i < 0 || j < 0 || i >= W || j >= H ? 0 : v.slabs[k]!.labels[j * W + i]!;
  const inRange = (i: number, j: number, k: number): boolean => k >= 0 && k < K && i >= 0 && j >= 0 && i < W && j < H;
  let changed = 0;
  let passes = 0;
  let dirty: Set<number> | null = null;
  for (let pass = 0; pass < HEAL_MAX_PASSES; pass++) {
    passes = pass + 1;
    let n = 0;
    const next = new Set<number>();
    const windows: (readonly [number, number, number])[] | null = dirty === null
      ? null
      : [...dirty].map((w) => [(w % (W + 2)) - 1, (Math.floor(w / (W + 2)) % (H + 2)) - 1, Math.floor(w / ((W + 2) * (H + 2))) - 1] as const);
    const total = windows === null ? (K + 1) * (H + 1) * (W + 1) : windows.length;
    for (let w = 0; w < total; w++) {
      let i: number, j: number, k: number;
      if (windows !== null) [i, j, k] = windows[w]!;
      else {
        i = (w % (W + 1)) - 1;
        j = (Math.floor(w / (W + 1)) % (H + 1)) - 1;
        k = Math.floor(w / ((W + 1) * (H + 1))) - 1;
      }
      const cells = new Array<number>(8);
      for (let s = 0; s < 8; s++) cells[s] = lab(i + (s & 1), j + ((s >> 1) & 1), k + ((s >> 2) & 1));
      const labels = [...new Set(cells)];
      if (labels.length < 2) continue;
      const at = (s: number): readonly [number, number, number] => [i + (s & 1), j + ((s >> 1) & 1), k + ((s >> 2) & 1)];
      const flip = (s: number, to: number): boolean => {
        const [ci, cj, ck] = at(s);
        if (!inRange(ci, cj, ck)) return false;
        const key = (ck * H + cj) * W + ci;
        const nf = flips.get(key) ?? 0;
        if (nf >= HEAL_FREEZE_FLIPS) return false;
        flips.set(key, nf + 1);
        v.slabs[ck]!.labels[cj * W + ci] = to;
        for (let dk = -1; dk <= 0; dk++) for (let dj = -1; dj <= 0; dj++) for (let di = -1; di <= 0; di++) {
          next.add(((ck + dk + 1) * (H + 2) + (cj + dj + 1)) * (W + 2) + (ci + di + 1));
        }
        return true;
      };
      for (const L of labels) {
        const A = cells.map((c) => c === L);
        const B = cells.map((c) => c !== L);
        const ca = components(A);
        const cb = components(B);
        if (ca.n <= 1 && cb.n <= 1) continue;
        let done = false;
        // 1. a B cell face adjacent to two A components becomes L (bridges the pinch)
        if (ca.n > 1) {
          for (let s = 0; s < 8 && !done; s++) {
            if (A[s]) continue;
            const seen = new Set<number>();
            for (const d of CUBE_ADJ[s]!) if (A[d]) seen.add(ca.comp[d]!);
            if (seen.size >= 2) done = flip(s, L);
          }
        }
        // 2. an A cell face adjacent to two B components takes the commonest adjacent B label
        if (!done && cb.n > 1) {
          for (let s = 0; s < 8 && !done; s++) {
            if (!A[s]) continue;
            const seen = new Set<number>();
            const count = new Map<number, number>();
            for (const d of CUBE_ADJ[s]!) {
              if (B[d]) {
                seen.add(cb.comp[d]!);
                count.set(cells[d]!, (count.get(cells[d]!) ?? 0) + 1);
              }
            }
            if (seen.size >= 2) done = flip(s, commonest(count)!);
          }
        }
        // 3. vertex pinch (single cells at opposite corners): dissolve the smallest A component
        if (!done && ca.n > 1) {
          const size = new Array<number>(ca.n).fill(0);
          for (let s = 0; s < 8; s++) if (A[s]) size[ca.comp[s]!]!++;
          const order = [...size.keys()].sort((a, b) => size[a]! - size[b]!);
          for (const c of order) {
            for (let s = 0; s < 8 && !done; s++) {
              if (!A[s] || ca.comp[s] !== c) continue;
              const count = new Map<number, number>();
              for (const d of CUBE_ADJ[s]!) if (B[d]) count.set(cells[d]!, (count.get(cells[d]!) ?? 0) + 1);
              const to = commonest(count);
              if (to !== undefined) done = flip(s, to);
            }
          }
        }
        // 4. same for a B pinch: dissolve the smallest B component into L
        if (!done && cb.n > 1) {
          const size = new Array<number>(cb.n).fill(0);
          for (let s = 0; s < 8; s++) if (B[s]) size[cb.comp[s]!]!++;
          const order = [...size.keys()].sort((a, b) => size[a]! - size[b]!);
          for (const c of order) for (let s = 0; s < 8 && !done; s++) if (B[s] && cb.comp[s] === c) done = flip(s, L);
        }
        if (done) {
          n++;
          break;
        }
      }
    }
    changed += n;
    if (n === 0) break;
    dirty = next;
  }
  let frozen = 0;
  for (const f of flips.values()) if (f >= HEAL_FREEZE_FLIPS) frozen++;
  let bad = 0;
  for (let w = 0; w < (K + 1) * (H + 1) * (W + 1); w++) {
    const i = (w % (W + 1)) - 1;
    const j = (Math.floor(w / (W + 1)) % (H + 1)) - 1;
    const k = Math.floor(w / ((W + 1) * (H + 1))) - 1;
    const cells = new Array<number>(8);
    for (let s = 0; s < 8; s++) cells[s] = lab(i + (s & 1), j + ((s >> 1) & 1), k + ((s >> 2) & 1));
    for (const L of new Set(cells)) {
      if (components(cells.map((c) => c === L)).n > 1 || components(cells.map((c) => c !== L)).n > 1) {
        bad++;
        break;
      }
    }
  }
  return { changed, converged: bad === 0, frozen, illFormed: bad, passes };
}

/** Greedy rectangles over a W x H mask; each [i0, j0, i1, j1] with exclusive upper bounds. */
export function greedyRects(mask: Uint8Array, W: number, H: number): [number, number, number, number][] {
  const used = new Uint8Array(W * H);
  const out: [number, number, number, number][] = [];
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const p = j * W + i;
      if (!mask[p] || used[p]) continue;
      let i1 = i;
      while (i1 + 1 < W && mask[p + (i1 + 1 - i)] && !used[p + (i1 + 1 - i)]) i1++;
      let j1 = j;
      outer: while (j1 + 1 < H) {
        for (let x = i; x <= i1; x++) {
          const q2 = (j1 + 1) * W + x;
          if (!mask[q2] || used[q2]) break outer;
        }
        j1++;
      }
      for (let y = j; y <= j1; y++) for (let x = i; x <= i1; x++) used[y * W + x] = 1;
      out.push([i, j, i1 + 1, j1 + 1]);
    }
  }
  return out;
}

interface Face {
  readonly axis: 0 | 1 | 2;
  readonly sign: 1 | -1;
  readonly a0: number;
  readonly b0: number;
  readonly a1: number;
  readonly b1: number;
  readonly c: number;
}

type Lattice = readonly [number, number, number];

/** Corner loop in counter-clockwise order seen from outside, as lattice (i, j, k) triples. */
function corners(f: Face): Lattice[] {
  const { axis, sign, a0, b0, a1, b1, c } = f;
  const loop: Lattice[] =
    axis === 2 ? [[a0, b0, c], [a1, b0, c], [a1, b1, c], [a0, b1, c]]
      : axis === 0 ? [[c, a0, b0], [c, a1, b0], [c, a1, b1], [c, a0, b1]]
        : [[a0, c, b0], [a0, c, b1], [a1, c, b1], [a1, c, b0]];
  if (sign < 0) loop.reverse();
  return loop;
}

function triangulateFaces(faces: readonly Face[], W: number, H: number, xs: Float64Array, ys: Float64Array, zs: Float64Array, snapZ: boolean): MeshData {
  const key = (i: number, j: number, k: number): number => (k * (H + 1) + j) * (W + 1) + i;
  const vmap = new Map<number, number>();
  const pos: number[] = [];
  const vid = (i: number, j: number, k: number): number => {
    const kk = key(i, j, k);
    let id = vmap.get(kk);
    if (id === undefined) {
      id = pos.length / 3;
      vmap.set(kk, id);
      pos.push(xs[i]!, ys[j]!, zs[k]!);
    }
    return id;
  };
  const loops = faces.map(corners);
  for (const lp of loops) for (const c of lp) vid(c[0], c[1], c[2]);
  const idx: number[] = [];
  for (const lp of loops) {
    // conform: walk each edge and insert the lattice vertices that exist in this mesh
    const ring: number[] = [];
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let k0 = Infinity;
    let k1 = -Infinity;
    for (let e = 0; e < 4; e++) {
      const A = lp[e]!;
      const B = lp[(e + 1) % 4]!;
      ring.push(vid(A[0], A[1], A[2]));
      const d = [Math.sign(B[0] - A[0]), Math.sign(B[1] - A[1]), Math.sign(B[2] - A[2])] as const;
      const n = Math.abs(B[0] - A[0]) + Math.abs(B[1] - A[1]) + Math.abs(B[2] - A[2]);
      for (let t = 1; t < n; t++) {
        const id = vmap.get(key(A[0] + d[0] * t, A[1] + d[1] * t, A[2] + d[2] * t));
        if (id !== undefined) ring.push(id);
      }
      cx += xs[A[0]]!;
      cy += ys[A[1]]!;
      cz += zs[A[2]]!;
      k0 = Math.min(k0, A[2]);
      k1 = Math.max(k1, A[2]);
    }
    const c = pos.length / 3;
    // Unsnapped, the centre z is the mean of the two bounds, so a cap fan stays exactly in its plane.
    pos.push(snap(cx / 4), snap(cy / 4), snapZ ? snap(cz / 4) : (zs[k0]! + zs[k1]!) / 2);
    for (let t = 0; t < ring.length; t++) idx.push(c, ring[t]!, ring[(t + 1) % ring.length]!);
  }
  return { positions: Float64Array.from(pos), triangles: Uint32Array.from(idx) };
}

/** Slots present in the volume, ascending. */
export function slotsUsed(v: RasterVolume): number[] {
  const s = new Set<number>();
  for (const sl of v.slabs) for (const l of sl.labels) if (l !== 0) s.add(l);
  return [...s].sort((a, b) => a - b);
}

/** Mesh every slot of a healed volume; one closed MeshData per slot, keyed by slot. */
export function meshSlots(v: RasterVolume): Map<number, MeshData> {
  checkVolume(v);
  const W = v.width;
  const H = v.height;
  const K = v.slabs.length;
  const x0 = v.x0 ?? 0;
  const y0 = v.y0 ?? 0;
  // lattice coordinates, each snapped once so every vertex on a lattice line shares one value
  const xs = Float64Array.from({ length: W + 1 }, (_, i) => snap(x0 + i * v.px));
  const ys = Float64Array.from({ length: H + 1 }, (_, j) => snap(y0 + j * v.px));
  const snapZ = (v.zGrid ?? "dyadic") === "dyadic";
  const zOf = (z: number): number => (snapZ ? snap(z) : z);
  const zs = Float64Array.from({ length: K + 1 }, (_, k) => zOf(k < K ? v.slabs[k]!.z[0] : v.slabs[K - 1]!.z[1]));
  const lab = (i: number, j: number, k: number): number =>
    k < 0 || k >= K || i < 0 || j < 0 || i >= W || j >= H ? 0 : v.slabs[k]!.labels[j * W + i]!;
  const out = new Map<number, MeshData>();
  const mask = new Uint8Array(W * H);
  for (const S of slotsUsed(v)) {
    const faces: Face[] = [];
    for (let k = 0; k < K; k++) {
      const L = v.slabs[k]!.labels;
      for (const sign of [1, -1] as const) {
        mask.fill(0);
        let any = false;
        for (let j = 0; j < H; j++) {
          for (let i = 0; i < W; i++) {
            const p = j * W + i;
            if (L[p] === S && lab(i, j, k + sign) !== S) {
              mask[p] = 1;
              any = true;
            }
          }
        }
        if (!any) continue;
        for (const r of greedyRects(mask, W, H)) faces.push({ axis: 2, sign, a0: r[0], b0: r[1], a1: r[2], b1: r[3], c: sign > 0 ? k + 1 : k });
      }
      // x walls: runs along j at fixed i
      for (const sign of [1, -1] as const) {
        for (let i = 0; i < W; i++) {
          let j = 0;
          while (j < H) {
            if (L[j * W + i] === S && lab(i + sign, j, k) !== S) {
              let j1 = j;
              while (j1 + 1 < H && L[(j1 + 1) * W + i] === S && lab(i + sign, j1 + 1, k) !== S) j1++;
              faces.push({ axis: 0, sign, a0: j, b0: k, a1: j1 + 1, b1: k + 1, c: sign > 0 ? i + 1 : i });
              j = j1 + 1;
            } else j++;
          }
        }
      }
      // y walls: runs along i at fixed j
      for (const sign of [1, -1] as const) {
        for (let j = 0; j < H; j++) {
          let i = 0;
          while (i < W) {
            if (L[j * W + i] === S && lab(i, j + sign, k) !== S) {
              let i1 = i;
              while (i1 + 1 < W && L[j * W + i1 + 1] === S && lab(i1 + 1, j + sign, k) !== S) i1++;
              faces.push({ axis: 1, sign, a0: i, b0: k, a1: i1 + 1, b1: k + 1, c: sign > 0 ? j + 1 : j });
              i = i1 + 1;
            } else i++;
          }
        }
      }
    }
    out.set(S, triangulateFaces(faces, W, H, xs, ys, zs, snapZ));
  }
  return out;
}

/** Healer outcome against the D-053 raster guarantee: warnings in a build, a refusal in a sweep. */
export interface RasterResult {
  readonly meshes: Map<number, MeshData>;
  readonly heal: HealReport;
  /** Flipped cells over all cells, percent (computed). */
  readonly flippedPercent: number;
  readonly warnings: readonly { readonly code: string; readonly text: string }[];
}

/**
 * The raster route: heal pinches, then mesh each slot. mode "sweep" turns
 * a healer that did not converge into E_KERNEL; mode "build" keeps it as a
 * warning (mesh kernel record section 1, M00-T05 step 2).
 */
export function raster(v: RasterVolume, mode: "build" | "sweep" = "build"): RasterResult {
  checkVolume(v);
  const heal = fixPinches(v);
  const cells = v.width * v.height * v.slabs.length;
  const flippedPercent = (100 * heal.changed) / cells;
  const warnings: { code: string; text: string }[] = [];
  if (!heal.converged) {
    const text = `pinch healer stopped with ${heal.illFormed} ill-formed windows after ${heal.passes} passes, ${heal.frozen} cells frozen (computed)`;
    if (mode === "sweep") {
      throw meshError({ code: "E_KERNEL", got: heal.illFormed, expected: "0 ill-formed windows", hint: "the label volume has a pinch the healer cannot settle; change the art or the grid", record: "mesh-kernel" });
    }
    warnings.push({ code: "HEAL_NOT_CONVERGED", text });
  }
  if (flippedPercent > HEAL_WARN_PERCENT) {
    warnings.push({ code: "HEAL_FLIPS", text: `pinch healer flipped ${heal.changed} cells, ${flippedPercent.toFixed(3)} percent of the grid, above ${HEAL_WARN_PERCENT} percent (computed)` });
  }
  return { meshes: meshSlots(v), heal, flippedPercent, warnings };
}
