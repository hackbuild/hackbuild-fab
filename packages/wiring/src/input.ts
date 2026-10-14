// The wiring contract (M08-T13 step 1). The caller resolves the board's
// pins through catalog.pins, so every pad position comes from a catalog
// row with its provenance; wiring itself reads no catalog (tools/tiers.json
// gives it spec, board and circuit).

import type { PinDef, Tier } from "@hackbuild/spec";

/** The module the drawing shows, as its catalog row gives it. */
export interface WiringBoard {
  /** Catalog row id, for example "esp32c3-supermini". */
  readonly id: string;
  readonly name: string;
  /** Board length along y, mm (the USB end at +y). */
  readonly l: number;
  /** Board width along x, mm. */
  readonly w: number;
  /** Row tier, printed on the drawing so a reader sees what the pads rest on. */
  readonly tier: Tier;
}

export interface WiringInput {
  readonly board: WiringBoard;
  /** catalog.pins output: every pin with its centre in the part frame, mm, +y up. */
  readonly pins: readonly PinDef[];
  /** Pins the design uses and the function each carries. */
  readonly used: readonly { readonly pin: string; readonly function: string }[];
  /**
   * Wire ends (PIP cups) in the board frame, mm: net is a used function, or
   * a rail named by its pin (GND, 3V3).
   */
  readonly ends: readonly { readonly id: string; readonly x: number; readonly y: number; readonly net: string; readonly label: string }[];
  /** Drawing scale, px per mm; PIP draws at 9 (part2.js line 356). */
  readonly scale?: number;
}

/** What the drawing shows, as data. */
export interface WiringReport {
  readonly used: readonly { readonly pin: string; readonly function: string; readonly at: readonly [number, number] }[];
  readonly unused: readonly string[];
  readonly ends: readonly { readonly id: string; readonly net: string; readonly pin: string }[];
  /** Ends whose net names no used function and no rail pin. */
  readonly unmatched: readonly { readonly id: string; readonly net: string }[];
}

/**
 * What a wiring design's build.ts returns (M08-T13 step 1): the catalog id
 * of the module and the design's side of the map. Core resolves the board
 * and its pins through catalog.pins and hands the WiringInput to wiringSvg,
 * so a draft never carries a pad position.
 */
export interface WiringDraft {
  readonly kind: "wiring";
  /** Catalog row id of the module, for example "esp32c3-supermini". */
  readonly board: string;
  readonly used: WiringInput["used"];
  readonly ends: WiringInput["ends"];
  /** Drawing scale, px per mm; PIP's 9 when absent. */
  readonly scale?: number;
}
