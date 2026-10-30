// spec/profile.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// Every number with provenance: materials, machines, fits, loss, bleed and
// constants. No model writes here; coupons are the only write path, and a
// person enters their results.
// Version 4, 2026-10-04. Carries D-007, D-073, D-081, D-083, D-084, D-099,
// D-100, D-101. LossRow axis, dRange and comp, MachinePreset comp: PROFILE.md 7.1.
// Toolhead, MaterialHandling, ToolheadAssignment: PROFILE.md 3.6 and 8.3,
// read by CHK-3MF-09 (CHECKS.md 9.12).
// 2026-10-06: MachinePreset.slicer.bedType, the 3MF curr_bed_type (D-226).

import type {
  BendDirection, FitClassId, GapBasis, IsoDate, Mm, Ohm, Process, Qualification, ResistivityDirection, Tier, Vec3,
} from "./ids.js";
import { TIERS, TIER_QUALIFIER } from "./ids.js";

/** How a number was obtained (D-099). felt covers OGEE16's hand-raised bands. */
export type ProvenanceMethod = "datasheet" | "coupon" | "failure" | "felt" | "listing" | "derived";

/** Print conditions that move a measured value (Nowka 2024 shows they move resistivity). */
export interface ProvenanceConditions {
  /** Nozzle temperature, degrees C. */
  readonly temperatureC?: number;
  /** Print speed, mm/s. */
  readonly speedMmS?: number;
  /** Layer height, mm. */
  readonly layer?: Mm;
  /** Line width, mm. */
  readonly lineWidth?: Mm;
  /** Print direction relative to the measured quantity. */
  readonly direction?: ResistivityDirection;
}

/** Lowest tier in a list (TIERS is ordered highest first); null for an empty list. */
export function lowestTier(tiers: readonly Tier[]): Tier | null {
  let lo: Tier | null = null;
  for (const t of tiers) if (lo === null || TIERS.indexOf(t) > TIERS.indexOf(lo)) lo = t;
  return lo;
}

/**
 * Qualification of a value read straight from one row (D-007): the row's
 * tier mapped through TIER_QUALIFIER, basis the tier itself.
 */
export function qualifyRow(tier: Tier): Qualification {
  const q = TIER_QUALIFIER[tier];
  // TIER_QUALIFIER fixes which tiers read as which qualifier, so each pair is a legal variant.
  return { qualifier: q, basis: tier } as Qualification;
}

/**
 * Qualification of a number an equation produced (D-007). One entry per
 * profile row the equation read; null marks a row it needed and did not
 * find. Any null gives unknown; otherwise computed with basis the lowest
 * input tier, or null when the equation read no row (geometry or params
 * only). A computed number never reads measured, even over measured rows.
 */
export function qualify(inputs: readonly (Tier | null)[]): Qualification {
  const tiers: Tier[] = [];
  for (const t of inputs) {
    if (t === null) return { qualifier: "unknown", basis: null };
    tiers.push(t);
  }
  return { qualifier: "computed", basis: lowestTier(tiers) };
}

/** Provenance record on every profile row (D-099). */
export interface Provenance {
  readonly tier: Tier;
  readonly method: ProvenanceMethod;
  readonly date: IsoDate;
  /** Machine profile id the value was measured on, for measured rows. */
  readonly machine?: string;
  /** Coupon id, for coupon rows. */
  readonly coupon?: string;
  readonly conditions?: ProvenanceConditions;
  /** Citation: repo path with line, datasheet and page, or record id. */
  readonly source: string;
}

/**
 * One resistivity row (D-081). Rules carried by the type:
 * raw-filament rows are never scaled onto printed traces (Yousu 240 to 481
 * ohm cm is raw filament); a row with `brand` applies to that brand only
 * (Nowka 2024 figures are Protopasta only).
 */
export interface ResistivityRow {
  /** Row id, for example "cpla.pip-preset.along". */
  readonly id: string;
  readonly direction: ResistivityDirection;
  /** Resistivity, ohm cm: a single value or a range [lo, hi]. */
  readonly ohmCm: number | readonly [number, number];
  readonly form: "raw-filament" | "molded" | "printed";
  /** Filament brand the row applies to, for example "Yousu", "Protopasta", "Electrifi". */
  readonly brand: string;
  readonly provenance: Provenance;
  /**
   * Source note: specimen geometry, table or figure, and any reading that
   * departs from the usual ordering. Profile conformance warns when a
   * printed row set for one brand and source has through below along and
   * no note citing the source figure.
   */
  readonly note?: string;
}

