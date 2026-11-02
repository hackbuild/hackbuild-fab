// factsFor against tools/bake/design-facts.mjs. The bake script runs in a
// child process over the files on disk; the engine computes the same facts
// in the page from a chase and the source text it is handed. Every field but
// defHash must be equal, and defHash must equal core's when the page hands
// over the files core's source closure names.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { DEFAULT_EPOCH, factsFor } from "../src/index.js";
import { chase } from "../../../reference/cosmetic/coin-inlay/chase.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const REF = "reference/cosmetic/coin-inlay";
const text = (file: string): string => readFileSync(path.join(ROOT, REF, file), "utf8");

const baked = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, "tools/bake/design-facts.mjs"), path.join(ROOT, REF)], {
  encoding: "utf8", maxBuffer: 1 << 28, env: { ...process.env, SOURCE_DATE_EPOCH: String(DEFAULT_EPOCH) },
})) as Record<string, unknown>;
const page = JSON.parse(JSON.stringify(factsFor(chase, text("build.ts")))) as Record<string, unknown>;

describe("factsFor equals the bake's facts", () => {
  test.each(["name", "tables", "checksSeed", "versions", "constraints", "epoch"])("%s is equal", (field) => {
    expect(page[field]).toEqual(baked[field]);
  });

  test("the page has no field the bake lacks and the bake none the page lacks", () => {
    expect(Object.keys(page).sort()).toEqual(Object.keys(baked).sort());
  });

  test("defHash differs when only the build text is passed, and is equal when the closure files are", () => {
    expect(page["defHash"]).not.toBe(baked["defHash"]);
    const closure = JSON.parse(JSON.stringify(factsFor(chase, { "build.ts": text("build.ts"), "chase.ts": text("chase.ts") }))) as Record<string, unknown>;
    expect(closure["defHash"]).toBe(baked["defHash"]);
  });

  test("an edit to the source or the chase moves defHash", () => {
    const edited = factsFor(chase, `${text("build.ts")}\n// edit`).defHash;
    expect(edited).not.toBe(page["defHash"]);
    const other = { ...chase, meta: { ...chase.meta, name: "OTHER" } };
    expect(factsFor(other, text("build.ts")).defHash).not.toBe(page["defHash"]);
  });
});

describe("factsFor options and refusals", () => {
  test("the epoch defaults to 315532800 and never goes below it", () => {
    expect(factsFor(chase, "x").epoch).toBe(DEFAULT_EPOCH);
    expect(factsFor(chase, "x", { epoch: 1_700_000_000 }).epoch).toBe(1_700_000_000);
    expect(factsFor(chase, "x", { epoch: 5 }).epoch).toBe(DEFAULT_EPOCH);
  });

  test("an unknown machine is E_REF with the closest id", () => {
    const bad = { ...chase, meta: { ...chase.meta, machines: ["ffc5q"] } };
    let caught: unknown;
    try { factsFor(bad, "x"); } catch (e) { caught = e; }
    const hbf = (caught as { hbf?: { code: string; didYouMean?: string[]; got: string } }).hbf;
    expect(hbf?.code).toBe("E_REF");
    expect(hbf?.got).toBe("ffc5q");
    expect(hbf?.didYouMean).toContain("ffc5p");
  });

  test("the manifold version equals the installed package and the engine peer range", () => {
    const installed = JSON.parse(readFileSync(path.join(ROOT, "node_modules/manifold-3d/package.json"), "utf8")) as { version: string };
    const peer = (JSON.parse(readFileSync(path.join(ROOT, "packages/engine/package.json"), "utf8")) as { peerDependencies: Record<string, string> }).peerDependencies["manifold-3d"];
    expect(factsFor(chase, "x").versions.manifold).toBe(installed.version);
    expect(peer).toBe(installed.version);
  });
});
