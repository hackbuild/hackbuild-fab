// R1-engine-07: the junction fillet. A plate 40 x 30 x 4 with a boss r 5
// h 10 on it and a fillet R 2 at the root, the geometry-strategy.md rows 3a
// (stacked offset rings, measured -0.0185 percent) and 3b (revolve profile,
// -0.0071 percent), on a 0.2 mm test grid. The analytic volume is plate plus
// boss plus the fillet's solid of revolution: the ring at height u adds
// pi ((a + f)^2 - a^2), f = R - sqrt(R^2 - (R - u)^2), and the integrals of
// f and f^2 over [0, R] are R^2 (1 - pi/4) and R^3 (5/3 - pi/2), taken by
// hand (computed), never by calling the profile code.

import { beforeAll, describe, expect, it } from "vitest";
import type { MachineView, Ring, Vec2 } from "@hackbuild/spec";
import { circleRing, loadGeom, q, roundCorner, rrect, rrectRing, type Geom } from "@hackbuild/geom";
import { createProfileLookup, layerIndex, layerTop, loadProfile } from "@hackbuild/profile";
import {
  bandOverlap, junctionFillet, liveCount, loadManifold, meshHash, meshOf, prismMesh, revolveShape, stackMesh, unionReport, withScope, type MeshData, type StackShape,
} from "../src/index.js";

const profile = createProfileLookup(loadProfile());
const OVERLAP = bandOverlap(profile);
const TEST_GRID: Pick<MachineView, "layerTop" | "layerIndex"> = {
  layerTop: (i) => layerTop({ firstLayer: 0.2, layer: 0.2 }, i),
  layerIndex: (z) => layerIndex({ firstLayer: 0.2, layer: 0.2 }, z),
};

let geom: Geom;
beforeAll(async () => {
  geom = await loadGeom();
});

const W = 40, L = 30, T = 4, A = 5, H = 10, R = 2;
const PLATE: Ring = rrectRing(rrect(0, 0, W / 2, L / 2, 0), 4);
const boss = (x: number, r = A): Ring => circleRing(r, [x, 0], 128);
const I1 = R * R * (1 - Math.PI / 4);
const I2 = R ** 3 * (5 / 3 - Math.PI / 2);
/** Plate, boss and fillet, mm3 (computed). */
const ANALYTIC = W * L * T + Math.PI * A * A * H + Math.PI * (2 * A * I1 + I2);

async function union(shells: readonly MeshData[]): Promise<{ volume: number; genus: number; tris: number; hash: string }> {
  const wasm = await loadManifold();
  return withScope((scope) => {
    const solids = shells.map((m) => {
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(m.positions), triVerts: Uint32Array.from(m.triangles) });
      mesh.merge();
      return scope.own(new wasm.Manifold(mesh));
    });
    const s = unionReport(solids).solid;
    return { volume: s.volume(), genus: s.genus(), tris: s.numTri(), hash: meshHash(meshOf(s)) };
  });
}

const fillet = (upper: readonly Ring[], r = R, z0 = T): Promise<StackShape> => junctionFillet({ upper, lowerTop: [PLATE], r, z0, machine: TEST_GRID, profile });
const plate = (): readonly MeshData[] => prismMesh(geom, [PLATE], [0, T]).shells;

const code = async (p: Promise<unknown>): Promise<string | undefined> => {
  try {
    await p;
  } catch (e) {
    return (e as { hbf?: { code: string } }).hbf?.code;
  }
  return undefined;
};

describe("junctionFillet", () => {
  it("plate 40 x 30 x 4, boss r 5 h 10, fillet R 2 as stacked rings: volume within 0.04 percent of analytic, genus 0 (computed)", async () => {
    const s = await fillet([boss(0)]);
    const shells = [...plate(), ...prismMesh(geom, [boss(0)], [T, T + H]).shells, ...stackMesh(geom, s.bands, OVERLAP).shells];
    const u = await union(shells);
    const rel = (u.volume - ANALYTIC) / ANALYTIC;
    console.log(`rings: union ${u.volume.toFixed(3)} mm3, analytic ${ANALYTIC.toFixed(3)} mm3, error ${(rel * 100).toFixed(4)} percent, ${s.bands.length} bands, ${u.tris} triangles (computed)`);
    expect(Math.abs(rel)).toBeLessThan(0.0004);
    expect(u.genus).toBe(0);
    expect(s.bands.length).toBe(R / 0.2);
    expect(s.bands[0]!.z[0]).toBeLessThan(T);
    expect(liveCount()).toBe(0);
  });

  it("the same fillet in the boss's revolve profile (roundCorner): volume within 0.04 percent of analytic, genus 0 (computed)", async () => {
    // plate top z 4 out to r 9 (inside the plate), boss wall r 5 to z 14; the root corner (5, 4) is index 3
    const P: Vec2[] = [[0, 2], [9, 2], [9, T], [A, T], [A, T + H], [0, T + H]];
    const profileRows = roundCorner(P, 3, R, 32);
    const rev = revolveShape({ route: "revolve", profile: profileRows, segments: 200 });
    const u = await union([...plate(), rev]);
    const rel = (u.volume - ANALYTIC) / ANALYTIC;
    console.log(`revolve: union ${u.volume.toFixed(3)} mm3, analytic ${ANALYTIC.toFixed(3)} mm3, error ${(rel * 100).toFixed(4)} percent, ${u.tris} triangles (computed)`);
    expect(Math.abs(rel)).toBeLessThan(0.0004);
    expect(u.genus).toBe(0);
  });

  it("clips every ring to the plate: a boss 1 mm from the plate edge leaves no ring outside it", async () => {
    const s = await fillet([boss(W / 2 - A - 1)]);
    const reach = Math.max(...s.bands.flatMap((b) => b.outline[0]!.map(([x]) => x)));
    expect(reach).toBeLessThanOrEqual(W / 2);
    // unclipped, the bottom ring would reach x = 19 + R - sqrt(R^2 - 1.9^2), about 20.38 (computed); clipped, it runs along the plate edge
    expect(s.bands[0]!.outline[0]!.some(([x]) => x === q(W / 2))).toBe(true);
  });

  it("keeps a bore in the upper body open through the fillet", async () => {
    const s = await fillet([boss(0), [...circleRing(2, [0, 0], 64)].reverse() as Ring]);
    for (const b of s.bands) expect(b.outline.length).toBe(2);
  });

  it("gives the same mesh hash across two runs", async () => {
    const a = await union(stackMesh(geom, (await fillet([boss(0)])).bands, OVERLAP).shells);
    const b = await union(stackMesh(geom, (await fillet([boss(0)])).bands, OVERLAP).shells);
    expect(a.hash).toBe(b.hash);
  });

  it("refuses a top off the layer grid with E_SCHEMA and an upper body off the lower top with E_UNSAT", async () => {
    expect(await code(fillet([boss(0)], 2.1))).toBe("E_SCHEMA");
    expect(await code(fillet([boss(100)]))).toBe("E_UNSAT");
    expect(await code(fillet([boss(0)], 0))).toBe("E_SCHEMA");
  });
});
