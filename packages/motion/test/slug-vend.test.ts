// M07-T11: SLUG vend with residual carry. Expected values are the M07
// Records table row "SLUG vend with residual carry" (computed 2026-10-04),
// typed below, and the drive is read from its sources: half steps per
// revolution and the step rate from the profile, the gear ratio from
// slug.scad (stored whole as packages/motion/inputs/slug/slug.scad); the
// page constant STEPS_REV of slug.html line 224 is compared against the
// profile row in slug-originals.test.ts so a drifted row is seen.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { isThrownCommandError } from "@hackbuild/spec";
import { SLUG_MACHINE, SLUG_NOT_RUN, rotorDeg, runProgram, slugDrive, slugVendProgram, vendTarget } from "@hackbuild/motion";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");
const D = slugDrive(createProfileLookup(loadProfile()), read("packages/motion/inputs/slug/slug.scad"));
const commands = (k: number): number[] => slugVendProgram(D, k).ops.flatMap((o) => (o.op === "steps" ? [o.halfSteps] : []));

describe("the drive", () => {
  test("reads 4075.7728 half steps per revolution, 1000 half steps/s and the 76:19 train", () => {
    expect(D.halfStepsPerRev).toBe(4075.7728);
    expect(D.ratio).toBe(4);
    expect(D.rate).toBe(1000);
  });
});

describe("vend (computed)", () => {
  test("vends 1 to 10 command 4076, 4076, 4075, 4076, 4076, 4076, 4075, 4076, 4076, 4076 half steps", () => {
    expect(commands(10)).toEqual([4076, 4076, 4075, 4076, 4076, 4076, 4075, 4076, 4076, 4076]);
  });

  test("after 1000 vends the axis is at 4075773, one rotor turn short by 0.2 half step", () => {
    const run = runProgram(SLUG_MACHINE, slugVendProgram(D, 1000));
    expect(run.result.states).toHaveLength(1000);
    expect(run.result.states.at(-1)!.rotor).toBe(4075773);
    expect(rotorDeg(D, 4075773)).toBeCloseTo(90000.0044, 4);
    // 1000 vends at 1000 half steps/s.
    expect(run.durationS).toBeCloseTo(4075.773, 9);
  });

  test("the cumulative error stays under 0.5 half step over 100,000 vends; 77.28 percent of vends are 4076", () => {
    const cmd = commands(100000);
    let axis = 0, worst = 0;
    cmd.forEach((c, k) => {
      axis += c;
      worst = Math.max(worst, Math.abs(axis - (k + 1) * D.halfStepsPerRev));
    });
    expect(worst).toBeLessThan(0.5);
    expect(worst.toFixed(4)).toBe("0.4992");
    expect(cmd.filter((c) => c === 4076).length / cmd.length).toBeCloseTo(0.7728, 6);
    expect(new Set(cmd)).toEqual(new Set([4075, 4076]));
  });

  test("a fixed whole step count drifts: 4076 by 227.2 half steps (5.017 deg of rotor) per 1000 vends, 4075 by 772.8 (17.065 deg)", () => {
    const want = 1000 * D.halfStepsPerRev;
    expect((1000 * 4076 - want).toFixed(1)).toBe("227.2");
    expect(rotorDeg(D, 1000 * 4076 - want).toFixed(3)).toBe("5.017");
    expect((want - 1000 * 4075).toFixed(1)).toBe("772.8");
    expect(rotorDeg(D, want - 1000 * 4075).toFixed(3)).toBe("17.065");
    expect(vendTarget(D, 1000) - 1000 * 4076).not.toBe(0);
  });

  test("slug.vend --k 3 targets 12227 half steps", () => {
    expect(runProgram(SLUG_MACHINE, slugVendProgram(D, 3)).result.states.at(-1)!.rotor).toBe(12227);
  });

  test("firmware parity is recorded as not run", () => {
    expect(SLUG_NOT_RUN).toEqual(["firmware parity: no SLUG firmware was harvested (benches-robots-b.md gaps)"]);
  });

  test("a vend count that is not a whole number is E_SCHEMA", () => {
    let code = "";
    try {
      slugVendProgram(D, 2.5);
    } catch (e) {
      if (isThrownCommandError(e)) code = e.hbf.code;
    }
    expect(code).toBe("E_SCHEMA");
  });
});
