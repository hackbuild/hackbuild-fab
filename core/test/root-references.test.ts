// `npx tsc -b` in CI typechecks only what the root tsconfig.json reaches
// through its references. A design or reference folder with its own
// tsconfig.json that the root omits is never typechecked (F-12-tsc: the
// root missed designs/pip). Every tracked tsconfig.json under designs/ and
// reference/ must be a root reference, unless PENDING names it with the
// reason it cannot build yet.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "./hbf.js";

/** Folders the root omits on purpose, each with the error that blocks it. */
const PENDING: Readonly<Record<string, string>> = {
  "reference/buttons/click-spring": "TS7016, packages/archetypes/scripts/firmware-stubs.mjs has no declaration file",
  "reference/buttons/flex-cone": "TS7016, packages/archetypes/scripts/firmware-stubs.mjs has no declaration file",
  "reference/buttons/touch-comb": "TS7016, packages/archetypes/scripts/firmware-stubs.mjs has no declaration file",
};

function rootRefs(): Set<string> {
  const j = JSON.parse(readFileSync(path.join(ROOT, "tsconfig.json"), "utf8")) as { references?: { path: string }[] };
  return new Set((j.references ?? []).map((r) => path.posix.normalize(r.path)));
}

function trackedDirs(): string[] {
  const out = execFileSync("git", ["ls-files", "--cached", "--", "designs", "reference"], { cwd: ROOT, encoding: "utf8" });
  return out.split("\n")
    .filter((f) => f.endsWith("/tsconfig.json") && !f.includes("/node_modules/") && !f.includes("/legacy/"))
    .map((f) => path.posix.dirname(f))
    .sort();
}

describe("root tsconfig references", () => {
  it("reach every tracked design and reference tsconfig.json", () => {
    const refs = rootRefs();
    const missing = trackedDirs().filter((d) => !refs.has(d) && PENDING[d] === undefined);
    expect(missing).toEqual([]);
  });

  it("include designs/pip", () => {
    expect(rootRefs().has("designs/pip")).toBe(true);
  });

  it("list no pending folder the root already references", () => {
    const refs = rootRefs();
    expect(Object.keys(PENDING).filter((d) => refs.has(d))).toEqual([]);
  });
});
