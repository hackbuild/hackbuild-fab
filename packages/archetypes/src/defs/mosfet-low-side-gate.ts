// mosfet-low-side-gate: seed row of seed/archetypes.seed.yaml.
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const mosfetLowSideGate = refusedArchetype({
  id: "mosfet-low-side-gate",
  family: "board",
  channels: 1,
  senses: [],
  emits: [
    "pad",
    "pad",
    "pad",
    "conductor",
    "conductor",
    "conductor",
    "port",
    "port",
  ],
  read: "none",
  limits: [],
  provenance: "SPINDLE R1, TRUNNION 2026-08",
  status: "candidate",
  statusReason: "waits for the M08 board backend and its reference",
  original: [
    { slug: "trunnion", file: "files/trunnion.kicad_pcb", sha256: "632e04b1be088d632c75fb861603f52caa163639762a0a9221af19f7325e8ac9", record: "trunnion 5.2" },
    { slug: "trunnion", file: "files/trunnion.ino", fn: "setup()", sha256: "5cd8c4ccf0c0125c96dc5a2295844c7ac8a1bb4cd23dac55917c3eb839da458b", record: "trunnion 5.2" },
  ],
});
