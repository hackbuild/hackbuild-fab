// membrane-valve: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01, typed at M06-T02 and M06-T03: the TUMBLER module
// memb regenerates its parts, readouts and logic (tumbler.parity.test.ts);
// the original is the CANONS.md 11.1 row (D-222).

import { tumblerMechanism } from "../tumbler/canon.js";

export const membraneValve = tumblerMechanism("memb", {
  id: "membrane-valve",
  family: "fluid",
  dof: null,
  governs: [],
  failureModes: [],
  processes: [],
  provenance: "TUMBLER 2026-08",
  status: "typed",
  reference: ["mechanisms/membrane-valve"],
  original: [
    { slug: "tumbler", file: "files/tumbler.html", fn: "MODS memb", lines: "1633 to 1706", sha256: "fe14c0cd07d8b10f8852317942fb86aa6ae3e30d12b60af344890e68cbc47178", record: "tumbler 4.5" },
  ],
});
