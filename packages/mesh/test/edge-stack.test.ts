// R1-engine-06: the edge spec on the stack route. A 40 x 30 x 10 mm body,
// corner r 4, top round R 2 and bottom 45 deg chamfer 0.6 on a 0.2 mm test
// grid (first layer 0.2, layer 0.2; the geometry-strategy.md row 2a case,
// a test grid and no machine). The union volume is held to the closed form
// by the Steiner area A(d) = A0 - P d + pi d^2 of a rounded rectangle inset
// by d, integrated over the profiles by hand below (computed), never by
// calling edgeInset. The prototype measured -0.0151 percent with 2,012
// triangles (geometry-strategy.md row 2a).

import { beforeAll, describe, expect, it } from "vitest";
import type { MachineView, Ring } from "@hackbuild/spec";
import { circleRing, loadGeom, q, rrect, rrectRing, type EdgeSpec, type Geom } from "@hackbuild/geom";
import { createProfileLookup, layerIndex, layerTop, loadProfile } from "@hackbuild/profile";
import { bandOverlap, liveCount, loadManifold, meshHash, meshOf, prismWithEdges, stackMesh, unionReport, withScope, type MeshData, type StackShape } from "../src/index.js";

const profile = createProfileLookup(loadProfile());
const OVERLAP = bandOverlap(profile);
const OV = q((OVERLAP[0] + OVERLAP[1]) / 2);

let geom: Geom;
beforeAll(async () => {
  geom = await loadGeom();
});

/** A layer grid as MachineView reads it, from @hackbuild/profile layerTop and layerIndex. */
const grid = (firstLayer: number, layer: number): Pick<MachineView, "layerTop" | "layerIndex"> => ({
  layerTop: (i) => layerTop({ firstLayer, layer }, i),
  layerIndex: (z) => layerIndex({ firstLayer, layer }, z),
});
const TEST_GRID = grid(0.2, 0.2);

const W = 40, L = 30, RC = 4, H = 10, R = 2, C = 0.6, RH = 5;
// 8 points per corner quarter, as Author.ring.roundRect draws it (packages/pipeline/src/author.ts AUTHOR_CORNER_SEGMENTS).
const OUTER: Ring = rrectRing(rrect(0, 0, W / 2, L / 2, RC), 32);
const HOLE: Ring = circleRing(RH, [0, 0], 64);
const EDGE: EdgeSpec = { top: { kind: "round", size: R }, bottom: { kind: "chamfer", size: C } };

// Integrals of d and d^2 over each zone, mm2 and mm3 (computed by hand):
// round, d = R - sqrt(R^2 - u^2) for u in [0, R]: R^2 (1 - pi/4) and R^3 (5/3 - pi/2);
// 45 deg chamfer, d = C - t for t in [0, C]: C^2 / 2 and C^3 / 3.
const ID1 = R * R * (1 - Math.PI / 4) + (C * C) / 2;
const ID2 = R ** 3 * (5 / 3 - Math.PI / 2) + C ** 3 / 3;
const A0 = W * L - (4 - Math.PI) * RC * RC;
const P = 2 * (W + L) - 8 * RC + 2 * Math.PI * RC;
/** Solid body, mm3: integral of A0 - P d + pi d^2 over z (computed). */
const SOLID = A0 * H - P * ID1 + Math.PI * ID2;
/** Through hole of radius RH opening to RH + d, mm3: integral of pi (RH + d)^2 (computed). */
const HOLE_VOL = Math.PI * (RH * RH * H + 2 * RH * ID1 + ID2);

async function union(shells: readonly MeshData[]): Promise<{ volume: number; genus: number; tris: number; hash: string }> {
  const wasm = await loadManifold();
  return withScope((scope) => {
    const solids = shells.map((m) => {
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(m.positions), triVerts: Uint32Array.from(m.triangles) });
      mesh.merge();
      return scope.own(new wasm.Manifold(mesh));
    });
    const s = unionReport(solids).solid;
    const data = meshOf(s);
    return { volume: s.volume(), genus: s.genus(), tris: s.numTri(), hash: meshHash(data) };
  });
}

const build = (outline: readonly Ring[], machine = TEST_GRID, z: readonly [number, number] = [0, H]): Promise<StackShape> =>
  prismWithEdges({ outline, z, edge: EDGE, machine, profile });

const code = async (p: Promise<unknown>): Promise<string | undefined> => {
  try {
    await p;
  } catch (e) {
    return (e as { hbf?: { code: string } }).hbf?.code;
  }
  return undefined;
};

