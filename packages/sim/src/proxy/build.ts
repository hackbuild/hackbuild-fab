// Stage B proxy generation: fine points sampled from an indexed mesh and
// coarse sphere groups over cells of those points, in the layout davit.html
// reads (pack_sim.py prox_record is the shape reference, not ported, D-180).
// Sampling is deterministic: a lattice per triangle at the given spacing,
// duplicates removed on a 1/64 mm grid, then points sorted by cell.

import type { Proxy } from "./decode.js";

/** An indexed triangle mesh in mm, counter-clockwise outward (structurally the mesh package MeshData). */
export interface MeshLike {
  readonly positions: Float64Array;
  readonly triangles: Uint32Array;
}

/** Fine points on the surface, lattice spacing about spacingMm along each triangle edge direction. */
export function samplePoints(mesh: MeshLike, spacingMm: number): Float64Array {
  const P = mesh.positions, T = mesh.triangles;
  const seen = new Set<string>();
  const out: number[] = [];
  const add = (x: number, y: number, z: number): void => {
    const k = `${Math.round(x * 64)},${Math.round(y * 64)},${Math.round(z * 64)}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(x, y, z);
  };
  for (let t = 0; t < T.length; t += 3) {
    const v = [0, 1, 2].map((i) => [P[T[t + i]! * 3]!, P[T[t + i]! * 3 + 1]!, P[T[t + i]! * 3 + 2]!]);
    const len = (a: number[], b: number[]): number => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
    // The corner opposite the longest edge keeps both lattice directions short.
    const l = [len(v[1]!, v[2]!), len(v[0]!, v[2]!), len(v[0]!, v[1]!)];
    const apex = l.indexOf(Math.max(...l));
    const o = v[apex]!, e1 = v[(apex + 1) % 3]!, e2 = v[(apex + 2) % 3]!;
    const n1 = Math.max(1, Math.ceil(len(o, e1) / spacingMm)), n2 = Math.max(1, Math.ceil(len(o, e2) / spacingMm));
    for (let i = 0; i <= n1; i += 1) {
      for (let j = 0; j <= n2; j += 1) {
        const u = i / n1, w = j / n2;
        if (u + w > 1 + 1e-12) continue;
        add(o[0]! + u * (e1[0]! - o[0]!) + w * (e2[0]! - o[0]!), o[1]! + u * (e1[1]! - o[1]!) + w * (e2[1]! - o[1]!), o[2]! + u * (e1[2]! - o[2]!) + w * (e2[2]! - o[2]!));
      }
    }
  }
  return Float64Array.from(out);
}

/** Sort points by cell and wrap each cell as a group [cx, cy, cz, r, start, end]. */
export function buildProxy(points: Float64Array, cellMm: number): Proxy {
  const n = points.length / 3;
  const cell = (i: number, a: number): number => Math.floor(points[i * 3 + a]! / cellMm);
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => cell(i, 0) - cell(j, 0) || cell(i, 1) - cell(j, 1) || cell(i, 2) - cell(j, 2) || i - j);
  const pts = new Float32Array(n * 3);
  order.forEach((src, k) => { for (let a = 0; a < 3; a += 1) pts[k * 3 + a] = points[src * 3 + a]!; });
  const groups: number[] = [];
  let i0 = 0;
  for (let i = 1; i <= n; i += 1) {
    const same = i < n && [0, 1, 2].every((a) => cell(order[i]!, a) === cell(order[i0]!, a));
    if (same) continue;
    const c = [0, 0, 0];
    for (let k = i0; k < i; k += 1) for (let a = 0; a < 3; a += 1) c[a]! += pts[k * 3 + a]! / (i - i0);
    let r = 0;
    for (let k = i0; k < i; k += 1) r = Math.max(r, Math.hypot(pts[k * 3]! - c[0]!, pts[k * 3 + 1]! - c[1]!, pts[k * 3 + 2]! - c[2]!));
    groups.push(c[0]!, c[1]!, c[2]!, r + 0.01, i0, i);
    i0 = i;
  }
  return { n, pts, groups: Float64Array.from(groups) };
}

/** Inside test of a closed mesh by +x ray parity over a yz grid; a point is solid when it and its six neighbours at erodeMm are inside. */
export type Solid = (x: number, y: number, z: number) => boolean;

const JITTER_Y = 1.7320508e-5, JITTER_Z = 2.2360679e-5;

export function solidOf(mesh: MeshLike, erodeMm: number): Solid {
  const P = mesh.positions, T = mesh.triangles;
  let ylo = Infinity, yhi = -Infinity, zlo = Infinity, zhi = -Infinity;
  for (let i = 0; i < P.length; i += 3) {
    ylo = Math.min(ylo, P[i + 1]!); yhi = Math.max(yhi, P[i + 1]!);
    zlo = Math.min(zlo, P[i + 2]!); zhi = Math.max(zhi, P[i + 2]!);
  }
  const cs = 2;
  const ny = Math.max(1, Math.ceil((yhi - ylo) / cs)), nz = Math.max(1, Math.ceil((zhi - zlo) / cs));
  const cells: number[][] = Array.from({ length: ny * nz }, () => []);
  for (let t = 0; t < T.length; t += 3) {
    const ys = [0, 1, 2].map((i) => P[T[t + i]! * 3 + 1]!), zs = [0, 1, 2].map((i) => P[T[t + i]! * 3 + 2]!);
    const y0 = Math.max(0, Math.floor((Math.min(...ys) - ylo) / cs)), y1 = Math.min(ny - 1, Math.floor((Math.max(...ys) - ylo) / cs));
    const z0 = Math.max(0, Math.floor((Math.min(...zs) - zlo) / cs)), z1 = Math.min(nz - 1, Math.floor((Math.max(...zs) - zlo) / cs));
    for (let yy = y0; yy <= y1; yy += 1) for (let zz = z0; zz <= z1; zz += 1) cells[yy * nz + zz]!.push(t);
  }
  const parity = (x: number, y0: number, z0: number): boolean => {
    const y = y0 + JITTER_Y, z = z0 + JITTER_Z;
    if (y < ylo || y > yhi || z < zlo || z > zhi) return false;
    const list = cells[Math.min(ny - 1, Math.floor((y - ylo) / cs)) * nz + Math.min(nz - 1, Math.floor((z - zlo) / cs))]!;
    let count = 0;
    for (const t of list) {
      const a = T[t]! * 3, b = T[t + 1]! * 3, c = T[t + 2]! * 3;
      const ay = P[a + 1]!, az = P[a + 2]!;
      const e1y = P[b + 1]! - ay, e1z = P[b + 2]! - az, e2y = P[c + 1]! - ay, e2z = P[c + 2]! - az;
      const det = e1y * e2z - e1z * e2y;
      if (Math.abs(det) < 1e-12) continue;
      const py = y - ay, pz = z - az;
      const u = (py * e2z - pz * e2y) / det, v = (e1y * pz - e1z * py) / det;
      if (u < 0 || v < 0 || u + v > 1) continue;
      const hx = P[a]! + u * (P[b]! - P[a]!) + v * (P[c]! - P[a]!);
      if (hx > x) count += 1;
    }
    return count % 2 === 1;
  };
  const d = erodeMm;
  return (x, y, z) =>
    parity(x, y, z) && parity(x + d, y, z) && parity(x - d, y, z) && parity(x, y + d, z) && parity(x, y - d, z) && parity(x, y, z + d) && parity(x, y, z - d);
}
