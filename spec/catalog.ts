// spec/catalog.ts
/**
 * Status: draft until the M05 exit. MILESTONES.md 1.5, D-179.
 * M05 is the first milestone that runs this file.
 * The M05 exit freezes PinDef and the per-MCU rows; the rest stays draft until M08.
 */
// Bought parts with provenance. A tier sits on every row; inferred rows are
// usable in sim and refused at fabrication export with E_PROVENANCE, exit 4
// (D-102). Verified and vendor rows are committed data; external lookups run
// on demand into the .hbf cache (D-103).
// Version 4, 2026-10-04; PartRow, CatalogField and ActuatorRow M08-T03 and
// M08-T05, 2026-10-09. Carries D-076, D-102, D-103, D-104.

import type { Brand, Mm, Process, Tier, Vec3 } from "./ids";
import type { PadShape } from "./board-features";
import type { McuPinSpec } from "./circuit";
import type { Provenance } from "./profile";

export interface CatalogHit {
  readonly id: string;
  readonly name: string;
  readonly tier: Tier;
  /** Envelope size x y z, mm. */
  readonly envelope?: Vec3;
  /** Where the row came from: datasheet, KiCad library, listing. */
  readonly source: string;
}

export interface PinDef {
  /** Physical pin number. */
  readonly n: number;
  readonly name: string;
  /** Role, for example "gpio", "3v3", "gnd", "usb-dp". */
  readonly role: string;
  /** True for pins that affect boot when pulled. */
  readonly strapping?: boolean;
  /** Activity during boot that a design must tolerate, one line. */
  readonly bootActivity?: string;
  /** Pin position relative to the part origin, mm. */
  readonly at?: Vec3;
}


/**
 * What a catalog field feeds (D-102, M08-T03 step 4). Geometry and
 * connectivity fields reach the fabrication export gate; a check field
 * (thresholds, pullups, strapping notes, actuator dynamics) reaches checks
 * and sim only, and its tier is reported inside the check result.
 */
export type CatalogFieldUse = "geometry" | "connectivity" | "check";

/** One catalog field with its own provenance (D-099, M08-T03 step 2). */
export interface CatalogField<T = unknown> {
  readonly value: T;
  /** Unit of value: "mm", "N m", "deg/s", or "unknown" when the source does not state one. */
  readonly unit: string;
  readonly use: CatalogFieldUse;
  readonly provenance: Provenance;
  /**
   * Every value the corpus holds when sources disagree, each with the bench
   * it came from; such a field stays inferred until measured (D-104).
   */
  readonly conflicts?: readonly { readonly value: T; readonly source: string }[];
}

/** One pad of a part's land pattern in the part frame, mm, +y up, top view. */
export interface CatalogPad {
  /** Pad number as the footprint writes it: "1", "A1". */
  readonly pad: string;
  /** Pin name the symbol gives the pad: "GPIO20", "5V". */
  readonly name: string;
  readonly shape: PadShape;
  /** Pad centre x, mm. */
  readonly x: Mm;
  /** Pad centre y, mm. */
  readonly y: Mm;
  /** Pad width, mm. */
  readonly w: Mm;
  /** Pad height, mm. */
  readonly h: Mm;
  /** Drill diameter, mm; absent on SMD pads. */
  readonly drill?: Mm;
  /** Hole centre offset from the pad centre along x, mm (castellated seat). */
  readonly holeDx?: Mm;
}

/** An imported envelope mesh on a row, with the signed volume the loader computed. */
export interface CatalogMesh {
  /** Path of the mesh file beside the row. */
  readonly file: string;
  /** sha256 of the file bytes, lowercase hex. */
  readonly sha256: string;
  /** Signed volume, mm3, computed at load; negative means inverted winding and the row is refused. */
  readonly signedVolumeMm3: number;
}

/**
 * A bought part. Every field that shapes geometry or connectivity carries
 * its own provenance; the row tier is the weakest such field (M08-T03 step
 * 2). Check fields never lower the row tier.
 */
export interface PartRow {
  readonly id: string;
  readonly name: string;
  readonly kind: "mcu" | "module" | "connector" | "fastener" | "magnet" | "insert" | "actuator" | "display" | "sensor" | "passive" | "board" | "other";
  /** Weakest geometry or connectivity field; the weakest field of any use when the row has none. */
  readonly tier: Tier;
  /** Provenance of the field that set the tier. */
  readonly provenance: Provenance;
  readonly fields: Readonly<Record<string, CatalogField>>;
  /** Per-MCU pin row (D-076), for microcontrollers; its own provenance, read by checks. */
  readonly mcu?: McuPinSpec;
  readonly mesh?: CatalogMesh;
  /** Processes the part can be mounted with. */
  readonly mounts?: readonly Process[];
}

/** Output shaft direction in the part frame, unit vector. Only a catalog row produces one. */
export type ShaftDir = Brand<Vec3, "ShaftDir">;
/** Anatomical joint axis in a design's frame, unit vector. Only a design produces one. */
export type AnatomicalAxis = Brand<Vec3, "AnatomicalAxis">;

/** Output shaft: where it sits and which way it points in the part frame (PAWL `mout`). */
export interface ShaftOut {
  /** Shaft axis point at the body face, mm. */
  readonly at: Vec3;
  readonly dir: ShaftDir;
}

/**
 * One row type for servos and geared steppers (D-104). mout is the physical
 * output shaft in the part frame; the anatomical axis belongs to the design
 * that places the part (PAWL pawl.html lines 182 to 185), so the row has no
 * field that holds one.
 */
export interface ActuatorRow extends PartRow {
  readonly kind: "actuator";
  readonly drive: "servo" | "geared-stepper" | "stepper" | "dc-gear";
  readonly mout: CatalogField<ShaftOut>;
}
