// read-pullup-e12: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origReadPullupE12 = refusedArchetype({
  id: "read-pullup-e12",
  family: "read-model",
  channels: null,
  senses: [],
  emits: [],
  read: "pullup",
  limits: [],
  provenance: "TOGGLE originals (M06-T14, D-222); CANONS.md 11.3: computed E12 pull-up at max(100k, 10 Rswitch) with the internal pull-up trap; replaces the declared 470k",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: src/toggle/solver.ts physics ports originals/toggle/files/src/src/part2b.js lines 258 to 295, the E12 pick at max(100k, 10 Rswitch) and the 45k internal pull-up voltage among them, and test/toggle.parity.test.ts holds it against test/legacy/toggle.json, the original run headless on its own routed nets; still refused because the pick is inline in the TOGGLE solver rather than one function packages/circuit exports, circuit refuses an auto E12 pull-up (solve/ports.ts), the part4.js lines 253 to 297 hookup text is not ported, and Rswitch adds the declared rc contact with no profile row; promotes at M11-T09 with reference electrical/pullup-e12",
  original: [
    { slug: "toggle", file: "files/src/src/part2b.js", lines: "258 to 295", sha256: "c8acaba6c3ff3acffb63b7496c8398076b1ae4fa4ebbbcecfdd0da57289d6c02", record: "toggle RECORD.md" },
    { slug: "toggle", file: "files/src/src/part4.js", lines: "253 to 297", sha256: "37d194fff6702f85510e846d3ebda6b82fa136b420b8e4e55c88e6cb692ce71a", record: "toggle RECORD.md" },
  ],
});
