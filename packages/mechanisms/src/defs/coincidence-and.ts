// coincidence-and: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01, typed at M06-T02 and M06-T03: the TUMBLER module
// coin regenerates its parts, readouts and logic (tumbler.parity.test.ts);
// the original is the CANONS.md 11.1 row (D-222).

import { tumblerMechanism } from "../tumbler/canon.js";

export const coincidenceAnd = tumblerMechanism("coin", {
  id: "coincidence-and",
  family: "logic",
  dof: 1,
  governs: ["notched bar mounted backwards inverts the input"],
  failureModes: [],
  processes: [
    "laser",
    "fdm",
  ],
  provenance: "TUMBLER 2026-08",
  status: "typed",
  reference: ["mechanisms/coincidence-and"],
  original: [
    { slug: "tumbler", file: "files/tumbler.html", fn: "MODS coin", lines: "613 to 668", sha256: "fe14c0cd07d8b10f8852317942fb86aa6ae3e30d12b60af344890e68cbc47178", record: "tumbler 4.5" },
  ],
});
