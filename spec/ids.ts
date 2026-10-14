// spec/ids.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the whole file.
 */
// Closed vocabularies and unit aliases shared by every contract file.
// Version 4, 2026-10-04. Carries D-007, D-017, D-051, D-053, D-054, D-175, D-057, D-067,
// D-083, D-100. Zero runtime dependencies; the only runtime values are
// readonly tuples that tests and registries read.

// Units. Lengths are millimetres unless a field name carries another unit
// suffix (angleDeg, forceN, maxOhm, volumeMm3). Numeric unit aliases are
// plain numbers so authors can write literals in build.ts; the unit is
// stated in each field's doc comment and enforced by the description test
// in core (api-library-ai-design.md section 4).

/** Length in mm. */
export type Mm = number;
/** Angle in degrees. */
export type Deg = number;
/** Resistance in ohm. */
export type Ohm = number;
/** Potential in volts (V). */
export type Volt = number;
/** Time in microseconds (us). */
export type Micros = number;

/** 2D point or vector, both components in mm. */
export type Vec2 = readonly [x: Mm, y: Mm];
/** 3D point or vector, all components in mm. */
export type Vec3 = readonly [x: Mm, y: Mm, z: Mm];
/** Unit quaternion, unitless, order x y z w. */
export type Quat = readonly [x: number, y: number, z: number, w: number];
/** Closed polyline in a face frame; each vertex in mm, first vertex not repeated. */
export type Ring = readonly Vec2[];

/** An axis: origin point in mm and a direction vector (unitless, normalised by the kernel). */
export interface Axis {
  /** Point on the axis, mm. */
  readonly origin: Vec3;
  /** Direction, unitless. */
  readonly dir: Vec3;
}

/**
 * A face frame: origin in mm, outward normal and in-face u direction
 * (unitless). normal and u are unit vectors, |v| within 1e-9 of 1, and u is
 * perpendicular to normal; a reader refuses any other frame with E_SCHEMA
 * and never scales or normalises it (packages/geom faceBasis, D-255).
 */
export interface FaceFrame {
  /** Frame origin, mm. */
  readonly origin: Vec3;
  /** Outward normal, unit length, unitless. */
  readonly normal: Vec3;
  /** In-face u axis, unit length and perpendicular to normal, unitless; v is normal cross u. */
  readonly u: Vec3;
}

/**
 * A persisted placement on a named face (D-165). Stored in chase.applied
 * instead of a FaceFrame so a placement follows its face when params move
 * it: the kernel resolves `ref` against the FaceDecl ids the PartDraft
 * declares on every build. Resolved origin = face origin + uv[0] u + uv[1] v;
 * resolved u = face u rotated by rotDeg about the outward normal. An
 * unresolved ref is E_REF with didYouMean over the part's declared face ids.
 */
export interface FaceRef {
  /** Face id declared by build.ts with Author.face(), for example "body.top". */
  readonly ref: string;
  /** Offset from the face origin along u and v, mm. */
  readonly uv: Vec2;
  /** Rotation of the in-face u axis about the outward normal, deg. */
  readonly rotDeg: Deg;
}

// Brands. Only values a kernel produces carry a brand, so authors never cast
// a literal. Hashes come from kernels; fit class ids come from profile.

declare const brand: unique symbol;
/** Nominal tag on a primitive. */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Lowercase hex sha256, 64 characters. Displayed as first 6 and last 2 joined by "..". */
export type Hash = Brand<string, "Hash">;
/**
 * sha256 over a mesh in a fixed layout (D-051, D-175): coordinates snapped
 * to the 1/1024 mm grid (D-054) and stored as int32 round(v * 1024);
 * vertices deduplicated and sorted, indices remapped; each triangle rotated
 * so its smallest index leads with cyclic order kept, so winding survives
 * and an inside-out copy hashes different; triangles sorted; bytes are
 * ASCII "hbf-mesh-2", uint32 vertex count, int32 xyz, uint32 triangle
 * count, uint32 indices, little-endian. AGENT-SURFACE.md section 7.3.
 */
