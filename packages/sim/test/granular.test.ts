// M02-T05: scene granular-funnel. Expected values come from outside the
// code under test: the SLUG params.json copy (fixtures/slug-params.json,
// sha256 pinned to lineage.json), hand-worked lattice coordinates, a BigInt
// Park-Miller recompute, and the committed hash goldens.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { capsuleGeometry, funnelPanel, spawnPos } from "../src/capsule/geometry.js";
import type { WorldParams } from "../src/rapier/index.js";
import {
  GRANULAR_TRIALS, RAPIER_SCENES, funnelPanels, granularFunnelScene, granularRows, liveWorlds, panelCorners,
  runGranularTrial, spawnLattice, spawnVelocities,
} from "../src/rapier/index.js";
import { SLUG_SCENE } from "../scenes/slug.js";

const SIM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(SIM, "..", "..");
const rowsJson = JSON.parse(readFileSync(path.join(SIM, "scenes", "granular-funnel.world.json"), "utf8")) as WorldParams;
const rows = granularRows(rowsJson);
const paramsBytes = readFileSync(path.join(SIM, "test", "fixtures", "slug-params.json"));
const slug = JSON.parse(paramsBytes.toString("utf8")) as {
  fb: number; t: number; cap_d: number; XL: number; XR: number; YB: number; YF: number; z_ceil: number; z_funtop: number;
  fun: { p: number; ang: number; s: number; bL: number; bR: number; tL: number; tR: number }[];
};
const golden = JSON.parse(readFileSync(path.join(SIM, "test", "goldens", "granular-funnel.json"), "utf8")) as { hashes: Record<string, string> };
const lineage = JSON.parse(readFileSync(path.join(ROOT, "lineage.json"), "utf8")) as { id: string; sha256: string; dest: string | null }[];

