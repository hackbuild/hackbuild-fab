// spec/features.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// Feature declarations a build.ts writes and checks read. Each kind is a
// three-part contract (generator, checks, fit class) plus a reference, bound
// by FeatureKindDef in feature-kinds.ts.
// Version 4, 2026-10-04. Carries D-016, D-017, D-058, D-059, D-060, D-062,
// D-063, D-073, D-078, D-085, D-100, D-177.
//
// A feature is geometry on one part that a generator makes and a check
// proves. 22 kinds carried from the v3 spec in camelCase, plus the eight
// admitted kinds of D-059: thread, bayonet, magnet, inlay, insert, spring,
// mount, relief. Four v3 kinds left the union (D-177, MOVED_FEATURE_KINDS):
// latch is a mechanism, coupon is a reference, pivot and pinInSlot are
// joints. A kind enters the union a build.ts can use at the milestone whose
// FeatureKindDef compiles with a generator, a check and a reference
// (FEATURE_KIND_ADMISSION, FeatureAt). Board features live in
// board-features.ts. Numeric fields are mm unless the doc says otherwise.
// Every mating gap is per side (GapBasis in ids.ts) and is declared through
// the fit system as FitDecl, so one realGap path proves every joint. This
// covers bore, pocket and tabSlot as well as hinge, thread and contact. When a
// mate is declared (tabSlot.mate, or a JointDecl via in part-ir.ts), the
// kernel recomputes the gap per side from the two drawn sizes and refuses a
// FitDecl.drawnPerSide that differs from it by more than 1e-6 mm.

import type { Axis, BendDirection, Deg, FaceFrame, FitClassId, GapBasis, Mm, MeshHash, Process, Ring, Vec2, Vec3 } from "./ids";

/**
 * A mating gap declared through the fit system: the fit class and the drawn
 * gap per side. The fit check converts drawnPerSide with
 * ProfileLookup.realGap and proves the result against the class band, which
 * is also per side. A bore drawn 5.0 around a 4.6 pin declares
 * drawnPerSide 0.2.
 */
export interface FitDecl {
  readonly class: FitClassId;
  /** Drawn gap per side, mm. Negative means drawn interference. */
  readonly drawnPerSide: Mm;
  readonly basis: GapBasis;
}

export interface FeatureBase {
  /** `<kind>.<name>`, unique within a part, for example "bore.pivot", "contact.key1". */
  readonly id: string;
  /** Body id inside a multi-body part (D-048); absent means the part's first body. */
  readonly body?: string;
  /** Free text for people; never read by a check. */
  readonly note?: string;
  /**
   * JSON pointer into params per field this feature took from a param, for
   * example { gap: "/keys/0/gap" }. Written by build.ts through Author.bind;
   * same pointer form as Metric.drivenBy and Fix.param. Typed string, not
   * ParamPointer, to avoid an import cycle with constraints.ts.
   */
  readonly drivenBy?: Readonly<Record<string, string>>;
}

/**
 * Edge selectors address prism or revolve edges by construction, before any
 * mesh exists.
 */
export type EdgeSelector =
  | { readonly where: "top" | "bottom" | "outer" | "inner" | "all" }
  | { readonly where: "edge"; readonly ids: readonly string[] }
  /** Revolve profile arc; span bounds are fractions 0 to 1 of the profile, unitless. */
  | { readonly where: "profile"; readonly span: readonly [number, number] };

// Solid kinds (v3, renamed per D-017).

