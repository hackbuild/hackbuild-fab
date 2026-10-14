// M01-T04 loader: every def core collects is a row of the M01 package
// placement table, exported by the package that row names, listing the
// row's Bound.kernel. The table is read from the plan, never copied here.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { collectConstraintDefs, loadConstraints } from "../src/load/constraints";

const card = readFileSync(new URL("../../docs/plan/milestones/M01-constraints.md", import.meta.url), "utf8");
const m06 = readFileSync(new URL("../../docs/plan/milestones/M06-canons.md", import.meta.url), "utf8");

/** Placement rows of a table: id, owning package (first word), Bound.kernel. */
function rowsOf(text: string): Map<string, { pkg: string; kernel: string }> {
  const rows = new Map<string, { pkg: string; kernel: string }>();
  for (const line of text.split("\n")) {
    const m = /^\s*\| `([^`]+)` \| (\S+)[^|]* \| [^|]+ \| (\S+) \| [^|]+ \|$/.exec(line);
    if (m) rows.set(m[1]!, { pkg: m[2]!, kernel: m[3]! });
  }
  return rows;
}

/** Rows of the M01 "Package placement" table. */
function placement(): Map<string, { pkg: string; kernel: string }> {
  return rowsOf(card.slice(card.indexOf("## Package placement"), card.indexOf("\n---", card.indexOf("## Package placement"))));
}

/** The M01 rows plus the ConstraintDefs M06-T03 adds, from its build notes. */
function placementWithCanons(): Map<string, { pkg: string; kernel: string }> {
  const t03 = m06.slice(m06.indexOf("## M06-T03 "), m06.indexOf("## M06-T04 "));
  return new Map([...placement(), ...rowsOf(t03.slice(t03.indexOf("Build notes")))]);
}

describe("core constraints loader (D-044)", () => {
  test("the placement table parses to its eleven rows, M05-T12's included", () => {
    const rows = placement();
    expect(rows.size).toBe(11);
    expect(rows.get("circuit/capacitive-path-ceiling")).toEqual({ pkg: "circuit", kernel: "circuit" });
    expect(rows.get("circuit/trace-resistance-floor")).toEqual({ pkg: "circuit", kernel: "circuit" });
    expect(rows.get("mech/cascade-slop")).toEqual({ pkg: "mechanisms", kernel: "motion" });
  });

  test("every collected def is a placement row, from its owning package, naming the row's kernel", () => {
    const rows = placementWithCanons();
    for (const { pkg, def } of collectConstraintDefs()) {
      const row = rows.get(def.id);
      expect(row, `${def.id} is not in the M01 placement table`).toBeDefined();
      expect(pkg).toBe(row!.pkg);
      expect(def.kernels).toContain(row!.kernel);
    }
  });

  test("the collected defs register without error and every one is queryable by id", () => {
    const reg = loadConstraints();
    expect(reg.ids()).toEqual(collectConstraintDefs().map((c) => c.def.id).sort());
  });
});
