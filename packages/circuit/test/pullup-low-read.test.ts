// M01-T08 CHK-NET-05 as an interval on the pullup. Expected numbers are the
// card's golden table (milestones/M01-constraints.md M01-T08, computed from
// the vendor rows of RP2040 datasheet pp. 616 to 617 and ESP32-C3 datasheet
// v2.4 p. 55), typed here, never read back from what the def returned. The
// forward check runs the pressed divider VDD R / (R + Rpu) through classify
// in release.ts, so the inversion is tested against the other direction.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, type Bound, type ConstraintCtx, type Interval } from "@hackbuild/spec";
import { createProfileLookup, tablesFromSeed } from "@hackbuild/profile";
import { BOSS_REPRODUCTION, MCU_PIN_IDS, bossLegacyRow, mcuPinRow } from "@hackbuild/catalog";
import {
  PULLUP_DIM, classify, maxPathOhm, pullupLowRead, pullupPathBudget, pullupRange, pullupVerdict,
} from "../src/index";

const seed: unknown = JSON.parse(readFileSync(new URL("../../profile/seed/profile.seed.json", import.meta.url), "utf8"));
const profile = createProfileLookup(tablesFromSeed(seed));

const ctxOf = (facts: ConstraintCtx["facts"]): ConstraintCtx => ({ profile, machine: "ffc5p", material: "", facts });

/** The interval one def gives on its own: max floor, min ceiling, null when they cross. */
function interval(bounds: readonly Bound[]): Interval["legal"] {
  const lo = Math.max(...bounds.filter((b) => b.side === "lo").map((b) => b.value));
  const hi = Math.min(...bounds.filter((b) => b.side === "hi").map((b) => b.value));
  return lo > hi ? null : [lo, hi];
}

function codeOf(fn: () => unknown): { code: string; path: string | undefined } {
  try {
    fn();
  } catch (e) {
    if (isThrownCommandError(e)) return { code: e.hbf.code, path: e.hbf.path };
    throw e;
  }
  throw new Error("expected a command error");
}

interface Golden {
  readonly id: string;
  readonly mcu: string;
  readonly pathOhm: number;
  readonly floor: number;
  readonly ceiling: number;
  readonly measured: number;
  readonly verdict: "pass" | "fail" | "unsat";
  /** Largest passing path R at the range minimum, or the E_UNSAT expected line. */
  readonly largest?: number;
  readonly nearest?: number;
  readonly expected?: string;
}

const GOLDENS: readonly Golden[] = [
  { id: "N1", mcu: "rp2040", pathOhm: 10000, floor: 31250, ceiling: 80000, measured: 50000, verdict: "pass", largest: 16000 },
  { id: "N2", mcu: "rp2040", pathOhm: 20000, floor: 62500, ceiling: 80000, measured: 50000, verdict: "fail", nearest: 62500 },
  { id: "N3", mcu: "rp2040", pathOhm: 30000, floor: 93750, ceiling: 80000, measured: 50000, verdict: "unsat", expected: "path at most 25600 ohm at pullup 80000" },
  { id: "N4", mcu: "esp32-c3", pathOhm: 10000, floor: 30000, ceiling: 45000, measured: 45000, verdict: "pass", largest: 15000 },
  { id: "N5", mcu: "esp32-c3", pathOhm: 16000, floor: 48000, ceiling: 45000, measured: 45000, verdict: "unsat", expected: "path at most 15000 ohm at pullup 45000" },
];

const close = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

