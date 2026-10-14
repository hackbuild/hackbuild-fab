// CHK-PRT-03 2.0.0: overlap is the parts' sum less the kernel's union
// before the D-054 snap (Part.unionVolumeMm3), at most 1e-3 mm3, and the
// parts sum to the snapped solid within 0.1 percent of max(1, solid): the
// two rules of its origin, tools/py/validate_3mf.py check_overlap
// (OVERLAP_MAX_MM3 and SUM_TOLERANCE, both read from the file here). The
// numbers are the sticks/pip-stick reference's (33 parts, computed).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { OVERLAP_CEILING_MM3, SUM_TOLERANCE, prt03Finding } from "../src/index.js";

const validator = readFileSync(new URL("../../../tools/py/validate_3mf.py", import.meta.url), "utf8");
const constant = (name: string): number => Number(new RegExp(`^${name} = (\\S+)$`, "m").exec(validator)?.[1]);
const target = { level: "part", part: "body" } as const;

describe("CHK-PRT-03 against the kernel union", () => {
  test("its two limits are the validator's", () => {
    expect(OVERLAP_CEILING_MM3).toBe(constant("OVERLAP_MAX_MM3"));
    expect(SUM_TOLERANCE).toBe(constant("SUM_TOLERANCE"));
  });

  test("a snap residue with no overlap passes and is reported apart", () => {
    // parts sum 23293.097, snapped solid 0.001605 below, kernel union equal to the parts (pip-stick)
    const parts = [23000, 293.097];
    const f = prt03Finding(target, parts, 23293.097 - 0.001605, 23293.097);
    expect(f.verdict).toBe("pass");
    expect(f.measured).toBe(0);
    expect(f.extra?.["snapResidueMm3"]).toBe(0.001605);
  });

  test("an overlap past the ceiling fails whatever the snapped solid reads", () => {
    const f = prt03Finding(target, [10, 10], 20, 20 - 0.0011);
    expect(f.verdict).toBe("fail");
    expect(f.measured).toBe(0.0011);
    const g = prt03Finding(target, [10, 10], 20 - 0.0011, 20 - 0.0009);
    expect(g.verdict).toBe("pass");
  });

  test("a snapped solid more than 0.1 percent off the parts fails the sum rule", () => {
    const f = prt03Finding(target, [100, 100], 200 - 0.21, 200);
    expect(f.verdict).toBe("fail");
    expect(f.measured).toBe(0);
    expect(String(f.extra?.["sum"])).toContain("0.1 percent");
    expect(prt03Finding(target, [100, 100], 200 - 0.19, 200).verdict).toBe("pass");
  });

  test("without a recorded union the snapped solid stands for it", () => {
    expect(prt03Finding(target, [10, 10], 20 - 0.0011).verdict).toBe("fail");
    expect(prt03Finding(target, [10, 10], 20 - 0.0009).verdict).toBe("pass");
  });
});
