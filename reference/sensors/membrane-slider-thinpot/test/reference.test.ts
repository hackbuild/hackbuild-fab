// M06-T09 reference: the membrane-slider-thinpot archetype placed by
// Author.arch regenerates the THINPOT original's readouts and fits through
// the real build (core buildPart, the sandbox, the stage runner), read
// against packages/archetypes/test/legacy/thinpot.json (the original
// evaluated in place at the shipped preset's 0.24 layer,
// scripts/thinpot-legacy.mjs), never against values this run writes. The
// track resistance reads the profile cPLA row, so it equals the page's
// value scaled by the row over the page's own 15 ohm cm. The four parity
// goldens are rerun without accept off the pinned epoch.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { Metric } from "@hackbuild/spec";
import { shippedProfile } from "@hackbuild/archetypes";
import { buildPart, loadDesign, resolveParams, type Built } from "../../../../core/src/commands/build.js";
import { runParity } from "../../../../core/src/commands/parity.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/sensors/membrane-slider-thinpot";
interface Say { k: string; v: string; u: string }
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/thinpot.json"), "utf8")) as { variants: Record<string, { readout: Say[]; fits: { name: string; actual: number; min: number; max: number; ok: boolean }[]; params: Record<string, number> }> };
const V = LEG.variants["thinpot.ffc5p"]!;
const slug = (n: string): string => n.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");

let built: Built;
beforeAll(async () => {
  const design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
});
const metric = (id: string): Metric | undefined => built.part.metrics.find((m) => m.id === id);
const P = "membrane-slider-thinpot.0.thinpot";

describe("THINPOT reference", () => {
  test("geometry readouts and fits the original prints at the 0.24 layer, by name and value", () => {
    for (const k of ["outline", "track", "air gap", "gap in layers", "wires out"]) {
      const r = V.readout.find((x) => x.k === k)!;
      expect(metric(`${P}.say.${slug(k)}`)?.value, k).toBe(r.v);
    }
    expect(V.fits.length).toBe(2);
    for (const f of V.fits) {
      const m = metric(`${P}.fits.${slug(f.name)}`);
      expect(m?.value, f.name).toBe(f.actual);
      expect(m!.note.endsWith("(not ok)"), f.name).toBe(!f.ok);
    }
  });

  test("track resistance on the profile cPLA row: the page's R scaled by the row over its 15 ohm cm", () => {
    const row = shippedProfile().resistivity("cpla", "along", "printed");
    const page = V.readout.find((x) => x.k === "R end to end")!.v;
    expect(page).toBe("4.17 kohm");
    const r = metric(`${P}.R.track`)!.value as number;
    expect(((r * 15) / (row.ohmCm as number) / 1000).toFixed(2)).toBe("4.17");
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
