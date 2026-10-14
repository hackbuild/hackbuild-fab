// reference/mechanisms/detent-latch/chase.ts
// The detent-latch mechanism reference (M06-T06): TUMBLER's DETENT LATCH module at
// its bench defaults (originals/tumbler/files/tumbler.html from line
// 979) on the bench default material strip, Delrin/POM 3 mm (t 3.0,
// kerf 0.22, fit 0.15, E 3100 MPa; MATS line 193 and G line 203, all
// inferred). A chase declares and never computes (D-178): the field ids
// are the mechanism's params, and build.ts runs its apply().

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "detent-latch", kind: "single", name: "DETENT LATCH", version: 1, chase: 2,
    kernels: ["geom", "mesh", "nest"], machines: ["sheet600"],
    license: "CC-BY-SA-4.0",
  },
  // pom3 names the bench default sheet; the profile has no POM row yet, so no check reads a number from it (M06-T02 card defects).
  materials: [
    { slot: 1, material: "pom3", role: "body", label: "sheet", preview: "#F4F1EA" },
  ],
  params: [
    { id: "module", label: "DETENT LATCH", live: "commit", fields: [
      { id: "pitch", type: "mm", label: "pocket pitch", range: [6, 24], step: 0.5, default: 12, help: "pocket pitch, the bench slider" },
      { id: "dep", type: "mm", label: "pocket depth", range: [0.8, 4], step: 0.1, default: 1.8, help: "pocket depth, the bench slider" },
      { id: "bl", type: "mm", label: "spring length", range: [10, 45], step: 1, default: 26, help: "spring length, the bench slider" },
      { id: "bwid", type: "mm", label: "spring width", range: [0.6, 4], step: 0.1, default: 1.5, help: "spring width, the bench slider" },
      { id: "sw", type: "mm", label: "slider width", range: [10, 30], step: 0.5, default: 16, help: "slider width, the bench slider" },
      { id: "L", type: "mm", label: "slider length", range: [50, 140], step: 1, default: 90, help: "slider length, the bench slider" },
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
