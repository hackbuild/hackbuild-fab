// The Part IR checks check.run adds (M00-T13 step 8): CHK-PRT-01
// closed manifold per exported part, CHK-PRT-03 parts of one object sum to
// the solid, and CHK-3MF-04, whose rule runs in packages/3mf (M00-T09 step
// 4). Title, version, severity and origin come from the seeded check row,
// never from this file. The rules of CHK-PRT-01 and -03 live in the M04
// registry modules (packages/checks prt01Finding, prt03Finding); this file
// feeds them the export slots until check.run moves onto runRegistry. It
// reads the seed as data, so core and a baked bench run one copy (D-264).

import type { CheckId, CheckResult, CheckUri, Finding, Hash, Severity } from "@hackbuild/spec";
import { commandError as cmdError } from "@hackbuild/spec";
import { signedVolume, type MeshData } from "@hackbuild/mesh";
import {
  failedOn, failedPreconditions, gatedBy, loadSeed, preconditionIds, preconditionReason, prt01Finding, prt03Finding,
  withSeverity, type GateFields,
} from "@hackbuild/checks";
import { hashOf } from "./hash.js";

export const M00_PART_CHECKS = ["CHK-PRT-01", "CHK-PRT-03", "CHK-3MF-04"] as const;
export type M00PartCheck = (typeof M00_PART_CHECKS)[number];

export interface SeedRow {
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly severity: Severity;
  readonly precondition?: true;
  readonly needs: GateFields["needs"];
  readonly appliesTo: GateFields["appliesTo"];
  readonly legalKind: string;
  readonly origin: { readonly project: string; readonly date: string; readonly what: string };
}

/** Seeded check rows by id, from packages/checks/seed/checks.seed.json. */
export function seedRows(seed: unknown): ReadonlyMap<string, SeedRow> {
  const list = Array.isArray(seed) ? seed : (seed as { checks?: unknown[] } | null)?.checks ?? Object.values(seed as object);
  return new Map((list as SeedRow[]).filter((r) => typeof r?.id === "string").map((r) => [r.id, r]));
}

function rowOf(rows: ReadonlyMap<string, SeedRow>, id: M00PartCheck): SeedRow {
  const r = rows.get(id);
  if (r === undefined) throw cmdError({ code: "E_REF", path: `/checks/${id}`, got: id, hint: `the check seed lacks ${id}; restore packages/checks/seed/checks.seed.json` });
  return r;
}

/** The registry entries one build used, each id to its resolved version or content hash. */
export interface RegistryEntries {
  /** Feature kinds the design registers, kind to version; empty for an imported mesh or a scene. */
  readonly kinds: Readonly<Record<string, string>>;
  /** Constraint defs core collects at load (D-044), id to version; every build can read any of them. */
  readonly constraints?: Readonly<Record<string, string>>;
  /** Checks the build resolves, id to version. */
  readonly checks: Readonly<Record<string, string>>;
  /** Exporters, kind to the hash of what fixes their output; absent where the build exports nothing. */
  readonly exporters?: Readonly<Record<string, string>>;
}

/** Registry entry kinds in the order spec/registry.ts names them. */
const ENTRY_KINDS = ["featureKind", "constraint", "check", "exporter"] as const;

/**
 * BuildInputs.registryHash (D-051 as refined by D-243), the one formula
 * part.build, the import path and the scene audit share: sha256 over the
 * canonical JSON of every (kind, id, version) triple the build used,
 * feature kinds, constraint defs, checks and exporters, sorted by kind,
 * then id, then version (spec/registry.ts, ARCHITECTURE.md 8).
 */
export function registryHashOf(e: RegistryEntries): Hash {
  const groups: Record<(typeof ENTRY_KINDS)[number], Readonly<Record<string, string>>> = {
    featureKind: e.kinds, constraint: e.constraints ?? {}, check: e.checks, exporter: e.exporters ?? {},
  };
  const triples = ENTRY_KINDS.flatMap((kind) => Object.entries(groups[kind]).map(([id, version]) => [kind, id, version] as const));
  const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  triples.sort((a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1]) || cmp(a[2], b[2]));
  return hashOf(triples);
}

/** Check id to version for registryHash. */
export function m00Versions(seed: unknown): Record<string, string> {
  const rows = seedRows(seed);
  return Object.fromEntries(M00_PART_CHECKS.map((id) => [id, rowOf(rows, id).version]));
}

/** Precondition check ids of the seed, in seed order (CheckDef.precondition, D-067). */
export function preconditionOrder(seed: unknown): CheckId[] {
  return preconditionIds(loadSeed(seed));
}

