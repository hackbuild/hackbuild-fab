// The STIPPLE R17b page lines the motion tests take as their expected
// values, read from the original of record (lineage stipple.kin/r17b):
// the two pattern lines stipple-programs.test.ts evaluates and the latch
// release margin latch-margin.test.ts holds the constant to. Reads through
// localOriginal, so it runs on the owner runner and never skips.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { LATCH_RELEASE_MARGIN_MM } from "@hackbuild/motion";
import { localOriginal } from "../../../tools/test-support/originals-root.js";

const lines = readFileSync(localOriginal("fab-knowledge:originals/stipple/files/stipple-r17b.html"), "utf8").split("\n");

describe("stipple-r17b.html", () => {
  test("lines 461 and 542 are the row-write and checker patterns stipple-programs.test.ts evaluates", () => {
    expect(lines[460]).toContain("g[i][j] = ((i*j + i + j) % 3 === 0) ? 1 : 0;");
    expect(lines[541]).toContain("g[i][j] = ((i+j+k) % 2 === 0) ? 1 : 0;");
  });

  test("line 154 types the latch release margin LATCH_RELEASE_MARGIN_MM holds", () => {
    expect(Number(/lp >= CAM \+ ([0-9.]+)/.exec(lines[153] ?? "")?.[1])).toBe(LATCH_RELEASE_MARGIN_MM);
  });
});