export interface BoreFeature extends FeatureBase {
  readonly kind: "bore";
  readonly axis: Axis;
  /** Drawn diameter, mm. */
  readonly d: Mm;
  /** Depth along the axis, mm, or through the body. */
  readonly depth: Mm | "through";
  /** Class and drawn gap per side to the declared mate (FitDecl). */
  readonly fit: FitDecl;
  /** auto: teardrop when the axis is horizontal in the print pose. */
  readonly teardrop?: "auto" | boolean;
  /** Lead-in chamfer: depth in mm, angle in degrees. */
  readonly leadIn?: { /** mm */ readonly depth: Mm; /** degrees */ readonly angleDeg: Deg };
  /**
   * The printed stud this bore seats on, when the bore is a printed
   * conductive socket (BAFFLE R3 tile, CHK-FIT-07, M05-T19): stud diameter
   * and height, mm, and the axial slots that split the socket wall into
   * fingers, count. The socket depth is `depth`.
   */
  readonly onStud?: {
    /** Stud diameter, mm. */
    readonly studD: Mm;
    /** Stud height above the face the socket bottoms on, mm. */
    readonly studH: Mm;
    /** Collet fingers, count: the axial slots through the socket wall. */
    readonly fingers: number;
  };
}

/**
 * Pause-at-height declaration for a sealed pocket (D-062). Only z is
 * declared. z must equal a layer top of the active preset (MachineView.layer
 * returns one); CHK-PRT-15 refuses any other value. The 3MF writer resolves
 * the layer index from the preset at export (MachineView.layerIndex) and
 * writes {z, layer} to the print card and Metadata/custom_gcode_per_layer.xml,
 * so a declared index can never disagree with the grid. On ffc5p_20260819 a
 * pause at z 1.69 lands after layer index 6, before index 7.
 */
export interface PauseBefore {
  /** Top of the last layer printed before the pause, print pose, mm. */
  readonly z: Mm;
}

export interface PocketFeature extends FeatureBase {
  readonly kind: "pocket";
  readonly outline: Ring;
  readonly face: FaceFrame;
  /** Depth into the face, mm. */
  readonly depth: Mm;
  readonly floor: "flat" | "stepped";
  /** Class and drawn gap per side to the part seated in the pocket (FitDecl). */
  readonly fit: FitDecl;
  /**
   * A pocket closed by later layers (D-062). The pause is written to the
   * print card and Metadata/custom_gcode_per_layer.xml. The pocket check
   * requires floor at least 0.6 mm and roof at least 0.8 mm.
   */
  readonly sealed?: { readonly pauseBefore: PauseBefore };
}

export interface BossFeature extends FeatureBase {
  readonly kind: "boss";
  readonly axis: Axis;
  /** Diameter, mm. */
  readonly d: Mm;
  /** Height, mm. */
  readonly h: Mm;
  /** Root fillet radius, mm. */
  readonly rootFillet?: Mm;
}

export interface TabSlotFeature extends FeatureBase {
  readonly kind: "tabSlot";
  readonly role: "tab" | "slot";
  /** Width, mm. */
  readonly w: Mm;
  /** Material thickness, mm. */
  readonly t: Mm;
  /** The process that made this side; the mate's process selects the fit class. */
  readonly process: Process;
  /** Class and drawn gap per side to the mate (FitDecl). */
  readonly fit: FitDecl;
  /** Feature id of the mate on another part. */
  readonly mate?: string;
}

/**
 * Snap catch and closure. Strain is checked against the material's
 * StrainLimit for `bend` (D-073): 2.5 percent PETG in the layer plane
 * (empirical), 1.5 percent default across layers until a coupon.
 */
export interface SnapFeature extends FeatureBase {
  readonly kind: "snap";
  readonly catch: {
    /**
     * Catch interference per side, mm (GapBasis perSide). A barb drawn 0.3
     * over its bore diameter has 0.15 per side.
     */
    readonly interferencePerSide: Mm;
    /** Lead-in angle, degrees. */
    readonly leadInAngleDeg: Deg;
  };
  readonly closure: {
    /** Leg width, mm. */
    readonly legWidth: Mm;
    /** Slot width, mm. */
    readonly slotWidth: Mm;
    /** Travel within which the legs must close, mm. */
    readonly mustCloseBy: Mm;
  };
  readonly bend: BendDirection;
}

/** Built before union (stage 2, D-047). Half-spaces are unbounded. */
export interface ChamferFeature extends FeatureBase {
  readonly kind: "chamfer";
  readonly edges: EdgeSelector;
  /** Leg size, mm. */
  readonly size: Mm;
  /** Angle from the face, degrees; 45 by default. */
  readonly angleDeg?: Deg;
}

