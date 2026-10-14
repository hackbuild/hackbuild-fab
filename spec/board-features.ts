// spec/board-features.ts
/**
 * Status: draft until the M08 exit. MILESTONES.md 1.5, D-179.
 * M08 is the first milestone that runs this file.
 */
// The board feature namespace (D-061). These live inside a board part, apart
// from the solid feature kinds, and both board backends (tscircuit capture
// and the gated direct-emit Python route) emit one pad and net record that
// CHK-BRD reads (D-089).
// Version 4, 2026-10-04; the record section M08-T02, 2026-10-09. Carries D-051, D-061, D-088, D-089, D-102.

import type { Deg, Hash, Mm, Ring, Tier, Vec2 } from "./ids";
import type { Provenance } from "./profile";

export type BoardSide = "top" | "bottom";
export type BoardLayer = "F.Cu" | "B.Cu" | "F.SilkS" | "B.SilkS" | "F.Mask" | "B.Mask" | "Edge.Cuts" | "F.Fab" | "B.Fab";

interface BoardFeatureBase {
  /** `<kind>.<name>`, unique within the board. */
  readonly id: string;
  readonly note?: string;
}

/** Board outline; first ring outer, the rest internal cutouts, mm. */
export interface OutlineBoardFeature extends BoardFeatureBase {
  readonly kind: "outline";
  readonly rings: readonly Ring[];
  /** Board thickness, mm. */
  readonly thickness: Mm;
}

/** Routed slot: centreline polyline in mm and tool width in mm. */
export interface RoutedSlotBoardFeature extends BoardFeatureBase {
  readonly kind: "routedSlot";
  readonly path: readonly Vec2[];
  /** Router width, mm. */
  readonly width: Mm;
}

/** Non-plated mounting hole. */
export interface NpthMountBoardFeature extends BoardFeatureBase {
  readonly kind: "npthMount";
  /** Centre, mm. */
  readonly at: Vec2;
  /** Drill diameter, mm. */
  readonly d: Mm;
  /** Copper keepout radius around the hole, mm. */
  readonly keepoutR: Mm;
}

export interface KeepoutBoardFeature extends BoardFeatureBase {
  readonly kind: "keepout";
  readonly outline: Ring;
  readonly layers: readonly BoardLayer[];
  readonly forbids: readonly ("copper" | "via" | "component" | "track")[];
}

/** Antenna keepout under and beside a module antenna. */
export interface AntennaKeepoutBoardFeature extends BoardFeatureBase {
  readonly kind: "antennaKeepout";
  readonly outline: Ring;
  /** Catalog id of the module the keepout belongs to. */
  readonly module: string;
}

export interface SilkStringBoardFeature extends BoardFeatureBase {
  readonly kind: "silkString";
  readonly text: string;
  /** Anchor, mm. */
  readonly at: Vec2;
  /** Glyph height, mm. */
  readonly height: Mm;
  /** Rotation, degrees. */
  readonly rotDeg: Deg;
  readonly side: BoardSide;
  /** Bottom-side strings mirror per string (SHUNT face convention, D-089). */
  readonly mirror: boolean;
}

/** Art on a copper, mask or silk layer from an hbf:// raster or SVG source. */
export interface ArtLayerBoardFeature extends BoardFeatureBase {
  readonly kind: "artLayer";
  readonly source: string;
  readonly layer: BoardLayer;
  /** Placement origin, mm. */
  readonly at: Vec2;
  /** Art width on the board, mm. */
  readonly width: Mm;
}

export interface RegistrationMarkBoardFeature extends BoardFeatureBase {
  readonly kind: "registrationMark";
  /** Centre, mm. */
  readonly at: Vec2;
  /** Mark diameter, mm. */
  readonly d: Mm;
}

/** Seat for a castellated module; holeDx is the half-hole offset from the board edge, mm. */
export interface CastellatedSeatBoardFeature extends BoardFeatureBase {
  readonly kind: "castellatedSeat";
  /** Catalog id of the module. */
  readonly module: string;
  /** Module origin on the board, mm. */
  readonly at: Vec2;
  /** Rotation, degrees. */
  readonly rotDeg: Deg;
  /** Half-hole centre offset from the module edge, mm. */
  readonly holeDx: Mm;
}

/**
 * Solder jumper with a declared default state. The SuperMini dual-supply
 * jumper default is normally open (SPINDLE) pending the owner (D-088).
 */
export interface SolderJumperBoardFeature extends BoardFeatureBase {
  readonly kind: "solderJumper";
  /** Centre, mm. */
  readonly at: Vec2;
  readonly nets: readonly [string, string];
  readonly default: "open" | "closed";
}

export interface MaskOpeningBoardFeature extends BoardFeatureBase {
  readonly kind: "maskOpening";
  readonly outline: Ring;
  readonly side: BoardSide;
}

export interface ThermalSlotBoardFeature extends BoardFeatureBase {
  readonly kind: "thermalSlot";
  readonly path: readonly Vec2[];
  /** Slot width, mm. */
  readonly width: Mm;
}

