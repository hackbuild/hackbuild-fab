// blocks-press-bore-socket: originals canon addition (M06-T14, D-222), registered
// candidate from the card table and CANONS.md 11.3; its family follows
// CANONS.md 11.3. The original it names is pinned below by sha256.

import { refusedArchetype } from "../../def.js";

export const origBlocksPressBoreSocket = refusedArchetype({
  id: "blocks-press-bore-socket",
  family: "printed",
  channels: null,
  senses: [],
  emits: [],
  read: "none",
  limits: [],
  provenance: "BLOCKS originals (M06-T14, D-222); CANONS.md 11.3: press-fit bore dialect and a header pin socket with a cPLA wiper tab",
  status: "candidate",
  statusReason: "registered from the originals at M06-T14 (D-222) and refused: no port regenerates originals/blocks/files/src-extracted/blocks.js lines 144 to 166, 229 to 245 yet, and no number is recorded, since the original was not run headless at M06-T14; promotes at M10-T10 with reference conductors/blocks-stud",
  original: [
    { slug: "blocks", file: "files/src-extracted/blocks.js", lines: "144 to 166, 229 to 245", sha256: "36feb99134fd23227ec4db6fbf8668de4f9c8527febba8034401f50cb77d7b9b", record: "blocks RECORD.md" },
  ],
});