describe("circuit/pullup-low-read goldens N1 to N5", () => {
  for (const g of GOLDENS) {
    test(`${g.id}: ${g.mcu} path ${g.pathOhm} ohm`, () => {
      const ctx = ctxOf({ mcu: g.mcu, pathOhm: g.pathOhm, pullup: "internal" });
      const bounds = pullupLowRead.bounds(PULLUP_DIM, ctx);
      const lo = bounds.filter((b) => b.side === "lo");
      const hi = bounds.filter((b) => b.side === "hi");
      expect(lo).toHaveLength(1);
      expect(hi).toHaveLength(1);
      expect(close(lo[0]!.value, g.floor), `floor ${lo[0]!.value}`).toBe(true);
      expect(hi[0]!.value).toBe(g.ceiling);
      expect(lo[0]!.reason).toContain(`pressed path ${g.pathOhm} ohm reads LOW only above ${g.floor} ohm at VIL`);
      expect(lo[0]).toMatchObject({ kernel: "circuit", qualifier: "computed", basis: "vendor", source: "CHK-NET-05" });
      expect(hi[0]).toMatchObject({ kernel: "circuit", qualifier: "vendor", basis: "vendor" });

      const legal = interval(bounds);
      const v = pullupVerdict(legal, pullupRange(ctx));
      expect(v.measured).toBe(g.measured);
      if (g.verdict === "unsat") {
        expect(legal).toBeNull();
        expect(v.verdict).toBe("fail");
        const exp = pullupLowRead.expectedFor!(PULLUP_DIM, g.ceiling, ctx)!;
        expect(exp).toMatchObject({ path: "/facts/pathOhm", got: g.pathOhm, expected: g.expected, nextDim: "conductor.width" });
      } else {
        expect(legal).not.toBeNull();
        expect(v.verdict).toBe(g.verdict);
      }
      if (g.nearest !== undefined) expect(legal![0]).toBe(g.nearest);
      if (g.largest !== undefined) expect(pullupPathBudget(ctx)!.ohm).toBe(g.largest);
    });
  }

  test("forward divider: LOW at the floor, UNDEFINED one ohm under it", () => {
    for (const g of GOLDENS) {
      const row = mcuPinRow(g.mcu);
      const pressed = (rpu: number): number => (row.vddV * g.pathOhm) / (g.pathOhm + rpu);
      expect(classify(pressed(g.floor) - 1e-12, row), g.id).toBe("LOW");
      expect(classify(pressed(g.floor - 1), row), g.id).toBe("UNDEFINED");
    }
  });

  test("the thresholds are inclusive: a pin at VIL max reads LOW and a pin at VIH min reads HIGH (D-076)", () => {
    // The datasheet figures are the edges of each state, typed from the
    // vendor pages (RP2040 pp. 616 to 617; ESP32-C3 v2.4 p. 55 at VDD 3.3):
    // VIL max is the highest voltage read LOW and VIH min the lowest read HIGH.
    const EDGES = [{ id: "rp2040", vil: 0.8, vih: 2.0 }, { id: "esp32-c3", vil: 0.825, vih: 2.475 }] as const;
    for (const e of EDGES) {
      const row = mcuPinRow(e.id);
      expect(classify(e.vil, row), `${e.id} at VIL max`).toBe("LOW");
      expect(classify(e.vih, row), `${e.id} at VIH min`).toBe("HIGH");
      expect(classify((e.vil + e.vih) / 2, row), `${e.id} between`).toBe("UNDEFINED");
    }
  });

  test("the BOSS row's one threshold reads LOW at the threshold, as sim.js line 135 does", () => {
    // BOSS reads HIGH only strictly above 0.5 VIO
    // (designs/blocks/legacy/boss-src/src/sim.js line 135, lineage blocks.sim/blocks-1).
    const sim = readFileSync(new URL("../../../designs/blocks/legacy/boss-src/src/sim.js", import.meta.url), "utf8").split("\n")[134]!;
    expect(sim).toContain("p.digital = p.v > p.inst.part.model.board.vio * 0.5 ? 'HIGH' : 'LOW'");
    const row = bossLegacyRow(BOSS_REPRODUCTION);
    const at = row.vddV * 0.5;
    expect(classify(at, row)).toBe("LOW");
    expect(classify(at + 1e-9, row)).toBe("HIGH");
  });

  test("largest passing path reads LOW at the range minimum and not one ohm above", () => {
    for (const id of ["rp2040", "esp32-c3"]) {
      const row = mcuPinRow(id);
      const ctx = ctxOf({ mcu: id, pullup: "internal" });
      const b = pullupPathBudget(ctx)!;
      const rmin = pullupRange(ctx).minOhm;
      const pressed = (r: number): number => (row.vddV * r) / (r + rmin);
      expect(classify(pressed(b.ohm) - 1e-12, row)).toBe("LOW");
      expect(classify(pressed(b.ohm + 1), row)).toBe("UNDEFINED");
      expect(close(b.ohm, maxPathOhm(row, rmin)), `${id} budget ${b.ohm}`).toBe(true);
    }
  });
});

