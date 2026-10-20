// The registryHash a page build makes with the loader's constraint
// versions equals the one `hbf part.build` stored for
// reference/keys/flex-pair (expected/build.json, written by parity). The
// facts come from tools/bake/design-facts.mjs in a child process, as the
// bake writes them; the baked constraint versions are replaced by the
// loader's through pageFacts. A test double with one version string
// changed must move the hash.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { createPageBuild, resolveParams, type PageFacts } from "@hackbuild/pipeline";
import { chaseRegistries, collectConstraintDefs, constraintVersions, loadRegistry, pageFacts, versionDrift } from "@hackbuild/registry-loader";
import { chase } from "../../../reference/keys/flex-pair/chase.js";
import * as module from "../../../reference/keys/flex-pair/build.js";
import * as kinds from "../../../reference/keys/flex-pair/skeleton-kinds.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const REF = "reference/keys/flex-pair";
const GOLD = JSON.parse(readFileSync(path.join(ROOT, REF, "expected/build.json"), "utf8")) as { inputs: { registryHash: string } };
const SEED: unknown = JSON.parse(readFileSync(path.join(ROOT, "packages/checks/seed/checks.seed.json"), "utf8"));

let baked: PageFacts;
beforeAll(() => {
  const run = spawnSync(process.execPath, [path.join(ROOT, "tools/bake/design-facts.mjs"), path.join(ROOT, REF)], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, SOURCE_DATE_EPOCH: "315532800" }, maxBuffer: 64 * 1024 * 1024,
  });
  expect(run.status, run.stderr).toBe(0);
  baked = JSON.parse(run.stdout) as PageFacts;
}, 120_000);

async function pageRegistryHash(facts: PageFacts): Promise<string> {
  const page = createPageBuild({ chase, module, kinds, facts });
  const out = await page.build(resolveParams(chase, undefined, undefined));
  expect(page.liveCount()).toBe(0);
  return out.registryHash;
}

describe("registry loader", () => {
  test("a page build with the loader's constraint versions stores part.build's registryHash", async () => {
    const facts = pageFacts({ ...baked, constraints: {} }, loadRegistry());
    expect(facts.constraints).toEqual(constraintVersions());
    expect(await pageRegistryHash(facts)).toBe(GOLD.inputs.registryHash);
  }, 240_000);

  test("one constraint version string changed in the double moves the hash", async () => {
    const real = loadRegistry().versions();
    const id = Object.keys(real.constraints).sort()[0]!;
    const double = { versions: () => ({ ...real, constraints: { ...real.constraints, [id]: `${real.constraints[id]!}-double` } }) };
    const facts = pageFacts(baked, double);
    expect(versionDrift(baked.constraints, facts.constraints)).toEqual([id]);
    expect(await pageRegistryHash(facts)).not.toBe(GOLD.inputs.registryHash);
  }, 240_000);

  test("the baked cross-check agrees with the loader", () => {
    expect(versionDrift(baked.constraints, loadRegistry().versions().constraints)).toEqual([]);
  });

  test("every collected def is in the registry, every seeded check registers, exporters carry the page kinds", () => {
    const reg = loadRegistry({ checksSeed: SEED, exporters: ["3mf", "dxf"] });
    expect(reg.constraints.ids()).toEqual(collectConstraintDefs().map((c) => c.def.id).sort());
    expect(Object.keys(reg.versions().checks).length).toBe(reg.checks.length);
    expect(reg.checks.length).toBeGreaterThan(0);
    for (const k of ["3mf", "dxf", "stl", "card"]) expect(reg.exporters).toContain(k);
    expect(reg.kinds).toEqual({});
    const chaseReg = chaseRegistries(reg);
    expect(chaseReg.constraintDims).toEqual([...reg.constraints.dims()]);
    expect(chaseReg.machines.length).toBeGreaterThan(0);
  });
});
