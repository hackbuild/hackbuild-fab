// chase.diff over values (M10-T04 step 4): changes by JSON pointer with
// op added, removed or changed, both sides migrated first. The schema 1
// handoff template and its own migration differ by nothing, and the
// migration lines are reported for the side that ran them. The flex pair
// read as data is the base for the value edits.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { diffChase, diffValues, migrateChase } from "@hackbuild/chase";
import { flexPair, ROOT } from "./helpers.js";

const TEMPLATE = path.join(ROOT, "packages", "chase", "test", "fixtures", "v1", "_template.chase.json");
const template = (): Record<string, unknown> => JSON.parse(readFileSync(TEMPLATE, "utf8")) as Record<string, unknown>;
const GAP = "/params/1/fields/0/item/3/default";

/** The flex pair with its travel default set to v. */
function withGap(v: number): Record<string, unknown> {
  const c = structuredClone(flexPair()) as unknown as { params: { fields: { item: { default: number }[] }[] }[] };
  c.params[1]!.fields[0]!.item[3]!.default = v;
  return c as unknown as Record<string, unknown>;
}

describe("diffValues", () => {
  it("is empty for equal values in any key order", () => {
    expect(diffValues({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toEqual([]);
  });
  it("names added, removed and changed leaves by pointer, keys sorted, arrays by index", () => {
    expect(diffValues({ z: 1, a: [1, 2, 3], m: { x: 1 } }, { a: [1, 5], m: { y: 2, x: 1 }, n: true })).toEqual([
      { op: "changed", path: "/a/1", from: 2, to: 5 },
      { op: "removed", path: "/a/2", from: 3, to: null },
      { op: "added", path: "/m/y", from: null, to: 2 },
      { op: "added", path: "/n", from: null, to: true },
      { op: "removed", path: "/z", from: 1, to: null },
    ]);
  });
  it("escapes ~ and / in keys (RFC 6901) and reports a type change at its root", () => {
    expect(diffValues({ "a/b": { "c~d": 1 } }, { "a/b": { "c~d": [1] } })).toEqual([{ op: "changed", path: "/a~1b/c~0d", from: 1, to: [1] }]);
    expect(diffValues(1, 2)).toEqual([{ op: "changed", path: "/", from: 1, to: 2 }]);
  });
});

describe("diffChase", () => {
  it("lists the flex-pair travel edit as one change at its pointer", () => {
    const d = diffChase(withGap(1.44), withGap(2.15));
    expect(d.changes).toEqual([{ op: "changed", path: GAP, from: 1.44, to: 2.15 }]);
    expect(d.migrations.chase).toEqual({ from: 2, to: 2, lines: [] });
  });
  it("migrates both sides: the schema 1 template against its migration has no changes and reports the lines it ran", () => {
    const migrated = migrateChase(template());
    const d = diffChase(template(), migrated.chase);
    expect(d.changes).toEqual([]);
    expect(d.migrations.against.from).toBe(1);
    expect(d.migrations.against.to).toBe(2);
    expect(d.migrations.against.lines).toEqual(migrated.report.lines);
    expect(d.migrations.against.lines.length).toBeGreaterThan(0);
    expect(d.migrations.chase.lines).toEqual([]);
  });
});
