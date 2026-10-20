// The derived schemas (M10-T02 steps 1 and 3): the params schema is a
// function of the chase's ParamField declarations, JSON Schema comes from
// the same value, the document schema is strict where spec/chase.ts is,
// and CHASE_PARAM_RULES hold at runtime with both pointers on an id clash.

import { describe, expect, it } from "vitest";
import {
  chaseDocSchema, normaliseParams, onStep, paramRuleErrors, paramsErrors, paramsJsonSchema, shapeErrors, validateChase,
} from "@hackbuild/chase";
import type { Chase, ParamField, ParamGroup } from "@hackbuild/spec";
import { flexPair } from "./helpers.js";

const defaults = (c: Chase): Record<string, unknown> => normaliseParams(c, {}).params;
const paths = (e: readonly { path?: string }[]): (string | undefined)[] => e.map((x) => x.path);

describe("params schema derived from the declarations", () => {
  const c = flexPair();
  const d = defaults(c);
  it("accepts the defaults", () => {
    expect(d).toEqual({ W: 60, H: 30, r: 4, keys: [{ x: 0, d: 10, cone: 4, gap: 1.84 }], w: 1.4, pads: "clip" });
    expect(paramsErrors(c, d)).toEqual([]);
  });
  it.each([
    ["NaN", { W: Number.NaN }, "/W"],
    ["Infinity", { W: Number.POSITIVE_INFINITY }, "/W"],
    ["a string in a number", { W: "60" }, "/W"],
    ["above the range", { W: 91 }, "/W"],
    ["off the step", { keys: [{ x: 0, d: 10, cone: 4, gap: 1.85 }] }, "/keys/0/gap"],
    ["an enum value outside the options", { pads: "solder" }, "/pads"],
    ["a list longer than max", { keys: [{ x: 0, d: 10, cone: 4, gap: 1.84 }, { x: 1, d: 10, cone: 4, gap: 1.84 }, { x: 2, d: 10, cone: 4, gap: 1.84 }] }, "/keys"],
    ["a list item with an unknown key", { keys: [{ x: 0, d: 10, cone: 4, gap: 1.84, z: 1 }] }, "/keys/0/z"],
    ["a derived field as an input", { T: 3 }, "/T"],
    ["an undeclared key", { extra: 1 }, "/extra"],
  ])("refuses %s with E_SCHEMA at its pointer", (_what, patch, at) => {
    const e = paramsErrors(c, { ...d, ...patch });
    expect(e.map((x) => x.code)).toEqual(["E_SCHEMA"]);
    expect(e[0]!.path).toBe(at);
  });
  it("derives JSON Schema with the ranges, counts and options, and no derived field", () => {
    const j = paramsJsonSchema(c) as { properties: Record<string, Record<string, unknown>>; required: string[]; additionalProperties: boolean };
    expect(Object.keys(j.properties).sort()).toEqual(["H", "W", "keys", "pads", "r", "w"]);
    expect(j.additionalProperties).toBe(false);
    expect([j.properties["W"]!["minimum"], j.properties["W"]!["maximum"]]).toEqual([40, 90]);
    expect([j.properties["keys"]!["minItems"], j.properties["keys"]!["maxItems"]]).toEqual([1, 2]);
    expect(j.properties["pads"]!["enum"]).toEqual(["clip", "cup"]);
  });
  it("follows a chase edit with no hand-written schema", () => {
    const g = c.params[0]!;
    const W = g.fields[0] as Extract<ParamField, { type: "mm" }>;
    const edited: Chase = { ...c, params: [{ ...g, fields: [{ ...W, range: [40, 120] }, ...g.fields.slice(1)] }, ...c.params.slice(1)] };
    expect(paramsErrors(c, { ...d, W: 100 })).toHaveLength(1);
    expect(paramsErrors(edited, { ...d, W: 100 })).toEqual([]);
    expect((paramsJsonSchema(edited) as { properties: Record<string, Record<string, unknown>> }).properties["W"]!["maximum"]).toBe(120);
  });
  it("lands a decimal step without float noise", () => {
    expect(onStep(1.84, 0.8, 0.02)).toBe(true);
    expect(onStep(4, 2.32, 0.24)).toBe(true);
    expect(onStep(1.85, 0.8, 0.02)).toBe(false);
  });
});

describe("the chase document schema", () => {
  const c = flexPair();
  it("accepts the flex-pair chase", () => {
    expect(shapeErrors(c)).toEqual([]);
  });
  it("refuses a checks field with E_SCHEMA naming D-173", () => {
    const e = shapeErrors({ ...c, checks: ["CHK-KEY-01"] });
    expect(e.map((x) => [x.code, x.path])).toEqual([["E_SCHEMA", "/checks"]]);
    expect(e[0]!.hint).toContain("D-173");
  });
  it("refuses layout on the chase, naming D-174", () => {
    const e = shapeErrors({ ...c, rail: [] });
    expect(e.map((x) => [x.code, x.path])).toEqual([["E_SCHEMA", "/rail"]]);
    expect(e[0]!.hint).toContain("D-174");
  });
  it("refuses an unknown key on a field and a schema 1 version", () => {
    const g = c.params[0]!;
    const bad = { ...c, meta: { ...c.meta, chase: 1 }, params: [{ ...g, fields: [{ ...g.fields[0]!, gated: true }, ...g.fields.slice(1)] }, ...c.params.slice(1)] };
    expect(paths(shapeErrors(bad)).sort()).toEqual(["/meta/chase", "/params/0/fields/0/gated"]);
  });
  it("is strict at the top level", () => {
    expect(Object.keys(chaseDocSchema.shape)).toContain("waive");
  });
});

