// CommandResult assembly (AGENT-SURFACE.md 6.1): verdict from the worst
// finding, counts, findings FAIL then WARN then NOTE (D-067), and ok set in one place
// from resultOk. A command returns CommandOut; the registry finishes it.

import {
  resultOk,
  type BuildHash, type CheckResult, type CommandError, type CommandResult, type Hash, type NextCall, type Stage, type Verdict,
} from "@hackbuild/spec";
import { bySeverity } from "@hackbuild/checks";

export type CommandOut<T> = Omit<CommandResult<T>, "ok">;

const VERDICT_RANK: Readonly<Record<Verdict, number>> = { fail: 3, warn: 2, pass: 1, skip: 0 };

/** The worst verdict; no results is pass, only skips is skip. */
export function worst(results: readonly CheckResult[]): Verdict {
  return results.reduce<Verdict>((v, r) => (VERDICT_RANK[r.verdict] > VERDICT_RANK[v] ? r.verdict : v), results.length === 0 ? "pass" : "skip");
}

export function countsOf(results: readonly CheckResult[]): CommandResult<unknown>["counts"] {
  const n = (v: Verdict): number => results.filter((r) => r.verdict === v).length;
  return { pass: n("pass"), warn: n("warn"), fail: n("fail"), skip: n("skip") };
}

/** Findings for the result in the text mirror's order, FAIL then WARN then NOTE (D-067); passes and skips are counted only. */
export function findingsOf(results: readonly CheckResult[]): CheckResult[] {
  return bySeverity(results);
}

/** Set ok from resultOk; the only place ok is computed. */
export function finish<T>(r: CommandOut<T>): CommandResult<T> {
  return { ...r, ok: resultOk(r) };
}

const STAGE_OF_ERROR: Readonly<Partial<Record<CommandError["code"], Stage>>> = {
  E_KERNEL: "build", E_PARAM_MISSING: "check", E_GATE: "gate", E_GATE_UNAVAILABLE: "gate", E_STALE: "gate", E_DRAFT: "gate",
};

/** A result that carries one error and no evidence. */
export function errorResult(e: CommandError, inputsHash: Hash, extra: { readonly buildHash?: Hash; readonly next?: readonly NextCall[] } = {}): CommandResult<never> {
  return finish<never>({
    verdict: "fail",
    stage: STAGE_OF_ERROR[e.code] ?? "input",
    inputsHash,
    ...(extra.buildHash === undefined ? {} : { buildHash: extra.buildHash as BuildHash }),
    findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [e], artifacts: [],
    next: e.code === "E_HANDLE" && e.chase !== undefined
      ? [{ command: "part.build", args: { chase: e.chase }, why: "rebuild; the store collected that build" }]
      : [...(extra.next ?? [])],
  });
}