/** A round on a prism or revolve edge, built before union (stage 2, D-047). */
export interface RoundFeature extends FeatureBase {
  readonly kind: "round";
  readonly edges: EdgeSelector;
  /** Radius, mm. */
  readonly r: Mm;
}

/** r(theta, z) sampled into an angular LUT per slab; COLLAR's eleven edge styles. */
export interface EdgeProfileFeature extends FeatureBase {
  readonly kind: "edgeProfile";
  /** Edge style registry id, for example "reeded", "diamond-knurl", "rope" (plan-deltas R90). */
  readonly style: string;
  /** Style parameters; each style's schema states units (mm or degrees). */
  readonly params: Readonly<Record<string, number>>;
  /** Styles that vary with z force one slab per layer. */
  readonly zDependent: boolean;
}

/** A through window with a gabled roof so it prints without support. */
export interface WindowFeature extends FeatureBase {
  readonly kind: "window";
  readonly outline: Ring;
  readonly face: FaceFrame;
  readonly roof: "gabled" | "flat" | "cone";
  /** Roof angle from horizontal, degrees. */
  readonly roofAngleDeg?: Deg;
}

/** The skeletonise weld: shortest line from a loose piece to the rest, clipped to the profile. */
export interface WebFeature extends FeatureBase {
  readonly kind: "web";
  readonly from: Vec2;
  readonly to: Vec2;
  /** Web thickness, mm. */
  readonly thickness: Mm;
  readonly clipToProfile: true;
}

/** Driver reach becomes checkable once the axis is declared. */
export interface ScrewFeature extends FeatureBase {
  readonly kind: "screw";
  /** Thread designation, for example "M3", "#8". */
  readonly thread: string;
  readonly axis: Axis;
  /** Driver approach direction, unitless. */
  readonly driverAxis: Vec3;
  /** Clear length a driver needs along driverAxis, mm. */
  readonly reachLen: Mm;
  /** Thread engagement length, mm. */
  readonly engagementLen: Mm;
  readonly insert?: "heat-set" | "self-tap" | "through-nut";
}

export interface HingeFeature extends FeatureBase {
  readonly kind: "hinge";
  readonly axis: Axis;
  /** Knuckle count. */
  readonly knuckles: number;
  /** Which half owns the end knuckles; print in place needs one owner. */
  readonly parity: "a-ends" | "b-ends";
  readonly rod: "continuous" | "stub";
  /** Knuckle to rod and knuckle to knuckle gap, per side, through the fit system. */
  readonly fit: FitDecl;
}

/**
 * A solid region that is also a net. Resistance follows from geometry: the
 * declared width and t are budgets the solver bounds; the measured cross
 * section lands in metrics after the build. PIP buried stack defaults
 * (D-085): trace layer 0.72, trace width 1.4, net-to-net floor 0.60.
 */
export interface ConductorFeature extends FeatureBase {
  readonly kind: "conductor";
  /**
   * Where the conductor lies. `path` is a closed outline of a filled
   * region; `centreline` is an open polyline swept at `width` for a trace,
   * with round ends and round joins (every point within width / 2 of the
   * polyline), clipped to the body outline; resistance uses the centreline
   * length;
   * `meshHash` is a region the kernel already built. Vertices in mm in the
   * face frame.
   */
  readonly region:
    | { readonly path: Ring; readonly face: FaceFrame }
    | { readonly centreline: readonly Vec2[]; readonly face: FaceFrame }
    | { readonly meshHash: MeshHash };
  /** Profile material id; must carry resistivity rows. */
  readonly material: string;
  readonly net: string;
  /** Declared trace width, mm. */
  readonly width: Mm;
  /** Declared trace thickness, mm. */
  readonly t: Mm;
  /** Declared path length budget, mm; measured length lands in metrics. */
  readonly pathLen?: Mm;
  /**
   * "element": the resistive track whose share of the loop a ratiometric
   * read swings over (a slider or pot track). CHK-NET-30 reads the element
   * against the other conductors of its net, the leads (BAFFLE R3 model.js
   * check, M05-T19). Absent: a lead or a plain trace.
   */
  readonly role?: "element";
}

