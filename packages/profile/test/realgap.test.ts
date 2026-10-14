// M00-T02 realGap pins over packages/profile/data, per side throughout
// (D-100, PROFILE.md 7.2 and 7.3). Every expected figure is computed.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { gapPerSide, isThrownCommandError, type FitClassId, type LossRow } from "@hackbuild/spec";
import { createProfileLookup, loadLoss, loadProfile, tablesFromData, PROFILE_DATA } from "../src/index";

interface SeedLoss { holeUnder: number; outerOver: number }
const seed = JSON.parse(readFileSync(new URL("../seed/profile.seed.json", import.meta.url), "utf8")) as {
  materials: { id: string; processLossAt024?: SeedLoss }[];
  machines: { id: string; processLoss?: SeedLoss }[];
};
const tables = loadProfile();
const six = (x: number): string => x.toFixed(6);
const fit = (s: string): FitClassId => s as FitClassId;

function codeOf(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf.code;
    throw e;
  }
  return undefined;
}

describe("realGap pins (D-100)", () => {
  test("gapPerSide(5.0, 4.6) is 0.2 per side", () => {
    expect(six(gapPerSide(5.0, 4.6))).toBe("0.200000");
  });

  test("realGap(0.275, hole, ffc5p, petg) is 0.075 to 6 digits from material:petg@0.24, tier inferred", () => {
    const p = createProfileLookup(tables);
    expect(p.realGap(0.275, "hole", "ffc5p", "petg").toFixed(6)).toBe("0.075000");
    const loss = p.readSet().filter((r) => r.table === "loss");
    expect(loss.map((r) => r.id)).toEqual(["fdm.fdm.static@*,petg,0.24,*,*"]);
    const row = loss[0]?.row as LossRow;
    expect([row.material, row.layer, row.provenance.tier]).toEqual(["petg", 0.24, "inferred"]);
    expect(p.warnings()).toEqual([]);
  });

  test("petg loss row removed: 0.275 - 0.075 - 0.05 = 0.15 from machine:ffc5p", () => {
    const p = createProfileLookup({ ...tables, loss: tables.loss.filter((r) => r.material !== "petg") });
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg"))).toBe("0.150000");
    const loss = p.readSet().filter((r) => r.table === "loss");
    expect(loss.map((r) => r.id)).toEqual(["fdm.fdm.static@ffc5p,*,*,*,*"]);
    expect((loss[0]?.row as LossRow).provenance.tier).toBe("inferred");
  });

  test("layer 0.20 has no petg row: 0.15 from the machine row, tier inferred, warning names the missing row", () => {
    const p = createProfileLookup(tables);
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg", 0.2))).toBe("0.150000");
    expect(p.warnings()).toEqual([
      { code: "LOSS_FALLBACK", text: "no petg loss row at layer 0.2; machine row ffc5p used (inferred)" },
    ]);
  });

  test("outer side 0.20; realGaps returns both sides", () => {
    const p = createProfileLookup(tables);
    expect(six(p.realGap(0.275, "outer", "ffc5p", "petg"))).toBe("0.200000");
    const both = p.realGaps(0.275, "ffc5p", "petg");
    expect([six(both.hole), six(both.outer)]).toEqual(["0.075000", "0.200000"]);
  });

  test("axis fixture row: horizontal bore 0.00, vertical and featureless 0.075", () => {
    const base = tables.loss.find((r) => r.material === "petg" && r.motion === "static");
    if (base === undefined) throw new Error("petg static row missing");
    const horizontal: LossRow = { ...base, axis: "horizontal", holeUnderPerSide: 0.2 };
    const p = createProfileLookup({ ...tables, loss: [...tables.loss, horizontal] });
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg", 0.24, { holeAxis: "horizontal" }))).toBe("0.000000");
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg", 0.24, { holeAxis: "vertical" }))).toBe("0.075000");
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg"))).toBe("0.075000");
  });

  test("a dRange row is skipped when no diameter is given", () => {
    const base = tables.loss.find((r) => r.material === "petg" && r.motion === "static");
    if (base === undefined) throw new Error("petg static row missing");
    const small: LossRow = { ...base, dRange: [0, 3], holeUnderPerSide: 0.2 };
    const p = createProfileLookup({ ...tables, loss: [...tables.loss, small] });
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg"))).toBe("0.075000");
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg", 0.24, { d: 2 }))).toBe("0.000000");
  });

  test("a comp mismatch warns and still returns the row", () => {
    const base = tables.loss.find((r) => r.material === "petg" && r.motion === "static");
    if (base === undefined) throw new Error("petg static row missing");
    const rest = tables.loss.filter((r) => r !== base);
    const comp = { xyHole: 0.05, xyContour: 0, elephantFoot: 0.1, elephantFootLayers: 1 };
    const p = createProfileLookup({ ...tables, loss: [...rest, { ...base, comp }] });
    expect(six(p.realGap(0.275, "hole", "ffc5p", "petg"))).toBe("0.075000");
    expect(p.warnings().map((w) => w.code)).toEqual(["LOSS_COMP"]);
  });

  test("loss rows are per side, one per motion with equal values, halved from the seed", () => {
    for (const r of tables.loss) expect(r.basis).toBe("perSide");
    const groups = new Map<string, Set<string>>();
    for (const r of tables.loss) {
      const k = `${r.processA}.${r.processB}.${r.machine ?? "*"}.${r.material ?? "*"}.${r.layer ?? "*"}`;
      const g = groups.get(k) ?? new Set<string>();
      g.add(`${r.holeUnderPerSide}/${r.outerOverPerSide}`);
      groups.set(k, g);
    }
    expect([...groups.values()].every((g) => g.size === 1)).toBe(true);
    expect(tables.loss).toHaveLength(15);
    const petg = seed.materials.find((m) => m.id === "petg")?.processLossAt024;
    const ffc = seed.machines.find((m) => m.id === "ffc5p")?.processLoss;
    for (const r of tables.loss.filter((x) => x.processA === "fdm")) {
      const src = r.material === "petg" ? petg : ffc;
      expect([r.holeUnderPerSide, r.outerOverPerSide]).toEqual([(src?.holeUnder ?? NaN) / 2, (src?.outerOver ?? NaN) / 2]);
    }
  });

  test("a loss row or fit band with a basis other than perSide is refused with E_SCHEMA", () => {
    const row = { ...tables.loss[0], basis: "diametral" };
    expect(codeOf(() => loadLoss([row]))).toBe("E_SCHEMA");
    const fits = PROFILE_DATA.fits as { fits: Record<string, unknown>[] };
    const bad = { ...fits, fits: [{ ...fits.fits[0], basis: "diametral" }] };
    expect(codeOf(() => tablesFromData({ ...PROFILE_DATA, fits: bad }))).toBe("E_SCHEMA");
  });
});

