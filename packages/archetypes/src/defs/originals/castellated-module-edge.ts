// castellated-module-edge: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origCastellatedModuleEdge = refusedArchetype({
  id: "castellated-module-edge",
  family: "board",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BOBBIN originals (M06-T14, D-222); CANONS.md 11.3: half-barrel castellations with the edge-rule exemption",
  status: "candidate",
  statusReason: "not for port yet: registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/bobbin/files/bobbin-rev-b.html pcbdata yet, and no number is recorded, since the original was not run headless at M06-T14; the card notes, not yet held by a test: source tsx missing; promotion waits: owner supplies the tsx",
  original: [
    { slug: "bobbin", file: "files/bobbin-rev-b.html", fn: "pcbdata", sha256: "de008dba21e8f88f4bdcaa19c92d3744c6fc440b838794ea2d6d3808ee178596", record: "bobbin RECORD.md" },
  ],
});
