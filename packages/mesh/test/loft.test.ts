// R1-engine-08: the loft mesher. Circle r 10 at z 0 to square 16 at z 20,
// 64 points each matched by angle, the geometry-strategy.md row 4 case
// (fab-knowledge:evidence/geom-proto-2026-10-20/proto.mjs lines 108 to 115;
// the prototype measured +0.0013 percent). The volume is held to the
// prismatoid formula h / 6 (A0 + 4 Am + A1), every area by the shoelace
// formula below on the snapped rings, never through the mesher.

import { describe, expect, it } from "vitest";
import type { Ring, Vec2 } from "@hackbuild/spec";
import { audit, loadManifold, loftMesh, meshHash, signedVolume, snap, withScope, type MeshData } from "../src/index.js";

const N = 64, R = 10, HALF = 8, H = 20;
const CIRCLE: Ring = Array.from({ length: N }, (_, i) => {
  const a = (2 * Math.PI * i) / N;
  return [snap(R * Math.cos(a)), snap(R * Math.sin(a))] as Vec2;
});
const SQUARE: Ring = Array.from({ length: N }, (_, i) => {
  const a = (2 * Math.PI * i) / N;
  const x = Math.cos(a), y = Math.sin(a);
  const k = HALF / Math.max(Math.abs(x), Math.abs(y));
  return [snap(x * k), snap(y * k)] as Vec2;
});

const shoelace = (p: readonly Vec2[]): number => {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [a, b] = p[i]!;
    const [c, d] = p[(i + 1) % p.length]!;
    s += a * d - b * c;
  }
  return s / 2;
};
const MID = CIRCLE.map((p, i) => [(p[0] + SQUARE[i]![0]) / 2, (p[1] + SQUARE[i]![1]) / 2] as Vec2);
/** Prismatoid volume, mm3 (computed). */
const PRISMATOID = (H / 6) * (shoelace(CIRCLE) + 4 * shoelace(MID) + shoelace(SQUARE));

async function solidOf(m: MeshData): Promise<{ status: string; genus: number; volume: number }> {
  const wasm = await loadManifold();
  return withScope((scope) => {
    const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(m.positions), triVerts: Uint32Array.from(m.triangles) });
    mesh.merge();
    const s = scope.own(new wasm.Manifold(mesh));
    return { status: s.status(), genus: s.genus(), volume: s.volume() };
  });
}

const code = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as { hbf?: { code: string } }).hbf?.code;
  }
  return undefined;
};

describe("loftMesh", () => {
  it("circle r 10 to square 16 over 20 mm, 64 points: within 0.01 percent of the prismatoid formula, NoError, genus 0 (computed)", async () => {
    const m = loftMesh([{ ring: CIRCLE, z: 0 }, { ring: SQUARE, z: H }]);
    const s = await solidOf(m);
    expect(s.status).toBe("NoError");
    expect(s.genus).toBe(0);
    expect(Math.abs(s.volume - PRISMATOID) / PRISMATOID).toBeLessThan(1e-4);
    expect(audit(m).ok).toBe(true);
    for (const v of m.positions) expect(v).toBe(snap(v));
  });

  it("gives one mesh hash over two runs", () => {
    const a = meshHash(loftMesh([{ ring: CIRCLE, z: 0 }, { ring: SQUARE, z: H }]));
    expect(meshHash(loftMesh([{ ring: CIRCLE, z: 0 }, { ring: SQUARE, z: H }]))).toBe(a);
  });

  it("takes clockwise sections and returns the same outward volume (computed)", () => {
    const cw = (r: Ring): Ring => [r[0]!, ...r.slice(1).reverse()];
    const v = signedVolume(loftMesh([{ ring: cw(CIRCLE), z: 0 }, { ring: cw(SQUARE), z: H }]));
    expect(Math.abs(v - PRISMATOID) / PRISMATOID).toBeLessThan(1e-4);
  });

  it("three sections: the middle row adds no volume when it lies on the ruled surface (computed)", async () => {
    const m = loftMesh([{ ring: CIRCLE, z: 0 }, { ring: CIRCLE.map(([x, y]) => [x, y] as Vec2), z: 7 }, { ring: CIRCLE, z: H }]);
    const s = await solidOf(m);
    expect(s.status).toBe("NoError");
    expect(s.genus).toBe(0);
    expect(Math.abs(s.volume - shoelace(CIRCLE) * H) / (shoelace(CIRCLE) * H)).toBeLessThan(1e-6);
  });

  it("refuses unequal counts, falling z and mixed winding with E_SCHEMA", () => {
    expect(code(() => loftMesh([{ ring: CIRCLE, z: 0 }, { ring: SQUARE.slice(1), z: H }]))).toBe("E_SCHEMA");
    expect(code(() => loftMesh([{ ring: CIRCLE, z: H }, { ring: SQUARE, z: 0 }]))).toBe("E_SCHEMA");
    expect(code(() => loftMesh([{ ring: CIRCLE, z: 0 }, { ring: [...SQUARE].reverse(), z: H }]))).toBe("E_SCHEMA");
    expect(code(() => loftMesh([{ ring: CIRCLE, z: 0 }]))).toBe("E_SCHEMA");
  });
});
