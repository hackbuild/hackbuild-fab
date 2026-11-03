// A page's state starts as packages/chase normaliseParams of nothing, and the
// page build hashes resolveParams of that state; the CLI hashes
// resolveParams of no params (D-264). The two agree only when pipeline's
// defaults equal normalise's for every field. designs/bail, the first chase
// with an art field, baked to a buildHash its golden did not hold: normalise
// gave art null and pipeline left it out. This holds them equal over every
// chase in the repo, and each preset over the same start.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normaliseParams, readChaseSource } from "@hackbuild/chase";
import { defaultsOf, resolveParams } from "@hackbuild/pipeline";
import { ROOT } from "./hbf.js";

/** Every chase.ts under reference/<area>/<id>/ and designs/<id>/, sorted. */
function chaseFiles(): string[] {
  const out: string[] = [];
  const dirs = (p: string): string[] => readdirSync(path.join(ROOT, p), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(p, d.name));
  for (const area of dirs("reference")) for (const id of dirs(area)) out.push(path.join(id, "chase.ts"));
  for (const id of dirs("designs")) out.push(path.join(id, "chase.ts"));
  return out.filter((rel) => existsSync(path.join(ROOT, rel))).sort();
}

describe("pipeline defaults equal chase normalise defaults", () => {
  const files = chaseFiles();

  it("finds the chases", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it.each(files)("%s", (rel) => {
    const { chase } = readChaseSource(readFileSync(path.join(ROOT, rel), "utf8"), rel);
    const page = normaliseParams(chase, undefined).params;
    expect(defaultsOf(chase)).toEqual(page);
    expect(resolveParams(chase, page, undefined)).toEqual(resolveParams(chase, undefined, undefined));
  });
});
