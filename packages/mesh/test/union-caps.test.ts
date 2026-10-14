// D-055 union, the cap candidate: three slabs on one face plane whose edges
// end along one line leave a zero-area triangle with three distinct
// collinear grid vertices in the batch and the fold (THINPOT ladder base:
// the floor, a strip-layer slab and the row filler beside it, laps of 0.01
// to 0.03 mm, all ending on the face x 37.76; feeler_thinpot.html lines
// 4213 on; fixtures/ladder-laps.json). The page hands such slabs to the
// slicer as one object; the kernel's union flips the cap and keeps every
// vertex and the volume.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Ring } from "@hackbuild/spec";
import { loadGeom } from "@hackbuild/geom";
import { MIN_TRIANGLE_AREA_MM2, audit, flipCaps, liveCount, loadManifold, meshOf, prismMesh, signedVolume, snapWeld, unionReport, withScope, type MeshData } from "../src/index.js";
import { toManifold } from "../src/stages.js";

const LAPS = JSON.parse(readFileSync(new URL("./fixtures/ladder-laps.json", import.meta.url), "utf8")) as { slabs: { outline: Ring[]; z: [number, number] }[] };
const gridKeys = (m: MeshData): string[] => Array.from({ length: m.positions.length / 3 }, (_, i) => `${m.positions[i * 3]},${m.positions[i * 3 + 1]},${m.positions[i * 3 + 2]}`);

describe("union caps", () => {
  it("unions the ladder laps through the cap candidate and keeps the batch volume", async () => {
    const wasm = await loadManifold();
    const geom = await loadGeom();
    const got = withScope((scope) => {
      const solids = LAPS.slabs.map((s, i) => toManifold(wasm, scope, prismMesh(geom, s.outline, s.z).mesh, `/slabs/${i}`));
      const batch = scope.own(wasm.Manifold.union(solids));
      const r = unionReport(solids);
      return { via: r.via, batch: meshOf(batch), mesh: meshOf(r.solid) };
    });
    // the plain batch holds a cap: a zero-area triangle on three distinct vertices
    expect(audit(got.batch).degenerate).toBe(1);
    expect(audit(snapWeld(got.batch)).degenerate).toBe(1);
    expect(got.via).toBe("capped");
    expect(audit(got.mesh).ok).toBe(true);
    // the flip changes triangles only: same vertices, same volume
    expect(new Set(gridKeys(got.mesh))).toEqual(new Set(gridKeys(got.batch)));
    expect(signedVolume(got.mesh)).toBeCloseTo(signedVolume(got.batch), 9);
    expect(liveCount()).toBe(0);
  });

  it("flips a cap into its neighbour without moving a vertex", () => {
    // a unit square split at x 0.5 on its bottom edge into a cap (0,0)-(1,0)-(0.5,0) and the rest,
    // closed into a tetrahedron-free check by edge pairs only
    const positions = Float64Array.from([0, 0, 0, 1, 0, 0, 0.5, 0, 0, 0.5, 1, 0]);
    const cap: MeshData = { positions, triangles: Uint32Array.from([0, 1, 2, 1, 0, 3]) };
    const out = flipCaps(cap);
    expect(out).not.toBeNull();
    expect(Array.from(out!.positions)).toEqual(Array.from(positions));
    const tris = Array.from(out!.triangles);
    // the long edge 0 to 1 is gone; the neighbour is split at the middle vertex 2
    expect(tris).toEqual([1, 2, 3, 2, 0, 3]);
    for (let i = 0; i < tris.length; i += 3) {
      const [a, b, c] = [tris[i]!, tris[i + 1]!, tris[i + 2]!];
      const ux = positions[b * 3]! - positions[a * 3]!, uy = positions[b * 3 + 1]! - positions[a * 3 + 1]!;
      const vx = positions[c * 3]! - positions[a * 3]!, vy = positions[c * 3 + 1]! - positions[a * 3 + 1]!;
      expect(Math.abs(ux * vy - uy * vx) / 2).toBeGreaterThan(MIN_TRIANGLE_AREA_MM2);
    }
  });
});
