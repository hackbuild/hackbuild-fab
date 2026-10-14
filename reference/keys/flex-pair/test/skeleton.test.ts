// M-S-T04 skeleton test: the keys flex-pair build through the draft kinds
// of skeleton-kinds.ts, meshed on manifold-3d (revolve bodies through the
// M00-T05 route), read for the split contact column under the cTPU cap of
// the PIP flex cone key (D-223). Numbers below are computed from the build
// at the stated params; the layer grid is read from the profile seed.

import { readFileSync } from "node:fs";
import Module from "manifold-3d";
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  MESH_GRID_PER_MM,
  type Author, type BodyDraft, type BuildWarning, type ConductorFeature, type ContactFeature, type Feature,
  type FitClassId, type KernelCtx, type MachineView, type PartDraft, type Ring, type ShapeDecl, type Vec2,
} from "@hackbuild/spec";
import { createProfileLookup, layerIndex, layerTop, snapLayer, tablesFromSeed } from "@hackbuild/profile";
import { revolveShape } from "@hackbuild/mesh";
import { build } from "../build";
import { chase, type FlexPairParams } from "../chase";
import { SKELETON_KINDS, conductorDef, generateSkeleton, pocketDef } from "../skeleton-kinds";

const GRID = 1 / MESH_GRID_PER_MM;
const q = (v: number): number => Math.round(v * MESH_GRID_PER_MM) / MESH_GRID_PER_MM;

const seed: unknown = JSON.parse(readFileSync(new URL("../../../../packages/profile/seed/profile.seed.json", import.meta.url), "utf8"));
const profile = createProfileLookup(tablesFromSeed(seed));
type LayerGrid = { readonly layer: number; readonly firstLayer: number; readonly lineWidth: number };
const viewOf = (preset: LayerGrid): MachineView => ({
  id: "ffc5p",
  layerHeight: preset.layer,
  firstLayer: preset.firstLayer,
  lineWidth: preset.lineWidth,
  layer: (z) => snapLayer(preset, z),
  layerTop: (i) => layerTop(preset, i),
  layerIndex: (z) => layerIndex(preset, z),
  line: (n) => n * preset.lineWidth,
});
const machine: MachineView = viewOf(profile.preset("ffc5p"));
// The 0.25 nozzle preset of the profile data (layer 0.12, first layer 0.1).
const machines = JSON.parse(readFileSync(new URL("../../../../packages/profile/data/machines.json", import.meta.url), "utf8")) as
  { machines: { presets: (LayerGrid & { id: string })[] }[] };
const fine = machines.machines.flatMap((m) => m.presets).find((p) => p.id === "ffc5p-n025_20260819");

// ---- a test Author: the M00 kernel ships the real one ----

const circlePts = (r: number, at: Vec2 = [0, 0], segments = 64): Ring =>
  Array.from({ length: segments }, (_, i) => {
    const a = (2 * Math.PI * i) / segments;
    return [q(at[0] + r * Math.cos(a)), q(at[1] + r * Math.sin(a))] as const;
  });

const roundRect = (w: number, h: number, r: number, at: Vec2 = [0, 0]): Ring => {
  if (r <= 0) return [[at[0] - w / 2, at[1] - h / 2], [at[0] + w / 2, at[1] - h / 2], [at[0] + w / 2, at[1] + h / 2], [at[0] - w / 2, at[1] + h / 2]];
  const corners: readonly Vec2[] = [[w / 2 - r, -h / 2 + r], [w / 2 - r, h / 2 - r], [-w / 2 + r, h / 2 - r], [-w / 2 + r, -h / 2 + r]];
  const out: Vec2[] = [];
  corners.forEach(([cx, cy], c) => {
    for (let i = 0; i <= 8; i += 1) {
      const a = ((c - 1 + i / 8) * Math.PI) / 2;
      out.push([q(at[0] + cx + r * Math.cos(a)), q(at[1] + cy + r * Math.sin(a))]);
    }
  });
  return out;
};

