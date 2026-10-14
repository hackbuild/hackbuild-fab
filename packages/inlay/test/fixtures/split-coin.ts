// The M03-T06 fixture coin: two faces as read in hand, drawn by cell centre
// on a grid of `cells` across a 44 mm blank (COLLAR v5 default diameter,
// collar.html line 643). The back carries an F, which reads differently in
// a mirror. Front: a slot 2 annulus, a slot 3 bar, a patch of the host
// slot 1 that must stay host, and two through holes, one in the bar and one
// under the top stroke of the mirrored F. Back: the F in slot 3 and a
// through hole off its corner. Every shape sits inside 14 mm, well within
// the COLLAR art radius of the default blank, and the holes keep at least
// one cell of art around them, so the pinch healer flips no cell.
//
// stageCoin runs the faces through splitBodies and the M00 stage runner on
// a prism host. tools/inlay/split-fixture.mjs loads this file with node's type
// stripping to write the coin as a 3MF for tools/py/validate_3mf.py.

import type { BodyDraft, PartDraft } from "@hackbuild/spec";
import { circleRing } from "@hackbuild/geom";
import { runStages, type StageOutput } from "@hackbuild/mesh";
import { createProfileLookup, loadProfile, type SkeletonLookup } from "@hackbuild/profile";
import type { ComposedFace } from "../../src/face.js";
import { splitBodies, type SplitBodies } from "../../src/split.js";

/** Blank diameter, mm (from source, COLLAR v5 default). */
export const DIA = 44;

type Pred = (x: number, y: number) => boolean;

const box = (x0: number, y0: number, x1: number, y1: number): Pred => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const disc = (cx: number, cy: number, r: number): Pred => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const ring = (r0: number, r1: number): Pred => (x, y) => x * x + y * y >= r0 * r0 && x * x + y * y <= r1 * r1;

/** The F as read: stem on the left, two bars to the right. */
export const GLYPH_F: Pred = (x, y) => box(-6, -8, -3, 8)(x, y) || box(-6, 5, 6, 8)(x, y) || box(-6, -1.5, 3, 1.5)(x, y);

/** Paint cell centres; row 0 is the bottom edge (surface row order), origin at the grid centre. */
function paint(cells: number, layers: readonly (readonly [Pred, number])[]): Uint8Array {
  const out = new Uint8Array(cells * cells);
  const res = cells / DIA;
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const x = (i + 0.5 - cells / 2) / res, y = (j + 0.5 - cells / 2) / res;
      for (const [f, slot] of layers) if (f(x, y)) out[j * cells + i] = slot;
    }
  }
  return out;
}

function face(cells: number, art: readonly (readonly [Pred, number])[], holes: Pred | null): ComposedFace {
  return {
    art: { w: cells, h: cells, res: cells / DIA, labels: paint(cells, art) },
    holes: holes === null ? null : paint(cells, [[holes, 1]]),
  };
}

export function frontFace(cells: number, withHoles = true): ComposedFace {
  return face(cells, [[ring(9, 13), 2], [box(-5, -3, 5, 3), 3], [box(-8, 5, -6, 7), 1]], withHoles ? (x, y) => disc(0, 0, 1)(x, y) || disc(0, 6.5, 1)(x, y) : null);
}

export function backFace(cells: number, withHoles = true): ComposedFace {
  return face(cells, [[GLYPH_F, 3]], withHoles ? disc(8, -8, 1) : null);
}

/** The F as read on a grid, 1 inside, 0 outside. */
export function glyphMask(cells: number): Uint8Array {
  return paint(cells, [[GLYPH_F, 1]]);
}

/** Thickness and inlay depth, mm (from source, COLLAR v5 defaults thk 3.6 and inlay 1.2, collar.html line 644). */
export const THK = 3.6;
export const DEPTH = 1.2;
/** Profile material per slot; the host is slot 1. */
export const MATERIALS = ["petg", "petg", "petg"] as const;

export interface StagedCoin {
  readonly profile: SkeletonLookup;
  readonly split: SplitBodies;
  readonly out: StageOutput;
}

/**
 * The 3-slot fixture coin through the M00 route: a slot 1 prism host of the
 * blank diameter, art bodies from splitBodies on the default ffc5p preset
 * (layer height from profile), stages 1 to 8.
 */
export async function stageCoin(cells: number): Promise<StagedCoin> {
  const profile = createProfileLookup(loadProfile());
  const preset = profile.preset("ffc5p");
  const split = splitBodies(frontFace(cells), backFace(cells), DEPTH, {
    id: "inlay", thk: THK, slot: 1, machine: { id: preset.id, layerHeight: preset.layer }, materials: MATERIALS,
  });
  const host: BodyDraft = { id: "coin", role: "body", slot: 1, material: MATERIALS[0], base: { route: "prism", outline: [circleRing(DIA / 2)], z: [0, THK] } };
  const draft: PartDraft = {
    id: "split-coin", name: "split coin", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: true, pose: "print" }, bodies: [host], features: [],
  };
  const out = await runStages({
    draft, bodies: split.bodies, profile,
    mask: (uri) => {
      const m = split.masks.get(uri);
      if (m === undefined) throw new Error(`no mask ${uri}`);
      return m;
    },
  });
  return { profile, split, out };
}
