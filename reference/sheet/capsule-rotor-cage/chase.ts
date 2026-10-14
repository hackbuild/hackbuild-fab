// reference/sheet/capsule-rotor-cage/chase.ts
// The capsule-pocket-rotor mechanism reference (M06-T06): SLUG's drum cage
// at slug.scad's assignments (originals/slug/files/slug.scad lines 20 to
// 68), cut from 3 mm ply (t, line 23; profile row ply3). A chase declares
// and never computes (D-178): the field ids are the mechanism's params,
// and build.ts runs its apply(). The pocket range is audit.py's two
// thresholds on it (lines 52 and 56: clearance per side at least 3 mm,
// web between pockets over 3 mm; computed 56.8 and 64.17 mm); the slop
// range keeps audit.py's slip fit under 0.4 mm total (line 105).

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "capsule-rotor-cage", kind: "single", name: "CAPSULE ROTOR CAGE", version: 1, chase: 2,
    kernels: ["geom", "mesh", "nest"], machines: ["sheet600"],
    license: "CC-BY-SA-4.0",
  },
  materials: [
    { slot: 1, material: "ply3", role: "body", label: "ply", preview: "#D9B98A" },
  ],
  params: [
    { id: "drum", label: "DRUM", live: "commit", fields: [
      { id: "pockD", type: "mm", label: "pocket dia", range: [56.8, 64.1], step: 0.1, default: 62, help: "pocket diameter, pock_d; a 50.8 mm capsule needs 3 mm a side" },
      { id: "slop", type: "mm", label: "slot slop", range: [0, 0.19], step: 0.01, default: 0.15, help: "slot widening per side, slop; cut with kerf compensation off" },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [],
  assertions: [],
});

/** The params type a build function sees. */
export type Params = ParamsOf<typeof chase>;
