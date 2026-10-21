// CHK-KEY-05 2.0.0 takes a contact's kind from the contact: one that
// declares coneH is a flex key (spec/features.ts) and skips, even on a part
// that holds a click spring. PIP holds flex and click keys in one part, and
// 1.0.1 measured each flex column pair as a click tip over a pad (D-624).
// The fixture is make-json.mjs output: a flex contact beside a click contact
// whose tip lands 0.3 mm across its pad, short of 0.5.

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

async function run(which: string): Promise<readonly CheckResult[]> {
  const def = defs.find((d) => d.id === "CHK-KEY-05")!;
  const fx = loadFixture("CHK-KEY-05", which);
  const report = await runRegistry([def], { kernels: KERNELS, produced: TARGETS, targets: fx.targets, views: fx.views, ctx: { profile, machine: "ffc5p", whitelist: new Map() } });
  return report.results;
}

function on(results: readonly CheckResult[], feature: string): CheckResult {
  const r = results.find((x) => x.target.level === "feature" && x.target.feature === feature);
  if (r === undefined) throw new Error(`no CHK-KEY-05 result on ${feature}`);
  return r;
}

describe("CHK-KEY-05 classifies a contact by its coneH", () => {
  test("the seed row is 2.0.0", () => {
    expect(seed.checks.find((r) => r.id === "CHK-KEY-05")?.version).toBe("2.0.0");
  });

  test("a flex contact in a part with a click spring skips as a flex key", async () => {
    const r = on(await run("flex-beside-click"), "contact.flex1");
    expect(r.verdict).toBe("skip");
    expect(r.constraint).toContain("declares coneH, so it is a flex key");
    expect(r.constraint).toContain("CHK-KEY-01 and CHK-KEY-03");
    expect(r.extra?.["coneMm"]).toBe(1.2);
  });

  test("the click contact beside it still fails at 0.3 mm across its pad", async () => {
    const r = on(await run("flex-beside-click"), "contact.click1");
    expect(r.verdict).toBe("fail");
    expect(r.measured as number).toBeLessThan(0.5);
  });
});
