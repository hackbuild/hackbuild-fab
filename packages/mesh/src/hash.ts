// D-054 vertex snap and the D-175 meshHash. The byte layout is the one
// spec/ids.ts documents on MeshHash; the hash is sha256Hex of spec/jcs.ts
// (D-206), synchronous pure JS, so node and browsers give one value.

import { q as snap } from "@hackbuild/geom";
import { MESH_GRID_PER_MM, MESH_HASH_TAG, sha256Hex } from "@hackbuild/spec";
import type { Manifold } from "manifold-3d";
import type { Hash, MeshHash, MeshRef, MeshUri, Mm, Vec3 } from "@hackbuild/spec";

/** Indexed triangle mesh in mm: xyz triples and counter-clockwise (outward) index triples. */
export interface MeshData {
  readonly positions: Float64Array;
  readonly triangles: Uint32Array;
}

/**
 * Snap to the 1/1024 mm grid (D-054) and weld vertices that land on one
 * grid point, dropping the triangles that collapse. TENON keeps two columns
 * that differ by more than 1e-7 rad, and where two feature edges nearly
 * coincide their columns sit closer than half a grid step on small radii:
 * 1 of the 448 sweep calls snapped two columns onto one point and left 304
 * zero-area triangles before this weld (computed, M00-T05). A boolean does
 * the same where two kernel vertices sit under half a grid step apart; the
 * stage runner welds every body mesh with it, and union.ts audits a
 * candidate after it.
 */
export function snapWeld(mesh: MeshData): MeshData {
  const p = mesh.positions;
  const n = p.length / 3;
  const remap = new Uint32Array(n);
  const seen = new Map<string, number>();
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = snap(p[i * 3]!), y = snap(p[i * 3 + 1]!), z = snap(p[i * 3 + 2]!);
    const key = `${x},${y},${z}`;
    let id = seen.get(key);
    if (id === undefined) {
      id = out.length / 3;
      seen.set(key, id);
      out.push(x, y, z);
    }
    remap[i] = id;
  }
  const tris: number[] = [];
  const t = mesh.triangles;
  for (let i = 0; i < t.length; i += 3) {
    const a = remap[t[i]!]!, b = remap[t[i + 1]!]!, c = remap[t[i + 2]!]!;
    if (a === b || b === c || a === c) continue;
    tris.push(a, b, c);
  }
  return { positions: Float64Array.from(out), triangles: Uint32Array.from(tris) };
}

/** A manifold's triangles as snapped MeshData (D-054). Lives here, not in a route, so union.ts and the routes share it without an import cycle. */
export function meshOf(solid: Manifold): MeshData {
  const m = solid.getMesh();
  const nVert = m.vertProperties.length / m.numProp;
  const positions = new Float64Array(nVert * 3);
  for (let v = 0; v < nVert; v += 1) {
    for (let k = 0; k < 3; k += 1) positions[v * 3 + k] = snap(m.vertProperties[v * m.numProp + k]!);
  }
  return { positions, triangles: Uint32Array.from(m.triVerts) };
}

/**
 * Snap a length to the dyadic 1/1024 mm grid (D-054), mm. One owner:
 * geom q, re-exported under the mesh name, so negative zero comes back as
 * zero here too.
 */
export { snap };

/** Grid steps for a length, int32: round(v x 1024). */
function gridOf(v: Mm): number {
  return Math.round(v * MESH_GRID_PER_MM) | 0;
}

/** A copy of the mesh with every coordinate on the 1/1024 mm grid. */
export function snapMesh(mesh: MeshData): MeshData {
  return { positions: mesh.positions.map(snap), triangles: mesh.triangles.slice() };
}

interface Canonical {
  /** int32 xyz per vertex, sorted ascending by x then y then z, deduplicated. */
  readonly verts: Int32Array;
  /** uint32 index triples; each rotated so its smallest index leads; sorted ascending. */
  readonly tris: Uint32Array;
}

function compareTriples(a: ArrayLike<number>, i: number, j: number): number {
  return (a[i * 3]! - a[j * 3]!) || (a[i * 3 + 1]! - a[j * 3 + 1]!) || (a[i * 3 + 2]! - a[j * 3 + 2]!);
}

