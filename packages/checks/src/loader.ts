// The seed loader (M04-T01 step 2): every row of
// packages/checks/seed/checks.seed.json becomes the CheckDef fields other
// than run and drivenBy, which the check's module supplies. The seed stays
// the single source for titles, versions, levels, severities, needs, legal
// kinds and origins. A row that breaks the contract is E_SCHEMA at its JSON
// pointer, so a bad seed fails loudly at load and never at run time.

import {
  CHECK_AREAS, KERNEL_IDS, SEVERITIES,
  type AssertionType, type CheckDef, type CheckId, type CheckLevel, type CheckOrigin, type CheckStatus,
  type FeatureKind, type JointDecl, type KernelId, type LegalKind, type MilestoneId, type Severity,
} from "@hackbuild/spec";
import { canonicalKind } from "./aliases.js";
import { checkError } from "./skeleton/common.js";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const exact = <T extends true>(): T => true as T;

/** CheckLevel members, held at runtime; the type test below fails when spec adds or drops one. */
export const CHECK_LEVELS = ["part", "body", "feature", "assembly", "sheet", "net", "artifact", "source", "page", "project"] as const;
exact<Equal<(typeof CHECK_LEVELS)[number], CheckLevel>>();

export const LEGAL_KINDS = ["interval", "set", "multipleOf", "boolean", "exactSet", "none"] as const;
exact<Equal<(typeof LEGAL_KINDS)[number], LegalKind>>();

export const CHECK_STATUSES = ["seed", "entered", "registered", "retired"] as const;
exact<Equal<(typeof CHECK_STATUSES)[number], CheckStatus>>();

export const MILESTONE_IDS = [
  "M-1", "M-S", "M00", "M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08",
  "M09", "M10", "M11", "M12", "M13", "M14", "M15", "M16",
] as const;
exact<Equal<(typeof MILESTONE_IDS)[number], MilestoneId>>();

export const JOINT_KINDS = ["revolute", "prismatic", "cylindrical", "spherical", "planar", "fixed"] as const;
exact<Equal<(typeof JOINT_KINDS)[number], JointDecl["kind"]>>();

export const ASSERTION_TYPES = [
  "clearance", "contact", "joined", "apart", "apartExcept", "reach", "insertable", "travel", "volumeParity", "identity",
  "mirrorOnFlip", "capture",
] as const;
exact<Equal<(typeof ASSERTION_TYPES)[number], AssertionType>>();

const ID_RE = new RegExp(`^CHK-(?:${CHECK_AREAS.join("|")})-[0-9]{2}$`);
const SEMVER_RE = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const DATE_RE = /^20[0-9]{2}-[0-9]{2}(-[0-9]{2})?$/;

/** A seed row as the registry holds it: every CheckDef field but run and drivenBy. */
export interface SeedCheck {
  readonly id: CheckId;
  readonly version: string;
  readonly title: string;
  readonly appliesTo: {
    readonly level: CheckLevel;
    readonly kinds?: readonly FeatureKind[];
    readonly joints?: readonly JointDecl["kind"][];
    readonly assertions?: readonly AssertionType[];
  };
  readonly severity: Severity;
  /** CheckDef.precondition (D-067, CHECKS.md section 3); absent on every other row. */
  readonly precondition?: true;
  readonly needs: readonly KernelId[];
  readonly legalKind: LegalKind;
  readonly origin: CheckOrigin;
  readonly status: CheckStatus;
  readonly pending?: MilestoneId;
  readonly constraint?: string;
}

// The seed row type must stay assignable to the CheckDef fields it feeds.
type DefFields = Pick<CheckDef, "id" | "version" | "title" | "severity" | "precondition" | "needs" | "legalKind" | "origin" | "status" | "pending" | "constraint">;
const _fields = {} as SeedCheck satisfies DefFields;
void _fields;

type Row = Record<string, unknown>;

const bad = (path: string, got: unknown, expected: string, hint: string): never => {
  throw checkError({ code: "E_SCHEMA", path, got, expected, hint, record: "verification" });
};

const isObj = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);

function str(r: Row, key: string, at: string, re?: RegExp): string {
  const v = r[key];
  if (typeof v !== "string" || v.trim() === "") bad(`${at}/${key}`, v, "a non-empty string", `seed row field ${key} must be a non-empty string`);
  if (re !== undefined && !re.test(v as string)) bad(`${at}/${key}`, v, String(re), `seed row field ${key} does not match ${String(re)}`);
  return v as string;
}

function oneOf<T extends string>(v: unknown, list: readonly T[], at: string, what: string): T {
  if (typeof v !== "string" || !(list as readonly string[]).includes(v)) bad(at, v, list.join(", "), `${what} must be one of ${list.join(", ")}`);
  return v as T;
}

function listOf<T extends string>(v: unknown, list: readonly T[], at: string, what: string): T[] {
  if (!Array.isArray(v)) return bad(at, v, `a list of ${what}`, `${what} must be a list`);
  return v.map((x, i) => oneOf(x, list, `${at}/${i}`, what));
}

