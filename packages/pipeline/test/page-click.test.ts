// A click-spring-key builds in a baked bench page: createPageBuild
// registers sim's click solver (registerSolvers) before the first build,
// so the archetype reads the FE curve with no core in the process. Core
// is never imported here; it would register the solver at load and hide
// a page that registers none. The facts come from
// tools/bake/design-facts.mjs in a child process, as the bake writes
// them. The page result is read against the committed parity golden
// (reference/buttons/click-spring/expected/build.json, written by core)
// and the original's record (packages/archetypes/test/legacy/pip-fits.json).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import type { Metric } from "@hackbuild/spec";
import { createPageBuild, resolveParams, type PageFacts, type PageResult } from "@hackbuild/pipeline";
import { chase } from "../../../reference/buttons/click-spring/chase.js";
import * as module from "../../../reference/buttons/click-spring/build.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const REF = "reference/buttons/click-spring";
const EPOCH = "315532800";
const GOLD = JSON.parse(readFileSync(path.join(ROOT, REF, "expected/build.json"), "utf8")) as { buildHash: string; meshHashes: Record<string, string> };
const LEG = JSON.parse(readFileSync(path.join(ROOT, "packages/archetypes/test/legacy/pip-fits.json"), "utf8")) as {
  variants: Record<string, { fits: { group: string; name: string; value: string; ok: boolean }[]; mech: { click: Record<string, number | boolean> } }>;
};
const slug = (n: string): string => n.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

let out: PageResult;
beforeAll(async () => {
  const run = spawnSync(process.execPath, [path.join(ROOT, "tools/bake/design-facts.mjs"), path.join(ROOT, REF)], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, SOURCE_DATE_EPOCH: EPOCH }, maxBuffer: 64 * 1024 * 1024,
  });
  expect(run.status, run.stderr).toBe(0);
  const facts = JSON.parse(run.stdout) as PageFacts;
  const page = createPageBuild({ chase, module, facts });
  out = await page.build(resolveParams(chase, undefined, undefined));
  expect(page.liveCount()).toBe(0);
}, 240_000);
const metric = (id: string): Metric | undefined => out.metrics.find((m) => m.id === id);

describe("click spring in a page build", () => {
  test("builds with no E_KERNEL to core's buildHash and mesh hashes", () => {
    expect(out.buildHash).toBe(GOLD.buildHash);
    expect(Object.fromEntries(out.part.bodies.map((b) => [b.id, b.mesh.hash]))).toEqual(GOLD.meshHashes);
  });

  test("FE readouts equal the original's, gated by CHK-KEY-04", () => {
    const leg = LEG.variants["haft.bleed0"]!.mech.click;
    const v = (id: string): number => Number(metric(`click-spring-key.0.spring.${id}`)?.value);
    expect(v("peakN")).toBeCloseTo(leg["peak"] as number, 6);
    expect(v("drop")).toBeCloseTo(leg["drop"] as number, 6);
    expect(v("cg")).toBeCloseTo(leg["cg"] as number, 6);
    expect(v("eStop")).toBeCloseTo(leg["eStop"] as number, 6);
    expect(metric("click-spring-key.0.spring.bistable")?.value).toBe("no");
    for (const id of ["peakN", "drop", "cg", "eStop"]) expect(metric(`click-spring-key.0.spring.${id}`)?.gate).toBe("CHK-KEY-04");
    expect(out.results.find((r) => r.id === "CHK-KEY-04")?.verdict).toBeDefined();
  });

  test("every click fits row the original prints, by name, value and ok", () => {
    const rows = LEG.variants["haft.bleed0"]!.fits.filter((f) => f.group === "click spring");
    expect(rows.length).toBe(11);
    for (const r of rows) {
      const m = metric(`click-spring-key.0.key.fits.${slug(r.name)}`);
      expect(m, r.name).toBeDefined();
      expect(m!.note.startsWith(`click spring: ${r.name} ${r.value}${r.ok ? "" : " (not ok)"}`), `${r.name}: ${m!.note}`).toBe(true);
    }
  });
});
