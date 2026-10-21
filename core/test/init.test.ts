// hbf init (plan v9 2 and 6, R1-engine-23). From a temp folder outside the
// repository, hbf init stick --from collar writes ./stick with the copied
// chase, build and bench, a package.json pinning @hackbuild/kernel to this
// workspace and stick.html baked by chase.bake; the page's bytes and sha256
// are read back from disk and checked against shasum. chase.validate on
// the folder gives 0 errors, a second run on it is E_EXISTS, and a source
// with open chase.validate errors is refused with nothing written.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { readChaseSource } from "@hackbuild/chase";
import type { CommandResult } from "@hackbuild/spec";
import { makerPackage } from "../src/commands/init.js";
import { main } from "../src/main.js";
import { ROOT } from "./hbf.js";

const TMP = realpathSync(mkdtempSync(path.join(os.tmpdir(), "hbf-init-test-")));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

const shasum = (file: string): string => execFileSync("shasum", ["-a", "256", file], { encoding: "utf8" }).split(" ")[0]!;

/** Run the CLI in process from `cwd` with --json. */
async function at(cwd: string, ...argv: string[]): Promise<{ code: number; r: CommandResult<Record<string, unknown>> }> {
  let out = "";
  const code = await main([...argv, "--json"], cwd, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; } });
  return { code, r: JSON.parse(out) as CommandResult<Record<string, unknown>> };
}

type Inited = { dir: string; files: string[]; page: { file: string; bytes: number; hash: string } };

describe("hbf init (R1-engine-23)", () => {
  it("the temp folder sits outside the workspace", () => {
    expect(path.relative(ROOT, TMP).startsWith("..")).toBe(true);
  });

  it("pins @hackbuild/kernel and every imported @hackbuild package to this workspace", () => {
    const files = new Map([["build.ts", 'import { defineBuild } from "@hackbuild/spec";\nimport type { RasterMask } from "@hackbuild/mesh";\n']]);
    const pkg = JSON.parse(makerPackage("stick", files, ROOT)) as { name: string; dependencies: Record<string, string> };
    expect(pkg.name).toBe("stick");
    expect(Object.keys(pkg.dependencies)).toEqual(["@hackbuild/kernel", "@hackbuild/mesh", "@hackbuild/spec"]);
    expect(pkg.dependencies["@hackbuild/kernel"]).toBe(`file:${realpathSync(path.join(ROOT, "kernel")).split(path.sep).join("/")}`);
  });

  it("init stick --from collar writes the maker folder and a page whose sha256 is the one reported", async () => {
    const t0 = performance.now();
    const { code, r } = await at(TMP, "init", "stick", "--from", "collar");
    const ms = performance.now() - t0;
    expect(code, JSON.stringify(r.errors)).toBe(0);
    const res = r.result as unknown as Inited;
    const dir = path.join(TMP, "stick");
    expect(res.dir).toBe(dir.split(path.sep).join("/"));
    for (const f of ["chase.ts", "build.ts", "bench.ts", "package.json", "stick.html"]) expect(res.files).toContain(f);
    expect(readdirSync(dir).sort()).toEqual([...new Set(res.files.map((f) => f.split("/")[0]!))].sort());

    const file = path.join(dir, "stick.html");
    expect(res.page.file).toBe(file.split(path.sep).join("/"));
    expect(res.page.bytes, "bytes measured on disk").toBe(statSync(file).size);
    expect(res.page.bytes).toBeLessThanOrEqual(16_777_216);
    expect(res.page.hash).toBe(shasum(file));
    console.log(`hbf init: ${Math.round(ms)} ms wall (measured, in process), page ${res.page.bytes} bytes (measured)`);

    const chase = readChaseSource(readFileSync(path.join(dir, "chase.ts"), "utf8"), "stick/chase.ts").chase;
    expect(chase.meta.id).toBe("stick");
    // designs/collar has no expected/build.json golden, so chase.scaffold sets no derivedFrom either.
    expect(existsSync(path.join(ROOT, "designs", "collar", "expected", "build.json"))).toBe(false);
    expect(chase.meta.derivedFrom).toBeUndefined();
    // The copy differs from the source only in its path comment, as chase.scaffold retargets it.
    expect(readFileSync(path.join(dir, "build.ts"), "utf8")).toBe(readFileSync(path.join(ROOT, "designs", "collar", "build.ts"), "utf8").replace("// designs/collar/build.ts\n", "// stick/build.ts\n"));
    const pkg = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")) as { dependencies: Record<string, string> };
    expect(pkg.dependencies["@hackbuild/kernel"]).toMatch(/^file:\/.*\/kernel$/);
    expect(existsSync(path.join(dir, "bake.json")), "bake files stay in the staging copy").toBe(false);
    expect(readdirSync(path.join(ROOT, ".hbf", "init")).filter((d) => d.startsWith("stick-")), "staging copy removed").toEqual([]);
  }, 600_000);

  it("chase.validate stick from the temp folder shows 0 errors", async () => {
    const { code, r } = await at(TMP, "chase.validate", "stick");
    expect(r.errors).toEqual([]);
    expect(code).toBe(0);
  }, 120_000);

  it("a second run on the same folder exits 2 with E_EXISTS and writes nothing", async () => {
    const before = readFileSync(path.join(TMP, "stick", "stick.html"));
    const { code, r } = await at(TMP, "init", "stick", "--from", "collar");
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_EXISTS", path: "/name" });
    expect(readFileSync(path.join(TMP, "stick", "stick.html")).equals(before)).toBe(true);
  });

  it("a source with open chase.validate errors is refused, exit 2, nothing written", async () => {
    // A copy of collar whose diameter default sits outside its own range.
    const src = path.join(TMP, "designs", "broken");
    mkdirSync(src, { recursive: true });
    const text = readFileSync(path.join(ROOT, "designs", "collar", "chase.ts"), "utf8");
    const bad = text.replace('range: [20, 80], step: 0.5, default: 44', 'range: [20, 80], step: 0.5, default: 99');
    expect(bad).not.toBe(text);
    writeFileSync(path.join(src, "chase.ts"), bad);
    copyFileSync(path.join(ROOT, "designs", "collar", "build.ts"), path.join(src, "build.ts"));
    const { code, r } = await at(TMP, "init", "fixed", "--from", "design:broken");
    expect(r.errors.length).toBeGreaterThan(0);
    // blank.dia is the first field of the first group.
    expect(r.errors.map((e) => e.path)).toContain("/params/0/fields/0/default");
    expect(code).toBe(2);
    expect(existsSync(path.join(TMP, "fixed"))).toBe(false);
  }, 120_000);
});