/**
 * Section resistance of a conductor segment, the one home of R = rho L / A
 * (profile owns it; circuit and archetypes call it). ohm = row.ohmCm x 10 x
 * lengthMm / areaMm2, per range end when ohmCm is a range. tier is
 * row.provenance.tier. Pure: no table read, so callers obtain the row
 * through ProfileLookup.resistivity(), which records the read. Golden,
 * computed: cpla 500 ohm cm, L 1 mm, area 1.4 x 0.72 mm2 gives 4960.3 ohm.
 */
export type SectionResistance = (
  row: ResistivityRow, lengthMm: Mm, areaMm2: number,
) => { readonly ohm: Ohm | readonly [Ohm, Ohm]; readonly tier: Tier; readonly rowId: string };

/**
 * Strain limit by bend direction (D-073). PETG snap and click: 2.5 percent
 * in the layer plane (inferred, method failure: a ceiling set below the 2.7
 * to 3.3 percent the HAFT solver computed for beams that broke); 1.5 percent default across layers (range 1.5 to 1.8) until a
 * coupon. TDS elongation is not the basis.
 */
export interface StrainLimit {
  readonly use: "snap" | "click" | "fatigue";
  readonly bend: BendDirection;
  /** Limit, percent strain. */
  readonly pct: number;
  /** Plausible range when the limit is a default, percent strain. */
  readonly rangePct?: readonly [number, number];
  readonly provenance: Provenance;
}

export interface Material {
  /** Profile id, for example "petg", "cpla", "ctpu", "ply3", "acrylic3", "cardstock". */
  readonly id: string;
  readonly name: string;
  readonly processes: readonly Process[];
  readonly brand?: string;
  /** Density, g/cm3. */
  readonly densityGcm3?: number;
  /** Young's modulus, MPa. */
  readonly modulusMPa?: number;
  readonly resistivity: readonly ResistivityRow[];
  readonly strain: readonly StrainLimit[];
  readonly creep: "low" | "high" | "unknown";
  /** Static friction coefficient against other material ids, unitless. */
  readonly frictionStatic?: Readonly<Record<string, number>>;
  /** Sheet and tape stock thickness, mm. */
  readonly thickness?: Mm;
  /**
   * What a toolhead must offer to print this material (PROFILE.md 3.6).
   * Required on every material whose processes include "fdm"; seed
   * conformance (M-1-T07) refuses an fdm row without it, and CHK-3MF-09
   * returns E_PARAM_MISSING naming profile.materials.<id>.handling.
   */
  readonly handling?: MaterialHandling;
  readonly provenance: Provenance;
}

/**
 * Toolhead requirements of an FDM material (PROFILE.md 3.6). An abrasive
 * row whose abrasiveness was never established is entered as abrasive at
 * tier inferred, so the check fails safe.
 */
export interface MaterialHandling {
  /** Filled filament that wears a brass nozzle (carbon, copper, glass, metal fill). */
  readonly abrasive: boolean;
  /** Needs a feed path rated for flexible filament (TPU 95A and softer). */
  readonly flexible: boolean;
  /**
   * Smallest nozzle bore this material is allowed through, mm. Without a
   * print on record at a smaller bore it is the smallest bore on record.
   */
  readonly minNozzleMm?: Mm;
  readonly provenance: Provenance;
}

/** A dated slicer preset (D-101), for example "ffc5p_20260919". */
export interface MachinePreset {
  readonly id: string;
  /** Nozzle diameter, mm. */
  readonly nozzle: Mm;
  /**
   * Layer height above the first layer, mm (slicer key layer_height;
   * 0.24 in ffc5p_20260819).
   */
  readonly layer: Mm;
  /**
   * First layer height, mm (slicer key initial_layer_print_height, read in
   * the same harvest as layer; 0.25 in ffc5p_20260819, 0.1 in
   * ffc5p-n025_20260819). Layer tops sit at firstLayer + n x layer, so
   * every Z snap reads both fields (MachineView in build.ts).
   */
  readonly firstLayer: Mm;
  /** Default line width, mm. */
  readonly lineWidth: Mm;
  /**
   * Wall loops (perimeters) of the slicer process, a whole count (slicer
   * key wall_loops; 2 in ffc5p_20260819, 3 in ffc5p-n025_20260819). The
   * CHK-PRT-04 perimeter band is 2 x wallLoops x lineWidth (D-198).
   */
  readonly wallLoops: number;
  readonly slicer: {
    /** Application string written to 3MF, for example "BambuStudio-01.10.01.50". */
    readonly app: string;
    readonly printer: string;
    readonly process: string;
    readonly filament: string;
    /**
     * Build plate written as project_settings curr_bed_type, an
     * OrcaSlicer enum string ("Textured PEI Plate", "High Temp Plate",
     * "Cool Plate", "Engineering Plate", "Textured Cool Plate",
     * "Supertack Plate"). Absent, the slicer falls back to its first plate
     * type, which Flash Studio shows as the cold plate. The ninth scalar
     * key outside the 3MF template; the value follows the preset, not the
     * gold (D-226, PROFILE.md 8.1).
     */
    readonly bedType?: string;
  };
  /**
   * Slicer compensation the preset prints under (section 7.1 of PROFILE.md).
   * The 3MF writer emits these as per-object overrides so the user's process
   * preset cannot change them behind a fit verdict (D-159).
   */
  readonly comp: SlicerComp;
  readonly provenance: Provenance;
}

