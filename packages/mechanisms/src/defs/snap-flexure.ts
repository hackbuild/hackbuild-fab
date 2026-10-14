// snap-flexure: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01, typed at M06-T02 and M06-T03: the TUMBLER module
// snap regenerates its parts, readouts and logic (tumbler.parity.test.ts);
// the original is the CANONS.md 11.1 row (D-222).

import { tumblerMechanism } from "../tumbler/canon.js";

export const snapFlexure = tumblerMechanism("snap", {
  id: "snap-flexure",
  family: "memory",
  dof: null,
  governs: [
    "beam formed by two crescent holes so it stays attached",
    "rise over thickness > 2.31 for bistability",
  ],
  failureModes: [],
  processes: [],
  provenance: "TUMBLER 2026-08",
  status: "typed",
  reference: ["mechanisms/snap-flexure"],
  original: [
    { slug: "tumbler", file: "files/tumbler.html", fn: "MODS snap", lines: "1036 to 1082", sha256: "fe14c0cd07d8b10f8852317942fb86aa6ae3e30d12b60af344890e68cbc47178", record: "tumbler 4.5" },
  ],
});
