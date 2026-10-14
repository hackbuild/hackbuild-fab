// spec/checks.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// The check registry contract and the result every check returns. The
// result shape sets the capability floor: what failed, measured, legal,
// constraint, origin, and a one-param fix when the solver finds one.
// Version 4, 2026-10-04. Carries D-057, D-064, D-065, D-066, D-067, D-074,
// D-075, D-173, D-177. Run bodies return Finding; the registry stamps the
// CheckDef fields. ResultTarget and Evidence are discriminated so a reader can
// rely on target ids and on measured matching legal.kind.
// 2026-10-05: pair target (gold standard P-23); an open interval end is null (D-225).

import type { CheckUri, IsoDate, KernelId, Severity, Vec3, Verdict } from "./ids";
import type { Feature, FeatureKind, FeatureOf } from "./features";
import type { Assembly, AssertionType, Body, JointDecl, Part, Sheet } from "./part-ir";
import type { Net } from "./circuit";
import type { ProfileLookup } from "./profile";
import type { SimHandle } from "./sim";
import type { MotionHandle } from "./motion";
import type { HookupDecl } from "./chase";
import type { PatchEdit } from "./commands";

/**
 * Fixed check areas: the 13 seeded prefixes (api-library-ai-design.md
 * section 4) plus ART and DEV, confirmed in CHECKS.md section 5.
 */
export const CHECK_AREAS = [
  "PRT", "FIT", "ASM", "SHT", "NET", "BRD", "MOT", "3MF", "INL", "LNT", "SHP", "KEY", "UI", "ART", "DEV",
] as const;
export type CheckArea = (typeof CHECK_AREAS)[number];
/** CHK-<AREA>-NN, for example "CHK-KEY-04". */
export type CheckId = `CHK-${CheckArea}-${string}`;

/**
 * Target levels a check may read (D-065). source and page stay: besides
 * the LNT and UI rows they carry physical proofs that read source text or
 * a rendered bench, CHK-FIT-04, CHK-SHT-04, CHK-MOT-03 and CHK-ART-04
 * (CHECKS.md section 4). Neither level has a target in a design's Part IR,
 * so the selection rule never runs them on a design build.
 */
export type CheckLevel =
  | "part" | "body" | "feature" | "assembly" | "sheet" | "net" | "artifact" | "source" | "page" | "project";

/** Exported bytes, for 3MF, DXF and gerber checks. */
export interface ArtifactBytes {
  /** Exporter registry id, for example "3mf". */
  readonly exporter: string;
  readonly name: string;
  readonly bytes: Uint8Array;
  /** Uncompressed entries for container formats, by entry name. */
  readonly entries?: ReadonlyMap<string, Uint8Array>;
  /**
   * The Part IR the package was written from, or rebuilt from the chase it
   * names, when the caller holds a build (check.run on a build). A check
   * that reads body roles (CHK-3MF-08, M05-T20) holds the package's record
   * against it; absent, the package's own record is all there is.
   */
  readonly part?: Part;
}

/** A source file, for LNT checks. */
export interface SourceFile {
  /** Repo-relative path. */
  readonly path: string;
  readonly text: string;
}

/** A rendered page, for UI checks run by the browser smoke test. */
export interface PageSnapshot {
  readonly url: string;
  /** Viewport width and height, CSS px. */
  readonly viewport: readonly [number, number];
  /** Visible text of the rendered DOM. */
  readonly text: string;
  /** Count of focal pink elements in view (D-125). */
  readonly focalPink: number;
  /** Horizontal overflow, CSS px; 0 when none. */
  readonly overflowX: number;
}

/** The project graph: items, links and the stale list. */
export interface ProjectGraph {
  readonly items: readonly { readonly id: string; readonly kind: string; readonly hash: string }[];
  readonly links: readonly { readonly from: string; readonly to: string; readonly rel: string }[];
  readonly stale: readonly string[];
}

