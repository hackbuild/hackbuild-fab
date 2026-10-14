// M08-T03 step 10: fab-house rows from PROFILE.md 8.2. The expected house
// names, dates and the pink-mask rule are the PROFILE.md table, typed here.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { fabHouseWarnings, loadFabHouses } from "../src/index";

const rows = loadFabHouses(JSON.parse(readFileSync(new URL("../data/fab-houses.json", import.meta.url), "utf8")));

describe("fab-houses", () => {
  test("two rows, PCBWay and JLCPCB, tier vendor, method listing, checked 2026-10-04", () => {
    expect(rows.map((r) => [r.house, r.provenance.tier, r.provenance.method, r.checked])).toEqual([
      ["PCBWay", "vendor", "listing", "2026-10-04"], ["JLCPCB", "vendor", "listing", "2026-10-04"],
    ]);
  });

  test("a pink mask for JLCPCB gives one BuildWarning naming the row and its date", () => {
    const w = fabHouseWarnings(rows, { house: "JLCPCB", mask: "pink" });
    expect(w).toHaveLength(1);
    expect(w[0]?.code).toBe("FAB_HOUSE");
    expect(w[0]?.text).toContain("jlcpcb.mask.pink");
    expect(w[0]?.text).toContain("checked 2026-10-04");
  });

  test("PCBWay pink warns on the standard order and not with the Advanced PCB service; green warns nowhere", () => {
    expect(fabHouseWarnings(rows, { house: "PCBWay", mask: "pink" })).toHaveLength(1);
    expect(fabHouseWarnings(rows, { house: "PCBWay", mask: "pink", service: "advanced-pcb" })).toHaveLength(0);
    expect(fabHouseWarnings(rows, { house: "JLCPCB", mask: "green" })).toHaveLength(0);
  });

  test("a row without a checked date is E_SCHEMA", () => {
    expect(() => loadFabHouses({ rows: [{ id: "x", house: "X", fact: "f", forbids: {}, provenance: {} }] })).toThrow(/checked/);
  });
});
