// The bench for rail-ends-in-check: its last step is check, not print or
// make, so chase.validate refuses it with E_SCHEMA at /rail/1/step.

import { defineBench } from "@hackbuild/spec";
import { chase } from "./chase";

export const bench = defineBench(chase, {
  shell: "paper",
  views: { default: "assembled", modes: ["assembled"], render: ["solid"], overlays: ["cams", "legend"] },
  rail: [
    { step: "plate", goal: "size the plate.", panels: ["params.plate"] },
    { step: "check", goal: "read the checks.", panels: ["checks"] },
  ],
});
