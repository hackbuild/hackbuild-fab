// CHK-ART-02 on its committed fixtures (M04-T10 step 5). The rebuild view
// here hands back pass.3mf, the export of reference/keys/click-spring-window
// at its stated inputs; core/test/artifact-rebuild.test.ts proves that the
// real rebuild gives those bytes. A missing source entry or rebuild view is
// a skip with its reason, never a pass.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { art02Findings, zipEpoch, type ArtifactRebuild } from "../src/defs/art/CHK-ART-02.js";

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "CHK-ART-02");
const read = (name: string): Uint8Array => new Uint8Array(readFileSync(path.join(FIX, name)));
const pass = read("pass.3mf");
const fail = read("fail.3mf");

/** The rebuild a correct core gives for the fixtures' stated source. */
const rebuild: ArtifactRebuild = async (s) => {
  expect(s).toMatchObject({ chase: "click-spring-window", sourceDateEpoch: 315532800 });
  const z = await JSZip.loadAsync(pass);
  const meta = JSON.parse(await z.file("Metadata/hackbuild_chase.json")!.async("string")) as { buildHash: string };
  return { buildHash: meta.buildHash, bytes: pass };
};

describe("CHK-ART-02", () => {
  it("reads SOURCE_DATE_EPOCH 315532800 from the zip mtime", () => {
    expect(zipEpoch(pass)).toBe(315532800);
    expect(zipEpoch(new Uint8Array([1, 2, 3]))).toBeUndefined();
  });

  it("pass.3mf: build hash and both objects pass", async () => {
    const out = await art02Findings({ exporter: "3mf", name: "pass.3mf", bytes: pass }, rebuild);
    expect(out.map((f) => f.verdict)).toEqual(["pass", "pass", "pass"]);
    expect(out.map((f) => f.extra?.["object"] ?? null)).toEqual([null, "spring arch1", "spring arch2"]);
    for (const f of out) expect(f.legal).toEqual({ kind: "boolean", must: true });
  });

  it("fail.3mf: one fail naming spring arch1 and both bounding boxes", async () => {
    const out = await art02Findings({ exporter: "3mf", name: "fail.3mf", bytes: fail }, rebuild);
    const bad = out.filter((f) => f.verdict === "fail");
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({ measured: false, target: { level: "artifact", artifact: "fail.3mf", path: "3D/3dmodel.model#1" }, extra: { object: "spring arch1" } });
    expect(bad[0]!.extra?.["shippedMeshHash"]).not.toBe(bad[0]!.extra?.["rebuiltMeshHash"]);
    expect(bad[0]!.constraint).toContain(`(${String(bad[0]!.extra?.["rebuiltSizeMm"])} mm)`);
  });

  it("a rebuild whose build hash moved fails the build hash finding", async () => {
    const moved: ArtifactRebuild = async (s) => ({ buildHash: `${s.buildHash[0] === "0" ? "1" : "0"}${s.buildHash.slice(1)}`, bytes: pass });
    const out = await art02Findings({ exporter: "3mf", name: "pass.3mf", bytes: pass }, moved);
    expect(out[0]).toMatchObject({ verdict: "fail", target: { path: "Metadata/hackbuild_chase.json" } });
  });

  it("no rebuild view, or no stated source: skip with the reason", async () => {
    const none = await art02Findings({ exporter: "3mf", name: "pass.3mf", bytes: pass }, undefined);
    expect(none).toEqual([expect.objectContaining({ verdict: "skip", constraint: expect.stringMatching(/no rebuild view/) })]);
    const z = await JSZip.loadAsync(pass);
    z.remove("Metadata/hackbuild_chase.json");
    const bare = await z.generateAsync({ type: "uint8array" });
    const out = await art02Findings({ exporter: "3mf", name: "bare.3mf", bytes: bare }, rebuild);
    expect(out).toEqual([expect.objectContaining({ verdict: "skip", constraint: expect.stringMatching(/has no Metadata\/hackbuild_chase\.json/) })]);
  });
});
