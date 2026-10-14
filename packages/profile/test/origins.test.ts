// Origins of record for profile rows whose source names an original app.
// The committed data files are read raw, and the cited original lines are
// read through their canonical lineage rows (collar.bench/collar-7,
// inlay.parts/part2, pip.model/haft-9), so a source that credits the wrong
// app or a line that does not say what the source claims fails here.

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const repo = new URL("../../../", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, repo), "utf8");
const lineage = JSON.parse(read("lineage.json")) as { id: string; kind: string; source: string }[];
const original = (id: string) => {
  const row = lineage.find((r) => r.id === id && r.kind === "canonical");
  if (row === undefined) throw new Error(`lineage has no canonical row ${id}`);
  return row.source;
};
const line = (path: string, n: number) => readFileSync(path, "utf8").split("\n")[n - 1] ?? "";

interface Prov { tier: string; method: string; source: string }
const constants = JSON.parse(read("packages/profile/data/constants.json")) as { constants: { id: string; value: number; provenance: Prov }[] };
const materials = JSON.parse(read("packages/profile/data/materials.json")) as {
  materials: { id: string; strain: { use: string; bend: string; pct: number; provenance: Prov }[] }[];
};

describe("despeckle.factor credits COLLAR v3, not SPRUE (D-145, CHK-INL-02)", () => {
  const row = constants.constants.find((c) => c.id === "despeckle.factor");
  test("the committed row names collar.html lines 1161 to 1166 and the INLAY copy", () => {
    expect(row?.value).toBe(0.35);
    expect(row?.provenance.source).toMatch(/collar\.html lines 1161 to 1166/);
    expect(row?.provenance.source).toMatch(/part2\.js line 209/);
    expect(row?.provenance.source).not.toMatch(/SPRUE/);
    expect([row?.provenance.tier, row?.provenance.method]).toEqual(["inferred", "failure"]);
  });
  test.runIf(existsSync(original("collar.bench/collar-7")))("collar.html line 1164 is the 0.35 min-feature disc", () => {
    const at = original("collar.bench/collar-7");
    expect(line(at, 1163)).toContain("despeckle eats every full stop");
    expect(line(at, 1164)).toMatch(/Math\.PI \* Math\.pow\(ST\.art\.minF \* k \/ 2, 2\) \* 0\.35/);
    expect(line(original("inlay.parts/part2"), 209)).toMatch(/0\.35 \* Math\.PI \* Math\.pow\(ST\.print\.minF \/ 2 \* res, 2\)/);
  });
});

describe("PETG in-plane strain cites the HAFT click spring fit (D-073, D-191)", () => {
  const petg = materials.materials.find((m) => m.id === "petg");
  const inPlane = petg?.strain.filter((s) => s.bend === "inPlane") ?? [];
  test("both in-plane rows lead with model.js line 541 and keep the seed and D-073", () => {
    expect(inPlane.map((s) => s.use).sort()).toEqual(["click", "snap"]);
    for (const s of inPlane) {
      expect(s.pct, s.use).toBe(2.5);
      expect(s.provenance.source, s.use).toMatch(/^originals\/pip\/files\/haft-src\/src\/model\.js line 541 /);
      expect(s.provenance.source, s.use).toMatch(/seed materials\.petg-click strainMax 0\.025/);
      expect(s.provenance.source, s.use).toMatch(/D-073/);
      expect(s.provenance.tier, s.use).toBe("inferred");
    }
  });
  test.runIf(existsSync(original("pip.model/haft-9")))("model.js line 541 is the eStop <= 0.025 fit", () => {
    expect(line(original("pip.model/haft-9"), 541)).toMatch(/fit\('click spring', 'strain at the stop'.*cd\.eStop <= 0\.025, 'PETG fatigues above about 2\.5'\)/);
  });
});
