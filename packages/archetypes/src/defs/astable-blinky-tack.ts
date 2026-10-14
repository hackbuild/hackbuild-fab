// astable-blinky-tack: D-096 split of seed row astable-blinky (src/added.ts).
// Registered at M06-T01. Senses, emits, limits and provenance mirror the
// seed; read and channels are the CANONS.md 4.1 working values that M06-T07
// confirms against the original named below (D-222).

import { refusedArchetype } from "../def.js";

export const astableBlinkyTack = refusedArchetype({
  id: "astable-blinky-tack",
  family: "board",
  channels: 0,
  senses: [],
  emits: [
    "pad",
    "conductor",
  ],
  read: "none",
  limits: [
    "NE555 will not oscillate on a 3 V coin cell; pink LED Vf marginal at 3 V",
    "100k, 10 uF, about 0.72 Hz (design value, plan-deltas R47)",
  ],
  provenance: "TACK 2026-08",
  status: "candidate",
  statusReason: "TACK's astable is a PCB built by pin.py inside files/tack-rev-a.zip; its reference boards/tack-pin is written in M08 with the board backends (D-089), not present on 2026-10-09",
  original: [
    { slug: "tack", file: "files/tack-rev-a.zip", fn: "pin.py run_gates", lines: "323 to 398", sha256: "069f16b8de66b0413e4693d22fffcc43e99004bd057021de7fed9f13f75ecb90", record: "tack 4.1 to 4.6" },
  ],
});
