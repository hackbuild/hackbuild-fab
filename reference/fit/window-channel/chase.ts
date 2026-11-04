// reference/fit/window-channel/chase.ts
// The reference for the `window` feature kind and CHK-SHP-03 (D-177, D-105):
// a PETG block on the ffc5p 0.24 mm preset with two windows through it from
// the front edge to the back edge. One is a flat roofed channel the shape of
// BAIL's buried cord channel (bail.html 1720 to 1789, 4.5 mm wide for a 4 mm
// cord with 0.5 mm clearance); the other is a 45 degree gabled window, the
// DAVIT and DETENT motif CHK-SHP-03 records. A chase declares and never
// computes (D-178); the outlines and the layer tops are in build.ts.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "window-channel", kind: "single", name: "WINDOW CHANNEL", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
  ],
  params: [
    { id: "block", label: "BLOCK", live: "commit", fields: [
      { id: "w", type: "mm", label: "width", range: [24, 60], step: 1, default: 30 },
      { id: "d", type: "mm", label: "depth through", range: [10, 60], step: 1, default: 24 },
      { id: "thk", type: "mm", label: "thickness", range: [4.09, 10.09], step: 0.24, default: 6.01,
        help: "a layer top on the 0.24 mm grid over a 0.25 mm first layer" },
    ] },
    { id: "channel", label: "CHANNEL", live: "commit", fields: [
      { id: "chanW", type: "mm", label: "channel width", range: [2, 10], step: 0.05, default: 4.5 },
      { id: "chanFloor", type: "mm", label: "channel floor", range: [0.73, 3], step: 0.24, default: 1.21 },
      { id: "chanH", type: "mm", label: "channel height", range: [0.96, 4.8], step: 0.24, default: 2.88 },
    ] },
    { id: "gable", label: "GABLE", live: "commit", fields: [
      { id: "gableW", type: "mm", label: "gable width", range: [2, 8], step: 0.5, default: 4 },
      { id: "gableWall", type: "mm", label: "gable wall", range: [0.48, 3], step: 0.24, default: 1.44,
        help: "the upright side before the 45 degree roof starts" },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

/** The params type a build function sees. */
export type WindowChannelParams = ParamsOf<typeof chase>;
