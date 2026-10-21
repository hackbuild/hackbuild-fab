// designs/blocks/bench.ts
// The bench layout for BLOCKS, release 1 cut (chase.ts header). It sits
// outside defHash (D-174), so editing it moves no build hash.
//
// Steps follow blocks.html's strip PART, MATERIALS, BUILD, PRINT
// (knowledge/designs/blocks.md section 6, app3.js lines 73 to 81) less
// BUILD, the scene composer that waits for M10-T10. PART carries the part
// pick and the chosen part's parameters, as blocks.html's PART pane holds
// CATALOG and PARAMETERS. Goals are one sentence each, in the flex-pair
// voice; the part and materials goals name the materials. The welcome offers the two brick
// standards as its starts and preselects neither (D-087); the defaults
// behind it build the wire, which needs no standard. BLOCKS has no drive
// pad: blocks.html drives its circuits from SELECTED and BOARD PINS in the
// scene, which this cut does not carry. Cams are blocks.html's iso, top,
// front, under (app1.js lines 11 to 60).

import { defineBench } from "@hackbuild/spec";
import { chase } from "./chase";

export const bench = defineBench(chase, {
  shell: "paper",
  views: {
    default: "assembled", modes: ["assembled", "section", "layers", "plate"],
    render: ["solid", "xray"], overlays: ["cams", "legend", "hud", "busy", "welcome"],
    cams: ["iso", "top", "front", "under"], stage: "graph",
  },
  rail: [
    { step: "part", goal: "pick the pink TPU wire or the white PETG stud brick, its brick standard and its shape; a stud builds only once you choose boss v1 or blocks.", panels: ["params.pick", "params.wire", "params.brick"], focus: "standard" },
    { step: "materials", goal: "check the four filament slots, white PETG body, conductive PLA, pink TPU sheath and conductive TPU, and the fits the sockets take.", panels: ["materials", "fits"] },
    { step: "print", goal: "check the four filaments, clear the checks, and export the 3MF with every part in its print pose.", panels: ["exports", "checks", "materials", "print-time"], focus: "export", view: "plate" },
  ],
  welcome: {
    tagline: "printed wires and stud bricks that plug together",
    presets: ["boss-v1", "blocks-html"],
    starts: [
      { preset: "boss-v1", intent: "a stud brick on the boss v1 standard, 0.24 layers", process: "fdm, four filaments" },
      { preset: "blocks-html", intent: "a stud brick on the blocks standard, 0.20 layers", process: "fdm, four filaments" },
    ],
  },
  status: ["n_parts", "checks.verdict", "build.hash", "print.time"],
});
