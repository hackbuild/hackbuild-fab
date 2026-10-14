// reference/mechanisms/ratchet-pawl/chase.ts
// The ratchet-pawl mechanism reference (M06-T06): TUMBLER's RATCHET module at
// its bench defaults (originals/tumbler/files/tumbler.html from line
// 1086) on the bench default material strip, Delrin/POM 3 mm (t 3.0,
// kerf 0.22, fit 0.15, E 3100 MPa; MATS line 193 and G line 203, all
// inferred). A chase declares and never computes (D-178): the field ids
// are the mechanism's params, and build.ts runs its apply().

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "ratchet-pawl", kind: "single", name: "RATCHET", version: 1, chase: 2,
    kernels: ["geom", "mesh", "nest"], machines: ["sheet600"],
    license: "CC-BY-SA-4.0",
  },
  // pom3 names the bench default sheet; the profile has no POM row yet, so no check reads a number from it (M06-T02 card defects).
  materials: [
    { slot: 1, material: "pom3", role: "body", label: "sheet", preview: "#F4F1EA" },
  ],
  params: [
    { id: "module", label: "RATCHET", live: "commit", fields: [
      { id: "n", type: "int", label: "teeth", range: [6, 36], step: 1, default: 12, help: "teeth, the bench slider" },
      { id: "rad", type: "mm", label: "wheel radius", range: [10, 40], step: 0.5, default: 22, help: "wheel radius, the bench slider" },
      { id: "dep", type: "mm", label: "tooth depth", range: [1, 6], step: 0.25, default: 3, help: "tooth depth, the bench slider" },
      { id: "rake", type: "deg", label: "tooth rake", range: [10, 80], step: 1, default: 35, help: "tooth rake, the bench slider" },
      { id: "pl", type: "mm", label: "pawl length", range: [10, 40], step: 1, default: 22, help: "pawl length, the bench slider" },
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
