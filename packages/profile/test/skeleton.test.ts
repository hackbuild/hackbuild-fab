// M-S-T02 profile slice. Pins from PROFILE.md 7.2 (computed, on the per-side
// basis of spec/profile.ts) and the ffc5p_20260819 layer grid (vendor preset,
// tops computed).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { gapPerSide, isThrownCommandError, type LossRow } from "@hackbuild/spec";
import { createProfileLookup, layerIndex, layerTop, sectionResistance, snapLayer, tablesFromSeed } from "../src/index";

const seed: unknown = JSON.parse(readFileSync(new URL("../seed/profile.seed.json", import.meta.url), "utf8"));
const tables = tablesFromSeed(seed);
const six = (x: number): string => x.toFixed(6);

describe("realGap (D-100, per side)", () => {
  test("gapPerSide(5.0, 4.6) is 0.2 (computed)", () => {
    expect(six(gapPerSide(5.0, 4.6))).toBe("0.200000");
  });

  test("realGap(0.275, hole, ffc5p, petg) is 0.075 to 6 digits (computed)", () => {
    const p = createProfileLookup(tables);
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg"))).toBe("0.075000");
    expect(p.warnings()).toEqual([]);
    expect(p.reads().filter((r) => r.table === "loss").map((r) => r.id)).toEqual([
      "fdm.fdm.static@*,petg,0.24,*,*",
    ]);
  });

  test("machine fallback 0.275 - 0.075 - 0.05 = 0.15 with the petg row removed (computed)", () => {
    const loss = tables.loss.filter((r) => r.material !== "petg");
    const p = createProfileLookup({ ...tables, loss });
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg"))).toBe("0.150000");
    // PROFILE.md 7.1: the machine row standing in for a material row warns (M00-T02).
    expect(p.warnings().map((w) => w.code)).toEqual(["LOSS_FALLBACK"]);
  });

  test("layer 0.20 has no petg row: machine row 0.15 with a warning (computed)", () => {
    const p = createProfileLookup(tables);
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg", 0.2))).toBe("0.150000");
    expect(p.warnings().map((w) => w.code)).toEqual(["LOSS_FALLBACK"]);
    expect(p.warnings()[0]?.text).toContain("petg");
  });

  test("outer side 0.275 - 0.075 = 0.20; realGaps returns both sides (computed)", () => {
    const p = createProfileLookup(tables);
    expect(six(p.realGap(0.275, "outer", "ffc5p", "petg"))).toBe("0.200000");
    const both = p.realGaps(0.275, "ffc5p", "petg");
    expect([six(both.hole), six(both.outer)]).toEqual(["0.075000", "0.200000"]);
  });

  test("an axis row wins only when the feature names that axis (test fixture row, computed)", () => {
    const base = tables.loss.find((r) => r.material === "petg" && r.motion === "static");
    if (base === undefined) throw new Error("petg static row missing");
    const horizontal: LossRow = { ...base, axis: "horizontal", holeUnderPerSide: 0.2 };
    const p = createProfileLookup({ ...tables, loss: [...tables.loss, horizontal] });
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg", 0.24, { holeAxis: "horizontal" }))).toBe("0.000000");
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg", 0.24, { holeAxis: "vertical" }))).toBe("0.075000");
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg"))).toBe("0.075000");
  });

  test("seed loss figures are halved on import", () => {
    for (const r of tables.loss) expect(r.basis).toBe("perSide");
    const petg = tables.loss.filter((r) => r.material === "petg");
    expect(petg).toHaveLength(5);
    for (const r of petg) expect([r.holeUnderPerSide, r.outerOverPerSide, r.layer]).toEqual([0.125, 0.075, 0.24]);
  });
});

