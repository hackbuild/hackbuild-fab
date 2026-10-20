// M00-T05 steps 6 and 7: the D-047 stage runner and Part IR assembly.
// Stage 5 partitions by role priority so bodies never overlap, stage 6
// insets inserts by the profile's coincidence inset, stage 7 lifts the bed
// offset into the item transform, stage 8 hashes bodies, solid, metrics and
// warnings into the part's content hash. buildHash is core's alone, over
// canonical BuildInputs (D-051): the mesh layer never assigns it.

import { describe, expect, it } from "vitest";
import { BUILD_STAGES, type BodyDraft, type PartDraft, type Ring } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  MESH_ROUTE_DEFS, assemblePart, audit, liveCount, loadManifold, partContentHashOf, runStages, signedVolume, stagePart, withScope,
  type MeshData, type RasterMask,
} from "../src/index.js";

const profile = createProfileLookup(loadProfile());
const rect = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const FRAME = { originOnAxis: false, carriesOffset: true, pose: "print" } as const;

function draft(bodies: BodyDraft[], over: Partial<PartDraft> = {}): PartDraft {
  return { id: "fixture", name: "fixture", process: "fdm", machine: "ffc5p", frame: FRAME, bodies, features: [], ...over };
}

const pad: BodyDraft = { id: "pad", role: "body", slot: 1, material: "petg", base: { route: "prism", outline: [rect(0, 0, 30, 20)], z: [0, 3] } };
const trace: BodyDraft = { id: "trace", role: "conductor", slot: 2, material: "cpla", base: { route: "prism", outline: [rect(10, 8, 20, 12)], z: [1, 3] } };

async function overlap(a: MeshData, b: MeshData): Promise<number> {
  const wasm = await loadManifold();
  return withScope((scope) => {
    const m = (x: MeshData) => {
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(x.positions), triVerts: Uint32Array.from(x.triangles) });
      mesh.merge();
      return scope.own(new wasm.Manifold(mesh));
    };
    return scope.own(m(a).intersect(m(b))).volume();
  });
}

describe("stage runner (D-047)", () => {
  it("runs the eight stages in the spec order", async () => {
    const out = await runStages({ draft: draft([pad]), profile });
    expect(out.stages).toEqual([...BUILD_STAGES]);
    expect(liveCount()).toBe(0);
  });

  it("registers every route of the MeshRoute union with its guarantees", () => {
    expect([...MESH_ROUTE_DEFS.keys()].sort()).toEqual(["brep", "csg", "imported", "lathe", "loft", "prism", "raster", "revolve", "stack", "sweep", "trace"]);
    expect(MESH_ROUTE_DEFS.get("raster")!.guarantees).toEqual({ manifold: true, exactZ: true, perSlotDisjoint: true });
    expect(MESH_ROUTE_DEFS.get("stack")!.lowersTo).toBe("prism");
  });

  it("partitions a conductor out of the pad and insets it by the coincidence inset", async () => {
    const out = await runStages({ draft: draft([pad, trace]), profile });
    const [p, t] = out.bodies;
    const d = profile.constant("3mf.coincidenceInset").value;
    // the trace keeps its own outline less the inset, snapped to 1/1024 mm: 10 x 4 shrinks by one grid step per side (computed)
    const g = 1 / 1024;
    expect(d).toBe(0.001);
    expect(t!.volumeMm3).toBeCloseTo((10 - 2 * g) * (4 - 2 * g) * 2, 9);
    expect(p!.volumeMm3).toBeCloseTo(30 * 20 * 3 - 10 * 4 * 2, 9);
    expect(await overlap(p!.mesh, t!.mesh)).toBeLessThan(1e-9);
    for (const b of out.bodies) expect(audit(b.mesh).ok).toBe(true);
    expect(out.warnings.map((w) => w.code)).toEqual(["INSET"]);
    expect(liveCount()).toBe(0);
  });

  it("applies stage 2 to 4 cutters a feature kind supplies", async () => {
    const out = await runStages({
      draft: draft([pad]), profile,
      cutters: { pad: { postUnionCutters: [{ route: "prism", outline: [rect(2, 2, 6, 6)], z: [-1, 4] }], unionPositives: [{ route: "prism", outline: [rect(30 - 1 / 64, 0, 32, 2)], z: [0, 3] }] } },
    });
    // 1800 minus a 4 x 4 through hole plus a 2 x 2 tab (the tab overlaps the pad by 1/64 mm), mm3 (computed)
    expect(out.bodies[0]!.volumeMm3).toBeCloseTo(1800 - 48 + 2 * 2 * 3, 9);
    expect(liveCount()).toBe(0);
  });

  it("lifts the bed offset into the item transform when the frame does not carry it", async () => {
    const moved: BodyDraft = { ...pad, base: { route: "prism", outline: [rect(100, 50, 130, 70)], z: [0, 3] } };
    const out = await runStages({ draft: draft([moved], { frame: { ...FRAME, carriesOffset: false } }), profile });
    expect(out.itemTransform).toEqual([115, 60, 0]);
    const xs = out.bodies[0]!.mesh.positions.filter((_, i) => i % 3 === 0);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([-15, 15]);
    const kept = await runStages({ draft: draft([moved]), profile });
    expect(kept.itemTransform).toEqual([0, 0, 0]);
  });

  it("meshes raster bodies once per layer set; slots disjoint and summing to the solid", async () => {
    const W = 8, H = 6;
    const labels = new Uint8Array(W * H).map((_, p) => ((p % W) < 3 ? 2 : 1));
    const masks: Record<string, RasterMask> = { "hbf://mask/a": { width: W, height: H, labels } };
    const layers = [{ mask: "hbf://mask/a", z: [0, 0.25] as const }, { mask: "hbf://mask/a", z: [0.25, 0.49] as const }];
    const base = { route: "raster", layers, res: 0.5 } as const;
    const out = await runStages({
      draft: draft([
        { id: "art", role: "art", slot: 2, material: "pla", base },
        { id: "field", role: "body", slot: 1, material: "petg", base },
      ]),
      profile, mask: (uri) => masks[uri]!,
    });
    const vols = out.bodies.map((b) => b.volumeMm3);
    const solid = signedVolume(out.solid);
    expect(Math.abs(vols[0]! + vols[1]! - solid)).toBeLessThan(1e-9);
    expect(await overlap(out.bodies[0]!.mesh, out.bodies[1]!.mesh)).toBeLessThan(1e-9);
    expect(out.warnings).toEqual([]);
    // the input mask is never healed in place
    expect(masks["hbf://mask/a"]!.labels).toBe(labels);
  });

  it("builds a revolve body", async () => {
    const out = await runStages({ draft: draft([{ id: "pin", role: "body", slot: 1, material: "petg", base: { route: "revolve", profile: [[0, 0], [3, 0], [3, 8], [0, 8]], segments: 48 } }]), profile });
    expect(audit(out.bodies[0]!.mesh).ok).toBe(true);
  });

  it("refuses a route M00 does not build with E_KERNEL naming where it lands", async () => {
    let hbf: { code: string; hint: string } | undefined;
    try {
      await runStages({ draft: draft([{ ...pad, base: { route: "brep", ops: [] } }]), profile });
    } catch (e) {
      hbf = (e as { hbf?: { code: string; hint: string } }).hbf;
    }
    expect(hbf?.code).toBe("E_KERNEL");
    expect(hbf?.hint).toContain("M14");
    expect(liveCount()).toBe(0);
  });
});

