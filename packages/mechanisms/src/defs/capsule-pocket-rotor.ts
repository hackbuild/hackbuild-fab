// capsule-pocket-rotor: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01; derive() ported at M06-T05 from slug.scad's
// assignments (src/derive/capsule-rotor.ts) and typed at M06-T06 when its
// bodies, the drum cage of slug.scad lines 171 to 213
// (src/bodies/slug-cage.ts), regenerated the original's baked outlines
// under the originals rule (test/capsule-rotor.body.test.ts). The original
// is the CANONS.md 11.1 row (D-222).

import type { MechanismDef } from "@hackbuild/spec";
import { CAPSULE_ROTOR_PARAMS, capsuleRotorDerive } from "../derive/capsule-rotor.js";
import { inputSchema, type Values } from "../derive/common.js";
import { capsuleRotorApply } from "../bodies/slug-cage.js";

export const capsulePocketRotor: MechanismDef<Values> = {
  id: "capsule-pocket-rotor",
  version: "1.0.0",
  family: "metering",
  dof: null,
  params: inputSchema(CAPSULE_ROTOR_PARAMS),
  derive: (p, profile) => capsuleRotorDerive(p, profile),
  apply: (input) => capsuleRotorApply(input),
  governs: [
    "the pocket is the only metering element",
    "moving rotor face within ~2 mm of the funnel mouth to shear arches",
    "mouth >= 2 capsule diameters or spheres arch",
    "a hood covers the exit half of the ceiling or the hopper drains",
  ],
  failureModes: [],
  processes: ["laser"],
  provenance: "SLUG 2026-08 (126/128 vends across 8 trials)",
  status: "typed",
  reference: ["sheet/capsule-rotor-cage"],
  original: [
    { slug: "slug", file: "files/slug.scad", fn: "gear2d, rotor_common, rotor_gear, rotor_ring, rotor_top, spacer", lines: "20 to 68, 171 to 213", sha256: "a5990b866b0829282ec7dc9b6f090c64c447c8f1a3432164b279ebc8dcf3fef6", record: "slug 5, 6" },
    { slug: "slug", file: "files/slug.html", fn: "OUTLINES, PART_QTY", lines: "272, 1042 to 1050", sha256: "2d09238c27d5ca4bf023eeee44939b1500470ad2058822b8d0add48ec9bf3241", record: "slug 4, 12" },
  ],
};