function testAuthor(view: MachineView = machine): { k: Author; warnings: BuildWarning[] } {
  const warnings: BuildWarning[] = [];
  const unused = (name: string) => () => { throw new Error(`${name} is outside the M-S slice`); };
  const k: Author = {
    profile,
    machine: () => view,
    ring: { roundRect, circle: circlePts, offset: unused("ring.offset") },
    body: (id, o) => ({ id, role: o.role, slot: o.slot, base: o.base, material: o.material ?? chase.materials.find((m) => m.slot === o.slot)?.material ?? "" }),
    part: (o) => ({ ...o, frame: { originOnAxis: false, carriesOffset: false, pose: "print", ...o.frame } }) as ReturnType<Author["part"]>,
    fit: (id) => id as FitClassId,
    derive: (_id, value) => value,
    bind: (f) => f,
    warn: (code, text) => { warnings.push({ code, text }); },
    face: (id, frame) => ({ id, frame }),
    applied: () => [],
    arch: unused("arch"),
    mech: unused("mech"),
  };
  return { k, warnings };
}

async function runBuild(params: FlexPairParams, view: MachineView = machine): Promise<{ part: PartDraft; warnings: BuildWarning[] }> {
  const { k, warnings } = testAuthor(view);
  const part = (await build(params, k)) as PartDraft;
  return { part, warnings };
}

const defaults = (keys: FlexPairParams["keys"]): FlexPairParams => ({ W: 60, H: 30, r: 4, keys, w: 1.4, pads: "clip" });
const presetParams = (id: string): FlexPairParams => {
  const row = chase.presets.find((p) => p.id === id);
  if (row === undefined) throw new Error(`no preset ${id}`);
  return defaults(row.params.keys.map((key) => ({ ...key })));
};

const ctxFor = (part: PartDraft): KernelCtx => {
  const pad = part.bodies.find((b) => b.id === "pad") as BodyDraft;
  return { profile, route: pad.base.route, process: part.process, machineView: machine, body: pad, faces: part.faces ?? [] };
};

// ---- meshing ShapeDecls on manifold-3d, every object freed ----

let wasm: ManifoldToplevel;
let live: { delete(): void }[] = [];
const own = <T extends { delete(): void }>(x: T): T => { live.push(x); return x; };

beforeAll(async () => {
  wasm = await Module();
  wasm.setup();
});
afterAll(() => {
  for (const x of live) x.delete();
  live = [];
});

function section(rings: readonly Ring[]): CrossSection {
  return own(new wasm.CrossSection(rings.map((r) => r.map(([x, y]) => [q(x), q(y)] as [number, number])), "EvenOdd"));
}

function solid(shape: ShapeDecl): Manifold {
  switch (shape.route) {
    case "prism":
      return own(own(section(shape.outline).extrude(q(shape.z[1]) - q(shape.z[0]))).translate([0, 0, q(shape.z[0])]));
    case "stack":
      return own(wasm.Manifold.union(shape.bands.map((b) => solid({ route: "prism", outline: b.outline, z: b.z }))));
    case "revolve": {
      const m = revolveShape(shape);
      const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(m.positions), triVerts: Uint32Array.from(m.triangles) });
      mesh.merge();
      return own(new wasm.Manifold(mesh));
    }
    case "csg": {
      const parts = shape.of.map(solid);
      if (shape.op === "union") return own(wasm.Manifold.union(parts));
      if (shape.op === "intersection") return own(wasm.Manifold.intersection(parts));
      return own(wasm.Manifold.difference(parts));
    }
    default:
      throw new Error(`route ${shape.route} is outside the M-S slice`);
  }
}

function conductorSolid(part: PartDraft, id: string): Manifold {
  const f = part.features.find((x) => x.id === id) as ConductorFeature | undefined;
  if (f === undefined) throw new Error(`no feature ${id}`);
  const g = conductorDef.generate(f, ctxFor(part));
  return own(wasm.Manifold.union(g.bodies.map((b) => solid(b.shape))));
}

