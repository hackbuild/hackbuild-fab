// R1-rails-import-01: shell groups of a welded mesh. Every fixture is built
// here from manifold cubes (getMesh through meshOf, then snapWeld), and the
// expected volumes are cube arithmetic worked by hand, never read back from
// shellGroups. davit_pincap is tied to the legacy copy by SHA256SUMS.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Manifold } from "manifold-3d";
import { importStl, liveCount, loadManifold, meshOf, scope, shellGroups, signedVolume, snapWeld, type MeshData } from "../src/index.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));

/** Meshes laid end to end in one buffer, then welded on the D-054 grid. */
function joined(...parts: MeshData[]): MeshData {
  const pos: number[] = [];
  const tris: number[] = [];
  for (const m of parts) {
    const base = pos.length / 3;
    pos.push(...m.positions);
    for (const v of m.triangles) tris.push(v + base);
  }
  return snapWeld({ positions: Float64Array.from(pos), triangles: Uint32Array.from(tris) });
}

const inverted = (m: MeshData): MeshData => {
  const t = Uint32Array.from(m.triangles);
  for (let i = 0; i < t.length; i += 3) [t[i + 1], t[i + 2]] = [t[i + 2]!, t[i + 1]!];
  return { positions: m.positions, triangles: t };
};

/**
 * A box [lo, hi]^3 written by hand, outward, its first triangle starting at
 * corner 2 (lo, hi, lo), so that corner is the void vertex the ray leaves from.
 */
function box(lo: number, hi: number): MeshData {
  const positions = Float64Array.from({ length: 24 }, (_, i) => ((Math.floor(i / 3) >> (i % 3)) & 1 ? hi : lo));
  const quads = [[2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5], [0, 1, 5, 4], [0, 2, 3, 1], [4, 5, 7, 6]];
  return { positions, triangles: Uint32Array.from(quads.flatMap(([a, b, c, d]) => [a!, b!, c!, a!, c!, d!])) };
}

const summary = (mesh: MeshData) => shellGroups(mesh).map((g) => ({ volume: g.volumeMm3, shells: g.shells, voids: g.voids }));

async function cubes(build: (cube: (size: readonly [number, number, number], at?: readonly [number, number, number]) => Manifold) => MeshData[]): Promise<MeshData> {
  const wasm = await loadManifold();
  const mesh = scope(() => joined(...build((size, at = [0, 0, 0]) => wasm.Manifold.cube([...size]).translate([...at]))));
  expect(liveCount()).toBe(0);
  return mesh;
}