/**
 * Slicer XY and first-layer compensation, mm. Keys in the Orca and Bambu
 * dialect: xy_hole_compensation, xy_contour_compensation,
 * elefant_foot_compensation. Gold round trip (0.4 preset): 0, 0, 0.1.
 */
export interface SlicerComp {
  /** xy_hole_compensation, mm. Positive grows holes. */
  readonly xyHole: Mm;
  /** xy_contour_compensation, mm. Positive grows outer contours. */
  readonly xyContour: Mm;
  /** elefant_foot_compensation, mm, applied over the first layer. */
  readonly elephantFoot: Mm;
  /** elefant_foot_compensation_layers, count. */
  readonly elephantFootLayers: number;
}

/**
 * Nozzle material. Slicer spellings where the slicer has one (gold
 * `nozzle_type` writes "hardened_steel"); "unknown" until a person records
 * what is installed.
 */
export type NozzleMaterial = "brass" | "stainless_steel" | "hardened_steel" | "tungsten_carbide" | "ruby" | "unknown";

/**
 * One installed toolhead of an FDM machine (PROFILE.md 8.3). Installed
 * nozzles are a shop fact: FlashSwap toolheads change between prints, so a
 * person edits these rows when a nozzle changes, and the rows carry
 * provenance like any other.
 */
export interface Toolhead {
  /** 1-based index, equal to the slicer's `printer_extruder_id` element. */
  readonly index: number;
  /** Installed nozzle bore, mm (slicer `nozzle_diameter` element). */
  readonly nozzleMm: Mm;
  readonly nozzleMaterial: NozzleMaterial;
  /** Feed path accepts flexible filament (MaterialHandling.flexible). */
  readonly flexOk: boolean;
  readonly provenance: Provenance;
}

/**
 * A material slot resolved to a toolhead at export (PROFILE.md 8.3). The
 * 3MF writer records the list in Metadata/hackbuild_chase.json under
 * `toolheads`, and CHK-3MF-09 reads that list, so the writer and the check
 * see one assignment.
 */
export interface ToolheadAssignment {
  /** Chase material slot, 1-based (MaterialSlot.slot). */
  readonly slot: number;
  /** Profile material id of the slot. */
  readonly material: string;
  /** Toolhead index (Toolhead.index). */
  readonly toolhead: number;
  /** "declared" when MaterialSlot.toolhead set it, "default" when toolhead = slot. */
  readonly from: "declared" | "default";
}

export interface Machine {
  /** Profile id: "ffc5p", "centauri", "laser1220", "sheet600", "cricut". */
  readonly id: string;
  readonly name: string;
  readonly process: Process;
  /** Build volume in mm, or sheet size in mm for cut machines. */
  readonly envelope: Vec3 | { readonly sheet: readonly [Mm, Mm] };
  /**
   * Installed toolheads, index order. FDM machines list one row per
   * extruder (four on ffc5p); cut machines list none.
   */
  readonly toolheads: readonly Toolhead[];
  /** Kerf, mm; null until a coupon measures it (D-101). */
  readonly kerf?: Mm | null;
  readonly presets: readonly MachinePreset[];
  readonly provenance: Provenance;
}

/** Relative motion of a joint, the third key of the loss table (D-100). */
export type FitMotion = "static" | "slide" | "rotate" | "snap" | "press";

/**
 * A fit band on the real gap per side after process loss (GapBasis). The
 * corpus bands were diametral or total gaps and are halved on entry
 * (PROFILE.md 7.3).
 */
