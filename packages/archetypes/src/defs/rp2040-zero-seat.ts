// rp2040-zero-seat: seed row of seed/archetypes.seed.yaml. Ported at M06-T09
// in press mode with bump or socket contacts (src/pip/seat.ts, pip.md 5.7),
// with parity in test/pip-seat.parity.test.ts; its reference is
// seats/rp2040-zero-pressfit. Senses, emits, limits and
// provenance mirror the seed. GUDGEON's header cup variant stays a candidate
// option (seats/rp2040-zero-header-cups, M11-T09, M06-T14); its original is
// listed so the option keeps its source.

import { provenArchetype } from "../def.js";
import { SEAT_PARAMS, seatApply, seatDerive } from "../pip/seat.js";

export const rp2040ZeroSeat = provenArchetype({
  version: "1.0.0",
  id: "rp2040-zero-seat",
  family: "printed",
  channels: null,
  senses: [],
  emits: [
    "pocket",
    "contact",
    "port",
    "window",
  ],
  read: "none",
  limits: [
    "cup gap 2.0 under a trace lane of 3.0 (computed: pitch 5.2 less od 3.2; w 1.4 plus two 0.8 clearances); traces route around the cup row",
    "read charge-release; keys wait 3500 us in emitted firmware until a coupon calibrates (measured crossings 113 to 2431 us); pip.ino still ships 200 us",
  ],
  provenance: "HAFT 2026-09-18, BAFFLE 2026-08, GUDGEON 2026-09",
  status: "proven",
  reference: ["seats/rp2040-zero-pressfit"],
  original: [
    { slug: "pip", file: "files/haft-src/src/model.js", lines: "180 to 248", sha256: "95a996433e54d586cdaa970a844ee8f8f02196f80b23ba36983c95ed456d1f34", record: "pip 5.7" },
    { slug: "pip", file: "files/haft-src/src/layout.js", fn: "zeroPads, board placement, used pins", lines: "10 to 21, 177 to 184, 393 to 417", sha256: "2d1c6c10554b5c7d8dc333496529abee82e937d2d3fe85c41a8d7ee22bb2468c", record: "pip 5.7" },
    { slug: "gudgeon", file: "files/extracted/05_part2d_circuit.js", lines: "9 to 27", sha256: "796b2f58884e20e86b180eaa4a9647a0f90160d09c3227a1a0c13ed0232c9a3b", record: "gudgeon 5.7; baffle-r3 4.5" },
  ],
  params: SEAT_PARAMS,
  derive: (p, profile) => seatDerive(p, profile),
  apply: (input) => seatApply(input, "rp2040-zero-seat"),
});
