// reference/keys/click-spring-window/chase.ts
// The click-spring window reference (M01-T07, D-071): the PIP click spring
// at its defaults, the beam that sim/click-spring-window bounds over Q. A
// chase declares and never computes (D-178): one defineChase over a
// literal; the geometry is in build.ts beside it.
//
// Defaults are PIP's `clicky` row (haft-src/src/layout.js line 36): span l
// 24 mm, beam t 0.55 mm, rise Q 2.0 x t, width w 1.6 mm, beam gap g 1.0 mm,
// shuttle sw 3.0 mm. E (1900 MPa) is the petg modulus row in profile, so
// the chase carries no modulus. Each default lands on its step from the
// range minimum (G-09). Q carries constraintDim spring.Q, so a param-form
// query and the parity edit (Q one step up, 2.01) both reach the window.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "click-spring-window", kind: "single", name: "CLICK SPRING", version: 1, chase: 2,
    kernels: ["geom", "mesh", "sim", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // PIP prints the click elements in PETG on slot 1 (pip.md 5.2).
  materials: [
    { slot: 1, material: "petg", role: "body", label: "spring", preview: "#F4F1EA" },
  ],
  params: [
    { id: "clicky", label: "CLICK SPRING", live: "commit", fields: [
      { id: "l", type: "mm", label: "span", range: [12, 36], step: 0.5, default: 24, help: "span between the end blocks" },
      { id: "t", type: "mm", label: "beam", range: [0.35, 0.95], step: 0.05, default: 0.55, help: "beam thickness in the bending plane" },
      { id: "Q", type: "ratio", label: "rise", range: [1, 2.6], step: 0.01, default: 2,
        constraintDim: "spring.Q", help: "rise over beam thickness" },
      { id: "w", type: "mm", label: "width", range: [0.8, 3.2], step: 0.1, default: 1.6, help: "beam width, the print height" },
      { id: "g", type: "mm", label: "beam gap", range: [0.5, 2], step: 0.1, default: 1, help: "gap between the two arches" },
      { id: "sw", type: "mm", label: "shuttle", range: [1, 6], step: 0.5, default: 3, help: "rigid shuttle width at the centre" },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});

/** The params type a build function sees. */
export type ClickSpringParams = ParamsOf<typeof chase>;
