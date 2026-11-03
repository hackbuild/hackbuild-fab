// isWatertight with numeric edge keys against the string keyed original
// (copied below as legacyWatertight), on closed, open, inverted, doubled and
// randomly edited cube meshes.

import { describe, expect, test } from "vitest";
import { isWatertight, type MeshData } from "../src/hash";

function legacyWatertight(mesh: MeshData, tris: Uint32Array): boolean {
  void mesh;
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

const CUBE_TRIS = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];

function cube(s: number, [x, y, z]: readonly [number, number, number] = [0, 0, 0]): MeshData {
  const positions = Float64Array.from([
    x, y, z, x + s, y, z, x + s, y + s, z, x, y + s, z,
    x, y, z + s, x + s, y, z + s, x + s, y + s, z + s, x, y + s, z + s,
  ]);
  return { positions, triangles: Uint32Array.from(CUBE_TRIS) };
}

/** The triangles isWatertight reads: vertices snapped to the 1/1024 grid, welded and renumbered in sorted order. */
function canonicalTris(mesh: MeshData): Uint32Array {
  const n = mesh.positions.length / 3;
  const g = (i: number, k: number): number => Math.round(mesh.positions[i * 3 + k]! * 1024) | 0;
  const cmp = (a: number, b: number): number => (g(a, 0) - g(b, 0)) || (g(a, 1) - g(b, 1)) || (g(a, 2) - g(b, 2));
  const order = Array.from({ length: n }, (_, i) => i).sort(cmp);
  const remap = new Uint32Array(n);
  let count = 0, prev = -1;
  for (const src of order) {
    if (prev < 0 || cmp(prev, src) !== 0) count += 1;
    remap[src] = count - 1;
    prev = src;
  }
  return mesh.triangles.map((i) => remap[i]!);
}

describe("isWatertight keeps the original verdict", () => {
  const closed = cube(2);
  const open: MeshData = { positions: closed.positions, triangles: closed.triangles.slice(0, closed.triangles.length - 3) };
  const flipped = (() => {
    const t = closed.triangles.slice();
    for (let i = 0; i < t.length; i += 3) [t[i + 1], t[i + 2]] = [t[i + 2]!, t[i + 1]!];
    return { positions: closed.positions, triangles: t } as MeshData;
  })();
  const doubled: MeshData = { positions: closed.positions, triangles: Uint32Array.from([...closed.triangles, ...closed.triangles]) };
  const empty: MeshData = { positions: new Float64Array(0), triangles: new Uint32Array(0) };

  test("fixed cases", () => {
    for (const [name, m, want] of [["closed", closed, true], ["open", open, false], ["flipped", flipped, true], ["doubled", doubled, false], ["empty", empty, false]] as const) {
      expect([name, isWatertight(m)]).toEqual([name, want]);
      expect([name, legacyWatertight(m, canonicalTris(m))]).toEqual([name, want]);
    }
  });

  test("random edits of a cube grid agree with the original", () => {
    let s = 12345;
    const rand = (): number => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let t = 0; t < 200; t++) {
      const base = cube(1 + rand() * 3);
      const tri = Array.from(base.triangles);
      const kind = Math.floor(rand() * 4);
      if (kind === 0) tri.splice(Math.floor(rand() * 12) * 3, 3);
      if (kind === 1) { const k = Math.floor(rand() * 12) * 3; [tri[k + 1], tri[k + 2]] = [tri[k + 2]!, tri[k + 1]!]; }
      if (kind === 2) tri[Math.floor(rand() * tri.length)] = Math.floor(rand() * 8);
      const m: MeshData = { positions: base.positions, triangles: Uint32Array.from(tri) };
      expect(isWatertight(m)).toBe(legacyWatertight(m, canonicalTris(m)));
    }
  });
});
