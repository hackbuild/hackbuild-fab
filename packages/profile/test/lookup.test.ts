// M00-T02 read tracking and profileHash (D-051), machines and presets
// (D-101), the PETG table (D-101, PROFILE.md 9), bleed (D-084), and the
// agreement of the M-S seed slice with data/.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { canonicalize, isThrownCommandError, type FitClassId } from "@hackbuild/spec";
import {
  createProfileLookup, loadProfile, tablesFromSeed, type SkeletonLookup,
} from "../src/index";

const tables = loadProfile();
const seed: unknown = JSON.parse(readFileSync(new URL("../seed/profile.seed.json", import.meta.url), "utf8"));

function codeOf(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf.code;
    throw e;
  }
  return undefined;
}

/** A stand-in build: the reads a petg hinge on ffc5p makes. */
function build(p: SkeletonLookup): void {
  p.preset("ffc5p");
  p.realGap(0.275, "hole", "ffc5p", "petg");
  p.fit("SLIDE" as FitClassId);
  p.constant("3mf.coincidenceInset");
}

describe("read tracking and profileHash (D-051)", () => {
  test("two builds that read the same rows give equal profileHash", () => {
    const a = createProfileLookup(tables);
    const b = createProfileLookup(tables);
    build(a);
    build(b);
    expect(a.profileHash()).toMatch(/^[0-9a-f]{64}$/);
    expect(a.profileHash()).toBe(b.profileHash());
  });

  test("a build that reads one more row gives a different profileHash", () => {
    const a = createProfileLookup(tables);
    const b = createProfileLookup(tables);
    build(a);
    build(b);
    b.toolhead("ffc5p", 2);
    expect(b.profileHash()).not.toBe(a.profileHash());
  });

  test("reading a row twice records it once; read order does not move the hash", () => {
    const a = createProfileLookup(tables);
    const b = createProfileLookup(tables);
    a.material("petg");
    a.material("cpla");
    a.material("petg");
    b.material("cpla");
    b.material("petg");
    expect(a.reads()).toEqual([{ table: "material", id: "petg" }, { table: "material", id: "cpla" }]);
    expect(a.readSet().map((r) => r.id)).toEqual(["cpla", "petg"]);
    expect(a.profileHash()).toBe(b.profileHash());
  });

  test("reading a different row changes the hash", () => {
    const a = createProfileLookup(tables);
    const b = createProfileLookup(tables);
    a.material("petg");
    b.material("pla");
    expect(a.profileHash()).not.toBe(b.profileHash());
  });

  test("profileHash is sha256 over RFC 8785 canonical JSON of the sorted read set", () => {
    const p = createProfileLookup(tables);
    build(p);
    // canonicalize and sha256Hex are spec/jcs.ts (D-206); spec/test/jcs.test.ts holds their vectors.
    const expected = createHash("sha256").update(canonicalize(p.readSet())).digest("hex");
    expect(p.profileHash()).toBe(expected);
  });
});

describe("machines and presets (D-101)", () => {
  test("ffc5p: Flashforge Creator 5 Pro, 4 toolheads, envelope 256 x 256 x 256 mm, vendor", () => {
    const p = createProfileLookup(tables);
    const m = p.machine("ffc5p");
    expect([m.name, m.toolheads.length, m.envelope, m.provenance.tier]).toEqual([
      "Flashforge Creator 5 Pro", 4, [256, 256, 256], "vendor",
    ]);
    expect(m.toolheads.map((t) => t.index)).toEqual([1, 2, 3, 4]);
    expect(codeOf(() => p.toolhead("ffc5p", 5))).toBe("E_REF");
  });

  test("0.4 preset from the gold and 0.25 preset from hsl.3mf, keyed by harvest date", () => {
    const p = createProfileLookup(tables);
    const a = p.preset("ffc5p");
    expect([a.id, a.nozzle, a.layer, a.firstLayer, a.slicer.printer, a.slicer.process]).toEqual([
      "ffc5p_20260819", 0.4, 0.24, 0.25, "Flashforge Creator 5 Pro 0.4 nozzle", "0.24mm Standard @FF C5",
    ]);
    const b = p.preset("ffc5p", "ffc5p-n025_20260819");
    expect([b.nozzle, b.layer, b.firstLayer, b.slicer.printer, b.slicer.process]).toEqual([
      0.25, 0.12, 0.1, "Flashforge Creator 5 Pro 0.25 nozzle", "0.12mm Standard @FF C5 0.25 nozzle",
    ]);
    expect(b.comp).toEqual({ xyHole: 0, xyContour: 0, elephantFoot: 0, elephantFootLayers: 1 });
    for (const pre of [a, b]) {
      expect(pre.slicer.bedType).toBe("Textured PEI Plate");
      expect(pre.provenance.tier).toBe("vendor");
      expect(pre.provenance.source).toContain("slicer save 2026-08-19");
    }
  });

  test("centauri is a 256 mm cube (vendor); laser1220 and sheet600 keep kerf null (inferred)", () => {
    const p = createProfileLookup(tables);
    const c = p.machine("centauri");
    expect([c.name, c.envelope, c.provenance.tier]).toEqual(["Elegoo Centauri Carbon", [256, 256, 256], "vendor"]);
    for (const id of ["laser1220", "sheet600"]) {
      const m = p.machine(id);
      expect([m.kerf, m.provenance.tier]).toEqual([null, "inferred"]);
    }
  });
});