function canonical(mesh: MeshData): Canonical {
  const nIn = mesh.positions.length / 3;
  const grid = new Int32Array(mesh.positions.length);
  for (let i = 0; i < grid.length; i += 1) grid[i] = gridOf(mesh.positions[i]!);

  const order = Array.from({ length: nIn }, (_, i) => i).sort((a, b) => compareTriples(grid, a, b));
  const remap = new Uint32Array(nIn);
  const verts: number[] = [];
  let prev = -1;
  for (const src of order) {
    if (prev < 0 || compareTriples(grid, prev, src) !== 0) {
      verts.push(grid[src * 3]!, grid[src * 3 + 1]!, grid[src * 3 + 2]!);
    }
    remap[src] = verts.length / 3 - 1;
    prev = src;
  }

  const nTri = mesh.triangles.length / 3;
  const rotated = new Uint32Array(mesh.triangles.length);
  for (let t = 0; t < nTri; t += 1) {
    const a = remap[mesh.triangles[t * 3]!]!;
    const b = remap[mesh.triangles[t * 3 + 1]!]!;
    const c = remap[mesh.triangles[t * 3 + 2]!]!;
    // Rotation keeps the cyclic order, so winding survives into the hash.
    const lead = a <= b && a <= c ? 0 : b <= c ? 1 : 2;
    const tri = lead === 0 ? [a, b, c] : lead === 1 ? [b, c, a] : [c, a, b];
    rotated.set(tri, t * 3);
  }
  const triOrder = Array.from({ length: nTri }, (_, i) => i).sort((x, y) => compareTriples(rotated, x, y));
  const tris = new Uint32Array(rotated.length);
  triOrder.forEach((src, dst) => tris.set(rotated.subarray(src * 3, src * 3 + 3), dst * 3));

  return { verts: Int32Array.from(verts), tris };
}

/** meshHash per D-175: sha256 over "hbf-mesh-2", vertex count, int32 xyz, triangle count, uint32 indices, little-endian. */
export function meshHash(mesh: MeshData): MeshHash {
  const { verts, tris } = canonical(mesh);
  const tag = Array.from(MESH_HASH_TAG, (ch) => ch.charCodeAt(0));
  const bytes = new Uint8Array(tag.length + 4 + verts.length * 4 + 4 + tris.length * 4);
  const view = new DataView(bytes.buffer);
  bytes.set(tag, 0);
  let at = tag.length;
  view.setUint32(at, verts.length / 3, true);
  at += 4;
  for (const v of verts) {
    view.setInt32(at, v, true);
    at += 4;
  }
  view.setUint32(at, tris.length / 3, true);
  at += 4;
  for (const i of tris) {
    view.setUint32(at, i, true);
    at += 4;
  }
  return sha256Hex(bytes) as Hash;
}

/**
 * Closed and consistently oriented after the snap: every directed edge
 * appears once and its reverse appears once.
 */
export function isWatertight(mesh: MeshData): boolean {
  const { tris } = canonical(mesh);
  if (tris.length === 0) return false;
  const edges = new Map<string, number>();
  for (let t = 0; t < tris.length; t += 3) {
    for (let e = 0; e < 3; e += 1) {
      const key = `${tris[t + e]!},${tris[t + ((e + 1) % 3)]!}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  for (const [key, n] of edges) {
    const [a, b] = key.split(",");
    if (n !== 1 || edges.get(`${b},${a}`) !== 1) return false;
  }
  return true;
}

/** Signed enclosed volume, mm3; negative for an inside-out mesh. */
export function signedVolume(mesh: MeshData): number {
  const p = mesh.positions;
  const t = mesh.triangles;
  let six = 0;
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i]! * 3;
    const b = t[i + 1]! * 3;
    const c = t[i + 2]! * 3;
    const ax = p[a]!, ay = p[a + 1]!, az = p[a + 2]!;
    const bx = p[b]!, by = p[b + 1]!, bz = p[b + 2]!;
    const cx = p[c]!, cy = p[c + 1]!, cz = p[c + 2]!;
    six += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return six / 6;
}

/** Axis-aligned bounds, min then max, mm. */
export function bounds(mesh: MeshData): readonly [Vec3, Vec3] {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const p = mesh.positions;
  for (let i = 0; i < p.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      const v = p[i + k]!;
      if (v < lo[k]!) lo[k] = v;
      if (v > hi[k]!) hi[k] = v;
    }
  }
  return [[lo[0]!, lo[1]!, lo[2]!], [hi[0]!, hi[1]!, hi[2]!]];
}

/** The Part IR handle for a snapped mesh (spec/part-ir.ts MeshRef). */
export function meshRef(mesh: MeshData): MeshRef {
  const hash = meshHash(mesh);
  return {
    uri: `hbf://mesh/${hash}` as MeshUri,
    hash,
    triangles: mesh.triangles.length / 3,
    bbox: bounds(mesh),
    volumeMm3: signedVolume(mesh),
    watertight: isWatertight(mesh),
  };
}
