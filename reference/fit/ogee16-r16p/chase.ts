// reference/fit/ogee16-r16p/chase.ts
// The OGEE R16-P fits table (M01-T09): every param fits.py reads, at the
// values the bench shipped. fits.py reads params.scad through kin.py and
// mirrors printed.scad constants in its own PR dict (fits.py lines 42 to
// 50); here both sets are declared once, so the table never keeps its own
// copy of the numbers it audits (knowledge/designs/ogee16.md 4.8). A chase
// declares and never computes (D-178): each params.scad or fits.py
// expression is a derived field whose value build.ts computes.
//
// Sources (lineage ogee16.params/r16p and ogee16.fits/r16p, read from
// ogee16-source.zip, sha256 47d6077e...): params.scad lines 18 to 34 (T and
// the laser fits), 66 (LUG_W), 80 to 96 (pin, notch, rod slot, cam), 103 to
// 107 (cap), 112 to 114 (pivots), 154 (crank bore) and 174 (TAB_W); fits.py
// lines 46 to 50 (the printed.scad mirror) and 62 (the barb literals 0.15,
// 3.8 and 0.10).
// Defaults land on their step from the range minimum (G-09). FIT_SLIDE
// carries constraintDim fit.drawn, so the parity edit (one step up, 0.76)
// moves the coupon bore and every row FIT_SLIDE feeds.

import { defineChase, type ParamsOf } from "@hackbuild/spec";

