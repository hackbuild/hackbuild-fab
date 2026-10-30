// chase.bake (M10-T07 step 2, D-129) through the CLI. Every bake writes to
// a throwaway --out root, and every generated design sits in a copy under
// .hbf/ (gitignored), so the checkout keeps its files. The flex-pair hash
// is checked against `shasum -a 256` of the file and against the M09 baker
// run on the committed reference/keys/flex-pair/bake.json in its own
// process. The generated manifest is checked against the committed
// flex-pair and access-switch bake.json files; a generated design is a
// copy of the access switch, since skeleton-kinds.ts loads only in the
// flex-pair reference.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { CommandResult, Hash } from "@hackbuild/spec";
import { manifestFor, packageWithUi, UI_ENTRY } from "../../tools/bake/from-chase.js";
import { runChaseBake } from "../src/commands/chase-bake.js";
import type { CoreCtx } from "../src/ctx.js";
import { json, REF, ROOT } from "./hbf.js";

type Baked = { file: string; bytes: number; hash: string };

const made: string[] = [];
afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

/** A fresh directory under .hbf/ in the workspace. */
function scratch(): string {
  mkdirSync(path.join(ROOT, ".hbf"), { recursive: true });
  const d = mkdtempSync(path.join(ROOT, ".hbf", "bake-test-"));
  made.push(d);
  return d;
}

const SWITCH = "reference/keys/access-switch";

/** The access switch's chase, build closure and bench in <scratch>/access-switch, without its bake.json, entry or page build. */
function switchCopy(): string {
  const dir = path.join(scratch(), "access-switch");
  mkdirSync(dir);
  for (const f of ["chase.ts", "build.ts", "bench.ts", "claim.ts", "jack.ts"]) cpSync(path.join(ROOT, SWITCH, f), path.join(dir, f));
  return dir;
}

const bake = (target: string, out: string, ...more: string[]): Promise<{ code: number; r: CommandResult<Record<string, unknown>> }> =>
  json("chase.bake", target, "--out", out, ...more);

const shasum = (file: string): string => execFileSync("shasum", ["-a", "256", file], { encoding: "utf8" }).split(" ")[0]!;

const committed = readFileSync(path.join(ROOT, SWITCH, "bake.json"), "utf8");

