// reference/mechanisms/tumbler-coded-and/chase.ts
// The tumbler-coded-and mechanism reference (M06-T06): TUMBLER's TUMBLER module at
// its bench defaults (originals/tumbler/files/tumbler.html from line
// 909) on the bench default material strip, Delrin/POM 3 mm (t 3.0,
// kerf 0.22, fit 0.15, E 3100 MPa; MATS line 193 and G line 203, all
// inferred). A chase declares and never computes (D-178): the field ids
// are the mechanism's params, and build.ts runs its apply().

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "tumbler-coded-and", kind: "single", name: "TUMBLER", version: 1, chase: 2,
    kernels: ["geom", "mesh", "nest"], machines: ["sheet600"],
    license: "CC-BY-SA-4.0",
  },
  // pom3 names the bench default sheet; the profile has no POM row yet, so no check reads a number from it (M06-T02 card defects).
  materials: [
    { slot: 1, material: "pom3", role: "body", label: "sheet", preview: "#F4F1EA" },
  ],
  params: [
    { id: "module", label: "TUMBLER", live: "commit", fields: [
      { id: "n", type: "int", label: "pin count", range: [3, 8], step: 1, default: 5, help: "pin count, the bench slider" },
      { id: "pitch", type: "mm", label: "pin pitch", range: [5, 14], step: 0.5, default: 8, help: "pin pitch, the bench slider" },
      { id: "pd", type: "mm", label: "pin dia", range: [2, 6], step: 0.5, default: 3, help: "pin dia, the bench slider" },
      { id: "lift", type: "mm", label: "lift per step", range: [1, 4], step: 0.25, default: 2, help: "lift per step, the bench slider" },
      { id: "shear", type: "mm", label: "shear clearance", range: [0.1, 1.2], step: 0.05, default: 0.4, help: "shear clearance, the bench slider" },
      { id: "code1", type: "int", label: "code pin 1", range: [0, 4], step: 1, default: 1, help: "cut depth of pin 1, 0 to 4" },
      { id: "code2", type: "int", label: "code pin 2", range: [0, 4], step: 1, default: 3, help: "cut depth of pin 2, 0 to 4" },
      { id: "code3", type: "int", label: "code pin 3", range: [0, 4], step: 1, default: 0, help: "cut depth of pin 3, 0 to 4" },
      { id: "code4", type: "int", label: "code pin 4", range: [0, 4], step: 1, default: 2, help: "cut depth of pin 4, 0 to 4" },
      { id: "code5", type: "int", label: "code pin 5", range: [0, 4], step: 1, default: 4, help: "cut depth of pin 5, 0 to 4" },
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
