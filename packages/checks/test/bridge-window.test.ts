// The windowed raster and the allocation free longestBridge against the
// whole-grid raster and the original longestBridge (copied below as
// legacyBridge), on random masks and on meshes with slanted walls whose
// cut edges fall off the cell lattice.

import { describe, expect, test } from "vitest";
import type { Ring } from "@hackbuild/spec";
import type { MeshData } from "@hackbuild/mesh";
import { longestBridge } from "../src/solid/layers";
import { fillRings, fillRingsIn } from "../src/solid/plan";
import { gridOver, sliceMask, sliceMaskIn, windowAround, windowH, windowW, cellX, cellY, type Grid } from "../src/solid/slice";

interface LegacyBridge { readonly spanMm: number; readonly at: readonly [number, number]; }
const LEGACY_DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]] as const;

/**
 * The longest bridge of a layer: for every unsupported cell (in cur, not in
 * prev) the shortest run through it, along x, y and both diagonals, of
 * unsupported cells whose two ends both abut a supported cell (in cur and
 * in prev); the bridge is the longest of those per-cell spans. A cell with
 * no run anchored at both ends overhangs and is no bridge. A 15.4 x 109 slot
 * reads 15.4 and a 17 mm comb rail between posts reads 17 (SLATE).
 */
function legacyBridge(cur: Uint8Array, prev: Uint8Array, g: Grid): LegacyBridge | null {
  const n = g.nx * g.ny;
  const best = new Float64Array(n).fill(Infinity);
  const state = (i: number, j: number): 0 | 1 | 2 => {
    if (i < 0 || j < 0 || i >= g.nx || j >= g.ny) return 0;
    const c = j * g.nx + i;
    if (cur[c] !== 1) return 0;
    return prev[c] === 1 ? 2 : 1;
  };
  for (const [dx, dy] of LEGACY_DIRS) {
    const step = g.h * Math.hypot(dx, dy);
    for (let j0 = 0; j0 < g.ny; j0++) {
      for (let i0 = 0; i0 < g.nx; i0++) {
        // Walk only from the first cell of each line.
        const pi = i0 - dx, pj = j0 - dy;
        if (pi >= 0 && pj >= 0 && pi < g.nx && pj < g.ny) continue;
        let i = i0, j = j0;
        let runStart = -1;
        let before: 0 | 1 | 2 = 0;
        const run: number[] = [];
        let last: 0 | 1 | 2 = 0;
        while (i >= 0 && j >= 0 && i < g.nx && j < g.ny) {
          const s = state(i, j);
          if (s === 1) {
            if (runStart < 0) {
              runStart = 1;
              before = last;
              run.length = 0;
            }
            run.push(j * g.nx + i);
          } else if (runStart > 0) {
            if (before === 2 && s === 2) {
              const span = run.length * step;
              for (const c of run) if (span < best[c]!) best[c] = span;
            }
            runStart = -1;
          }
          last = s;
          i += dx;
          j += dy;
        }
      }
    }
  }
  let worst = -1;
  let at = 0;
  for (let c = 0; c < n; c++) {
    const b = best[c]!;
    if (Number.isFinite(b) && b > worst) {
      worst = b;
      at = c;
    }
  }
  if (worst < 0) return null;
  const i = at % g.nx;
  return { spanMm: worst, at: [cellX(g, i), cellY(g, (at - i) / g.nx)] };
}


function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A frustum prism: bottom ring a, top ring b scaled and shifted, so walls slant. */
function frustum(n: number, r0: number, r1: number, z0: number, z1: number, cx: number, cy: number, tilt: number): MeshData {
  const pos: number[] = [];
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n;
    pos.push(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), z0);
  }
  for (let k = 0; k < n; k++) {
    const a = (2 * Math.PI * k) / n;
    pos.push(cx + tilt + r1 * Math.cos(a), cy + r1 * Math.sin(a), z1);
  }
  pos.push(cx, cy, z0, cx + tilt, cy, z1);
  const tri: number[] = [];
  for (let k = 0; k < n; k++) {
    const k1 = (k + 1) % n;
    tri.push(k, k1, n + k1, k, n + k1, n + k);
    tri.push(2 * n, k1, k);
    tri.push(2 * n + 1, n + k, n + k1);
  }
  return { positions: new Float64Array(pos), triangles: new Uint32Array(tri) };
}