export interface FitBand {
  readonly class: FitClassId;
  /** The two processes that made the mating sides. */
  readonly processes: readonly [Process, Process];
  readonly motion: FitMotion;
  readonly basis: GapBasis;
  /** Real gap floor per side after loss, mm. Negative means interference. */
  readonly realLoPerSide: Mm;
  /** Real gap ceiling per side after loss, mm. */
  readonly realHiPerSide: Mm;
  readonly note: string;
  readonly provenance: Provenance;
}

/**
 * Axis of a bore or pin relative to the build plate in the print pose, read
 * after frame emit. vertical: axis within 45 deg of build Z, so the circle
 * lies in the layer plane. horizontal: otherwise. DETENT rev C saw +0.20 on
 * vertical holes against +0.35 on horizontal ones (inferred).
 */
export type PrintAxis = "vertical" | "horizontal";

/**
 * One loss table keyed by (process A, process B, motion) (D-100). A row
 * with `material` wins over a row with only `machine`. Within one rank a
 * row that names `axis` or `dRange` and matches beats one that does not.
 */
export interface LossRow {
  readonly processA: Process;
  readonly processB: Process;
  readonly motion: FitMotion;
  readonly machine?: string;
  readonly material?: string;
  /** Layer height the loss was measured at, mm. */
  readonly layer?: Mm;
  /** Feature axis in the print pose; absent means the row applies to both. */
  readonly axis?: PrintAxis;
  /**
   * Drawn diameter band the row applies to, [lo, hi) mm. Written by the
   * fit-gauge coupon; absent means any diameter.
   */
  readonly dRange?: readonly [Mm, Mm];
  /**
   * Slicer compensation the row was measured under. A lookup whose preset
   * differs on any field returns the row with a BuildWarning; absent means
   * not recorded, and coupon rows must record it.
   */
  readonly comp?: SlicerComp;
  readonly basis: GapBasis;
  /**
   * How far a drawn hole or slot wall prints inward, per side, mm. A hole
   * drawn 5.00 that prints 4.85 has holeUnderPerSide 0.075.
   */
  readonly holeUnderPerSide: Mm;
  /**
   * How far a drawn outer wall prints outward, per side, mm. A pin drawn
   * 4.60 that prints 4.70 has outerOverPerSide 0.05.
   */
  readonly outerOverPerSide: Mm;
  readonly provenance: Provenance;
}

/**
 * Bleed of printed traces per (machine, material pair) (D-084). Default 0
 * until a coupon measures it; applied once at emit, coupons included.
 */
export interface BleedRow {
  readonly machine: string;
  readonly materials: readonly [string, string];
  /** Growth of the trace edge into its neighbour, mm. */
  readonly bleed: Mm;
  readonly provenance: Provenance;
}

/**
 * Kind of series contact on a net. printed-interface: two conductive
 * materials fused in one print (cPLA to cTPU); clip, solder, press: a
 * printed conductor meeting metal.
 */
export type ContactKind = "printed-interface" | "clip" | "solder" | "press";

/**
 * Contact resistance row (D-078, D-099). PIP crossings measured 10 to 30
 * times the computed settle on eight of ten keys (D-079); bulk resistivity
 * alone does not explain them, so each terminal and each material interface
 * is a series element priced from this table. No row exists as of
 * 2026-10-04; a net with an unpriced contact carries qualifier unknown.
 */
export interface ContactRow {
  /** Row id, for example "cpla-ctpu.printed-interface.ffc5p". */
  readonly id: string;
  /** Material ids on each side; "metal" for a pin, clip or solder joint. */
  readonly materials: readonly [string, string];
  readonly kind: ContactKind;
  /** Contact area the range was measured at, mm2; rows scale by area when present. */
  readonly areaMm2?: number;
  /** Resistance range [lo, hi], ohm. */
  readonly ohm: readonly [lo: number, hi: number];
  readonly provenance: Provenance;
}

/**
 * A named constant with provenance, read through constant(id), for example
 * "click.dropMin" = 0.5. A constant is a row: its shown qualifier is
 * qualifyRow(provenance.tier), so it stores no qualifier of its own.
 */
export interface Constant {
  readonly id: string;
  /** Value, in `unit`. */
  readonly value: number;
  /** Unit, for example "mm", "ratio", "percent". */
  readonly unit: string;
  readonly provenance: Provenance;
}

/**
 * What the kernel knows about a joint after frame emit. Each side picks its
 * own loss row: holeUnderPerSide from the bore's row, outerOverPerSide from
 * the pin's.
 * Omitted fields match only rows that leave them unset.
 */
