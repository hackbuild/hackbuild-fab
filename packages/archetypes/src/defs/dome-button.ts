// dome-button: seed row of seed/archetypes.seed.yaml, ported at M06-T09
// from the THINPOT original (thinpot.md 4.3, 4.4). The port and its parity
// live in src/thinpot/ (thinpot.parity.test.ts: readouts, fits, per-part
// volumes and posed bounding boxes equal the original, bowl and cone). It
// stays refused: its reference fails check.run (statusReason).

import { candidateArchetype } from "../def.js";
import { SWITCH_PARAMS } from "../thinpot/switch.js";

export const domeButton = candidateArchetype({
  id: "dome-button",
  family: "printed",
  channels: 1,
  senses: ["press"],
  emits: ["conductor", "contact", "pocket"],
  read: "charge-release",
  limits: [
    "plug radius at most 0.4 rimR",
    "0.4 to 1.0 thick; in-place contact gap 35 to 50 percent of cavity and never under 1.2; budget half the cavity as usable stroke; anything hanging in mid air prints as its own posed part",
  ],
  provenance: "STYLUS 2026-08 (four printed passes)",
  status: "candidate",
  statusReason: "ported with parity (src/thinpot/switch.ts): readouts, fits and per-part volumes within 1e-3 mm3 equal the original; its reference buttons/dome builds but fails CHK-PRT-13: overhang 74.377 deg against 45 (profile overhang.maxDeg, inferred) over 133.07 mm2 of the flip bowl's quarter-ellipse shoulder, starting just over the 0.35 mm bed band, in the original's own print pose (computed 2026-10-10); the original's own in-place export feeler-ladder-inplace-sample.3mf reads 48.885 deg past 45 over 643.17 mm2 of its domes by the same rule (computed); the owner printed the bowl (thinpot.md provenance), so the check row or the TPU overhang limit needs an owner answer, default in force: 45 deg and the entry stays candidate; promotes in M06-T09 or M10 STYLUS when it closes (owner question, evidence in fab-knowledge/evidence/m06-unblock/dome)",
  original: [
    { slug: "thinpot", file: "files/feeler_thinpot.html", fn: "switch, domeCap, domeCone", lines: "1700 to 1846, 1352 to 1418, 1299 to 1350", sha256: "35467f4b022178334c6aba422985854b6bc298927f5f552bc38e79465219b222", record: "thinpot 4.3, 4.4" },
  ],
  params: SWITCH_PARAMS,
});
