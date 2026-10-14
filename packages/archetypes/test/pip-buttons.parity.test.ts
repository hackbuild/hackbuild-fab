// M06-T08: the four PIP buttons regenerate the original's fits rows, feel
// readouts, switch resistances and per-slot volumes. Expected values come
// from test/legacy/pip-fits.json, written by scripts/pip-legacy.mjs from
// the original files (haft-src, the canonical revision, and pip-controller
// b137deb); the test also checks the record's source hashes against the
// originals on disk, so a stale record fails here.
//
// Bleed: the port reads the profile bleed row, 0 by default (D-084); the
// record's haft.bleed0 variant is the original at bleed 0, and the
// pip-controller variants (no bleed) must agree with it on every button
// row. One case overrides the bleed row to haft's 0.15 and compares with
// haft.defaults.
//
// Volumes: each button's declarations are meshed here without the D-054
// snap and the D-070 inset (both kernel stages applied after the
// archetype), as PIP meshes its own: prisms extruded, revolves by manifold,
// then PIP's partition (contacts over keys over traces, model.js lines 288
// to 290), each slot cut to the recorded cylinder.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import type { ManifoldToplevel, Manifold } from "manifold-3d";
import { loadManifold } from "@hackbuild/mesh";
import { solidOf, type Bag } from "./mesh-decl.js";
import type { ApplyOut, BleedRow, ProfileLookup, ShapeDecl } from "@hackbuild/spec";
import {
  CLICK_DEFAULTS, FLEX_DEFAULTS, STICK_DEFAULTS, TOUCH_DEFAULTS,
  archetypes, clickFits, clickZ, clickerDims, flexApply, flexFits, flexSwitch, pipStack, provideClickSolver, shippedProfile,
  stickApply, stickDerive, stickFits, stickSwitch, touchApply, touchFits, clickApply, type ClickCurve,
} from "@hackbuild/archetypes";
import { originalPath } from "../../../tools/test-support/originals-root.js";

interface Fit { group: string; name: string; value: string; ok: boolean; note: string }
interface Cyl { id: string; type: string; x: number; y: number; r: number; segments: number; z: [number, number]; slots: Record<string, number> }
interface Variant {
  z: { top: number; floor: number }; fits: Fit[]; mech: Record<string, Record<string, number | boolean>>;
  elec: { id: string; type: string; Rsw: number }[]; cylinders: Cyl[];
  fe: { peak: number; valley: number; drop: number; dPeak: number; dValley: number; bistable: boolean; snap: boolean; ok: boolean } | null;
}
const LEG = JSON.parse(readFileSync(new URL("legacy/pip-fits.json", import.meta.url), "utf8")) as { sources: Record<string, Record<string, string>>; variants: Record<string, Variant> };
const V = (k: string): Variant => LEG.variants[k] as Variant;
const ORIG = originalPath("pip/files/");
const GROUPS = ["flex key", "click spring", "touch pad", "stick"];

/** The legacy curve as the solver's shape: the record's FE summary with its cg and eStop. */
function legacyCurve(v: Variant): ClickCurve {
  const fe = v.fe!, c = v.mech["click"]!;
  return { peakN: fe.peak, peakAtMm: fe.dPeak, valleyN: fe.valley, valleyAtMm: fe.dValley, drop: fe.drop, contactMm: c["cg"] as number, eStop: c["eStop"] as number, snaps: fe.snap, bistable: fe.bistable, ok: fe.ok };
}

/** The shipped profile with the cPLA on PETG bleed row replaced (an in-memory override, never the data files). */
function withBleed(bleed: number): ProfileLookup {
  const p = shippedProfile();
  return new Proxy(p, { get: (t, k) => (k === "bleed" ? (m: string, a: string, b: string): BleedRow => ({ ...t.bleed(m, a, b), bleed }) : Reflect.get(t, k)) });
}

const nameOf = (r: { group: string; name: string }): string => `${r.group}: ${r.name}`;
function legacyRows(v: Variant, group: string): Fit[] { return v.fits.filter((f) => f.group === group); }

describe("the record is the original's", () => {
  test("the record's source hashes equal the originals on disk; pip-controller agrees with haft at bleed 0 on every button row", () => {
    for (const [key, dir] of [["haft", "haft-src/src/"], ["pipc", "pip-controller/src/"]] as const) {
      for (const [f, sha] of Object.entries(LEG.sources[key] ?? {})) {
        expect(createHash("sha256").update(readFileSync(`${ORIG}${dir}${f}`)).digest("hex"), `${dir}${f}`).toBe(sha);
      }
    }
    for (const [a, b] of [["haft.bleed0", "pipc.defaults"], ["haft.stickBleed0", "pipc.stick"]] as const) {
      const ra = V(a).fits.filter((f) => GROUPS.includes(f.group)), rb = V(b).fits.filter((f) => GROUPS.includes(f.group));
      expect(ra.map((f) => [f.group, f.name, f.value, f.ok])).toEqual(rb.map((f) => [f.group, f.name, f.value, f.ok]));
    }
    // The card's row counts: 34 at defaults and 41 in the stick case on the published copy (computed).
    expect(V("pipc.defaults").fits.length).toBe(34);
    expect(V("pipc.stick").fits.length).toBe(41);
  });
});

