// reference/electrical/pip-buried-route/chase.ts
// M05-T10 (D-084, D-085, C-06): the PIP buried trace stack. PIP's default
// layout at b137deb (hackbuild/pip-controller, D-013), routed by
// packages/copper and emitted as two buried conductive PLA trace layers
// with their terminal posts and vias in a PETG body, on the profile stack
// rows: skin 0.72, trace 0.72, isolation 0.96, PETG over layer 2 1.68 mm,
// trace width 1.40 mm, bleed 0 (inferred, PIP defaults, PROFILE.md 6.1 and
// 6.2). circuit.solve extracts the nets from the built bodies and runs
// CHK-NET-01, -02, -11 and -12 on them.
//
// iters caps the router's negotiation iterations. The default 24 is PIP's
// (src/layout.js line 28); the layout converges at its second iteration,
// so every cap from 2 builds the same route and cap 1 leaves conflicts
// (computed, route.data.ts).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "electrical-pip-buried-route", kind: "single", name: "PIP BURIED ROUTE", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // PIP's slots 1 and 2 (pip-controller print/print-card.txt): white PETG body, conductive PLA traces.
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
  ],
  params: [
    { id: "route", label: "ROUTE", live: "commit", fields: [
      { id: "iters", type: "int", label: "iterations", range: [1, 24], step: 1, default: 24,
        help: "negotiation iterations the router may take; under 2 it leaves conflicts on this layout" },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "stl" }],
  assertions: [],
});

/** The params type a build function sees. */
export type PipBuriedRouteParams = ParamsOf<typeof chase>;
