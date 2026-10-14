// reference/mechanisms/shift-drum/chase.ts
// The shift-drum mechanism reference (M06-T06): TUMBLER's SHIFT DRUM module at
// its bench defaults (originals/tumbler/files/tumbler.html from line
// 1141) on the bench default material strip, Delrin/POM 3 mm (t 3.0,
// kerf 0.22, fit 0.15, E 3100 MPa; MATS line 193 and G line 203, all
// inferred). A chase declares and never computes (D-178): the field ids
// are the mechanism's params, and build.ts runs its apply().

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "shift-drum", kind: "single", name: "SHIFT DRUM", version: 1, chase: 2,
    kernels: ["geom", "mesh", "nest"], machines: ["sheet600"],
    license: "CC-BY-SA-4.0",
  },
  // pom3 names the bench default sheet; the profile has no POM row yet, so no check reads a number from it (M06-T02 card defects).
  materials: [
    { slot: 1, material: "pom3", role: "body", label: "sheet", preview: "#F4F1EA" },
  ],
  params: [
    { id: "module", label: "SHIFT DRUM", live: "commit", fields: [
      { id: "steps", type: "int", label: "steps", range: [4, 8], step: 1, default: 8, help: "steps, the bench slider" },
      { id: "tracks", type: "int", label: "tracks", range: [1, 4], step: 1, default: 4, help: "tracks, the bench slider" },
      { id: "rad", type: "mm", label: "base radius", range: [12, 40], step: 0.5, default: 22, help: "base radius, the bench slider" },
      { id: "lobe", type: "mm", label: "lobe rise", range: [1.5, 8], step: 0.25, default: 3.5, help: "lobe rise, the bench slider" },
      { id: "dwell", type: "number", unit: "percent", label: "dwell %", range: [30, 95], step: 1, default: 70, help: "dwell %, the bench slider" },
      { id: "g00", type: "int", label: "track 0 step 0", range: [0, 1], step: 1, default: 1, help: "bit of track 0 at step 0" },
      { id: "g01", type: "int", label: "track 0 step 1", range: [0, 1], step: 1, default: 0, help: "bit of track 0 at step 1" },
      { id: "g02", type: "int", label: "track 0 step 2", range: [0, 1], step: 1, default: 0, help: "bit of track 0 at step 2" },
      { id: "g03", type: "int", label: "track 0 step 3", range: [0, 1], step: 1, default: 1, help: "bit of track 0 at step 3" },
      { id: "g04", type: "int", label: "track 0 step 4", range: [0, 1], step: 1, default: 1, help: "bit of track 0 at step 4" },
      { id: "g05", type: "int", label: "track 0 step 5", range: [0, 1], step: 1, default: 0, help: "bit of track 0 at step 5" },
      { id: "g06", type: "int", label: "track 0 step 6", range: [0, 1], step: 1, default: 0, help: "bit of track 0 at step 6" },
      { id: "g07", type: "int", label: "track 0 step 7", range: [0, 1], step: 1, default: 0, help: "bit of track 0 at step 7" },
      { id: "g10", type: "int", label: "track 1 step 0", range: [0, 1], step: 1, default: 0, help: "bit of track 1 at step 0" },
      { id: "g11", type: "int", label: "track 1 step 1", range: [0, 1], step: 1, default: 1, help: "bit of track 1 at step 1" },
      { id: "g12", type: "int", label: "track 1 step 2", range: [0, 1], step: 1, default: 0, help: "bit of track 1 at step 2" },
      { id: "g13", type: "int", label: "track 1 step 3", range: [0, 1], step: 1, default: 1, help: "bit of track 1 at step 3" },
      { id: "g14", type: "int", label: "track 1 step 4", range: [0, 1], step: 1, default: 0, help: "bit of track 1 at step 4" },
      { id: "g15", type: "int", label: "track 1 step 5", range: [0, 1], step: 1, default: 1, help: "bit of track 1 at step 5" },
      { id: "g16", type: "int", label: "track 1 step 6", range: [0, 1], step: 1, default: 0, help: "bit of track 1 at step 6" },
      { id: "g17", type: "int", label: "track 1 step 7", range: [0, 1], step: 1, default: 0, help: "bit of track 1 at step 7" },
      { id: "g20", type: "int", label: "track 2 step 0", range: [0, 1], step: 1, default: 0, help: "bit of track 2 at step 0" },
      { id: "g21", type: "int", label: "track 2 step 1", range: [0, 1], step: 1, default: 0, help: "bit of track 2 at step 1" },
      { id: "g22", type: "int", label: "track 2 step 2", range: [0, 1], step: 1, default: 1, help: "bit of track 2 at step 2" },
      { id: "g23", type: "int", label: "track 2 step 3", range: [0, 1], step: 1, default: 1, help: "bit of track 2 at step 3" },
      { id: "g24", type: "int", label: "track 2 step 4", range: [0, 1], step: 1, default: 0, help: "bit of track 2 at step 4" },
      { id: "g25", type: "int", label: "track 2 step 5", range: [0, 1], step: 1, default: 0, help: "bit of track 2 at step 5" },
      { id: "g26", type: "int", label: "track 2 step 6", range: [0, 1], step: 1, default: 1, help: "bit of track 2 at step 6" },
      { id: "g27", type: "int", label: "track 2 step 7", range: [0, 1], step: 1, default: 0, help: "bit of track 2 at step 7" },
      { id: "g30", type: "int", label: "track 3 step 0", range: [0, 1], step: 1, default: 1, help: "bit of track 3 at step 0" },
      { id: "g31", type: "int", label: "track 3 step 1", range: [0, 1], step: 1, default: 1, help: "bit of track 3 at step 1" },
      { id: "g32", type: "int", label: "track 3 step 2", range: [0, 1], step: 1, default: 1, help: "bit of track 3 at step 2" },
      { id: "g33", type: "int", label: "track 3 step 3", range: [0, 1], step: 1, default: 0, help: "bit of track 3 at step 3" },
      { id: "g34", type: "int", label: "track 3 step 4", range: [0, 1], step: 1, default: 0, help: "bit of track 3 at step 4" },
      { id: "g35", type: "int", label: "track 3 step 5", range: [0, 1], step: 1, default: 0, help: "bit of track 3 at step 5" },
      { id: "g36", type: "int", label: "track 3 step 6", range: [0, 1], step: 1, default: 0, help: "bit of track 3 at step 6" },
      { id: "g37", type: "int", label: "track 3 step 7", range: [0, 1], step: 1, default: 1, help: "bit of track 3 at step 7" },
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
