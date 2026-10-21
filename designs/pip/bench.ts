// designs/pip/bench.ts
// The bench layout for PIP, release 1 cut (chase.ts header). It sits
// outside defHash (D-174), so editing it moves no build hash.
//
// Steps and goals follow PIP's GUIDES (haft-src bench/part3.js lines 253
// to 258, lineage pip.bench-part3): LAYOUT, BUTTONS, BOARD, PRINT, one
// sentence each in the flex-pair voice, naming the materials the step
// shapes. BOARD leaves out the wiring drawing and firmware the original
// offers there, which this cut does not emit. The drive pad holds the keys
// build.ts names as metrics drive.<key> (its targets group), several at
// once as PIP chords; contact is build.ts's ContactFn (G-20). The worked
// example leads the welcome as PIP's does (bench/part1.html line 202). The
// chase preset blank is left off the welcome: its id is the shell's own
// start blank (ui-core welcomeStarts), which already loads it.
// Cams are the original's iso, top, front, under.

import { defineBench } from "@hackbuild/spec";
import { chase } from "./chase";

export const bench = defineBench(chase, {
  shell: "paper",
  views: {
    default: "assembled", modes: ["assembled", "section", "layers", "plate"],
    render: ["solid", "xray"], overlays: ["cams", "legend", "hud", "drive", "busy", "welcome"],
    drive: { targets: "metrics.drive", gesture: "hold", contact: "contact", readout: ["logic", "ohm", "settle"], pickInView: true, chords: true },
    cams: ["iso", "top", "front", "under"], stage: "graph",
  },
  rail: [
    { step: "layout", goal: "shape the white PETG body and place the button groups, each with its own pink TPU flex cone, PETG click spring or conductive PLA touch comb.", panels: ["params.body", "params.left", "params.face", "params.menu", "params.shoulder"], focus: "shape" },
    { step: "buttons", goal: "tune the keys you picked, the click spring curve solved from its numbers and the conductive TPU contacts, then hold a key in the drive pad to see it close.", panels: ["params.flex", "params.clicky", "params.touch", "params.stick", "fits"], focus: "clickBeam" },
    { step: "board", goal: "seat the rp2040-zero on conductive bumps or wire cups in the white PETG pocket, set the bezel over it, and read the pin each key lands on.", panels: ["params.mount", "params.bezelGroup", "hookup", "nets"], focus: "mode", cam: "top" },
    { step: "print", goal: "set the buried conductive PLA routing, check the four filaments, clear the checks, and export the 3MF with every part in its print pose.", panels: ["exports", "checks", "materials", "params.routing", "params.plate", "print-time"], focus: "export", view: "plate" },
  ],
  welcome: {
    tagline: "a printed game controller with buried traces",
    presets: ["worked", "stick"],
    starts: [
      { preset: "worked", intent: "a flex d-pad, click face keys and touch menu keys, the worked example", process: "fdm, four filaments" },
      { preset: "stick", intent: "a tilt stick on the left and flex menu keys", process: "fdm, four filaments" },
    ],
  },
  status: ["n_parts", "checks.verdict", "nets.verdict", "build.hash", "print.time"],
});
