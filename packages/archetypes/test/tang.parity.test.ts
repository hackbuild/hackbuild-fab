// M06-T09: the TANG R6 archetypes regenerate the original's numbers and
// bodies. Expected values come from test/legacy/tang.json, written by
// scripts/tang-legacy.mjs from originals/tang-r6 (r6_4, D-222); the test
// checks the record's source hashes against the files on disk, so a stale
// record fails here.
//
// Rows: the original prices cPLA at 30 ohm cm, the shipped Proto-pasta row,
// and cTPU at 1500 with TPU at E 30 MPa (03_design.js line 30), which no
// profile row holds; the test builds those two in memory from the record's
// defaults (never the profile data files), as resistance.test.ts builds
// the BOSS row.
//
// Bodies: each declaration is meshed here without the D-054 snap and the
// D-070 inset (kernel stages applied after the archetype), as the original
// meshes its own regions: prisms extruded, csg by manifold, then the slot
// order the original overwrites in (conductive TPU, TPU, conductive PLA,
// PLA). Per slot volume within 1e-3 mm3 and bounding box within 1e-6 mm of
// the original's union area times band height.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { loadManifold } from "@hackbuild/mesh";
import type { ApplyOut, Material, ProfileLookup, ResistivityRow, ShapeDecl } from "@hackbuild/spec";
import { solidOf } from "./mesh-decl.js";
import { NECK_DEFAULTS, POT_DEFAULTS, archetypes, neckApply, potApply, shippedProfile } from "@hackbuild/archetypes";
import { originalPath } from "../../../tools/test-support/originals-root.js";

interface Solid { volume: number; bbox: { min: [number, number, number]; max: [number, number, number] } }
type Solids = Record<string, Solid>;
interface Check { kind: string; text: string }
const LEG = JSON.parse(readFileSync(new URL("legacy/tang.json", import.meta.url), "utf8")) as {
  sources: Record<string, Record<string, string>>;
  defaults: { mat: { cplaXY: number; ctpu: number; tpuE: number }; layer: number };
  neck: { dims: Record<string, number>; readouts: Record<string, number>; checks: Check[]; solids: Solids };
  pot: {
    readouts: Record<string, number>; info: { x: number; y: number; e3: number[]; eG: number[]; wv: number[] }[];
    tracks: Solids[]; stops: Solids[]; rotor: Record<string, number> & { solids: Solids }; cap: { height: number; solids: Solids }; checks: Check[];
  };
};
const ORIG = originalPath("tang-r6/files/");

/** The shipped profile with TANG's cTPU row and TPU modulus (03_design.js line 30) in memory. */
function tangProfile(): ProfileLookup {
  const p = shippedProfile();
  const src = "originals/tang-r6/files/src/03_design.js line 30 (S.mat), via test/legacy/tang.json defaults";
  const ctpu: ResistivityRow = { id: "ctpu.tang-r6", direction: "bulk", ohmCm: LEG.defaults.mat.ctpu, form: "printed", brand: "TANG R6", provenance: { tier: "inferred", method: "derived", date: "2026-10-09", source: src } };
  return new Proxy(p, {
    get: (t, k) => {
      if (k === "resistivity") return (m: string, d: ResistivityRow["direction"], f: "printed" | "molded") => (m === "ctpu" ? ctpu : t.resistivity(m, d, f));
      if (k === "material") return (id: string): Material => (id === "tpu95" ? { ...t.material(id), modulusMPa: LEG.defaults.mat.tpuE } : t.material(id));
      return Reflect.get(t, k);
    },
  });
}
const P = tangProfile();