describe("prismWithEdges", () => {
  it("40 x 30 x 10, r 4, top round R 2, bottom chamfer 0.6 at layer 0.2: volume within 0.04 percent of analytic, genus 0 (computed)", async () => {
    const s = await build([OUTER]);
    const m = stackMesh(geom, s.bands, OVERLAP);
    const u = await union(m.shells);
    const rel = (u.volume - SOLID) / SOLID;
    console.log(`solid: union ${u.volume.toFixed(3)} mm3, analytic ${SOLID.toFixed(3)} mm3, error ${(rel * 100).toFixed(4)} percent, ${s.bands.length} bands, ${u.tris} triangles (computed)`);
    expect(Math.abs(rel)).toBeLessThan(0.0004);
    expect(u.genus).toBe(0);
    expect(liveCount()).toBe(0);
  });

  it("puts every band bound on q(layerTop(i)), the narrower band reaching into the wider by the middle of stack.bandOverlap", async () => {
    const s = await build([OUTER]);
    const tops = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, k) => q(TEST_GRID.layerTop(from + k)));
    // bottom zone layers 0 to 2 (tops 0.2, 0.4, 0.6) widen upward, so each reaches up; the
    // middle runs from the top of layer 2 to the top of layer 39 (8.0); the ten layers of the
    // top zone narrow upward, so each reaches down.
    const lows = [0, ...tops(0, 1), tops(2, 2)[0]!, ...tops(39, 48).map((z) => q(z - OV))];
    const highs = [...tops(0, 2).map((z) => q(z + OV)), ...tops(39, 49)];
    expect(s.bands.map((b) => b.z[0])).toEqual(lows);
    expect(s.bands.map((b) => b.z[1])).toEqual(highs);
    expect(OV).toBeGreaterThanOrEqual(OVERLAP[0]);
    expect(OV).toBeLessThanOrEqual(OVERLAP[1]);
  });

  it("gives the same mesh hash across two runs", async () => {
    const a = await union(stackMesh(geom, (await build([OUTER, HOLE])).bands, OVERLAP).shells);
    const b = await union(stackMesh(geom, (await build([OUTER, HOLE])).bands, OVERLAP).shells);
    expect(a.hash).toBe(b.hash);
  });

  it("opens a through hole as the outer edge closes: hole volume within 0.04 percent, genus 1 (computed)", async () => {
    const s = await build([OUTER, HOLE]);
    const top = s.bands[s.bands.length - 1]!;
    const hole = top.outline[1]!;
    const near = Math.min(...hole.map(([x, y]) => Math.hypot(x, y)));
    // the top band's inset at its middle, 9.9 mm, is R - sqrt(R^2 - 1.9^2) (computed)
    expect(near).toBeGreaterThan(RH + R - Math.sqrt(R * R - 1.9 ** 2) - 0.01);
    const u = await union(stackMesh(geom, s.bands, OVERLAP).shells);
    const want = SOLID - HOLE_VOL;
    const rel = (u.volume - want) / want;
    console.log(`hole: union ${u.volume.toFixed(3)} mm3, analytic ${want.toFixed(3)} mm3, error ${(rel * 100).toFixed(4)} percent (computed)`);
    expect(Math.abs(rel)).toBeLessThan(0.0004);
    expect(u.genus).toBe(1);
  });

  it("holds the bounds to the ffc5p preset grid from profile", async () => {
    const p = profile.preset("ffc5p");
    const m = grid(p.firstLayer, p.layer);
    const top = m.layerTop(m.layerIndex(H));
    const s = await build([OUTER], m, [0, top]);
    const onGrid = new Set([0, ...Array.from({ length: m.layerIndex(top) + 1 }, (_, i) => q(m.layerTop(i)))]);
    for (const b of s.bands) for (const z of b.z) expect(onGrid.has(z) || onGrid.has(q(z + OV)) || onGrid.has(q(z - OV))).toBe(true);
    expect(stackMesh(geom, s.bands, OVERLAP).shells.length).toBe(s.bands.length);
  });

  it("refuses a top off the layer grid with E_SCHEMA and an edge wider than the outline with E_UNSAT", async () => {
    expect(await code(build([OUTER], TEST_GRID, [0, 9.95]))).toBe("E_SCHEMA");
    const small: Ring = rrectRing(rrect(0, 0, 2, 2, 0), 4);
    expect(await code(prismWithEdges({ outline: [small], z: [0, H], edge: { top: { kind: "round", size: 3 } }, machine: TEST_GRID, profile }))).toBe("E_UNSAT");
  });
});
