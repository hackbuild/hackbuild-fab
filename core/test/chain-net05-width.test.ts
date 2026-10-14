// M01-T08 chain C1 and C2: one query chain from the MCU pin row to the
// printed section. constraints.query conductor.width with mcu and pullup
// declared and no netBudgetOhm reads the CHK-NET-05 budget (the largest
// path that reads LOW at the pullup range minimum) into the resistance
// floor. Expected numbers are the card's (milestones/M01-constraints.md
// M01-T08 goldens, CHECKS.md 2.6 C) and the resistivity rows are read from
// the profile data file, never from what the command printed. The defs are
// the ones core loads.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import type { CommandInput, CommandResult, Interval } from "@hackbuild/spec";
import { constraintRegistry, runConstraintsQuery } from "../src/commands/constraints-query.js";
import { finish } from "../src/result.js";
import { exitOf } from "../src/errors.js";
import { hashOf } from "../src/jcs.js";
import type { CoreCtx } from "../src/registry.js";
import { ROOT, hbf, json } from "./hbf.js";

type Input = CommandInput<"constraints.query">;

const materials = (JSON.parse(readFileSync(path.join(ROOT, "packages", "profile", "data", "materials.json"), "utf8")) as {
  materials: { id: string; resistivity: { direction: string; form: string; ohmCm: number; provenance: { tier: string } }[] }[];
}).materials;
const rho = (id: string): { ohmCm: number; tier: string } => {
  const r = materials.find((m) => m.id === id)!.resistivity.find((x) => x.direction === "along" && x.form === "printed")!;
  return { ohmCm: r.ohmCm, tier: r.provenance.tier };
};

const SECTION = { pathMm: 62, tMm: 0.72, flexes: true, pitchMm: 8.0, pitchClrMm: 1.0 } as const;
const CHAIN = { mcu: "rp2040", pullup: "internal", ...SECTION } as const;

async function run(input: Input): Promise<{ r: CommandResult<Interval>; code: number }> {
  const ctx = { workspace: ROOT, cwd: ROOT, inputsHash: hashOf(input) } as unknown as CoreCtx;
  const r = finish(await runConstraintsQuery(input, ctx, constraintRegistry())) as CommandResult<Interval>;
  return { r, code: exitOf(r) };
}

/** legal as printed at 0.01 mm: floor up, ceiling down (conductor.width declares no grid step). */
const printed = (legal: Interval["legal"]): readonly [number, number] | null =>
  legal === null ? null : [Math.ceil(legal[0]! * 100 - 1e-9) / 100, Math.floor(legal[1]! * 100 + 1e-9) / 100];

/** The resistance floor: the one bound whose reason states an ohm budget. */
const budgetFloor = (iv: Interval): Interval["lo"][number] | undefined => iv.lo.find((b) => b.reason.includes("ohm budget"));

describe("chain CHK-NET-05 to conductor.width", () => {
  test("C1: rp2040 internal pullup, cpla-protopasta 30 ohm cm, 62 mm, 0.72: budget 16000, legal 1.62 to 6.00, the resistance floor binds", async () => {
    const row = rho("cpla-protopasta");
    expect(row.ohmCm).toBe(30);
    const { r, code } = await run({ dim: "conductor.width", material: "cpla-protopasta", facts: CHAIN });
    expect(code).toBe(0);
    const iv = r.result!;
    expect(printed(iv.legal)).toEqual([1.62, 6]);
    const b = budgetFloor(iv)!;
    expect(b.reason).toContain("16000 ohm budget at 62.0 mm path, 0.72 thick, 30 ohm cm");
    expect(b.reason).toContain("rp2040 pullup 50000 ohm, VIL 0.80 V");
    // w = rho L / (R t), rho in ohm mm: 300 x 62 / (16000 x 0.72) = 1.6146 (computed).
    expect(b.value).toBeCloseTo((row.ohmCm * 10 * 62) / (16000 * 0.72), 9);
    expect(iv.binding.lo.map((i) => iv.lo[i])).toEqual([b]);
    expect(b).toMatchObject({ qualifier: "computed", basis: row.tier });
  });

  test("C1 equals the same query with the 16000 ohm budget declared, and a declared budget wins over the mcu", async () => {
    const chained = (await run({ dim: "conductor.width", material: "cpla-protopasta", facts: CHAIN })).r.result!;
    const declared = (await run({ dim: "conductor.width", material: "cpla-protopasta", facts: { ...SECTION, netBudgetOhm: 16000 } })).r.result!;
    expect(chained.legal).toEqual(declared.legal);
    expect(chained.binding).toEqual(declared.binding);
    const both = (await run({ dim: "conductor.width", material: "cpla-protopasta", facts: { ...CHAIN, netBudgetOhm: 8000 } })).r.result!;
    expect(printed(both.legal)).toEqual([3.23, 6]);
  });

  test("C2: cpla working 500 ohm cm: floor 26.91, E_UNSAT expecting 71760 ohm at 6.00, which no rp2040 internal pullup reaches", async () => {
    const row = rho("cpla");
    expect(row.ohmCm).toBe(500);
    const { r, code } = await run({ dim: "conductor.width", material: "cpla", facts: CHAIN });
    expect(code).toBe(1);
    const iv = r.result!;
    expect(iv.legal).toBeNull();
    const b = budgetFloor(iv)!;
    expect(Math.ceil(b.value * 100) / 100).toBe(26.91);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({
      code: "E_UNSAT", path: "/facts/netBudgetOhm", record: "circuit/trace-resistance-floor",
      expected: "at least 71760 ohm at width 6.00, path 62.0, thickness 0.72",
    });
    // The largest rp2040 budget is at the 80000 ohm range maximum: 80000 x 0.8 / 2.5 = 25600 ohm, short of 71760.
    const top = await run({ dim: "port.pullup", facts: { mcu: "rp2040", pullup: "internal", pathOhm: 71760 } });
    expect(top.r.result!.legal).toBeNull();
    expect(top.r.errors[0]!.expected).toBe("path at most 25600 ohm at pullup 80000");
  });

  test("no mcu and no budget: no resistance floor (trace-width golden 4)", async () => {
    const { r } = await run({ dim: "conductor.width", material: "cpla-protopasta", facts: SECTION });
    expect(r.result!.lo.some((b) => b.reason.includes("ohm budget"))).toBe(false);
    expect(printed(r.result!.legal)).toEqual([0.8, 6]);
  });
});

describe("the M01-T08 CLI lines", () => {
  test("port.pullup with no material exits 0, legal 31250 to 80000", async () => {
    const { code, r } = await json("constraints.query", "port.pullup", "--facts", "mcu=rp2040,pathOhm=10000,pullup=internal");
    expect(code).toBe(0);
    expect((r.result as unknown as Interval).legal).toEqual([31250, 80000]);
  });

  test("conductor.width chain exits 0, legal 1.62 to 6.00", async () => {
    const args = ["constraints.query", "conductor.width", "--material", "cpla-protopasta", "--facts", "mcu=rp2040,pullup=internal,pathMm=62,tMm=0.72,flexes=true,pitchMm=8.0,pitchClrMm=1.0"];
    const { code, r } = await json(...args);
    expect(code).toBe(0);
    expect(printed((r.result as unknown as Interval).legal)).toEqual([1.62, 6]);
    expect((await hbf(args)).out).toContain("legal 1.62 to 6.00 mm");
  });
});
