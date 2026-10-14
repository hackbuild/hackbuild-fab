// M06-T09, tilt-stick TOGGLE presets: the port regenerates the original's
// solved stick (every G number), its physics and pull up rule on the
// original's routed nets, its contact function, the stem stress row the
// M06-T14 row adds, and the volumes of the two lathes. Expected values come
// from test/legacy/toggle.json, written by scripts/toggle-legacy.mjs from
// originals/toggle/files (evaluated in place); the record's source hashes
// are checked against the files on disk, so a stale record fails here.
//
// Volumes: the stick and collar the archetype declares are meshed by
// test/mesh-decl.ts (no snap, no inset, revolves rotated half a step, as the
// original's lathe starts at PI / 192). The record's .texNone variants are the
// original at stick.tex 'none', the cap the port builds. The cPLA pads,
// ring and COM column are painted into a 0.1 mm raster in the original
// (toggle.md 5.12) and are exact sectors here; their zones and angles are
// asserted, their volumes are not comparable.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { FaceFrame, PartDraft } from "@hackbuild/spec";
import { loadManifold } from "@hackbuild/mesh";
import { solidOf, type Bag } from "./mesh-decl.js";
import {
  TOGGLE_PRESETS, shippedProfile, toggleApply, toggleCollarProfile, toggleContact, toggleDerive, togglePhysics,
  togglePreset, toggleSolve, toggleStemStress, toggleStickProfile, type ToggleNet, type TogglePreset,
} from "@hackbuild/archetypes";
import { originalPath } from "../../../tools/test-support/originals-root.js";

interface Box { min: number[]; max: number[] }
interface Variant {
  state: unknown; G: Record<string, number | boolean>; sectors: { c: number; a0: number; a1: number; half: number }[]; leadAng: number[];
  phys: Record<string, number | boolean | null> & { nets: { net: string; len: number; R: number }[] };
  nets: ToggleNet[]; lathe: { tpu: { volume: number; bbox: Box }; ctpu: { volume: number; bbox: Box } };
  contact: Record<string, unknown>; stem: { leverMm: number; sigmaMPa: number }; warnings: string[];
}
const LEG = JSON.parse(readFileSync(new URL("legacy/toggle.json", import.meta.url), "utf8")) as { sources: Record<string, Record<string, string>>; variants: Record<string, Variant> };
const V = (k: string): Variant => LEG.variants[k] as Variant;
const ORIG = originalPath("toggle/files/");
const PRESETS = Object.keys(TOGGLE_PRESETS) as TogglePreset[];
const L = 0.24;
const BED: FaceFrame = { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] };
/** The record keeps 12 significant digits. */
const same = (a: number, b: number): boolean => Math.abs(Number(a.toPrecision(12)) - b) <= 1e-9 * Math.max(1, Math.abs(b));

describe("the record is the original's", () => {
  test("source hashes equal the originals on disk", () => {
    const dirs: Record<string, string> = { "rastermesh.js": "extracted/" };
    for (const [f, sha] of Object.entries(LEG.sources["toggle"] ?? {})) {
      const p = `${ORIG}${dirs[f] ?? "src/src/"}${f}`;
      expect(createHash("sha256").update(readFileSync(p)).digest("hex"), p).toBe(sha);
    }
    expect(Object.keys(LEG.sources["toggle"] ?? {}).length).toBe(6);
  });
});