/**
 * Skip results for the defs a failed precondition gates on one part
 * (CHECKS.md section 3), keyed by check id. A def absent from the map runs.
 */
export function gatedSkips(seed: unknown, partId: string, prior: readonly CheckResult[], defs: readonly GateFields[]): ReadonlyMap<string, CheckResult> {
  const order = preconditionOrder(seed);
  const failed = failedOn(failedPreconditions(prior, order), [partId], order);
  const rows = seedRows(seed);
  const out = new Map<string, CheckResult>();
  for (const def of defs) {
    const gate = gatedBy(def, failed, order);
    const row = rows.get(def.id);
    if (gate === null || row === undefined) continue;
    out.set(def.id, stamp(row, { verdict: "skip", target: { level: "part", part: partId }, measured: "not run", legal: { kind: "none" }, constraint: preconditionReason(gate) }));
  }
  return out;
}

/** Stamp the registry fields onto a finding; a NaN or missing measured value is E_PARAM_MISSING (D-064). */
export function stamp(row: SeedRow, f: Finding): CheckResult {
  const m = (f as { measured?: unknown }).measured;
  if (m === undefined || (typeof m === "number" && Number.isNaN(m))) {
    throw cmdError({ code: "E_PARAM_MISSING", path: `/checks/${row.id}/measured`, got: String(m), hint: `${row.id} produced no measured value; rebuild and run the check again`, record: row.id });
  }
  return withSeverity({ ...f, id: row.id as CheckResult["id"], version: row.version, severity: row.severity, origin: `hbf://check/${row.id}` as CheckUri } as CheckResult);
}

/** One exported part of the object: a slot union on the m-s path, a body on the stage path. */
export interface ExportPart {
  readonly name: string;
  readonly mesh: MeshData;
  /** Part IR body this mesh belongs to, so a CHK-PRT-01 fail is located on it. */
  readonly body?: string;
}

export interface PartCheckInput {
  readonly partId: string;
  readonly parts: readonly ExportPart[];
  /** Volume of the union of every part, mm3 (Part IR solid, snapped). */
  readonly solidVolumeMm3: number;
  /** The same union before the D-054 snap, mm3 (Part IR unionVolumeMm3); CHK-PRT-03 measures overlap against it. */
  readonly unionVolumeMm3?: number;
}

/** A failing CHK-PRT-01 finding moved onto the body of its first failing mesh, when that mesh names one. */
function locate(f: Finding, input: PartCheckInput): Finding {
  const first = f.extra?.["firstPart"];
  const body = input.parts.find((p) => p.name === first)?.body;
  return f.verdict === "fail" && body !== undefined ? { ...f, target: { level: "body", part: input.partId, body } } : f;
}

/** The precondition fields of a seed row. */
function gateFields(row: SeedRow): GateFields {
  return { id: row.id as CheckId, needs: row.needs, appliesTo: row.appliesTo, ...(row.precondition === true ? { precondition: true as const } : {}) };
}

/** Run CHK-PRT-01, CHK-PRT-03 and CHK-3MF-04 on one part. */
export function runPartChecks(seed: unknown, input: PartCheckInput, only?: readonly string[]): CheckResult[] {
  const rows = seedRows(seed);
  const want = (id: M00PartCheck): boolean => only === undefined || only.length === 0 || only.includes(id);
  const target = { level: "part" as const, part: input.partId };
  const out: CheckResult[] = [];

  const prt01 = locate(prt01Finding(target, input.parts), input);
  // CHK-PRT-01 always runs: the precondition gate reads its verdict even when `only` leaves it out.
  const prt01Result = stamp(rowOf(rows, "CHK-PRT-01"), prt01);
  if (want("CHK-PRT-01")) out.push(prt01Result);
  if (want("CHK-PRT-03")) {
    const row = rowOf(rows, "CHK-PRT-03");
    const gated = gatedSkips(seed, input.partId, [prt01Result], [gateFields(row)]).get(row.id);
    out.push(gated ?? stamp(row, prt03Finding(target, input.parts.map((p) => signedVolume(p.mesh)), input.solidVolumeMm3, input.unionVolumeMm3)));
  }
  if (want("CHK-3MF-04")) {
    out.push(stamp(rowOf(rows, "CHK-3MF-04"), {
      verdict: "skip", target, measured: "not run", legal: { kind: "none" },
      constraint: "not run: the inset rule runs on part ir in packages/3mf (M00-T09 step 4), which registers no CHK-3MF-04 run yet",
    }));
  }
  return out;
}
