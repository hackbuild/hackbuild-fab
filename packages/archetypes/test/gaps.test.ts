// M06-T09: every proven archetype has its reference folder (chase.ts,
// build.ts, README.md, expected/ with the four parity goldens), and every
// other entry is a gap that says what it waits for: a statusReason naming
// the card or milestone that promotes it (M06-T08 to T14, M07, M08, M10)
// or the defect that demoted it.

import { existsSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { archetypes } from "@hackbuild/archetypes";

const ROOT = new URL("../../../", import.meta.url);

describe("references and gaps", () => {
  test("each proven entry's reference folder exists with its goldens", () => {
    for (const e of archetypes.entries) {
      if (e.def.status !== "proven") continue;
      for (const ref of e.def.reference) {
        for (const f of ["chase.ts", "build.ts", "README.md", "expected/build.json", "expected/report.json", "expected/edit.json", "expected/artifacts.json"]) {
          expect(existsSync(new URL(`reference/${ref}/${f}`, ROOT)), `${e.id}: reference/${ref}/${f}`).toBe(true);
        }
      }
    }
  });

  test("each gap names what promotes it or why it was demoted", () => {
    const gaps = archetypes.entries.filter((e) => e.def.status !== "proven");
    expect(gaps.length).toBeGreaterThan(0);
    for (const e of gaps) {
      expect(e.def.statusReason, e.id).toMatch(/M0[6-9](-T\d+)?|M1\d|D-\d{3}|owner/);
      expect(e.def.reference, e.id).toEqual([]);
    }
    console.log(gaps.map((e) => `${e.id} (${e.def.status}): ${e.def.statusReason}`).join("\n"));
  });
});