/** Two conductors that touch when actuated. gap and coneH carry the flex key (CHK-KEY-01). */
export interface ContactFeature extends FeatureBase {
  readonly kind: "contact";
  /** Conductor feature id. */
  readonly a: string;
  /** Conductor feature id. */
  readonly b: string;
  /** Minimum contact force, N. */
  readonly forceMinN: number;
  /** Maximum closed-contact resistance, ohm. */
  readonly maxOhm: number;
  /** Travel to contact, mm. */
  readonly gap?: Mm;
  /** Cone height of a flex key cap, mm. */
  readonly coneH?: Mm;
  /**
   * Body that moves when the contact is actuated, for example the flex
   * key's cTPU cap. CHK-NET-27 moves it along `axis` by `gap` and tests
   * touch against both conductors; CHK-NET-26 builds the actuated net graph
   * from it (M05-T19, FEELER makesContact). Absent: the contact is never
   * moved and both checks say so.
   */
  readonly actuator?: string;
  /** Direction the actuator moves when pressed, print pose, unitless; its length is ignored. */
  readonly axis?: Vec3;
  /** Fit class and drawn gap per side; a declaration proven by fit(). */
  readonly fit?: FitDecl;
}

/** Composition typing. Ports with incompatible interfaces refuse to connect. */
export interface PortFeature extends FeatureBase {
  readonly kind: "port";
  readonly net: string;
  readonly type: "signal" | "power" | "gnd";
  /** Port interface registry id, for example "digital", "touch", "i2c" (plan-deltas R90). */
  readonly interface: string;
  /** Allowed voltage range, V. */
  readonly voltage?: { /** V */ readonly min: number; /** V */ readonly max: number };
  /**
   * A board pin seated on the part: the port is a net tap where a printed
   * contact meets the pin, and the read path of its net ends here instead
   * of at a lead on the body outline (K-04). Absent for a port wired off
   * the part.
   */
  readonly tap?: PortTap;
  // The receiving MCU, pin and read model are facts about the wiring, so
  // they live in Chase.hookup (chase.ts), keyed by this port's id. A wiring
  // change leaves the Part IR and its buildHash unchanged; circuit.solve and
  // the firmware emitter read hookup, and geometry checks never do. A tap
  // is geometry: the seat places the board, so its pin is fixed by the part.
}

/**
 * Where a seated board's pin lands on a printed contact (a seat bump or
 * socket). The seat archetype writes it from the board's catalog row;
 * circuit.solve ends the net's read path at `conductor` and reads the pin
 * with the row's MCU, and CHK-NET-46 proves the landing.
 */
export interface PortTap {
  /** Conductor feature id the pin presses on. */
  readonly conductor: string;
  /** Pin centre in the part frame at the contact face, mm: the catalog pin position placed by the seat frame. */
  readonly at: Vec3;
  /** Catalog row id of the seated board, for example "rp2040-zero". */
  readonly board: string;
  /** MCU catalog id the board row names, for example "rp2040". */
  readonly mcu: string;
  /** Pin name on the board row, for example "GP8". */
  readonly pin: string;
  /** How the pin meets the contact: pressed onto a bump, or a header pin into a socket. */
  readonly contact: "bump" | "socket";
  /** Declared press depth, mm: the clamp interference on a bump, the pin length into a socket. */
  readonly pressMm: Mm;
  /** Body that applies the press when the part carries it; absent when the clamp is another part (a bezel). */
  readonly clamp?: string;
}

export interface PadFeature extends FeatureBase {
  readonly kind: "pad";
  readonly net: string;
  /** Pad size, mm. */
  readonly size: Vec2;
  readonly for: "solder" | "clip" | "screw" | "peg" | "tape";
}

export interface HornFeature extends FeatureBase {
  readonly kind: "horn";
  /** Catalog actuator id. */
  readonly servo: string;
  readonly keyed: boolean;
  /** Horn recess depth, mm. */
  readonly recessDepth: Mm;
}

