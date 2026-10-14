// reference/mechanisms/living-hinge/chase.ts
// The living-hinge mechanism reference (M06-T06): TUMBLER's LIVING HINGE module at
// its bench defaults (originals/tumbler/files/tumbler.html from line
// 1392) on the bench default material strip, Delrin/POM 3 mm (t 3.0,
// kerf 0.22, fit 0.15, E 3100 MPa; MATS line 193 and G line 203, all
// inferred). A chase declares and never computes (D-178): the field ids
// are the mechanism's params, and build.ts runs its apply().

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "living-hinge", kind: "single", name: "LIVING HINGE", version: 1, chase: 2,
    kernels: ["geom", "mesh", "nest"], machines: ["sheet600"],
    license: "CC-BY-SA-4.0",
  },
  // pom3 names the bench default sheet; the profile has no POM row yet, so no check reads a number from it (M06-T02 card defects).
  materials: [
    { slot: 1, material: "pom3", role: "body", label: "sheet", preview: "#F4F1EA" },
  ],
  params: [
    { id: "module", label: "LIVING HINGE", live: "commit", fields: [
      { id: "span", type: "mm", label: "hinge span", range: [6, 60], step: 1, default: 22, help: "hinge span, the bench slider" },
      { id: "wid", type: "mm", label: "hinge width", range: [20, 120], step: 1, default: 60, help: "hinge width, the bench slider" },
      { id: "rows", type: "int", label: "slot rows", range: [2, 20], step: 1, default: 7, help: "slot rows, the bench slider" },
      { id: "sl_", type: "mm", label: "slot length", range: [6, 40], step: 0.5, default: 16, help: "slot length, the bench slider" },
      { id: "gap", type: "mm", label: "end gap", range: [1, 8], step: 0.25, default: 3, help: "end gap, the bench slider" },
      { id: "sw", type: "mm", label: "slot width", range: [0.2, 2], step: 0.05, default: 0.5, help: "slot width, the bench slider" },
      { id: "ang", type: "deg", label: "bend angle", range: [10, 180], step: 5, default: 90, help: "bend angle, the bench slider" },
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
