// The version 2 source rules (M04-T13, CHECKS.md 7.8). Inputs are files the
// rules did not write: the card's planted OGEE R15 line, the committed
// fail and pass fixtures, and tracked repo sources that hold no copy. A
// prose record skips the four code rules; the same text under a code or
// bench path still runs.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { planCard } from "../../../tools/test-support/plan-root.js";
import type { Finding, SourceFile } from "@hackbuild/spec";
import { check as fit04, readsParams } from "../src/defs/fit/CHK-FIT-04.js";
import { check as sht04, kerfLiterals } from "../src/defs/sht/CHK-SHT-04.js";
import { check as lnt03 } from "../src/defs/lnt/CHK-LNT-03.js";
import { check as lnt04, hiddenAssignments } from "../src/defs/lnt/CHK-LNT-04.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const read = (rel: string): SourceFile => ({ path: rel, text: readFileSync(path.join(ROOT, rel), "utf8") });
const fixture = (id: string, which: "pass" | "fail"): SourceFile =>
  (JSON.parse(readFileSync(path.join(ROOT, "packages", "checks", "test", "fixtures", id, `${which}.json`), "utf8")) as { source: SourceFile }).source;

type SourceCheck = { readonly run: (t: { level: "source"; source: SourceFile }, ctx: never) => readonly Finding[] | Promise<readonly Finding[]> };
const RULES: Readonly<Record<string, SourceCheck>> = {
  "CHK-FIT-04": fit04 as unknown as SourceCheck, "CHK-SHT-04": sht04 as unknown as SourceCheck,
  "CHK-LNT-03": lnt03 as unknown as SourceCheck, "CHK-LNT-04": lnt04 as unknown as SourceCheck,
};
const verdicts = async (id: string, source: SourceFile): Promise<string[]> =>
  (await RULES[id]!.run({ level: "source", source }, undefined as never)).map((f) => f.verdict);

/** The planted line of the M04-T13 card, acceptance 2. */
const PLANTED = (): string => {
  const card = planCard("M04-checks-project.md");
  return /A planted line `([^`]+)`/.exec(card)![1]!;
};

describe("prose records skip the four code rules", () => {
  for (const id of Object.keys(RULES)) {
    it(`${id}: the fail fixture fails at its own path and skips as a .md record`, async () => {
      const src = fixture(id, "fail");
      expect(await verdicts(id, src)).toEqual(["fail"]);
      const md = await RULES[id]!.run({ level: "source", source: { ...src, path: "notes/record.md" } }, undefined as never);
      expect(md.map((f) => f.verdict)).toEqual(["skip"]);
      expect(md[0]!.measured).toBe("not run");
      expect(md[0]!.constraint).toMatch(/prose record/);
      expect(await verdicts(id, fixture(id, "pass"))).toEqual(["pass"]);
    });
  }

  it("docs/plan/PROFILE.md quotes OGEE16 cutfiles.py kerf as coupon evidence and skips CHK-SHT-04", async () => {
    const src = read("docs/plan/PROFILE.md");
    expect(src.text).toMatch(/`KERF = \d/);
    expect(await verdicts("CHK-SHT-04", src)).toEqual(["skip"]);
  });
});

describe("CHK-FIT-04 version 2: a params source is a params file, load_params, an imported P or PARAMS", () => {
  it("a chase params identifier is not a params source", () => {
    const sandbox = read("core/src/sandbox.ts");
    expect(sandbox.text).toMatch(/\bparams\b/);
    expect(readsParams(sandbox.text)).toBe(false);
  });

  it("each form the origin reads is one", () => {
    expect(readsParams("from kin import P\n")).toBe(true);
    expect(readsParams("include <params.scad>\n")).toBe(true);
    expect(readsParams("P = kin.load_params(src)\n")).toBe(true);
    expect(readsParams("const fit = PARAMS.FIT_SLIDE;\n")).toBe(true);
  });

  it("an upper-case constant beside a chase params object passes; beside params.scad it fails", async () => {
    const body = "const SEGMENTS = 48;\nexport function build(params) { return params.w * SEGMENTS; }\n";
    expect(await verdicts("CHK-FIT-04", { path: "build.ts", text: body })).toEqual(["pass"]);
    expect(await verdicts("CHK-FIT-04", { path: "audit.scad", text: `include <params.scad>\nFIT_SLIDE = 0.55;\n` })).toEqual(["fail"]);
  });

  it("the DERRICK exporter reads its floor from snap_check.py, so it imports P and holds no copy", async () => {
    const src = read("tools/py/derrick/export_bodies.py");
    expect(readsParams(src.text)).toBe(true);
    expect(await verdicts("CHK-FIT-04", src)).toEqual(["pass"]);
  });
});

describe("CHK-LNT-04 version 2: a hidden assignment is code shaped", () => {
  it("the card's planted line fails, and its fixed form on two lines passes", () => {
    const planted = PLANTED();
    expect(planted).toMatch(/DRIVE_Y/);
    expect(hiddenAssignments("drive.scad", `${planted}\n`)).toEqual([1]);
    expect(hiddenAssignments("drive.scad", planted.replace(/\s*(\/\/.*)$/, "\n$1").replace(/(drive lugs) /, "$1\n"))).toEqual([]);
  });

  it("a comment explaining the line in words passes: packages/board/seed/step2mesh.mjs", async () => {
    const src = read("packages/board/seed/step2mesh.mjs");
    expect(src.text).toMatch(/= p\[i \+ 2\]; \/\/ world y = step z/);
    expect(hiddenAssignments(src.path, src.text)).toEqual([]);
    expect(await verdicts("CHK-LNT-04", src)).toEqual(["pass"]);
  });

  it("one value to the end of the line, before another comment, or ending in a semicolon is hidden", () => {
    expect(hiddenAssignments("a.py", "a = 1  # b = 2\n")).toEqual([1]);
    expect(hiddenAssignments("a.js", "a = 1; // b = 2 // was 3\n")).toEqual([1]);
    expect(hiddenAssignments("a.js", "a = 1; /* b = a + 1; */\n")).toEqual([1]);
    expect(hiddenAssignments("a.js", "a = 1; // b = mm per cell, rows run up\n")).toEqual([]);
    expect(hiddenAssignments("a.js", "a = 1; // b == 2\n")).toEqual([]);
  });
});

describe("CHK-SHT-04 on code", () => {
  it("the check's own source states no kerf value", async () => {
    expect(await verdicts("CHK-SHT-04", read("packages/checks/src/defs/sht/CHK-SHT-04.ts"))).toEqual(["pass"]);
  });
  // The cases sit in the fixture, as written here they would be the copies the audit fails this file on.
  const cases = (JSON.parse(readFileSync(path.join(ROOT, "packages", "checks", "test", "fixtures", "CHK-SHT-04", "literals.json"), "utf8")) as
    { cases: { text: string; literals: string[] }[] }).cases;
  it("a number scaling a named quantity derives the kerf; a bare number is a copy (2.0.1)", () => {
    expect(cases.length).toBeGreaterThan(0);
    for (const c of cases) expect(kerfLiterals(c.text), c.text).toEqual(c.literals);
  });
  it("CHK-SHT-11's source derives its kerf from the burn and passes", async () => {
    expect(await verdicts("CHK-SHT-04", read("packages/checks/src/defs/sht/CHK-SHT-11.ts"))).toEqual(["pass"]);
  });
});
