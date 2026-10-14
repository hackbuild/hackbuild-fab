// M06-T09 reference: the membrane-slider-wall archetype placed by
// Author.arch regenerates the original's neck through the real build (core
// buildPart, the sandbox, the stage runner). Lengths are read against
// packages/archetypes/test/legacy/tang.json (the original's record,
// scripts/tang-legacy.mjs); the readouts here are at the shipped profile
// rows, so the test holds them to the profile's own rows and the record's
// geometry, never to values this run writes. The four parity goldens are
// rerun without accept off the pinned epoch.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { Metric } from "@hackbuild/spec";
import { sectionResistance } from "@hackbuild/profile";
import { shippedProfile } from "@hackbuild/archetypes";
import { buildPart, loadDesign, resolveParams, type Built } from "../../../../core/src/commands/build.js";
import { runParity } from "../../../../core/src/commands/parity.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/sensors/membrane-slider";
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/tang.json"), "utf8")) as { neck: { dims: Record<string, number>; readouts: Record<string, number> }; defaults: { mat: { cplaXY: number } } };

let built: Built;
beforeAll(async () => {
  const design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
});
const metric = (id: string): Metric | undefined => built.part.metrics.find((m) => m.id === `membrane-slider-wall.0.neck.${id}`);

describe("membrane slider reference", () => {
  test("track length 210 mm; the deck leads at the Proto-pasta row equal the original's (30 ohm cm, vendor)", () => {
    expect(metric("trackLen")?.value).toBe(LEG.neck.dims["trackLen"]);
    expect(Number(metric("R.leadA")?.value)).toBeCloseTo(LEG.neck.readouts["leadA"]!, 6);
    expect(Number(metric("R.leadB")?.value)).toBeCloseTo(LEG.neck.readouts["leadB"]!, 6);
    expect(Number(metric("R.wiper")?.value)).toBeCloseTo(LEG.neck.readouts["wiperR"]!, 6);
  });

  test("the cTPU track reads the shipped cTPU row over the record's 210 mm of 11 x 0.8 (the original's 1500 ohm cm has no profile row)", () => {
    const row = shippedProfile().resistivity("ctpu", "bulk", "printed");
    const want = sectionResistance(row, LEG.neck.dims["trackLen"]!, 11 * 0.8).ohm as number;
    expect(Number(metric("R.track")?.value)).toBeCloseTo(want, 6);
    expect(metric("R.track")?.basis).toBe(row.provenance.tier);
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