describe("PETG table from the gold (D-101, PROFILE.md 9)", () => {
  test("three gold slots: nozzle 235, 255, 255 and maxvol 18, 12, 12 (vendor)", () => {
    const p = createProfileLookup(tables);
    const ids = ["Flashforge HS PETG @FF C5P", "Flashforge PETG Pro @FF C5P", "Generic PETG @FF C5P"];
    const rows = ids.map((id) => p.filamentPreset(id));
    expect(rows.map((r) => r.values["nozzle_temperature"])).toEqual(["235", "255", "255"]);
    expect(rows.map((r) => r.values["filament_max_volumetric_speed"])).toEqual(["18", "12", "12"]);
    for (const r of rows) {
      expect([r.type, r.preset, r.provenance.tier]).toEqual(["PETG", "ffc5p_20260819", "vendor"]);
      expect(r.provenance.source).toContain("hackbuild-coin-nfc.3mf");
    }
  });

  test("seed PETG row stays only as the Generic fallback; the notes list the disagreement", () => {
    const p = createProfileLookup(tables);
    const f = p.filamentFallback("PETG");
    expect([f.nozzle, f.maxvol, f.provenance.tier]).toEqual([240, 10, "vendor"]);
    expect(tables.filamentNotes).toContain("nozzle 240 against gold 235, 255, 255");
    expect(tables.filamentNotes).toContain("maxvol 10 against gold 18, 12, 12");
  });
});

describe("bleed (D-084)", () => {
  test("every pair reads 0 with tier inferred and reason no coupon", () => {
    const p = createProfileLookup(tables);
    const b = p.bleed("ffc5p", "ctpu", "cpla");
    expect([b.bleed, b.provenance.tier, b.materials]).toEqual([0, "inferred", ["cpla", "ctpu"]]);
    expect(b.provenance.source).toContain("no coupon");
    expect(p.warnings().map((w) => w.text)).toEqual(["bleed ffc5p.cpla.ctpu 0 mm (inferred): no coupon"]);
    expect(codeOf(() => p.bleed("ffc5p", "cpla", "unobtainium"))).toBe("E_REF");
  });
});

describe("strain limits by bend direction (D-073)", () => {
  test("petg click 2.5 in plane (failure), 1.5 across layers (derived), both inferred", () => {
    const p = createProfileLookup(tables);
    const a = p.strain("petg", "click", "inPlane");
    const b = p.strain("petg", "snap", "acrossLayers");
    expect([a.pct, a.provenance.method, a.provenance.tier]).toEqual([2.5, "failure", "inferred"]);
    expect([b.pct, b.rangePct, b.provenance.method]).toEqual([1.5, [1.5, 1.8], "derived"]);
    expect(codeOf(() => p.strain("pla", "click", "inPlane"))).toBe("E_REF");
  });
});

describe("the M-S seed slice agrees with data/", () => {
  const slice = tablesFromSeed(seed);

  test("loss rows equal row for row", () => {
    const strip = (r: object): unknown => ({ ...r, provenance: undefined });
    for (const r of slice.loss) {
      const d = tables.loss.find((x) => x.processA === r.processA && x.processB === r.processB && x.motion === r.motion
        && x.machine === r.machine && x.material === r.material && x.layer === r.layer);
      expect(d && strip(d)).toEqual(strip(r));
      expect(d?.provenance.tier).toBe(r.provenance.tier);
    }
  });

  test("preset numbers, toolheads, handling and resistivity equal", () => {
    const sm = slice.machines[0];
    const dm = tables.machines.find((m) => m.id === "ffc5p");
    const sp = sm?.presets[0];
    const dp = dm?.presets[0];
    expect(sp && [sp.id, sp.nozzle, sp.layer, sp.firstLayer, sp.lineWidth, sp.wallLoops, sp.comp, sp.slicer.bedType])
      .toEqual(dp && [dp.id, dp.nozzle, dp.layer, dp.firstLayer, dp.lineWidth, dp.wallLoops, dp.comp, dp.slicer.bedType]);
    expect(sm?.envelope).toEqual(dm?.envelope);
    expect(sm?.toolheads.map((t) => [t.index, t.nozzleMm, t.nozzleMaterial, t.flexOk]))
      .toEqual(dm?.toolheads.map((t) => [t.index, t.nozzleMm, t.nozzleMaterial, t.flexOk]));
    for (const m of slice.materials) {
      const d = tables.materials.find((x) => x.id === m.id);
      expect([m.processes, m.creep, m.brand, m.handling?.abrasive, m.handling?.flexible, m.handling?.minNozzleMm])
        .toEqual([d?.processes, d?.creep, d?.brand, d?.handling?.abrasive, d?.handling?.flexible, d?.handling?.minNozzleMm]);
      expect(m.resistivity.map((r) => [r.id, r.direction, r.ohmCm, r.form, r.brand, r.provenance.tier]))
        .toEqual(d?.resistivity.map((r) => [r.id, r.direction, r.ohmCm, r.form, r.brand, r.provenance.tier]));
    }
  });
});
