// reference/keys/access-switch/bench.ts
// The bench layout for the access switch flagship (plan v9 section 6,
// release 1 "designs"). It sits outside defHash (D-174), so editing it
// moves no build hash.
//
// drive.press is the drive pad with gesture hold (plan v9 section 3.2):
// the one target is the click-spring-key the build places, and a hold
// presses the paddle to its stop. plot.curve is the "plot.press" panel:
// the spring's sampled force curve, the press claim band from claim.ts
// and the contact travel, both reading build.ts `contact` (G-20). Goals
// follow PIP's GUIDES (pip-controller bench/part3.js lines 253 to 258):
// one sentence per step naming the mechanism the step tunes.

import { defineBench } from "@hackbuild/spec";
import { chase } from "./chase";

export const bench = defineBench(chase, {
  shell: "paper",
  views: {
    default: "assembled", modes: ["assembled", "section", "layers", "plate"],
    render: ["solid", "xray"], overlays: ["cams", "legend", "hud", "drive", "busy", "welcome"],
    drive: { targets: "metrics.click-spring-key", gesture: "hold", contact: "contact", readout: ["logic", "ohm", "travel", "force"], pickInView: true },
    cams: ["iso", "top", "front", "under"], stage: "graph",
  },
  plots: {
    press: {
      metric: "click-spring-key.0.spring.curve",
      x: { label: "travel", unit: "mm" }, y: { label: "force", unit: "N" },
      marks: ["contact", "peak"],
      band: { lo: "claim.press.lo", hi: "claim.press.hi" },
    },
  },
  rail: [
    { step: "spring", goal: "set the span and beam of the white PETG click spring; the curve shows the force you push through before its tip closes the contact.", panels: ["params.spring", "plot.press", "fits"], focus: "t" },
    { step: "paddle", goal: "size the round PETG paddle that rests on the spring cap, then hold the drive pad to press it to its stop and read the force.", panels: ["params.paddle", "plot.press"], focus: "D" },
    { step: "jack", goal: "set the PETG body wall that seats the jack, where conductive PLA leads run from the key to its tip and sleeve sockets.", panels: ["params.body", "nets"] },
    { step: "print", goal: "check the four filaments, clear the checks, and export the 3MF with every part in its print pose.", panels: ["exports", "checks", "materials", "print-time"], focus: "export", view: "plate" },
  ],
  welcome: {
    tagline: "one big printed switch with a jack",
    presets: ["default"],
    starts: [
      { preset: "default", intent: "one switch and a jack, the worked example", process: "fdm, four filaments" },
    ],
  },
  status: ["n_parts", "checks.verdict", "nets.verdict", "build.hash", "print.time"],
});
