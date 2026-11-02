// The engine builds a design from a chase and the text of its build function
// with no bake: factsFor gives the facts, createPageBuild runs the pipeline.
// For the same values the meshes equal the committed parity golden of the
// reference (written by core). The buildHash differs by design, since defHash
// covers the text the page passes (facts.test.ts).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { createPageBuild, defaultKinds, factsFor, kernelKindsOf } from "../src/index.js";
import { chase } from "../../../reference/cosmetic/art-layers/chase.js";
import * as module from "../../../reference/cosmetic/art-layers/build.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const REF = "reference/cosmetic/art-layers";
const GOLD = JSON.parse(readFileSync(path.join(ROOT, REF, "expected/build.json"), "utf8")) as { meshHashes: Record<string, string>; volumes: Record<string, number> };
const tidy = (v: number): number => Number(v.toFixed(9));

describe("createPageBuild with factsFor", () => {
  const page = createPageBuild({ chase, module, facts: factsFor(chase, readFileSync(path.join(ROOT, REF, "build.ts"), "utf8")) });

  test("every body's mesh hash and volume equal the golden, and no check fails", async () => {
    const out = await page.build({});
    expect(Object.fromEntries(out.part.bodies.map((b) => [b.id, b.mesh.hash]))).toEqual(GOLD.meshHashes);
    expect(Object.fromEntries(out.part.bodies.map((b) => [b.id, tidy(b.mesh.volumeMm3)]))).toEqual(GOLD.volumes);
    expect(out.results.filter((r) => r.verdict === "fail").map((r) => r.id)).toEqual([]);
    expect(out.results.length).toBeGreaterThan(0);
    expect(page.liveCount()).toBe(0);
  }, 120_000);

  test("the 3mf export passes the writer's own checks", async () => {
    const out = await page.build({});
    const file = await page.exportFile("3mf", out.buildHash);
    expect(file.name).toBe("art-layers.3mf");
    expect(file.results.map((r) => r.id).sort()).toEqual(["CHK-3MF-06", "CHK-3MF-07"]);
    expect(file.results.filter((r) => r.verdict === "fail")).toEqual([]);
  }, 120_000);
});

describe("the default kinds", () => {
  test("name the kernels whose kinds a chase can use", () => {
    expect(Object.keys(defaultKinds).sort()).toEqual(["circuit", "inlay", "mesh", "nest"]);
    expect(kernelKindsOf(chase.meta.kernels).flatMap((k) => k.kinds.map((d) => d.kind))).toContain("inlay");
  });
});
