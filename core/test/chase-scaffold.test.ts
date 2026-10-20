// chase.scaffold (M10-T05 step 1) through the CLI. Every scaffold runs in a
// throwaway git repository under .hbf/ (gitignored), inside the workspace
// so references and the build sandbox resolve, never in the checkout the
// test runs in; afterAll deletes the repositories and the designs in them.
// The pair-copy golden is read from reference/keys/flex-pair/expected/
// build.json here, independent of the command.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { readChaseSource } from "@hackbuild/chase";
import type { CommandResult } from "@hackbuild/spec";
import { main } from "../src/main.js";
import { ROOT } from "./hbf.js";

const made: string[] = [];
const git = (cwd: string, ...args: string[]): string => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/** An empty git repository with one commit on main. */
function repo(): string {
  mkdirSync(path.join(ROOT, ".hbf"), { recursive: true });
  const top = mkdtempSync(path.join(ROOT, ".hbf", "scaffold-test-"));
  made.push(top);
  git(top, "init", "-q", "-b", "main");
  git(top, "-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "core.hooksPath=/dev/null", "commit", "-q", "--allow-empty", "-m", "init");
  return top;
}

async function run(cwd: string, ...argv: string[]): Promise<{ code: number; r: CommandResult<Record<string, unknown>> }> {
  let out = "";
  const code = await main([...argv, "--json"], cwd, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; } });
  return { code, r: JSON.parse(out) as CommandResult<Record<string, unknown>> };
}

afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

describe("chase.scaffold (M10-T05)", () => {
  const here = git(ROOT, "rev-parse", "HEAD");

  it("--kind composer --name scratch-pad exits 0, stages three files on hbf/scratch-pad, validates with 0 errors and builds", async () => {
    const top = repo();
    const { code, r } = await run(top, "chase.scaffold", "--kind", "composer", "--name", "scratch-pad");
    expect(code, JSON.stringify(r.errors)).toBe(0);
    const files = ["designs/scratch-pad/bench.ts", "designs/scratch-pad/build.ts", "designs/scratch-pad/chase.ts"];
    expect((r.result as { files: string[] }).files).toEqual(files);
    expect(git(top, "symbolic-ref", "--short", "HEAD")).toBe("hbf/scratch-pad");
    expect(git(top, "rev-list", "--count", "HEAD")).toBe("1");
    expect(git(top, "diff", "--cached", "--name-only").split("\n")).toEqual(files);
    const v = await run(top, "chase.validate", "designs/scratch-pad");
    expect(v.code, JSON.stringify(v.r.errors)).toBe(0);
    expect(v.r.errors).toEqual([]);
    const b = await run(top, "part.build", "designs/scratch-pad");
    expect(b.code, JSON.stringify(b.r.errors)).toBe(0);
    expect(b.r.counts.fail).toBe(0);
    expect(git(ROOT, "rev-parse", "HEAD")).toBe(here);
  });

  it("--from reference:keys/flex-pair writes meta.derivedFrom.buildHash equal to the flex-pair golden", async () => {
    const top = repo();
    const golden = (JSON.parse(readFileSync(path.join(ROOT, "reference/keys/flex-pair/expected/build.json"), "utf8")) as { buildHash: string }).buildHash;
    const { code, r } = await run(top, "chase.scaffold", "--kind", "single", "--name", "pair-copy", "--from", "reference:keys/flex-pair");
    expect(code, JSON.stringify(r.errors)).toBe(0);
    const text = readFileSync(path.join(top, "designs/pair-copy/chase.ts"), "utf8");
    const { chase } = readChaseSource(text, "designs/pair-copy/chase.ts");
    expect(chase.meta.id).toBe("pair-copy");
    expect(chase.meta.derivedFrom).toEqual({ id: "keys-flex-pair", buildHash: golden });
    expect(text.startsWith("// designs/pair-copy/chase.ts\n")).toBe(true);
    for (const f of ["build.ts", "bench.ts"]) expect(readFileSync(path.join(top, "designs/pair-copy", f), "utf8").slice(1)).toBe(readFileSync(path.join(ROOT, "reference/keys/flex-pair", f), "utf8").replace("// reference/keys/flex-pair/", "// designs/pair-copy/").slice(1));
    expect(git(top, "symbolic-ref", "--short", "HEAD")).toBe("hbf/pair-copy");
  });

  it("reference:<meta.id> names the same source", async () => {
    const top = repo();
    const { code, r } = await run(top, "chase.scaffold", "--kind", "single", "--name", "by-id", "--from", "reference:keys-flex-pair");
    expect(code, JSON.stringify(r.errors)).toBe(0);
    expect((r.result as { chaseTs: string }).chaseTs).toContain('derivedFrom: { id: "keys-flex-pair"');
  });

  it("an unknown from is E_REF with didYouMean; nothing is written and no branch made", async () => {
    const top = repo();
    const { code, r } = await run(top, "chase.scaffold", "--kind", "single", "--name", "nope", "--from", "reference:keys/flex-pear");
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/from" });
    expect(r.errors[0]!.didYouMean).toContain("reference:keys/flex-pair");
    expect(existsSync(path.join(top, "designs"))).toBe(false);
    expect(git(top, "branch", "--list", "hbf/*")).toBe("");
  });

  it("a kind other than the source's, a kind without a minimal scaffold, and a taken name are E_SCHEMA", async () => {
    const top = repo();
    const kind = await run(top, "chase.scaffold", "--kind", "composer", "--name", "k", "--from", "reference:keys/flex-pair");
    expect(kind.code).toBe(2);
    expect(kind.r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/kind", expected: "single" });
    const surface = await run(top, "chase.scaffold", "--kind", "surface", "--name", "s");
    expect(surface.code).toBe(2);
    expect(surface.r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/kind" });
    expect((await run(top, "chase.scaffold", "--kind", "single", "--name", "twice")).code).toBe(0);
    const again = await run(top, "chase.scaffold", "--kind", "single", "--name", "twice");
    expect(again.code).toBe(2);
    expect(again.r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/name" });
  });
});