/** A component lead that lands bare on a pad; SHUNT's lead-landing proof measures it (55 at 0.000 mm). */
export interface BareLeadBoardFeature extends BoardFeatureBase {
  readonly kind: "bareLead";
  /** Catalog part id. */
  readonly part: string;
  /** Pad feature id the lead lands on. */
  readonly pad: string;
  /** Allowed landing error, mm. */
  readonly tolerance: Mm;
}

/** A deliberate short between nets, declared so the net check expects it. */
export interface DeclaredBridgeBoardFeature extends BoardFeatureBase {
  readonly kind: "declaredBridge";
  readonly nets: readonly [string, string];
  readonly reason: string;
}

export type BoardFeature =
  | OutlineBoardFeature | RoutedSlotBoardFeature | NpthMountBoardFeature | KeepoutBoardFeature
  | AntennaKeepoutBoardFeature | SilkStringBoardFeature | ArtLayerBoardFeature
  | RegistrationMarkBoardFeature | CastellatedSeatBoardFeature | SolderJumperBoardFeature
  | MaskOpeningBoardFeature | ThermalSlotBoardFeature | BareLeadBoardFeature | DeclaredBridgeBoardFeature;

export type BoardFeatureKind = BoardFeature["kind"];

export const BOARD_FEATURE_KINDS = [
  "outline", "routedSlot", "npthMount", "keepout", "antennaKeepout", "silkString", "artLayer",
  "registrationMark", "castellatedSeat", "solderJumper", "maskOpening", "thermalSlot", "bareLead",
  "declaredBridge",
] as const satisfies readonly BoardFeatureKind[];

// The one pad and net record both board backends emit (D-089), M08-T02.
// Every CHK-BRD check, the KiCad writer, the Circuit JSON writer, the CPL
// and BOM writers and the reparse script read this shape and nothing else.
// Coordinates: board frame, mm, origin at the outline bounding-box minimum,
// +y up, top-side view; angles in degrees, counter-clockwise. tscircuit's
// centred frame and KiCad's y-down frame convert at the adapter, never
// inside a check. packages/board/src/record.zod.ts enforces the rules the
// type cannot (unique ref.pin, members name pads, sorted nets, the hash).

export type BoardBackend = "direct" | "tscircuit";
export type CopperLayer = "F.Cu" | "B.Cu" | `In${1 | 2 | 3 | 4}.Cu`;

/** Pad shape; `rect`, `oval` and `roundrect` take w and h, `circle` takes w as diameter. */
export type PadShape = "rect" | "oval" | "circle" | "roundrect";

export interface RecordPad {
  /** Designator, the first half of the pair every writer keys on: "U1". */
  readonly ref: string;
  /** Pin name or number, the second half: "GPIO20". */
  readonly pin: string;
  /** Net name; "" only for a declared no-connect. */
  readonly net: string;
  readonly side: BoardSide;
  /** Through-hole pads exist on every copper layer. */
  readonly through: boolean;
  readonly shape: PadShape;
  /** Pad centre x, mm. */
  readonly x: Mm;
  /** Pad centre y, mm. */
  readonly y: Mm;
  /** Pad width, mm. */
  readonly w: Mm;
  /** Pad height, mm. */
  readonly h: Mm;
  /** Rotation, degrees CCW. */
  readonly rot: Deg;
  /** Drill diameter, mm; absent on SMD pads. */
  readonly drill?: Mm;
  /** Hole centre offset from the pad centre along the pad's own x, mm (castellated seat, D-061). */
  readonly holeDx?: Mm;
}

/** Declared 3D model: a model uri, or a stand-in with its reason, never silent. */
export type RecordModel = { readonly uri: string; readonly standIn: false } | { readonly standIn: true; readonly reason: string };

export interface RecordPart {
  readonly ref: string;
  readonly value: string;
  /** Catalog row id the part was built from (D-102). */
  readonly catalogId: string;
  /** Tier of the weakest catalog field the build read for this part. */
  readonly tier: Tier;
  readonly side: BoardSide;
  /** Body centre x, mm; CPL Mid X comes from here, never from pad centroids. */
  readonly x: Mm;
  /** Body centre y, mm; CPL Mid Y. */
  readonly y: Mm;
  /** Rotation, degrees CCW. */
  readonly rot: Deg;
  /** Declared body envelope, mm. */
  readonly body: { readonly w: Mm; readonly h: Mm; readonly z: Mm };
  readonly model?: RecordModel;
  /** Manufacturer part number for the BOM; absent when the design names none. */
  readonly mpn?: string;
  /** What the part is for, one line, for the BOM (SPINDLE "Purpose", SHUNT "note"). */
  readonly note?: string;
}

export interface RecordNet {
  readonly name: string;
  /** "ref.pin" members, sorted. */
  readonly members: readonly string[];
  /** Connections the design asserts by name, a count; the audit counts them (SPINDLE: 21). */
  readonly required?: number;
}

export interface RecordVia {
  readonly net: string;
  /** Centre x, mm. */
  readonly x: Mm;
  /** Centre y, mm. */
  readonly y: Mm;
  /** Drill diameter, mm. */
  readonly drill: Mm;
  /** Pad diameter, mm. */
  readonly pad: Mm;
  readonly layers: readonly [CopperLayer, CopperLayer];
}