describe("shellGroups", () => {
  it("gives two groups for two disjoint cubes, ordered by min x", async () => {
    const m = await cubes((c) => [meshOf(c([10, 10, 10], [20, 0, 0])), meshOf(c([10, 10, 10]))]);
    const g = shellGroups(m);
    expect(summary(m)).toEqual([{ volume: 1000, shells: 1, voids: 0 }, { volume: 1000, shells: 1, voids: 0 }]);
    expect(g.map((x) => x.bounds)).toEqual([[[0, 0, 0], [10, 10, 10]], [[20, 0, 0], [30, 10, 10]]]);
  });

  it("gives two groups of 1000 mm3 for two overlapping cubes concatenated", async () => {
    const m = await cubes((c) => [meshOf(c([10, 10, 10])), meshOf(c([10, 10, 10], [5, 5, 5]))]);
    expect(summary(m)).toEqual([{ volume: 1000, shells: 1, voids: 0 }, { volume: 1000, shells: 1, voids: 0 }]);
  });

  it("gives two groups for two cubes touching at one corner vertex", async () => {
    const m = await cubes((c) => [meshOf(c([10, 10, 10])), meshOf(c([10, 10, 10], [10, 10, 10]))]);
    // The weld shares the corner vertex: a vertex key would join the two cubes.
    expect(m.positions.length / 3).toBe(15);
    expect(summary(m)).toEqual([{ volume: 1000, shells: 1, voids: 0 }, { volume: 1000, shells: 1, voids: 0 }]);
  });

  it("keeps the void of a hollow cube on its outer shell: one group of 784 mm3", async () => {
    const m = await cubes((c) => [meshOf(c([10, 10, 10]).subtract(c([6, 6, 6], [2, 2, 2])))]);
    const g = shellGroups(m);
    expect(summary(m)).toEqual([{ volume: 1000 - 216, shells: 2, voids: 1 }]);
    expect(g[0]!.mesh.triangles.length).toBe(m.triangles.length);
    expect(Array.from(g[0]!.mesh.triangles.subarray(0, 3))).toEqual([0, 1, 2]);
  });

  it("keeps two voids on one cube", async () => {
    const m = await cubes((c) => [meshOf(c([20, 20, 20]).subtract(c([4, 4, 4], [3, 3, 3])).subtract(c([4, 4, 4], [12, 12, 12])))]);
    expect(summary(m)).toEqual([{ volume: 8000 - 128, shells: 3, voids: 2 }]);
  });

  it("keeps a void whose vertices sit on the x plane of an outer step", async () => {
    // Outer: a 10 mm cube with a 10 x 10 x 5 block on its +x face; the void's
    // -x face lies on x = 10, the plane of the step.
    const m = await cubes((c) => [meshOf(c([10, 10, 10]).add(c([10, 10, 5], [10, 0, 0])).subtract(c([2, 2, 2], [10, 2, 1])))]);
    expect(summary(m)).toEqual([{ volume: 1000 + 500 - 8, shells: 2, voids: 1 }]);
  });

  it("keeps a void whose ray from its first vertex meets the outer face diagonal", async () => {
    // manifold-3d 3.5.4 splits the cube's x = 10 face along y + z = 10
    // (computed, read from getMesh). The void's first vertex (3, 7, 3) sits
    // on that line, so a ray along +x alone crosses the shared diagonal
    // twice and calls the void outside.
    const hole = inverted(box(3, 7));
    expect(signedVolume(hole)).toBe(-64);
    expect(Array.from(hole.positions.subarray(hole.triangles[0]! * 3, hole.triangles[0]! * 3 + 3))).toEqual([3, 7, 3]);
    const m = await cubes((c) => [meshOf(c([10, 10, 10])), hole]);
    expect(summary(m)).toEqual([{ volume: 1000 - 64, shells: 2, voids: 1 }]);
  });

  it("puts a void in the smallest outer shell that holds it", async () => {
    // A 30 mm hollow box (void 26 mm) with a hollow 10 mm cube inside the void.
    const m = await cubes((c) => [
      meshOf(c([30, 30, 30]).subtract(c([26, 26, 26], [2, 2, 2]))),
      meshOf(c([10, 10, 10], [10, 10, 10]).subtract(c([6, 6, 6], [12, 12, 12]))),
    ]);
    expect(summary(m)).toEqual([
      { volume: 27000 - 17576, shells: 2, voids: 1 },
      { volume: 1000 - 216, shells: 2, voids: 1 },
    ]);
  });

  it("leaves a void no outer shell holds as its own group with negative volume", async () => {
    const m = await cubes((c) => [meshOf(c([10, 10, 10])), inverted(meshOf(c([4, 4, 4], [20, 0, 0])))]);
    expect(summary(m)).toEqual([{ volume: 1000, shells: 1, voids: 0 }, { volume: -64, shells: 1, voids: 1 }]);
  });

  it("reads davit_pincap.stl through importStl as one group of the body volume", () => {
    const file = "designs/davit/legacy/stl/davit_pincap.stl";
    const body = importStl(new Uint8Array(readFileSync(root + file)), file);
    const g = shellGroups(body.mesh);
    expect(g.length).toBe(1);
    expect(g[0]!.voids).toBe(0);
    expect(g[0]!.volumeMm3).toBe(body.volumeMm3);
  });
});
