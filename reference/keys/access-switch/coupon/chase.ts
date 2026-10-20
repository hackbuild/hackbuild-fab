// reference/keys/access-switch/coupon/chase.ts
// The access switch spring coupon (plan v9 section 6, "one printed coupon
// per flagship"): three click-spring-key cells at the switch's span, rise
// and width, one per rung of a beam thickness ladder, in one PETG frame.
// The drawn beam moves the peak from 108 g to 224 g across 0.50 to 0.60
// mm (computed, SNAPFE, PETG modulus working value, tier inferred), more
// than the 150 g band holds, so the owner presses each rung, or loads its
// cup with coins, and picks the rung that feels right.
//
// PIP's coupon (originals/pip/files/haft-src/src/coupon.js lines 131 to
// 150 and 166 to 170) carried one click spring beside electrical cells,
// its spring and cap printed apart; this one keeps only the spring,
// three times. No conductors: force only, so it prints in PETG and TPU. The four slots are the switch's, since the archetype
// places only into a chase that declares every slot it uses; slots 2 and
// 4 carry no body here. A chase declares and never computes (D-178); the
// layout is in build.ts.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "keys-access-switch-coupon", kind: "single", name: "ACCESS SWITCH COUPON", version: 1, chase: 2,
    kernels: ["geom", "mesh", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "petg", role: "body", label: "frame, springs and cups", preview: "#F4F1EA" },
    { slot: 2, material: "cpla", role: "conductor", label: "traces, none here", preview: "#1A1A1A" },
    { slot: 3, material: "tpu95", role: "flex", label: "caps and tips", preview: "#FE0386" },
    { slot: 4, material: "ctpu", role: "flex-conductor", label: "contacts, none here", preview: "#6E6E6E" },
  ],
  params: [
    { id: "spring", label: "SPRING", live: "commit", fields: [
      { id: "l", type: "mm", label: "span", range: [24, 32], step: 0.5, default: 28,
        help: "beam span between the end blocks, as the switch draws it" },
      { id: "Q", type: "ratio", label: "rise", range: [1.7, 2.3], step: 0.05, default: 2.0,
        help: "arch rise over beam thickness; under 2 it stops snapping" },
      { id: "w", type: "mm", label: "width", range: [1.0, 2.0], step: 0.1, default: 1.6,
        help: "beam width, printed as layer height" },
    ] },
    { id: "rungs", label: "RUNGS", live: "commit", fields: [
      { id: "t1", type: "mm", label: "rung 1", range: [0.45, 0.65], step: 0.05, default: 0.5,
        help: "beam of the cell marked with one bar; force goes with its cube" },
      { id: "t2", type: "mm", label: "rung 2", range: [0.45, 0.65], step: 0.05, default: 0.55,
        help: "beam of the cell marked with two bars, the switch's own" },
      { id: "t3", type: "mm", label: "rung 3", range: [0.45, 0.65], step: 0.05, default: 0.6,
        help: "beam of the cell marked with three bars" },
    ] },
    { id: "cups", label: "CUP", live: "commit", fields: [
      { id: "cup", type: "mm", label: "cup", range: [16, 30], step: 0.5, default: 24,
        help: "inside diameter of the coin cup on each cap; wider than your coins" },
      { id: "cupH", type: "mm", label: "depth", range: [4, 20], step: 0.5, default: 8,
        help: "cup depth above its floor" },
      { id: "wall", type: "mm", label: "wall", range: [1.2, 4], step: 0.2, default: 1.6,
        help: "cup wall and floor over the socket" },
    ] },
    { id: "frame", label: "FRAME", live: "commit", fields: [
      { id: "rim", type: "mm", label: "rim", range: [2, 6], step: 0.5, default: 3,
        help: "frame past the slots and the rung bars" },
    ] },
  ],
  presets: [
    { id: "default", label: "default", params: {}, note: "span 28, beams 0.50, 0.55, 0.60: about 108, 158 and 224 g at the snap (computed, modulus inferred)." },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }],
  assertions: [],
});

export type AccessSwitchCouponParams = ParamsOf<typeof chase>;
