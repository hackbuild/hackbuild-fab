// reference/keys/flex-pair/bench.ts
// The bench layout for keys flex-pair. It sits outside defHash (D-174), so
// editing it moves no build hash.
//
// Goals follow PIP's GUIDES (pip-controller bench/part3.js lines 253 to
// 258): one sentence per step naming the mechanism the step tunes. The
// worked example is preset "two", the print the reference tests build
// (test/reference.test.ts); it leads the welcome as PIP's "worked example"
// does (bench/part1.html line 202). The chase's list default builds one
// key, so the tagline names one or two.

import { defineBench } from "@hackbuild/spec";
import { chase } from "./chase";

export const bench = defineBench(chase, {
  shell: "paper",
  views: {
    default: "assembled", modes: ["assembled", "section", "layers", "plate"],
    render: ["solid", "xray"], overlays: ["cams", "legend", "hud", "drive", "busy", "welcome"],
    drive: { targets: "metrics.keys", gesture: "hold", contact: "contact", readout: ["logic", "ohm", "settle", "travel"], pickInView: true },
    cams: ["iso", "top", "front", "under"], stage: "graph",
  },
  rail: [
    { step: "pad", goal: "size the white PETG pad the keys sit on; its thickness follows the buried trace stack under them.", panels: ["params.pad"] },
    { step: "keys", goal: "place each pink TPU cone key and set its travel, the gap its conductive cap closes before the pin reads; hold a key in the drive pad to see it move.", panels: ["params.keys", "fits"], focus: "gap" },
    { step: "wire", goal: "set the width of the conductive PLA traces buried in the pad and pick clip pads or wire cups for the leads.", panels: ["params.wire", "nets", "hookup"] },
    { step: "print", goal: "check the four filaments, clear the checks, and export the 3MF with every part in its print pose.", panels: ["exports", "checks", "materials", "print-time"], focus: "export", view: "plate" },
  ],
  welcome: {
    tagline: "one or two printed keys on a flat pad",
    presets: ["two", "one"],
    starts: [
      { preset: "two", intent: "two keys, the worked example", process: "fdm, four filaments" },
      { preset: "one", intent: "one key to try the feel", process: "fdm, four filaments" },
    ],
  },
  status: ["n_parts", "checks.verdict", "nets.verdict", "build.hash", "print.time"],
});