export const chase = defineChase({
  meta: {
    id: "ogee16-r16p-fits", kind: "single", name: "OGEE R16-P FITS", version: 1, chase: 2,
    kernels: ["geom", "mesh", "profile", "3mf"], machines: ["ffc5p"],
    license: "CC-BY-SA-4.0",
  },
  // R16-P prints in PETG on a Creator 5 Pro (knowledge/designs/ogee16.md 2).
  materials: [
    { slot: 1, material: "petg", role: "body", label: "coupon", preview: "#F4F1EA" },
  ],
  params: [
    { id: "sheet", label: "SHEET AND LASER FITS", live: "commit", fields: [
      { id: "T", type: "mm", label: "sheet", range: [1, 6], step: 0.5, default: 3, help: "sheet thickness, params.scad T" },
      { id: "FIT_SLIP", type: "mm", label: "slip", range: [0, 1], step: 0.01, default: 0.4, help: "laser part sliding in a laser slot" },
      { id: "PRINT_OVER", type: "mm", label: "print over", range: [0, 0.5], step: 0.01, default: 0.15, help: "how much a printed feature exceeds its drawn size" },
      { id: "PSLIP_GIVE", type: "mm", label: "pslip give", range: [0, 0.5], step: 0.01, default: 0.15, help: "extra give in FIT_PSLIP after 0.55 drawn felt tight" },
      { id: "FIT_PSLIP", type: "derived", label: "pslip", fn: "FIT_PSLIP", unit: "mm", help: "FIT_SLIP + PRINT_OVER + PSLIP_GIVE, computed" },
      { id: "FIT_LAP", type: "mm", label: "lap", range: [0, 0.5], step: 0.01, default: 0.15, help: "tab in slot" },
      { id: "FIT_TEN", type: "mm", label: "tenon", range: [0, 0.5], step: 0.01, default: 0.15, help: "rod tenon in the cap mortise" },
      { id: "FIT_BORE", type: "mm", label: "bore", range: [0, 1], step: 0.01, default: 0.4, help: "link bore over the pin" },
      { id: "LUG_W", type: "mm", label: "lug", range: [6, 20], step: 0.5, default: 12, help: "pivot lug width" },
      { id: "TAB_W", type: "mm", label: "tab", range: [4, 20], step: 0.5, default: 10, help: "frame tab width" },
    ] },
    { id: "rod", label: "ROD AND CAP", live: "commit", fields: [
      { id: "ROD_D", type: "mm", label: "rod", range: [2, 5], step: 0.1, default: 3, help: "pivot rod diameter" },
      { id: "LUG_GRIP", type: "mm", label: "lug grip", range: [0, 0.5], step: 0.01, default: 0.1, help: "lug bore under the rod, params.scad LUG_BORE = ROD_D - 0.10" },
      { id: "LUG_BORE", type: "derived", label: "lug bore", fn: "LUG_BORE", unit: "mm", help: "ROD_D - LUG_GRIP, computed" },
      { id: "LINK_BORE", type: "derived", label: "link bore", fn: "LINK_BORE", unit: "mm", help: "ROD_D + FIT_BORE, computed" },
      { id: "CRANK_BORE", type: "derived", label: "crank bore", fn: "CRANK_BORE", unit: "mm", help: "ROD_D + FIT_BORE, computed" },
      { id: "PIN_W", type: "mm", label: "pin", range: [6, 14], step: 0.5, default: 10, help: "rod pin width" },
      { id: "LUG_P", type: "mm", label: "lug proud", range: [0.5, 2.5], step: 0.05, default: 1.25, help: "latch lug proud of the rod" },
      { id: "NOTCH_W", type: "mm", label: "notch", range: [3, 6], step: 0.05, default: 4.45, help: "notch width" },
      { id: "SLOT_E", type: "mm", label: "slot end", range: [3, 9], step: 0.05, default: 6.05, help: "rod slot end" },
      { id: "PIN_PLAY", type: "derived", label: "pin play", fn: "PIN_PLAY", unit: "mm", help: "(NOTCH_W - T) / 2, computed" },
      { id: "CAM", type: "derived", label: "cam", fn: "CAM", unit: "mm", help: "PIN_W / 2 + LUG_P + PIN_PLAY - SLOT_E, computed" },
      { id: "SLOT_X", type: "derived", label: "rod slot", fn: "SLOT_X", unit: "mm", help: "T + FIT_PSLIP, computed" },
      { id: "CAP_D", type: "mm", label: "cap", range: [8, 24], step: 0.5, default: 16, help: "cap across flats" },
      { id: "CAP_GIVE", type: "mm", label: "cap give", range: [0, 1], step: 0.01, default: 0.5, help: "cap aperture clearance before print over" },
      { id: "CAP_FIT", type: "derived", label: "cap fit", fn: "CAP_FIT", unit: "mm", help: "CAP_GIVE + PRINT_OVER, computed" },
    ] },
    { id: "printed", label: "PRINTED FITS", live: "commit", fields: [
      { id: "FIT_SLIDE", type: "mm", label: "slide", range: [0.3, 1.2], step: 0.01, default: 0.75,
        constraintDim: "fit.drawn", help: "printed slide clearance across the joint" },
      { id: "FIT_LOCATE", type: "mm", label: "locate", range: [0, 1], step: 0.01, default: 0.3, help: "printed locate clearance; fits.py carries it and no row reads it" },
      { id: "FIT_PRESS", type: "mm", label: "press", range: [0, 0.5], step: 0.01, default: 0.1, help: "printed press clearance" },
      { id: "SHAFT_D", type: "mm", label: "shaft", range: [4, 12], step: 0.5, default: 8, help: "hand drive shaft" },
      { id: "LTAB_W", type: "mm", label: "latch tab", range: [4, 12], step: 0.5, default: 8, help: "latch pull tab" },
      { id: "PRINT_SHRINK", type: "mm", label: "frame shrink", range: [0, 0.2], step: 0.01, default: 0.05, help: "every printed frame profile shrinks this all round" },
      { id: "PRINT_GAP", type: "derived", label: "print gap", fn: "PRINT_GAP", unit: "mm", help: "FIT_SLIDE / 2, computed" },
      { id: "PIN_SH_D", type: "derived", label: "pin shank", fn: "PIN_SH_D", unit: "mm", help: "LINK_BORE - FIT_SLIDE, computed" },
      { id: "BOSS_D", type: "derived", label: "drive boss", fn: "BOSS_D", unit: "mm", help: "T + FIT_SLIP - FIT_SLIDE, computed" },
    ] },
    { id: "barb", label: "PIVOT BARB", live: "commit", fields: [
      { id: "BARB_D", type: "mm", label: "barb", range: [2, 6], step: 0.1, default: 3.8, help: "barb ledge diameter, printed.scad a_pivot" },
      { id: "BARB_OVER", type: "mm", label: "barb over", range: [0, 0.5], step: 0.01, default: 0.1, help: "the barb prints over its drawn size" },
      { id: "BARB_UNDER", type: "mm", label: "lug under", range: [0, 0.5], step: 0.01, default: 0.15, help: "the lug bore prints under its drawn size" },
    ] },
    { id: "coupon", label: "COUPON", live: "commit", fields: [
      { id: "COUPON_WALL", type: "mm", label: "wall", range: [1, 6], step: 0.5, default: 2, help: "ring wall around the first row's bore" },
    ] },
  ],
  presets: [],
  build: { module: "./build.ts", fn: "build" },
  exports: [{ kind: "3mf", machine: "ffc5p", pose: "print" }],
  assertions: [],
});

/** The params type a build function sees. */
export type OgeeFitsParams = ParamsOf<typeof chase>;
