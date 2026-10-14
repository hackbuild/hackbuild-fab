// pi-hat-carrier: D-096 addition (src/added.ts).
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const piHatCarrier = refusedArchetype({
  id: "pi-hat-carrier",
  family: "board",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [
    "EEPROM and back-power diode are required checks; LUG rev A 65 x 56.5, 4 layers, 0 DRC errors lacks both",
  ],
  provenance: "LUG rev A (D-096)",
  status: "candidate",
  statusReason: "waits for the M08 board backend and its reference",
  original: [
    { slug: "lug", file: "files/lug.tsx", sha256: "ff88947cb61584f220eb8d2495e882ea1c2ca785972c3de872f165fe4d7a644d", record: "lug 4.1 to 4.7" },
  ],
});
