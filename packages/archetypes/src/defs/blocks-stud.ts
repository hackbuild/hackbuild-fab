// blocks-stud: seed row of seed/archetypes.seed.yaml, ported at M06-T09
// from the BLOCKS column (blocks.js lines 168 to 220) and the BOSS v1
// column (boss.js lines 93 to 110); the port lives in src/blocks/stud.ts.
// Senses, emits and provenance mirror the seed; the limit carries the
// M06-T07 correction (two presets, no default, D-087). Its reference is
// conductors/blocks-stud at the blocks-html preset.

import { provenArchetype } from "../def.js";
import { STUD_PARAMS, studApply, studDerive } from "../blocks/stud.js";
import { BLOCKS_HTML } from "../blocks/standard.js";

const postArea = Math.PI * (BLOCKS_HTML.postD / 2) ** 2;

export const blocksStud = provenArchetype({
  version: "1.0.0",
  id: "blocks-stud",
  family: "printed",
  channels: 1,
  senses: [],
  emits: [
    "conductor",
    "contact",
    "port",
  ],
  read: "pullup",
  limits: [
    "pin to stud 5 to 50 kohm; two presets, no default: boss-v1 (sockH 2.4, flangeH 0.72, trace 0.72, gap 0.48, L 0.24) and blocks-html (sockH 2.2, flange 0.6, trace 0.6, gap 0.4, L 0.2); cPLA wires short to medium, BOSS 50 kohm, carbon-filled filament only",
  ],
  provenance: "BLOCKS 2026-09",
  status: "proven",
  reference: ["conductors/blocks-stud"],
  original: [
    { slug: "blocks", file: "files/src-extracted/blocks.js", fn: "column, clutchRing", lines: "168 to 226", sha256: "36feb99134fd23227ec4db6fbf8668de4f9c8527febba8034401f50cb77d7b9b", record: "blocks 5.4" },
    { slug: "boss", file: "files/boss-src/src/boss.js", fn: "column (boss-v1 preset)", lines: "93 to 110", sha256: "fad77485920bb29d996610adf577d4d10c60f813ce4abc036a10f5a4aa8bfcf7", record: "boss 5.3" },
  ],
  // The post at the blocks-html brick, as parts.js line 59 prices it: max(1, top - L1) through the post section.
  sections: [
    { id: "post", material: "cpla", direction: "through", widthMm: Math.sqrt(postArea), thicknessMm: Math.sqrt(postArea), lengthMm: BLOCKS_HTML.brickH - BLOCKS_HTML.L1, source: "originals/blocks/files/src-extracted/parts.js line 59: the post from L1 to the brick top" },
  ],
  params: STUD_PARAMS,
  derive: (p, profile) => studDerive(p, profile),
  apply: (input) => studApply(input, "blocks-stud"),
});
