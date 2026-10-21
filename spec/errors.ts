// spec/errors.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// Error codes, the CommandError shape, exit codes and transport mapping.
// Input problems are errors so a model self-corrects; check failures and
// empty intervals are evidence with a fail verdict and isError false.
// Version 4, 2026-10-04. Carries D-064, D-182, D-102, D-109, D-111, D-153.
// Runtime values: ERROR_CODES, EXIT_CODES, the transport tables, the
// guard isThrownCommandError and the helpers commandError, editDistance
// and didYouMean.

import type { Verdict } from "./ids";

export const ERROR_CODES = [
  "E_SCHEMA",
  "E_REF",
  "E_UNSAT",
  "E_HANDLE",
  "E_STALE",
  "E_PROVENANCE",
  "E_GATE",
  "E_GATE_UNAVAILABLE",
  "E_REPEAT",
  "E_KERNEL",
  "E_PARAM_MISSING",
  "E_DRAFT",
  "E_EXISTS",
] as const;

/**
 * E_SCHEMA input failed its schema. E_REF an id, dim, check or archetype
 * does not exist (with didYouMean); a chase.patch pointer or param edit that
 * names no node in the chase is E_REF, with didYouMean over the chase's
 * pointers. E_UNSAT an interval is empty, all bounds
 * attached. E_HANDLE a store uri or cursor is unknown or collected; carries
 * chase when the store recorded it. E_STALE a patch
 * anchor matched 0 or more than 1 times, or a build hash moved under an
 * approval. E_PROVENANCE fabrication refused: an inferred catalog part row
 * (bought part or footprint) on the export path; inferred profile rows warn
 * through readsInferred and never raise it. E_GATE approval declined, expired or
 * forged. E_GATE_UNAVAILABLE the client cannot be asked; a person runs the
 * CLI. E_REPEAT the same RepeatKey a third time, or the same failing
 * report a fourth. E_KERNEL a kernel refused; carries a knowledge record id. E_PARAM_MISSING a check's measured
 * value is NaN or missing. E_DRAFT the design is an hbf draft (plan v9 3.1):
 * export.run refuses it before the gate and the hint names hbf adopt.
 * E_EXISTS the folder a command would write holds files already (hbf init,
 * R1-engine-23); nothing is written and the hint names another name or dir.
 */
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface CommandError {
  readonly code: ErrorCode;
  /** JSON pointer into the input, for example "/facts/netBudgetOhm". */
  readonly path?: string;
  readonly got?: unknown;
  /** What would be accepted, with unit: "at least 71760 ohm at width 6.00, path 62.0, thickness 0.72". */
  readonly expected?: string;
  /** E_REF: up to 3 ids by edit distance over the registry. */
  readonly didYouMean?: readonly string[];
  /** One line, lowercase, imperative, names the failure. */
  readonly hint: string;
  /** Knowledge record id or check id. */
  readonly record?: string;
  /**
   * E_HANDLE only: the chase id whose part.build restores the handle; absent
   * when the store never held the hash or the build came from import. When
   * present, CommandResult.next holds { command: "part.build", args: { chase },
   * why: "rebuild; the store collected that build" }, and the resources/read
   * JSON-RPC error carries the same field in its data.
   */
  readonly chase?: string;
  /** E_GATE_UNAVAILABLE only: the command a person runs. Never a NextCall, never in `next`. */
  readonly personRuns?: string;
}

/**
 * A CommandError raised by a function call (Author.fit, ConstraintSolver,
 * ProfileLookup). A transport catches it and puts .hbf in
 * CommandResult.errors.
 */
export interface ThrownCommandError extends Error {
  readonly hbf: CommandError;
}

/**
 * Structural guard, so it holds when two copies of the package are loaded
 * and instanceof on a subclass would fail. hbf.code must be in ERROR_CODES.
 */
export function isThrownCommandError(e: unknown): e is ThrownCommandError {
  if (!(e instanceof Error) || !("hbf" in e)) return false;
  const h = (e as { hbf: unknown }).hbf;
  return (
    typeof h === "object" &&
    h !== null &&
    (ERROR_CODES as readonly unknown[]).includes((h as { code?: unknown }).code)
  );
}

/**
 * The one constructor of a ThrownCommandError. Every package raises
 * through it, so Error.message reads "<code> <path> <hint>" everywhere;
 * transports read .hbf, and only the crash path and doctor read .message.
 */
export function commandError(hbf: CommandError): ThrownCommandError {
  const where = hbf.path === undefined || hbf.path === "" ? "" : ` ${hbf.path}`;
  return Object.assign(new Error(`${hbf.code}${where} ${hbf.hint}`), { hbf });
}

/** Levenshtein distance: insert, delete and substitute each cost 1. */
export function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cur = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length]!;
}

/**
 * CommandError.didYouMean for E_REF: up to n candidates by edit distance,
 * closest first, ties by name. Duplicates and got itself are left out; a
 * got that is not a string ranks against "".
 *
 * With `segments` (M06-T11), a candidate also ranks by its closest
 * hyphen-separated word plus 1, so a misspelt word of a long registry id
 * finds it: "genva" reaches "geneva-external" at 2 where the whole id is
 * 10 away. Registries whose ids are word slugs pass it.
 */
