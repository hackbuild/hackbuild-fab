// R1-rails-import-04: stageImported unions shell groups, not parts, counts
// the pieces the union leaves and measures pairwise overlap when no union
// exists. Every STL case is built here from manifold cubes laid into one
// triangle soup (one STL part, as importStl reads a file), and every
// expected volume is cube arithmetic worked by hand. The image-eval failure
// these cases stand for is fab-knowledge/plan-v5/image-eval.md lines 25 and
// 27 (a mushroom cap 2 mm above its stem, five overlapping parts in one file).
// locket-r2.glb is tied to tools/corpus/import/SHA256SUMS.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Manifold } from "manifold-3d";
import { MESH_GRID_PER_MM, type BodyDraft } from "@hackbuild/spec";
import { importGlb, importSoup, liveCount, loadManifold, meshOf, scope, stageImported, type ImportedBody, type MeshData } from "../src/index.js";

const CORPUS = fileURLToPath(new URL("../../../tools/corpus/import/", import.meta.url));
const STEP = 1 / MESH_GRID_PER_MM;

const draft = (id: string): BodyDraft => ({ id, role: "body", slot: 1, material: "petg", base: { route: "imported", uri: `${id}.stl`, format: "stl", tier: "inferred" } });

/** Meshes laid end to end as one triangle soup: one STL file, one part, however many shells. */
function soupOf(parts: readonly MeshData[]): Float64Array {
  const out: number[] = [];
  for (const m of parts) for (const v of m.triangles) out.push(m.positions[v * 3]!, m.positions[v * 3 + 1]!, m.positions[v * 3 + 2]!);
  return Float64Array.from(out);
}

type Cube = (size: readonly [number, number, number], at?: readonly [number, number, number]) => Manifold;