export interface GapFeature {
  /** Bore axis in the print pose of the part carrying the bore. */
  readonly holeAxis?: PrintAxis;
  /** Pin or tab axis in the print pose of the part carrying it. */
  readonly outerAxis?: PrintAxis;
  /** Drawn bore diameter across the joint (not per side), mm, for dRange matching. */
  readonly d?: Mm;
}

/** Both sides of a drawn gap after loss, per side. */
export interface RealGaps {
  /** Real gap per side when the hole is printed too (fdm in fdm), mm. */
  readonly hole: Mm;
  /** Real gap per side when the hole is cut (fdm in laser), mm. */
  readonly outer: Mm;
}

/**
 * Drawn gap per side from a hole or slot size and its mate's size, both
 * across the joint (diameter or width), mm. gapPerSide(5.0, 4.6) is 0.2.
 * The one conversion for the corpus's diametral and total figures.
 */
export function gapPerSide(hole: Mm, mate: Mm): Mm {
  return (hole - mate) / 2;
}

/** One profile row a build read, recorded for profileHash (D-051). */
export interface ProfileRead {
  readonly table: "material" | "machine" | "toolhead" | "fit" | "loss" | "bleed" | "constant" | "resistivity" | "strain" | "contact";
  readonly id: string;
}

/**
 * Read-only access to profile. Every read is recorded so profileHash covers
 * exactly the rows a build used. Unknown ids throw a ThrownCommandError with code E_REF.
 */
export interface ProfileLookup {
  material(id: string): Material;
  machine(id: string): Machine;
  /** Installed toolhead by 1-based index; an index past the list throws a ThrownCommandError with code E_REF. */
  toolhead(machine: string, index: number): Toolhead;
  fit(cls: FitClassId): FitBand;
  bleed(machine: string, a: string, b: string): BleedRow;
  constant(id: string): Constant;
  /** Resistivity row the circuit kernel uses for a material, direction and form. */
  resistivity(material: string, direction: ResistivityDirection, form: "printed" | "molded"): ResistivityRow;
  strain(material: string, use: StrainLimit["use"], bend: BendDirection): StrainLimit;
  /** Contact row for a material pair and kind, or null when none exists (never throws E_REF). */
  contact(a: string, b: string, kind: ContactKind): ContactRow | null;
  /**
   * Drawn gap per side to real gap per side, mm (GapBasis). The only place
   * this math lives. side "hole": drawnPerSide - holeUnderPerSide -
   * outerOverPerSide; side "outer": drawnPerSide - outerOverPerSide.
   * Pinned by test: a bore drawn 5.0 around a 4.6 pin is
   * gapPerSide(5.0, 4.6) = 0.2; realGap(0.275, "hole", "ffc5p", "petg") =
   * 0.075 to 6 digits, the D-100 joint (0.55 drawn, 0.15 real, diametral)
   * on the per-side basis.
   */
  realGap(drawnPerSide: Mm, side: "hole" | "outer", machine: string, material: string, layer?: Mm, feature?: GapFeature): Mm;
  /** Drawn gap per side to real gap per side for both sides, mm (D-100). */
  realGaps(drawnPerSide: Mm, machine: string, material: string, layer?: Mm, feature?: GapFeature): RealGaps;
  /**
   * The drawn gap per side, mm, that lands a joint of class `cls` inside its
   * real band: realGap inverted over the same loss rows, so [lo, hi] with
   * realGap(lo, ...) = band.realLoPerSide and realGap(hi, ...) =
   * band.realHiPerSide. side "hole": real + holeUnderPerSide +
   * outerOverPerSide; side "outer": real + outerOverPerSide. FitBand holds
   * no drawn figure; the FITS rows (fits.table) and the constraint dims of
   * bore, pocket, tabSlot and contact read this call. Returns null when no
   * loss row matches the pair (HOLDER and the laser, laser classes today);
   * constraints.query then lists the param under `unbound` with why
   * "no-loss-row". Throws a ThrownCommandError with code E_REF for an
   * unknown class id or when `side` disagrees with the band's process pair
   * (fdm, fdm is "hole"; laser, fdm is "outer"). Example, computed:
   * drawnFor("SLIDE", "hole", "ffc5p", "petg") = [0.325, 0.40] at layer
   * 0.24.
   */
  drawnFor(cls: FitClassId, side: "hole" | "outer", machine: string, material: string, layer?: Mm, feature?: GapFeature): readonly [Mm, Mm] | null;
  /** Rows read so far, in read order. */
  reads(): readonly ProfileRead[];
}
