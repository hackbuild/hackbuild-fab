// The six M-S checks as CheckDef (spec/checks.ts). Each module exports a run
// body and, where it applies, drivenBy; every other field is read from the
// seed row (packages/checks/seed/checks.seed.json), so the seed stays the
// single source for titles, versions, levels and origins, as M04-T01 does
// for the full registry.

import type {
  AnyCheckDef, CheckDef, CheckId, CheckLevel, CheckOrigin, CheckStatus, KernelId, LegalKind, MilestoneId, Severity,
} from "@hackbuild/spec";
import type { FilamentTemplate } from "@hackbuild/3mf";
import { checkError } from "./common.js";
import { key01DrivenBy, runKey01 } from "./key01.js";
import { runNet02 } from "./net02.js";
import { runNet29 } from "./net29.js";
import { runPrt04 } from "./prt04.js";
import { run3mf06, run3mf07 } from "./threemf.js";
import { CHK_INL_01_VERSION, CHK_INL_02_VERSION, CHK_INL_03_VERSION, CHK_INL_04_VERSION, INLAY_CHECK_IDS, inl03DrivenBy, runInl01, runInl02, runInl03, runInl04, type InlayDecl } from "@hackbuild/inlay";

/** The checks the walking skeleton runs, in report order (M-S-T06). */
export const SKELETON_CHECK_IDS = ["CHK-PRT-04", "CHK-NET-02", "CHK-NET-29", "CHK-KEY-01", "CHK-3MF-06", "CHK-3MF-07"] as const;
export type SkeletonCheckId = (typeof SKELETON_CHECK_IDS)[number];

/**
 * Checks whose measured value is the driving param itself, so the fix is
 * the param's nearest legal value at its step without a solver (D-064).
 * The rest wait for constraints.query at M01.
 */
export const MEASURES_PARAM: ReadonlySet<string> = new Set<CheckId>(["CHK-KEY-01", "CHK-INL-03"]);

interface SeedRow {
  readonly id: CheckId;
  readonly version: string;
  readonly title: string;
  readonly appliesTo: { readonly level: CheckLevel; readonly kinds?: readonly string[] };
  readonly severity: Severity;
  readonly needs: readonly KernelId[];
  readonly legalKind: LegalKind;
  readonly origin: CheckOrigin;
  readonly status: CheckStatus;
  readonly pending?: MilestoneId;
  readonly constraint?: string;
}

function seedRows(seed: unknown): ReadonlyMap<string, SeedRow> {
  const rows = (seed as { checks?: unknown } | null)?.checks;
  if (!Array.isArray(rows)) {
    throw checkError({ code: "E_SCHEMA", path: "/checks", hint: "checks seed has no checks array", record: "verification" });
  }
  return new Map((rows as SeedRow[]).map((r) => [r.id, r]));
}

/** The CheckDef fields a seed row carries, refused when the row's level disagrees with the run body. */
function fields<L extends CheckLevel>(rows: ReadonlyMap<string, SeedRow>, id: CheckId, level: L) {
  const r = rows.get(id);
  if (r === undefined) {
    throw checkError({ code: "E_REF", path: "/checks", got: id, hint: `checks seed has no row ${id}`, record: "verification" });
  }
  if (r.appliesTo.level !== level) {
    throw checkError({
      code: "E_SCHEMA", path: `/checks/${id}/appliesTo/level`, got: r.appliesTo.level, expected: level,
      hint: `seed row ${id} applies to ${r.appliesTo.level}; its run body reads ${level}`, record: "verification",
    });
  }
  return {
    id: r.id, version: r.version, title: r.title, severity: r.severity, needs: r.needs, legalKind: r.legalKind,
    origin: r.origin, status: r.status,
    ...(r.pending === undefined ? {} : { pending: r.pending }),
    ...(r.constraint === undefined ? {} : { constraint: r.constraint }),
  };
}

export interface SkeletonSources {
  /** Parsed packages/checks/seed/checks.seed.json. */
  readonly seed: unknown;
  /** packages/3mf/data/filament_template.json through filamentTemplate(). */
  readonly filamentTemplate: FilamentTemplate;
}

