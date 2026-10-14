// M06-T09 reference: the rp2040-zero-seat archetype, press mode with bumps,
// placed by Author.arch regenerates PIP's seat through the real build (core
// buildPart, the sandbox, the stage runner), read against
// packages/archetypes/test/legacy/pip-seat.json (the original evaluated in
// place, scripts/pip-seat-legacy.mjs, variant haft.bleed0, PIP's defaults at
// the profile's bleed 0), never against values this run writes: the body
// top, the board z and the eight board fits rows at the printed precision
// of each row. The four parity goldens are rerun without accept off the
// pinned epoch.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { buildPart, loadDesign, resolveParams, type Built } from "../../../../core/src/commands/build.js";
import { runParity } from "../../../../core/src/commands/parity.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/seats/rp2040-zero-pressfit";
interface Row { readonly group: string; readonly name: string; readonly value: string; readonly ok: boolean }
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/pip-seat.json"), "utf8")) as {
  variants: Record<string, { params: { bleed: number }; z: { top: number; board: number; boardTop: number }; fits: Row[] }>;
};
const V = LEG.variants["haft.bleed0"]!;

let built: Built;
beforeAll(async () => {
  const design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
});
const metric = (id: string): number => {
  const m = built.part.metrics.find((x) => x.id === `rp2040-zero-seat.0.${id}`);
  if (m === undefined || typeof m.value !== "number") throw new Error(`no metric ${id}`);
  return m.value;
};
/** The metric id of a fits row, as packages/archetypes fitMetric writes it. */
const slug = (name: string): string => name.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

describe("rp2040-zero-pressfit reference", () => {
  test("the record is PIP's defaults at bleed 0", () => {
    expect(V.params.bleed).toBe(0);
  });

  test("body top and board z equal PIP's", () => {
    expect(metric("host.top")).toBeCloseTo(V.z.top, 9);
    expect(metric("seat.boardZ")).toBeCloseTo(V.z.board, 9);
    expect(metric("seat.boardTop")).toBeCloseTo(V.z.boardTop, 9);
  });

  test("the eight board fits rows equal PIP's at their printed precision", () => {
    const rows = V.fits.filter((r) => r.group === "board");
    expect(rows).toHaveLength(8);
    for (const r of rows) {
      const printed = /^(-?\d+(?:\.(\d+))?)/.exec(r.value)!;
      const places = printed[2]?.length ?? 0;
      expect(Math.abs(metric(`seat.fits.${slug(r.name)}`) - Number(printed[1])), r.name).toBeLessThanOrEqual(0.5 * 10 ** -places + 1e-12);
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