describe("longestBridge keeps the original result", () => {
  test("random masks, all four directions, ties and anchors", () => {
    const rand = rng(7);
    for (let t = 0; t < 120; t++) {
      const nx = 3 + Math.floor(rand() * 40), ny = 3 + Math.floor(rand() * 40);
      const g: Grid = { x0: 1.25, y0: -3.5, h: 0.05, nx, ny };
      const dens = rand();
      const cur = new Uint8Array(nx * ny), prev = new Uint8Array(nx * ny);
      for (let c = 0; c < cur.length; c++) {
        cur[c] = rand() < 0.4 + 0.6 * dens ? 1 : 0;
        prev[c] = rand() < dens ? 1 : 0;
      }
      expect(longestBridge(cur, prev, g)).toEqual(legacyBridge(cur, prev, g));
    }
  });
});

describe("windowed raster equals the whole grid", () => {
  const rings: Ring[] = [
    [[-1.3, -0.9], [2.1, -1.1], [2.4, 1.7], [-0.8, 2.2]],
    Array.from({ length: 24 }, (_, k) => [0.4 + 1.5 * Math.cos((k * Math.PI) / 12), 0.2 + 1.1 * Math.sin((k * Math.PI) / 12)] as const),
  ];
  const meshes = [frustum(17, 3.1, 2.7, 0, 1.4, 0.1, 0.3, 0.2), frustum(9, 1.2, 0.9, 0.5, 2.5, 1.9, -0.7, 0.35)];
  const box = { min: [-3.1, -3.1, 0] as const, max: [5, 3.4, 2.5] as const };
  const g = gridOver(box, 0.05);

  test("slice and fill cells match inside random windows, with the walls off the lattice", () => {
    const rand = rng(11);
    const z = 1.0;
    const full = sliceMask(meshes, z, g);
    for (const ring of rings) {
      const whole = fillRings([ring], g);
      for (let t = 0; t < 12; t++) {
        const xa = box.min[0] + rand() * 6, ya = box.min[1] + rand() * 5;
        const win = windowAround(g, xa, xa + rand() * 3, ya, ya + rand() * 3, Math.floor(rand() * 4));
        const s = sliceMaskIn(meshes, z, g, win), f = fillRingsIn([ring], g, win);
        for (let j = win.j0; j <= win.j1; j++) {
          for (let i = win.i0; i <= win.i1; i++) {
            const w = (j - win.j0) * windowW(win) + (i - win.i0);
            expect(s[w]).toBe(full[j * g.nx + i]);
            expect(f[w]).toBe(whole[j * g.nx + i]);
          }
        }
        expect(s.length).toBe(windowW(win) * windowH(win));
      }
    }
  });

  test("the bridge over a ring window equals the whole-grid bridge", () => {
    for (const ring of rings) {
      const xs = ring.map((q) => q[0]), ys = ring.map((q) => q[1]);
      const win = windowAround(g, Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), 2);
      const wg: Grid = { x0: g.x0 + win.i0 * g.h, y0: g.y0 + win.j0 * g.h, h: g.h, nx: windowW(win), ny: windowH(win) };
      for (const z of [0.3, 0.9, 1.3, 2.0]) {
        const cur = sliceMask(meshes, z + 0.1, g), prev = sliceMask(meshes, z - 0.1, g);
        const inside = fillRings([ring], g);
        for (let c = 0; c < prev.length; c++) if (inside[c] !== 1) prev[c] = 1;
        const want = legacyBridge(cur, prev, g);
        const cw = sliceMaskIn(meshes, z + 0.1, g, win), pw = sliceMaskIn(meshes, z - 0.1, g, win);
        const iw = fillRingsIn([ring], g, win);
        for (let c = 0; c < pw.length; c++) if (iw[c] !== 1) pw[c] = 1;
        const got = longestBridge(cw, pw, wg);
        expect(got === null).toBe(want === null);
        if (got !== null && want !== null) {
          expect(got.spanMm).toBe(want.spanMm);
          expect(cellX(wg, 0)).toBeCloseTo(cellX(g, win.i0), 9);
          expect(cellY(wg, 0)).toBeCloseTo(cellY(g, win.j0), 9);
        }
      }
    }
  });

  test("a ring wholly outside the grid gives an empty window and no bridge", () => {
    const win = windowAround(g, 100, 101, 100, 101, 2);
    expect(windowW(win)).toBe(0);
    expect(sliceMaskIn(meshes, 1, g, win).length).toBe(0);
    expect(fillRingsIn([rings[0]!], g, win).length).toBe(0);
    expect(longestBridge(new Uint8Array(0), new Uint8Array(0), { x0: 0, y0: 0, h: 0.05, nx: 0, ny: 0 })).toBeNull();
  });
});
