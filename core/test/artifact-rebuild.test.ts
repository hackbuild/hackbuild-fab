// M04-T10 step 5: CHK-ART-02 with core's rebuild view. The fixtures under
// packages/checks/test/fixtures/CHK-ART-02 are regenerated here, never
// edited: pass.3mf is the export of reference/keys/click-spring-window at
// its defaults and SOURCE_DATE_EPOCH 315532800; fail.3mf states the same
// source but ships arch1 from the build at t = 0.65 mm, the NACELLE shape
// (one body from another revision than the source). HBF_WRITE_FIXTURES=1
// rewrites them; otherwise a fresh export must equal the committed bytes.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readEntries } from "@hackbuild/3mf";
import { art02Findings, zipEpoch } from "../../packages/checks/src/defs/art/CHK-ART-02.js";
import { artifactRebuild, designsByChaseId } from "../src/artifact-rebuild.js";
import { buildPart, export3mf, loadDesign, resolveParams, type Built } from "../src/commands/build.js";
import { ROOT } from "./hbf.js";

const REF = "reference/keys/click-spring-window";
const FIX = path.join(ROOT, "packages", "checks", "test", "fixtures", "CHK-ART-02");
const EPOCH = 315532800;
const golden = JSON.parse(readFileSync(path.join(ROOT, REF, "expected", "build.json"), "utf8")) as { buildHash: string };
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

async function build(params?: Record<string, unknown>): Promise<Built> {
  const design = await loadDesign(REF, ROOT);
  return buildPart(design, resolveParams(design.chase, params as never, undefined), { epoch: EPOCH });
}

/** The fixture bytes, fresh: the true export, and the export with arch1 swapped for the t = 0.65 build's arch1. */
async function fresh(): Promise<{ pass: Uint8Array; fail: Uint8Array }> {
  const a = await build();
  const b = await build({ t: 0.65 });
  const other = b.meshed.slots.find((s) => s.name === "arch1");
  if (other === undefined) throw new Error("the t = 0.65 build has no arch1 slot");
  const drifted: Built = { ...a, meshed: { ...a.meshed, slots: a.meshed.slots.map((s) => (s.name === "arch1" ? { ...s, mesh: other.mesh } : s)) } };
  return { pass: (await export3mf(a)).bytes, fail: (await export3mf(drifted)).bytes };
}

describe("CHK-ART-02 with the core rebuild view", () => {
  it("the fixtures are the regenerated exports", async () => {
    const f = await fresh();
    if (process.env["HBF_WRITE_FIXTURES"] === "1") {
      writeFileSync(path.join(FIX, "pass.3mf"), f.pass);
      writeFileSync(path.join(FIX, "fail.3mf"), f.fail);
    }
    expect(sha(f.pass)).toBe(sha(readFileSync(path.join(FIX, "pass.3mf"))));
    expect(sha(f.fail)).toBe(sha(readFileSync(path.join(FIX, "fail.3mf"))));
  }, 120_000);

  it("the stated source resolves to one design and the zip mtime is the epoch", async () => {
    expect(designsByChaseId(ROOT, "click-spring-window")).toEqual([REF]);
    expect(designsByChaseId(ROOT, "no-such-chase")).toEqual([]);
    const bytes = new Uint8Array(readFileSync(path.join(FIX, "pass.3mf")));
    expect(zipEpoch(bytes)).toBe(EPOCH);
    const meta = JSON.parse((await readEntries(bytes))["Metadata/hackbuild_chase.json"] as string) as { chase: string; buildHash: string };
    expect(meta).toEqual({ chase: "click-spring-window", buildHash: golden.buildHash });
  });

  it("pass.3mf rebuilds to its stated build hash and every object meshHash", async () => {
    const bytes = new Uint8Array(readFileSync(path.join(FIX, "pass.3mf")));
    const out = await art02Findings({ exporter: "3mf", name: "pass.3mf", bytes }, artifactRebuild(ROOT));
    expect(out.map((f) => f.verdict)).toEqual(["pass", "pass", "pass"]);
    expect(out[0]!.extra?.["rebuiltBuildHash"]).toBe(golden.buildHash);
  }, 120_000);

  it("fail.3mf fails on the object whose meshHash differs, naming it with both sizes", async () => {
    const bytes = new Uint8Array(readFileSync(path.join(FIX, "fail.3mf")));
    const out = await art02Findings({ exporter: "3mf", name: "fail.3mf", bytes }, artifactRebuild(ROOT));
    const fails = out.filter((f) => f.verdict === "fail");
    expect(fails).toHaveLength(1);
    expect(fails[0]!.extra?.["object"]).toBe("spring arch1");
    expect(fails[0]!.constraint).toMatch(/^object spring arch1 meshHash [0-9a-f]{12} shipped \(.+ mm\), rebuild gives [0-9a-f]{12} \(.+ mm\)$/);
    expect(fails[0]!.extra?.["shippedSizeMm"]).not.toBe(fails[0]!.extra?.["rebuiltSizeMm"]);
    // The stated build hash still reproduces: the drift is in the shipped mesh, as at NACELLE.
    expect(out[0]!.verdict).toBe("pass");
    expect(out.find((f) => f.extra?.["object"] === "spring arch2")?.verdict).toBe("pass");
  }, 120_000);

  it("a chase id no design carries fails with the reason", async () => {
    const bytes = new Uint8Array(readFileSync(path.join(FIX, "pass.3mf")));
    const view = artifactRebuild(ROOT);
    const out = await art02Findings({ exporter: "3mf", name: "pass.3mf", bytes }, (s) => view({ ...s, chase: "no-such-chase" }));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ verdict: "fail", measured: false });
    expect(out[0]!.constraint).toMatch(/no chase\.ts under reference\/ or designs\/ has meta\.id no-such-chase/);
  }, 60_000);
});
