// designs/bail/bench.ts
// The bench layout for BAIL. It sits outside defHash (D-174). Steps follow
// bail.html's strip (knowledge/designs/bail.md section 2): art, slide,
// clasp, ends, colour, print. The art step carries the art board, the
// `art` param of kind layers, with the inlay controls beside it. Goals are
// one sentence each.

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
    { step: "art", goal: "draw the front and back faces on the art board: text, shapes, marks, a scope trace or a seeded circuit, one filament slot per layer.", panels: ["params.artrow", "params.printrow"], focus: "art" },
    { step: "slide", goal: "pick the slide shape and size, the thickness, the rim band and the print pose.", panels: ["params.slide", "params.rimband"], focus: "shape" },
    { step: "clasp", goal: "pick a store back recess, twin printed bridges or buried channels for the cord, and grip fins in the flex slot.", panels: ["params.clasprow", "fits"], focus: "clasp" },
    { step: "ends", goal: "pick the tips that cap the cord, their size and the slots of their bands, or choose store bought kit tips.", panels: ["params.endsrow"], focus: "tips" },
    { step: "colour", goal: "check the four filament slots, ink, pink and cream PETG and the TPU grip, and which slot is the body.", panels: ["materials"] },
    { step: "print", goal: "clear the checks and export the 3MF with the slide and both tips laid out on the plate.", panels: ["exports", "checks", "materials", "print-time"], focus: "export", view: "plate" },
  ],
  welcome: {
    tagline: "multimaterial bolo ties. make things. break things. repeat.",
    presets: ["heatsync", "hackbuild", "scope", "trace", "mesa", "concho", "monogram", "hslcut", "custom"],
    starts: [
      { preset: "hackbuild", intent: "a round slide with the hack.build mark, bridges and TPU grip fins", process: "fdm, four filaments" },
      { preset: "heatsync", intent: "a scalloped concho with the HeatSync mark and a store back", process: "fdm, four filaments" },
      { preset: "custom", intent: "a blank round slide to put your own art on", process: "fdm, four filaments" },
    ],
  },
  status: ["n_parts", "checks.verdict", "build.hash", "print.time"],
});
