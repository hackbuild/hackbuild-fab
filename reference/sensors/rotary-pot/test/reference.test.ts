// M06-T09 reference: the printed-rotary-pot archetype placed by Author.arch
// regenerates the original's pot through the real build (core buildPart,
// the sandbox, the stage runner). Geometry readouts are read against
// packages/archetypes/test/legacy/tang.json (the original's record,
// scripts/tang-legacy.mjs); the arc and leaf readouts here are at the
// shipped profile rows, so the test holds them to those rows over the
// record's section, never to values this run writes. The four parity
// goldens are rerun without accept off the pinned epoch.

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
const REF = "reference/sensors/rotary-pot";
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/tang.json"), "utf8")) as {
  pot: { rotor: Record<string, number>; info: { e3: number[]; eG: number[]; wv: number[]; x: number; y: number }[] };
  defaults: { pots: { arcR: number; arcW: number; sweep: number }; faceStack: { l1: [number, number] } };
};

let built: Built;
beforeAll(async () => {
  const design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
});
const metric = (id: string): Metric | undefined => built.part.metrics.find((m) => m.id === `printed-rotary-pot.0.pot.${id}`);

describe("rotary pot reference", () => {
  test("preload 0.48 mm and the stub and wiper ends where the original puts them, mirrored onto the underside", () => {
    expect(Number(metric("preload")?.value)).toBeCloseTo(LEG.pot.rotor["preload"]!, 9);
    const c = LEG.pot.info[0]!;
    const end = (id: string): number[] => String(metric(`terminal.${id}`)?.value).split(" ").map(Number);
    for (const [id, p] of [["v33", c.e3], ["gnd", c.eG], ["wiper", c.wv]] as const) {
      const [u, v] = end(id);
      expect(u!, id).toBeCloseTo(p[0]! - c.x, 3);
      expect(v!, id).toBeCloseTo(-(p[1]! - c.y), 3);
    }
  });

  test("the arc reads the shipped cTPU row over the original's section, 300 deg of r 6.5 at 1.0 x 0.72", () => {
    const P = LEG.defaults.pots, t = LEG.defaults.faceStack.l1[1] - LEG.defaults.faceStack.l1[0];
    const row = shippedProfile().resistivity("ctpu", "bulk", "printed");
    const want = sectionResistance(row, (P.sweep * Math.PI * P.arcR) / 180, P.arcW * t).ohm as number;
    expect(Number(metric("R.arc")?.value)).toBeCloseTo(want, 6);
    expect(metric("R.arc")?.basis).toBe(row.provenance.tier);
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