describe("stage runner: one runner for every design (ARCHITECTURE.md 4)", () => {
  const hbfOf = async (f: () => Promise<unknown>): Promise<{ code: string; path?: string } | undefined> => {
    try {
      await f();
    } catch (e) {
      return (e as { hbf?: { code: string; path?: string } }).hbf;
    }
    return undefined;
  };

  it("meshes a csg route: an intersection keeps only the shared volume and names every route it ran", async () => {
    const clipped: BodyDraft = {
      id: "clip", role: "body", slot: 1, material: "petg",
      base: { route: "csg", op: "intersection", of: [pad.base, { route: "prism", outline: [rect(25, 15, 40, 30)], z: [-1, 5] }] },
    };
    const out = await runStages({ draft: draft([clipped]), profile });
    // 5 x 5 x 3, mm3 (computed)
    expect(out.bodies[0]!.volumeMm3).toBeCloseTo(75, 9);
    expect(out.routes).toEqual(["csg", "prism"]);
    expect(liveCount()).toBe(0);
  });

  it("takes feature bodies as stage inputs: appended after the declared bodies, partitioned and inset like them", async () => {
    const lead: BodyDraft = { id: "conductor.lead", role: "conductor", slot: 2, material: "cpla", base: { route: "csg", op: "union", of: [trace.base] } };
    const out = await runStages({ draft: draft([pad]), profile, bodies: [lead] });
    expect(out.bodies.map((b) => b.draft.id)).toEqual(["pad", "conductor.lead"]);
    expect(out.warnings.map((w) => w.text)).toEqual(["conductor.lead: coincidence inset 0.001 mm (inferred) applied at stage 6"]);
    expect(await overlap(out.bodies[0]!.mesh, out.bodies[1]!.mesh)).toBeLessThan(1e-9);
    const dup = await hbfOf(() => runStages({ draft: draft([pad]), profile, bodies: [{ ...lead, id: "pad" }] }));
    expect(dup).toMatchObject({ code: "E_SCHEMA", path: "/features/pad/bodies" });
    const stray = await hbfOf(() => runStages({ draft: draft([pad]), profile, cutters: { nobody: { postUnionCutters: [trace.base] } } }));
    expect(stray).toMatchObject({ code: "E_REF", path: "/cutters/nobody" });
    expect(liveCount()).toBe(0);
  });

  it("orders partition by role priority then declaration, so two overlapping bodies of one role never overlap as parts", async () => {
    const a: BodyDraft = { id: "a", role: "conductor", slot: 2, material: "cpla", base: { route: "prism", outline: [rect(0, 0, 10, 4)], z: [0, 1] } };
    const b: BodyDraft = { id: "b", role: "conductor", slot: 2, material: "cpla", base: { route: "prism", outline: [rect(6, 0, 16, 4)], z: [0, 1] } };
    const out = await runStages({ draft: draft([a, b]), profile });
    const [va, vb] = out.bodies.map((x) => x.volumeMm3);
    expect(await overlap(out.bodies[0]!.mesh, out.bodies[1]!.mesh)).toBeLessThan(1e-9);
    // a keeps the shared 4 x 4 x 1; b loses it, each then inset by one grid step per side (computed)
    expect(va!).toBeGreaterThan(39.9);
    expect(va!).toBeLessThan(40);
    expect(vb!).toBeGreaterThan(23.9);
    expect(vb!).toBeLessThan(24);
    expect(Math.abs(va! + vb! - signedVolume(out.solid))).toBeLessThan(1e-6);
    expect(liveCount()).toBe(0);
  });

  it("insets a revolve insert in its (r, z) profile: an inner wall moves out, so the union with its host stays closed", async () => {
    // a flex ring sunk into the pad, as the flex-pair cone foot: annulus r 2 to 3, z 1 to 4, about (15, 10)
    const ring: BodyDraft = {
      id: "ring", role: "flex", slot: 3, material: "tpu95",
      base: { route: "revolve", axis: { origin: [15, 10, 0], dir: [0, 0, 1] }, segments: 64, profile: [[2, 1], [3, 1], [3, 4], [2, 4]] },
    };
    const out = await runStages({ draft: draft([pad, ring]), profile });
    const m = out.bodies[1]!.mesh;
    const radii: number[] = [];
    for (let i = 0; i < m.positions.length; i += 3) radii.push(Math.hypot(m.positions[i]! - 15, m.positions[i + 1]! - 10));
    // the inner wall sits at 2 + 0.001 mm and the outer at 3 - 0.001 mm, each within one grid step (computed)
    expect(Math.min(...radii)).toBeGreaterThan(2);
    expect(Math.max(...radii)).toBeLessThan(3);
    for (const b of out.bodies) expect(audit(b.mesh).ok).toBe(true);
    expect(await overlap(out.bodies[0]!.mesh, m)).toBeLessThan(1e-9);
    expect(out.warnings.map((w) => w.code)).toEqual(["INSET"]);
    expect(liveCount()).toBe(0);
  });
});

