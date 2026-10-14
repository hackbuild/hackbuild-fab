// M06-T07 step 3: resistances at load through profile sectionResistance,
// and the tier rule (an archetype's tier is the lowest tier among the rows
// it reads). The load golden is the card's printed-rotary-pot arc table:
// the Protopasta row and the PIP rows come from the shipped profile data;
// the BOSS cTPU slot has no profile row, so the test builds an in-memory
// row whose value it reads from the BOSS original (boss.js line 32).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { ProfileLookup, ResistivityRow } from "@hackbuild/spec";
import { ARCHETYPE_ALIASES, ARCHETYPE_DEFS, archetypeTier, archetypes, clickSections, flexSections, loadArchetypes, resistances, shippedProfile } from "@hackbuild/archetypes";
import { originalPath } from "../../../tools/test-support/originals-root.js";

const BOSS = originalPath("boss/files/boss-src/src/boss.js");

/** The shipped lookup with resistivity() answering `row` for every material. */
function rowLookup(row: ResistivityRow): ProfileLookup {
  const p = shippedProfile();
  return new Proxy(p, { get: (t, k) => (k === "resistivity" ? () => row : Reflect.get(t, k)) });
}

describe("resistance at load", () => {
  const arc = archetypes.resolve("printed-rotary-pot").def.sections ?? [];

  test("the rotary pot arc at each row of the card's golden, to the ohm", () => {
    expect(arc[0]?.lengthMm.toFixed(4)).toBe("34.0339");
    const p = shippedProfile();
    const bossLine = readFileSync(BOSS, "utf8").split("\n")[31] ?? "";
    const eel = Number(/rho: (\d+)/.exec(bossLine)?.[1]);
    expect(bossLine).toContain("Eel class");
    const bossRow: ResistivityRow = { id: "ctpu-eel.boss", direction: "bulk", ohmCm: eel, form: "printed", brand: "Eel", provenance: { tier: "inferred", method: "derived", date: "2026-10-09", source: `${BOSS} line 32` } };
    const rows: [ResistivityRow, number, string][] = [
      [p.resistivity("cpla-protopasta", "along", "printed"), 14181, "vendor"],
      [bossRow, 709040, "inferred"],
      [p.resistivity("cpla", "along", "printed"), 236347, "inferred"],
      [p.resistivity("ctpu", "bulk", "printed"), 189077, "inferred"],
    ];
    for (const [row, ohm, tier] of rows) {
      const [r] = resistances(arc, rowLookup(row));
      expect(Math.round(r!.ohm as number), row.id).toBe(ohm);
      expect(r!.tier, row.id).toBe(tier);
    }
    // At the working rows the cTPU arc reads lower than the cPLA arc: the seed's limit sentence reverses (finding, waits on D-082).
    expect(rows[3]![1]).toBeLessThan(rows[2]![1]);
  });

  test("a series section prices its path that many times: R = k rho L / A, on a number row and a range row", () => {
    const prov = { tier: "inferred" as const, method: "derived" as const, date: "2026-10-11", source: "probe" };
    const one = { id: "s", material: "ctpu", direction: "bulk" as const, widthMm: 2, thicknessMm: 0.5, lengthMm: 3, source: "probe" };
    const two = { ...one, series: 2 };
    // R = rho L / A by hand: ohm cm x 10 mm/cm x 3 mm / 1 mm2 = 30 rho.
    const num: ResistivityRow = { id: "probe.num", direction: "bulk", ohmCm: 7, form: "printed", brand: "probe", provenance: prov };
    const [a1, a2] = resistances([one, two], rowLookup(num));
    expect(a1!.ohm).toBe(210);
    expect(a2!.ohm).toBe(420);
    const range: ResistivityRow = { ...num, id: "probe.range", ohmCm: [5, 11] };
    const [b1, b2] = resistances([one, two], rowLookup(range));
    expect(b1!.ohm).toEqual([150, 330]);
    expect(b2!.ohm).toEqual([300, 660]);
  });

  test("the PIP series-2 paths read twice their one-half path on the shipped rows", () => {
    const p = shippedProfile();
    const halves = [
      ...clickSections().filter((s) => s.id === "switch.down"),
      ...flexSections(p).filter((s) => s.id === "switch.through" || s.id === "column"),
    ];
    expect(halves.map((s) => s.id).sort()).toEqual(["column", "switch.down", "switch.through"]);
    for (const s of halves) {
      expect(s.series, s.id).toBe(2);
      const row = p.resistivity(s.material, s.direction, "printed");
      expect(typeof row.ohmCm, s.id).toBe("number");
      const half = ((row.ohmCm as number) * 10 * s.lengthMm) / (s.widthMm * s.thicknessMm);
      const [r] = resistances([s], p);
      expect(r!.ohm as number, s.id).toBeCloseTo(2 * half, 9);
    }
  });

  test("no def stores a resistance: no numeric ohm field in src/defs", () => {
    for (const d of ARCHETYPE_DEFS) for (const k of Object.keys(d)) expect(k, d.id).not.toMatch(/ohm/i);
  });

  test("one row change moves every dependent tier: cPLA measured lifts cPLA-only archetypes, leaves cTPU readers inferred", () => {
    const p = shippedProfile();
    const measured: ProfileLookup = new Proxy(p, {
      get: (t, k) => (k === "resistivity"
        ? (m: string, d: ResistivityRow["direction"], f: "printed" | "molded") => {
          const r = t.resistivity(m, d, f);
          return m === "cpla" ? { ...r, provenance: { ...r.provenance, tier: "measured" } } : r;
        }
        : Reflect.get(t, k)),
    });
    const reg = loadArchetypes(ARCHETYPE_DEFS, ARCHETYPE_ALIASES, measured);
    const reads = (id: string, mat: string): boolean => (reg.resolve(id).def.sections ?? []).some((s) => s.material === mat);
    let lifted = 0, held = 0;
    for (const e of reg.entries) {
      const secs = e.def.sections ?? [];
      if (secs.length === 0) continue;
      if (secs.every((s) => s.material === "cpla")) { expect(e.def.tier, e.id).toBe("measured"); lifted++; }
      if (reads(e.id, "ctpu")) { expect(e.def.tier, e.id).toBe("inferred"); held++; }
    }
    // An archetype that reads cPLA first and cTPU after takes the lower of the two, whatever the order.
    const probe = { sections: [
      { id: "a", material: "cpla", direction: "along" as const, widthMm: 1, thicknessMm: 1, lengthMm: 1, source: "probe" },
      { id: "b", material: "ctpu", direction: "bulk" as const, widthMm: 1, thicknessMm: 1, lengthMm: 1, source: "probe" },
    ] };
    expect(archetypeTier(probe, measured)).toBe("inferred");
    expect(archetypeTier({ sections: probe.sections.slice(0, 1) }, measured)).toBe("measured");
    expect(lifted).toBeGreaterThan(0);
    expect(held).toBeGreaterThan(0);
    expect(archetypes.resolve("touch-comb-key").def.tier).toBe("inferred");
  });
});
