// reference/cosmetic/coin-inlay/chase.ts
// The reference for the `inlay` feature kind and CHK-INL-01 to 04 (M03-T08,
// D-058, D-059, D-105). A 44 mm coin 3.6 mm thick (COLLAR v5 defaults,
// collar.html line 644) on the ffc5p 0.24 mm preset: the front face carries
// the two hack.build mark paths, the wrench in slot 2 and the arc in slot 3
// (the colours COLLAR's logoSVG gives them, collar.html:2833); the back
// face carries one segmented ring in slot 3. Inlay depth 1.2 mm is 5 layers
// of 0.24 mm (computed), the light over dark floor of profile
// opacity.lightOverDark (inferred). A chase declares and never computes
// (D-178); the art, the layer count and the content address are in build.ts.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "coin-inlay", kind: "single", name: "COIN INLAY", version: 1, chase: 2,
    kernels: ["geom", "mesh", "inlay", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // COLLAR v5 slot colours (collar.html ST.slots): black body, the mark's
  // pink wrench and cream arc.
  materials: [
    { slot: 1, material: "petg", role: "body", label: "black", preview: "#1A1A1A" },
    { slot: 2, material: "petg", role: "art", label: "pink", preview: "#FE0386" },
    { slot: 3, material: "petg", role: "art", label: "cream", preview: "#F5F0E6" },
  ],
  params: [
    { id: "blank", label: "BLANK", live: "commit", fields: [
      { id: "dia", type: "mm", label: "diameter", range: [30, 60], step: 0.5, default: 44 },
      { id: "thk", type: "mm", label: "thickness", range: [2.4, 6], step: 0.24, default: 3.6,
        help: "on the 0.24 mm grid from 2.4" },
    ] },
    { id: "inlay", label: "INLAY", live: "commit", fields: [
      { id: "depth", type: "mm", label: "colour depth", range: [0.48, 1.68], step: 0.24, default: 1.2,
        help: "a whole number of layers; light over dark needs 1.2" },
      { id: "minF", type: "mm", label: "min feature", range: [0.6, 2], step: 0.05, default: 0.6 },
      { id: "boost", type: "mm", label: "stroke boost", range: [0, 0.5], step: 0.05, default: 0.15 },
      { id: "gap", type: "mm", label: "colour gap", range: [0, 1], step: 0.05, default: 0 },
      { id: "res", type: "int", label: "grid", range: [256, 1024], step: 128, default: 512, quality: true },
    ] },
    { id: "front", label: "FRONT", live: "commit", fields: [
      { id: "markSpan", type: "mm", label: "mark size", range: [10, 36], step: 1, default: 30,
        help: "the mark's 800 unit view box across, mm" },
    ] },
    { id: "back", label: "BACK", live: "commit", fields: [
      { id: "ringIn", type: "mm", label: "ring inner", range: [10, 20], step: 0.5, default: 18 },
      { id: "ringOut", type: "mm", label: "ring outer", range: [11, 21], step: 0.5, default: 20 },
      { id: "ringSeg", type: "int", label: "segments", range: [1, 48], step: 1, default: 12 },
      { id: "ringDuty", type: "number", unit: "percent", label: "duty", range: [10, 100], step: 5, default: 60 },
    ] },
  ],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }, { kind: "stl" }, { kind: "card" }],
  assertions: [],
});

/** The params type a build function sees. */
export type CoinInlayParams = ParamsOf<typeof chase>;