export type MeshHash = Hash;
/** Grid steps per mm for meshHash and the D-054 vertex snap; unitless count per mm. */
export const MESH_GRID_PER_MM = 1024;
/** Tag at the start of the meshHash byte layout. */
export const MESH_HASH_TAG = "hbf-mesh-2";
/** sha256 over RFC 8785 canonical BuildInputs (D-051). */
export type BuildHash = Hash;
/** sha256 over findings sorted by id then target, without timing. */
export type ReportHash = Hash;
/** sha256 over sorted (entry name, sha256 of uncompressed bytes) for an export (D-052). */
export type ArtifactHash = Hash;

/**
 * A fit class id from the profile registry, for example "LOCATE", "SLIDE",
 * "PSLIP". Registry-validated (plan-deltas R90); PSLIDE is dropped and the
 * mixed printed and cut class is PSLIP (D-100). Build code obtains one through
 * Author.fit(), which refuses an unknown id with E_REF.
 */
export type FitClassId = Brand<string, "FitClassId">;

/**
 * The one basis every stored gap uses: per side, the offset a slicer's XY
 * compensation applies to one contour. A bore drawn 5.0 around a 4.6 pin
 * has a drawn gap of 0.2 per side; a 10.4 slot around a 10.0 tab has 0.2
 * per side. Diametral and total figures from the corpus (OGEE16 fits.py,
 * 00-constants) are halved on entry through gapPerSide() in profile.ts.
 * Fit bands, loss rows, feature fit declarations and realGap all carry
 * this basis; a second basis is a bug.
 */
export type GapBasis = "perSide";

/** Fit class ids present in seed/profile.seed.json at M-1, before D-100 corrections land. */
export const SEED_FIT_CLASSES = [
  "SLIDE", "LOCATE", "PRESS", "SNAP", "LAP", "SLIP", "PSLIP", "GUIDE", "PGUIDE",
] as const;

/** SPDX licence expression, for example "MIT" or "CC-BY-SA-4.0". */
export type Spdx = string;
/** ISO 8601 calendar date, YYYY-MM-DD. */
export type IsoDate = string;

// hbf:// addressing (D-050). Every handle a command accepts or returns.

export type MeshUri = `hbf://mesh/${string}`;
export type BuildUri = `hbf://build/${string}`;
export type ReportUri = `hbf://report/${string}`;
export type ArtifactUri = `hbf://artifact/${string}`;
export type CheckUri = `hbf://check/${string}`;
export type HbfUri =
  | MeshUri
  | BuildUri
  | ReportUri
  | ArtifactUri
  | CheckUri
  | `hbf://chase/${string}`
  | `hbf://feature-kind/${string}`
  | `hbf://archetype/${string}`
  | `hbf://mechanism/${string}`
  | `hbf://reference/${string}`
  | `hbf://profile/${"material" | "machine" | "fit"}/${string}`
  | `hbf://knowledge/${string}`
  | "hbf://project/graph";

// Closed vocabularies.

/**
 * One KernelId union (D-057), used by CheckDef.needs, Bound.kernel,
 * ChaseMeta.kernels, Manifest.kernels and registry/tools.json.
 */
export const KERNEL_IDS = [
  "profile", "geom", "mesh", "3mf", "sim", "circuit", "copper", "board", "nest", "inlay", "motion",
] as const;
export type KernelId = (typeof KERNEL_IDS)[number];

/**
 * Mesh routes (D-053). Each route declares its guarantees in its
 * MeshRouteDef (build.ts). brep is opt-in, lazy, M14 only (D-024).
 */
export const MESH_ROUTES = [
  "raster", "prism", "stack", "revolve", "lathe", "trace", "csg", "imported", "brep",
] as const;
export type MeshRoute = (typeof MESH_ROUTES)[number];

/** Fabrication processes (D-018). Bought parts are BoughtBody. */
export const PROCESSES = ["fdm", "laser", "vinyl", "pcb", "paper"] as const;
export type Process = (typeof PROCESSES)[number];

export type Plane = "XY" | "XZ" | "YZ";

/** Check and command verdict. */
export type Verdict = "pass" | "warn" | "fail" | "skip";

