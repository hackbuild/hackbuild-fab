// R1-rails-import-01: the closed shells of a welded mesh, each void kept on
// the outer shell that holds it. DAVIT finalize (parts_r4.py line 329) split
// a mesh into trimesh bodies by face adjacency and counted the real ones;
// this is that split over the D-054 welded indices, plus the void grouping
// trimesh left out. Pure TS, no wasm: a self-overlapping or floating file
// has to be measured before any boolean runs on it.

import type { Vec3 } from "@hackbuild/spec";
import { bounds, signedVolume, type MeshData } from "./hash.js";

/** One outer shell with the voids inside it, or a void no outer shell holds (negative volume). */
export interface ShellGroup {
  /** The group's triangles, vertices renumbered in first-use order. */
  readonly mesh: MeshData;
  /** Signed volume of the group, mm3 (computed): outer less its voids. */
  readonly volumeMm3: number;
  readonly bounds: readonly [Vec3, Vec3];
  /** Closed components in the group, the outer shell counted. */
  readonly shells: number;
  readonly voids: number;
}

/**
 * Ray direction for the parity test. Along +x, nudged by fixed irrational
 * slopes, so a ray from a grid vertex does not run along a face diagonal or
 * through an edge another grid vertex sits on.
 */
const RAY: Vec3 = [1, Math.SQRT2 / 7, Math.PI / 11];

function find(parent: Uint32Array, i: number): number {
  let r = i;
  while (parent[r] !== r) r = parent[r]!;
  while (parent[i] !== r) {
    const next = parent[i]!;
    parent[i] = r;
    i = next;
  }
  return r;
}

/** Triangles joined across shared undirected edges, keyed as audit.ts pairEdges keys them. */
function components(mesh: MeshData): number[][] {
  const t = mesh.triangles;
  const nv = mesh.positions.length / 3;
  const nt = t.length / 3;
  const parent = Uint32Array.from({ length: nt }, (_, i) => i);
  const firstOnEdge = new Map<number, number>();
  for (let f = 0; f < nt; f += 1) {
    for (let k = 0; k < 3; k += 1) {
      const a = t[f * 3 + k]!;
      const b = t[f * 3 + ((k + 1) % 3)]!;
      const key = a < b ? a * nv + b : b * nv + a;
      const g = firstOnEdge.get(key);
      if (g === undefined) firstOnEdge.set(key, f);
      else parent[find(parent, f)] = find(parent, g);
    }
  }
  const byRoot = new Map<number, number[]>();
  for (let f = 0; f < nt; f += 1) {
    const r = find(parent, f);
    let list = byRoot.get(r);
    if (list === undefined) byRoot.set(r, (list = []));
    list.push(f);
  }
  return [...byRoot.values()];
}

/** The listed triangles as their own mesh, vertices renumbered in first-use order. */
function subMesh(mesh: MeshData, faces: readonly number[]): MeshData {
  const remap = new Map<number, number>();
  const pos: number[] = [];
  const tris = new Uint32Array(faces.length * 3);
  faces.forEach((f, i) => {
    for (let k = 0; k < 3; k += 1) {
      const v = mesh.triangles[f * 3 + k]!;
      let id = remap.get(v);
      if (id === undefined) {
        id = remap.size;
        remap.set(v, id);
        pos.push(mesh.positions[v * 3]!, mesh.positions[v * 3 + 1]!, mesh.positions[v * 3 + 2]!);
      }
      tris[i * 3 + k] = id;
    }
  });
  return { positions: Float64Array.from(pos), triangles: tris };
}

/** Moller-Trumbore crossings of the ray from o along RAY with the mesh, odd when o is inside. */
function crossings(mesh: MeshData, o: Vec3): number {
  const p = mesh.positions;
  const t = mesh.triangles;
  const [dx, dy, dz] = RAY;
  let n = 0;
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i]! * 3, b = t[i + 1]! * 3, c = t[i + 2]! * 3;
    const e1x = p[b]! - p[a]!, e1y = p[b + 1]! - p[a + 1]!, e1z = p[b + 2]! - p[a + 2]!;
    const e2x = p[c]! - p[a]!, e2y = p[c + 1]! - p[a + 1]!, e2z = p[c + 2]! - p[a + 2]!;
    const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
    const det = e1x * hx + e1y * hy + e1z * hz;
    if (det === 0) continue;
    const sx = o[0] - p[a]!, sy = o[1] - p[a + 1]!, sz = o[2] - p[a + 2]!;
    const u = (sx * hx + sy * hy + sz * hz) / det;
    if (u < 0 || u > 1) continue;
    const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
    const v = (dx * qx + dy * qy + dz * qz) / det;
    if (v < 0 || u + v > 1) continue;
    if ((e2x * qx + e2y * qy + e2z * qz) / det > 0) n += 1;
  }
  return n;
}

const holds = (outer: readonly [Vec3, Vec3], inner: readonly [Vec3, Vec3]): boolean =>
  [0, 1, 2].every((k) => outer[0][k]! <= inner[0][k]! && inner[1][k]! <= outer[1][k]!);

interface Shell {
  readonly faces: readonly number[];
  readonly mesh: MeshData;
  readonly volume: number;
  readonly bounds: readonly [Vec3, Vec3];
}

/**
 * Split a welded mesh (snapWeld) into shell groups. A component with
 * positive signed volume is an outer shell; a negative one is a void, kept
 * on the smallest outer shell whose bounds hold it and whose surface a ray
 * from one void vertex crosses an odd number of times. A void no outer
 * shell holds is its own group with a negative volume, for the caller to
 * refuse. Groups sort by bounds min x, y, z, then volume.
 */
export function shellGroups(mesh: MeshData): ShellGroup[] {
  const shells: Shell[] = components(mesh).map((faces) => {
    const m = subMesh(mesh, faces);
    return { faces, mesh: m, volume: signedVolume(m), bounds: bounds(m) };
  });
  const outers = shells.filter((s) => s.volume > 0).sort((a, b) => a.volume - b.volume);
  const members = new Map<Shell, Shell[]>(outers.map((s) => [s, [s]]));
  const orphans: Shell[][] = [];
  for (const v of shells) {
    if (v.volume > 0) continue;
    const o: Vec3 = [v.mesh.positions[0]!, v.mesh.positions[1]!, v.mesh.positions[2]!];
    const host = outers.find((s) => holds(s.bounds, v.bounds) && crossings(s.mesh, o) % 2 === 1);
    if (host === undefined) orphans.push([v]);
    else members.get(host)!.push(v);
  }
  const groups = [...members.values(), ...orphans].map((list): ShellGroup => {
    const m = subMesh(mesh, list.flatMap((s) => s.faces));
    return { mesh: m, volumeMm3: signedVolume(m), bounds: bounds(m), shells: list.length, voids: list.filter((s) => s.volume <= 0).length };
  });
  return groups.sort((a, b) =>
    a.bounds[0][0] - b.bounds[0][0] || a.bounds[0][1] - b.bounds[0][1] || a.bounds[0][2] - b.bounds[0][2] || a.volumeMm3 - b.volumeMm3);
}