/**
 * Detent strip: the strip and bump geometry, which a generator makes and
 * CHK-MOT checks prove. The governing numbers (click force, stiffness) come
 * from the mechanisms canon: `mechanism` names the MechanismDef whose
 * derive() writes them to Part IR as metrics gated by this kind's check, so
 * the identity lives in one place (D-016 keeps the kind, D-095, D-177).
 */
export interface DetentFeature extends FeatureBase {
  readonly kind: "detent";
  /** Strip width, thickness and free length, mm. */
  readonly strip: { /** mm */ readonly w: Mm; /** mm */ readonly t: Mm; /** mm */ readonly freeLen: Mm };
  /** Bump height in mm and profile. */
  readonly bump: { /** mm */ readonly h: Mm; readonly profile: "round" | "vee" };
  /** Target click force, N. */
  readonly clickForceN: number;
  /** MechanismDef id whose derive() feeds the gated metrics, for example "count-wheel-detent". */
  readonly mechanism?: string;
}

// Sheet kinds

export interface FingerFeature extends FeatureBase {
  readonly kind: "finger";
  /** Finger count. */
  readonly count: number;
  /** Finger width, mm. */
  readonly width: Mm;
  readonly processA: Process;
  readonly processB: Process;
  /** Burn compensation, mm (Boxes.py semantics, half the beam width). */
  readonly burn?: Mm;
  /**
   * The base line of the finger edge in part coordinates, mm, from its first
   * segment to its last (TUMBLER fingerEdgePts, M06-T02 step 5). CHK-SHT-11
   * measures the fingers and recesses along it on the body's outline.
   */
  readonly edge?: { readonly from: Vec2; readonly to: Vec2 };
}

export interface FlexCutFeature extends FeatureBase {
  readonly kind: "flexCut";
  /** Row count. */
  readonly rows: number;
  /** Bend per row, degrees; 13 maximum. */
  readonly degPerRow: Deg;
  /** Slot length, mm. */
  readonly slotLen: Mm;
  /** Land length, mm. */
  readonly landLen: Mm;
  /** Row pitch, mm. */
  readonly pitch: Mm;
}

export interface LaminationFeature extends FeatureBase {
  readonly kind: "lamination";
  /** Layer count. */
  readonly layers: number;
  /** Alignment pin diameter in mm and positions in mm. */
  readonly pins: { /** mm */ readonly d: Mm; readonly at: readonly Vec2[] };
  readonly keeper: "washer" | "glue" | "none";
}

/** A vertical plate through a horizontal one: a long slot broken by bridges. */
export interface BridgeFeature extends FeatureBase {
  readonly kind: "bridge";
  /** Slot length, mm. */
  readonly slotLen: Mm;
  /** Bridge positions along the slot, mm; each must land in a clear region. */
  readonly bridgesAt: readonly Mm[];
}

// Admitted kinds (D-059). Each enters with generator, check, fit class and
// reference in the milestone that admits it.

/** Thread (TENON). Made by the revolve route with a radial field. */
export interface ThreadFeature extends FeatureBase {
  readonly kind: "thread";
  readonly role: "external" | "internal";
  readonly axis: Axis;
  /** Major diameter, mm. */
  readonly d: Mm;
  /** Threaded length, mm. */
  readonly length: Mm;
  /** Pitch, mm. */
  readonly pitch: Mm;
  /** Start count. */
  readonly starts: number;
  /** Thread depth, mm. */
  readonly depth: Mm;
  /** Radial gap to the mate, per side, through the fit system. */
  readonly fit: FitDecl;
  readonly hand: "right" | "left";
  /** Phase reference: feature id the start angle is measured from, and the angle in degrees. */
  readonly phase?: { readonly ref: string; /** degrees */ readonly deg: Deg };
}

