// M05-T10 acceptance on the committed goldens, the committed route data and
// a fresh build capped at one iteration. The figures come from the card and
// from PIP b137deb's own model, never from the code under test: the stack
// z is PIP's (pip-controller print/print-card.txt and layout.js lines 166
// to 171: traces at 0.72 and 2.40, pads flush at 4.80), the default route
// is clean with 12 nets (M05-T08), and the closest trace pairs are PIP's
// model pairs B/Y 0.714 and 3V3/UP 0.716 mm (computed by PIP, dump-sweep
// default.json), which the built stack holds to within its stage 6 inset
// (2 x 3mf.coincidenceInset plus snap). PIP's own 0.600 pairs are its
// click-spring floor pads, which this stack does not build.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { VERDICT_TRANSPORT, type CheckResult, type Metric } from "@hackbuild/spec";
import { buildPart, loadDesign, resolveParams } from "../../../../core/src/commands/build.js";
import { solveBuilt } from "../../../../core/src/commands/circuit-solve.js";
import type { CoreCtx } from "../../../../core/src/ctx.js";
import { routeData, moduleText } from "../../../../packages/copper/scripts/pip-buried-route.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, "..");
const ROOT = path.resolve(DIR, "..", "..", "..");
const golden = <T>(name: string): T => JSON.parse(readFileSync(path.join(DIR, "expected", name), "utf8")) as T;
const pip = JSON.parse(readFileSync(path.join(ROOT, "packages/copper/test/fixtures/pip-sweep-seed1/default.json"), "utf8")) as {
  elec: { pairs: { a: string; b: string; g: number }[] }; z: { l1: number[]; l2: number[]; pad: number[]; floor: number };
};

interface Solve {
  readonly ok: boolean;
  readonly result: { readonly results: readonly CheckResult[]; readonly gaps: readonly { a: string; b: string; mm: number }[]; readonly nets: readonly { id: string }[] };
}

const NETS = ["GND", "3V3", "UP", "DOWN", "LEFT", "RIGHT", "X", "B", "Y", "A", "SELECT", "START"];
/** Stage 6 insets each conductor by 3mf.coincidenceInset (0.001, inferred), so a built gap reads 0.002 over the drawn one, plus snap. */
const INSET_SLACK = 0.004;

describe("pip-buried-route goldens hold the M05-T10 card", () => {
  test("route.data.ts is what packages/copper computes now", { timeout: 120_000 }, async () => {
    expect(readFileSync(path.join(DIR, "route.data.ts"), "utf8")).toBe(moduleText(await routeData()));
  });

  test("query-solve.json: 12 nets each one piece, route clean, every pair at least 0.60 mm, CHK-NET-11 and -12 pass", () => {
    const s = golden<Solve>("query-solve.json");
    expect(s.ok).toBe(true);
    expect(s.result.nets.map((n) => n.id)).toEqual(NETS);
    const by = (id: string) => s.result.results.filter((r) => r.id === id);
    expect(by("CHK-NET-01").map((r) => [(r.target as { net: string }).net, r.verdict])).toEqual(NETS.map((n) => [n, "pass"]));
    expect(by("CHK-NET-11").map((r) => r.verdict)).toEqual(NETS.map(() => "pass"));
    expect(by("CHK-NET-12").map((r) => [r.verdict, r.measured])).toEqual([["pass", 0]]);
    const net02 = by("CHK-NET-02");
    expect(net02).toHaveLength((NETS.length * (NETS.length - 1)) / 2);
    expect(net02.every((r) => r.verdict === "pass" && (r.legal as { lo: number }).lo === 0.6)).toBe(true);
    const least = [...s.result.gaps].sort((a, b) => a.mm - b.mm);
    expect(least[0]!.mm).toBeGreaterThanOrEqual(0.6);
    // PIP's closest trace pairs, by its own model: the built stack sits at PIP's figure plus the inset.
    for (const want of pip.elec.pairs.filter((p) => p.g > 0.7)) {
      const got = s.result.gaps.find((g) => (g.a === want.a && g.b === want.b) || (g.a === want.b && g.b === want.a))!;
      expect(got, `${want.a}/${want.b}`).toBeDefined();
      expect(got.mm).toBeGreaterThanOrEqual(want.g - 2 / 1024);
      expect(got.mm).toBeLessThanOrEqual(want.g + INSET_SLACK);
    }
    expect([least[0]!.a, least[0]!.b].sort()).toEqual(["B", "Y"]);
  });

  test("build.json and the stack metrics: PIP's z, L1 0.72 to 1.44, L2 2.40 to 3.12, pads 4.08 to 4.80", { timeout: 120_000 }, async () => {
    const design = await loadDesign(DIR, ROOT);
    const built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
    expect(built.part.buildHash).toBe(golden<{ buildHash: string }>("build.json").buildHash);
    const m = (id: string): number => built.part.metrics.find((x: Metric) => x.id === id)!.value as number;
    expect([m("stack.l1.bottom"), m("stack.l1.top")]).toEqual(pip.z.l1);
    expect([m("stack.l2.bottom"), m("stack.l2.top")]).toEqual(pip.z.l2);
    expect([m("stack.pads.bottom"), m("stack.floor")]).toEqual(pip.z.pad);
    expect(m("stack.iso")).toBe(0.96);
    expect(m("stack.overL2")).toBe(1.68);
    expect(m("stack.traceWidth")).toBe(1.4);
    expect([m("route.conflicts"), m("route.unrouted")]).toEqual([0, 0]);
  });

  test("forced failure: iters 1 on a layout that needs 2 returns CHK-NET-12 fail and exit 1, never pass", { timeout: 120_000 }, async () => {
    const design = await loadDesign(DIR, ROOT);
    const built = await buildPart(design, resolveParams(design.chase, { "/iters": 1 }, undefined), { epoch: 315532800 });
    const ctx = { workspace: ROOT, cwd: ROOT, inputsHash: "0".repeat(64) } as unknown as CoreCtx;
    const out = await solveBuilt(built, { build: "reference/electrical/pip-buried-route" }, ctx);
    const net12 = out.result.results.filter((r) => r.id === "CHK-NET-12");
    expect(net12.map((r) => r.verdict)).toEqual(["fail"]);
    expect(net12[0]!.measured).toBeGreaterThan(0);
    expect(net12[0]!.constraint).toMatch(/cells under the clearance: net GND: conflicted cells at layer/);
    expect(out.verdict).toBe("fail");
    expect(VERDICT_TRANSPORT[out.verdict].exit).toBe(1);
  });
});
