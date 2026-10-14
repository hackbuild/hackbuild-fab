// M01-T03: every number the M01 queries read, read back through
// ProfileLookup with value, tier and method. Expected values are the card
// table (docs/plan/milestones/M01-constraints.md M01-T03) and PROFILE.md
// 3.2, 3.3, 4.1 and 10.1, typed here as goldens; the seed and the PIP
// source line 46 are read as independent sources, never the data files.

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, type ResistivityDirection, type Tier } from "@hackbuild/spec";
import { PROFILE_DATA, createProfileLookup, loadProfile, tablesFromData } from "../src/index";

const tables = loadProfile();
const fresh = () => createProfileLookup(tables);
const repo = new URL("../../../", import.meta.url);
const seed = JSON.parse(readFileSync(new URL("packages/profile/seed/profile.seed.json", repo), "utf8")) as {
  materials: { id: string; strainMax?: number; resistivityOhmCm?: number;
    resistivityAnisotropy?: { along: number; across: number; through: number } }[];
};
const seedRow = (id: string) => {
  const r = seed.materials.find((m) => m.id === id);
  if (r === undefined) throw new Error(`seed has no material ${id}`);
  return r;
};

type Json = Record<string, unknown>;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const DIRECTIONS: readonly ResistivityDirection[] = ["along", "across", "through", "bulk"];

/** One card row: what to read, and the value, tier and method the card states. */
interface Want { readonly row: string; readonly value: number; readonly tier: Tier; readonly method: string }

describe("M01-T03 card rows through ProfileLookup", () => {
  const resistivity: (Want & { m: string; d: ResistivityDirection; form: "printed" | "molded"; id: string })[] = [
    { row: "cpla working, along", m: "cpla", d: "along", form: "printed", id: "cpla.pip.along", value: 500, tier: "inferred", method: "derived" },
    { row: "cpla working, through", m: "cpla", d: "through", form: "printed", id: "cpla.pip.through", value: 2000, tier: "inferred", method: "derived" },
    { row: "ctpu working", m: "ctpu", d: "bulk", form: "printed", id: "ctpu.pip.bulk", value: 400, tier: "inferred", method: "derived" },
    { row: "cpla Protopasta molded", m: "cpla-protopasta", d: "bulk", form: "molded", id: "cpla-protopasta.molded", value: 15, tier: "vendor", method: "datasheet" },
    { row: "cpla Protopasta printed XY", m: "cpla-protopasta", d: "along", form: "printed", id: "cpla-protopasta.xy", value: 30, tier: "vendor", method: "datasheet" },
    { row: "cpla Protopasta printed Z", m: "cpla-protopasta", d: "through", form: "printed", id: "cpla-protopasta.z", value: 115, tier: "vendor", method: "datasheet" },
  ];
  for (const w of resistivity) {
    test(`${w.row}: ${w.value} ohm cm, ${w.tier}, ${w.method}`, () => {
      const p = fresh();
      const r = p.resistivity(w.m, w.d, w.form);
      expect([r.id, r.ohmCm, r.provenance.tier, r.provenance.method]).toEqual([w.id, w.value, w.tier, w.method]);
      expect(p.readSet().map((x) => `${x.table}:${x.id}`)).toContain(`resistivity:${w.id}`);
    });
  }

  test("PETG strain in the layer plane: 2.5 percent, inferred, failure (D-073, PROFILE.md 3.2)", () => {
    for (const use of ["click", "snap"] as const) {
      const s = fresh().strain("petg", use, "inPlane");
      expect([s.pct, s.provenance.tier, s.provenance.method, s.rangePct]).toEqual([2.5, "inferred", "failure", undefined]);
    }
  });

  test("PETG strain across layers: 1.5 percent, range 1.5 to 1.8, inferred, derived (D-073)", () => {
    for (const use of ["click", "snap"] as const) {
      const s = fresh().strain("petg", use, "acrossLayers");
      expect([s.pct, s.rangePct, s.provenance.tier, s.provenance.method]).toEqual([1.5, [1.5, 1.8], "inferred", "derived"]);
    }
  });

  const constants: (Want & { unit: string })[] = [
    { row: "click.dropMin", value: 0.5, unit: "ratio", tier: "inferred", method: "derived" },
    { row: "prt.perimetersMin", value: 2, unit: "count", tier: "inferred", method: "derived" },
    { row: "cpla.flexFatigueWidthMin", value: 0.8, unit: "mm", tier: "inferred", method: "derived" },
  ];
  for (const w of constants) {
    test(`constant ${w.row}: ${w.value} ${w.unit}, ${w.tier}, ${w.method}`, () => {
      const p = fresh();
      const c = p.constant(w.row);
      expect([c.value, c.unit, c.provenance.tier, c.provenance.method]).toEqual([w.value, w.unit, w.tier, w.method]);
      expect(p.readSet().map((x) => `${x.table}:${x.id}`)).toEqual([`constant:${w.row}`]);
    });
  }

  test("ffc5p 0.4 preset bore: 0.40 mm, vendor, datasheet (D-101; the row the card calls line width)", () => {
    const pr = fresh().machine("ffc5p").presets.find((x) => x.id === "ffc5p_20260819");
    expect(pr).toBeDefined();
    expect([pr?.nozzle, pr?.provenance.tier, pr?.provenance.method]).toEqual([0.4, "vendor", "datasheet"]);
  });

  test("the M01-T06 printability floor resolves from rows: 0.40 x 2 = 0.80 mm (computed), equal to the fatigue floor", () => {
    const p = fresh();
    const bore = p.machine("ffc5p").presets.find((x) => x.id === "ffc5p_20260819")?.nozzle ?? Number.NaN;
    const floor = bore * p.constant("prt.perimetersMin").value;
    expect(floor).toBeCloseTo(0.8, 9);
    expect(floor).toBeCloseTo(p.constant("cpla.flexFatigueWidthMin").value, 9);
  });
});

