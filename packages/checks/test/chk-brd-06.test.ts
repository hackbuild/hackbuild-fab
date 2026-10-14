// CHK-BRD-06 (M08-T03 step 6): one fail per inferred geometry or
// connectivity field a part read, a pass naming the weakest tier when none
// is inferred, nothing for check-only fields. The reads are typed here.

import { describe, expect, test } from "vitest";
import type { CheckCtx, Part, Provenance, RecordRead } from "@hackbuild/spec";
import { runBrd06 } from "../src/defs/brd/CHK-BRD-06";

const p = (tier: Provenance["tier"]): Provenance => ({ tier, method: tier === "inferred" ? "derived" : "datasheet", date: "2026-10-09", source: `fixture ${tier}` });
const part = (id: string, reads: readonly RecordRead[]): Part => ({ id, catalogReads: reads } as unknown as Part);

function run(parts: readonly Part[]) {
  const byId = new Map(parts.map((x) => [x.id, x]));
  const ctx = { views: { part: (id: string) => byId.get(id) } } as unknown as CheckCtx;
  return runBrd06({ level: "project", project: { items: parts.map((x) => ({ id: x.id, kind: "part", hash: "h" })), links: [], stale: [] } }, ctx);
}

describe("CHK-BRD-06", () => {
  test("pass: vendor pads and an inferred vil give one pass at the weakest gated tier", () => {
    const fs = run([part("spindle", [{ catalogId: "esp32c3-supermini", field: "pads", provenance: p("vendor") }, { catalogId: "esp32c3", field: "vil", provenance: p("inferred") }])]);
    expect(fs).toHaveLength(1);
    expect(fs[0]).toMatchObject({ verdict: "pass", measured: "vendor", legal: { kind: "set", values: ["verified", "measured", "vendor", "community"] } });
  });

  test("fail: each inferred gated field is one fail naming the row, the field and the source", () => {
    const fs = run([part("lug", [
      { catalogId: "mp2636", field: "pins", provenance: p("inferred") },
      { catalogId: "max17048", field: "pins", provenance: p("inferred") },
      { catalogId: "max17048", field: "dyn.x", provenance: p("inferred") },
    ])]);
    expect(fs.map((f) => [f.verdict, f.measured, f.extra?.["catalogId"]])).toEqual([["fail", "inferred", "mp2636"], ["fail", "inferred", "max17048"]]);
    expect(fs[0]?.constraint).toBe("mp2636 pins is inferred (fixture inferred); measure pins of mp2636 or pick a vendor row");
  });

  test("fail, not skip: a board record that places parts with its reads emptied fails once per part (partGaps)", () => {
    const board = { reads: [], parts: [
      { ref: "J1", catalogId: "kicad:PinHeader_1x02_P2.54mm_Vertical", tier: "community" },
      { ref: "J2", catalogId: "kicad:PinHeader_1x02_P2.54mm_Vertical", tier: "community" },
    ] };
    const fs = run([{ id: "pair", board } as unknown as Part]);
    expect(fs.map((f) => [f.verdict, f.measured, f.extra?.["path"]])).toEqual([["fail", "no catalog read", "/parts/J1"], ["fail", "no catalog read", "/parts/J2"]]);
  });

  test("skip: no part read a catalog field", () => {
    expect(run([part("x", [])])[0]).toMatchObject({ verdict: "skip" });
  });
});
