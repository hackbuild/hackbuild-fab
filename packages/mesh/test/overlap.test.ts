// R1-rails-import-03: worst pairwise overlap. Every fixture is an axis box
// written here, and every expected volume is box arithmetic worked by hand
// (overlap length times 10 times 10), never read back from worstOverlap.

import { describe, expect, it } from "vitest";
import { liveCount, loadManifold, worstOverlap, type MeshData } from "../src/index.js";

/** An outward box [x, x + 10] by [0, 10] by [0, 10], corner i at bit 0 x, bit 1 y, bit 2 z. */
function cube(x: number): MeshData {
  const positions = Float64Array.from({ length: 24 }, (_, i) => {
    const corner = Math.floor(i / 3);
    const axis = i % 3;
    const hi = (corner >> axis) & 1;
    return (axis === 0 ? x : 0) + hi * 10;
  });
  const quads = [[2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5], [0, 1, 5, 4], [0, 2, 3, 1], [4, 5, 7, 6]];
  return { positions, triangles: Uint32Array.from(quads.flatMap(([a, b, c, d]) => [a!, b!, c!, a!, c!, d!])) };
}

/** worstOverlap, with the live kernel object count checked unchanged across the call. */
async function measured(groups: { name: string; mesh: MeshData }[]) {
  await loadManifold();
  const before = liveCount();
  const got = await worstOverlap(groups);
  expect(liveCount()).toBe(before);
  return got;
}

describe("worstOverlap", () => {
  it("measures two 10 mm cubes offset 5 mm in x as 500 mm3 and names the pair", async () => {
    const got = await measured([{ name: "a", mesh: cube(0) }, { name: "b", mesh: cube(5) }]);
    expect(got.worstMm3).toBeCloseTo(500, 6);
    expect(got.pair).toEqual(["a", "b"]);
    expect(got.pairs).toBe(1);
    expect(got.intersected).toBe(1);
  });

  it("counts cubes 1 mm apart as 0 without running the boolean", async () => {
    const got = await measured([{ name: "a", mesh: cube(0) }, { name: "b", mesh: cube(11) }]);
    expect(got).toEqual({ worstMm3: 0, pair: null, pairs: 1, intersected: 0 });
  });

  it("intersects cubes whose bounds share a face and finds 0", async () => {
    const got = await measured([{ name: "a", mesh: cube(0) }, { name: "b", mesh: cube(10) }]);
    expect(got.intersected).toBe(1);
    expect(got.worstMm3).toBeCloseTo(0, 6);
    expect(got.pair).toBeNull();
  });

  it("reports the worst of three pairs, not the first", async () => {
    // a and b share x 9 to 10 (100 mm3), a and c x 4 to 10 (600), b and c x 9 to 14 (500).
    const got = await measured([{ name: "a", mesh: cube(0) }, { name: "b", mesh: cube(9) }, { name: "c", mesh: cube(4) }]);
    expect(got.worstMm3).toBeCloseTo(600, 6);
    expect(got.pair).toEqual(["a", "c"]);
    expect(got.pairs).toBe(3);
    expect(got.intersected).toBe(3);
  });

  it("refuses an open group with E_KERNEL naming it, even when its bounds touch no other", async () => {
    const open = cube(50);
    const holed = { positions: open.positions, triangles: open.triangles.slice(3) };
    await loadManifold();
    const before = liveCount();
    const err = await worstOverlap([{ name: "a", mesh: cube(0) }, { name: "cap", mesh: holed }]).then(() => null, (e: unknown) => e);
    expect(liveCount()).toBe(before);
    const hbf = (err as { hbf?: { code: string; path: string; hint: string } }).hbf;
    expect(hbf?.code).toBe("E_KERNEL");
    expect(hbf?.path).toBe("groups/1");
    expect(hbf?.hint).toContain("cap");
  });
});