/** Bayonet (TENON, CASK, PINTLE). */
export interface BayonetFeature extends FeatureBase {
  readonly kind: "bayonet";
  readonly role: "male" | "female";
  readonly axis: Axis;
  /** Lug circle diameter, mm. */
  readonly d: Mm;
  /** Lug count. */
  readonly lugs: number;
  /** Lug angular width, degrees. */
  readonly lugWidthDeg: Deg;
  /** Twist travel, degrees. */
  readonly travelDeg: Deg;
  /** Radial gap between lug and track, per side, through the fit system. */
  readonly radialFit: FitDecl;
  /** Axial gap between lug and groove faces, per side, through the fit system. */
  readonly axialFit: FitDecl;
  /** Axial preload interference, mm. */
  readonly preload: Mm;
  /** A detent gate at the end of travel. */
  readonly detentGate: boolean;
  /** One lug differs so the parts mate one way. */
  readonly keyed: boolean;
  /** Mirror when the part is printed flipped (D-063). */
  readonly mirrorOnFlip: boolean;
}

/** Magnet pocket (KNUCKLE: pocket diameter is magnet d + 0.2 mm, which is 0.1 mm per side). */
export interface MagnetFeature extends FeatureBase {
  readonly kind: "magnet";
  readonly axis: Axis;
  /** Magnet diameter, mm. */
  readonly d: Mm;
  /** Magnet height, mm. */
  readonly h: Mm;
  /** Sealed magnets pause the print to insert (D-062). */
  readonly sealed: false | { readonly pauseBefore: PauseBefore };
}

/** Multi-colour art inlay (COLLAR and seven other designs). */
export interface InlayFeature extends FeatureBase {
  readonly kind: "inlay";
  /** hbf:// uri or param id of the art source. */
  readonly art: string;
  readonly face: FaceFrame;
  /** Filament slot, 1-based. */
  readonly slot: number;
  /**
   * Inlay depth, count of layers below the face, which sits on a layer top.
   * Depth in mm is depthLayers x layerHeight; the inlay check refuses a
   * depth that reaches into the first layer, whose height differs.
   */
  readonly depthLayers: number;
  /** Minimum printable feature, mm. */
  readonly minFeature: Mm;
  /** Despeckle threshold, fraction of a min-feature disc area, unitless; 0.35 default (D-145). */
  readonly despeckle: number;
}

/** Heat-set insert: hole diameter is OD minus 0.2 mm (0.1 mm interference per side), depth is length plus 0.5 mm. */
export interface InsertFeature extends FeatureBase {
  readonly kind: "insert";
  readonly axis: Axis;
  /** Knurl outer diameter, mm. */
  readonly od: Mm;
  /** Insert length, mm. */
  readonly length: Mm;
  /** Boss around the insert: diameter and height in mm. */
  readonly boss?: { /** mm */ readonly d: Mm; /** mm */ readonly h: Mm };
}

/**
 * Click spring (PIP double-cosine PETG beam). CHK-KEY-04 bounds riseQ by the
 * FE criteria of D-071; at PIP defaults (l 24, t 0.55, w 1.6, E 1900 MPa)
 * the upper bound is Q 2.2 (strain 2.50 percent, computed). The feature
 * holds the beam geometry; the curve and readouts come from the sim FE and
 * the "click-spring-key" mechanism as gated metrics (D-059, D-075, D-177).
 */
export interface SpringFeature extends FeatureBase {
  readonly kind: "spring";
  /** Beam span l, mm. */
  readonly l: Mm;
  /** Beam thickness in the bending direction t, mm. */
  readonly t: Mm;
  /** Beam width w, mm. */
  readonly w: Mm;
  /** Rise ratio Q, rise over thickness, unitless. */
  readonly riseQ: number;
  readonly ends: "clamped" | "pinned";
  readonly bend: BendDirection;
  /**
   * Width of the rigid shuttle at the beam centre, mm. The click-spring FE
   * shortens the flexing span by sw / 2 (PIP layout.js line 110), so
   * CHK-KEY-04 needs it; a spring without a shuttle declares 0. Optional
   * for one minor version; added at M06-T08 (card defect M04-T01).
   */
  readonly sw?: Mm;
  /** MechanismDef id whose derive() feeds the gated metrics; "click-spring-key" by default. */
  readonly mechanism?: string;
}