describe("drawnFor inverts realGap over the same rows (PROFILE.md 7.3)", () => {
  test("results at ffc5p layer 0.24 match PROFILE.md 7.3 (computed)", () => {
    const p = createProfileLookup(tables);
    const d = (cls: string, side: "hole" | "outer", mat: string): string[] =>
      (p.drawnFor(fit(cls), side, "ffc5p", mat) ?? []).map(six);
    expect(d("SLIDE", "hole", "petg")).toEqual(["0.325000", "0.400000"]);
    expect(d("LOCATE", "hole", "petg")).toEqual(["0.200000", "0.275000"]);
    expect(d("PRESS", "hole", "petg")).toEqual(["0.125000", "0.175000"]);
    expect(d("GUIDE", "hole", "petg")).toEqual(["0.350000", "0.475000"]);
    expect(d("PSLIP", "outer", "petg")).toEqual(["0.225000", "0.350000"]);
  });

  test("SLIDE on pla reads the machine row and warns", () => {
    const p = createProfileLookup(tables);
    expect((p.drawnFor(fit("SLIDE"), "hole", "ffc5p", "pla") ?? []).map(six)).toEqual(["0.250000", "0.325000"]);
    expect(p.warnings().map((w) => w.code)).toEqual(["LOSS_FALLBACK"]);
  });

  test("laser in laser classes return null; a side that disagrees with the band is E_REF", () => {
    const p = createProfileLookup(tables);
    expect(p.drawnFor(fit("LAP"), "hole", "ffc5p", "petg")).toBeNull();
    expect(codeOf(() => p.drawnFor(fit("SLIDE"), "outer", "ffc5p", "petg"))).toBe("E_REF");
  });

  test("realGap(drawnFor(...)[i]) returns each band end to 6 digits", () => {
    const p = createProfileLookup(tables);
    const bands = tables.fits?.fits ?? [];
    let checked = 0;
    for (const band of bands) {
      const fdm = band.processes.includes("fdm");
      for (const side of ["hole", "outer"] as const) {
        let ends: readonly [number, number] | null;
        try {
          ends = p.drawnFor(band.class, side, "ffc5p", "petg");
        } catch (e) {
          // Only the read from the side the band does not own is an expected refusal.
          if (isThrownCommandError(e) && e.hbf.code === "E_REF") continue;
          throw e;
        }
        if (!fdm) {
          expect(ends, `${band.class} ${side}`).toBeNull();
          continue;
        }
        if (ends === null) throw new Error(`drawnFor(${band.class}, ${side}) returned null for an fdm band`);
        expect(six(p.realGap(ends[0], side, "ffc5p", "petg"))).toBe(six(band.realLoPerSide));
        expect(six(p.realGap(ends[1], side, "ffc5p", "petg"))).toBe(six(band.realHiPerSide));
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(checked).toBe(bands.filter((b) => b.processes.includes("fdm")).length);
  });
});
