// The cut-sheet stack declaration (D-063) and the layer documents. Every
// layer registers by the shared outline: each emitted document is W x H
// with the outline's rim drawn in, so sizing one layer in the cutter's
// software registers all (knowledge/kernels/copper-routing.md, "ALL LAYERS
// SHARE ONE OUTLINE"). Layer thickness comes from the material's profile
// row; a layer whose stock has no row, such as print then cut sticker
// paper, is emitted but left out of the declaration, since no thickness
// is assumed for it (PROFILE.md 3.1).

import type { FaceFrame, ProfileLookup, StackDecl, StackLayer } from "@hackbuild/spec";
import { commandError } from "@hackbuild/spec";
import { components } from "./helpers.js";
import type { LayerDecl, SheetRole, VinylBoard } from "./draft.js";
import { docSize, svgDoc } from "./emit-svg.js";

/**
 * The spec's StackLayer role for each sheet role. spec/part-ir.ts carries
 * six roles; the wiper is a second conductor, the dielectric a mask, and
 * faceplate, accent and caps all sit on the face. The guide has no
 * electrical role and no stock thickness, so it maps to none.
 */
export const SPEC_ROLE: Readonly<Record<SheetRole, StackLayer["role"] | null>> = {
  copper: "conductor",
  wiper: "conductor",
  film: "resistive",
  spacer: "spacer",
  dielectric: "mask",
  faceplate: "face",
  accent: "face",
  caps: "face",
  backer: "backer",
  guide: null,
};

/** Registration id every layer of a board shares. */
export const OUTLINE_REGISTRATION = "outline";

/** The flat face the sheets lie on, z up, origin at the outline's lower left corner. */
export const SHEET_FACE: FaceFrame = { origin: [0, 0, 0], normal: [0, 0, 1], u: [1, 0, 0] };

/** StackDecl for the board's layers, bottom first, thickness from profile. */
export function stackDecl(board: VinylBoard, profile: ProfileLookup): StackDecl {
  const layers: StackLayer[] = [];
  for (const l of board.draft.layers) {
    const role = SPEC_ROLE[l.role];
    if (role === null || l.material === undefined) continue;
    const t = profile.material(l.material).thickness;
    if (t === undefined) {
      throw commandError({
        code: "E_PARAM_MISSING", path: `/layers/${l.id}/material`, got: l.material, record: "kernels/copper-routing",
        hint: `profile material ${l.material} has no thickness; add the stock's thickness with its source`,
      });
    }
    const windows = l.windows === undefined ? undefined : components(board.shape(l.windows)).map((c) => c.outer);
    layers.push({ role, material: l.material, t, registration: OUTLINE_REGISTRATION, ...(windows === undefined ? {} : { windows }) });
  }
  return { face: SHEET_FACE, layers };
}

export interface EmittedLayer {
  readonly id: string;
  readonly file: string;
  readonly role: SheetRole;
  readonly svg: string;
  /** W x H the document reports, read back from its text. */
  readonly size: readonly [number, number] | null;
}

/** Every layer document, in the draft's order. */
export function emitLayers(board: VinylBoard): EmittedLayer[] {
  const d = board.draft;
  return d.layers.map((l: LayerDecl) => {
    const svg = svgDoc({
      W: d.W, H: d.H, title: l.title, repeatClose: d.repeatClose, tolerance: board.emitTolerance, style: d.docStyle ?? "keyway",
      ...(l.ground === undefined ? {} : { bg: { outline: board.outline, fill: l.ground } }),
      items: l.items.map((it) => ({ geom: board.shape(it.shape), fill: it.fill, opacity: it.opacity, stroke: it.stroke, strokeWidth: it.strokeWidth })),
    });
    return { id: l.id, file: l.file, role: l.role, svg, size: docSize(svg) };
  });
}
