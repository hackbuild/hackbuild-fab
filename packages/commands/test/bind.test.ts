// bind() and the generated def index (R1-engine-01). The independent
// sources are COMMAND_NAMES in spec and the def files on disk: a run body
// deleted from a host's runs, a run body with no spec, and an index that
// omits a def file each fail here.

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMMAND_NAMES, type CommandName } from "@hackbuild/spec";
import { bind, CLI_FORM, SPECS, type Runs } from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..");
const defsDir = path.join(root, "packages", "commands", "src", "defs");
const gen = path.join(root, "tools", "gen-commands.mjs");
const defFiles = readdirSync(defsDir).filter((f) => f.endsWith(".ts") && f !== "index.ts").sort();

const host = { programIds: ["ogee.checker", "slug.vend"] };
const stub = (async () => ({ verdict: "skip", errors: [], findings: [] })) as never;
const runsFor = (names: readonly string[]): Runs => Object.fromEntries(names.map((n) => [n, stub])) as Runs;
const allRuns = (): Runs => runsFor(SPECS.map((s) => s.name));

function kernelError(f: () => unknown): { code: string; got: string } {
  try {
    f();
  } catch (e) {
    const hbf = (e as { hbf?: { code: string; got: string } }).hbf;
    if (hbf !== undefined) return hbf;
    throw e;
  }
  throw new Error("bind did not throw");
}

const gentool = (args: readonly string[]) => spawnSync(process.execPath, [gen, ...args], { encoding: "utf8" });

describe("command specs", () => {
  it("one spec per def file, each a distinct name COMMAND_NAMES lists", () => {
    expect(SPECS.length).toBe(defFiles.length);
    const names = SPECS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(COMMAND_NAMES as readonly string[]).toContain(n);
    for (const f of defFiles) expect(names).toContain(f.replace(/\.ts$/, "").replace("-", "."));
  });

  it("the CLI form has one row per spec, keyed by name", () => {
    expect(Object.keys(CLI_FORM).sort()).toEqual(SPECS.map((s) => s.name).sort());
  });

  it("no spec source imports a node built-in or carries a run body", () => {
    const srcDir = path.join(root, "packages", "commands", "src");
    const files = [...readdirSync(srcDir).filter((f) => f.endsWith(".ts")).map((f) => path.join(srcDir, f)), ...defFiles.map((f) => path.join(defsDir, f))];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/node:/);
      expect(text, f).not.toMatch(/^\s+run[:(]/m);
    }
  });
});

describe("bind", () => {
  it("joins every spec to its run body in COMMAND_NAMES order, with no cli field and host lists resolved", async () => {
    const defs = bind(SPECS, allRuns(), host);
    const order = (n: string): number => (COMMAND_NAMES as readonly string[]).indexOf(n);
    expect(defs.map((d) => d.name)).toEqual(SPECS.map((s) => s.name).sort((a, b) => order(a) - order(b)));
    for (const d of defs) {
      expect(typeof d.run).toBe("function");
      expect("cli" in d).toBe(false);
      expect(typeof d.input["~standard"].validate).toBe("function");
    }
    const motion = defs.find((d) => d.name === "motion.run");
    expect(motion).toBeDefined();
    const r = await motion!.input["~standard"].validate({ program: "slug.vend", args: { k: 3 } });
    expect(r.issues).toBeUndefined();
  });

  it("a spec whose run body was deleted stops the load with E_KERNEL naming it", () => {
    const names = SPECS.map((s) => s.name).filter((n) => n !== "fits.table");
    const e = kernelError(() => bind(SPECS, runsFor(names), host));
    expect(e.code).toBe("E_KERNEL");
    expect(e.got).toBe("fits.table has a spec and no run body");
  });

  it("a run body with no spec stops the load with E_KERNEL naming it", () => {
    // The first command name with no def file yet; the test fails once every command has one.
    const missing = COMMAND_NAMES.find((n) => !SPECS.some((s) => s.name === n)) as CommandName;
    expect(missing).toBeDefined();
    const e = kernelError(() => bind(SPECS, { ...allRuns(), [missing]: stub }, host));
    expect(e.code).toBe("E_KERNEL");
    expect(e.got).toBe(`${missing} has a run body and no spec`);
  });

  it("a repeated spec stops the load with E_KERNEL", () => {
    const e = kernelError(() => bind([...SPECS, SPECS[0]!], allRuns(), host));
    expect(e.code).toBe("E_KERNEL");
    expect(e.got).toBe(`${SPECS[0]!.name} has two specs`);
  });
});

describe("tools/gen-commands.mjs", () => {
  it("--check passes on the committed index", () => {
    const r = gentool(["--check"]);
    expect(r.stdout + r.stderr).toContain("gen-commands: ok");
    expect(r.status).toBe(0);
  });

  it("--check fails when the index omits a def file, and a rerun restores it", () => {
    const tmp = mkdtempSync(path.join(tmpdir(), "hbf-commands-"));
    try {
      cpSync(defsDir, tmp, { recursive: true });
      const index = path.join(tmp, "index.ts");
      const full = readFileSync(index, "utf8");
      const omitted = full.split("\n").filter((l) => !l.includes("fitsTable")).join("\n");
      expect(omitted).not.toBe(full);
      writeFileSync(index, omitted);
      const bad = gentool(["--check", `--dir=${tmp}`]);
      expect(bad.status).toBe(1);
      expect(bad.stdout).toContain("differs from the def files");
      expect(gentool([`--dir=${tmp}`]).status).toBe(0);
      expect(readFileSync(index, "utf8")).toBe(full);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