// ---- 2D clearance between nets, from the generated footprints ----

function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function ringDist(r1: Ring, r2: Ring): number {
  let best = Infinity;
  for (const [ra, rb] of [[r1, r2], [r2, r1]] as const) {
    for (const p of ra) {
      rb.forEach((a, i) => { best = Math.min(best, segDist(p, a, rb[(i + 1) % rb.length] ?? a)); });
    }
  }
  return best;
}

function footprints(part: PartDraft): { net: string; id: string; ring: Ring }[] {
  const out: { net: string; id: string; ring: Ring }[] = [];
  for (const f of part.features) {
    if (f.kind !== "conductor") continue;
    for (const b of conductorDef.generate(f, ctxFor(part)).bodies) {
      const prism = b.shape.route === "csg" ? b.shape.of[0] : b.shape;
      if (prism?.route !== "prism") throw new Error(`unexpected route on ${f.id}`);
      out.push({ net: f.net, id: f.id, ring: prism.outline[0] ?? [] });
    }
  }
  return out;
}

function minClearance(part: PartDraft): { mm: number; between: string } {
  const fps = footprints(part);
  let best = { mm: Infinity, between: "" };
  fps.forEach((a, i) => {
    for (const b of fps.slice(i + 1)) {
      if (a.net === b.net) continue;
      const d = ringDist(a.ring, b.ring);
      if (d < best.mm) best = { mm: d, between: `${a.id} to ${b.id}` };
    }
  });
  return best;
}

// ---- the column read ----

interface KeyRead { coneR: number; pocketR: number; colTop: number; capUnder: number; gap: number; halves: { k: [number, number]; g: [number, number]; zLo: number }; touching: number }

function readKey(part: PartDraft, n: number): KeyRead {
  const contact = part.features.find((f) => f.id === `contact.key${n}`) as ContactFeature;
  const kHalf = conductorSolid(part, contact.a);
  const gHalf = conductorSolid(part, contact.b);
  const column = own(wasm.Manifold.union([kHalf, gHalf]));
  const cb = column.boundingBox();
  const body = (id: string): Manifold => solid((part.bodies.find((b) => b.id === id) as BodyDraft).base);
  const cap = body(`cap${n}`);
  const cone = body(`cone${n}`);
  // The cap material above the column footprint, read from the mesh.
  const footprint = own(own(own(column.project()).extrude(100)).translate([0, 0, cb.max[2]]));
  const over = own(wasm.Manifold.intersection([cap, footprint]));
  const coneBox = cone.boundingBox();
  const pocket = part.features.find((f) => f.id === `pocket.key${n}`);
  if (pocket?.kind !== "pocket") throw new Error(`no pocket.key${n}`);
  const xs = pocket.outline.map((pt) => pt[0]);
  const kb = kHalf.boundingBox();
  const gb = gHalf.boundingBox();
  return {
    coneR: (coneBox.max[0] - coneBox.min[0]) / 2,
    pocketR: (Math.max(...xs) - Math.min(...xs)) / 2,
    colTop: cb.max[2],
    capUnder: over.boundingBox().min[2],
    gap: contact.gap ?? NaN,
    halves: { k: [kb.min[0], kb.max[0]], g: [gb.min[0], gb.max[0]], zLo: Math.min(kb.min[2], gb.min[2]) },
    touching: own(wasm.Manifold.intersection([column, cap])).volume() + own(wasm.Manifold.intersection([column, cone])).volume()
      + own(wasm.Manifold.intersection([kHalf, gHalf])).volume(),
  };
}

