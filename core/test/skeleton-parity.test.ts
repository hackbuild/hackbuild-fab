// Parity of the keys flex-pair and orca 3mf round-trip references against
// their committed goldens (TESTING.md 5.1), apart from skeleton.test.ts so
// the two long files run in parallel (R1-speed-01). Each build here runs
// fresh: the test is about what a build makes.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runParity } from "../src/commands/parity.js";
import { REF, ROOT } from "./hbf.js";

/**
 * The committed goldens (TESTING.md 5.1): each reference rebuilt now must
 * equal its expected/ folder file for file. SOURCE_DATE_EPOCH is set to a
 * value the goldens were not written at, so the test also proves parity
 * builds at the epoch build.json records and not at the caller's or the
 * HEAD commit's.
 */
describe("parity against the committed goldens", () => {
  const saved = process.env["SOURCE_DATE_EPOCH"];
  beforeAll(() => {
    process.env["SOURCE_DATE_EPOCH"] = "1791072000";
  });
  afterAll(() => {
    if (saved === undefined) delete process.env["SOURCE_DATE_EPOCH"];
    else process.env["SOURCE_DATE_EPOCH"] = saved;
  });

  for (const reference of [REF, "reference/exports/orca-3mf-roundtrip"]) {
    it(`${reference}: build, report, edit and artifacts goldens are equal`, async () => {
      const out = await runParity({ reference }, ROOT);
      expect(out.files.map((f) => [f.file, f.status, f.moved])).toEqual([
        ["build.json", "equal", []], ["report.json", "equal", []], ["edit.json", "equal", []], ["artifacts.json", "equal", []],
        ...(reference === REF ? [["expected/query-solve.json", "equal", []]] : []),
      ]);
      expect(out.ok).toBe(true);
    }, 300_000);
  }
});
