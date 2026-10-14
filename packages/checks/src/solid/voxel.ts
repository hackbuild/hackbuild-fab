// Voxel occupancy for the assembly checks: meshes sliced on a 3D cell grid
// (cell centres, nonzero winding, slice.ts), straight-line removal of one
// occupancy past another, and air enclosed by a body.

import type { MeshData } from "@hackbuild/mesh";
import type { Box3 } from "./mesh.js";
import { gridOver, sliceMask, type Grid } from "./slice.js";

export interface VoxelGrid {
  readonly g: Grid;
  readonly z0: number;
  readonly nz: number;
}

/** A voxel grid over a box with pad empty cells on every side. */
export function voxelGrid(box: Box3, h: number, pad = 2): VoxelGrid {
  const g = gridOver(box, h, pad);
  const nz = Math.max(1, Math.ceil((box.max[2] - box.min[2]) / h)) + 2 * pad;
  return { g, z0: box.min[2] - pad * h, nz };
}

/** Cell (i, j, k) is at index (k * ny + j) * nx + i. */
export function occupancy(meshes: readonly MeshData[], v: VoxelGrid): Uint8Array {
  const { g } = v;
  const out = new Uint8Array(g.nx * g.ny * v.nz);
  for (let k = 0; k < v.nz; k++) out.set(sliceMask(meshes, v.z0 + (k + 0.5) * g.h, g), k * g.nx * g.ny);
  return out;
}

export const AXES = ["+x", "-x", "+y", "-y", "+z", "-z"] as const;
export type AxisDir = (typeof AXES)[number];

/**
 * The axis directions along which `move` slides to infinity without
 * entering a cell of `fixed`. Moving along +z is blocked when some column
 * holds a fixed cell above a moving cell; cells both occupy at rest
 * (an interference at the seat) do not block.
 */
export function freeDirections(move: Uint8Array, fixed: Uint8Array, v: VoxelGrid): AxisDir[] {
  const { nx, ny } = v.g;
  const nz = v.nz;
  const idx = (i: number, j: number, k: number): number => (k * ny + j) * nx + i;
  const free: AxisDir[] = [];
  const lines: Record<AxisDir, { readonly a: number; readonly b: number; readonly n: number; readonly at: (p: number, q: number, s: number) => number; readonly up: boolean }> = {
    "+x": { a: ny, b: nz, n: nx, at: (j, k, s) => idx(s, j, k), up: true },
    "-x": { a: ny, b: nz, n: nx, at: (j, k, s) => idx(s, j, k), up: false },
    "+y": { a: nx, b: nz, n: ny, at: (i, k, s) => idx(i, s, k), up: true },
    "-y": { a: nx, b: nz, n: ny, at: (i, k, s) => idx(i, s, k), up: false },
    "+z": { a: nx, b: ny, n: nz, at: (i, j, s) => idx(i, j, s), up: true },
    "-z": { a: nx, b: ny, n: nz, at: (i, j, s) => idx(i, j, s), up: false },
  };
  for (const dir of AXES) {
    const L = lines[dir];
    let blocked = false;
    for (let p = 0; p < L.a && !blocked; p++) {
      for (let q = 0; q < L.b && !blocked; q++) {
        // Walk the line in the moving direction; a fixed cell after a moving cell blocks.
        let seen = false;
        for (let t = 0; t < L.n; t++) {
          const s = L.up ? t : L.n - 1 - t;
          const c = L.at(p, q, s);
          const m = move[c] === 1, f = fixed[c] === 1;
          if (f && seen && !m) {
            blocked = true;
            break;
          }
          if (m) seen = true;
        }
      }
    }
    if (!blocked) free.push(dir);
  }
  return free;
}

export interface Cavity {
  readonly cells: number;
  readonly volumeMm3: number;
}

/** Air components (6-connected) that do not reach the grid border: sealed cavities. */
export function sealedAir(occ: Uint8Array, v: VoxelGrid): Cavity[] {
  const { nx, ny } = v.g;
  const nz = v.nz;
  const seen = new Uint8Array(occ.length);
  const out: Cavity[] = [];
  const cell3 = v.g.h ** 3;
  for (let s = 0; s < occ.length; s++) {
    if (occ[s] === 1 || seen[s] === 1) continue;
    let border = false;
    let count = 0;
    const stack = [s];
    seen[s] = 1;
    while (stack.length > 0) {
      const c = stack.pop()!;
      count += 1;
      const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
      if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) border = true;
      const nb = [i > 0 ? c - 1 : -1, i < nx - 1 ? c + 1 : -1, j > 0 ? c - nx : -1, j < ny - 1 ? c + nx : -1, k > 0 ? c - nx * ny : -1, k < nz - 1 ? c + nx * ny : -1];
      for (const n of nb) {
        if (n >= 0 && occ[n] !== 1 && seen[n] !== 1) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (!border) out.push({ cells: count, volumeMm3: count * cell3 });
  }
  return out;
}
