// Scene slug-sheets-complete (M07-T07 step 4), informational: slug-sheets
// with the four baked outlines PART_QTY omits (slug.html line 1042), one
// copy each, quantities inferred:
//   door_flap, window  acrylic panes (ACRYLIC, line 1051) that BUILD.md
//                      names (lines 4, 109 and 153)
//   ret_lip, ret_back  ply parts of the external reject cup hung under the
//                      faceplate (BUILD.md lines 67 to 70); ret_back is the
//                      only cup part with bolt holes
//                      (knowledge/designs/slug.md section 9 and its
//                      2026-10-05 PART_QTY defect)
// The card left ret_lip and ret_back out on the reading that the return
// opening was removed. BUILD.md line 69 removes the opening in the front
// panel only; the cup moved outside and keeps both parts, so this scene
// adds them (M07-T07 card defects). The questions stay in the owner queue
// and the parity target stays the shipped PART_QTY (slug-sheets).
//
// This file imports types and its sibling scene only, so Node strips it
// without a build.

import type { SheetScene } from "../src/scene.js";
import { slugPage, slugScene } from "./slug-sheets.js";

/** Baked outlines PART_QTY omits, one copy each, quantities inferred. */
export const SLUG_OMITTED: Readonly<Record<string, number>> = { door_flap: 1, window: 1, ret_lip: 1, ret_back: 1 };

export function slugSheetsCompleteScene(): SheetScene {
  const page = slugPage();
  return slugScene("slug-sheets-complete", { ...page.PART_QTY, ...SLUG_OMITTED }, page, "informational", [
    "door_flap 1 and window 1: inferred from designs/slug/legacy/BUILD.md lines 4, 109 and 153; baked in OUTLINES, listed in ACRYLIC, absent from PART_QTY",
    "ret_lip 1 and ret_back 1: inferred from designs/slug/legacy/BUILD.md lines 67 to 70 and knowledge/designs/slug.md section 9; baked in OUTLINES, absent from PART_QTY",
  ]);
}