export function didYouMean(got: unknown, candidates: readonly string[], n = 3, opts: { readonly segments?: boolean } = {}): string[] {
  const g = typeof got === "string" ? got : "";
  const dist = (c: string): number => {
    const whole = editDistance(g, c);
    if (opts.segments !== true) return whole;
    return Math.min(whole, ...c.split("-").map((w) => editDistance(g, w) + 1));
  };
  return [...new Set(candidates)]
    .filter((c) => c !== g)
    .map((c) => ({ c, d: dist(c) }))
    .sort((x, y) => x.d - y.d || (x.c < y.c ? -1 : x.c > y.c ? 1 : 0))
    .slice(0, n)
    .map((x) => x.c);
}

/** CLI exit codes. */
export const EXIT_CODES = {
  pass: 0,
  fail: 1,
  input: 2,
  gateUnavailable: 3,
  provenance: 4,
  repeat: 5,
  internal: 70,
} as const;
export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

/** How one error code crosses each transport. */
export interface TransportMapping {
  /** CLI exit code. */
  readonly exit: ExitCode;
  /** HTTP status code. */
  readonly http: number;
  /** MCP CallToolResult isError. */
  readonly isError: boolean;
}

/**
 * Transport mapping per api-library-ai-design.md section 6.2, with three
 * rows that table lacks (E_GATE, E_KERNEL, E_PARAM_MISSING) and one row it
 * changes (E_UNSAT). Rows match AGENT-SURFACE.md section 6.2 and M12-T03.
 *
 * E_UNSAT is an answer to a query. An empty interval is the correct
 * result of constraints.query (P2, query before build): the call returns
 * verdict "fail", isError false, exit 1, HTTP 200, the Interval with
 * `legal: null` and every bound in `result`, and a `next` call naming the
 * binding fact (for the trace-width case, the budget that fits 6.00 is
 * 71760 ohm, computed: 71759.26 rounded up). The code E_UNSAT appears inside the CommandError
 * that carries `expected`, never as a protocol or tool error.
 *
 * E_PARAM_MISSING keeps exit 2. Every documented case names a pointer the
 * caller or the profile fills: a fact absent from constraints.query, a null
 * kerf in a machine row, named `hbf://profile/machine/<id>#/kerf`, a param
 * read with no default (FEELER P.armW). `path` is that pointer. For the null
 * kerf case `next` is [{command: <the failing command>, args: {...same,
 * kerfMode: "none"}, why: "cut at nominal; slots carry the design slop"},
 * {command: "knowledge.search", args: {query: "kerf coupon"}, why: "a
 * person cuts the coupon and enters kerf"}]. A non-finite value a check computes from complete,
 * finite inputs has no pointer to name; it is a check defect and exits 70
 * as a crash (JSON-RPC error, HTTP 500) with the check id in `record`.
 *
 * E_GATE shares exit 3 with E_GATE_UNAVAILABLE (nothing written, the gate
 * did not pass). E_KERNEL exits 1 with HTTP 200 because the caller acts on
 * the knowledge record id; exit 70 stays for crashes. D-182 records these
 * rows and supersedes D-064's transport text. core/test/transport-map.test.ts imports this table, never
 * a copy.
 */
export const ERROR_TRANSPORT = {
  E_SCHEMA: { exit: EXIT_CODES.input, http: 422, isError: true },
  E_REF: { exit: EXIT_CODES.input, http: 422, isError: true },
  E_HANDLE: { exit: EXIT_CODES.input, http: 422, isError: true },
  E_STALE: { exit: EXIT_CODES.input, http: 422, isError: true },
  E_UNSAT: { exit: EXIT_CODES.fail, http: 200, isError: false },
  E_PROVENANCE: { exit: EXIT_CODES.provenance, http: 409, isError: true },
  E_GATE_UNAVAILABLE: { exit: EXIT_CODES.gateUnavailable, http: 403, isError: true },
  E_REPEAT: { exit: EXIT_CODES.repeat, http: 429, isError: true },
  E_GATE: { exit: EXIT_CODES.gateUnavailable, http: 403, isError: true },
  E_KERNEL: { exit: EXIT_CODES.fail, http: 200, isError: true },
  E_PARAM_MISSING: { exit: EXIT_CODES.input, http: 422, isError: true },
  E_DRAFT: { exit: EXIT_CODES.input, http: 409, isError: true },
  E_EXISTS: { exit: EXIT_CODES.input, http: 409, isError: true },
} as const satisfies Record<ErrorCode, TransportMapping>;

/**
 * Verdicts on a call that produced evidence. pass and warn exit 0. fail
 * (a failing check, or an E_UNSAT interval) exits 1. skip (a check that did
 * not apply, or a harness that did not run, D-153) exits 0 and is counted
 * in CommandResult.counts.skip, never folded into pass. All are HTTP 200
 * with isError false.
 */
export const VERDICT_TRANSPORT = {
  pass: { exit: EXIT_CODES.pass, http: 200, isError: false },
  warn: { exit: EXIT_CODES.pass, http: 200, isError: false },
  fail: { exit: EXIT_CODES.fail, http: 200, isError: false },
  skip: { exit: EXIT_CODES.pass, http: 200, isError: false },
} as const satisfies Record<Verdict, TransportMapping>;
