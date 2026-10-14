// Point queries against closed meshes: a ray along +x from the point, the
// winding number summed over the faces it crosses (each crossing counts the
// sign of the face normal's x), so overlapping bodies read as their union.
// Triangles are bucketed by their yz bounds; the ray is nudged off the
// point by a fixed sub-grid offset so it never runs along an edge of the
// 1/1024 mm mesh grid (D-054).

import type { Vec3 } from "@hackbuild/spec";
import type { MeshData } from "@hackbuild/mesh";
import { boundsOf } from "./mesh.js";

/** Ray offsets in y and z, mm: irrational multiples well under the mesh grid step, so no grid edge is hit. */
const NUDGE_Y = 1.3e-7 * Math.SQRT2;
const NUDGE_Z = 0.9e-7 * Math.PI;

interface Tri {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly c: Vec3;
  readonly nx: number;
}

export class MeshProbe {
  private readonly tris: Tri[] = [];
  private readonly cells: number[][];
  private readonly y0: number;
  private readonly z0: number;
  private readonly cy: number;
  private readonly cz: number;
  private readonly ny: number;
  private readonly nz: number;

  constructor(meshes: readonly MeshData[]) {
    for (const m of meshes) {
      const p = m.positions;
      const t = m.triangles;
      for (let k = 0; k < t.length; k += 3) {
        const v = (i: number): Vec3 => [p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!];
        const a = v(t[k]!), b = v(t[k + 1]!), c = v(t[k + 2]!);
        const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
        if (nx !== 0) this.tris.push({ a, b, c, nx });
      }
    }
    const box = boundsOf(meshes);
    const side = Math.max(1, Math.ceil(Math.sqrt(this.tris.length / 4)));
    this.y0 = box.min[1];
    this.z0 = box.min[2];
    this.ny = side;
    this.nz = side;
    this.cy = Math.max((box.max[1] - box.min[1]) / side, 1e-9);
    this.cz = Math.max((box.max[2] - box.min[2]) / side, 1e-9);
    this.cells = Array.from({ length: side * side }, () => []);
    this.tris.forEach((tr, idx) => {
      const ys = [tr.a[1], tr.b[1], tr.c[1]], zs = [tr.a[2], tr.b[2], tr.c[2]];
      const j0 = this.cellOf(Math.min(...ys), this.y0, this.cy, this.ny), j1 = this.cellOf(Math.max(...ys), this.y0, this.cy, this.ny);
      const k0 = this.cellOf(Math.min(...zs), this.z0, this.cz, this.nz), k1 = this.cellOf(Math.max(...zs), this.z0, this.cz, this.nz);
      for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) this.cells[k * this.ny + j]!.push(idx);
    });
  }

  private cellOf(v: number, o: number, c: number, n: number): number {
    return Math.min(n - 1, Math.max(0, Math.floor((v - o) / c)));
  }

  /** Winding number of the meshes around p; nonzero is inside. */
  winding(p: Vec3): number {
    const y = p[1] + NUDGE_Y, z = p[2] + NUDGE_Z;
    const j = Math.floor((y - this.y0) / this.cy), k = Math.floor((z - this.z0) / this.cz);
    if (j < 0 || k < 0 || j >= this.ny || k >= this.nz) return 0;
    let w = 0;
    for (const idx of this.cells[k * this.ny + j]!) {
      const t = this.tris[idx]!;
      // Barycentric of (y, z) in the triangle's yz projection.
      const d = t.nx;
      const l1 = ((t.b[1] - y) * (t.c[2] - z) - (t.b[2] - z) * (t.c[1] - y)) / d;
      const l2 = ((t.c[1] - y) * (t.a[2] - z) - (t.c[2] - z) * (t.a[1] - y)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const x = l1 * t.a[0] + l2 * t.b[0] + l3 * t.c[0];
      if (x > p[0]) w += t.nx > 0 ? 1 : -1;
    }
    return w;
  }

  inside(p: Vec3): boolean {
    return this.winding(p) !== 0;
  }

  /** Distance from o along the unit vector d to the first sample inside, up to maxLen; maxLen when clear. Sampled at step mm. */
  clearAlong(o: Vec3, d: Vec3, maxLen: number, step: number): number {
    for (let s = step; s <= maxLen + 1e-12; s += step) {
      if (this.inside([o[0] + d[0] * s, o[1] + d[1] * s, o[2] + d[2] * s])) return s - step;
    }
    return maxLen;
  }

  /**
   * Where the inside test changes between a and b, mm from a along the
   * segment, found by bisection to tol; null when both ends agree.
   */
  crossing(a: Vec3, b: Vec3, tol: number): number | null {
    const ia = this.inside(a);
    if (ia === this.inside(b)) return null;
    let lo = 0, hi = 1;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    while ((hi - lo) * len > tol) {
      const mid = (lo + hi) / 2;
      const p: Vec3 = [a[0] + (b[0] - a[0]) * mid, a[1] + (b[1] - a[1]) * mid, a[2] + (b[2] - a[2]) * mid];
      if (this.inside(p) === ia) lo = mid;
      else hi = mid;
    }
    return ((lo + hi) / 2) * len;
  }
}
