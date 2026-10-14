// Bed-face mirroring (D-063 mirrorOnFlip, art-inlay.md Mirroring). Art on
// the bed face is read from the other side once the part is flipped, so it
// is mirrored in X at extrude time and only there: the face function keeps
// returning the art as read in hand. Ported from COLLAR buildMesh
// (collar.html:1382 to 1392, lineage collar.bench/inlay-mirror), which
// mirrors the back art and the back holes the same way.

import { commandError } from "@hackbuild/spec";
import type { ComposedFace } from "./face.js";
import type { LabelGrid } from "./surface.js";

/** Mirror a row-major w x h grid in X: out[j][i] = in[j][w - 1 - i]. A new array; the input is left as read. */
export function mirrorX(cells: Uint8Array, w: number, h: number): Uint8Array {
  if (cells.length !== w * h) {
    throw commandError({ code: "E_SCHEMA", path: "/labels", got: cells.length, expected: `${w * h} cells`, hint: "give the grid w x h cells, row major" });
  }
  const out = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    const row = j * w;
    for (let i = 0; i < w; i++) out[row + i] = cells[row + (w - 1 - i)]!;
  }
  return out;
}

/** A face mirrored in X for extrusion on the bed side: art and holes alike. */
export function mirrorFace(face: ComposedFace): ComposedFace {
  const { w, h } = face.art;
  const art: LabelGrid = { ...face.art, labels: mirrorX(face.art.labels, w, h) };
  return { art, holes: face.holes === null ? null : mirrorX(face.holes, w, h) };
}
