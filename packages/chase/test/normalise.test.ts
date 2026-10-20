// Deep normalise (M10-T03 step 3): the snippet case of x/tsc/m10/snippet.ts
// gives {W: 60, keys: [{x: 3, gap: 1.44}], pads: "clip"}, drops /extra and
// replaces /W; defaults fill every depth, list counts clamp to min and max,
// and the report becomes W_NORMALISED warnings with pointers.

import { describe, expect, it } from "vitest";
import { normaliseParams, normalisedWarnings, paramsErrors, storedParams } from "@hackbuild/chase";
import type { Chase, ParamField } from "@hackbuild/spec";

/** The snippet's chase (x/tsc/m10/snippet.ts), with spec's required fields. */
const snippet: Chase = {
  meta: { id: "keys-flex-pair", kind: "single", name: "FLEX PAIR", version: 1, chase: 2, kernels: [], machines: ["ffc5p"], license: "CC-BY-SA-4.0" },
  materials: [],
  params: [
    { id: "pad", label: "pad", fields: [
      { id: "W", type: "mm", label: "width", range: [40, 90], step: 1, default: 60 },
      { id: "T", type: "derived", label: "thickness", fn: "padThickness", unit: "mm" },
    ] },
    { id: "keys", label: "keys", fields: [
      { id: "keys", type: "list", label: "keys", min: 1, max: 2, item: [
        { id: "x", type: "mm", label: "x", range: [-35, 35], default: 0 },
        { id: "gap", type: "mm", label: "travel", range: [0.8, 3.0], step: 0.02, default: 1.44, constraintDim: "contact.gap" },
      ] },
    ] },
    { id: "wire", label: "wire", fields: [
      { id: "pads", type: "enum", label: "leads", default: "clip", options: [{ value: "clip", label: "clip pads" }, { value: "cup", label: "wire cups" }] },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [],
  assertions: [],
};

describe("the snippet case", () => {
  const { params, report } = normaliseParams(snippet, { W: Number.NaN, keys: [{ x: 3 }], extra: 1 });
  it("gives the snippet's params", () => {
    expect(params).toEqual({ W: 60, keys: [{ x: 3, gap: 1.44 }], pads: "clip" });
  });
  it("drops /extra and replaces /W", () => {
    expect(report).toEqual({ dropped: ["/extra"], replaced: ["/W"], clamped: [] });
  });
  it("reports as W_NORMALISED warnings with the pointer", () => {
    expect(normalisedWarnings(report).map((w) => [w.code, w.param])).toEqual([["W_NORMALISED", "/extra"], ["W_NORMALISED", "/W"]]);
  });
  it("hands build.ts params the derived schema accepts", () => {
    expect(paramsErrors(snippet, params)).toEqual([]);
  });
});

describe("every depth", () => {
  it("fills a missing document with defaults and lists nothing", () => {
    const r = normaliseParams(snippet, undefined);
    expect(r.params).toEqual({ W: 60, keys: [{ x: 0, gap: 1.44 }], pads: "clip" });
    expect(r.report).toEqual({ dropped: [], replaced: [], clamped: [] });
  });
  it("clamps a list to max, fills an empty one to min, and normalises each item", () => {
    const four = normaliseParams(snippet, { keys: [{ x: 1 }, { x: "2", gap: Number.POSITIVE_INFINITY, z: 0 }, { x: 3 }, { x: 4 }] });
    expect(four.params["keys"]).toEqual([{ x: 1, gap: 1.44 }, { x: 0, gap: 1.44 }]);
    expect(four.report).toEqual({ dropped: ["/keys/1/z"], replaced: ["/keys/1/x", "/keys/1/gap"], clamped: ["/keys"] });
    const none = normaliseParams(snippet, { keys: [] });
    expect(none.params["keys"]).toEqual([{ x: 0, gap: 1.44 }]);
    expect(none.report.clamped).toEqual(["/keys"]);
  });
  it("replaces a list that is not an array and an item that is not an object", () => {
    const r = normaliseParams(snippet, { keys: { x: 1 }, pads: "solder" });
    expect(r.params).toEqual({ W: 60, keys: [{ x: 0, gap: 1.44 }], pads: "clip" });
    expect(r.report.replaced).toEqual(["/keys", "/pads"]);
    expect(normaliseParams(snippet, { keys: [7] }).report.replaced).toEqual(["/keys/0"]);
  });
  it("drops a derived value and a __proto__ key and never assigns either", () => {
    const stored = JSON.parse('{"T": 3, "__proto__": {"polluted": true}, "W": 61}') as unknown;
    const r = normaliseParams(snippet, stored);
    expect(r.params).toEqual({ W: 61, keys: [{ x: 0, gap: 1.44 }], pads: "clip" });
    expect(r.report.dropped).toEqual(["/T", "/__proto__"]);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });
  it("normalises typed instances: unknown types dropped, fields defaulted, count clamped", () => {
    const inst: ParamField = {
      id: "hooks", type: "instances", label: "hooks", min: 1, max: 2,
      types: { hook: { label: "hook", blurb: "a hook", fields: [{ id: "d", type: "mm", label: "d", range: [1, 9], default: 4 }] } },
    };
    const c: Chase = { ...snippet, params: [{ id: "g", label: "G", fields: [inst] }] };
    const r = normaliseParams(c, { hooks: [{ id: "a", type: "hook", d: Number.NaN, at: [1, 2] }, { id: "b", type: "shelf" }, { id: "c", type: "hook" }, { id: "d", type: "hook" }] });
    expect(r.params).toEqual({ hooks: [{ id: "a", type: "hook", at: [1, 2], d: 4 }, { id: "c", type: "hook", d: 4 }] });
    expect(r.report).toEqual({ dropped: ["/hooks/1"], replaced: ["/hooks/0/d"], clamped: ["/hooks"] });
    expect(paramsErrors(c, r.params)).toEqual([]);
    expect(normaliseParams(c, {}).params).toEqual({ hooks: [{ id: "hook-1", type: "hook", d: 4 }] });
  });
  it("reads the params of a bench design file, a params document or a bare object", () => {
    expect(storedParams({ app: "x", v: 1, state: { W: 1 } })).toEqual({ W: 1 });
    expect(storedParams({ chase: 2, params: { W: 2 } })).toEqual({ W: 2 });
    expect(storedParams({ W: 3 })).toEqual({ W: 3 });
  });
});
