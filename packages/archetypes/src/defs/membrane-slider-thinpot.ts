// membrane-slider-thinpot: D-096 split of seed row printed-membrane-slider
// (src/added.ts), ported at M06-T09 from the THINPOT original (thinpot.md
// 4.5). The port and its parity live in src/thinpot/.

import { provenArchetype } from "../def.js";
import { THINPOT_PARAMS, thinpotApply, thinpotDerive } from "../thinpot/strip.js";

export const membraneSliderThinpot = provenArchetype({
  version: "1.0.0",
  id: "membrane-slider-thinpot",
  family: "printed",
  channels: 1,
  senses: ["position"],
  emits: [
    "conductor",
    "conductor",
    "contact",
    "port",
    "port",
    "port",
  ],
  read: "adc",
  limits: [],
  provenance: "STYLUS THINPOT 2026-08",
  status: "proven",
  reference: ["sensors/membrane-slider-thinpot"],
  original: [
    { slug: "thinpot", file: "files/feeler_thinpot.html", fn: "thinpot", lines: "4022 to 4210", sha256: "35467f4b022178334c6aba422985854b6bc298927f5f552bc38e79465219b222", record: "thinpot 4.5" },
  ],
  params: THINPOT_PARAMS,
  derive: (p, profile) => thinpotDerive(p, profile),
  apply: (input) => thinpotApply(input, "membrane-slider-thinpot"),
});
