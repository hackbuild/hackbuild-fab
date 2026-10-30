// Circuit layers: seeded random traces on a grid, with pads at their ends
// and drills through the pads (bail.html:1297 to 1347 circuitOf, 1463 to
// 1466 paintLayer circuit branch, lineage bail.bench/inlay-circuit). The
// generator is BAIL's, line for line: a mulberry32 stream seeded with
// seed * 9973 + 17 draws start nodes, turns and lengths, so one seed gives
// one board on every machine (the stream is integer arithmetic; the nodes
// are products of the pitch).
//
// Three parts paint in order, later over earlier (bail.html:1291): traces
// into slot, pads into slot2, drills into the body, which is the host cell,
// label 0 of an inlay face (FaceContext.palette.body, 0 in artFaces).

import type { LayerResult, RasterGrid } from "../surface.js";
import { frameOf, newMask, strokeRound, strokeCapsule, toModel, type Pt } from "./raster.js";

export interface CircuitLayer {
  kind: "circuit";
  /** whole number, 1 to 999 in BAIL's control */
  seed: number;
  /** mm, board extent across */
  w: number;
  /** mm, board extent up */
  h: number;
  /** mm, node pitch, at least 1 */
  pitch: number;
  /** mm, trace width */
  tw: number;
  /** mm, pad diameter */
  pad: number;
  /** mm, drill diameter; 0 drills nothing */
  drill: number;
  /** traces wanted per node, 1 is 11 percent of the nodes */
  density: number;
  /** nodes kept: inside the ellipse of the board or its whole rectangle */
  clip: "ellipse" | "rect";
  /** mm */
  dx: number;
  /** mm */
  dy: number;
  /** degrees counter-clockwise */
  rot: number;
  /** traces */
  slot: number;
  /** pads */
  slot2: number;
  cut?: boolean;
  off?: boolean;
}

/** BAIL's mulberry32 (bail.html:1297). */
export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CircuitGeometry {
  /** Polylines in layer-local mm. */
  readonly traces: readonly (readonly Pt[])[];
  /** Pad centres in layer-local mm: the first and last node of each trace. */
  readonly pads: readonly Pt[];
}

const D8: readonly (readonly [number, number])[] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/** The traces and pads of a circuit layer (bail.html:1299 to 1347). */
export function circuitGeometry(L: Pick<CircuitLayer, "seed" | "w" | "h" | "pitch" | "pad" | "density" | "clip">): CircuitGeometry {
  const rnd = mulberry(L.seed * 9973 + 17), p = Math.max(1, L.pitch);
  const nx = Math.floor((L.w / 2 - L.pad / 2) / p), ny = Math.floor((L.h / 2 - L.pad / 2) / p);
  const inside = (i: number, j: number): boolean => {
    if (Math.abs(i) > nx || Math.abs(j) > ny) return false;
    if (L.clip !== "ellipse") return true;
    const x = (i * p) / (L.w / 2 - L.pad / 2 + 1e-6), y = (j * p) / (L.h / 2 - L.pad / 2 + 1e-6);
    return x * x + y * y <= 1;
  };
  const occ = new Set<string>(), diag = new Set<string>();
  const K = (i: number, j: number): string => i + "," + j;
  let count = 0;
  for (let i = -nx; i <= nx; i++) for (let j = -ny; j <= ny; j++) if (inside(i, j)) count++;
  const want = Math.round(count * 0.11 * L.density);
  const traces: Pt[][] = [], pads: Pt[] = [];
  for (let tries = 0; tries < want * 6 && traces.length < want; tries++) {
    const i0 = Math.round((rnd() * 2 - 1) * nx), j0 = Math.round((rnd() * 2 - 1) * ny);
    if (!inside(i0, j0) || occ.has(K(i0, j0))) continue;
    let d = Math.floor(rnd() * 4) * 2; // start on an axis direction
    const path: [number, number][] = [[i0, j0]];
    const local = new Set<string>([K(i0, j0)]);
    const target = 3 + Math.floor(rnd() * 9);
    let ci = i0, cj = j0;
    for (let step = 0; step < target; step++) {
      if (rnd() < 0.3) d = (d + (rnd() < 0.5 ? 1 : 7)) % 8;
      let moved = false;
      for (const dd of [0, 1, 7]) {
        const dir = (d + dd) % 8, [di, dj] = D8[dir]!, ni = ci + di, nj = cj + dj;
        if (!inside(ni, nj) || occ.has(K(ni, nj)) || local.has(K(ni, nj))) continue;
        const dk = 2 * ci + di + "," + (2 * cj + dj);
        if (di && dj && diag.has(dk)) continue;
        if (di && dj) diag.add(dk);
        ci = ni; cj = nj; d = dir; path.push([ci, cj]); local.add(K(ci, cj)); moved = true;
        break;
      }
      if (!moved) break;
    }
    if (path.length < 3) continue;
    for (const k of local) occ.add(k);
    // A one node halo round both ends keeps pads from touching a neighbour.
    for (const [i, j] of [path[0]!, path[path.length - 1]!]) for (const [di, dj] of D8) occ.add(K(i + di, j + dj));
    traces.push(path.map(([i, j]): Pt => [i * p, j * p]));
    pads.push([path[0]![0] * p, path[0]![1] * p]);
    pads.push([path[path.length - 1]![0] * p, path[path.length - 1]![1] * p]);
  }
  return { traces, pads };
}

const cache = new Map<string, CircuitGeometry>();

/** circuitGeometry, kept for the three parts of one face; at most 40 boards (bail.html:1344). */
export function circuitOf(L: Parameters<typeof circuitGeometry>[0]): CircuitGeometry {
  const sig = [L.seed, L.w, L.h, L.pitch, L.pad, L.density, L.clip].join("|");
  const hit = cache.get(sig);
  if (hit !== undefined) return hit;
  const g = circuitGeometry(L);
  cache.set(sig, g);
  if (cache.size > 40) cache.delete(cache.keys().next().value!);
  return g;
}

/** Part 0 traces, part 1 pad discs, part 2 drill discs, as cells. */
export function circuitMask(L: CircuitLayer, grid: RasterGrid, part: 0 | 1 | 2): Uint8Array {
  const f = frameOf(L);
  const mask = newMask(grid);
  const C = circuitOf(L);
  if (part === 0) {
    for (const tr of C.traces) strokeRound(mask, grid, tr.map((q) => toModel(f, q)), L.tw);
  } else {
    const r = part === 1 ? L.pad / 2 : L.drill / 2;
    if (r > 0) for (const c of C.pads) { const m = toModel(f, c); strokeCapsule(mask, grid, m, m, r); }
  }
  return mask;
}

/** The three parts in paint order; `body` is the label drills paint (0, the host, in artFaces). */
export function renderCircuit(L: CircuitLayer, grid: RasterGrid, body = 0): LayerResult[] {
  return [
    { mask: circuitMask(L, grid, 0), slot: L.slot },
    { mask: circuitMask(L, grid, 1), slot: L.slot2 },
    { mask: circuitMask(L, grid, 2), slot: body },
  ];
}
