// reference/electrical/trace-width-budget/chase.ts
// M01-T06 (C-01, D-072): one printed trace whose width is answered by
// constraints.query. The params declare the facts of golden 1, and the
// param-form query reads them as facts by field id: path 62 mm, band 0.72
// mm, an 8000 ohm budget, a trace that flexes, keys on an 8.0 mm pitch with
// 1.0 mm clearance each side (syn/api-library-ai-design.md 6.4 C). At the
// Protopasta printed XY row (30 ohm cm, vendor) the legal width is 3.23 to
// 6.00 mm and the resistance floor binds (computed). The width default
// 3.25 mm is the first 0.05 mm step at or above that floor (computed);
// it lands on its step from the range minimum (G-09).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "trace-width-budget", kind: "single", name: "TRACE WIDTH BUDGET", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "cpla-protopasta", role: "conductor", label: "trace", preview: "#1A1A1A" },
    { slot: 2, material: "petg", role: "body", label: "skin", preview: "#F4F1EA" },
  ],
  params: [
    { id: "trace", label: "TRACE", live: "commit", fields: [
      { id: "w", type: "mm", label: "width", range: [0.8, 6], step: 0.05, default: 3.25,
        constraintDim: "conductor.width", help: "trace width; constraints.query answers its legal range" },
      { id: "pathMm", type: "mm", label: "path", range: [10, 120], step: 0.5, default: 62 },
      { id: "tMm", type: "mm", label: "thickness", range: [0.24, 2.4], step: 0.24, default: 0.72 },
    ] },
    { id: "net", label: "NET", live: "commit", fields: [
      { id: "netBudgetOhm", type: "number", unit: "ohm", label: "budget", range: [500, 100000], step: 500, default: 8000,
        help: "most resistance the net may have end to end" },
      { id: "flexes", type: "bool", label: "flexes", default: true },
    ] },
    { id: "pitch", label: "PITCH", live: "commit", fields: [
      { id: "pitchMm", type: "mm", label: "key pitch", range: [4, 20], step: 0.5, default: 8 },
      { id: "pitchClrMm", type: "mm", label: "clearance", range: [0.2, 3], step: 0.1, default: 1 },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

/** The params type a build function sees. */
export type TraceWidthParams = ParamsOf<typeof chase>;
