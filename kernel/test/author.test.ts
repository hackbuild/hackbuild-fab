// @hackbuild/kernel/author re-exports defineChase, defineBuild and ParamsOf
// (M10-T02 step 6): one implementation, so a chase importing either module
// the source reader admits gets the same function and the same types.

import { describe, expect, it } from "vitest";
import * as author from "@hackbuild/kernel/author";
import * as spec from "@hackbuild/spec";
import * as mesh from "@hackbuild/mesh";

const chase = author.defineChase({
  meta: { id: "author-entry", kind: "single", name: "AUTHOR", version: 1, chase: 2, kernels: [], machines: [], license: "CC-BY-SA-4.0" },
  materials: [],
  params: [{ id: "g", label: "G", fields: [{ id: "d", type: "mm", label: "d", range: [1, 9], default: 4 }] }],
  build: { module: "./build.ts", fn: "build" },
  exports: [],
  assertions: [],
});

describe("@hackbuild/kernel/author", () => {
  it("re-exports the spec identities", () => {
    expect(author.defineChase).toBe(spec.defineChase);
    expect(author.defineBuild).toBe(spec.defineBuild);
    expect(author.defineChase(chase)).toBe(chase);
  });
  it("re-exports the mesh edge stack generator (R1-engine-06)", () => {
    expect(author.prismWithEdges).toBe(mesh.prismWithEdges);
  });
  it("types build params from the chase", () => {
    const p: author.ParamsOf<typeof chase> = { d: 4 };
    // @ts-expect-error a param name typo is a type error
    const typo: author.ParamsOf<typeof chase> = { dd: 4 };
    expect([p.d, typo]).toEqual([4, { dd: 4 }]);
  });
});
