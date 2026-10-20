// Type tests for defineChase, defineBuild and ParamsOf (M10-T02 step 2).
// Compiled by tsc -p tsconfig.tests.json; each @ts-expect-error line must
// fire, and params-of.test.ts removes each one in turn and expects tsc to
// fail, so a line that stops firing is caught both ways.

import type { Chase, ChaseMeta } from "@hackbuild/spec";
import { chaseDocSchema, defineBuild, defineChase, type ParamsOf } from "@hackbuild/chase";

const chase = defineChase({
  meta: { id: "type-test", kind: "single", name: "TYPE TEST", version: 1, chase: 2, kernels: ["geom"], machines: ["ffc5p"], license: "CC-BY-SA-4.0" },
  materials: [{ slot: 1, material: "petg", role: "body" }],
  params: [
    { id: "pad", label: "PAD", fields: [
      { id: "W", type: "mm", label: "width", range: [40, 90], step: 1, default: 60 },
      { id: "T", type: "derived", label: "thickness", fn: "padThickness", unit: "mm" },
    ] },
    { id: "keys", label: "KEYS", fields: [
      { id: "keys", type: "list", label: "keys", min: 1, max: 2, item: [
        { id: "x", type: "mm", label: "x", range: [-35, 35], default: 0 },
        { id: "gap", type: "mm", label: "travel", range: [0.8, 3], step: 0.02, default: 1.44 },
      ] },
      { id: "pads", type: "enum", label: "leads", default: "clip", options: [{ value: "clip", label: "clip pads" }, { value: "cup", label: "wire cups" }] },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf" }],
  assertions: [],
});

type P = ParamsOf<typeof chase>;
export const ok: P = { W: 60, keys: [{ x: 0, gap: 1.44 }], pads: "cup" };

// @ts-expect-error an enum value outside its options is a type error
export const badEnum: P = { W: 60, keys: [{ x: 0, gap: 1.44 }], pads: "solder" };

export const build = defineBuild(chase, (p) => {
  const w: number = p.W;
  const gap: number = p.keys[0]?.gap ?? 0;
  const leads: "clip" | "cup" = p.pads;
  // @ts-expect-error a param name typo is a type error
  void p.keys[0]?.gpa;
  // @ts-expect-error derived fields are not inputs
  void p.T;
  return { features: [], metrics: [], warnings: [], note: `${w} ${gap} ${leads}` } as never;
});

defineChase({
  meta: { id: "with-checks", kind: "single", name: "X", version: 1, chase: 2, kernels: [], machines: [], license: "CC-BY-SA-4.0" },
  materials: [], params: [], build: { module: "./build.ts", fn: "build" }, exports: [], assertions: [],
  // @ts-expect-error a chase has no checks field (D-173)
  checks: ["CHK-KEY-01"],
});

// The strict document schema names exactly the keys spec/chase.ts declares.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const chaseKeys: Same<keyof typeof chaseDocSchema.shape, keyof Chase> = true;
export const metaKeys: Same<keyof typeof chaseDocSchema.shape.meta.shape, keyof ChaseMeta> = true;
