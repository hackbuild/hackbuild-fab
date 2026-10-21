// Chase waivers in the one check runner (D-173, D-629). designs/toggle
// waives CHK-PRT-04 on its part: the original's 0.64 mm PETG wall between
// two pin cups (2.54 mm header pitch less two 0.95 mm cup radii,
// originals/toggle part2d.js lines 62 to 87, D-615). A page build, the path
// a baked bench runs, reads the waived row against that wall and against
// the committed report golden core's parity wrote
// (designs/toggle/expected/report.json). applyWaivers is read on hand-made
// results for the lapse, unused and target rules.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { CheckResult, WaiverDecl } from "@hackbuild/spec";
import { applyWaivers, buildDay, createPageBuild, resolveParams, targetId, type PageFacts, type PageResult } from "@hackbuild/pipeline";
import { chase } from "../../../designs/toggle/chase.js";
import * as module from "../../../designs/toggle/build.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DESIGN = "designs/toggle";
const EPOCH = "315532800";
const GOLD = JSON.parse(readFileSync(path.join(ROOT, DESIGN, "expected/report.json"), "utf8")) as { findings: CheckResult[] };
/** The original's header pitch and cup radius, mm (part2d.js lines 62 to 87). */
const PITCH = 2.54;
const CUP_R = 0.95;

let out: PageResult;
beforeAll(async () => {
  const run = spawnSync(process.execPath, [path.join(ROOT, "tools/bake/design-facts.mjs"), path.join(ROOT, DESIGN)], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, SOURCE_DATE_EPOCH: EPOCH }, maxBuffer: 64 * 1024 * 1024,
  });
  expect(run.status, run.stderr).toBe(0);
  const facts = JSON.parse(run.stdout) as PageFacts;
  const page = createPageBuild({ chase, module, facts });
  out = await page.build(resolveParams(chase, undefined, undefined));
}, 240_000);

describe("toggle at solo4 with its chase waiver", () => {
  test("CHK-PRT-04 reads warn with the D-615 waiver and keeps its measurement", () => {
    const row = out.results.find((r) => r.id === "CHK-PRT-04");
    expect(row).toBeDefined();
    expect(row!.verdict).toBe("warn");
    expect(row!.waived?.reason.startsWith("D-615:")).toBe(true);
    expect(row!.measured as number).toBeCloseTo(PITCH - 2 * CUP_R, 3);
    expect(row!.legal).toMatchObject({ kind: "multipleOf", base: 0.42 });
    expect(row!.origin).toBe("hbf://check/CHK-PRT-04");
    expect(row!.constraint.length).toBeGreaterThan(0);
    expect(row).toEqual(GOLD.findings.find((r) => r.id === "CHK-PRT-04"));
  });

  test("no fail is left to block the gate", () => {
    expect(out.results.filter((r) => r.verdict === "fail").map((r) => r.id)).toEqual([]);
  });
});

const fail = (id: string, part: string): CheckResult => ({
  id, version: "1.0.0", verdict: "fail", severity: "block", target: { level: "part", part },
  constraint: "c", origin: `hbf://check/${id}`, legal: { kind: "interval", min: 1, max: 2, unit: "mm" }, measured: 0.5,
} as unknown as CheckResult);

describe("applyWaivers", () => {
  const w: WaiverDecl = { check: "CHK-PRT-04", target: "p", reason: "kept" };

  test("a matched fail becomes a waived warn; measured and legal stay", () => {
    const { results, warnings } = applyWaivers([fail("CHK-PRT-04", "p")], [w], "2026-10-21", true);
    expect(results[0]).toMatchObject({ verdict: "warn", waived: { reason: "kept" }, measured: 0.5, legal: { kind: "interval" } });
    expect(warnings).toEqual([]);
  });

  test("another target or check stays a fail, and the waiver is reported unused", () => {
    const { results, warnings } = applyWaivers([fail("CHK-PRT-04", "q"), fail("CHK-PRT-05", "p")], [w], "2026-10-21", true);
    expect(results.map((r) => r.verdict)).toEqual(["fail", "fail"]);
    expect(warnings.map((x) => x.code)).toEqual(["WAIVER_UNUSED"]);
    expect(applyWaivers([], [w], "2026-10-21", false).warnings).toEqual([]);
  });

  test("a lapsed waiver leaves the fail and warns; the until day itself holds", () => {
    const until = { ...w, until: "2026-01-31" };
    expect(applyWaivers([fail("CHK-PRT-04", "p")], [until], "2026-02-01", true)).toMatchObject({ results: [{ verdict: "fail" }], warnings: [{ code: "WAIVER_LAPSED" }] });
    expect(applyWaivers([fail("CHK-PRT-04", "p")], [until], "2026-01-31", true).results[0]).toMatchObject({ verdict: "warn", waived: { until: "2026-01-31" } });
  });

  test("target ids and the build day", () => {
    expect(targetId({ level: "pair", a: { level: "body", part: "p", body: "a" }, b: { level: "net", part: "p", net: "n" } })).toBe("a|n");
    expect(buildDay(315532800)).toBe("1980-01-01");
  });
});
