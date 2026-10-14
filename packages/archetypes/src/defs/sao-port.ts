// sao-port: D-096 addition (src/added.ts).
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const saoPort = refusedArchetype({
  id: "sao-port",
  family: "board",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [
    "SAO v1.69bis, 2x3 at 2.54, 3V3, GND, SDA, SCL, GPIO1, GPIO2, about 820 mW",
  ],
  provenance: "SAO v1.69bis, community spec text (D-096)",
  status: "candidate",
  statusReason: "no original under originals/, community spec text only; waits for the M08 board backend",
  original: [],
});
