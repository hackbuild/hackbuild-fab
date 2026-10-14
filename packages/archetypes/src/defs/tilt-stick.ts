// tilt-stick: seed row of seed/archetypes.seed.yaml. The PIP preset is ported
// in src/pip/ (M06-T08) and the TOGGLE presets solo4, solo8 and blocks8 in
// src/toggle/ (M06-T09); src/toggle/tilt.ts dispatches by preset. Senses,
// emits and provenance mirror the seed, limits carry the D-096 corrections
// (src/corrections.ts). Its references sticks/pip-stick (PIP preset) and
// sticks/tilt-stick-4 (TOGGLE solo4) pass parity and check.run; it stays a
// candidate on the virtual print of the TOGGLE preset (statusReason).

import { candidateArchetype } from "../def.js";
import { TILT_STICK_PARAMS } from "../toggle/tilt.js";
import { shippedProfile } from "../resistance.js";
import { stickSections } from "../pip/sections.js";

export const tiltStick = candidateArchetype({
  id: "tilt-stick",
  family: "printed",
  channels: 4,
  senses: [
    "direction-4",
    "direction-8",
  ],
  emits: [
    "conductor",
    "contact",
    "port",
  ],
  read: "charge-release",
  limits: [
    "prints in place with no support on four heads; spring-back is exponential over about 60 ms",
    "not frame counted; band clearance must be checked by radial sampling not bbox",
    "with a riser that lifts the band when geometry alone is too close",
    "read charge-release; thumb pad printed in place; 470k only in the TOGGLE preset at Protopasta 30 ohm cm",
  ],
  provenance: "TOGGLE 2026-09",
  status: "candidate",
  statusReason: "PIP and TOGGLE presets ported with parity (src/pip/stick.ts, src/toggle/: fits rows, solver numbers, stem stress 54.83 MPa, per-slot volumes within 1e-3 mm3); references sticks/pip-stick and sticks/tilt-stick-4 pass hbf parity and check.run (CHK-PRT-05 warns) since CHK-PRT-03 2.0.0 measures overlap against the kernel union before the D-054 snap and CHK-PRT-04 2.0.0 measures walls per z band; the virtual print of sticks/pip-stick is clean (0 foreign deposits, 0 nets bridged, computed), but sticks/tilt-stick-4 has 1.248 mm2 of the TPU stick printed by the PETG tool as an internal bridge at layer 40 (Orca-Flashforge 2.3.2, computed), and the owner's own TOGGLE solo4 save sliced the same way shows the same 1.253 mm2 at the same layer, so the slicer's bridge over the stem is the original's; promotes in M06-T09 when the owner accepts that bridge or a print shows the stem clean (owner question, evidence in fab-knowledge/evidence/m06-unblock)",
  original: [
    { slug: "toggle", file: "files/src/src/part2d.js", fn: "lathes, collar, well pads", lines: "394 to 414, 23 to 42, 407 to 412, 283 to 292", sha256: "1da486e757df5334a0a920dd40cb54ef1d9780a39ffec7c4c919b3635f951523", record: "toggle 5.1 to 5.7" },
    { slug: "toggle", file: "files/src/src/part2b.js", fn: "solver", lines: "10 to 255", sha256: "c8acaba6c3ff3acffb63b7496c8398076b1ae4fa4ebbbcecfdd0da57289d6c02", record: "toggle 5.1 to 5.7" },
    { slug: "pip", file: "files/haft-src/src/model.js", lines: "137 to 177", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip 5.4" },
    { slug: "pip", file: "files/haft-src/src/layout.js", fn: "stickDims", lines: "115 to 147", sha256: "2d1c6c10554b5c7d8dc333496529abee82e937d2d3fe85c41a8d7ee22bb2468c", record: "pip 5.4" },
  ],
  sections: stickSections(shippedProfile()),
  params: TILT_STICK_PARAMS,
});