/** The six skeleton CheckDefs, in SKELETON_CHECK_IDS order. */
export function skeletonChecks(src: SkeletonSources): readonly AnyCheckDef[] {
  const rows = seedRows(src.seed);
  const prt04: CheckDef<"part"> = { ...fields(rows, "CHK-PRT-04", "part"), appliesTo: { level: "part" }, run: runPrt04 };
  const net02: CheckDef<"net"> = { ...fields(rows, "CHK-NET-02", "net"), appliesTo: { level: "net" }, run: runNet02 };
  const net29: CheckDef<"net"> = { ...fields(rows, "CHK-NET-29", "net"), appliesTo: { level: "net" }, run: runNet29 };
  const key01: CheckDef<"feature", "contact"> = {
    ...fields(rows, "CHK-KEY-01", "feature"), appliesTo: { level: "feature", kinds: ["contact"] }, run: runKey01, drivenBy: key01DrivenBy,
  };
  const six: CheckDef<"artifact"> = { ...fields(rows, "CHK-3MF-06", "artifact"), appliesTo: { level: "artifact" }, run: run3mf06 };
  const seven: CheckDef<"artifact"> = {
    ...fields(rows, "CHK-3MF-07", "artifact"), appliesTo: { level: "artifact" }, run: (t) => run3mf07(t, src.filamentTemplate),
  };
  const kinds = rows.get("CHK-KEY-01")?.appliesTo.kinds ?? [];
  if (kinds.length !== 1 || kinds[0] !== "contact") {
    throw checkError({ code: "E_SCHEMA", path: "/checks/CHK-KEY-01/appliesTo/kinds", got: kinds.join(","), expected: "contact", hint: "CHK-KEY-01 reads contact features", record: "verification" });
  }
  return [prt04, net02, net29, key01, six, seven];
}

/** Each inlay check (INLAY_CHECK_IDS of packages/inlay, whose run bodies these are) and its version as its run body states it; the seed row must agree. */
const INLAY_VERSIONS: Readonly<Record<(typeof INLAY_CHECK_IDS)[number], string>> = {
  "CHK-INL-01": CHK_INL_01_VERSION, "CHK-INL-02": CHK_INL_02_VERSION, "CHK-INL-03": CHK_INL_03_VERSION, "CHK-INL-04": CHK_INL_04_VERSION,
};

/**
 * CHK-INL-01 to 04 as CheckDef, every field but the run body read from the
 * seed row. A row whose version differs from the run body's, or whose
 * feature-level row does not select kind inlay, is E_SCHEMA.
 */
export function inlayChecks(src: Pick<SkeletonSources, "seed">): readonly AnyCheckDef[] {
  const rows = seedRows(src.seed);
  for (const id of INLAY_CHECK_IDS) {
    const r = rows.get(id);
    if (r !== undefined && r.version !== INLAY_VERSIONS[id]) {
      throw checkError({ code: "E_SCHEMA", path: `/checks/${id}/version`, got: r.version, expected: INLAY_VERSIONS[id], hint: `seed row ${id} and its run body in packages/inlay disagree on the version`, record: "verification" });
    }
  }
  for (const id of ["CHK-INL-01", "CHK-INL-03"] as const) {
    const kinds = rows.get(id)?.appliesTo.kinds ?? [];
    if (kinds.length !== 1 || kinds[0] !== "inlay") {
      throw checkError({ code: "E_SCHEMA", path: `/checks/${id}/appliesTo/kinds`, got: kinds.join(","), expected: "inlay", hint: `${id} reads inlay features`, record: "verification" });
    }
  }
  const one: CheckDef<"feature", "inlay"> = {
    ...fields(rows, "CHK-INL-01", "feature"), appliesTo: { level: "feature", kinds: ["inlay"] },
    run: (t, ctx) => runInl01({ part: t.part, feature: t.feature as InlayDecl }, ctx),
  };
  const two: CheckDef<"part"> = { ...fields(rows, "CHK-INL-02", "part"), appliesTo: { level: "part" }, run: runInl02 };
  const three: CheckDef<"feature", "inlay"> = {
    ...fields(rows, "CHK-INL-03", "feature"), appliesTo: { level: "feature", kinds: ["inlay"] },
    run: (t, ctx) => runInl03({ part: t.part, feature: t.feature as InlayDecl }, ctx),
    drivenBy: (t) => inl03DrivenBy({ feature: t.feature as InlayDecl }),
  };
  const four: CheckDef<"part"> = { ...fields(rows, "CHK-INL-04", "part"), appliesTo: { level: "part" }, run: runInl04 };
  return [one, two, three, four];
}
