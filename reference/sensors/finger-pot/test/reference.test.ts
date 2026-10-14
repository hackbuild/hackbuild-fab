// M06-T09 reference: the finger-pot archetype placed by Author.arch regenerates
// the GIB original's readouts and warnings through the real build (core
// buildPart, the sandbox, the stage runner), read against
// packages/archetypes/test/legacy/gib.json (the original evaluated in
// place, scripts/gib-legacy.mjs), never against values this run writes.
// Resistances read the profile conductor row, so each equals the page's
// value scaled by the row over the page's state rho. The four parity
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
const REF = "reference/sensors/finger-pot";
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/gib.json"), "utf8")) as { variants: Record<string, { state: { rho: number }; warn: string[]; phys: { rows: [string, string][] } }> };
const V = LEG.variants["finger.defaults"]!;
const slug = (n: string): string => n.replace(/[^a-z0-9]+/gi, "-");

let built: Built;
beforeAll(async () => {
  const design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
});
const metric = (id: string): Metric | undefined => built.part.metrics.find((m) => m.id === id);
const P = "finger-pot.0.gib";

describe("finger-pot reference", () => {
  test("geometry readouts and warnings the original prints, by name and value", () => {
    for (const k of "travel,across".split(",")) {
      const row = V.phys.rows.find((r) => r[0] === k)!;
      expect(metric(`${P}.say.${slug(k)}`)?.value, k).toBe(row[1]);
    }
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