describe("pin rows and fact errors", () => {
  test("catalog rows carry the D-076 vendor values", () => {
    expect(MCU_PIN_IDS).toEqual(["rp2040", "pico", "esp32-c3", "esp32-s3"]);
    expect(mcuPinRow("rp2040")).toMatchObject({ vddV: 3.3, pullup: { kind: "range", minOhm: 50000, maxOhm: 80000 }, vilMaxV: 0.8, vihMinV: 2.0, tier: "vendor" });
    expect(mcuPinRow("esp32-c3")).toMatchObject({ vddV: 3.3, pullup: { kind: "typical", typOhm: 45000 }, vilMaxV: 0.825, vihMinV: 2.475, tier: "vendor" });
  });

  test("pico reads the rp2040 figures, and the boss-legacy row is refused with E_REF (D-076)", () => {
    const ctx = ctxOf({ mcu: "pico", pathOhm: 10000, pullup: "internal" });
    expect(interval(pullupLowRead.bounds(PULLUP_DIM, ctx))).toEqual([31250, 80000]);
    expect(codeOf(() => pullupLowRead.bounds(PULLUP_DIM, ctxOf({ mcu: "boss-legacy", pathOhm: 10000, pullup: "internal" })))).toEqual({ code: "E_REF", path: "/facts/mcu" });
  });

  test("external pullup: ceiling from pullupCeilOhm, E_PARAM_MISSING without it, measured from pullupOhm", () => {
    const ctx = ctxOf({ mcu: "rp2040", pathOhm: 10000, pullup: "external", pullupCeilOhm: 100000, pullupOhm: 47000 });
    const legal = interval(pullupLowRead.bounds(PULLUP_DIM, ctx));
    expect(legal).toEqual([31250, 100000]);
    expect(pullupVerdict(legal, pullupRange(ctx))).toEqual({ measured: 47000, verdict: "pass" });
    expect(codeOf(() => pullupLowRead.bounds(PULLUP_DIM, ctxOf({ mcu: "rp2040", pathOhm: 10000 })))).toEqual({ code: "E_PARAM_MISSING", path: "/facts/pullupCeilOhm" });
  });

  test("missing and unknown facts name their pointer", () => {
    expect(codeOf(() => pullupLowRead.bounds(PULLUP_DIM, ctxOf({ pathOhm: 1, pullup: "internal" })))).toEqual({ code: "E_PARAM_MISSING", path: "/facts/mcu" });
    expect(codeOf(() => pullupLowRead.bounds(PULLUP_DIM, ctxOf({ mcu: "rp2041", pathOhm: 1, pullup: "internal" })))).toEqual({ code: "E_REF", path: "/facts/mcu" });
    expect(codeOf(() => pullupLowRead.bounds(PULLUP_DIM, ctxOf({ mcu: "rp2040", pullup: "internal" })))).toEqual({ code: "E_PARAM_MISSING", path: "/facts/pathOhm" });
    expect(codeOf(() => pullupLowRead.bounds(PULLUP_DIM, ctxOf({ mcu: "rp2040", pathOhm: 1, pullup: "sideways" })))).toEqual({ code: "E_SCHEMA", path: "/facts/pullup" });
    expect(pullupPathBudget(ctxOf({ pathMm: 62 }))).toBeUndefined();
  });
});
