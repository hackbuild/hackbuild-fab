// M06-T09: the two GIB pots regenerate the original's readouts, warnings
// and bodies. Expected values come from test/legacy/gib.json, written by
// scripts/gib-legacy.mjs from originals/gib/files/src/src/part2.js
// evaluated in place with the bench's own earcut; the test checks the
// record's source hashes against the originals on disk.
//
// The page prices conductors on the rho in its state (1500 ohm cm by
// default, part2.js line 141); the port reads the profile row, so the test
// passes the record's state rho as an in-memory row, and the page's flex
// modulus (BODY.flex.E, line 15) on profile tpu95 the same way. Bodies: each part's
// declarations are meshed as the page meshes its queue (prisms extruded,
// unioned per part) and compared within 1e-3 mm3; bounding boxes within
// 1e-6 mm after the page's own moves: the membrane object flipped about
// its long axis (lines 326 to 328), then each object centred on its box and
// the membrane object set 8 mm past the body in y (part3.js lines 270 to
// 277), worked here from the record's numbers.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import type { Manifold, ManifoldToplevel } from "manifold-3d";
import { loadManifold } from "@hackbuild/mesh";
import type { ProfileLookup, ResistivityRow } from "@hackbuild/spec";
import { GIB_FINGER_DEFAULTS, archetypes, gibApply, gibBuild, gibDerive, gibParams, shippedProfile, type GibParams } from "@hackbuild/archetypes";
import { solidOf } from "./mesh-decl.js";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const DIR = originalPath("gib/files/");
interface Part { name: string; volume: number; bbox: number[] }
interface Variant { objectSizes: number[][]; state: Record<string, unknown> & { rho: number; W: number; L: number }; T: number; warn: string[]; nudges: number; memInstall: { z4: number; T: number; my: number } | null; phys: { rows: [string, string][]; notes: { w: number; t: string }[] }; parts: Part[] }
const LEG = JSON.parse(readFileSync(new URL("legacy/gib.json", import.meta.url), "utf8")) as { sources: { gib: Record<string, string> }; variants: Record<string, Variant> };

/** The state's own rho as a row (the page's default, line 141). */
const pageRow = (v: Variant, mat: string): ResistivityRow => ({ id: `${mat}.gib`, direction: mat === "ctpu" ? "bulk" : "along", ohmCm: v.state.rho, form: "printed", brand: "GIB", provenance: { tier: "inferred", method: "derived", date: "2026-10-09", source: `${DIR}src/src/part2.js line 141` } });
/** The page's BODY.flex.E (line 15), the modulus its press force bends (line 529), MPa. */
const pageFlexE = (): number => Number(/flex: \{[^}]*\bE: (\d+(?:\.\d+)?)/.exec(readFileSync(`${DIR}src/src/part2.js`, "utf8").split("\n")[14] ?? "")?.[1]);
/** The shipped profile with the page's rho and the page's flex modulus on tpu95 (in memory, never the data files). */
const profileFor = (v: Variant): ProfileLookup => {
  const p = shippedProfile();
  return new Proxy(p, { get: (t, k) => {
    if (k === "resistivity") return (m: string) => pageRow(v, m);
    if (k === "material") return (id: string) => (id === "tpu95" ? { ...t.material(id), modulusMPa: pageFlexE() } : t.material(id));
    return Reflect.get(t, k);
  } });
};
const paramsOf = (v: Variant): GibParams => gibParams.parse(Object.fromEntries(Object.entries(v.state).filter(([k]) => k in gibParams.shape)));

describe("the record is the original's", () => {
  test("source hashes equal the originals on disk; no recorded case nudged", () => {
    for (const [f, sha] of Object.entries(LEG.sources.gib)) {
      const p = f === "part2.js" ? `${DIR}src/src/part2.js` : `${DIR}${f}`;
      expect(createHash("sha256").update(readFileSync(p)).digest("hex"), f).toBe(sha);
    }
    for (const [k, v] of Object.entries(LEG.variants)) expect(v.nudges, k).toBe(0);
  });
});

let mf: ManifoldToplevel;
beforeAll(async () => { mf = await loadManifold(); });