describe("the record is the original's", () => {
  test("source hashes equal the files on disk; the original prices cPLA as the Proto-pasta row", () => {
    for (const [f, sha] of Object.entries(LEG.sources["tang-r6"] ?? {})) {
      const at = f.endsWith(".html") ? `${ORIG}${f}` : `${ORIG}src/${f}`;
      expect(createHash("sha256").update(readFileSync(at)).digest("hex"), f).toBe(sha);
    }
    expect(P.resistivity("cpla-protopasta", "along", "printed").ohmCm).toBe(LEG.defaults.mat.cplaXY);
    expect(LEG.defaults.layer).toBe(P.machine("ffc5p").presets[0]!.layer);
  });
});

describe("readouts", () => {
  test("membrane slider: track 357955, leads 1500 and 37167, wiper 9292 ohm, about 2.2 N, track 210 mm", () => {
    const d = archetypes.resolve("membrane-slider-wall").def.derive(NECK_DEFAULTS, P);
    const r = LEG.neck.readouts;
    expect(d["R.track"]!.value).toBeCloseTo(r["trackR"]!, 6);
    expect(d["R.leadA"]!.value).toBeCloseTo(r["leadA"]!, 6);
    expect(d["R.leadB"]!.value).toBeCloseTo(r["leadB"]!, 6);
    expect(d["R.wiper"]!.value).toBeCloseTo(r["wiperR"]!, 6);
    expect(d["trackLen"]!.value).toBe(LEG.neck.dims["trackLen"]);
    expect(d["xm0"]!.value).toBe(LEG.neck.dims["xm0"]);
    expect(d["xm1"]!.value).toBe(LEG.neck.dims["xm1"]);
    const note = LEG.neck.checks.find((c) => c.text.startsWith("membrane:"))!.text;
    expect(note).toContain(`about ${d["pressForce"]!.value.toFixed(1)} N`);
    expect(Math.round(r["trackR"]!)).toBe(357955);
  });

  test("rotary pot: arc 709040 ohm, preload 0.48, leaf about 0.49 N, bump margins 0.50 and 1.00, no FIT row", () => {
    const d = archetypes.resolve("printed-rotary-pot").def.derive(POT_DEFAULTS, P);
    expect(d["R.arc"]!.value).toBeCloseTo(LEG.pot.readouts["arcOhms"]!, 6);
    expect(d["preload"]!.value).toBeCloseTo(LEG.pot.rotor["preload"]!, 9);
    expect(d["hubTop"]!.value).toBeCloseTo(LEG.pot.rotor["hubTop"]!, 9);
    expect(d["shaftL"]!.value).toBeCloseTo(LEG.pot.rotor["shaftL"]!, 9);
    const rows = LEG.pot.checks.map((c) => c.text);
    expect(rows.find((t) => t.startsWith("rotor bumps"))).toContain(`margins ${d["marginArc"]!.value.toFixed(2)} / ${d["marginCol"]!.value.toFixed(2)} mm`);
    expect(rows.find((t) => t.startsWith("rotor: each"))).toContain(`about ${d["leafForce"]!.value.toFixed(2)} N`);
    expect(LEG.pot.checks.filter((c) => c.kind === "FIT")).toEqual([]);
    expect(Math.round(d["R.arc"]!.value)).toBe(709040);
  });
});

// ---- bodies ----

let mf: ManifoldToplevel;
beforeAll(async () => { mf = await loadManifold(); });

const solid = (shape: ShapeDecl, own: Manifold[]): Manifold => solidOf(mf, shape, own);

const ORDER = [["4", "ctpu"], ["3", "tpu95"], ["2", "cpla-protopasta"], ["1", "pla"]] as const;
type Map3 = (p: [number, number, number]) => [number, number, number];

