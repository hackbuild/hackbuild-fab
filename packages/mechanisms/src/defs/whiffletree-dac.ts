// whiffletree-dac: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01, typed at M06-T02 and M06-T03: the TUMBLER module
// whif regenerates its parts, readouts and logic (tumbler.parity.test.ts);
// the original is the CANONS.md 11.1 row (D-222).

import { tumblerMechanism } from "../tumbler/canon.js";

export const whiffletreeDac = tumblerMechanism("whif", {
  id: "whiffletree-dac",
  family: "motion",
  dof: null,
  governs: ["input slots positioned by their own stroke"],
  failureModes: [],
  processes: [],
  provenance: "TUMBLER 2026-08",
  status: "typed",
  reference: ["mechanisms/whiffletree"],
  original: [
    { slug: "tumbler", file: "files/tumbler.html", fn: "MODS whif", lines: "1332 to 1388", sha256: "fe14c0cd07d8b10f8852317942fb86aa6ae3e30d12b60af344890e68cbc47178", record: "tumbler 4.5" },
  ],
});