describe("fits rows and feel readouts", () => {
  const p = shippedProfile();
  const s = pipStack(p, "ffc5p", { body: "petg", trace: "cpla" });

  const same = (mine: readonly { group: string; name: string; value: string; ok: boolean; n: number | null }[], legacy: readonly Fit[]): void => {
    expect(mine.map(nameOf)).toEqual(legacy.map(nameOf));
    mine.forEach((r, i) => {
      const l = legacy[i] as Fit;
      expect(r.value, nameOf(r)).toBe(l.value);
      expect(r.ok, nameOf(r)).toBe(l.ok);
      // The number rounds to the printed value: within half its last printed digit (0.005 for mm rows).
      const m = /^-?\d+(?:\.(\d+))?/.exec(l.value);
      if (r.n !== null && m !== null) expect(Math.abs(r.n - Number.parseFloat(l.value)), nameOf(r)).toBeLessThanOrEqual(0.5 * 10 ** -(m[1]?.length ?? 0) + 1e-9);
    });
  };

  test("flex key: six rows; key height, cone base, wall", () => {
    same(flexFits(FLEX_DEFAULTS, p), legacyRows(V("haft.bleed0"), "flex key"));
    const m = V("haft.bleed0").mech["flex"]!;
    const d = archetypes.resolve("flex-cone-key").def.derive(FLEX_DEFAULTS, p);
    expect(d["keyH"]!.value.toFixed(3)).toBe("8.577");
    expect(d["keyH"]!.value).toBeCloseTo(m["keyH"] as number, 6);
    expect(d["rsb"]!.value.toFixed(3)).toBe("5.940");
    expect(d["wallH"]!.value.toFixed(3)).toBe("0.783");
    expect(d["gap"]!.value.toFixed(2)).toBe("1.80");
  });

  test("flex key at gapPct 20: the 1.2 mm contact gap floor binds as the original's does", () => {
    // 20 percent of Hs 4.0 is 0.8 mm, under the floor; the record ran the original at that edit.
    const v = V("haft.flexGapFloorBleed0");
    const F = { ...FLEX_DEFAULTS, gapPct: 20 };
    same(flexFits(F, p), legacyRows(v, "flex key"));
    const d = archetypes.resolve("flex-cone-key").def.derive(F, p);
    expect(d["gap"]!.value).toBeCloseTo(v.mech["flex"]!["gap"] as number, 9);
    expect(d["gap"]!.value).toBeCloseTo(1.2, 9);
  });

  test("click spring: eleven rows on the recorded curve; feel readouts as the card prints them", () => {
    const v = V("haft.bleed0");
    same(clickFits(CLICK_DEFAULTS, legacyCurve(v)), legacyRows(v, "click spring"));
    const c = v.mech["click"]!, fe = v.fe!;
    expect(fe.peak.toFixed(3)).toBe("2.527");
    expect(fe.dPeak.toFixed(3)).toBe("0.629");
    expect(fe.valley.toFixed(3)).toBe("0.594");
    expect(fe.dValley.toFixed(3)).toBe("1.611");
    expect((c["drop"] as number).toFixed(3)).toBe("0.765");
    expect((c["cg"] as number).toFixed(3)).toBe("1.369");
    expect((c["eStop"] as number).toFixed(4)).toBe("0.0231");
    expect(fe.bistable).toBe(false);
    // The shuttle top under the body top the original solved, and the slot floor (model.js lines 57 to 59).
    const z = clickZ({ ...CLICK_DEFAULTS, top: v.z.top }, s, legacyCurve(v));
    expect(z.vTopEff).toBeCloseTo(c["vTop"] as number, 9);
    expect(z.floor).toBeCloseTo(c["floor"] as number, 9);
    expect(clickerDims(CLICK_DEFAULTS, legacyCurve(v)).cg).toBe(c["cg"]);
  });

  test("touch pad: three rows", () => {
    same(touchFits(TOUCH_DEFAULTS), legacyRows(V("haft.bleed0"), "touch pad"));
  });

  test("stick: thirteen rows at the stick case's body top; Rw and rest gap", () => {
    const v = V("haft.stickBleed0");
    same(stickFits({ ...STICK_DEFAULTS, top: v.z.top }, s), legacyRows(v, "stick"));
    const m = v.mech["stick"]!;
    const d = stickDerive(STICK_DEFAULTS, p);
    expect(d["Rw"]!.value).toBeCloseTo(m["Rw"] as number, 6);
    expect(d["Rw"]!.value.toFixed(3)).toBe("5.456");
    expect(d["restGap"]!.value.toFixed(2)).toBe("0.66");
  });

  test("switch resistances equal the original's Rsw rows through profile sectionResistance", () => {
    const flexRow = V("haft.bleed0").elec.find((r) => r.type === "flex")!;
    expect(flexSwitch(FLEX_DEFAULTS, s, p).rsw).toBeCloseTo(flexRow.Rsw, 6);
    const stickRow = V("haft.stickBleed0").elec.find((r) => r.type === "stick")!;
    expect(stickSwitch(STICK_DEFAULTS, s, p).rsw).toBeCloseTo(stickRow.Rsw, 6);
  });
});