/** Per slot volume and bbox of an ApplyOut's bodies and conductor regions, partitioned in the original's slot order; bbox mapped back to the original's frame. */
function slots(out: ApplyOut, keepBody: (id: string) => boolean, map: Map3): Solids {
  const own: Manifold[] = [];
  try {
    const of = (mat: string): Manifold | null => {
      const list: Manifold[] = [];
      for (const b of out.bodies) if (b.material === mat && keepBody(b.id)) list.push(solid(b.base, own));
      for (const f of out.features) {
        if (f.kind === "conductor" && f.material === mat && keepBody(f.id) && "path" in f.region) {
          list.push(solid({ route: "prism", outline: [f.region.path], z: [f.region.face.origin[2], f.region.face.origin[2] + f.t] }, own));
        }
      }
      if (list.length === 0) return null;
      const u = mf.Manifold.union(list); own.push(u); return u;
    };
    const res: Solids = {};
    let above: Manifold | null = null;
    for (const [slot, mat] of ORDER) {
      const m = of(mat);
      if (m !== null) {
        const mine = above === null ? m : m.subtract(above);
        own.push(mine);
        if (mine.volume() > 0) {
          const b = mine.boundingBox();
          const a = map([b.min[0]!, b.min[1]!, b.min[2]!]), c = map([b.max[0]!, b.max[1]!, b.max[2]!]);
          res[slot] = { volume: mine.volume(), bbox: { min: [0, 1, 2].map((k) => Math.min(a[k]!, c[k]!)) as [number, number, number], max: [0, 1, 2].map((k) => Math.max(a[k]!, c[k]!)) as [number, number, number] } };
        }
        above = above === null ? m : mf.Manifold.union([above, m]);
        own.push(above);
      }
    }
    return res;
  } finally {
    for (const m of new Set(own)) m.delete();
  }
}

function same(got: Solids, want: Solids, what: string): void {
  expect(Object.keys(got).sort(), what).toEqual(Object.keys(want).sort());
  for (const [slot, w] of Object.entries(want)) {
    const g = got[slot]!;
    expect(Math.abs(g.volume - w.volume), `${what} slot ${slot} volume ${g.volume} against ${w.volume}`).toBeLessThanOrEqual(1e-3);
    for (const k of [0, 1, 2]) {
      expect(Math.abs(g.bbox.min[k]! - w.bbox.min[k]!), `${what} slot ${slot} min ${k}`).toBeLessThanOrEqual(1e-6);
      expect(Math.abs(g.bbox.max[k]! - w.bbox.max[k]!), `${what} slot ${slot} max ${k}`).toBeLessThanOrEqual(1e-6);
    }
  }
}

const draft = { id: "body", name: "body", process: "fdm" as const, machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: false, pose: "print" as const }, bodies: [], features: [] };
const face = { origin: [0, 0, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [1, 0, 0] as [number, number, number] };

describe("bodies, per slot, against the original", () => {
  test("membrane slider neck: PLA, cPLA, TPU, cTPU", () => {
    const out = neckApply({ draft, face, profile: P, params: NECK_DEFAULTS }, "membrane-slider-wall");
    same(slots(out, () => true, (p) => p), LEG.neck.solids, "neck");
  });

  const t = 13 * LEG.defaults.layer;
  const rotorAt: [number, number] = [40, 0];
  const pot = () => potApply({ draft, face, profile: P, params: { ...POT_DEFAULTS, rotorAt } }, "printed-rotary-pot");
  // Local (u, v, z) on the underside to the original's frame about pot 1's centre.
  const c = () => LEG.pot.info[0]!;
  const back: Map3 = ([x, y, z]) => [x + c().x, -y + c().y, -z];

  test("rotary pot tracks: cPLA collector, stubs, pads and lead, cTPU arc, one pot", () => {
    same(slots(pot(), (id) => id.startsWith("conductor.") || id === "arc", back), LEG.pot.tracks[0]!, "pot tracks");
  });
  test("rotary pot stop block", () => {
    same(slots(pot(), (id) => id === "stop", back), LEG.pot.stops[0]!, "pot stop");
  });
  test("rotor: cTPU spider and bumps, PLA core, hub and D shaft", () => {
    same(slots(pot(), (id) => id.startsWith("rotor."), ([x, y, z]) => [x - rotorAt[0], y - rotorAt[1], z + t]), LEG.pot.rotor.solids, "rotor");
  });
});
