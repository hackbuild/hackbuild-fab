// M06-T09 reference: the membrane-slider-gib archetype placed by Author.arch regenerates
// the GIB original's readouts and warnings through the real build (core
// buildPart, the sandbox, the stage runner), read against
// packages/archetypes/test/legacy/gib.json (the original evaluated in
// place, scripts/gib-legacy.mjs), never against values this run writes.
// Resistances read the profile conductor row, so each equals the page's
// value scaled by the row over the page's state rho, and the press force
// is the page's scaled by profile tpu95's modulus over the page's 25 MPa. The four parity
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
const REF = "reference/sensors/membrane-slider-gib";
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/gib.json"), "utf8")) as { variants: Record<string, { state: { rho: number }; warn: string[]; phys: { rows: [string, string][] } }> };
const V = LEG.variants["membrane.defaults"]!;
const slug = (n: string): string => n.replace(/[^a-z0-9]+/gi, "-");

let built: Built;
beforeAll(async () => {
  const design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
});
const metric = (id: string): Metric | undefined => built.part.metrics.find((m) => m.id === id);
const P = "membrane-slider-gib.0.gib";
/** The page's membrane modulus, MPa: BODY.flex.E (originals/gib/files/src/src/part2.js line 15). */
const PAGE_FLEX_E = 25;

describe("membrane-slider-gib reference", () => {
  test("geometry readouts and warnings the original prints, by name and value", () => {
    for (const k of "travel,gap".split(",")) {
      const row = V.phys.rows.find((r) => r[0] === k)!;
      expect(metric(`${P}.say.${slug(k)}`)?.value, k).toBe(row[1]);
    }
    // The press force bends the membrane, so it scales with the modulus: the page bends BODY.flex.E 25 MPa
    // (part2.js line 15), the build profile tpu95. Both figures print to 0.01 N, so the bound is the two roundings.
    const page = Number(/^([\d.]+) N/.exec(V.phys.rows.find((r) => r[0] === "press to close")![1])![1]);
    const ratio = shippedProfile().material("tpu95").modulusMPa! / PAGE_FLEX_E;
    const shown = Number(/^([\d.]+) N/.exec(String(metric(`${P}.say.press-to-close`)?.value))![1]);
    expect(Math.abs(shown - page * ratio), `${shown} N against ${page} N x ${ratio}`).toBeLessThanOrEqual(0.005 * ratio + 0.005);
    expect(built.part.warnings.filter((w) => w.text.includes("narrowed") || w.text.includes("thickness")).map((w) => w.text)).toEqual(V.warn);
  });

  test("track R on the profile conductor row: the page's value scaled by the row over the state's rho", () => {
    const row = shippedProfile().resistivity("ctpu", "bulk", "printed");
    const page = V.phys.rows.find((r) => r[0] === "track R")![1];
    const r = metric(`${P}.Rtrack`)!.value as number;
    const asPage = (r * V.state.rho) / (row.ohmCm as number);
    const text = asPage >= 1e6 ? `${(asPage / 1e6).toFixed(2)} Mohm` : asPage >= 1e3 ? `${(asPage / 1e3).toFixed(1)} kohm` : `${asPage.toFixed(0)} ohm`;
    expect(page.startsWith(text), `${page} against ${text}`).toBe(true);
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
