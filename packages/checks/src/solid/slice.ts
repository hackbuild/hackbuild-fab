// Mesh slicing on a cell grid: the cross section of closed meshes at a
// plane z, sampled at cell centres with the nonzero winding rule, so bodies
// that overlap read as their union (islands.py unions an object's parts
// before it slices, PIP test/islands.py). Each triangle cut by the plane
// gives one segment, oriented with the solid on its left from the
// triangle's outward normal; a scanline sums the crossings left of a cell
// centre.

import type { MeshData } from "@hackbuild/mesh";
import type { Box3 } from "./mesh.js";

/** A cell grid in the xy plane: cell (i, j) has its centre at x0 + (i + 0.5) h, y0 + (j + 0.5) h, mm. */
export interface Grid {
  readonly x0: number;
  readonly y0: number;
  /** Cell size, mm. */
  readonly h: number;
  readonly nx: number;
  readonly ny: number;
}

/** A grid over a box with `pad` empty cells each side, so every region has an air border. */
export function gridOver(box: Pick<Box3, "min" | "max">, h: number, pad = 2): Grid {
  const nx = Math.max(1, Math.ceil((box.max[0] - box.min[0]) / h)) + 2 * pad;
  const ny = Math.max(1, Math.ceil((box.max[1] - box.min[1]) / h)) + 2 * pad;
  return { x0: box.min[0] - pad * h, y0: box.min[1] - pad * h, h, nx, ny };
}

export const cellX = (g: Grid, i: number): number => g.x0 + (i + 0.5) * g.h;
export const cellY = (g: Grid, j: number): number => g.y0 + (j + 0.5) * g.h;

/** Cells whose centre lies inside the union of the meshes at height z: 1 inside, 0 outside; row j holds cells j * nx to j * nx + nx - 1. */
export function sliceMask(meshes: readonly MeshData[], z: number, g: Grid): Uint8Array {
  const rows: number[][] = Array.from({ length: g.ny }, () => []);
  for (const m of meshes) {
    const p = m.positions;
    const t = m.triangles;
    for (let k = 0; k < t.length; k += 3) {
      const ia = t[k]! * 3, ib = t[k + 1]! * 3, ic = t[k + 2]! * 3;
      const za = p[ia + 2]!, zb = p[ib + 2]!, zc = p[ic + 2]!;
      const aa = za >= z, ab = zb >= z, ac = zc >= z;
      if (aa === ab && ab === ac) continue;
      const pts: number[] = [];
      const cut = (u: number, v: number, zu: number, zv: number): void => {
        const s = (z - zu) / (zv - zu);
        pts.push(p[u]! + s * (p[v]! - p[u]!), p[u + 1]! + s * (p[v + 1]! - p[u + 1]!));
      };
      if (aa !== ab) cut(ia, ib, za, zb);
      if (ab !== ac) cut(ib, ic, zb, zc);
      if (ac !== aa) cut(ic, ia, zc, za);
      if (pts.length !== 4) continue;
      // Outward normal xy, so the segment runs with the solid on its left: d = z x n.
      const ux = p[ib]! - p[ia]!, uy = p[ib + 1]! - p[ia + 1]!, uz = p[ib + 2]! - p[ia + 2]!;
      const vx = p[ic]! - p[ia]!, vy = p[ic + 1]! - p[ia + 1]!, vz = p[ic + 2]! - p[ia + 2]!;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz;
      let x1 = pts[0]!, y1 = pts[1]!, x2 = pts[2]!, y2 = pts[3]!;
      if ((x2 - x1) * -ny + (y2 - y1) * nx < 0) [x1, y1, x2, y2] = [x2, y2, x1, y1];
      if (y1 === y2) continue;
      const up = y2 > y1;
      const ylo = up ? y1 : y2, yhi = up ? y2 : y1;
      const j0 = Math.max(0, Math.ceil((ylo - g.y0) / g.h - 0.5));
      const j1 = Math.min(g.ny - 1, Math.ceil((yhi - g.y0) / g.h - 0.5) - 1);
      // A downward segment opens the inside to its right, an upward one closes it.
      const w = up ? -1 : 1;
      for (let j = j0; j <= j1; j++) {
        const y = cellY(g, j);
        rows[j]!.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1), w);
      }
    }
  }
  const out = new Uint8Array(g.nx * g.ny);
  for (let j = 0; j < g.ny; j++) {
    const r = rows[j]!;
    if (r.length === 0) continue;
    const idx = Array.from({ length: r.length / 2 }, (_, i) => i).sort((a, b) => r[a * 2]! - r[b * 2]!);
    let wind = 0;
    for (let q = 0; q < idx.length; q++) {
      wind += r[idx[q]! * 2 + 1]!;
      if (wind === 0 || q + 1 >= idx.length) continue;
      const xa = r[idx[q]! * 2]!, xb = r[idx[q + 1]! * 2]!;
      const i0 = Math.max(0, Math.ceil((xa - g.x0) / g.h - 0.5));
      const i1 = Math.min(g.nx - 1, Math.ceil((xb - g.x0) / g.h - 0.5) - 1);
      for (let i = i0; i <= i1; i++) out[j * g.nx + i] = 1;
    }
  }
  return out;
}

/** Occupancy of the meshes on a voxel grid: layer k is the slice at z0 + (k + 0.5) h. */
export interface Voxels {
  readonly g: Grid;
  readonly z0: number;
  readonly nz: number;
  readonly layers: readonly Uint8Array[];
}

export function voxelize(meshes: readonly MeshData[], g: Grid, z0: number, nz: number): Voxels {
  const layers = Array.from({ length: nz }, (_, k) => sliceMask(meshes, z0 + (k + 0.5) * g.h, g));
  return { g, z0, nz, layers };
}

export function at(v: Voxels, i: number, j: number, k: number): number {
  if (i < 0 || j < 0 || k < 0 || i >= v.g.nx || j >= v.g.ny || k >= v.nz) return 0;
  return v.layers[k]![j * v.g.nx + i]!;
}