describe("chase.bake (M10-T07 step 2)", () => {
  it("bakes the flex pair: sha256 equals shasum of the file and the M09 baker on the committed manifest; two cold runs agree", async () => {
    const before = ["bake.json", "bench.entry.ts", "page-build.ts"].map((f) => readFileSync(path.join(ROOT, REF, f), "utf8"));
    const a = scratch();
    const { code, r } = await bake(REF, a);
    expect(code, JSON.stringify(r.errors)).toBe(0);
    const res = r.result as Baked;
    const file = path.join(a, "bench", "flex-pair.html");
    expect(res.file).toBe(path.relative(ROOT, file).split(path.sep).join("/"));
    expect(res.hash).toBe(shasum(file));
    expect(res.bytes).toBe(statSync(file).size);
    expect(res.bytes).toBeLessThanOrEqual(16777216);

    const m09 = scratch();
    const line = execFileSync(process.execPath, [path.join(ROOT, "tools/bake/bake.mjs"), path.join(ROOT, REF, "bake.json"), "--out-root", m09], { cwd: ROOT, encoding: "utf8" });
    expect(res.hash).toBe(/sha256 ([0-9a-f]{64})/.exec(line)?.[1]);

    const again = await bake(REF, scratch());
    expect((again.r.result as Baked).hash).toBe(res.hash);
    expect(["bake.json", "bench.entry.ts", "page-build.ts"].map((f) => readFileSync(path.join(ROOT, REF, f), "utf8"))).toEqual(before);
  }, 180_000);

  it("generates the committed flex-pair bake.json byte for byte from its chase directory", () => {
    expect(`${JSON.stringify(manifestFor(path.join(ROOT, REF)), null, 2)}\n`).toBe(readFileSync(path.join(ROOT, REF, "bake.json"), "utf8"));
  });

  it("writes bake.json, the entry and the page build into a chase directory that has none, then bakes it", async () => {
    const dir = switchCopy();
    const out = scratch();
    const { code, r } = await bake(dir, out);
    expect(code, JSON.stringify(r.errors)).toBe(0);
    // The committed access-switch manifest differs only in its hand-set title.
    expect(JSON.parse(readFileSync(path.join(dir, "bake.json"), "utf8"))).toEqual({ ...JSON.parse(committed), title: "access-switch" });
    // The shell comes in by the package export designs/blocks uses, never a path into packages/ (tiers).
    const entry = readFileSync(path.join(dir, "bench.entry.ts"), "utf8");
    expect(entry).toContain(`from "@hackbuild/bench/entry";`);
    expect(entry).not.toMatch(/from "\.[^"]*packages\//);
    const pj = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")) as Record<string, unknown>;
    const blocks = JSON.parse(readFileSync(path.join(ROOT, "designs/blocks/package.json"), "utf8")) as Record<string, Record<string, string>>;
    expect(pj).toMatchObject({ name: "@hackbuild/design-access-switch", private: true, type: "module", author: blocks["author"] });
    expect(pj["devDependencies"]).toEqual({ "@hackbuild/bench": blocks["devDependencies"]!["@hackbuild/bench"] });
    expect(readFileSync(path.join(dir, "page-build.ts"), "utf8")).toContain("createPageBuild({ chase, module, facts: pageFacts(facts) })");
    const res = r.result as Baked;
    expect(res.hash).toBe(shasum(path.join(out, "bench", "access-switch.html")));
  }, 180_000);

  it("adds the ui devDependency to an existing package.json, keeps the rest, and leaves one that has it", () => {
    expect(UI_ENTRY).toBe("@hackbuild/bench/entry");
    const had = { name: "@hackbuild/design-x", devDependencies: { "@hackbuild/profile": "0.0.0" }, dependencies: { "@hackbuild/geom": "0.0.0" } };
    const out = JSON.parse(packageWithUi("designs/x", JSON.stringify(had))!) as typeof had;
    expect(out.dependencies).toEqual(had.dependencies);
    expect(Object.keys(out.devDependencies)).toEqual(["@hackbuild/bench", "@hackbuild/profile"]);
    expect(packageWithUi("designs/blocks", readFileSync(path.join(ROOT, "designs/blocks/package.json"), "utf8"))).toBeNull();
  });

  it("refuses a page over its budget with E_KERNEL bake/budget and writes no page", async () => {
    const dir = switchCopy();
    writeFileSync(path.join(dir, "bake.json"), JSON.stringify({ ...JSON.parse(committed), budget: 1000 }));
    const out = scratch();
    const { code, r } = await bake(dir, out);
    expect(code).toBe(1);
    expect(r.errors[0]).toMatchObject({ code: "E_KERNEL", record: "bake/budget" });
    expect(r.errors[0]!.hint).toMatch(/legal at most 1000/);
    expect(existsSync(path.join(out, "bench", "access-switch.html"))).toBe(false);
  }, 180_000);

  it("refuses a page whose stylesheet loads a network url with E_KERNEL bake/off-file", async () => {
    const dir = switchCopy();
    writeFileSync(path.join(dir, "far.css"), "body{background:url(https://example.invalid/a.png)}\n");
    const m = JSON.parse(committed) as { css: { from: string }[] };
    writeFileSync(path.join(dir, "bake.json"), JSON.stringify({ ...m, css: [...m.css, { from: "./far.css" }] }));
    const { code, r } = await bake(dir, scratch());
    expect(code).toBe(1);
    expect(r.errors[0]).toMatchObject({ code: "E_KERNEL", record: "bake/off-file" });
    expect(r.errors[0]!.hint).toContain("https://example.invalid/a.png");
  }, 180_000);

  it("refuses mode draft on a design without draft.json with E_SCHEMA at /mode and writes nothing", async () => {
    const dir = switchCopy();
    const { code, r } = await bake(dir, scratch(), "--mode", "draft");
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_SCHEMA", path: "/mode" });
    expect(existsSync(path.join(dir, "bake.json"))).toBe(false);
  });

  it("kills the baker when the signal aborts mid bake and writes no page", async () => {
    const dir = switchCopy();
    const out = scratch();
    const t0 = Date.now();
    const signal = {
      get aborted(): boolean { return Date.now() - t0 > 300; },
      throwIfAborted(): void { if (this.aborted) throw new Error("cancelled"); },
    };
    const ctx = { cwd: ROOT, cli: { out }, signal, inputsHash: "0".repeat(64) as Hash } as unknown as CoreCtx;
    await expect(runChaseBake({ chase: dir }, ctx)).rejects.toThrow("cancelled");
    expect(existsSync(path.join(out, "bench", "access-switch.html"))).toBe(false);
  }, 60_000);
});
