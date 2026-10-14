// What a cut-sheet gate returns: the check id it belongs to, its verdict,
// the generator's own gate line (gen_keyway.py lines 197 to 287 print
// "PASS ..." or "FAIL ..."), and the evidence finding (D-064). The gate
// lines keep the generators' wording so a run can be held line for line
// to the 2026-10-04 rerun (reference/copper/<name>/legacy/run-2026-10-04.txt).
//
// Thresholds are profile constants (vinyl.*); design values (the board's
// clearance gate, edge keep) come from the draft, which takes them from
// the chase params.

import type { CheckId, Finding, ProfileLookup, ResultTarget, SingleTarget } from "@hackbuild/spec";
import type { Vinyl, VinylBoard } from "@hackbuild/copper";
import { intervalEvidence, passOr } from "../skeleton/common.js";

/**
 * The check a gate reports under. The six gate families of the KEYWAY
 * family that ran under candidate names at M05-T15 were entered as
 * CHK-NET-40 to -45 in one batch at M05-T17 (CHECKS.md section 9), so every
 * gate now names a registry id.
 */
export type GateId = CheckId;

export interface Gate {
  readonly id: GateId;
  readonly ok: boolean;
  /** "PASS ..." or "FAIL ...", the generator's wording. */
  readonly line: string;
  readonly finding: Finding;
}

export interface GateCtx {
  readonly v: Vinyl;
  readonly board: VinylBoard;
  readonly profile: ProfileLookup;
}

/** A profile constant's value. */
export const k = (ctx: GateCtx, id: string): number => ctx.profile.constant(id).value;

/** The part id the targets name: the board's name in lowercase. */
export const partOf = (ctx: GateCtx): string => ctx.board.draft.name.toLowerCase();

export const netTarget = (ctx: GateCtx, net: string): SingleTarget => ({ level: "net", part: partOf(ctx), net });
export const sheetTarget = (ctx: GateCtx, sheet: string): SingleTarget => ({ level: "sheet", sheet, part: partOf(ctx) });

type Extra = Finding["extra"];

export function gate(id: GateId, ok: boolean, msg: string, finding: Omit<Finding, "verdict">): Gate {
  return { id, ok, line: `${ok ? "PASS" : "FAIL"} ${msg}`, finding: { ...finding, verdict: passOr(ok) } as Finding };
}

/** A boolean gate. */
export function boolGate(id: GateId, ok: boolean, msg: string, target: ResultTarget, constraint: string, extra?: Extra): Gate {
  return gate(id, ok, msg, { target, measured: ok, legal: { kind: "boolean", must: true }, constraint, ...(extra === undefined ? {} : { extra }) });
}

/**
 * An interval gate. ok is the generator's own comparison, strict where the
 * generator's is strict (a "> 20 mm2" gate fails at exactly 20), so the
 * verdict and the line never disagree; the evidence carries the interval.
 */
export function intervalGate(id: GateId, ok: boolean, msg: string, target: ResultTarget, measured: number, lo: number | null, hi: number | null, unit: string, constraint: string, extra?: Extra): Gate {
  const ev = intervalEvidence(measured, lo, hi, unit);
  return gate(id, ok, msg, { target, measured: ev.measured, legal: ev.legal, constraint, ...(extra === undefined ? {} : { extra }) });
}

/** Python's '%-4s'. */
export const left = (s: string, w: number): string => s.padEnd(w, " ");

/**
 * Python's '%.<d>f'. Both round the exact binary value; on an exact tie
 * (2.5 at 0 places, 0.25 at 1) Python takes the even digit and toFixed the
 * larger, so a tie is rounded here half to even.
 */
export const f = (v: number, d: number): string => {
  const k = 10 ** d;
  const scaled = v * k;
  const fl = Math.floor(scaled);
  let s: string;
  if (scaled - fl === 0.5 && scaled / k === v && Number.isSafeInteger(fl)) {
    const n = fl % 2 === 0 ? fl : fl + 1;
    s = (n / k).toFixed(d);
  } else {
    s = v.toFixed(d);
  }
  return /^-0\.?0*$/.test(s) ? s.slice(1) : s;
};

/**
 * A gate line from its template: `{name}` is the slot's value as Python's
 * str of an int or a string, `{name:.Nf}` Python's '%.Nf'. A slot the
 * template names and the gate does not fill is an error in the board's
 * program, never a blank.
 */
export function fill(template: string, slots: Readonly<Record<string, number | string>>): string {
  return template.replace(/\{(\w+)(?::\.(\d+)f)?\}/g, (_m, name: string, d: string | undefined) => {
    const v = slots[name];
    if (v === undefined) throw new Error(`gate message slot {${name}} has no value in "${template}"`);
    if (d !== undefined) return f(Number(v), Number(d));
    return String(v);
  });
}

/** Python's repr of a list of names, or 'none' when empty, as the gate lines print `foreign or 'none'`. */
export const pyList = (xs: readonly string[]): string => (xs.length === 0 ? "none" : `[${xs.map((x) => `'${x}'`).join(", ")}]`);