/** What a check runs against (D-065). */
export type CheckTarget =
  | { readonly level: "part"; readonly part: Part }
  | { readonly level: "body"; readonly part: Part; readonly body: Body }
  | { readonly level: "feature"; readonly part: Part; readonly feature: Feature }
  | { readonly level: "assembly"; readonly assembly: Assembly }
  | { readonly level: "sheet"; readonly sheet: Sheet; readonly parts: readonly Part[] }
  | { readonly level: "net"; readonly net: Net; readonly part: Part }
  | { readonly level: "artifact"; readonly artifact: ArtifactBytes }
  | { readonly level: "source"; readonly source: SourceFile }
  | { readonly level: "page"; readonly page: PageSnapshot }
  | { readonly level: "project"; readonly project: ProjectGraph };

/**
 * The target a check of level L receives. At level feature, K narrows the
 * feature to the kinds named in appliesTo.kinds, so a run body needs no
 * kind test of its own.
 */
export type TargetOf<L extends CheckLevel, K extends FeatureKind = FeatureKind> = {
  readonly [M in CheckLevel]: M extends "feature"
    ? { readonly level: "feature"; readonly part: Part; readonly feature: FeatureOf<K> }
    : Extract<CheckTarget, { level: M }>;
}[L];

/**
 * Legal values a measured value must satisfy. Interval and set carry the
 * nearest legal value, which becomes Fix.set when one param drives it.
 */
export type LegalValues =
  /** An open end is null, never Infinity, so the result has one canonical JSON form (CHECKS.md 7.1, D-225). */
  | { readonly kind: "interval"; /** in unit, null when open */ readonly lo: number | null; /** in unit, null when open */ readonly hi: number | null; readonly unit: string; /** in unit */ readonly nearest: number }
  | { readonly kind: "set"; /** in unit */ readonly values: readonly (number | string)[]; readonly unit?: string; /** in unit */ readonly nearest?: number | string }
  /** Legal values are offset + n x base; offset is the grid origin (a preset's first layer for Z checks), 0 when absent. */
  | { readonly kind: "multipleOf"; /** in unit */ readonly base: number; /** in unit */ readonly offset?: number; readonly unit: string; /** in unit, the grid values below and above */ readonly nearest: readonly [number, number] }
  | { readonly kind: "boolean"; readonly must: boolean }
  /** Expected-violation set (D-074): passes only when measured equals this set exactly. */
  | { readonly kind: "exactSet"; readonly values: readonly string[] }
  | { readonly kind: "none" };

export type LegalKind = LegalValues["kind"];

/** A one-param fix with its predicted effect, re-run in memory on the predicted value. */
export interface Fix {
  /** JSON pointer into design params, for example "/keys/0/gap". */
  readonly param: string;
  /**
   * New value, in the param's unit: the nearest end of the param's own
   * interval from constraints.query. Equals legal.nearest only when the
   * check measures the param itself (D-064).
   */
  readonly set: number | string | boolean;
  /** The param's legal interval, in the param's unit, from ConstraintSolver.forParams. */
  readonly paramLegal: readonly [number, number];
  readonly predicts: { /** in the check's legal unit */ readonly measured: number | string; readonly verdict: Verdict };
  /**
   * The edit that writes this fix into the chase, resolved by the kernel from
   * param to one literal span (a field default or a preset value). Absent when
   * the driving value came in on the call (--params) and has no source span.
   */
  readonly patch?: PatchEdit;
}

/**
 * Where a result points, so every finding is locatable in the UI (D-125).
 * One member per CheckLevel, so a feature result always carries its feature
 * id, plus "pair" for a finding between two targets (a collision, a hook
 * reaching through a shelf): the viewer outlines both and clicking the
 * finding frames both (P-23, G-35). at is a world point, mm.
 */
export type ResultTarget =
  | SingleTarget
  | { readonly level: "pair"; readonly a: SingleTarget; readonly b: SingleTarget; readonly at?: Vec3 };

/** A ResultTarget naming one thing; the members of a pair. */
export type SingleTarget =
  | { readonly level: "part"; readonly part: string; readonly at?: Vec3 }
  | { readonly level: "body"; readonly part: string; readonly body: string; readonly at?: Vec3 }
  | { readonly level: "feature"; readonly part: string; readonly feature: string; readonly at?: Vec3 }
  | { readonly level: "assembly"; readonly assembly: string; readonly part?: string; readonly at?: Vec3 }
  | { readonly level: "sheet"; readonly sheet: string; readonly part?: string; readonly at?: Vec3 }
  | { readonly level: "net"; readonly part: string; readonly net: string; readonly at?: Vec3 }
  | { readonly level: "artifact"; readonly artifact: string; readonly path?: string }
  | { readonly level: "source"; readonly path: string }
  | { readonly level: "page"; readonly path: string }
  | { readonly level: "project"; readonly path?: string };

