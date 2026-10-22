// Every chase starts with hbf init (R1-score-02). For each reference and
// design that holds a chase.ts, found by walking reference/ and designs/
// (legacy copies held out), chase.validate shows 0 errors and hbf init
// --from <its path> writes a maker folder outside the repository whose
// package.json carries the workspace's author line. The path form, the
// <area>/<id> form and the reference: form name the same source.
//
// KNOWN_NO_MATERIAL holds the chases that name a sheet material no profile
// row registers (D-149: a missing row is reported, never invented). Each
// fails chase.validate with E_REF chase-ref/material on that material and
// nothing else; a chase that newly fails, or one fixed and still listed,
// fails this file.

import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { CommandResult } from "@hackbuild/spec";
import { initFrom } from "../src/commands/init.js";
import { main } from "../src/main.js";
import { ROOT, json } from "./hbf.js";

const TMP = realpathSync(mkdtempSync(path.join(os.tmpdir(), "hbf-init-every-")));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

const SKIP_DIRS = new Set(["node_modules", "legacy", "expected", ".hbf"]);

/** Every folder under base holding a chase.ts, relative to ROOT, sorted. */
function chaseDirs(base: string): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    const abs = path.join(ROOT, rel);
    const names = readdirSync(abs);
    if (names.includes("chase.ts")) out.push(rel);
    for (const n of names) if (!SKIP_DIRS.has(n) && statSync(path.join(abs, n)).isDirectory()) walk(`${rel}/${n}`);
  };
  walk(base);
  return out.sort();
}

/** Chase folder to the unregistered material it names, waiting on an owner profile row. */
const KNOWN_NO_MATERIAL: Readonly<Record<string, string>> = {
  "reference/joints/balance-beam": "sheet15",
  "reference/joints/finger": "pom3",
  "reference/mechanisms/coanda-gate": "pom3",
  "reference/mechanisms/coincidence-and": "pom3",
  "reference/mechanisms/detent-latch": "pom3",
  "reference/mechanisms/differential-xor": "pom3",
  "reference/mechanisms/inhibit": "pom3",
  "reference/mechanisms/living-hinge": "pom3",
  "reference/mechanisms/membrane-valve": "pom3",
  "reference/mechanisms/ratchet-pawl": "pom3",
  "reference/mechanisms/shift-drum": "pom3",
  "reference/mechanisms/snap-flexure": "pom3",
  "reference/mechanisms/spur-pair": "pom3",
  "reference/mechanisms/teeter-not": "pom3",
  "reference/mechanisms/tesla-valve": "pom3",
  "reference/mechanisms/tumbler-coded-and": "pom3",
  "reference/mechanisms/wedge-or": "pom3",
  "reference/mechanisms/whiffletree": "pom3",
};

const CHASES = [...chaseDirs("reference"), ...chaseDirs("designs")];
const AUTHOR = (JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as { author: string }).author;

async function at(cwd: string, ...argv: string[]): Promise<{ code: number; r: CommandResult<Record<string, unknown>> }> {
  let out = "";
  const code = await main([...argv, "--json"], cwd, { out: (s) => { out += `${s}\n`; }, err: (s) => { out += `${s}\n`; } });
  return { code, r: JSON.parse(out) as CommandResult<Record<string, unknown>> };
}

describe("every chase starts with hbf init (R1-score-02)", () => {
  it("the walk finds the flex pair, the nested coupon and the designs", () => {
    for (const d of ["reference/keys/flex-pair", "reference/keys/access-switch/coupon"]) expect(CHASES).toContain(d);
    expect(CHASES.filter((d) => d.startsWith("designs/")).length).toBeGreaterThan(0);
  });

  it("init takes the path, area/id and reference: forms of one reference", () => {
    expect(initFrom("reference/keys/midi-pad")).toBe("reference:keys/midi-pad");
    expect(initFrom("./reference/keys/midi-pad/")).toBe("reference:keys/midi-pad");
    expect(initFrom("designs/stick")).toBe("design:stick");
    expect(initFrom("keys/midi-pad")).toBe("keys/midi-pad");
    expect(initFrom("reference:keys/midi-pad")).toBe("reference:keys/midi-pad");
  });

  it("every known no-material chase is still walked", () => {
    for (const d of Object.keys(KNOWN_NO_MATERIAL)) expect(CHASES).toContain(d);
  });

  for (const dir of CHASES.filter((d) => Object.hasOwn(KNOWN_NO_MATERIAL, d))) {
    it(`${dir}: chase.validate fails only E_REF chase-ref/material on ${KNOWN_NO_MATERIAL[dir]}`, async () => {
      const v = await json("chase.validate", dir);
      const errs = v.r.errors as readonly { code: string; record?: string; got?: unknown }[];
      expect(errs.length).toBeGreaterThan(0);
      for (const e of errs) expect({ code: e.code, record: e.record, got: e.got }).toEqual({ code: "E_REF", record: "chase-ref/material", got: KNOWN_NO_MATERIAL[dir] });
    }, 240_000);
  }

  for (const dir of CHASES.filter((d) => !Object.hasOwn(KNOWN_NO_MATERIAL, d))) {
    it(`${dir}: chase.validate 0 errors, init --from ${dir} writes the folder`, async () => {
      const v = await json("chase.validate", dir);
      expect(v.r.errors, JSON.stringify(v.r.errors)).toEqual([]);
      expect(v.code).toBe(0);

      const name = dir.replace(/\//g, "-");
      const { code, r } = await at(TMP, "init", name, "--from", dir);
      expect(r.errors, JSON.stringify(r.errors)).toEqual([]);
      expect(code).toBe(0);
      const res = r.result as unknown as { dir: string; files: string[]; page: { file: string; bytes: number } };
      expect(res.dir).toBe(path.join(TMP, name).split(path.sep).join("/"));
      expect(res.files).toContain("chase.ts");
      expect(res.page.bytes).toBe(statSync(res.page.file).size);
      const pkg = JSON.parse(readFileSync(path.join(res.dir, "package.json"), "utf8")) as { author?: string };
      expect(pkg.author).toBe(AUTHOR);
    }, 240_000);
  }
});