describe("independent sources agree with the rows", () => {
  test("seed petg-click strainMax 0.025 is the in-plane row as a percent", () => {
    expect(fresh().strain("petg", "click", "inPlane").pct).toBeCloseTo((seedRow("petg-click").strainMax ?? Number.NaN) * 100, 9);
  });

  test("seed cpla anisotropy 15/30/115 lands on cpla-protopasta, and the seed 30 is never served for cpla", () => {
    const a = seedRow("cpla").resistivityAnisotropy;
    const p = fresh();
    expect([
      p.resistivity("cpla-protopasta", "bulk", "molded").ohmCm,
      p.resistivity("cpla-protopasta", "along", "printed").ohmCm,
      p.resistivity("cpla-protopasta", "through", "printed").ohmCm,
    ]).toEqual([a?.along, a?.across, a?.through]);
    for (const d of ["along", "across", "through"] as const) {
      expect(p.resistivity("cpla", d, "printed").ohmCm).not.toBe(seedRow("cpla").resistivityOhmCm);
    }
  });

  // The PIP controller source of record, located through its lineage row.
  const lineage = JSON.parse(readFileSync(new URL("lineage.json", repo), "utf8")) as { id: string; source: string }[];
  const layoutPath = lineage.find((r) => r.id === "pip.layout/pip-controller-b137deb")?.source ?? "";
  test.skipIf(!existsSync(layoutPath))(`pip-controller layout.js:46 phys rhoC, rhoCz, rhoT equal the PIP preset rows (${layoutPath})`, () => {
    const line = readFileSync(layoutPath, "utf8").split("\n")[45] ?? "";
    const num = (k: string) => Number(new RegExp(`\\b${k}:\\s*([0-9.]+)`).exec(line)?.[1]);
    const p = fresh();
    expect([
      p.resistivity("cpla", "along", "printed").ohmCm,
      p.resistivity("cpla", "through", "printed").ohmCm,
      p.resistivity("ctpu", "bulk", "printed").ohmCm,
    ]).toEqual([num("rhoC"), num("rhoCz"), num("rhoT")]);
  });
});

describe("C-09 and D-082 guards", () => {
  test("no cpla or ctpu resistivity row carries tier measured", () => {
    const rows = tables.materials.filter((m) => m.id.startsWith("cpla") || m.id.startsWith("ctpu")).flatMap((m) => m.resistivity);
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows.filter((r) => r.provenance.tier === "measured").map((r) => r.id)).toEqual([]);
  });

  test("no printed request in any direction returns a raw-filament row, for every material", () => {
    const p = fresh();
    for (const m of tables.materials) {
      for (const d of DIRECTIONS) {
        try {
          expect(p.resistivity(m.id, d, "printed").form).toBe("printed");
        } catch (e) {
          if (!isThrownCommandError(e) || e.hbf.code !== "E_REF") throw e;
        }
      }
    }
  });

  // PROFILE.md 4.1 row cpla.yousu.raw, 240 to 481 ohm cm vendor, flagged raw
  // filament. It is not in data/ at M01; injected here so the rule is tested
  // on the row the plan names.
  const withRow = (row: Json) => {
    const m = clone(PROFILE_DATA.materials) as { materials: Json[] };
    const cpla = m.materials.find((x) => x["id"] === "cpla") as Json;
    (cpla["resistivity"] as Json[]).push(row);
    return createProfileLookup(tablesFromData({ ...PROFILE_DATA, materials: m }));
  };
  const yousuRaw: Json = {
    id: "cpla.yousu.raw", direction: "bulk", ohmCm: [240, 481], form: "raw-filament", brand: "Yousu",
    provenance: { tier: "vendor", method: "datasheet", date: "2026-10-06", source: "PROFILE.md 4.1 cpla.yousu.raw" },
  };

  test("the Yousu raw-filament row is flagged raw filament and never returned for a printed direction", () => {
    const p = withRow(yousuRaw);
    expect(p.material("cpla").resistivity.find((r) => r.id === "cpla.yousu.raw")?.form).toBe("raw-filament");
    for (const d of DIRECTIONS) {
      let got: string | undefined;
      try {
        got = p.resistivity("cpla", d, "printed").id;
      } catch (e) {
        if (!isThrownCommandError(e) || e.hbf.code !== "E_REF") throw e;
      }
      expect(got).not.toBe("cpla.yousu.raw");
    }
    expect(p.readSet().map((x) => x.id)).not.toContain("cpla.yousu.raw");
  });

  test("a Protopasta row filed under cpla is never returned for cpla, even at a higher tier", () => {
    const p = withRow({
      id: "cpla.protopasta-misfiled", direction: "along", ohmCm: 30, form: "printed", brand: "Protopasta",
      provenance: { tier: "vendor", method: "datasheet", date: "2026-10-06", source: "test row, C-09 brand scope" },
    });
    expect(p.resistivity("cpla", "along", "printed").id).toBe("cpla.pip.along");
  });
});