function originOf(v: unknown, at: string): CheckOrigin {
  if (!isObj(v)) return bad(at, v, "an origin object", "every check cites the failure that created it (D-066)");
  const project = str(v, "project", at);
  const date = str(v, "date", at, DATE_RE);
  const what = str(v, "what", at);
  const numbers = v["numbers"];
  if (numbers !== undefined && !isObj(numbers)) bad(`${at}/numbers`, numbers, "an object of numbers or strings", "origin numbers are keyed by quantity and unit");
  return {
    project, date: date as CheckOrigin["date"], what,
    ...(numbers === undefined ? {} : { numbers: numbers as NonNullable<CheckOrigin["numbers"]> }),
    ...(typeof v["knowledge"] === "string" ? { knowledge: v["knowledge"] } : {}),
    ...(typeof v["evidence"] === "string" || v["evidence"] === null ? { evidence: v["evidence"] as string | null } : {}),
  };
}

function appliesToOf(v: unknown, at: string): SeedCheck["appliesTo"] {
  if (!isObj(v)) return bad(at, v, "an appliesTo object", "appliesTo names the level a check reads");
  const level = oneOf(v["level"], CHECK_LEVELS, `${at}/level`, "appliesTo.level");
  const out: { level: CheckLevel; kinds?: FeatureKind[]; joints?: JointDecl["kind"][]; assertions?: AssertionType[] } = { level };
  if (v["kinds"] !== undefined) {
    if (level !== "feature") bad(`${at}/kinds`, v["kinds"], "kinds only at level feature", "kinds narrow a feature-level check; move the row to level feature or drop kinds");
    if (!Array.isArray(v["kinds"]) || v["kinds"].length === 0) bad(`${at}/kinds`, v["kinds"], "a non-empty list of feature kinds", "list the feature kinds the check reads");
    out.kinds = (v["kinds"] as unknown[]).map((k, i) => {
      if (typeof k !== "string") return bad(`${at}/kinds/${i}`, k, "a kind name", "a kind is a string");
      return canonicalKind(k, `${at}/kinds/${i}`);
    });
  }
  if (v["joints"] !== undefined) {
    if (level !== "assembly") bad(`${at}/joints`, v["joints"], "joints only at level assembly", "joint kinds narrow an assembly-level check (D-177)");
    out.joints = listOf(v["joints"], JOINT_KINDS, `${at}/joints`, "joint kinds");
  }
  if (v["assertions"] !== undefined) {
    if (level !== "assembly" && level !== "part") bad(`${at}/assertions`, v["assertions"], "assertions only at level part or assembly", "assertion types narrow a part or assembly check (D-177)");
    out.assertions = listOf(v["assertions"], ASSERTION_TYPES, `${at}/assertions`, "assertion types");
  }
  return out;
}

/** One seed row at index i as a SeedCheck; E_SCHEMA at the row's pointer on any break. */
export function seedRow(v: unknown, i: number): SeedCheck {
  const at = `/checks/${i}`;
  if (!isObj(v)) return bad(at, v, "a check row object", "every seed row is an object");
  const id = str(v, "id", at, ID_RE) as CheckId;
  const pending = v["pending"] === undefined ? undefined : oneOf(v["pending"], MILESTONE_IDS, `${at}/pending`, "pending");
  const constraint = v["constraint"] === undefined ? undefined : str(v, "constraint", at);
  const severity = oneOf(v["severity"], SEVERITIES, `${at}/severity`, "severity");
  const precondition = v["precondition"];
  if (precondition !== undefined && precondition !== true) bad(`${at}/precondition`, precondition, "true or absent", "precondition is true on a check that proves the solid, and absent elsewhere");
  // A precondition skips the checks that read a wrong solid; only a block check stops the export that solid would reach (D-067).
  if (precondition === true && severity !== "block") bad(`${at}/precondition`, severity, "severity block", `${id} is a precondition check, so its severity is block`);
  return {
    id,
    version: str(v, "version", at, SEMVER_RE),
    title: str(v, "title", at),
    appliesTo: appliesToOf(v["appliesTo"], `${at}/appliesTo`),
    severity,
    ...(precondition === true ? { precondition: true as const } : {}),
    needs: listOf(v["needs"], KERNEL_IDS, `${at}/needs`, "KernelId values (D-057)"),
    legalKind: oneOf(v["legalKind"], LEGAL_KINDS, `${at}/legalKind`, "legalKind"),
    origin: originOf(v["origin"], `${at}/origin`),
    status: oneOf(v["status"], CHECK_STATUSES, `${at}/status`, "status"),
    ...(pending === undefined ? {} : { pending }),
    ...(constraint === undefined ? {} : { constraint }),
  };
}

/** Every seed row, ids unique; a duplicate id is E_SCHEMA at the second row. */
export function loadSeed(seed: unknown): readonly SeedCheck[] {
  const rows = isObj(seed) ? seed["checks"] : undefined;
  if (!Array.isArray(rows)) return bad("/checks", rows, "a checks array", "the checks seed has no checks array");
  const seen = new Set<string>();
  return rows.map((r, i) => {
    const row = seedRow(r, i);
    if (seen.has(row.id)) bad(`/checks/${i}/id`, row.id, "a unique id", `check id ${row.id} appears twice in the seed`);
    seen.add(row.id);
    return row;
  });
}
