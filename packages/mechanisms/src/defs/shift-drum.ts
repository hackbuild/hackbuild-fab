// shift-drum: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01, typed at M06-T02 and M06-T03: the TUMBLER module
// drum regenerates its parts, readouts and logic (tumbler.parity.test.ts);
// the original is the CANONS.md 11.1 row (D-222).

import { tumblerMechanism } from "../tumbler/canon.js";

export const shiftDrum = tumblerMechanism("drum", {
  id: "shift-drum",
  family: "memory",
  dof: null,
  governs: [
    "bores keyed",
    "slot part of the bore hole",
  ],
  failureModes: [],
  processes: [],
  provenance: "TUMBLER 2026-08",
  status: "typed",
  reference: ["mechanisms/shift-drum"],
  original: [
    { slug: "tumbler", file: "files/tumbler.html", fn: "MODS drum", lines: "1141 to 1213", sha256: "fe14c0cd07d8b10f8852317942fb86aa6ae3e30d12b60af344890e68cbc47178", record: "tumbler 4.5" },
  ],
});