/**
 * Severity (D-067), the seed vocabulary as of 2026-10-04 (76 block, 9 warn,
 * generated by tools/counts.mjs). Severity decides what a fail stops; it
 * never stops the build. Every build completes, stores Part IR and runs the
 * checks, so a finding can be rendered, probed and located, and a fix can
 * be predicted by a re-run. A kernel that cannot produce geometry returns
 * E_KERNEL (errors.ts), which is a command error and never a CheckResult.
 *   block: a fail stops fabrication export (export.run exits 1, no gate).
 *   warn:  a fail is shown; export proceeds.
 *   note:  informational; the result is shown beside the findings.
 * Verdict says what happened on one target; Severity says what a fail of
 * that check stops. A check with severity note reports verdict pass or warn.
 */
export const SEVERITIES = ["block", "warn", "note"] as const;
export type Severity = (typeof SEVERITIES)[number];
/** What a failing check of each severity stops. */
export const SEVERITY_EFFECT = {
  block: "block-export",
  warn: "show",
  note: "inform",
} as const satisfies Record<Severity, string>;

/**
 * Provenance tier ladder, highest first (D-083, owner default). A tier
 * belongs to a stored row; a shown number carries a Qualification instead. An inferred
 * catalog part row (bought part or footprint) is usable in sim and refused
 * at fabrication export with E_PROVENANCE (D-102). An inferred profile row
 * never refuses an export: part.build lists it in readsInferred and the
 * export carries an inferred warning (D-082).
 */
export const TIERS = ["verified", "measured", "vendor", "community", "inferred"] as const;
export type Tier = (typeof TIERS)[number];

/**
 * Number qualifier shown with every number in prose, UI, cards and messages
 * (D-007). Tier says where a stored row came from; Qualifier says how a
 * shown number was obtained. Nobody types a qualifier by hand: a number read
 * straight from one row takes qualifyRow(row.provenance.tier), a number an
 * equation produced takes qualify(inputTiers) (both in profile.ts), and the
 * pair travels as a Qualification so the input tier is never lost.
 */
export const QUALIFIERS = ["measured", "computed", "vendor", "inferred", "unknown"] as const;
export type Qualifier = (typeof QUALIFIERS)[number];

/**
 * Qualifier shown for a value read straight from a row of each tier
 * (PROFILE.md section 2.3). A verified row is a parsed manufacturer
 * drawing, so it reads vendor; a community row is someone's cited
 * measurement, so it reads measured and the message carries the citation.
 */
export const TIER_QUALIFIER = {
  verified: "vendor",
  measured: "measured",
  vendor: "vendor",
  community: "measured",
  inferred: "inferred",
} as const satisfies Record<Tier, Qualifier>;

/** Tiers whose stored value reads with qualifier Q. */
type TiersReadingAs<Q extends Qualifier> = {
  [T in Tier]: (typeof TIER_QUALIFIER)[T] extends Q ? T : never;
}[Tier];

/**
 * A qualifier with the tier it rests on. Produced by qualifyRow() or
 * qualify() in profile.ts, never written as a literal.
 *   computed: an equation over profile rows, geometry or params; basis is
 *     the lowest tier among the rows it read, or null when it read none
 *     (a length taken from geometry or a param).
 *   measured, vendor, inferred: the value of one row; basis is that row's
 *     tier, and the type admits only tiers that read as this qualifier.
 *   unknown: a row the number needed does not exist; basis null.
 */
export type Qualification =
  | { readonly qualifier: "computed"; readonly basis: Tier | null }
  | { readonly qualifier: "measured"; readonly basis: TiersReadingAs<"measured"> }
  | { readonly qualifier: "vendor"; readonly basis: TiersReadingAs<"vendor"> }
  | { readonly qualifier: "inferred"; readonly basis: TiersReadingAs<"inferred"> }
  | { readonly qualifier: "unknown"; readonly basis: null };

/** A number with its unit and qualification, for messages, metrics and readouts. */
export type Qualified = {
  /** The value, in `unit`. */
  readonly value: number;
  /** Unit string, for example "mm", "ohm", "us", "percent". */
  readonly unit: string;
  /** Repo path, record id or URL the number came from. */
  readonly source?: string;
} & Qualification;

/** Strain-limit bend direction (D-073): in the layer plane, or across layers. */
export type BendDirection = "inPlane" | "acrossLayers";

/** Resistivity direction relative to print layers. */
export type ResistivityDirection = "along" | "across" | "through" | "bulk";
