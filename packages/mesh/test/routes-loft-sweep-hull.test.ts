// R1-engine-09 (PLAN.md 3.3): the loft and sweep routes and the csg hull op
// in the D-047 stage runner. The fixture build.ts under
// fixtures/loft-sweep-hull runs with a stub author that carries only what it
// calls (body, part, ring.circle from packages/geom), since the kernel
// author package depends on mesh. Every expected volume is computed from
// the shapes' analytic formulas or the shoelace area of the rings the
// fixture declares, never read back from the mesher.

import { describe, expect, it } from "vitest";
import { MESH_GRID_PER_MM, MESH_ROUTES, type Author, type BodyDraft, type PartDraft, type Ring } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { circleRing } from "@hackbuild/geom";
import { MESH_ROUTE_DEFS, liveCount, runStages } from "../src/index.js";
import { TOP, build } from "./fixtures/loft-sweep-hull/build";

const profile = createProfileLookup(loadProfile());

const author = {
  profile,
  ring: { circle: circleRing },
  body: (id: string, o: { role: BodyDraft["role"]; slot: number; base: BodyDraft["base"]; material?: string }): BodyDraft => ({ id, role: o.role, slot: o.slot, material: o.material ?? "petg", base: o.base }),
  part: (o: Omit<PartDraft, "frame"> & { frame: PartDraft["frame"] }): PartDraft => o,
} as unknown as Author;

/** The D-054 snap every mesh vertex takes, mm: heights 10.09 and 5.05 land on 10.08984375 and 5.0498046875 (computed). */
const q = (v: number): number => Math.round(v * MESH_GRID_PER_MM) / MESH_GRID_PER_MM;

/** Shoelace area of a ring, mm2. */
const area = (r: Ring): number => Math.abs(r.reduce((s, [x, y], i) => {
  const [u, v] = r[(i + 1) % r.length]!;
  return s + x * v - u * y;
}, 0)) / 2;

async function staged(h = 5.05) {
  const draft = (await build({ h }, author)) as PartDraft;
  const out = await runStages({ draft, profile });
  return { draft, out, vol: (id: string) => out.bodies.find((b) => b.draft.id === id)!.volumeMm3 };
}

describe("loft, sweep and hull routes (PLAN.md 3.3)", () => {
  it("registers loft and sweep with manifold, not exactZ, not perSlotDisjoint, and one entry per MeshRoute", () => {
    expect([...MESH_ROUTE_DEFS.keys()].sort()).toEqual([...MESH_ROUTES].sort());
    for (const r of ["loft", "sweep"] as const) {
      expect(MESH_ROUTE_DEFS.get(r)).toEqual({ route: r, guarantees: { manifold: true, exactZ: false, perSlotDisjoint: false }, lazy: false });
    }
  });

  it("builds the fixture's three bodies through the stage runner", async () => {
    const { out } = await staged();
    expect(out.bodies.map((b) => b.draft.id)).toEqual(["loft", "sweep", "hull"]);
    expect([...out.routes].sort()).toEqual(["csg", "loft", "prism", "sweep"]);
    expect(liveCount()).toBe(0);
  });

  it("lofts a square frustum to its prismatoid volume (computed)", async () => {
    const { vol } = await staged();
    // h / 3 (A1 + A2 + sqrt(A1 A2)) with A1 = 400, A2 = 100, h = q(10.09): 2354.297 mm3 (computed)
    expect(vol("loft")).toBeCloseTo((q(TOP) / 3) * (400 + 100 + 200), 6);
  });

  it("sweeps the circle section up a straight path to section area times length (computed)", async () => {
    const { vol } = await staged();
    expect(vol("sweep")).toBeCloseTo(area(circleRing(2, [0, 0], 32)) * q(TOP), 6);
  });

  it("hulls two cylinders r 3 at 10 mm centres into a slot within 0.1 percent of slot area times height (computed)", async () => {
    const h = 5.05;
    const { vol } = await staged(h);
    const slot = (Math.PI * 3 * 3 + 2 * 3 * 10) * h;
    expect(Math.abs(vol("hull") - slot) / slot).toBeLessThan(0.001);
    // the 64 segment rings put a vertex at +-3 mm in y, so the hull is the polygon area plus the 6 x 10 band (computed)
    expect(vol("hull")).toBeCloseTo((area(circleRing(3, [0, 30], 64)) + 6 * 10) * q(h), 6);
    // a union of the two cylinders would be two polygon areas, well below the slot
    expect(vol("hull")).toBeGreaterThan(2 * area(circleRing(3, [0, 30], 64)) * h * 1.5);
  });

  it("refuses a stage 6 inset on a loft insert", async () => {
    const { draft } = await staged();
    const loft = draft.bodies[0]!;
    const pad: BodyDraft = { id: "pad", role: "body", slot: 1, material: "petg", base: { route: "prism", outline: [[[-20, -20], [20, -20], [20, 20], [-20, 20]]], z: [0, 12] } };
    await expect(runStages({ draft: { ...draft, bodies: [pad, { ...loft, role: "conductor", slot: 2, material: "cpla" }] }, profile })).rejects.toMatchObject({ hbf: { code: "E_KERNEL", path: "/bodies/1/base", expected: "no stage 6 inset on a loft body" } });
    expect(liveCount()).toBe(0);
  });
});