/** Non-plated hole. */
export interface RecordHole {
  /** Centre x, mm. */
  readonly x: Mm;
  /** Centre y, mm. */
  readonly y: Mm;
  /** Drill diameter, mm. */
  readonly drill: Mm;
  readonly plated: false;
  readonly role: "mount" | "tooling";
}

export interface RecordTrack {
  readonly net: string;
  readonly layer: CopperLayer;
  /** Track width, mm. */
  readonly width: Mm;
  /** Centreline points, mm. */
  readonly pts: readonly Vec2[];
}

/** Solder jumper with a declared default (D-061, D-088). */
export interface RecordJumper {
  readonly ref: string;
  /** The two pad keys, "ref.pin". */
  readonly pads: readonly [string, string];
  readonly default: "open" | "closed";
  /** The two nets the jumper joins when closed. */
  readonly joins: readonly [string, string];
}

/** A bridge the design declares, through a part or a copper feature (SHUNT gold bar, SHIM switch). */
export interface RecordBridge {
  readonly nets: readonly [string, string];
  /** Part ref or feature id that carries the bridge. */
  readonly through: string;
  readonly reason: string;
}

/**
 * A copper pour on one layer (M08-T12): the island check lets the pour join
 * the items of its net inside its outline and outside every keepout on its
 * layer, standing for the fill a fab or KiCad computes.
 */
export interface RecordZone {
  readonly net: string;
  readonly layer: CopperLayer;
  /** Pour outline before clearance, mm, board frame. */
  readonly outline: Ring;
  /** Clearance the pour keeps from other nets, mm. */
  readonly clearance: Mm;
}

/** A keepout area (D-061 keepout and antenna keepout rows). */
export interface RecordKeepout {
  /** `<kind>.<name>`, unique within the board. */
  readonly id: string;
  readonly kind: "antenna" | "keepout";
  readonly layers: readonly CopperLayer[];
  /** Outline, mm, board frame. */
  readonly outline: Ring;
  readonly forbids: readonly ("pour" | "track" | "via" | "copper")[];
  /** Catalog id of the module an antenna keepout belongs to. */
  readonly module?: string;
}

/** A routed or thermal slot through the board, a stadium of w by h with end radius r. */
export interface RecordSlot {
  readonly id: string;
  readonly kind: "routed" | "thermal";
  /** Centre x, mm. */
  readonly x: Mm;
  /** Centre y, mm. */
  readonly y: Mm;
  /** Length along x before rotation, mm. */
  readonly w: Mm;
  /** Width, mm. */
  readonly h: Mm;
  /** End radius, mm. */
  readonly r: Mm;
  /** Rotation, degrees CCW. */
  readonly rot: Deg;
}

/** A silkscreen string as the generator drew it. */
export interface RecordSilk {
  readonly side: BoardSide;
  readonly text: string;
  /** Anchor x, mm (baseline). */
  readonly x: Mm;
  /** Anchor y, mm (baseline). */
  readonly y: Mm;
  /** Em size, mm. */
  readonly size: Mm;
  readonly anchor: "start" | "middle" | "end";
  /** Rotation, degrees CCW. */
  readonly rot: Deg;
  /** Bottom strings mirror so they read with the board turned over (SHUNT face convention). */
  readonly mirror: boolean;
  /** Font file stem the glyphs came from, for the exact-metric silk check. */
  readonly font?: string;
}

/** One catalog field the build read, for the export gate (D-102). */
export interface RecordRead {
  readonly catalogId: string;
  readonly field: string;
  readonly provenance: Provenance;
}

export interface BoardRecord {
  readonly schema: 1;
  readonly backend: BoardBackend;
  readonly board: {
    /** Closed outline, mm, CCW, first point not repeated. */
    readonly outline: Ring;
    /** Board thickness, mm. */
    readonly thickness: Mm;
    /** Copper layer count. */
    readonly copperLayers: 2 | 4;
    readonly finish?: "HASL" | "ENIG";
  };
  readonly parts: readonly RecordPart[];
  readonly pads: readonly RecordPad[];
  readonly nets: readonly RecordNet[];
  readonly vias: readonly RecordVia[];
  readonly holes: readonly RecordHole[];
  readonly tracks: readonly RecordTrack[];
  readonly jumpers: readonly RecordJumper[];
  readonly bridges: readonly RecordBridge[];
  /** Provenance of every catalog field the build read, for the export gate. */
  readonly reads: readonly RecordRead[];
  /** Copper pours (M08-T12); absent on a board with none. */
  readonly zones?: readonly RecordZone[];
  /** Keepouts and antenna keepouts (M08-T12). */
  readonly keepouts?: readonly RecordKeepout[];
  /** Routed and thermal slots (M08-T12). */
  readonly slots?: readonly RecordSlot[];
  /** Silkscreen strings (M08-T12). */
  readonly silk?: readonly RecordSilk[];
  /** sha256 over RFC 8785 JSON of this record with coordinates quantised to 1e-6 mm, this field excluded (D-051). */
  readonly recordHash: Hash;
}
