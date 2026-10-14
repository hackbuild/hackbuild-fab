// M04-T04 acceptance 3 on a real design: the coin-inlay reference built at
// depth 0.72 mm (3 layers of 0.24) fails CHK-INL-03 against the 1.2 mm
// opacity floor; the fix sets /depth to 1.2, and the fix's predicted build
// and verdict are the ones a separate rebuild at 1.2 gives. The card's row
// says depth 0.8, which is off the 0.24 mm layer grid and refused by the
// build (E_SCHEMA at /depth, computed 2026-10-08), so 0.72 stands in. The
// golden numbers are the card's: nearest 1.2, fix 1.2, predicts pass.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CheckResult } from "@hackbuild/spec";
import { buildPart, loadDesign, resolveParams, runChecks } from "../src/commands/build.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CARD = { param: "/depth", set: 1.2, nearest: 1.2, verdict: "pass" } as const;
const DEPTH = 0.72;

async function inl03At(depth: number): Promise<{ readonly results: readonly CheckResult[]; readonly buildHash: string }> {
  const design = await loadDesign("reference/cosmetic/coin-inlay", ROOT);
  const built = await buildPart(design, resolveParams(design.chase, { inlay: { depth } }, undefined));
  const checked = await runChecks(built, [], ["CHK-INL-03"]);
  return { results: checked.results, buildHash: built.part.buildHash };
}

describe("coin-inlay CHK-INL-03 fix, predicted and applied", () => {
  it(`depth ${DEPTH} fails; each finding's fix sets ${CARD.param} = ${CARD.set} and the applied rebuild matches its prediction`, async () => {
    const before = await inl03At(DEPTH);
    const fails = before.results.filter((r) => r.verdict === "fail");
    expect(fails.length).toBeGreaterThan(0);
    const after = await inl03At(CARD.set);
    for (const r of fails) {
      expect(r.measured).toBe(DEPTH);
      expect(r.legal).toMatchObject({ kind: "interval", nearest: CARD.nearest });
      expect(r.fix).toMatchObject({ param: CARD.param, set: CARD.set, predicts: { verdict: CARD.verdict } });
      expect(r.extra?.["predictedBuild"]).toBe(after.buildHash);
      expect(r.extra?.["predictedBuild"]).not.toBe(before.buildHash);
      const same = after.results.find((x) => JSON.stringify(x.target) === JSON.stringify(r.target));
      expect([same?.measured, same?.verdict]).toEqual([r.fix!.predicts.measured, r.fix!.predicts.verdict]);
    }
  }, 120_000);
});
