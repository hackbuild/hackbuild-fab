// Hand-written meshes for the M00-T04 tests, mm.

import type { MeshData } from "../src/index.js";

const CUBE_TRIS = [
  0, 2, 1, 0, 3, 2, // z = 0, facing down
  4, 5, 6, 4, 6, 7, // z = s, facing up
  0, 1, 5, 0, 5, 4, // y = 0
  1, 2, 6, 1, 6, 5, // x = s
  2, 3, 7, 2, 7, 6, // y = s
  3, 0, 4, 3, 4, 7, // x = 0
];

/** Axis-aligned cube of side s with its low corner at o; 8 vertices, 12 outward triangles. */
export function cube(s = 10, o: readonly [number, number, number] = [0, 0, 0]): MeshData {
  const [x, y, z] = o;
  const positions = Float64Array.from([
    x, y, z, x + s, y, z, x + s, y + s, z, x, y + s, z,
    x, y, z + s, x + s, y, z + s, x + s, y + s, z + s, x, y + s, z + s,
  ]);
  return { positions, triangles: Uint32Array.from(CUBE_TRIS) };
}

/** Two meshes as one, indices of b offset past a. */
export function join(a: MeshData, b: MeshData): MeshData {
  const n = a.positions.length / 3;
  const positions = new Float64Array(a.positions.length + b.positions.length);
  positions.set(a.positions);
  positions.set(b.positions, a.positions.length);
  const triangles = new Uint32Array(a.triangles.length + b.triangles.length);
  triangles.set(a.triangles);
  triangles.set(b.triangles.map((i) => i + n), a.triangles.length);
  return { positions, triangles };
}

/** Every triangle reversed: the inside-out twin. */
export function inverted(m: MeshData): MeshData {
  const t = m.triangles.slice();
  for (let i = 0; i < t.length; i += 3) [t[i + 1], t[i + 2]] = [t[i + 2]!, t[i + 1]!];
  return { positions: m.positions.slice(), triangles: t };
}
