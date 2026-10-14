// reference/joints/balance-beam/chase.ts
// The pin-free-balance-beam mechanism reference (M06-T06): STIPPLE R17b's
// link at the page's DATA.P (originals/stipple/files/stipple-r17b.html
// line 117), cut from 1.5 mm sheet (DATA.P.T). The page names no sheet
// material; sheet15 names the slot and no profile row backs it, so no
// check reads a number from it. A chase declares and never computes
// (D-178): the field ids are the mechanism's params, and build.ts runs its
// apply().

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "balance-beam", kind: "single", name: "PIN FREE BALANCE BEAM", version: 1, chase: 2,
    kernels: ["geom", "mesh", "nest"], machines: ["sheet600"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "sheet15", role: "body", label: "sheet", preview: "#F4F1EA" },
  ],
  params: [
    { id: "pose", label: "TOOTH LIFTS", live: "commit", fields: [
      { id: "zRow", type: "mm", label: "row tooth lift", range: [0, 10], step: 0.1, default: 5, help: "row tooth lift; half select lifts the row by stroke" },
      { id: "zCol", type: "mm", label: "column tooth lift", range: [0, 10], step: 0.1, default: 0, help: "column tooth lift; 0 at half select" },
      { id: "stroke", type: "mm", label: "stroke", range: [1, 10], step: 0.1, default: 5, help: "select stroke, DATA.P.STROKE (r17b; r17 is 4.8)" },
    ] },
    { id: "link", label: "LINK", live: "commit", fields: [
      { id: "crownR", type: "mm", label: "crown radius", range: [1, 12], step: 0.1, default: 6, help: "crown radius, DATA.P.CROWN_R; the outline is drawn at 6" },
      { id: "crownTop", type: "mm", label: "crown top at rest", range: [0, 100], step: 0.1, default: 55, help: "crown top at rest, DATA.P.CROWN_TOP" },
      { id: "noseR", type: "mm", label: "nose radius", range: [0.5, 5], step: 0.1, default: 2, help: "nose radius on the column tooth, DATA.P.NOSE_R; the outline is drawn at 2" },
      { id: "bossR", type: "mm", label: "boss radius", range: [0.5, 5], step: 0.1, default: 1.6, help: "boss radius in the row tooth, DATA.P.BOSS_R; the outline is drawn at 1.6" },
      { id: "linkL", type: "mm", label: "link length", range: [4, 30], step: 0.1, default: 12, help: "link length between contact centres, DATA.P.LINK_L; the outline is drawn at 12" },
      { id: "rtFloor", type: "mm", label: "row slot floor", range: [0, 100], step: 0.1, default: 47.4, help: "row tooth slot floor, DATA.P.RT_FLOOR" },
      { id: "ctFloor", type: "mm", label: "column slot floor", range: [0, 100], step: 0.1, default: 47, help: "column tooth slot floor, DATA.P.CT_FLOOR" },
      { id: "t", type: "mm", label: "sheet t", range: [0.5, 6], step: 0.1, default: 1.5, help: "sheet thickness, DATA.P.T, the depth geomOf extrudes" },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [],
  assertions: [],
});

/** The params type a build function sees. */
export type Params = ParamsOf<typeof chase>;