/** The record's part boxes as the export places them. */
function placedBoxes(v: Variant): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  const mi = v.memInstall;
  const flip = (b: number[]): number[] => (mi === null ? b : [b[0]!, 2 * mi.my - b[4]!, mi.T - b[5]!, b[3]!, 2 * mi.my - b[1]!, mi.T - b[2]!]);
  const obj1 = new Set(["membrane", "wiper"]);
  const objBox = (names: string[]): number[] => {
    const bs = v.parts.filter((p) => names.includes(p.name)).map((p) => (obj1.has(p.name) ? flip(p.bbox) : p.bbox));
    return [Math.min(...bs.map((b) => b[0]!)), Math.min(...bs.map((b) => b[1]!)), Math.max(...bs.map((b) => b[3]!)), Math.max(...bs.map((b) => b[4]!))];
  };
  const names0 = v.parts.filter((p) => !obj1.has(p.name)).map((p) => p.name), names1 = v.parts.filter((p) => obj1.has(p.name)).map((p) => p.name);
  const b0 = [0, 0, v.state.L, v.state.W];
  const b1 = names1.length > 0 ? objBox(names1) : null;
  // the export's yoff reads each object's declared size (G.objects, part2.js lines 333 and 391), not its box
  const size0y = v.objectSizes[0]![1]!, size1y = v.objectSizes[1]?.[1] ?? 0;
  for (const p of v.parts) {
    const one = obj1.has(p.name);
    const ob = one ? b1! : b0;
    const cx = (ob[0]! + ob[2]!) / 2, cy = (ob[1]! + ob[3]!) / 2;
    const yoff = one ? size0y / 2 + size1y / 2 + 8 : 0;
    const b = one ? flip(p.bbox) : p.bbox;
    out[p.name] = [b[0]! - cx, b[1]! - cy + yoff, b[2]!, b[3]! - cx, b[4]! - cy + yoff, b[5]!];
  }
  void names0;
  return out;
}

const draft = { id: "body", name: "body", process: "fdm" as const, machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: false, pose: "print" as const }, bodies: [], features: [] };
const FACE = { origin: [0, 0, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [1, 0, 0] as [number, number, number] };

describe("GIB pots regenerate the original", () => {
  for (const [key, v] of Object.entries(LEG.variants)) {
    test(`${key}: readouts, warnings, bodies`, () => {
      const s = paramsOf(v);
      const b = gibBuild(s, 0.24, pageRow(v, s.cond), pageFlexE());
      expect(b.T).toBeCloseTo(v.T, 12);
      expect(b.warn).toEqual(v.warn);
      expect(b.rows).toEqual(v.phys.rows);
      for (const n of b.notes) expect(v.phys.notes.map((x) => x.t), n.t).toContain(n.t);
      const out = gibApply({ draft, face: FACE, profile: profileFor(v), params: s }, s.sense === "finger" ? "finger-pot" : "membrane-slider-gib");
      const said = out.metrics!.filter((x) => x.id.startsWith("gib.say.")).map((x) => [x.note.split(": ")[0], x.value]);
      expect(said).toEqual(v.phys.rows);
      expect(out.bodies.map((x) => x.id).sort()).toEqual(v.parts.map((p) => p.name).sort());
      const boxes = placedBoxes(v);
      for (const p of v.parts) {
        const own: Manifold[] = [];
        try {
          const m = solidOf(mf, out.bodies.find((x) => x.id === p.name)!.base, own);
          expect(Math.abs(m.volume() - p.volume), `${p.name}: ${m.volume()} against ${p.volume}`).toBeLessThanOrEqual(1e-3);
          const bb = m.boundingBox();
          [...bb.min, ...bb.max].forEach((x, i) => expect(Math.abs(x - boxes[p.name]![i]!), `${p.name} bbox ${i}`).toBeLessThanOrEqual(1e-6));
        } finally { for (const m of own) m.delete(); }
      }
    });
  }

  test("the press force reads profile tpu95: at the shipped row it scales by that modulus over the page's and qualifies on its tier", () => {
    expect(pageFlexE()).toBe(25);
    const v = Object.values(LEG.variants).find((x) => paramsOf(x).sense === "membrane")!;
    const s = paramsOf(v);
    const p = shippedProfile();
    const tpu = p.material("tpu95");
    // the page's rho on the shipped tpu95: only the modulus differs from profileFor(v)
    const shipped = gibDerive(s, new Proxy(p, { get: (t, k) => (k === "resistivity" ? (m: string) => pageRow(v, m) : Reflect.get(t, k)) }));
    const page = gibDerive(s, profileFor(v));
    expect(shipped.F!.value! / page.F!.value!).toBeCloseTo(tpu.modulusMPa! / 25, 12);
    expect(shipped.F!.qualifier).toBe("computed");
    expect(shipped.F!.basis).toBe(tpu.provenance.tier);
    expect(shipped.Rtrack!.basis).toBe("inferred");
    const out = gibApply({ draft, face: FACE, profile: shippedProfile(), params: s }, "membrane-slider-gib");
    expect(out.metrics!.find((x) => x.id === "gib.F")?.basis).toBe(tpu.provenance.tier);
    expect(out.metrics!.find((x) => x.id === "gib.say.press-to-close")?.basis).toBe(tpu.provenance.tier);
  });

  test("the finger pot defaults are the page's blank state with sense finger", () => {
    expect(paramsOf(LEG.variants["finger.defaults"]!)).toEqual(GIB_FINGER_DEFAULTS);
    expect(archetypes.resolve("finger-pot").id).toBe("finger-pot");
  });
});
