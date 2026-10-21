// designs/toggle/bench.ts
// The bench layout for TOGGLE (knowledge/designs/toggle.md section 6). It
// sits outside defHash (D-174), so editing it moves no build hash.
//
// The steps are the original's strip, STICK, BODY, FILAMENT and PRINT
// (6.3), and each goal is its GUIDE line (legacy/toggle.html lines 2723 to
// 2726) with the drag replaced by the hold the fab drive pad takes (6.2):
// a held direction tilts the stick to its stop through build.ts contact,
// the one function the pad, the readout and BENCH.drive call (G-20). No
// views.widgets entry yet: chase.validate holds no widget kind list, so a
// declared drive.tilt is refused E_REF. The stage is the graph grid
// on void (6.1); the original boots into solo4 (6.9), so the welcome leads
// with it as the worked example and offers the other two presets.

import { defineBench } from "@hackbuild/spec";
import { chase } from "./chase";

export const bench = defineBench(chase, {
  shell: "paper",
  views: {
    default: "assembled", modes: ["assembled", "section", "layers", "plate"],
    render: ["solid", "ghost", "xray"], overlays: ["cams", "legend", "hud", "drive", "busy", "welcome"],
    drive: { targets: "metrics.drive", gesture: "tilt", contact: "contact", readout: ["tilt", "dir", "logic", "pullupOhm"], pickInView: false },
    cams: ["iso", "top", "front", "under"], stage: "graph",
  },
  rail: [
    { step: "stick", goal: "shape the pink TPU neck, the conductive TPU contact collar, the travel and the thumb cap, then hold a direction in the drive pad to tilt it.", panels: ["params.stem", "params.travel", "params.cap", "fits"], focus: "tilt" },
    { step: "body", goal: "pick solo pins or a blocks brick in white PETG, the number of directions and the contacts, and read the hookup that updates with the build.", panels: ["params.base", "params.solo", "params.brick", "params.contacts", "params.phys", "nets", "hookup"], cam: "top" },
    { step: "filament", goal: "load four toolheads in blocks order, body PETG, conductive PLA, TPU and conductive TPU, one part per slot.", panels: ["materials"] },
    { step: "print", goal: "set the trace layers, clear the checks, and export the 3MF with every part in its print pose.", panels: ["params.print", "exports", "checks", "materials", "print-time"], focus: "export", view: "plate" },
  ],
  welcome: {
    tagline: "printed thumbsticks",
    presets: ["solo4", "solo8", "blocks8"],
    starts: [
      { preset: "solo4", intent: "a four way stick on header pins, the worked example", process: "fdm, four filaments" },
      { preset: "solo8", intent: "an eight way stick on nine pins", process: "fdm, four filaments" },
      { preset: "blocks8", intent: "an eight way stick on a blocks brick", process: "fdm, four filaments" },
    ],
  },
  status: ["n_parts", "checks.verdict", "nets.verdict", "build.hash", "print.time"],
});
