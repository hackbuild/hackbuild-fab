// keys/access-switch/coupon reference (R1-flagship-access-switch-10): the
// real build (core buildPart at the pinned epoch) places three
// click-spring-key cells at span 28, one per rung. The peaks are pinned to
// the scout's sweep of the original snapfe.js at l 28 (brief finding 2:
// t 0.50, 0.55, 0.60 read 1.062, 1.552, 2.195 N, computed), an
// independent source; CHK-KEY-04 is read per cell off the committed
// report golden, and the parity goldens are rerun without accept off the
// pinned epoch.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { Metric } from "@hackbuild/spec";
import { createProfileLookup } from "@hackbuild/profile";
import { buildPart, loadDesign, resolveParams, type Built, type Design } from "../../../../../core/src/commands/build.js";
import { runParity } from "../../../../../core/src/commands/parity.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..", "..");
const REF = "reference/keys/access-switch/coupon";
const KEY = "click-spring-key";
const CELLS = [0, 1, 2] as const;
/** Scout sweep on the original snapfe.js, l 28, Q 2.0, w 1.6, E 1900 (brief finding 2, computed). */
const SWEEP_N = ["1.062", "1.552", "2.195"];

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

describe("access switch coupon", () => {
  test("builds the frame, three springs, caps and tips, and three cups, in PETG and TPU only", () => {
    const by = new Map(built.part.bodies.map((b) => [b.id, b] as const));
    expect(by.get("body")?.material).toBe("petg");
    for (const i of CELLS) {
      expect(by.get(`${KEY}.${i}.spring`)?.material).toBe("petg");
      expect(by.get(`${KEY}.${i}.cap`)?.material).toBe("tpu95");
      expect(by.get(`${KEY}.${i}.tip`)?.material).toBe("tpu95");
      expect(by.get(`cup${i + 1}`)?.material).toBe("petg");
    }
    expect(built.part.bodies.filter((b) => b.id.endsWith(".spring"))).toHaveLength(3);
    expect([...new Set(built.part.bodies.map((b) => b.material))].sort()).toEqual(["petg", "tpu95"]);
    expect(built.part.features.filter((f) => f.kind === "conductor" || f.kind === "port" || f.kind === "pad")).toEqual([]);
    expect(built.part.features.filter((f) => f.kind === "spring")).toHaveLength(3);
  });

  test("the rungs step up in beam and the peaks step up with them, as the sweep reads", () => {
    const ts = CELLS.map((i) => num(`rung.${i + 1}.t`));
    const peaks = CELLS.map((i) => num(`${KEY}.${i}.spring.peakN`));
    for (const i of [0, 1]) {
      expect(ts[i + 1]!, `rung ${i + 2} beam over rung ${i + 1}`).toBeGreaterThan(ts[i]!);
      expect(peaks[i + 1]!, `rung ${i + 2} peak over rung ${i + 1}`).toBeGreaterThan(peaks[i]!);
    }
    expect(peaks.map((v) => v.toFixed(3))).toEqual(SWEEP_N);
    expect(CELLS.map((i) => Math.round(num(`rung.${i + 1}.peakG`)))).toEqual([108, 158, 224]);
  });

  test("coins to snap are the peak in grams over coupon.coinMassG", () => {
    const coin = createProfileLookup(design.ws.tables).constant("coupon.coinMassG");
    for (const i of CELLS) {
      expect(num(`rung.${i + 1}.coins`)).toBeCloseTo(num(`rung.${i + 1}.peakG`) / coin.value, 2);
      expect(metric(`rung.${i + 1}.coins`)?.basis).toBe("inferred");
    }
    expect(num("cup.massG")).toBeGreaterThan(0);
    expect(num("cup.lift")).toBeGreaterThan(Math.max(...CELLS.map((i) => num(`${KEY}.${i}.spring.cg`))));
  });

  test("CHK-KEY-04 passes on each spring in the committed report", () => {
    const report = JSON.parse(readFileSync(path.join(ROOT, REF, "expected", "report.json"), "utf8")) as {
      findings: { id: string; verdict: string; target: { feature?: string }; extra?: { t?: number } }[];
    };
    const key04 = report.findings.filter((f) => f.id === "CHK-KEY-04");
    expect(key04.map((f) => [f.target.feature, f.extra?.t, f.verdict])).toEqual(
      CELLS.map((i) => [`${KEY}.${i}.spring.click`, [0.5, 0.55, 0.6][i], "pass"]),
    );
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
