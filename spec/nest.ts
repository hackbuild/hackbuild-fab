// spec/nest.ts
/**
 * Status: draft until the M07 exit. MILESTONES.md 1.5, D-179.
 * M07 is the first milestone that runs this file (packages/nest).
 */
// Sheet and plate layout types for packages/nest. Lengths in mm. Added by
// M07-T02 (docs/plan/milestones/M07-motion-nest.md); D-046 names no file for
// these types, so the PR lists this file as a spec change for the owner.
// Version 1, 2026-10-08. Carries D-051, D-054, D-075, D-137.
// 2026-10-08: DeclaredHole, HubDecl, KerfMode and NestItem holes and hubs
// (M07-T04 steps 2, 4 and 5), listed in the PR as a spec change.

import type { Hash, Ring, Vec2 } from "./ids.js";

/** A rotation about the sheet normal in quarter turns, deg. */
export type QuarterTurn = 0 | 90 | 180 | 270;

/**
 * A hole the build declares through the sheet (a bore, window, slot or
 * pocket feature), for CHK-SHT-02: the emitted profile must hold a hole ring
 * around `at`. Added by M07-T04 step 4.
 */
export interface DeclaredHole {
  /** Feature id from the build. */
  readonly feature: string;
  /** A point inside the hole, part-local mm (the frame of NestItem.rings). */
  readonly at: Vec2;
}

/**
 * A hub with holes around its bore, for CHK-SHT-07: a hole of diameter d at
 * radius r keeps r - d/2 >= bore + w and r + d/2 <= outer - w, w the stock's
 * minimum feature. Radii from the bore centre. Added by M07-T04 step 5.
 */
export interface HubDecl {
  /** Feature id of the hub. */
  readonly feature: string;
  /** Bore radius b, mm. */
  readonly bore: number;
  /** Outer radius R of the hub, mm. */
  readonly outer: number;
  readonly holes: readonly {
    /** Feature id of the hole. */
    readonly feature: string;
    /** Hole diameter d, mm. */
    readonly d: number;
    /** Radius r of the hole centre from the bore centre, mm. */
    readonly r: number;
  }[];
}

/**
 * How a sheet export treats kerf: "outline" grows every outline by kerf/2
 * from the machine row (holes shrink by the same), "none" cuts at nominal
 * and needs no kerf (SLUG cut with compensation off). Added by M07-T04 step 2.
 */
export type KerfMode = "outline" | "none";

export interface NestItem {
  /** Part id from the build, unique within the request. */
  readonly id: string;
  /**
   * Part-local rings, each vertex in mm on the 1/1024 mm grid (D-054):
   * the outer ring first, counter-clockwise, then the holes, clockwise.
   */
  readonly rings: readonly Ring[];
  /** Copies to place, count. */
  readonly qty: number;
  /** Assembly step index, count from 0; required in assembly-order mode. */
  readonly step?: number;
  /** Stock id this item is cut from or printed on, for example "ply3" or "acrylic3". */
  readonly stock: string;
  /** Holes the build declares through the sheet (CHK-SHT-02); absent means none. Added by M07-T04. */
  readonly holes?: readonly DeclaredHole[];
  /** Hubs with holes around a bore (CHK-SHT-07); absent means none. Added by M07-T04. */
  readonly hubs?: readonly HubDecl[];
}

export type NestMode = "fill" | "assembly-order" | "legacy-shelf";
export type Packer = "maxrects-bssf" | "shelf" | "sparrow";
export type SortOrder = "maxSide" | "area" | "height" | "width" | "minSide";
/**
 * Which items may share a sheet: "stock" puts every item of one stock on
 * its own sheets (SLUG ply and acrylic); "type" gives each item id its own
 * sheets (OGEE16 R16-P, one part type per plate). Added by M07-T03 step 5.
 */
export type NestGroupBy = "stock" | "type";

export interface NestRequest {
  readonly items: readonly NestItem[];
  /** Sheet or bed size in mm, width then height. */
  readonly sheet: Vec2;
  /** Edge margin, mm. */
  readonly margin: number;
  /** Gap between parts, mm; "auto" searches 2 to 16 mm for the largest gap at the minimum sheet count. */
  readonly gap: number | "auto";
  readonly mode: NestMode;
  /** Rotations the packer may try, deg. */
  readonly rotations: readonly QuarterTurn[];
  readonly partInPart: boolean;
  /** Seed of the packer's draws, unitless integer; equal seeds give equal layouts. */
  readonly seed: number;
  /** Packer to run; absent, fill mode tries every offline packer (M07-T03 step 3). */
  readonly packer?: Packer;
  /** MaxRects sort order; absent, the MaxRects packer tries all five in order. */
  readonly order?: SortOrder;
  /** Sheet sharing rule; absent means "stock". */
  readonly groupBy?: NestGroupBy;
}

export interface Placement {
  readonly id: string;
  /** Copy index of the item, count from 0. */
  readonly copy: number;
  /** Sheet index, count from 0. */
  readonly sheet: number;
  /** Offset of the part's bbox minimum corner on the sheet after rotation, mm. */
  readonly at: Vec2;
  /** Rotation about the sheet normal, deg. */
  readonly rot: QuarterTurn;
  /** Id and copy of the host part when placed inside a hole. */
  readonly inside?: {
    readonly id: string;
    /** Copy index of the host, count from 0. */
    readonly copy: number;
  };
}

export interface NestResult {
  /** Sheets used, count. */
  readonly sheets: number;
  readonly placements: readonly Placement[];
  readonly packer: Packer;
  readonly order?: SortOrder;
  /** Gap actually used, mm. */
  readonly gap: number;
  /** Informational metric (D-075): bbox area over usable area per sheet, percent. */
  readonly fill: readonly number[];
  /** Ids of items larger than the usable sheet in every allowed rotation. */
  readonly oversize: readonly string[];
  /** sha256 over canonical JSON of placements (D-051). */
  readonly layoutHash: Hash;
}
