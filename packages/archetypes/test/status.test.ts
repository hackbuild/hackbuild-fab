// M06-T07 step 1: every registered entry has a status, the split equals the
// split the def files' text states (tools/test/counts.test.mjs holds the
// generated count to the same files), every runnable entry names a
// reference and an original, and every refused one names its reason. The
// split is printed; it differs from the card's expected split, and the card
// carries why (build notes, M06-T07).

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { archetypes } from "@hackbuild/archetypes";

const defDir = new URL("../src/defs/", import.meta.url);
/** Each def file's status as its text states it, counted by status. */
const defStatus: Record<string, number> = {};
for (const dir of [defDir, new URL("feeler/", defDir), new URL("originals/", defDir)]) {
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts") && n !== "index.ts")) {
    const s = /^\s*status: "([a-z]+)",$/m.exec(readFileSync(new URL(f, dir), "utf8"))?.[1] ?? "unstated";
    defStatus[s] = (defStatus[s] ?? 0) + 1;
  }
}

describe("archetype status", () => {
  test("the split, printed and equal to the def files' stated split", () => {
    const by: Record<string, number> = { proven: 0, stub: 0, candidate: 0, unproven: 0 };
    for (const e of archetypes.entries) by[e.def.status] = (by[e.def.status] ?? 0) + 1;
    console.log(`archetypes: proven ${by["proven"]} stub ${by["stub"]} candidate ${by["candidate"]} unproven ${by["unproven"]} over ${archetypes.ids().length} ids`);
    expect(Object.fromEntries(Object.entries(by).filter(([, n]) => n > 0))).toEqual(defStatus);
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
