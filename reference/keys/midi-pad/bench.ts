// reference/keys/midi-pad/bench.ts
// The bench layout for keys midi-pad. It sits outside defHash (D-174), so
// editing it moves no build hash.
//
// Goals follow PIP's GUIDES (pip-controller bench/part3.js lines 253 to
// 258) in the flex-pair voice: one sentence per step naming the mechanism
// the step tunes. The fader stays a param in its step until the engine's
// drive.fader widget lands; the drive pad holds the four keys only.

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
    { step: "keys", goal: "set the pitch of the four pink TPU cone keys; each conductive cap closes its gap before the pin reads, so hold a key in the drive pad to see it move.", panels: ["params.keys", "fits"], focus: "pitch" },
    { step: "fader", goal: "set the throw of the pink TPU membrane fader and the width of its conductive PLA wiper lead, which sets the resistance the gp26 adc reads through.", panels: ["params.fader", "nets"], focus: "len" },
    { step: "board", goal: "seat the rp2040-zero in its press-fit pocket in the white PETG body, set the wall around it, and read the pin each key and fader lead lands on.", panels: ["params.body", "hookup"], cam: "top" },
    { step: "print", goal: "check the four filaments, clear the checks, and export the 3MF with every part in its print pose.", panels: ["exports", "checks", "materials", "print-time"], focus: "export", view: "plate" },
  ],
  welcome: {
    tagline: "four printed keys and a fader on one board",
    presets: ["default"],
    starts: [
      { preset: "default", intent: "a midi pad, the worked example", process: "fdm, four filaments" },
    ],
  },
  status: ["n_parts", "checks.verdict", "nets.verdict", "build.hash", "print.time"],
});
