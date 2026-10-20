// R1-engine-08: the sweep mesher. A 32 point circle r 2 swept along a
// 90 deg arc of radius 20 in XZ in 48 steps, the geometry-strategy.md row
// 5a case (fab-knowledge:evidence/geom-proto-2026-10-20/proto.mjs lines
// 117 to 136; the prototype measured -0.0121 percent). The volume is held
// to Pappus on the section polygon, area times the arc its centroid runs
// (computed); the chords of the polyline path put the mesh under it. The
// helix test reads the frame off
// the mesh vertices and the helix tangent from its closed form, so it
// fails when the frame is not transported.

import { describe, expect, it } from "vitest";
import type { Ring, Vec2, Vec3 } from "@hackbuild/spec";
import { audit, loadManifold, meshHash, snap, sweepMesh, withScope, type MeshData } from "../src/index.js";

const SR = 2, NP = 32, PR = 20, NS = 48;
const CIRCLE: Ring = Array.from({ length: NP }, (_, i) => {
  const a = (2 * Math.PI * i) / NP;
  return [SR * Math.cos(a), SR * Math.sin(a)] as Vec2;
});
const ARC: Vec3[] = Array.from({ length: NS + 1 }, (_, j) => {
  const t = (Math.PI / 2) * (j / NS);
  return [PR * Math.cos(t), 0, PR * Math.sin(t)] as Vec3;
});
/** Pappus over a quarter turn, mm3: the 32-gon area times its centroid's arc (computed). */
const PAPPUS = 0.5 * NP * SR * SR * Math.sin((2 * Math.PI) / NP) * PR * (Math.PI / 2);

async function solidOf(m: MeshData): Promise<{ status: string; genus: number; volume: number }> {
  const wasm = await loadManifold();
  return withScope((scope) => {
    const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(m.positions), triVerts: Uint32Array.from(m.triangles) });
    mesh.merge();
    const s = scope.own(new wasm.Manifold(mesh));
    return { status: s.status(), genus: s.genus(), volume: s.volume() };
  });
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const across = (a: Vec3, t: Vec3): Vec3 => {
  const k = dot(a, t);
  const p: Vec3 = [a[0] - k * t[0], a[1] - k * t[1], a[2] - k * t[2]];
  const l = Math.hypot(...p);
  return [p[0] / l, p[1] / l, p[2] / l];
};

/** v rotated by the least rotation that takes unit a to unit b. */
const rotate = (v: Vec3, a: Vec3, b: Vec3): Vec3 => {
  const k = cross(a, b);
  const sn = Math.hypot(...k), cs = dot(a, b);
  if (sn < 1e-15) return v;
  const u: Vec3 = [k[0] / sn, k[1] / sn, k[2] / sn];
  const uv = cross(u, v), ud = dot(u, v);
  return [0, 1, 2].map((i) => v[i]! * cs + uv[i]! * sn + u[i]! * ud * (1 - cs)) as unknown as Vec3;
};

describe("sweepMesh", () => {
  it("circle r 2 along a 90 deg arc of radius 20: within 0.05 percent of Pappus, NoError, genus 0 (computed)", async () => {
    const m = sweepMesh(CIRCLE, ARC);
    const s = await solidOf(m);
    expect(s.status).toBe("NoError");
    expect(s.genus).toBe(0);
    expect(Math.abs(s.volume - PAPPUS) / PAPPUS).toBeLessThan(5e-4);
    expect(audit(m).ok).toBe(true);
    for (const v of m.positions) expect(v).toBe(snap(v));
  });

  it("gives one mesh hash over two runs", () => {
    expect(meshHash(sweepMesh(CIRCLE, ARC))).toBe(meshHash(sweepMesh(CIRCLE, ARC)));
  });

  it("helix r 10, pitch 10, two turns: the section turns under 1 deg about the path (computed)", async () => {
    const A = 10, C = 10 / (2 * Math.PI), STEPS = 192;
    const th = (j: number): number => (4 * Math.PI * j) / STEPS;
    const path = Array.from({ length: STEPS + 1 }, (_, j) => [A * Math.cos(th(j)), A * Math.sin(th(j)), C * th(j)] as Vec3);
    const L = Math.hypot(A, C);
    const tangent = (j: number): Vec3 => [(-A * Math.sin(th(j))) / L, (A * Math.cos(th(j))) / L, C / L];
    // vertex 0 sits on the section's +u axis, so it points along the frame normal
    const section: Ring = [[1.5, 0], [0, 0.5], [-1.5, 0], [0, -0.5]];
    const m = sweepMesh(section, path);
    expect(m.positions.length).toBe((STEPS + 1) * section.length * 3);
    const s = await solidOf(m);
    expect(s.status).toBe("NoError");
    expect(s.genus).toBe(0);
    const normal = (j: number): Vec3 => sub([m.positions[j * 12]!, m.positions[j * 12 + 1]!, m.positions[j * 12 + 2]!], path[j]!);
    // reference transport: the least rotation taking tangent j to tangent j + 1 (Rodrigues), applied to normal j
    let twist = 0;
    for (let j = 0; j < STEPS; j++) {
      const t0 = tangent(j), t = tangent(j + 1);
      const a = rotate(across(normal(j), t0), t0, t);
      const b = across(normal(j + 1), t);
      twist += Math.atan2(dot(cross(a, b), t), dot(a, b));
    }

    expect(Math.abs(twist) * (180 / Math.PI)).toBeLessThan(1);
  });

  it("refuses a one point path and a repeated point with E_SCHEMA", () => {
    const code = (fn: () => unknown): string | undefined => {
      try {
        fn();
      } catch (e) {
        return (e as { hbf?: { code: string } }).hbf?.code;
      }
      return undefined;
    };
    expect(code(() => sweepMesh(CIRCLE, [[0, 0, 0]]))).toBe("E_SCHEMA");
    expect(code(() => sweepMesh(CIRCLE, [[0, 0, 0], [0, 0, 0], [0, 0, 5]]))).toBe("E_SCHEMA");
  });
});
