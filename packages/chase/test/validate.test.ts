// chase.validate over values (M10-T04 steps 1 to 3): the bench read as
// data, the kind rules and the build function. The fixtures under
// fixtures/rail-ends-in-check and fixtures/surface-no-stack are the ones
// the CLI acceptance runs (core/test/chase-validate.test.ts).

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Chase } from "@hackbuild/spec";
import { buildExports, buildFnErrors, kindRuleErrors, readBenchSource, readChaseSource, validateDocument } from "@hackbuild/chase";
import { ROOT, flexPair } from "./helpers.js";

const FIX = path.join(ROOT, "packages", "chase", "test", "fixtures");
const text = (...p: string[]): string => readFileSync(path.join(...p), "utf8");
const benchOf = (dir: string): unknown => readBenchSource(text(dir, "bench.ts"), "bench.ts").bench;
const flexBench = (): Record<string, unknown> => benchOf(path.join(ROOT, "reference", "keys", "flex-pair")) as Record<string, unknown>;

describe("the bench source reader", () => {
  it("reads the flex pair bench.ts as data, its rail ending on print", () => {
    const b = flexBench();
    const rail = b["rail"] as { step: string }[];
    expect(rail.map((s) => s.step)).toEqual(["pad", "keys", "wire", "print"]);
    expect((b["views"] as { drive?: unknown }).drive).toBeDefined();
  });
  it("refuses a bench that computes, with record bench-source/<rule>", () => {
    const src = 'import { defineBench } from "@hackbuild/spec";\nimport { chase } from "./chase";\nexport const bench = defineBench(chase, { shell: pick() });\n';
    expect(() => readBenchSource(src, "bench.ts")).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ code: "E_SCHEMA", path: "/shell", record: "bench-source/no-identifier" }) }));
  });
  it("refuses a bench that imports a value from anywhere but the chase beside it", () => {
    const src = 'import { defineBench } from "@hackbuild/spec";\nimport { chase } from "../other/chase";\nexport const bench = defineBench(chase, {});\n';
    expect(() => readBenchSource(src, "bench.ts")).toThrow(expect.objectContaining({ hbf: expect.objectContaining({ record: "bench-source/imports" }) }));
  });
  it("leaves the chase reader as it was: a chase source with defineBench is refused", () => {
    expect(() => readChaseSource('import { defineBench } from "@hackbuild/spec";\nexport const chase = defineBench({});\n', "chase.ts")).toThrow();
  });
});

describe("kind rules", () => {
  const base = flexPair();
  const rules = (c: Chase, b?: unknown) => kindRuleErrors(c, b).map((e) => [e.code, e.path, e.record]);
  it("the flex pair and its bench break none", () => {
    expect(rules(base, flexBench())).toEqual([]);
  });
  it("a single or composer rail that ends on check is E_SCHEMA at /rail/<last>/step", () => {
    const b = benchOf(path.join(FIX, "rail-ends-in-check"));
    const c = readChaseSource(text(FIX, "rail-ends-in-check", "chase.ts"), "chase.ts").chase;
    expect(rules(c, b)).toEqual([["E_SCHEMA", "/rail/1/step", "chase-kind/rail-end"]]);
    expect(rules({ ...c, meta: { ...c.meta, kind: "composer" } }, b)).toEqual([["E_SCHEMA", "/rail/1/step", "chase-kind/rail-end"]]);
  });
  it("make ends a kit rail", () => {
    const b = flexBench();
    const rail = (b["rail"] as { step: string }[]).map((s, i, all) => (i === all.length - 1 ? { ...s, step: "make" } : s));
    expect(rules(base, { ...b, rail })).toEqual([]);
  });
  it("a surface with a rail is E_SCHEMA at /rail", () => {
    expect(rules({ ...base, meta: { ...base.meta, kind: "surface" } }, flexBench())).toEqual([["E_SCHEMA", "/rail", "chase-kind/surface-rail"]]);
  });
  it("a drive overlay without views.drive is E_SCHEMA at /views/drive", () => {
    const b = flexBench();
    const { drive: _d, ...views } = b["views"] as Record<string, unknown>;
    expect(rules(base, { ...b, views })).toEqual([["E_SCHEMA", "/views/drive", "chase-kind/drive-decl"]]);
  });
  it("a catalog without items is E_SCHEMA at /items", () => {
    const cat = { ...base, meta: { ...base.meta, kind: "catalog" as const } };
    expect(rules(cat)).toEqual([["E_SCHEMA", "/items", "chase-kind/catalog-items"]]);
    expect(rules({ ...cat, items: ["keys-flex-pair"] })).toEqual([]);
  });
});

describe("the build function", () => {
  it("reads the flex pair build.ts exports as text and finds build", () => {
    expect(buildExports(text(ROOT, "reference", "keys", "flex-pair", "build.ts"))).toContain("build");
    expect(buildFnErrors(flexPair(), text(ROOT, "reference", "keys", "flex-pair", "build.ts"))).toEqual([]);
  });
  it("an fn the module does not export is E_REF at /build/fn with didYouMean", () => {
    const c = { ...flexPair(), build: { module: "./build.ts", fn: "buidl" } };
    const e = buildFnErrors(c, "export function build() {}\nexport { a as helper };\n");
    expect(e.map((x) => [x.code, x.path, x.didYouMean])).toEqual([["E_REF", "/build/fn", ["build", "helper"]]]);
  });
  it("an absent module is E_REF at /build/module", () => {
    expect(buildFnErrors(flexPair(), undefined).map((x) => [x.code, x.path])).toEqual([["E_REF", "/build/module"]]);
  });
});

describe("validateDocument", () => {
  it("runs migration first: a schema 1 chase validates after 1-to-2 and reports the migration", () => {
    const v1 = JSON.parse(text(FIX, "v1", "_template.chase.json")) as unknown;
    const v = validateDocument({ chase: v1 });
    expect(v.migration?.from).toBe(1);
    expect(v.errors).toEqual([]);
  });
  it("stops before questions when the shape fails", () => {
    const v = validateDocument({ chase: { meta: {} } });
    expect(v.errors.length).toBeGreaterThan(0);
    expect(v.questions).toEqual([]);
    expect(v.chase).toBeNull();
  });
  it("returns no string array named errors, missing or questions (plan-deltas R76)", () => {
    const v = validateDocument({ chase: flexPair(), bench: flexBench() });
    for (const q of v.questions) expect(typeof q).toBe("object");
    for (const e of v.errors) expect(typeof e).toBe("object");
  });
});
