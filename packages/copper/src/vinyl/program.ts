// The gate program of a cut-sheet board: which gate families run, in the
// generator's order, with the board's own wording and design thresholds as
// data. Every KEYWAY family generator repeats its gate logic inline
// (benches-conductive-b.md Gaps 7); here each family is written once in
// packages/checks/src/copper and a board only lists the steps it runs
// (M05-T15 step 1). A step kind fixes the check id its gates report under,
// so a board cannot file a gate under the wrong check.
//
// Wording: `msg` is the generator's gate line after "PASS " or "FAIL ",
// with the measured values as named slots, `{least:.1f}` read as Python's
// '%.1f' of the slot the step names. Thresholds that differ by board (the
// smallest plate, the rail pitch floor, a travel range) are the board's
// generator literals and travel in the step with their line in build.ts;
// thresholds the whole family shares are profile constants (vinyl.*).

import type { Mm, Vec2 } from "@hackbuild/spec";
import type { Shape } from "./draft.js";

/** How the erode gate words and judges a net (CHK-NET-14). */
export type ErodeStyle =
  /** KEYWAY: '%-4s survives ... (%d/%d islands)', islands kept, the art included. */
  | "ratio"
  /** VERNIER, QUADRANT: 'net %-4s survives ... (%d islands)', at least one island left. */
  | "count"
  /** SPLINE to STAVE: 'net %-5s survives the 1.10 mm erode test', not empty. */
  | "plain";

/**
 * Where a ratio slider is sampled: vinyl.sliderSamples windows evenly from
 * `from` to `to`. A column is a box of half width `half` about x from y0 to
 * y1; a row is a box of half height `half` about y from x0 to x1; a sector
 * is an annular slice of half angle `half` degrees about c from rIn to rOut
 * with n segments.
 */
export type SampleWindow =
  | { readonly kind: "column"; readonly from: Mm; readonly to: Mm; readonly half: Mm; readonly y0: Mm; readonly y1: Mm }
  | { readonly kind: "row"; readonly from: Mm; readonly to: Mm; readonly half: Mm; readonly x0: Mm; readonly x1: Mm }
  | { readonly kind: "sector"; readonly from: number; readonly to: number; readonly half: number; readonly c: Vec2; readonly rIn: Mm; readonly rOut: Mm; readonly n: number };

/** One fixed-name slot value a message reads besides the measured ones. */
export type MsgVars = Readonly<Record<string, number | string>>;