describe("Part IR (D-048, D-049)", () => {
  it("assembles bodies with the solid as their union and moves the content hash with warnings and metrics", async () => {
    const a = await stagePart({ draft: draft([pad, trace]), profile });
    const b = await stagePart({ draft: draft([pad, trace]), profile });
    expect(a.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.contentHash).toBe(b.contentHash);
    // D-051: buildHash is keyed by BuildInputs and assigned only in core
    expect("buildHash" in a.part).toBe(false);
    expect(a.part.bodies.map((x) => [x.id, x.slot, x.role, x.material])).toEqual([["pad", 1, "body", "petg"], ["trace", 2, "conductor", "cpla"]]);
    expect(a.part.source).toEqual({ kind: "kernel", routes: ["prism"] });
    expect(a.part.solid.watertight).toBe(true);
    const sum = a.part.bodies.reduce((s, x) => s + x.mesh.volumeMm3, 0);
    // the stage 6 gap of one grid step around the trace is the only difference (computed)
    expect(Math.abs(a.part.solid.volumeMm3 - sum)).toBeLessThan(1e-9 + 30 * 20 * 3 * 1e-12);
    const warned = await stagePart({ draft: draft([pad, trace], { warnings: [{ code: "CLAMP", text: "trace width raised to 0.8" }] }), profile });
    expect(warned.part.warnings[0]!.code).toBe("CLAMP");
    expect(warned.contentHash).not.toBe(a.contentHash);
    const metric = await stagePart({ draft: draft([pad, trace], { metrics: [{ id: "keys.1.travel", value: 1, unit: "mm", note: "travel", gate: "informational", qualifier: "computed", basis: null } as never] }), profile });
    expect(metric.contentHash).not.toBe(a.contentHash);
    expect(liveCount()).toBe(0);
  });

  it("assemblePart keeps the stage output's solid and bodies", async () => {
    const staged = await runStages({ draft: draft([pad]), profile });
    const built = assemblePart(draft([pad]), staged);
    expect(built.part.solid.volumeMm3).toBe(1800);
    expect(built.part.bodies[0]!.mesh.volumeMm3).toBe(1800);
    expect(built.contentHash).toBe(partContentHashOf(built.part, built.itemTransform));
    expect(Object.keys(built.part)).not.toContain("buildHash");
  });
});
