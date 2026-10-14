// reference/mechanisms/coanda-gate/chase.ts
// The coanda-gate mechanism reference (M06-T06): TUMBLER's COANDA GATE module at
// its bench defaults (originals/tumbler/files/tumbler.html from line
// 1569) on the bench default material strip, Delrin/POM 3 mm (t 3.0,
// kerf 0.22, fit 0.15, E 3100 MPa; MATS line 193 and G line 203, all
// inferred). A chase declares and never computes (D-178): the field ids
// are the mechanism's params, and build.ts runs its apply().

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "coanda-gate", kind: "single", name: "COANDA GATE", version: 1, chase: 2,
    kernels: ["geom", "mesh", "nest"], machines: ["sheet600"],
    license: "CC-BY-SA-4.0",
  },
  // pom3 names the bench default sheet; the profile has no POM row yet, so no check reads a number from it (M06-T02 card defects).
  materials: [
    { slot: 1, material: "pom3", role: "body", label: "sheet", preview: "#F4F1EA" },
  ],
  params: [
    { id: "module", label: "COANDA GATE", live: "commit", fields: [
      { id: "w", type: "mm", label: "nozzle width", range: [0.6, 4], step: 0.1, default: 1.5, help: "nozzle width, the bench slider" },
      { id: "sp", type: "ratio", label: "splitter dist", range: [5, 16], step: 0.5, default: 9, help: "splitter dist, the bench slider" },
      { id: "so", type: "ratio", label: "wall setback", range: [0.5, 4], step: 0.1, default: 1.5, help: "wall setback, the bench slider" },
      { id: "cw", type: "mm", label: "control width", range: [0.4, 3], step: 0.1, default: 1, help: "control width, the bench slider" },
      { id: "ar", type: "mm", label: "depth", range: [1, 10], step: 0.5, default: 4, help: "depth, the bench slider" },
    ] },
    { id: "strip", label: "MATERIAL STRIP", live: "commit", fields: [
      { id: "t", type: "mm", label: "t", range: [0.5, 12], step: 0.1, default: 3, help: "sheet thickness (bench default delrin/pom 3mm, inferred)" },
      { id: "k", type: "mm", label: "kerf", range: [0, 1], step: 0.01, default: 0.22, help: "kerf; inferred until a coupon" },
      { id: "c", type: "mm", label: "fit", range: [0, 1], step: 0.01, default: 0.15, help: "fit clearance per face" },
      { id: "E", type: "number", unit: "MPa", label: "modulus", range: [30, 9000], step: 1, default: 3100, help: "sheet modulus from the material row, inferred" },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [],
  assertions: [],
});

/** The params type a build function sees. */
export type Params = ParamsOf<typeof chase>;
