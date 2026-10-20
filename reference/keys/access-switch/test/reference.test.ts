// keys/access-switch reference (R1-flagship-access-switch-02): the real
// build (core buildPart at the pinned epoch) places one click-spring-key
// under a paddle. The spring band 1.3 to 1.8 N is the brief's band around
// the 1.552 N the scout read off the original snapfe.js at l 28, t 0.55
// (computed), and l 24 reads 2.527 N, outside it, as the click-spring
// reference pins; the parity goldens are rerun without accept off the
// pinned epoch.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { Metric } from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { buildPart, loadDesign, resolveParams, type Built, type Design } from "../../../../core/src/commands/build.js";
import { runParity } from "../../../../core/src/commands/parity.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/keys/access-switch";
const KEY = "click-spring-key.0";

let design: Design;
let built: Built;
beforeAll(async () => {
  design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
}, 300_000);
const metric = (id: string): Metric | undefined => built.part.metrics.find((m) => m.id === id);
const num = (id: string): number => {
  const v = metric(id)?.value;
  if (typeof v !== "number") throw new Error(`no numeric metric ${id}`);
  return v;
};

describe("access switch", () => {
  test("builds the body, the spring parts and the paddle, each in its slot", () => {
    const by = new Map(built.part.bodies.map((b) => [b.id, b] as const));
    expect(by.get("body")?.material).toBe("petg");
    expect(by.get("paddle")?.material).toBe("petg");
    expect(by.get(`${KEY}.spring`)?.material).toBe("petg");
    expect(by.get(`${KEY}.cap`)?.material).toBe("tpu95");
    expect(by.get(`${KEY}.tip`)?.material).toBe("ctpu");
  });

  test("spring metrics exist, gated by CHK-KEY-04, and the peak at defaults lies in 1.3 to 1.8 N", () => {
    for (const id of ["peakN", "drop", "cg", "eStop", "bistable"]) expect(metric(`${KEY}.spring.${id}`)?.gate, id).toBe("CHK-KEY-04");
    const peak = num(`${KEY}.spring.peakN`);
    expect(peak).toBeGreaterThan(1.3);
    expect(peak).toBeLessThan(1.8);
    expect(peak.toFixed(3)).toBe("1.552");
    expect(metric(`${KEY}.spring.bistable`)?.value).toBe("no");
  });

  test("build.ts hands the spring the petg modulus from profile and types no modulus", () => {
    const src = readFileSync(path.join(ROOT, REF, "build.ts"), "utf8");
    expect(src).toMatch(/k\.profile\.material\("petg"\)/);
    expect(src).toMatch(/const E = petg\.modulusMPa;/);
    expect(src).not.toMatch(/\b1900\b/);
    expect(createProfileLookup(design.ws.tables).material("petg").modulusMPa).toBeGreaterThan(0);
  });

  test("the paddle stops on the body top between contact and the eStop travel", () => {
    const prof = createProfileLookup(design.ws.tables);
    const cg = num(`${KEY}.spring.cg`);
    const over = prof.constant("click.stopOvertravel").value;
    expect(num("paddle.travel")).toBeGreaterThan(cg);
    expect(num("paddle.travel")).toBeLessThanOrEqual(Number((cg + over).toFixed(3)) + 1e-9);
    expect(num("paddle.boss")).toBeGreaterThan(0);
    expect(num("paddle.guideClr")).toBe(prof.constant("access.paddleGuideClr").value);
    expect(metric("paddle.guideClr")?.basis).toBe("inferred");
    expect(num("paddle.massG")).toBeGreaterThan(0);
    expect(num("layout.diameter")).toBe(56 + 2 * 3);
    expect(built.part.warnings.map((w) => w.code)).not.toContain("CLAMP");
  });

  test("the key and common nets are asserted apart", () => {
    expect(built.part.assertions).toContainEqual({ type: "apart", nets: ["KEY", "GND"] });
    const nets = new Set(built.part.features.flatMap((f) => (f.kind === "conductor" ? [f.net] : [])));
    expect([...nets].sort()).toEqual(["GND", "KEY"]);
  });

  test("parity goldens hold off the pinned epoch", { timeout: 300_000 }, async () => {
    const saved = process.env["SOURCE_DATE_EPOCH"];
    process.env["SOURCE_DATE_EPOCH"] = "1000000000";
    try {
      const out = await runParity({ reference: REF }, ROOT);
      expect(out.files.map((f) => [f.file, f.status])).toEqual([
        ["build.json", "equal"], ["report.json", "equal"], ["edit.json", "equal"], ["artifacts.json", "equal"],
      ]);
      expect(out.ok).toBe(true);
    } finally {
      if (saved === undefined) delete process.env["SOURCE_DATE_EPOCH"]; else process.env["SOURCE_DATE_EPOCH"] = saved;
    }
  });
});
