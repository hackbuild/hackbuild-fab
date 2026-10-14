// reportHash against the committed reference reports (M04-T08 step 1,
// D-064). Each reference/<area>/<id>/expected/report.json was written by a
// check.run at SOURCE_DATE_EPOCH 315532800 and committed; recomputing its
// hash from its own checks and findings must give the reportHash it holds,
// and moving any one of the six hashed fields of one finding must move it.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CheckResult } from "@hackbuild/spec";
import { reportHash, reportHashInput, reportObject } from "../src/index";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Every committed reference report, as area/id. */
function reports(): string[] {
  const out: string[] = [];
  for (const area of readdirSync(path.join(ROOT, "reference"), { withFileTypes: true })) {
    if (!area.isDirectory()) continue;
    for (const id of readdirSync(path.join(ROOT, "reference", area.name), { withFileTypes: true })) {
      if (!id.isDirectory()) continue;
      try {
        readFileSync(path.join(ROOT, "reference", area.name, id.name, "expected", "report.json"));
        out.push(`${area.name}/${id.name}`);
      } catch {
        // a reference with no report golden yet
      }
    }
  }
  return out.sort();
}

type Report = { readonly checks: Record<string, string>; readonly findings: CheckResult[]; readonly reportHash: string };
const load = (ref: string): Report =>
  JSON.parse(readFileSync(path.join(ROOT, "reference", ref, "expected", "report.json"), "utf8")) as Report;

describe("reportHash of every committed reference report", () => {
  const refs = reports();

  it("finds the reference reports", () => {
    expect(refs).toEqual(expect.arrayContaining(["keys/flex-pair", "fit/ogee16-r16p"]));
  });

  for (const ref of refs) {
    it(`${ref}: recomputed from its checks and findings, it equals the committed reportHash`, () => {
      const r = load(ref);
      expect(r.findings.length).toBeGreaterThan(0);
      expect(reportObject(r.checks, r.findings).reportHash).toBe(r.reportHash);
    });
  }

  it("each hashed field of one finding moves the hash; constraint text does not", () => {
    const r = load(refs.find((x) => x === "keys/flex-pair")!);
    const base = reportHash(reportHashInput(r.checks, r.findings));
    const i = r.findings.findIndex((f) => f.verdict !== "skip");
    expect(i).toBeGreaterThanOrEqual(0);
    const f = r.findings[i]!;
    const moved: Partial<CheckResult>[] = [
      { measured: null as unknown as CheckResult["measured"] },
      { verdict: f.verdict === "pass" ? "fail" : "pass" },
      { version: "9.9.9" },
      { legal: { kind: "none" } },
      { target: { level: "part", part: "moved" } },
    ];
    for (const m of moved) {
      const findings = r.findings.map((x, j) => (j === i ? { ...x, ...m } as CheckResult : x));
      expect(reportHash(reportHashInput(r.checks, findings)), JSON.stringify(m)).not.toBe(base);
    }
    const reworded = r.findings.map((x, j) => (j === i ? { ...x, constraint: `${x.constraint} reworded` } : x));
    expect(reportHash(reportHashInput(r.checks, reworded))).toBe(base);
  });
});