/**
 * measured paired with legal by legal.kind: a number for interval and
 * multipleOf, a number or word for set, a boolean for boolean, a set of
 * target ids for exactSet. measured is in the legal values' unit.
 */
export type Evidence =
  | { readonly legal: Extract<LegalValues, { kind: "interval" | "multipleOf" }>; readonly measured: number }
  | { readonly legal: Extract<LegalValues, { kind: "set" }>; readonly measured: number | string }
  | { readonly legal: Extract<LegalValues, { kind: "boolean" }>; readonly measured: boolean }
  | { readonly legal: Extract<LegalValues, { kind: "exactSet" }>; readonly measured: readonly string[] }
  | { readonly legal: Extract<LegalValues, { kind: "none" }>; readonly measured: number | string | boolean };

/**
 * The result fields other than measured and legal (D-064). measured is
 * always a real value: a NaN or missing measured value returns
 * CommandError E_PARAM_MISSING instead.
 */
export interface CheckResultBase {
  readonly id: CheckId;
  /** Check version that produced this result, semver. */
  readonly version: string;
  readonly verdict: Verdict;
  readonly severity: Severity;
  readonly target: ResultTarget;
  /** One line, the reason the legal values are what they are. */
  readonly constraint: string;
  /** hbf://check/<id>: definition, origin record, legal-value derivation. */
  readonly origin: CheckUri;
  readonly fix?: Fix;
  /**
   * Present when a chase waiver turned a fail into this warn (D-173). The
   * run's own verdict was fail; measured, legal and fix stay as computed.
   */
  readonly waived?: {
    readonly reason: string;
    /** Last day the waiver holds, inclusive; absent when open-ended. */
    readonly until?: IsoDate;
  };
  /** Closest approach and similar extras; numbers carry their unit in the key suffix. */
  readonly extra?: Readonly<Record<string, number | string>>;
}

/** The result contract (D-064): the base fields plus measured and legal, correlated by legal.kind. */
export type CheckResult = CheckResultBase & Evidence;

/**
 * What a run body returns. The registry stamps id, version, severity and
 * origin from the CheckDef, and waived from the chase (D-173), to make the
 * CheckResult, so a run body cannot disagree with its definition.
 */
export type Finding = Omit<CheckResultBase, "id" | "version" | "severity" | "origin" | "waived"> & Evidence;

/**
 * The failure that created a check. Required: a check with no origin is a
 * guess. Every seeded check gets a date and a non-empty `what` at M-1 (D-066).
 */
export interface CheckOrigin {
  /** Design and month, for example "COLLAR 2026-08". */
  readonly project: string;
  readonly date: IsoDate;
  /** What failed, one line, non-empty. The seed's `what` lands here; 14 seeded rows had it empty on 2026-10-04 and M-1 fills them (D-066). */
  readonly what: string;
  /** The numbers of the failure, units in the key suffix, for example { travelMm: 2.15, coneMm: 3.2 }. */
  readonly numbers?: Readonly<Record<string, number | string>>;
  /** Knowledge record id, knowledge:<file stem>#<section slug>, referenced both ways; absent while missing (listed in origin-gaps.md). */
  readonly knowledge?: string;
  /** Absolute evidence path or repo path; null when no file is on record. */
  readonly evidence?: string | null;
  /**
   * Second origins: the same failure class met again in another design
   * (CHECKS.md 7.7), each a full origin with no further `also`. The first
   * origin stays the check's origin; adding one is a patch bump.
   */
  readonly also?: readonly Omit<CheckOrigin, "also">[];
}

/**
 * Lifecycle of a registry row. seed: imported from checks.seed.json with a
 * run body; entered: id, origin and page exist, run body pending; registered:
 * run body landed and fixtures pass; retired: id kept, never reused.
 */
export type CheckStatus = "seed" | "entered" | "registered" | "retired";