describe.each(PRESETS)("preset %s", (key) => {
  const v = V(key), vn = V(`${key}.texNone`);
  const P = togglePreset(key), G = toggleSolve(P, L);

  test("every solved G number, the sectors and the warnings equal the original's", () => {
    let n = 0;
    for (const [k, x] of Object.entries(v.G)) {
      const y = (G as unknown as Record<string, unknown>)[k];
      if (y === undefined) continue;
      n++;
      if (typeof x === "number") expect(same(y as number, x), `${k}: ${String(y)} against ${x}`).toBe(true);
      else expect(y, k).toBe(x);
    }
    expect(n).toBeGreaterThanOrEqual(55);
    expect(G.sectors.length).toBe(v.sectors.length);
    G.sectors.forEach((s, i) => { for (const f of ["c", "a0", "a1", "half"] as const) expect(same(s[f], v.sectors[i]![f]), `sector ${i} ${f}`).toBe(true); });
    // lead angles at the sector centres (the router's variant 0 at every preset)
    v.leadAng.forEach((a, i) => expect(same(G.sectors[i]!.c, a), `lead ${i}`).toBe(true));
    expect(G.warn).toEqual(v.warnings);
  });

  test("physics and the E12 pull up on the original's routed nets, Protopasta 30 ohm cm from profile", () => {
    const ph = togglePhysics(P, G, shippedProfile(), v.nets);
    for (const [k, x] of Object.entries(v.phys)) {
      if (k === "nets") continue;
      const y = (ph as unknown as Record<string, unknown>)[k];
      if (typeof x === "number") expect(same(y as number, x), `${k}: ${String(y)} against ${x}`).toBe(true);
      else expect(y, k).toBe(x);
    }
    ph.nets.forEach((n, i) => { expect(n.net).toBe(v.phys.nets[i]!.net); expect(same(n.R, v.phys.nets[i]!.R), n.net).toBe(true); });
    expect(ph.pullup).toBe(key.startsWith("blocks") ? 560000 : 470000);
  });

  test("contact function at four tilts", () => {
    expect(toggleContact(G, 13.8, 180).sectors).toEqual(v.contact["13.8@180"]);
    expect(toggleContact(G, 14.2, 180).sectors).toEqual(v.contact["14.2@180"]);
    expect(toggleContact(G, 16, 0).sectors).toEqual(v.contact["16@0"]);
    const c = toggleContact(G, 30, 22.5), lc = v.contact["30@22.5"] as { sectors: number[]; dir: number };
    expect(c.sectors).toEqual(lc.sectors);
    expect(same(c.dir as number, lc.dir)).toBe(true);
  });

  test("readouts over TOGGLE's declared E, rhoT and rc qualify unknown (D-007); geometry and the profile ring stay computed", () => {
    const d = toggleDerive(P, shippedProfile());
    for (const k of ["k", "Fc", "Fs", "rCollar"]) expect([k, d[k]!.qualifier, d[k]!.basis]).toEqual([k, "unknown", null]);
    for (const k of ["Rw", "strain", "stemStress"]) expect([k, d[k]!.qualifier]).toEqual([k, "computed"]);
    expect(d["ring"]!.basis).toBe(shippedProfile().resistivity("cpla-protopasta", "along", "printed").provenance.tier);
    const out = toggleApply({ draft: { machine: "ffc5p" } as unknown as PartDraft, face: BED, params: P, profile: shippedProfile() }, "tilt-stick");
    for (const id of ["stick.Fc", "stick.Fs", "stick.rCollar"]) expect([id, out.metrics!.find((m) => m.id === id)?.qualifier]).toEqual([id, "unknown"]);
  });

  test("stem stress row: 54.8 MPa at the preset (the original has no check)", () => {
    const st = toggleStemStress(G);
    expect(same(st.sigmaMPa, v.stem.sigmaMPa)).toBe(true);
    expect(st.sigmaMPa.toFixed(1)).toBe("54.8");
    expect(toggleDerive(P, shippedProfile())["stemStress"]!.value).toBeCloseTo(st.sigmaMPa, 9);
  });

  test("lathe volumes within 1e-3 mm3 and bounding boxes within 1e-6 mm of the original at tex none", async () => {
    const mf = await loadManifold();
    const out = toggleApply({ draft: { machine: "ffc5p" } as unknown as PartDraft, face: BED, params: togglePreset(key, { tex: "none" }), profile: shippedProfile() }, "tilt-stick");
    const own: Bag = [];
    try {
      for (const [id, rec] of [["stick", vn.lathe.tpu], ["collar", vn.lathe.ctpu]] as const) {
        const m = solidOf(mf, out.bodies.find((b) => b.id === id)!.base, own);
        expect(Math.abs(m.volume() - rec.volume), `${id} volume ${m.volume()} against ${rec.volume}`).toBeLessThan(1e-3);
        const b = m.boundingBox();
        // the original stores float32 positions: below 1e-6 mm at these magnitudes
        for (let k = 0; k < 3; k++) {
          expect(Math.abs(b.min[k]! - rec.bbox.min[k]!), `${id} min ${k}`).toBeLessThan(1e-6);
          expect(Math.abs(b.max[k]! - rec.bbox.max[k]!), `${id} max ${k}`).toBeLessThan(1e-6);
        }
      }
    } finally {
      for (const m of own) m.delete();
    }
  });
});

describe("apply", () => {
  const face: FaceFrame = { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] };
  const draft = { machine: "ffc5p" } as unknown as PartDraft;
  const P = togglePreset("solo4", { tex: "none" });
  const out = toggleApply({ draft, face, params: P, profile: shippedProfile() }, "tilt-stick");
  const G = toggleSolve(P, L);

  test("the stick and collar are the lathe profiles; host top is the solved body top", () => {
    const body = (id: string) => out.bodies.find((b) => b.id === id)!;
    const stick = body("stick").base, collar = body("collar").base;
    expect(stick.route === "revolve" && stick.profile).toEqual(toggleStickProfile(G));
    expect(collar.route === "revolve" && collar.profile).toEqual(toggleCollarProfile(G));
    expect(out.metrics!.find((m) => m.id === "host.top")!.value).toBe(G.zT);
    expect(out.metrics!.find((m) => m.id === "host.size")!.value).toBe(18.2);
  });

  test("pads span the original's zones; the stem stress row warns over 15 MPa (53.0 with a smooth cap)", () => {
    const pad = out.features.find((f) => f.id === "conductor.pad0");
    expect(pad?.kind === "conductor" && "face" in pad.region && pad.region.face.origin[2]).toBe(G.zB0);
    expect(pad?.kind === "conductor" && pad.t).toBeCloseTo(G.zB1 - G.zB0, 12);
    expect(out.ports).toEqual(["port.dir0", "port.dir1", "port.dir2", "port.dir3", "port.common"]);
    expect(out.warnings!.some((w) => w.code === "FIT" && w.text.includes(`${toggleStemStress(G).sigmaMPa.toFixed(1)} MPa, limit 15`))).toBe(true);
    expect(toggleStemStress(G).sigmaMPa.toFixed(1)).toBe("53.0");
  });

  test("a textured cap warns that the texture is not built", () => {
    const o = toggleApply({ draft, face, params: togglePreset("solo4"), profile: shippedProfile() }, "tilt-stick");
    expect(o.warnings!.some((w) => w.code === "TEXTURE")).toBe(true);
  });

  test("off the bed is refused", () => {
    expect(() => toggleApply({ draft, face: { ...face, origin: [0, 0, 1] }, params: P, profile: shippedProfile() }, "tilt-stick")).toThrow(/bed/);
  });
});
