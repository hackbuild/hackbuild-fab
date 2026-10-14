// M06-T09 reference: the blocks-stud archetype, blocks-html preset, peg both,
// placed by Author.arch on a one stud BLOCKS brick regenerates the original's
// column through the real build (core buildPart, the sandbox, the stage
// runner), read against packages/archetypes/test/legacy/blocks.json (the
// original evaluated in place, scripts/blocks-legacy.mjs, case both@9.6),
// never against values this run writes: the tap heights and the post top.
// Volumes and bounding boxes against the original are held in
// packages/archetypes/test/blocks.parity.test.ts on the declarations. The
// four parity goldens are rerun without accept off the pinned epoch.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { buildPart, loadDesign, resolveParams, type Built } from "../../../../core/src/commands/build.js";
import { runParity } from "../../../../core/src/commands/parity.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/conductors/blocks-stud";
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/blocks.json"), "utf8")) as {
  blocks: { stud: Record<string, { declared: { taps: { name: string; z: number }[]; feats: { slot: number; z0: number; z1: number; tag: string }[] } }> };
};
const leg = LEG.blocks.stud["both@9.6"]!.declared;

let built: Built;
beforeAll(async () => {
  const design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
});
const metric = (id: string): number | string => {
  const m = built.part.metrics.find((x) => x.id === `blocks-stud.0.stud.${id}`);
  if (m === undefined) throw new Error(`no metric ${id}`);
  return m.value;
};

describe("blocks-stud reference", () => {
  test("the taps stand where the original's do: S on the stud, S.sock in the socket", () => {
    expect(metric("standard")).toBe("blocks-html");
    expect(metric("tap.S")).toBeCloseTo(leg.taps.find((t) => t.name === "S")!.z, 9);
    expect(metric("tap.S-sock")).toBeCloseTo(leg.taps.find((t) => t.name === "S.sock")!.z, 9);
  });

  test("the post runs to the brick top, as the original's post feature does", () => {
    expect(metric("postTop")).toBeCloseTo(leg.feats.find((f) => f.tag === "post S")!.z1, 9);
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