/** Milestone ids: M-1, M-S (walking skeleton, D-179), then M00 to M16 (MILESTONES.md). */
export type MilestoneId =
  | "M-1" | "M-S" | "M00" | "M01" | "M02" | "M03" | "M04" | "M05" | "M06" | "M07" | "M08"
  | "M09" | "M10" | "M11" | "M12" | "M13" | "M14" | "M15" | "M16";

/** Context a check reads. */
export interface CheckCtx {
  readonly profile: ProfileLookup;
  readonly machine: string;
  /** Whitelisted pairs keyed to mesh hashes, so a changed part invalidates them. */
  readonly whitelist: ReadonlyMap<string, readonly string[]>;
  readonly sim?: SimHandle;
  /** The motion kernel's readouts for the CHK-MOT checks; a run without it reports not run (M07-T11). */
  readonly motion?: MotionHandle;
  /** Declared expect sets for this check from the chase (D-074). */
  readonly expect?: readonly { readonly target: string; readonly verdict: "fail" | "warn"; readonly set?: readonly string[] }[];
  /**
   * The chase hookup (receiving MCU, pin, read model per port). Supplied to
   * checks whose CheckDef.needs includes "circuit" only (CHK-NET-05,
   * CHK-NET-29); geometry checks receive undefined.
   */
  readonly hookup?: readonly HookupDecl[];
}

/**
 * A registered check. Semver per check; major when a verdict can flip on the
 * same Part IR.
 */
export interface CheckDef<L extends CheckLevel = CheckLevel, K extends FeatureKind = FeatureKind> {
  readonly id: CheckId;
  readonly version: string;
  /** One line title as it appears in CHECKS.md: what must be true. */
  readonly title: string;
  /**
   * Selection. The registry runs this check on every target of `level` in
   * the Part IR, narrowed to `kinds` at level feature, to `joints` (joint
   * kinds) at level assembly, and to `assertions` (assertion types) at
   * level part or assembly. A chase cannot deselect it (D-173). Checks that
   * proved the v3 kinds latch, pivot and pinInSlot select by joint kind or
   * assertion type since those kinds left the Feature union (D-177).
   * At level feature, kinds also narrows the run target to FeatureOf<K>.
   */
  readonly appliesTo: {
    readonly level: L;
    readonly kinds?: readonly K[];
    readonly joints?: readonly JointDecl["kind"][];
    readonly assertions?: readonly AssertionType[];
  };
  readonly severity: Severity;
  /**
   * True on the checks that prove the solid, its topology and its volumes
   * (CHECKS.md section 3). When one fails, checks reading that target's
   * volume, topology or per-body geometry return skip "precondition <id>
   * failed"; the build still completes and stores Part IR (D-067). A
   * precondition check cannot be waived (D-173).
   */
  readonly precondition?: true;
  readonly origin: CheckOrigin;
  /** Kernels this check needs present (D-057). */
  readonly needs: readonly KernelId[];
  readonly legalKind: LegalKind;
  /** Metric ids this check gates (D-075). */
  readonly gates?: readonly string[];
  /** ConstraintDef id that backs the legal values, when the solver sets them, for example "sim/click-spring-window". */
  readonly constraint?: string;
  readonly status: CheckStatus;
  /** Milestone that lands the run body; required in practice for entered rows (seed conformance test). */
  readonly pending?: MilestoneId;
  /** JSON pointers into params whose change moves the measured value; feeds Fix; a feature-level check returns Object.values(target.feature.drivenBy ?? {}). */
  drivenBy?(target: TargetOf<L, K>): readonly string[];
  /** Returns findings; the registry stamps the CheckDef fields to make each CheckResult. */
  run(target: TargetOf<L, K>, ctx: CheckCtx): readonly Finding[] | Promise<readonly Finding[]>;
}

/**
 * Any registered check, distributive over levels so a registry can hold all
 * of them. K is any here on purpose: run takes FeatureOf<K>, so CheckDef is
 * invariant in K and CheckDef<"feature", "contact"> would not fit the default
 * K. The registry hands a run body only features whose kind is in
 * appliesTo.kinds, which keeps the narrowed target true at run time.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyCheckDef = { [L in CheckLevel]: CheckDef<L, any> }[CheckLevel];
