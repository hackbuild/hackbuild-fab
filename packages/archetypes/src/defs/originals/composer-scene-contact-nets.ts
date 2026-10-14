// composer-scene-contact-nets: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origComposerSceneContactNets = refusedArchetype({
  id: "composer-scene-contact-nets",
  family: "system",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BLOCKS originals (M06-T14, D-222); CANONS.md 11.3: typed instances on a lattice, nets by physical contact, a scene wire as a printed part with a fitted length",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/blocks/files/src-extracted/sim.js lines 13 to 64 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T10 with reference blocks/scene",
  original: [
    { slug: "blocks", file: "files/src-extracted/sim.js", lines: "13 to 64", sha256: "8b3435df11e5adcd38d435089aee3ac98b6fcaa466ff3f599beb8431ffca898d", record: "blocks RECORD.md" },
    { slug: "blocks", file: "files/src-extracted/app2.js", lines: "42 to 96", sha256: "3eeeab36a1dd9977e95cf85f43fa8b4c026c7f077f9f7bc9c2a39b42a85086bc", record: "blocks RECORD.md" },
  ],
});