export type GateStep =
  // ---- KEYWAY's families (M05-T14)
  | { readonly kind: "islands"; /** name column width, Python '%-Ns' */ readonly pad: number }
  | { readonly kind: "audit" }
  | { readonly kind: "clearance" }
  | { readonly kind: "keepout" }
  | { readonly kind: "erode"; readonly style: ErodeStyle; readonly pad: number }
  | { readonly kind: "artGaps" }
  /** The wedge slider of draft.sliders[slider], by vertical cut lengths (CHK-NET-33, CHK-NET-15). */
  | { readonly kind: "wedge"; readonly slider: number }
  | { readonly kind: "stagger" }
  | { readonly kind: "zones" }
  | { readonly kind: "slidingFilm" }
  | { readonly kind: "wiper" }
  | { readonly kind: "filmKeepout" }
  | { readonly kind: "spacers" }
  | { readonly kind: "docSize" }
  // ---- plates (candidate plate)
  /** The smoothed net holds the region: the plate is solid copper. */
  | { readonly kind: "solid"; readonly net: string; readonly region: Shape; readonly msg: string }
  /** The least plate area over `gt`, or the spread of the areas under `lt`; slots {min} {max} {spread}. */
  | { readonly kind: "plateArea"; readonly regions: readonly Shape[]; readonly gt?: number; readonly lt?: number; readonly msg: string; readonly vars?: MsgVars }
  /** The declared plates number every value of want; slot {n}. */
  | { readonly kind: "plateCount"; readonly regions: readonly Shape[]; readonly want: readonly number[]; readonly msg: string }
  /** Every plate is one polygon before smoothing (CHK-NET-01). */
  | { readonly kind: "plateIslands"; readonly regions: readonly Shape[]; readonly msg: string }
  /** The least distance over the pairs at least min (CHK-NET-02); slot {d}. */
  | { readonly kind: "gap"; readonly pairs: readonly (readonly [Shape, Shape])[]; readonly min: Mm; readonly msg: string }
  // ---- sliders
  /** A wedge pair read by area ratio a / (a + b) over sampled windows: monotone, and off both rails (CHK-NET-15); span slots {min} {max}. */
  | { readonly kind: "ratio"; readonly a: string; readonly b: string; readonly window: SampleWindow; readonly dir: "down" | "up"; readonly monoMsg: string; readonly spanMsg: string }
  /**
   * Declared travel values inside the board's range (candidate travel):
   * every value v (or |v|) above gt or at least ge, and under lt. Slots
   * {v} (the first value) and {v0}, {v1}, ...
   */
  | { readonly kind: "travel"; readonly values: readonly number[]; readonly abs?: boolean; readonly gt?: number; readonly ge?: number; readonly lt?: number; readonly msg: string }
  /** A slider region inside the copper keepout (CHK-NET-08). */
  | { readonly kind: "sliderKeepout"; readonly region: Shape; readonly msg: string }
  // ---- zones (candidate zones)
  /** The inner region lies within the outer one. */
  | { readonly kind: "inside"; readonly outer: Shape; readonly inner: Shape; readonly msg: string }
  /** Each region of a (or their union) overlaps b by under vinyl.apartMax. */
  | { readonly kind: "apart"; readonly a: readonly Shape[]; readonly each: boolean; readonly b: Shape; readonly msg: string }
  /** A zone ending at end, grown by clear, stops more than margin before start; slot {gap} = start - end. */
  | { readonly kind: "zoneGap"; readonly end: Mm; readonly clear: Mm; readonly start: Mm; readonly margin: Mm; readonly msg: string }
  // ---- clip fields and rails (CHK-NET-21, CHK-NET-22)
  /** The least step between consecutive fingers of the field at least min; slots {least} {pitch}. */
  | { readonly kind: "fieldPitch"; readonly field: string; readonly min: Mm; readonly msg: string }
  /** Fingers two apart in the field (same row) leave at least min between jaws; slot {jaws}. */
  | { readonly kind: "fieldJaws"; readonly field: string; readonly min: Mm; readonly msg: string }
  /** Pitch less finger width at least min; slot {gap}. */
  | { readonly kind: "fingerGap"; readonly field: string; readonly min: Mm; readonly msg: string }
  /** Deep less shallow finger at least min; slot {step}. */
  | { readonly kind: "depthStep"; readonly field: string; readonly min: Mm; readonly msg: string }
  /** Finger depth alternates along the field; slots {deep} {shallow}. */
  | { readonly kind: "depthAlternates"; readonly field: string; readonly msg: string }
  /** Fingers in arrival order sit on origin + i x pitch: a monotone fan (CHK-NET-22). */
  | { readonly kind: "railOrder"; readonly field: string; readonly msg: string }
  /** Every finger sits on its arrival coordinate: no fan at all (CHK-NET-22). */
  | { readonly kind: "parked"; readonly field: string; readonly msg: string }
  /** The fan's lanes against the lanes available (CHK-NET-22); fits: slots {used} {nets}; needs: {need} {have}. */
  | { readonly kind: "lanes"; readonly style: "fits" | "needs"; readonly msg: string }
  /** Sub-lanes of one routing channel at least min apart after scale (CHK-NET-22); slots {gap} (first pair) {n}. */
  | { readonly kind: "subLanes"; readonly at: readonly Mm[]; readonly scale: number; readonly min: Mm; readonly msg: string }
  /** No routing channel carries more than max traces (CHK-NET-22). */
  | { readonly kind: "laneBudget"; readonly counts: readonly number[]; readonly max: number; readonly msg: string }
  // ---- channel budget (candidate channels)
  | { readonly kind: "channels"; readonly want: number; /** also count nets, as SPLINE and the earlier boards do */ readonly nets: boolean; readonly msg: string }
  // ---- the dielectric faceplate (CHK-NET-20, CHK-NET-24, CHK-NET-09)
  /** Live copper outside the wiring zone grown by vinyl.wiringZoneGrow, less the mask, under vinyl.bareMax; slot {bare}. */
  | { readonly kind: "bare"; readonly msg: string }
  /** The mask overlaps the clip pads by under vinyl.apartMax. */
  | { readonly kind: "padsClear"; readonly msg: string }
  /** The mask, shrunk by out, holds the electrode; slot {out}. */
  | { readonly kind: "overhang"; readonly electrode: Shape; readonly out: Mm; readonly msg: string }
  | { readonly kind: "maskPiece"; readonly msg: string }
  /** The accents lie within the mask, or within it shrunk by vinyl.accentEdgeClear. */
  | { readonly kind: "accents"; readonly inset: boolean; readonly msg: string }
  | { readonly kind: "maskKeepout"; readonly msg: string }
  // ---- FRET's lattice (candidate isomorphic)
  | {
      readonly kind: "isomorphic";
      /** Semitone of the key at column c, row r: grid[c][r]. */
      readonly grid: readonly (readonly number[])[];
      /** Odd columns sit half a key higher, so up-right from an odd column is (c + 1, r + 1). */
      readonly oddRaised: boolean;
      readonly up: number;
      readonly upRight: number;
      readonly downRight: number;
      readonly rangeMin: number;
      readonly base: number;
      /** Pitch classes of the home scale, from base. */
      readonly scale: readonly number[];
      readonly degreesMin: number;
      /** Pitch class names, C first. */
      readonly names: readonly string[];
      readonly msgs: { readonly up: string; readonly upRight: string; readonly downRight: string; readonly distinct: string; readonly range: string; readonly degrees: string };
    }
  // ---- stock (candidate stock)
  /** The board width fits the stock less margin; slots {W} {stock} {side}. */
  | { readonly kind: "stock"; readonly stock: Mm; readonly margin: Mm; readonly msg: string };

export type GateKind = GateStep["kind"];