// ---- per-slot volumes ----

let mf: ManifoldToplevel;
beforeAll(async () => { mf = await loadManifold(); });

const solid = (shape: ShapeDecl, own: Bag): Manifold => solidOf(mf, shape, own);

/** Per-slot volumes of an ApplyOut inside a cylinder: cTPU, then TPU less cTPU, then cPLA less both. */
function slotVolumes(out: ApplyOut, c: Cyl): Record<string, number> {
  const own: Bag = [];
  try {
    const of = (mat: string): Manifold => {
      const list: Manifold[] = [];
      for (const b of out.bodies) if (b.material === mat) list.push(solid(b.base, own));
      for (const f of out.features) {
        if (f.kind === "conductor" && mat === "cpla" && "path" in f.region) {
          list.push(solid({ route: "prism", outline: [f.region.path], z: [f.region.face.origin[2], f.region.face.origin[2] + f.t] }, own));
        }
      }
      const u = mf.Manifold.union(list); own.push(u); return u;
    };
    const ctpu = of("ctpu");
    const tpu = of("tpu95").subtract(ctpu); own.push(tpu);
    const cpla = of("cpla").subtract(ctpu); own.push(cpla);
    const cpla2 = cpla.subtract(tpu); own.push(cpla2);
    const cyl = mf.Manifold.cylinder(c.z[1] - c.z[0], c.r, c.r, c.segments, false).translate([c.x, c.y, c.z[0]]); own.push(cyl);
    const vol = (m: Manifold): number => { const i = m.intersect(cyl); own.push(i); return i.volume(); };
    return { 2: vol(cpla2), 3: vol(tpu), 4: vol(ctpu) };
  } finally {
    for (const m of own) m.delete();
  }
}

const draft = { id: "body", name: "body", process: "fdm" as const, machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: false, pose: "print" as const }, bodies: [], features: [] };
const face = (c: Cyl, z: number) => ({ origin: [c.x, c.y, z] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [1, 0, 0] as [number, number, number] });

describe("per-slot volumes inside each button cylinder", () => {
  const cases = [
    ["flex", "haft.bleed0", "UP", 0],
    ["touch", "haft.bleed0", "SELECT", 0],
    ["stick", "haft.stickBleed0", "STICK", 0],
    ["flex at bleed 0.15", "haft.defaults", "UP", 0.15],
    ["touch at bleed 0.15", "haft.defaults", "SELECT", 0.15],
    ["stick at bleed 0.15", "haft.stick", "STICK", 0.15],
  ] as const;
  for (const [what, key, id, bleed] of cases) {
    test(`${what}: cPLA, TPU and cTPU within 1e-3 mm3 of the original`, () => {
      const v = V(key);
      const c = v.cylinders.find((x) => x.id === id)!;
      const p = withBleed(bleed);
      const s = pipStack(p, "ffc5p", { body: "petg", trace: "cpla" });
      const inp = { draft, face: face(c, s.z.floor), profile: p };
      const out = c.type === "flex" ? flexApply({ ...inp, params: { ...FLEX_DEFAULTS, top: v.z.top } }, "flex-cone-key")
        : c.type === "touch" ? touchApply({ ...inp, params: { ...TOUCH_DEFAULTS, top: v.z.top } }, "touch-comb-key")
          : stickApply({ ...inp, params: { ...STICK_DEFAULTS, top: v.z.top } }, "tilt-stick");
      const got = slotVolumes(out, c);
      for (const slot of ["2", "3", "4"]) expect(Math.abs((got[slot] ?? 0) - (c.slots[slot] ?? 0)), `${what} slot ${slot}: ${got[slot]} against ${c.slots[slot]}`).toBeLessThanOrEqual(1e-3);
    });
  }

  test("clicky: the cPLA pads and posts inside the cap well within 1e-3 mm3", () => {
    const v = V("haft.bleed0");
    const c = v.cylinders.find((x) => x.id === "X")!;
    const p = shippedProfile();
    provideClickSolver(() => legacyCurve(v));
    const s = pipStack(p, "ffc5p", { body: "petg", trace: "cpla" });
    // The slot runs at the angle the layout chose for X (layout.js lines 314 to 345), as recorded.
    const ang = (v as unknown as { btns: { id: string; ang: number }[] }).btns.find((b) => b.id === "X")!.ang;
    const f = { origin: [c.x, c.y, s.z.floor] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [Math.cos(ang), Math.sin(ang), 0] as [number, number, number] };
    const out = clickApply({ draft, face: f, profile: p, params: { ...CLICK_DEFAULTS, top: v.z.top } }, "click-spring-key");
    const got = slotVolumes({ ...out, bodies: out.bodies.filter((b) => b.material !== "ctpu" && b.material !== "tpu95") }, c);
    expect(Math.abs((got["2"] ?? 0) - (c.slots["2"] ?? 0)), `${got["2"]} against ${c.slots["2"]}`).toBeLessThanOrEqual(1e-3);
  });
});
