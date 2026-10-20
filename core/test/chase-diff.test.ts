// hbf chase.diff (M10-T04 acceptance, diff half). The fixtures are the
// flex pair's chase.ts with the travel default set by a chase.patch
// pointer edit, written with build.ts and bench.ts under .hbf/
// (gitignored) so each side is a design that builds; the reference itself
// is never written. The card's pair is 1.44 to 2.15 mm. CHK-KEY-01 holds
// travel to 1.428 to 2.04 mm (computed, D-241; reference chase.ts header),
// so 1.44 passes and 2.15 fails, and measured is the travel itself.

import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { patchChaseSource } from "@hackbuild/chase";
import type { ChaseChange, ChaseMigrations, ChaseVerdictChange, CommandError } from "@hackbuild/spec";
import { json, REF, ROOT } from "./hbf.js";

const GAP = "/params/1/fields/0/item/3/default";
type Out = {
  changes: ChaseChange[]; migrations: { against: ChaseMigrations; chase: ChaseMigrations };
  defHashBefore: string; defHashAfter: string; verdictChanges: ChaseVerdictChange[] | null;
};
const run = async (...argv: string[]) => {
  const { code, r } = await json("chase.diff", ...argv);
  return { code, errors: r.errors as readonly CommandError[], result: r.result as unknown as Out };
};

let tmp = "";
/** A copy of the flex pair under tmp/<name> with the travel default set to gap. */
function variant(name: string, gap: number): string {
  const dir = path.join(tmp, name);
  mkdirSync(dir, { recursive: true });
  const src = readFileSync(path.join(ROOT, REF, "chase.ts"), "utf8");
  const out = patchChaseSource(src, `${REF}/chase.ts`, [{ pointer: GAP, set: gap }], { validate: () => [] });
  if (!out.ok) throw new Error(`patch refused: ${out.errors.map((e) => e.hint).join("; ")}`);
  writeFileSync(path.join(dir, "chase.ts"), out.plan.source);
  for (const f of ["build.ts", "bench.ts"]) copyFileSync(path.join(ROOT, REF, f), path.join(dir, f));
  return path.relative(ROOT, dir);
}

beforeAll(() => {
  mkdirSync(path.join(ROOT, ".hbf"), { recursive: true });
  tmp = mkdtempSync(path.join(ROOT, ".hbf", "diff-test-"));
});
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("chase.diff on the flex pair", () => {
  it("against HEAD~0 exits 0 with no changes, no migrations, equal defHash and verdictChanges null", async () => {
    const { code, errors, result } = await run(REF, "--against", "HEAD~0");
    expect([code, errors]).toEqual([0, []]);
    expect(result.changes).toEqual([]);
    expect(result.migrations).toEqual({ against: { from: 2, to: 2, lines: [] }, chase: { from: 2, to: 2, lines: [] } });
    expect(result.defHashBefore).toBe(result.defHashAfter);
    expect(result.verdictChanges).toBeNull();
  }, 120_000);

  it("a ref that names nothing is E_REF at /against", async () => {
    const { code, errors } = await run(REF, "--against", "no-such-ref-e17");
    expect(code).toBe(2);
    expect(errors.map((e) => [e.code, e.path])).toEqual([["E_REF", "/against"]]);
  }, 60_000);
});

describe("chase.diff on the travel fixture, 1.44 to 2.15 mm", () => {
  let from = "";
  let to = "";
  beforeAll(() => {
    from = variant("travel-144", 1.44);
    to = variant("travel-215", 2.15);
  });

  it("lists that one pointer, moves defHash, and leaves verdictChanges null without --build", async () => {
    const { code, errors, result } = await run(to, "--against", `${from}/chase.ts`);
    expect([code, errors]).toEqual([0, []]);
    expect(result.changes).toEqual([{ op: "changed", path: GAP, from: 1.44, to: 2.15 }]);
    expect(result.defHashBefore).not.toBe(result.defHashAfter);
    expect(result.verdictChanges).toBeNull();
  }, 120_000);

  it("with --build returns one verdict change, CHK-KEY-01 pass to fail, measured 1.44 to 2.15 mm", async () => {
    const { code, errors, result } = await run(to, "--against", from, "--build");
    expect([code, errors]).toEqual([0, []]);
    expect(result.verdictChanges).toEqual([{
      check: "CHK-KEY-01", target: { level: "feature", part: "pad", feature: "contact.key1" },
      from: "pass", to: "fail", measuredFrom: 1.44, measuredTo: 2.15,
    }]);
  }, 300_000);
});
