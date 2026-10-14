// M06-T07 step 1: every registered entry has a status, the split equals the
// generated count (docs/plan/counts.json), every runnable entry names a
// reference and an original, and every refused one names its reason. The
// split is printed; it differs from the card's expected split, and the card
// carries why (build notes, M06-T07).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { archetypes } from "@hackbuild/archetypes";

const counts = JSON.parse(readFileSync(new URL("../../../docs/plan/counts.json", import.meta.url), "utf8")) as { canon: { archetypes: { byStatus: Record<string, number> } } };

describe("archetype status", () => {
  test("the split, printed and equal to the generated count", () => {
    const by: Record<string, number> = { proven: 0, stub: 0, candidate: 0, unproven: 0 };
    for (const e of archetypes.entries) by[e.def.status] = (by[e.def.status] ?? 0) + 1;
    console.log(`archetypes: proven ${by["proven"]} stub ${by["stub"]} candidate ${by["candidate"]} unproven ${by["unproven"]} over ${archetypes.ids().length} ids`);
    expect(Object.fromEntries(Object.entries(by).filter(([, n]) => n > 0))).toEqual(counts.canon.archetypes.byStatus);
  });

  test("proven entries run, name a reference and an original; the demotion stays unproven", () => {
    for (const e of archetypes.entries) {
      if (e.def.status !== "proven") { expect(e.def.statusReason, e.id).toBeTruthy(); continue; }
      expect(e.def.reference.length, e.id).toBeGreaterThan(0);
      expect(e.def.original?.length, e.id).toBeGreaterThan(0);
    }
    expect(archetypes.resolve("three-source-power-oring").def.status).toBe("unproven");
    for (const id of ["flex-cone-key", "click-spring-key", "touch-comb-key"]) expect(archetypes.resolve(id).def.status, id).toBe("proven");
    // Ported with parity, refused until its reference builds green (M06-T08 build notes).
    expect(archetypes.resolve("tilt-stick").def.status).toBe("candidate");
  });
});