describe("keys flex-pair through the draft kinds (M-S-T04)", () => {
  test("every feature of preset two generates through the skeleton registry", async () => {
    const { part } = await runBuild(presetParams("two"));
    const ctx = ctxFor(part);
    const kinds = new Set(part.features.map((f: Feature) => f.kind));
    expect([...kinds].sort()).toEqual(Object.keys(SKELETON_KINDS).sort());
    for (const f of part.features) {
      const g = generateSkeleton(f, ctx);
      expect(g.preUnionCutters).toEqual([]);
    }
    const pocket = part.features.find((f) => f.kind === "pocket");
    if (pocket?.kind !== "pocket") throw new Error("no pocket");
    expect(pocketDef.generate(pocket, ctx).postUnionCutters).toHaveLength(1);
    for (const def of Object.values(SKELETON_KINDS)) {
      expect(def.reference).toEqual(["keys/flex-pair"]);
      expect(def.checks.length).toBeGreaterThan(0);
    }
  });

  test.each([
    ["preset one", presetParams("one")],
    ["preset two", presetParams("two")],
    // cone 3.6 and face 10 put the pad top 0.18 mm over the flex need, so
    // PIP's snapN lifts the key floor one layer and the pocket under the cone opens (computed).
    ["cone 3.6, travel 1.6", defaults([{ x: 0, d: 10, cone: 3.6, gap: 1.6 }])],
  ])("column top to cap underside equals the gap param to 1/1024 mm, %s", async (_label, params) => {
    const { part, warnings } = await runBuild(params);
    expect(warnings.map((w) => w.code)).toEqual([]);
    const lifted = params.keys.map((_key, i) => part.features.some((f) => f.id === `pocket.key${i + 1}under`));
    expect(lifted).toEqual(params.keys.map((key) => key.cone === 3.6));
    params.keys.forEach((key, i) => {
      const r = readKey(part, i + 1);
      const measured = r.capUnder - r.colTop;
      console.log(`key ${i + 1}: column top ${r.colTop.toFixed(5)} mm, cap underside ${r.capUnder.toFixed(5)} mm, `
        + `gap ${measured.toFixed(5)} mm against param ${key.gap} mm (computed from the mesh)`);
      expect(r.gap).toBe(key.gap);
      expect(Math.abs(measured - key.gap)).toBeLessThanOrEqual(GRID);
      // The split: one half each side of x, 0.8 mm apart, both rising from the trace band.
      expect(r.halves.k[0] - r.halves.g[1]).toBeCloseTo(0.8, 2);
      expect(r.halves.g[1]).toBeLessThan(key.x);
      expect(r.halves.k[0]).toBeGreaterThan(key.x);
      expect(r.halves.zLo).toBeCloseTo(q(machine.layer(0.72)), 6);
      // The well is the cone base plus 0.6 mm (PIP wellR = rsb + 0.6).
      expect(Math.abs(r.coneR + 0.6 - r.pocketR)).toBeLessThanOrEqual(2 * GRID);
      expect(r.touching).toBe(0);
    });
  });

  test("net clearance on the new layout stays above the 0.60 mm floor (computed)", async () => {
    for (const id of ["one", "two"]) {
      const { part } = await runBuild(presetParams(id));
      const c = minClearance(part);
      console.log(`preset ${id}: least net-to-net clearance ${c.mm.toFixed(3)} mm, ${c.between} (computed)`);
      expect(c.mm).toBeGreaterThanOrEqual(0.6);
    }
  });

  test("every numeric default lands on its step from the range minimum (G-09, TESTING.md param ranges)", () => {
    type Field = { readonly id: string; readonly type: string; readonly range?: readonly [number, number]; readonly step?: number; readonly default?: unknown; readonly item?: readonly Field[] };
    const fields: Field[] = [];
    const walk = (fs: readonly Field[]): void => { for (const f of fs) { fields.push(f); if (f.item) walk(f.item); } };
    for (const g of chase.params) walk(g.fields as readonly Field[]);
    const stepped = fields.filter((f) => f.range !== undefined && typeof f.default === "number");
    expect(stepped.map((f) => f.id).sort()).toEqual(["H", "W", "cone", "d", "gap", "r", "w", "x"]);
    for (const f of stepped) {
      const [lo, hi] = f.range!;
      const v = f.default as number;
      expect(v, f.id).toBeGreaterThanOrEqual(lo);
      expect(v, f.id).toBeLessThanOrEqual(hi);
      if (f.step === undefined) continue;
      const n = (v - lo) / f.step;
      expect(Math.abs(n - Math.round(n)), `${f.id}: (${v} - ${lo}) / ${f.step} = ${n}`).toBeLessThan(1e-9);
    }
  });

  test("the face disc stays faceT 1.2 mm thick on a 0.12 mm layer preset (computed)", async () => {
    if (fine === undefined) throw new Error("no ffc5p-n025_20260819 preset in machines.json");
    expect(fine.layer).toBe(0.12);
    for (const view of [machine, viewOf(fine)]) {
      const { part } = await runBuild(presetParams("one"), view);
      const top = part.bodies.find((b) => b.id === "top1") as BodyDraft;
      if (top.base.route !== "revolve") throw new Error("top1 is not revolved");
      const prof = top.base.profile;
      // [rFace, zA + flare] to [rFace, zf + keyH] is the face disc rim.
      expect((prof[4]?.[1] ?? 0) - (prof[3]?.[1] ?? 0), `layer ${view.layerHeight}`).toBeCloseTo(1.2, 9);
    }
  });

  test("the column is PIP's 40-sided circle, split at x +- 0.4 (src/model.js line 65)", async () => {
    const { part } = await runBuild(presetParams("one"));
    const f = part.features.find((x) => x.id === "conductor.key1col") as ConductorFeature;
    if (!("path" in f.region)) throw new Error("column half has no path");
    const onCircle = f.region.path.filter(([x, y]) => Math.abs(Math.hypot(x, y) - 1.6) < 2 * GRID && x > 0.4 + GRID);
    const angles = onCircle.map(([x, y]) => Math.atan2(y, x)).sort((u, v) => u - v);
    const steps = angles.slice(1).map((t, i) => t - angles[i]!);
    for (const a of steps) expect(a).toBeCloseTo((2 * Math.PI) / 40, 3);
    expect(onCircle).toHaveLength(17);
  });

  test("defaults read 1.92 mm printed travel and a medium feel (computed)", async () => {
    const { part } = await runBuild(presetParams("one"));
    const metric = (id: string) => part.metrics?.find((x) => x.id === id);
    // colTop 4.65 lies under the mid-height 4.69 of the layer 4.45 to 4.81,
    // so the column ends at 4.57; the cap underside is 6.49 (computed).
    expect(metric("keys.1.travel")?.value).toBe(1.84);
    expect(metric("keys.1.printedTravel")?.value).toBeCloseTo(1.92, 9);
    // PIP's feel: wall across 0.6 / cos 40 over the cone param 4.0 (bench/part3.js line 429).
    expect(metric("keys.1.feel")?.value).toBeCloseTo(0.6 / Math.cos((40 * Math.PI) / 180) / 4, 3);
    expect(metric("keys.1.feel")?.note).toMatch(/^medium:/);
  });

  test("key and bus trace lengths are unchanged by the flex key (computed)", async () => {
    const { part } = await runBuild(presetParams("one"));
    const len = (id: string): number => {
      const f = part.features.find((x) => x.id === id) as ConductorFeature;
      if (!("centreline" in f.region)) throw new Error(`${id} has no centreline`);
      const c = f.region.centreline;
      return c.slice(1).reduce((s, b, i) => s + Math.hypot(b[0] - (c[i] ?? b)[0], b[1] - (c[i] ?? b)[1]), 0);
    };
    expect(len("conductor.key1")).toBe(15);
    expect(len("conductor.gnd")).toBe(30);
  });
});