async function stl(file: string, build: (cube: Cube) => Manifold[]): Promise<ImportedBody> {
  const wasm = await loadManifold();
  const meshes = scope(() => build((size, at = [0, 0, 0]) => wasm.Manifold.cube([...size]).translate([...at])).map(meshOf));
  expect(liveCount()).toBe(0);
  return importSoup(soupOf(meshes), file, "binary");
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

describe("stageImported: shell groups, pieces and overlap", () => {
  it("unions two overlapping cubes in one file to 1500 mm3 against 2000 mm3 of groups", async () => {
    const read = await stl("two.stl", (c) => [c([10, 10, 10]), c([10, 10, 10], [5, 0, 0])]);
    const out = await stageImported([{ draft: draft("white"), read }]);
    expect(out.noUnion).toBeNull();
    // 1000 + 1000 less the shared 5 x 10 x 10.
    expect(out.staged.unionVolumeMm3).toBeCloseTo(1500, 6);
    expect(out.groups.map((g) => g.name)).toEqual(["two.stl#0", "two.stl#1"]);
    expect(read.volumeMm3).toBeCloseTo(2000, 6);
    expect(out.pieces?.length).toBe(1);
    expect(out.bodyPieces).toEqual({ white: 1 });
    expect(out.pairwise).toBeNull();
    expect(liveCount()).toBe(0);
  });

  it("gives two pieces for a cap floating 2 mm above its stem", async () => {
    const read = await stl("mush.stl", (c) => [c([4, 4, 10], [3, 3, 0]), c([10, 10, 3], [0, 0, 12])]);
    const out = await stageImported([{ draft: draft("white"), read }]);
    expect(out.noUnion).toBeNull();
    const pieces = [...out.pieces!].sort((a, b) => a.bounds[0][2] - b.bounds[0][2]);
    expect(pieces.length).toBe(2);
    expect(Math.abs(pieces[1]!.bounds[0][2] - pieces[0]!.bounds[1][2] - 2)).toBeLessThanOrEqual(STEP);
    expect(pieces.map((p) => p.volumeMm3)).toEqual([160, 300]);
    expect(pieces.every((p) => p.body === "white")).toBe(true);
    expect(out.bodyPieces).toEqual({ white: 2 });
  });

  it("gives one piece of the hollow volume for a hollow box", async () => {
    const read = await stl("hollow.stl", (c) => [c([10, 10, 10]).subtract(c([6, 6, 6], [2, 2, 2]))]);
    const out = await stageImported([{ draft: draft("white"), read }]);
    expect(out.noUnion).toBeNull();
    expect(out.groups.length).toBe(1);
    expect(out.pieces?.map((p) => p.volumeMm3)).toEqual([1000 - 216]);
    expect(out.staged.unionVolumeMm3).toBeCloseTo(784, 6);
  });

  it("refuses the union of cubes touching at a corner and measures 0 overlap instead", async () => {
    const read = await stl("corner.stl", (c) => [c([10, 10, 10]), c([10, 10, 10], [10, 10, 10])]);
    const out = await stageImported([{ draft: draft("white"), read }]);
    expect(out.noUnion).toMatch(/^the union of 1 imported part is refused \(2 shell groups\)/);
    expect(out.pieces).toBeNull();
    expect(out.bodyPieces).toBeNull();
    expect(out.pairwise).toEqual({ worstMm3: 0, pair: null });
    expect(liveCount()).toBe(0);
  });

  it("refuses a void no outer shell holds with an AUDIT warning", async () => {
    const wasm = await loadManifold();
    const [cube, hole] = scope(() => [meshOf(wasm.Manifold.cube([10, 10, 10])), meshOf(wasm.Manifold.cube([4, 4, 4]).translate([20, 0, 0]))]);
    const t = Uint32Array.from(hole.triangles);
    for (let i = 0; i < t.length; i += 3) [t[i + 1], t[i + 2]] = [t[i + 2]!, t[i + 1]!];
    const read = importSoup(soupOf([cube, { positions: hole.positions, triangles: t }]), "void.stl", "binary");
    const out = await stageImported([{ draft: draft("white"), read }]);
    expect(out.noUnion).toMatch(/^1 of 1 imported part fails the audit \(1 of 2 shell groups\)/);
    expect(out.staged.warnings.some((w) => w.code === "AUDIT" && /a void no outer shell holds, volume -64 mm3/.test(w.text))).toBe(true);
    // Only the closed cube is left to compare: one group, no pair.
    expect(out.pairwise).toEqual({ worstMm3: 0, pair: null });
  });

  it("names the body of each piece and counts pieces per body", async () => {
    const a = await stl("a.stl", (c) => [c([10, 10, 10])]);
    const b = await stl("b.stl", (c) => [c([10, 10, 10], [5, 0, 0])]);
    const far = await stl("c.stl", (c) => [c([10, 10, 10], [40, 0, 0]), c([10, 10, 10], [45, 0, 0])]);
    const out = await stageImported([{ draft: draft("a"), read: a }, { draft: draft("b"), read: b }, { draft: draft("c"), read: far }]);
    expect(out.noUnion).toBeNull();
    expect(out.bodyPieces).toEqual({ a: 1, b: 1, c: 1 });
    // a and b overlap into one piece of 1000 + 1000 - 500; c's two cubes are 1500 of its own.
    expect([...out.pieces!].map((p) => [p.body, p.volumeMm3]).sort()).toEqual([[null, 1500], ["c", 1500]].sort());
    expect(liveCount()).toBe(0);
  });

  // locket-r2: 16 parts, union refused (tools/corpus/import/MANIFEST.json).
  // The whole stage took 511 ms here (measured, one vitest run, shared machine); one
  // body, so no extra per-body union runs.
  it("measures pairwise overlap on locket-r2.glb where the union is refused", async () => {
    const read = importGlb(new Uint8Array(readFileSync(`${CORPUS}locket-r2.glb`)), "locket-r2.glb");
    const out = await stageImported([{ draft: { ...draft("white"), base: { route: "imported", uri: "locket-r2.glb", format: "glb", tier: "inferred" } }, read }]);
    expect(out.noUnion).not.toBeNull();
    expect(out.pairwise).not.toBeNull();
    expect(out.groups.length).toBeGreaterThanOrEqual(read.parts.length);
    expect(sum(out.groups.map((g) => g.mesh.triangles.length))).toBe(read.mesh.triangles.length);
    expect(liveCount()).toBe(0);
  }, 120_000);
});
