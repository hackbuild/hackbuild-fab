// reference/keys/access-switch/chase.ts
// The access switch flagship (plan v9 section 6, release 1 "designs"): one
// PIP click spring (click-spring-key, pip.md 5.2, reference
// buttons/click-spring) under a round paddle, on a round PETG body with
// the PIP buried stack. The spring span and beam are drawn longer and
// thinner than PIP's 24 x 0.55 so the peak sits near the owner's 150 g
// target: l 28, t 0.55 reads 1.552 N, 158 g (computed, SNAPFE, PETG
// modulus working value, tier inferred). A chase declares and never
// computes (D-178); the layout is in build.ts.
//
// Materials are PIP's four slots (layout.js lines 47 to 52), as
// click-spring declares them. No hookup: the switch carries no MCU, and
// the click tip prints apart from the body so no contact feature can name
// it (M06-T08 finding). Its proof is the two nets apart plus R.switch.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "keys-access-switch", kind: "single", name: "ACCESS SWITCH", version: 1, chase: 2,
    kernels: ["geom", "mesh", "circuit", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "body and paddle", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "cap", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "tip", preview: "#6E6E6E" },
  ],
  params: [
    { id: "spring", label: "SPRING", live: "commit", fields: [
      { id: "l", type: "mm", label: "span", range: [24, 32], step: 0.5, default: 28,
        help: "beam span between the end blocks; longer is softer" },
      { id: "t", type: "mm", label: "beam", range: [0.45, 0.65], step: 0.05, default: 0.55,
        help: "beam thickness; force goes with its cube" },
      { id: "Q", type: "ratio", label: "rise", range: [1.7, 2.3], step: 0.05, default: 2.0,
        help: "arch rise over beam thickness; under 2 it stops snapping" },
      { id: "w", type: "mm", label: "width", range: [1.0, 2.0], step: 0.1, default: 1.6,
        help: "beam width, printed as layer height" },
    ] },
    { id: "paddle", label: "PADDLE", live: "commit", fields: [
      { id: "D", type: "mm", label: "paddle", range: [40, 70], step: 1, default: 56, help: "paddle diameter" },
      { id: "H", type: "mm", label: "height", range: [8, 20], step: 0.5, default: 12, help: "paddle top to skirt edge" },
    ] },
    { id: "body", label: "BODY", live: "commit", fields: [
      { id: "wall", type: "mm", label: "wall", range: [2, 5], step: 0.5, default: 3,
        help: "body rim past the paddle, and the paddle plate and skirt" },
    ] },
  ],
  presets: [
    { id: "default", label: "default", params: {}, note: "span 28, beam 0.55: about 158 g at the snap (computed, modulus inferred)." },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [
    { type: "apart", nets: ["KEY", "GND"] },
  ],
});

export type AccessSwitchParams = ParamsOf<typeof chase>;