/** Mounting pattern (STANCHION, PINTLE, SPOOL). */
export interface MountFeature extends FeatureBase {
  readonly kind: "mount";
  readonly face: FaceFrame;
  /** Hole centres in the face frame, mm. */
  readonly pattern: readonly Vec2[];
  /** Hole diameter, mm. */
  readonly d: Mm;
  /** Rotational symmetry order of the pattern, count. */
  readonly symmetryOrder: number;
  readonly handedness: "left" | "right" | "none";
}

/**
 * First-layer relief against elephant foot (KNURL). The generator reads the
 * active preset's comp.elephantFoot: above 0 the slicer already compensates,
 * so the relief emits no geometry and records a metric naming the slicer
 * value; at 0 it emits `width`. Never both, so the foot is not removed twice.
 */
export interface ReliefFeature extends FeatureBase {
  readonly kind: "relief";
  readonly edges: EdgeSelector;
  /** Horizontal relief, mm. */
  readonly width: Mm;
  /** Height the relief spans from the bed, mm. */
  readonly height: Mm;
}


export type Feature =
  | BoreFeature | PocketFeature | BossFeature | TabSlotFeature | SnapFeature
  | ChamferFeature | RoundFeature | EdgeProfileFeature | WindowFeature | WebFeature
  | ScrewFeature | HingeFeature | ConductorFeature | ContactFeature | PortFeature
  | PadFeature | HornFeature | DetentFeature | FingerFeature | FlexCutFeature
  | LaminationFeature | BridgeFeature
  | ThreadFeature | BayonetFeature | MagnetFeature | InlayFeature
  | InsertFeature | SpringFeature | MountFeature | ReliefFeature;

export type FeatureKind = Feature["kind"];
export type FeatureOf<K extends FeatureKind> = Extract<Feature, { kind: K }>;

/** The 22 part-level kinds carried from v3 (26 less the four of MOVED_FEATURE_KINDS). */
export const CORE_FEATURE_KINDS = [
  "bore", "pocket", "boss", "tabSlot", "snap", "chamfer", "round", "edgeProfile", "window", "web",
  "screw", "hinge", "conductor", "contact", "port", "pad", "horn", "detent",
  "finger", "flexCut", "lamination", "bridge",
] as const;

/** The eight kinds admitted in v4 (D-059). */
export const ADMITTED_FEATURE_KINDS = [
  "thread", "bayonet", "magnet", "inlay", "insert", "spring", "mount", "relief",
] as const;

export const FEATURE_KINDS = [...CORE_FEATURE_KINDS, ...ADMITTED_FEATURE_KINDS] as const;

/** Admitted only when a second design needs them (D-060). The registry refuses them until then. */
export const BACKLOG_FEATURE_KINDS = [
  "sweepcut", "coupling", "loom", "keel", "seat", "hangSlot", "peg", "sheetThrough", "halfLap",
  "stencil", "applique", "weir", "peristaltic",
] as const;

/** Old spellings the loader accepts for one minor version (D-017). */
export const FEATURE_KIND_ALIASES = {
  tabslot: "tabSlot",
  flexcut: "flexCut",
} as const satisfies Record<string, FeatureKind>;

/**
 * v3 kinds that left the Feature union (D-177), each with where its
 * declaration lives now. They sat at another level of abstraction: a
 * mechanism with a governing identity, a part type, and two relations
 * between parts. The loader refuses each with E_SCHEMA and quotes the
 * target below, so a v3 document migrates by hand once.
 */
export const MOVED_FEATURE_KINDS = {
  latch: "mechanism: MechanismDef displacement-coincidence-latch, apply() emits bore, pocket and web features, the latch.margin metric gated by CHK-MOT-05 and an identity assertion (spec/canon.ts, Author.mech)",
  coupon: "reference: reference/coupons/<id>/ whose chase declares Chase.coupon (spec/chase.ts CouponDecl); its geometry is ordinary features",
  pivot: "joint: JointDecl kind revolute with via (bore pair) and stock for bought round stock between sheet parts (spec/part-ir.ts)",
  pinInSlot: "joint: JointDecl kind prismatic or planar with via (pin feature, slot window or pocket) and range, plus a contact assertion over range (spec/part-ir.ts)",
  pin_in_slot: "joint: as pinInSlot",
} as const;
export type MovedFeatureKind = keyof typeof MOVED_FEATURE_KINDS;

