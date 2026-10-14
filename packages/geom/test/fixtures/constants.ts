// The three profile constants geom reads, at the values and tiers of
// M00-T02 step 9. A stand-in for the profile lookup so geom tests do not
// depend on the profile seed; the rows match the step 9 table.

import type { Constant } from "@hackbuild/spec";
import type { ConstantSource } from "../../src/index.js";

const row = (id: string, value: number, source: string): Constant => ({
  id,
  value,
  unit: "mm",
  provenance: { tier: "inferred", method: "derived", date: "2026-10-04", source },
});

export const CONSTANT_ROWS: readonly Constant[] = [
  row("3mf.coincidenceInset", 0.001, "D-070 (1 micron edge-normal inset)"),
  row("3mf.pinchInset", 0.02, "COTTER applyArt HAIR, D-070"),
  row("geom.sliverMin.n04", 0.6, "demo_coin.py header"),
];

export const profileStub: ConstantSource = {
  constant(id: string): Constant {
    const c = CONSTANT_ROWS.find((r) => r.id === id);
    if (c === undefined) throw Object.assign(new Error(`unknown constant ${id}`), { hbf: { code: "E_REF", got: id, hint: "name a seeded constant" } });
    return c;
  },
};
