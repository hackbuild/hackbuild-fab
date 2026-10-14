// M06-T09 reference: the flex-cone-key archetype placed by Author.arch
// regenerates the original's fits rows and readouts through the real build
// (core buildPart, the sandbox, the stage runner), read against
// packages/archetypes/test/legacy/pip-fits.json (the original's record,
// scripts/pip-legacy.mjs), never against values this run writes; the four
// parity goldens are rerun without accept off the pinned epoch.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { stubOf } from "../../../../packages/archetypes/scripts/firmware-stubs.mjs";
import type { Metric } from "@hackbuild/spec";
import { buildPart, loadDesign, resolveParams, type Built } from "../../../../core/src/commands/build.js";
import { runParity } from "../../../../core/src/commands/parity.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/buttons/flex-cone";
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/pip-fits.json"), "utf8")) as { variants: Record<string, { fits: { group: string; name: string; value: string; ok: boolean }[] }> };
const slug = (n: string): string => n.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

let built: Built;
beforeAll(async () => {
  const design = await loadDesign(REF, ROOT);
  built = await buildPart(design, resolveParams(design.chase, undefined, undefined), { epoch: 315532800 });
});
const metric = (id: string): Metric | undefined => built.part.metrics.find((m) => m.id === id);

describe("flex cone reference", () => {
  test("every flex fits row the original prints, by name, value and ok", () => {
    const rows = LEG.variants["haft.bleed0"]!.fits.filter((f) => f.group === "flex key");
    expect(rows.length).toBe(6);
    for (const r of rows) {
      const m = metric(`flex-cone-key.0.key.fits.${slug(r.name)}`);
      expect(m, r.name).toBeDefined();
      expect(m!.note.startsWith(`flex key: ${r.name} ${r.value}${r.ok ? "" : " (not ok)"}`), `${r.name}: ${m!.note}`).toBe(true);
    }
  });

  test("readouts at PIP defaults: travel 1.80 mm (CHK-KEY-01 gated), key height 8.577, cone base 5.940, wall 0.783", () => {
    expect(metric("flex-cone-key.0.key.travel")?.value).toBe(1.8);
    expect(metric("flex-cone-key.0.key.travel")?.gate).toBe("CHK-KEY-01");
    expect(Number(metric("flex-cone-key.0.key.height")?.value).toFixed(3)).toBe("8.577");
    expect(Number(metric("flex-cone-key.0.key.rsb")?.value).toFixed(3)).toBe("5.940");
    expect(Number(metric("flex-cone-key.0.key.wallH")?.value).toFixed(3)).toBe("0.783");
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

describe("firmware stub", () => {
  test("carries KEY_WAIT_US 3500 and TOUCH_WAIT_US 1500, each naming the coupon that replaces it; equals expected/firmware.ino", async () => {
    const { firmwareStub } = await import("@hackbuild/archetypes");
    const { design, pins } = stubOf(REF);
    const stub = firmwareStub(design, pins);
    expect(stub).toMatch(/#define KEY_WAIT_US 3500 \/\/ .*coupon/);
    expect(stub).toMatch(/#define TOUCH_WAIT_US 1500 \/\/ .*coupon/);
    const file = path.join(ROOT, REF, "expected", "firmware.ino");
    // packages/archetypes/scripts/firmware-stubs.mjs --write is the one writer of this file (D-227).
    expect(readFileSync(file, "utf8")).toBe(stub);
  });
});