/** Kinds whose generators may emit preUnionCutters (stage 2, D-047). */
export const PRE_UNION_KINDS = ["chamfer", "round"] as const satisfies readonly FeatureKind[];

// Admission (D-058, D-177). A kind is usable in a build at the milestone
// whose FeatureKindDef compiles with a generator, a non-empty check set and
// a non-empty reference. Before that the kind exists here as a declared
// shape and nowhere else: FeatureAt<M> leaves it out of what build.ts can
// return, and the loader refuses it with E_SCHEMA naming the milestone.

/**
 * Milestones in order; M-1 and M-S admit no kind. M-S (D-179) builds the
 * keys flex-pair reference through draft defs for pocket, conductor,
 * contact and port that stay outside FeatureKindRegistryAt, typed against
 * PartDraft; the admissions below do not move.
 */
export const KIND_MILESTONES = [
  "M00", "M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10",
  "M11", "M12", "M13", "M14", "M15", "M16",
] as const;
export type KindMilestone = (typeof KIND_MILESTONES)[number];

/**
 * Planned admitting milestone per kind, from the milestone cards. M00 ships
 * with no feature kind: its parity targets build from mesh routes alone, and
 * stages 2 and 4 take empty lists. A kind whose card slips moves later in
 * the same commit that moves the card, never earlier than its def compiles.
 * M11 (M11-T05 to T07) admits every kind no design milestone completed.
 *
 * | milestone | kinds | card |
 * |---|---|---|
 * | M03 | pocket, inlay | M03-T08, reference cosmetic/coin-inlay |
 * | M05 | conductor, contact, port, pad | M05-T14, M05-T18 |
 * | M06 | bore, window, detent, finger, flexCut, spring | M06-T02, T06, T08, T09 |
 * | M10 | hinge, thread, bayonet, magnet, insert, relief | KNUCKLE, TENON, KNURL ports |
 * | M11 | boss, tabSlot, snap, chamfer, round, edgeProfile, web, screw, horn, lamination, bridge, mount | M11-T05 to T07 |
 */
export const FEATURE_KIND_ADMISSION = {
  pocket: "M03", inlay: "M03",
  conductor: "M05", contact: "M05", port: "M05", pad: "M05",
  bore: "M06", window: "M06", detent: "M06", finger: "M06", flexCut: "M06", spring: "M06",
  hinge: "M10", thread: "M10", bayonet: "M10", magnet: "M10", insert: "M10", relief: "M10",
  boss: "M11", tabSlot: "M11", snap: "M11", chamfer: "M11", round: "M11", edgeProfile: "M11",
  web: "M11", screw: "M11", horn: "M11", lamination: "M11", bridge: "M11", mount: "M11",
} as const satisfies Record<FeatureKind, KindMilestone>;

/** Milestones up to and including M, as a union. */
type MilestonesThrough<M extends KindMilestone, T extends readonly KindMilestone[] = typeof KIND_MILESTONES, Acc extends KindMilestone = never> =
  T extends readonly [infer H extends KindMilestone, ...infer R extends readonly KindMilestone[]]
    ? (H extends M ? Acc | H : MilestonesThrough<M, R, Acc | H>)
    : Acc;

/** Kinds admitted at or before milestone M. */
export type KindsAdmittedBy<M extends KindMilestone> = {
  [K in FeatureKind]: (typeof FEATURE_KIND_ADMISSION)[K] extends MilestonesThrough<M> ? K : never;
}[FeatureKind];

/**
 * The features a build.ts may declare at milestone M. @hackbuild/kernel
 * pins its milestone and exports `Feature` as FeatureAt of it, so a
 * build.ts that declares a kind with no proving check and reference fails
 * tsc, and PartDraft.features carries only proven kinds.
 */
export type FeatureAt<M extends KindMilestone> = Extract<Feature, { kind: KindsAdmittedBy<M> }>;
