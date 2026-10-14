// M06-T09 reference: the blocks-wire archetype placed by Author.arch
// regenerates the original's path, spans and fit through the real build
// (core buildPart, the sandbox, the stage runner), read against
// packages/archetypes/test/legacy/blocks.json (the original's record,
// scripts/blocks-legacy.mjs), never against values this run writes; the
// four parity goldens are rerun without accept off the pinned epoch.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { Metric } from "@hackbuild/spec";
import { buildPart, loadDesign, resolveParams, type Built } from "../../../../core/src/commands/build.js";
import { runParity } from "../../../../core/src/commands/parity.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/conductors/blocks-wire";
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/blocks.json"), "utf8")) as { blocks: { wire: Record<string, { declared: { len: number; chord: number; fits: { value: number; ok: boolean }[]; ports: Record<string, { top: boolean; bottom: boolean }> } }> } };
const leg = LEG.blocks.wire["straight.ctpu"]!.declared;

let built: Built;
beforeAll(async () => {
  const design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
});
const metric = (id: string): Metric | undefined => built.part.metrics.find((m) => m.id === id);

describe("blocks wire reference", () => {
  test("path length, chord and the sheath wall fit equal the original at its defaults", () => {
    expect(metric("blocks-wire.0.wire.len")?.value).toBe(leg.len);
    expect(Number(Number(metric("blocks-wire.0.wire.chord")?.value).toFixed(6))).toBe(leg.chord);
    expect(metric("blocks-wire.0.wire.fits.sheath-wall-each-side")?.value).toBe(leg.fits[0]!.value);
    expect(leg.fits[0]!.ok).toBe(true);
  });

  test("a socket and stud cap at each end, as the original's ports say: ring, flange, post and stud bodies per cap", () => {
    for (const end of ["A", "B"]) {
      expect(leg.ports[end]).toEqual({ end, top: true, bottom: true } as never);
      for (const piece of ["ring", "flange", "post", "stud"]) expect(built.part.bodies.some((b) => b.id === `blocks-wire.0.cap${end}.${piece}`), `${end} ${piece}`).toBe(true);
    }
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
