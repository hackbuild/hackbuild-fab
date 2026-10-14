// touch-comb-key d is bounded to the PIP bench slider, 8 to 20 mm
// (haft-src/bench/part1.html line 265). At d 65 the comb kept 11 fingers in
// a band about 20 mm tall and left most of the disc without electrode
// (finding SAM-02); the schema now refuses a diameter the original never
// offered.

import { describe, expect, test } from "vitest";
import { TOUCH_DEFAULTS, touchParams } from "../src/pip/touch";

describe("touch-comb-key diameter range", () => {
  test("the PIP default and both slider ends parse", () => {
    for (const d of [8, 12, 20]) expect(touchParams.safeParse({ d }).success).toBe(true);
    expect(TOUCH_DEFAULTS.d).toBe(12);
  });

  test("a palm-sized 65 mm disc and a 6 mm disc are refused", () => {
    for (const d of [65, 20.5, 6]) expect(touchParams.safeParse({ d }).success).toBe(false);
  });
});