describe("granular-funnel scene (M02-T05)", () => {
  test("the params fixture is the lineage row's bytes and the rows file copies its values", () => {
    const row = lineage.find((r) => r.id === "slug.params/slug-12");
    expect(createHash("sha256").update(paramsBytes).digest("hex")).toBe(row?.sha256);
    expect(row?.dest).toBe("packages/sim/scenes/granular-funnel.world.json");
    const f = rows.funnel;
    expect([f.fb.value, f.t.value, f.capD.value, f.xl.value, f.xr.value, f.yb.value, f.yf.value, f.zCeil.value, f.zFunTop.value])
      .toEqual([slug.fb, slug.t, slug.cap_d, slug.XL, slug.XR, slug.YB, slug.YF, slug.z_ceil, slug.z_funtop]);
    for (const c of [rows.gravity, rows.timestep, ...Object.values(f)]) expect(c.provenance.source.length, c.id).toBeGreaterThan(10);
  });

  test("panel angle, slope length and bottom and top edges equal the SLUG fun rows to their printed precision", () => {
    const panels = funnelPanels(rows);
    expect(panels.map((p) => p.face)).toEqual(slug.fun.map((r) => r.p));
    panels.forEach((p, i) => {
      const r = slug.fun[i]!;
      expect((p.ang * 180) / Math.PI, `p${p.face} ang`).toBeCloseTo(r.ang, 3);
      expect(p.s, `p${p.face} s`).toBeCloseTo(r.s, 2);
      expect(p.bL, `p${p.face} bL`).toBeCloseTo(r.bL, 9);
      expect(p.bR, `p${p.face} bR`).toBeCloseTo(r.bR, 9);
      expect(p.tL, `p${p.face} tL`).toBeCloseTo(r.tL, 2);
      expect(p.tR, `p${p.face} tR`).toBeCloseTo(r.tR, 2);
    });
  });

  test("every panel's inner face reaches the funnel floor exactly fb from the throat centre and its slab is t thick", () => {
    const floor = slug.z_ceil + slug.t;
    const dir = { 0: [0, 1], 2: [-1, 0], 3: [1, 0] } as const;
    for (const p of funnelPanels(rows)) {
      const c = panelCorners(rows, p);
      const n = dir[p.face];
      const h = (q: number[]) => q[0]! * n[0] + q[1]! * n[1];
      const inner0 = c[1]!, inner1 = c[5]!;
      const at = h(inner0) + ((floor - inner0[2]!) * (h(inner1) - h(inner0))) / (inner1[2]! - inner0[2]!);
      expect(at, `p${p.face} inner face at floor`).toBeCloseTo(slug.fb, 9);
      const outer0 = c[0]!;
      const thick = Math.hypot(h(outer0) - h(inner0), outer0[2]! - inner0[2]!);
      expect(thick, `p${p.face} thickness`).toBeCloseTo(slug.t, 9);
      expect(c).toHaveLength(8);
    }
  });

  test("the lattice puts 16 balls on a 52 mm grid and the last two on the half-pitch layer above", () => {
    const L = spawnLattice(rows);
    expect(L).toHaveLength(18);
    expect(L[0]).toEqual([-152 + 25.4 + 2, -105 + 25.4 + 2, 555]);
    expect(L[3]![0]).toBeCloseTo(-124.6 + 3 * 52, 9);
    expect(L[4]).toEqual([-124.6, -105 + 27.4 + 52, 555]);
    expect(L[16]![0]).toBeCloseTo(-124.6 + 26, 9);
    expect(L[16]![2]).toBe(555 + 52);
    expect(L[17]![0]).toBeCloseTo(-124.6 + 52 + 26, 9);
  });

  test("lateral speeds equal an independent Park-Miller recompute, plus or minus 10 mm/s", () => {
    let s = 7n;
    const draw = (): number => { s = (s * 16807n) % 2147483647n; return Number(s) / 2147483647; };
    const want = Array.from({ length: 18 }, () => [(draw() - 0.5) * 20, (draw() - 0.5) * 20]);
    const got = spawnVelocities(rows, 7);
    got.forEach((v, i) => { expect(v[0]).toBeCloseTo(want[i]![0]!, 9); expect(v[1]).toBeCloseTo(want[i]![1]!, 9); expect(Math.abs(v[0])).toBeLessThan(10); });
    expect(spawnVelocities(rows, 8)).not.toEqual(got);
  });

  test("one port of the funnel and the lattice: the Rapier panels and spawns are the capsule geometry's funnelPanel and spawnPos", () => {
    const geo = capsuleGeometry(SLUG_SCENE.geometry);
    const panels = funnelPanels(rows);
    panels.forEach((p, i) => {
      const f = funnelPanel(SLUG_SCENE.geometry, p.face, geo.zCeilTop);
      expect([p.ang, p.r0, p.s], `p${p.face}`).toEqual([f.ang, f.r0, f.len]);
      expect(p.s, `p${p.face} len`).toBe(geo.funPlanes[i]!.len);
    });
    expect(spawnLattice(rows)).toEqual(Array.from({ length: 18 }, (_, i) => {
      const q = spawnPos(SLUG_SCENE.geometry, i);
      return [q.x, q.y, q.z];
    }));
    const src = readFileSync(path.join(SIM, "src", "rapier", "granular.ts"), "utf8");
    expect(src).not.toContain("Math.atan2(");
    expect(src).not.toContain("Math.floor(");
  });

  test("the slug scene reads its funnel and lattice rows from this rows file and types none of them", () => {
    const f = rows.funnel;
    const g = SLUG_SCENE.geometry;
    expect([g.fb, g.t, g.capD, g.xl, g.xr, g.yb, g.yf, g.zCeil, g.zFunTop, g.thr[0], g.thr[1], g.spawn.pitch, g.spawn.edgeGap, g.spawn.above])
      .toEqual([f.fb, f.t, f.capD, f.xl, f.xr, f.yb, f.yf, f.zCeil, f.zFunTop, f.thrX, f.thrY, f.spawnPitch, f.spawnEdgeGap, f.spawnAboveTop].map((c) => c.value));
    const scene = readFileSync(path.join(SIM, "scenes", "slug.ts"), "utf8");
    for (const k of ["fb", "t", "capD", "xl", "xr", "yb", "yf", "zCeil", "zFunTop", "thr", "pitch", "edgeGap", "above"]) {
      expect(scene, k).not.toMatch(new RegExp(`\\b${k}: \\[?-?\\d`));
    }
  });

  test("a missing funnel row is E_PARAM_MISSING naming the key", () => {
    const { fb: _fb, ...rest } = rows.funnel;
    expect(() => granularRows({ ...rowsJson, funnel: rest } as unknown as WorldParams)).toThrow(
      expect.objectContaining({ hbf: expect.objectContaining({ code: "E_PARAM_MISSING", path: "/funnel/fb" }) }),
    );
  });

  test("the scene registers 30 trials with seeds 1 to 30 and its rows path resolves", () => {
    expect(RAPIER_SCENES).toContain(granularFunnelScene);
    expect(granularFunnelScene.trials.map((t) => t.seed)).toEqual(Array.from({ length: GRANULAR_TRIALS }, (_, i) => i + 1));
    expect(GRANULAR_TRIALS).toBe(30);
    expect(readFileSync(path.join(SIM, granularFunnelScene.worldRows), "utf8")).toContain("sim.timestep");
  });

  test("seeds 1 and 2 end on the committed hashes, 2400 steps, balls stay inside the footprint, live worlds 0", async () => {
    for (const seed of [1, 2]) {
      let seen = 0;
      const ends: { x: number; y: number; z: number }[] = [];
      const o = await runGranularTrial(rowsJson, seed, (w, step) => {
        seen = step;
        if (step === 2400) w.forEachRigidBody((b) => { if (b.isDynamic()) ends.push(b.translation()); });
      });
      expect(o.steps).toBe(2400);
      expect(seen).toBe(2400);
      expect(o.snapshotHash).toBe(golden.hashes[`seed${seed}`]);
      expect(ends).toHaveLength(18);
      const plane = (slug.z_ceil + slug.t) / 1000;
      let below = 0;
      for (const p of ends) {
        // a ball under the mouth plane fell through the 156 mm square mouth; one above rests inside the funnel footprint
        if (p.y < plane) { below += 1; }
        else { expect(p.x).toBeGreaterThan(slug.XL / 1000); expect(p.x).toBeLessThan(slug.XR / 1000); expect(-p.z).toBeGreaterThan(slug.YB / 1000); expect(-p.z).toBeLessThan(slug.YF / 1000); }
      }
      expect(o.ballsBelowMouth).toBe(below);
    }
    expect(golden.hashes["seed1"]).not.toBe(golden.hashes["seed2"]);
    expect(liveWorlds()).toBe(0);
  });
});