describe("ffc5p_20260819 layer grid", () => {
  test("preset reads first layer 0.25, layer 0.24, line 0.42 (vendor)", () => {
    const p = createProfileLookup(tables);
    const pre = p.preset("ffc5p");
    expect([pre.id, pre.firstLayer, pre.layer, pre.lineWidth, pre.nozzle]).toEqual(["ffc5p_20260819", 0.25, 0.24, 0.42, 0.4]);
    expect(pre.provenance.tier).toBe("vendor");
    expect(p.reads()).toEqual([{ table: "machine", id: "ffc5p" }]);
  });

  test("flex-pair stack tops 0.73, 1.45, 2.41 mm (computed)", () => {
    const pre = createProfileLookup(tables).preset("ffc5p");
    // Stack inputs from PIP (D-085): skin 0.72, trace band 0.72, isolation 0.96 mm.
    const skin = snapLayer(pre, 0.72);
    const band = snapLayer(pre, skin + 0.72) - skin;
    const z0 = snapLayer(pre, skin + band + 0.96);
    expect([skin, skin + band, z0].map(six)).toEqual(["0.730000", "1.450000", "2.410000"]);
    expect([layerIndex(pre, skin), layerIndex(pre, skin + band), layerIndex(pre, z0)]).toEqual([2, 5, 9]);
  });

  test("grid rules of MachineView (computed)", () => {
    const pre = createProfileLookup(tables).preset("ffc5p");
    expect(layerIndex(pre, 1.69)).toBe(6);
    expect(six(snapLayer(pre, 0.1))).toBe("0.250000");
    expect(six(layerTop(pre, 0))).toBe("0.250000");
    // cone 3.20 over z0 2.41 snaps to 3.36, 14 layers (computed)
    const z0 = layerTop(pre, 9);
    expect(six(snapLayer(pre, z0 + 3.2) - z0)).toBe("3.360000");
  });
});

describe("resistivity (D-081, PROFILE.md 4.3)", () => {
  test("cpla along 500, through 2000, ctpu 400 ohm cm (inferred)", () => {
    const p = createProfileLookup(tables);
    const along = p.resistivity("cpla", "along", "printed");
    expect([along.id, along.ohmCm, along.provenance.tier]).toEqual(["cpla.pip.along", 500, "inferred"]);
    expect(p.resistivity("cpla", "through", "printed").ohmCm).toBe(2000);
    expect(p.resistivity("ctpu", "bulk", "printed").ohmCm).toBe(400);
    expect(p.warnings()).toEqual([]);
  });

  test("fallbacks warn; cpla bulk is E_REF", () => {
    const p = createProfileLookup(tables);
    expect(p.resistivity("cpla", "across", "printed").id).toBe("cpla.pip.along");
    expect(p.resistivity("ctpu", "along", "printed").id).toBe("ctpu.pip.bulk");
    expect(p.warnings().map((w) => w.text)).toEqual([
      "cpla: no across row; in-plane figure used",
      "ctpu: no along row; bulk figure used",
    ]);
    let code: string | undefined;
    try {
      p.resistivity("cpla", "bulk", "printed");
    } catch (e) {
      if (isThrownCommandError(e)) code = e.hbf.code;
    }
    expect(code).toBe("E_REF");
  });

  test("retired seed values 30 and 1500 ohm cm are never returned", () => {
    for (const m of tables.materials) {
      for (const r of m.resistivity) expect([30, 1500]).not.toContain(r.ohmCm);
    }
  });

  test("section resistance golden: 500 ohm cm, 1 mm, 1.4 x 0.72 mm2 gives 4960.3 ohm (computed)", () => {
    const row = createProfileLookup(tables).resistivity("cpla", "along", "printed");
    const r = sectionResistance(row, 1, 1.4 * 0.72);
    expect(typeof r.ohm === "number" ? r.ohm.toFixed(1) : "range").toBe("4960.3");
    expect([r.tier, r.rowId]).toEqual(["inferred", "cpla.pip.along"]);
  });
});

describe("lookup contract", () => {
  test("unknown ids throw ThrownCommandError E_REF with didYouMean", () => {
    const p = createProfileLookup(tables);
    let err: unknown;
    try {
      p.material("cplaa");
    } catch (e) {
      err = e;
    }
    expect(isThrownCommandError(err)).toBe(true);
    if (isThrownCommandError(err)) {
      expect(err.hbf.code).toBe("E_REF");
      expect(err.hbf.didYouMean).toContain("cpla");
    }
    expect(() => p.machine("centauri")).toThrow(/E_REF/);
  });

  test("slice materials carry handling and provenance; reads are recorded once in order", () => {
    const p = createProfileLookup(tables);
    for (const id of ["petg", "cpla", "ctpu"]) {
      const m = p.material(id);
      expect(m.handling?.minNozzleMm).toBe(0.4);
      expect(m.provenance.tier).toBe("inferred");
    }
    p.material("petg");
    expect(p.reads()).toEqual([
      { table: "material", id: "petg" },
      { table: "material", id: "cpla" },
      { table: "material", id: "ctpu" },
    ]);
    expect(p.toolhead("ffc5p", 4).nozzleMaterial).toBe("hardened_steel");
    expect(p.contact("cpla", "ctpu", "printed-interface")).toBeNull();
  });
});
