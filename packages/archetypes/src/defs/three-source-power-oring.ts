// three-source-power-oring: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const threeSourcePowerOring = refusedArchetype({
  id: "three-source-power-oring",
  family: "board",
  channels: 0,
  senses: [],
  emits: [
    "pad",
    "port",
    "port",
    "port",
  ],
  read: "none",
  limits: [],
  provenance: "ARMATURE 2026-08",
  status: "unproven",
  statusReason: "D-096 demotion: in ARMATURE-R1.net the D11 cathode sits on no net and R13 on VBUS_F only, so VIN neither charges nor disables the boost",
  original: [
    { slug: "armature", file: "files/ARMATURE-R1.net", sha256: "8dbc349ca7a59479f96f07f8299afa5af5f277bb652bf305fcfa09afca5a8f58", record: "armature 5.8" },
  ],
});