describe("CHASE_PARAM_RULES", () => {
  const base = flexPair();
  const withGroups = (groups: readonly ParamGroup[]): Chase => ({ ...base, presets: [], params: groups });
  it("names both pointers when a field id repeats across groups", () => {
    const [pad, keys, wire] = base.params as [ParamGroup, ParamGroup, ParamGroup];
    const dup = withGroups([pad, keys, { ...wire, fields: [...wire.fields, { id: "W", type: "mm", label: "again", range: [0, 1], default: 0 }] }]);
    const e = paramRuleErrors(dup);
    expect(e.map((x) => [x.code, x.path, x.record])).toEqual([["E_SCHEMA", "/params/2/fields/2/id", "chase-param/field-id-unique"]]);
    expect(e[0]!.expected).toContain("/params/0/fields/0");
    expect(e[0]!.hint).toContain("/params/0/fields/0");
    expect(e[0]!.hint).toContain("/params/2/fields/2");
  });
  it("holds ids unique inside a list item and allows an item id equal to an outer id", () => {
    const [pad, keys, wire] = base.params as [ParamGroup, ParamGroup, ParamGroup];
    const list = keys.fields[0] as Extract<ParamField, { type: "list" }>;
    const item = [...list.item, { id: "W", type: "mm" as const, label: "w", range: [0, 1] as const, default: 0 }];
    expect(paramRuleErrors(withGroups([pad, { ...keys, fields: [{ ...list, item }] }, wire]))).toEqual([]);
    const clash = [...list.item, { id: "gap", type: "mm" as const, label: "again", range: [0, 3] as const, default: 1 }];
    expect(paths(paramRuleErrors(withGroups([pad, { ...keys, fields: [{ ...list, item: clash }] }, wire])))).toEqual(["/params/1/fields/0/item/4/id"]);
  });
  it("refuses an enum default outside its options, a default off its range and off its step", () => {
    const [pad, keys, wire] = base.params as [ParamGroup, ParamGroup, ParamGroup];
    const W = pad.fields[0] as Extract<ParamField, { type: "mm" }>;
    const pads = wire.fields[1] as Extract<ParamField, { type: "enum" }>;
    const bad = withGroups([
      { ...pad, fields: [{ ...W, default: 60.5 }, { ...W, id: "W2", default: 200 }] },
      keys,
      { ...wire, fields: [wire.fields[0]!, { ...pads, default: "solder" }] },
    ]);
    expect(paramRuleErrors(bad).map((x) => [x.path, x.record])).toEqual([
      ["/params/0/fields/0/default", "chase-param/default-range"],
      ["/params/0/fields/1/default", "chase-param/default-range"],
      ["/params/2/fields/1/default", "chase-param/enum-default"],
    ]);
  });
  it("refuses a showWhen, preset key or fold that names no field, with didYouMean", () => {
    const [pad, keys, wire] = base.params as [ParamGroup, ParamGroup, ParamGroup];
    const bad: Chase = {
      ...base,
      params: [{ ...pad, showWhen: { field: "pdas", equals: "clip" }, fold: { label: "more", fields: ["rr"] } }, keys, wire],
      presets: [{ id: "p", label: "p", params: { Wd: 50 } }],
    };
    const e = paramRuleErrors(bad);
    expect(e.map((x) => [x.code, x.path, x.didYouMean?.[0]])).toEqual([
      ["E_REF", "/params/0/fold/fields/0", "r"],
      ["E_REF", "/params/0/showWhen", "pads"],
      ["E_REF", "/presets/0/params/Wd", "W"],
    ]);
  });
  it("refuses verdict bands out of order", () => {
    const [pad, keys, wire] = base.params as [ParamGroup, ParamGroup, ParamGroup];
    const T = pad.fields[3] as Extract<ParamField, { type: "derived" }>;
    const bad = withGroups([{ ...pad, fields: [...pad.fields.slice(0, 3), { ...T, verdict: [{ below: 2, word: "thin" }, { below: 1, word: "thick" }] }] }, keys, wire]);
    expect(paramRuleErrors(bad).map((x) => [x.path, x.record])).toEqual([["/params/0/fields/3/verdict/1/below", "chase-param/readout"]]);
  });
  it("validateChase refuses a build module outside the design directory", () => {
    expect(paths(validateChase({ ...base, build: { module: "../x.ts", fn: "build" } }))).toEqual(["/build/module"]);
  });
});
