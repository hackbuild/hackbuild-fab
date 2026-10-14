// CHK-KEY-02 2.0.0: PIP's 4.5 mm limit holds a flex cap, "conductive TPU
// spanning the hole, unsupported" (model.js line 523). A pocket whose first
// covering layer holds no flex or flex-conductor body skips with what covers
// it: the BLOCKS stud's cPLA flange over its 4.6 mm socket (blocks.js line
// 177) is a bridge CHK-PRT-09 holds. The fixtures are make-json.mjs output:
// the same 5.2 mm hole fails under a cTPU cap and skips under a cPLA one.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CheckLevel, CheckResult, KernelId } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { CHECK_MODULES, registerChecks, runRegistry } from "../src/index";
import { loadFixture } from "./fixture-load";

const seed = JSON.parse(readFileSync(new URL("../seed/checks.seed.json", import.meta.url), "utf8")) as { checks: { id: string; version: string }[] };
const defs = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES);
const KERNELS = new Set<KernelId>(["geom", "mesh", "profile", "3mf", "sim", "inlay"]);
const TARGETS = new Set<CheckLevel>(["part", "body", "feature", "assembly", "artifact", "source", "project"]);
const profile = createProfileLookup(loadProfile());

async function run(which: string): Promise<CheckResult> {
  const def = defs.find((d) => d.id === "CHK-KEY-02")!;
  const fx = loadFixture("CHK-KEY-02", which);
  const report = await runRegistry([def], { kernels: KERNELS, produced: TARGETS, targets: fx.targets, views: fx.views, ctx: { profile, machine: "ffc5p", whitelist: new Map() } });
  return report.results[0]!;
}

describe("CHK-KEY-02 holds flex caps only", () => {
  test("the seed row is 2.0.0", () => {
    expect(seed.checks.find((r) => r.id === "CHK-KEY-02")?.version).toBe("2.0.0");
  });

  test("a 5.2 mm hole under a cTPU cap fails", async () => {
    const r = await run("fail");
    expect(r.verdict).toBe("fail");
    expect(r.measured as number).toBeGreaterThan(4.5);
  });

  test("the same hole under a cPLA flange skips and names the cover", async () => {
    const r = await run("cpla-cover");
    expect(r.verdict).toBe("skip");
    expect(r.measured).toBe("not a flex cap");
    expect(r.constraint).toContain("cap (conductor cpla)");
    expect(r.constraint).toContain("CHK-PRT-09");
    expect(r.extra?.["spanMm"] as number).toBeGreaterThan(4.5);
  });
});
