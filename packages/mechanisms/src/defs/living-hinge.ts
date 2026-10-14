// living-hinge: seed row of seed/mechanisms.seed.yaml.
// Registered at M06-T01, typed at M06-T02 and M06-T03: the TUMBLER module
// hinge regenerates its parts, readouts and logic (tumbler.parity.test.ts);
// the original is the CANONS.md 11.1 row (D-222).

import { tumblerMechanism } from "../tumbler/canon.js";

export const livingHinge = tumblerMechanism("hinge", {
  id: "living-hinge",
  family: "kerf",
  dof: null,
  governs: ["under 13 degrees per row"],
  failureModes: [],
  processes: ["laser"],
  provenance: "TUMBLER 2026-08",
  status: "typed",
  reference: ["mechanisms/living-hinge"],
  original: [
    { slug: "tumbler", file: "files/tumbler.html", fn: "MODS hinge", lines: "1392 to 1444", sha256: "fe14c0cd07d8b10f8852317942fb86aa6ae3e30d12b60af344890e68cbc47178", record: "tumbler 4.5" },
    { slug: "sketch", file: "files/sketch.html", fn: "sheet entity", lines: "574 to 587", sha256: "39b5ebce5ce14ac50233f16f3875e5bbcf32136c8ba47fb1e28558243b8a98d5", record: "sketch 9" },
  ],
});
