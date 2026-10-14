// M00-T04 step 4: the audit on raw indices, on grid-keyed coordinates, the
// 1e-14 mm2 degenerate threshold, signed volume and the vertex fan check.

import { describe, expect, it } from "vitest";
import { audit, loadManifold, meshOf, MIN_TRIANGLE_AREA_MM2, scope } from "../src/index.js";
import { cube, inverted, join } from "./fixtures.js";

describe("audit", () => {
  it("passes a clean cube with 0 non-manifold vertices", () => {
    const a = audit(cube());
    expect(a.nonManifoldVertices).toBe(0);
    expect(a).toMatchObject({ openEdgesRaw: 0, openEdges: 0, windingErrors: 0, degenerate: 0, signedVolumeMm3: 1000, ok: true });
  });

  it("passes the cube manifold-3d returns", async () => {
    const wasm = await loadManifold();
    const a = scope(() => audit(meshOf(wasm.Manifold.cube([10, 10, 10]))));
    expect(a.ok).toBe(true);
  });

  it("reports 1 non-manifold vertex (computed) on two cubes touching at one corner", () => {
    const a = audit(join(cube(10), cube(10, [10, 10, 10])));
    console.log(`corner-touching cubes: non-manifold vertices ${a.nonManifoldVertices} (computed), open edges ${a.openEdges}, volume ${a.signedVolumeMm3} mm3 (computed)`);
    expect(a.nonManifoldVertices).toBe(1);
    // Edge pairing alone passes this fixture; only the fan check catches it.
    expect(a.openEdgesRaw).toBe(0);
    expect(a.openEdges).toBe(0);
    expect(a.ok).toBe(false);
  });

  it("finds a shared edge only after the coordinate merge", () => {
    const a = audit(join(cube(10), cube(10, [10, 10, 0])));
    expect(a.openEdgesRaw).toBe(0);
    expect(a.openEdges).toBe(1);
    expect(a.ok).toBe(false);
  });

  it("merges on the grid the caller names: 0.0004 mm apart is one point at 1/1024 mm, two at 1e-8 mm", () => {
    const pair = join(cube(10), cube(10, [10.0004, 0, 0]));
    expect(audit(pair).openEdges).toBeGreaterThan(0);
    expect(audit(pair, { mergeGridPerMm: 1e8 })).toMatchObject({ openEdges: 0, windingErrors: 0, nonManifoldVertices: 0, ok: true });
  });

  it("reports an open mesh, an inside-out mesh and a sliver", () => {
    const c = cube();
    const open = audit({ positions: c.positions, triangles: c.triangles.slice(3) });
    expect(open.openEdgesRaw).toBe(3);
    expect(open.ok).toBe(false);

    const inside = audit(inverted(c));
    expect(inside.signedVolumeMm3).toBe(-1000);
    expect(inside.ok).toBe(false);

    const sliver = cube();
    const p = sliver.positions.slice();
    // Pull vertex 3 onto the line through 0 and 2, so triangle (0, 3, 2) has zero area.
    p.set([5, 5, 0], 9);
    const a = audit({ positions: p, triangles: sliver.triangles });
    expect(MIN_TRIANGLE_AREA_MM2).toBe(1e-14);
    expect(a.degenerate).toBeGreaterThanOrEqual(1);
    expect(a.ok).toBe(false);
  });
});
