// designs/collar/test/nfc-pause.fixture.ts
// The owner's COLLAR NFC pocket as two sealed pocket cases (M03-T09 step 7,
// D-062). Values are copied from the owner print cards (measured, lineage
// rows collar.print-card-020/nfc-fixture and collar.print-card-024/nfc-fixture);
// pauseBefore.z is the pocket ceiling in both. CHK-PRT-15 and the 3MF pause
// writer arrive with the sealed pocket kind (D-062, M00 out-of-scope table);
// this file hands that milestone case a as its pass fixture and case b as
// its fail fixture, with the outcomes below expected of it.
//
// The pocket is cut from the top of the partial print at the pause: the
// face sits at the ceiling, normal up, and the floor is the ceiling less
// the depth. The outline is the 26.0 mm pocket, a circle from geom.

import type { FitClassId, PocketFeature } from "@hackbuild/spec";
import { circleRing } from "@hackbuild/geom";

/** What a print card states, every value measured from the card text. */
export interface NfcCard {
  /** layer height, mm */
  readonly layer: number;
  /** blank thickness, mm */
  readonly blank: number;
  /** inlay depth on each face, mm */
  readonly inlay: number;
  /** tag diameter, mm */
  readonly tag: number;
  /** pocket diameter, mm */
  readonly pocket: number;
  /** pocket height, mm */
  readonly height: number;
  readonly floorZ: number;
  readonly ceilingZ: number;
  /** the layer the card says to pause before, counted from 1 */
  readonly pauseLayer: number;
  /** wall between the pocket and the inlay body below and above, mm */
  readonly floorWall: number;
  readonly roofWall: number;
}

/** The layer grid a case is read on: a profile preset, or a uniform grid the card implies when profile has none. */
export type NfcGrid =
  | { readonly preset: string }
  | { readonly uniform: { readonly firstLayer: number; readonly layer: number }; readonly why: string };

/** CHK-PRT-15 and D-062 outcomes the sealed pocket milestone must reproduce. */
export interface NfcExpected {
  readonly chkPrt15: { readonly result: "pass" } | { readonly result: "fail"; readonly nearest: readonly [number, number] };
  /** D-062 floor at least 0.6 mm and roof at least 0.8 mm, read two ways; which one the pocket check uses is an open question. */
  readonly d062: {
    readonly allPlastic: { readonly floor: "pass" | "fail"; readonly roof: "pass" | "fail" };
    readonly wallToInlay: { readonly floor: "pass" | "fail"; readonly roof: "pass" | "fail" };
  };
}

export interface NfcCase {
  readonly id: "a" | "b";
  /** lineage.json row of the card the values come from */
  readonly lineage: string;
  readonly card: NfcCard;
  readonly grid: NfcGrid;
  readonly pocket: PocketFeature & { readonly sealed: { readonly pauseBefore: { readonly z: number } } };
  readonly expected: NfcExpected;
}

/** D-062 minimums, mm (decided, D-062; no profile row yet). */
export const D062 = { floorMin: 0.6, roofMin: 0.8 } as const;

function pocket(card: NfcCard): NfcCase["pocket"] {
  return {
    kind: "pocket",
    id: "pocket.nfc",
    outline: circleRing(card.pocket / 2),
    face: { origin: [0, 0, card.ceilingZ], normal: [0, 0, 1], u: [1, 0, 0] },
    depth: card.height,
    floor: "flat",
    // COLLAR declares no fit class; LOCATE (hand assembled, stays) is inferred. The drawn gap is the card's.
    fit: { class: "LOCATE" as FitClassId, drawnPerSide: (card.pocket - card.tag) / 2, basis: "perSide" },
    sealed: { pauseBefore: { z: card.ceilingZ } },
  };
}

const CARD_A: NfcCard = {
  layer: 0.20, blank: 3.80, inlay: 1.20, tag: 25.0, pocket: 26.0, height: 0.60,
  floorZ: 1.60, ceilingZ: 2.20, pauseLayer: 12, floorWall: 0.40, roofWall: 0.40,
};

const CARD_B: NfcCard = {
  layer: 0.24, blank: 4.00, inlay: 1.20, tag: 25.0, pocket: 26.0, height: 0.60,
  floorZ: 1.68, ceilingZ: 2.28, pauseLayer: 11, floorWall: 0.48, roofWall: 0.52,
};

export const NFC_CASES: readonly NfcCase[] = [
  {
    id: "a",
    lineage: "collar.print-card-020/owner-20260819",
    card: CARD_A,
    grid: { uniform: { firstLayer: 0.20, layer: 0.20 }, why: "profile has no 0.20 preset; the card's 0.20 layers with a first layer of 0.20" },
    pocket: pocket(CARD_A),
    expected: {
      chkPrt15: { result: "pass" },
      d062: { allPlastic: { floor: "pass", roof: "pass" }, wallToInlay: { floor: "fail", roof: "fail" } },
    },
  },
  {
    id: "b",
    lineage: "collar.print-card-024/owner-20260830",
    card: CARD_B,
    grid: { preset: "ffc5p_20260819" },
    pocket: pocket(CARD_B),
    expected: {
      chkPrt15: { result: "fail", nearest: [2.17, 2.41] },
      d062: { allPlastic: { floor: "pass", roof: "pass" }, wallToInlay: { floor: "fail", roof: "fail" } },
    },
  },
];
