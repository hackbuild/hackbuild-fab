// M02-T06, moved with the chain at M07-T10: the TypeScript chain against
// assembly.py chain() (the golden is written by scripts/davit_chain_golden.py
// under uv, an independent source, and carries each case's pose). The DATA
// constants of davit.html are compared in core/test/davit-sweep.test.ts,
// where the page decoder lives.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { applyPoint, constOf, davitChain, davitPlacements, hwNames, type DavitModel, type DavitPipe, type DavitPose } from "@hackbuild/motion";

const here = (p: string): URL => new URL(p, import.meta.url);
interface Case { model: DavitModel; pipe: DavitPipe; side: "R" | "L"; preset: string; pose: DavitPose; xf: number; tip: number[]; links: Record<string, number[]>; hw: number[][] }
const golden = JSON.parse(readFileSync(here("./goldens/davit-chain.json"), "utf8")) as { assemblySha256: string; cases: Case[] };

const worst = (a: readonly number[], b: readonly number[]): number => Math.max(...a.map((v, i) => Math.abs(v - b[i]!)));

describe("davit chain", () => {
  test("the golden was written from the assembly.py in the repo", () => {
    const sha = createHash("sha256").update(readFileSync(here("../../../designs/davit/legacy/assembly.py"))).digest("hex");
    expect(golden.assemblySha256).toBe(sha);
    expect(golden.cases).toHaveLength(48);
  });

  test("tip point equals assembly.py to 1e-9 mm for four presets, two models, three pipes, both arms (computed)", () => {
    let max = 0;
    for (const c of golden.cases) {
      const k = constOf(c.model);
      expect(k.XF[c.pipe]).toBe(c.xf);
      const arm = davitChain(k, c.xf, c.pose, c.side === "L");
      max = Math.max(max, worst(applyPoint(arm.links.palm, k.tip_local), c.tip));
    }
    expect(max).toBeLessThan(1e-9);
  });

  test("every link and hardware matrix equals assembly.py to 1e-9", () => {
    for (const c of golden.cases) {
      const arm = davitChain(constOf(c.model), c.xf, c.pose, c.side === "L");
      for (const [name, m] of Object.entries(c.links)) expect(worst(arm.links[name as keyof typeof arm.links], m)).toBeLessThan(1e-9);
      c.hw.forEach((m, i) => expect(worst(arm.hw[i]!, m)).toBeLessThan(1e-9));
    }
  });

  test("the hardware names equal davit.html hwNames()", () => {
    expect(hwNames(constOf("std"))).toEqual(["std_servo#0", "std_horn#1", "mic_servo#2", "mic_horn#3", "std_servo#4", "std_horn#5", "mic_servo#6", "mic_horn#7", "mic_servo#8", "mic_horn#9"]);
  });

  test("davitPlacements carries the chain of each arm and the mount and bases sim sweeps", () => {
    const hang = golden.cases.find((c) => c.model === "mini" && c.pipe === "125in" && c.side === "L" && c.preset === "HANG")!;
    const reach = golden.cases.find((c) => c.model === "mini" && c.pipe === "125in" && c.side === "R" && c.preset === "REACH")!;
    const bodies = davitPlacements("mini", "125in", { R: reach.pose, L: hang.pose });
    expect(bodies).toHaveLength(3 + 2 * 17);
    expect(bodies.slice(0, 3).map((b) => `${b.n}${b.side}`)).toEqual(["mount", "baseR", "baseL"]);
    // base_off 29.45 mm along +x for the right base; the left base is turned a half turn about the pipe (davit.html DATA.const).
    expect(bodies[1]!.m[3]).toBe(29.45);
    expect(worst(bodies[2]!.m, [-1, 0, 0, -29.45, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])).toBeLessThan(1e-15);
    for (const [side, c] of [["R", reach], ["L", hang]] as const) {
      for (const [name, m] of Object.entries(c.links)) expect(worst(bodies.find((b) => b.n === name && b.side === side)!.m, m), `${side} ${name}`).toBeLessThan(1e-9);
    }
  });
});
