// Expected-violation sets (D-074, CHECKS.md section 10). A chase `expect`
// entry names a check, a target and the declared set of ids that check
// fails on (pairs, nets or ids). The check computes its measured set over
// the target; the expect finding passes only when measured equals
// declared, so drift in either direction fails. SHUNT G7 is the origin:
// gen_board.py lines 699 to 718 compare a hand list of 5 shorts and the
// derived 5 floating nets against EXPECT, and refuse on drift.
//
// The finding's legal kind is exactSet. Finding.extra holds numbers and
// strings only (spec/checks.ts), so `missing` and `extra` are the RFC 8785
// canonical JSON of each sorted id list, for example "[\"ENC\"]".

import type { CheckCtx, ExpectDecl, Finding, ResultTarget } from "@hackbuild/spec";
import { canonicalize } from "@hackbuild/spec";

/** Declared ids absent from the measured set, and measured ids absent from the declared set. */
export interface SetDrift {
  readonly missing: readonly string[];
  readonly extra: readonly string[];
}

/** Ids as one set: duplicates dropped, sorted by UTF-16 code unit, the RFC 8785 key order. */
export function idSet(ids: readonly string[]): readonly string[] {
  return [...new Set(ids)].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
}

/**
 * The id of an unordered pair: the two ids sorted and joined by "|", the
 * form designs/davit/contacts.json and the sweep records use. A pair of
 * one id with itself (SHUNT: BOOT shorted to BOOT) is that id alone.
 */
export function pairId(a: string, b: string): string {
  if (a === b) return a;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function setDrift(declared: readonly string[], measured: readonly string[]): SetDrift {
  const d = new Set(declared);
  const m = new Set(measured);
  return { missing: idSet(declared.filter((x) => !m.has(x))), extra: idSet(measured.filter((x) => !d.has(x))) };
}

/** The declared set of an entry: `set`, or the target alone when set is omitted (spec/chase.ts ExpectDecl). */
export function declaredSet(decl: Pick<ExpectDecl, "target" | "set">): readonly string[] {
  return idSet(decl.set ?? [decl.target]);
}

/** The chase expect entries the registry handed this check for one target id. */
export function expectsFor(ctx: Pick<CheckCtx, "expect">, target: string): NonNullable<CheckCtx["expect"]> {
  return (ctx.expect ?? []).filter((e) => e.target === target);
}

/**
 * The expect finding: measured equals declared, or fail naming the drift.
 * `constraint` says what the measured set counts, in the check's words.
 */
export function expectFinding(
  target: ResultTarget, decl: Pick<ExpectDecl, "target" | "verdict" | "set">, measured: readonly string[], constraint: string,
): Finding {
  const values = declaredSet(decl);
  const got = idSet(measured);
  const drift = setDrift(values, got);
  const equal = drift.missing.length === 0 && drift.extra.length === 0;
  return {
    verdict: equal ? "pass" : "fail",
    target,
    measured: got,
    legal: { kind: "exactSet", values },
    constraint,
    extra: {
      missing: canonicalize(drift.missing),
      extra: canonicalize(drift.extra),
      declaredVerdict: decl.verdict,
      declaredCount: values.length,
      measuredCount: got.length,
    },
  };
}

/** A declared contact pair and its constant mark (designs/davit/contacts.json). */
export interface ContactMark {
  readonly a: string;
  readonly b: string;
  readonly constant?: boolean;
  readonly reason?: string;
}

/**
 * Constant interference (M04-T06 step 5, handed over by M02-T06 step 8). A
 * declared pair that stays inside touch distance in every pose of the
 * gated set passes only when its contact mark says `constant: true` with a
 * reason; an unmarked one fails. A pair marked constant that the sweep does
 * not measure as constant fails too, so a stale mark surfaces. measured
 * maps pairId to the point pairs under touch in every pose (count,
 * computed by the sweep); poses is the size of the pose set.
 */
export function constantFindings(
  measured: Readonly<Record<string, number>>, marks: readonly ContactMark[], poses: number, targetOf: (pair: string) => ResultTarget,
): readonly Finding[] {
  const byPair = new Map(marks.map((m) => [pairId(m.a, m.b), m] as const));
  const marked = idSet([...byPair].filter(([, m]) => m.constant === true).map(([k]) => k));
  const out: Finding[] = [];
  for (const pair of idSet([...Object.keys(measured), ...marked])) {
    const mark = byPair.get(pair);
    const reason = mark?.reason?.trim() ?? "";
    const isConstant = Object.hasOwn(measured, pair);
    const ok = isConstant ? mark?.constant === true && reason !== "" : mark?.constant !== true;
    const constraint = isConstant
      ? `pair ${pair} stays inside touch distance in all ${poses} poses; a constant interference passes only when contacts.json marks it constant with a reason`
      : `pair ${pair} is marked constant but leaves touch distance in some of the ${poses} poses; remove the mark`;
    out.push({
      verdict: ok ? "pass" : "fail",
      target: targetOf(pair),
      measured: ok,
      legal: { kind: "boolean", must: true },
      constraint,
      extra: {
        pair, poses, pointPairs: measured[pair] ?? 0, constant: isConstant ? "measured" : "not measured",
        marked: mark?.constant === true ? "constant" : "unmarked", ...(reason === "" ? {} : { reason }),
      },
    });
  }
  return out;
}
