// reference/mechanisms/teeter-not/chase.ts
// The teeter-not mechanism reference (M06-T06): TUMBLER's TEETER module at
// its bench defaults (originals/tumbler/files/tumbler.html from line
// 783) on the bench default material strip, Delrin/POM 3 mm (t 3.0,
// kerf 0.22, fit 0.15, E 3100 MPa; MATS line 193 and G line 203, all
// inferred). A chase declares and never computes (D-178): the field ids
// are the mechanism's params, and build.ts runs its apply().

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "teeter-not", kind: "single", name: "TEETER", version: 1, chase: 2,
    kernels: ["geom", "mesh", "nest"], machines: ["sheet600"],
    license: "CC-BY-SA-4.0",
  },
  // pom3 names the bench default sheet; the profile has no POM row yet, so no check reads a number from it (M06-T02 card defects).
  materials: [
    { slot: 1, material: "pom3", role: "body", label: "sheet", preview: "#F4F1EA" },
  ],
  params: [
    { id: "module", label: "TEETER", live: "commit", fields: [
      { id: "ai", type: "mm", label: "input arm", range: [10, 60], step: 1, default: 26, help: "input arm, the bench slider" },
      { id: "ao", type: "mm", label: "output arm", range: [10, 60], step: 1, default: 26, help: "output arm, the bench slider" },
      { id: "bw", type: "mm", label: "beam width", range: [6, 20], step: 0.5, default: 10, help: "beam width, the bench slider" },
      { id: "sl_", type: "mm", label: "spring length", range: [10, 40], step: 1, default: 22, help: "spring length, the bench slider" },
      { id: "sw", type: "mm", label: "spring width", range: [0.6, 4], step: 0.1, default: 1.4, help: "spring width, the bench slider" },
      { id: "tv", type: "mm", label: "input travel", range: [3, 16], step: 0.5, default: 8, help: "input travel, the bench slider" },
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
