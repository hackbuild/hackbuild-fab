// Text mirror of constraints.query (M01-T05 step 3, AGENT-SURFACE.md 6.3).
// Dim form: one status line, one line per bound, the binds lines, then
// errors and next. Param form: a status line, then per pointer its status
// line and bound lines. Every number is a fmt.ts call on a value the
// result carries: a floor rounds up and a ceiling rounds down.

import type { Bound, CommandResult, Interval, ParamEnvelope } from "@hackbuild/spec";
import { fmtIn } from "./fmt.js";

const SIDE_WORD = { lo: "floor", hi: "ceil " } as const;

/** The legal range in words: "3.23 to 6.00 mm", "at least 0.80 mm", "none, floors exceed ceilings". */
export function legalWords(iv: Interval): string {
  if (iv.legal === null) return "none, floors exceed ceilings";
  const [lo, hi] = iv.legal;
  const u = iv.unit;
  if (lo === null && hi === null) return "any value";
  if (lo === null) return `at most ${fmtIn(u, hi!, "down")} ${u}`;
  if (hi === null) return `at least ${fmtIn(u, lo, "up")} ${u}`;
  return `${fmtIn(u, lo, "up")} to ${fmtIn(u, hi, "down")} ${u}`;
}

/** How a bound's number was obtained: "computed", or "computed from inferred" when an input row carries a tier. */
export function tierWords(b: Bound): string {
  return b.basis === null || b.basis === b.qualifier ? b.qualifier : `${b.qualifier} from ${b.basis}`;
}

/** `floor <value> <unit>  <reason>  [<kernel>, <qualifier>[ from <tier>][, <source>]]`. */
export function boundLine(b: Bound, unit: string): string {
  const value = fmtIn(unit, b.value, b.side === "lo" ? "up" : "down");
  const tail = [b.kernel, tierWords(b), ...(b.source === undefined ? [] : [b.source])].join(", ");
  return `${SIDE_WORD[b.side]} ${value} ${unit}  ${b.reason}  [${tail}]`;
}

/** Bound lines, floors then ceilings, then one `binds` line per binding bound. */
export function intervalLines(iv: Interval, indent = "  "): string[] {
  const bounds = [...iv.lo, ...iv.hi].map((b) => `${indent}${boundLine(b, iv.unit)}`);
  const binds = [...iv.binding.lo.map((i) => iv.lo[i]!), ...iv.binding.hi.map((i) => iv.hi[i]!)]
    .map((b) => `binds ${boundLine(b, iv.unit)}`);
  return [...bounds, ...binds];
}

const isInterval = (r: unknown): r is Interval => typeof r === "object" && r !== null && "dim" in r;

const shortHash = (h: string): string => `${h.slice(0, 6)}..${h.slice(-2)}`;

/** The result lines between the status line and errors, for either form. */
export function queryLines(result: Interval | ParamEnvelope): string[] {
  if (isInterval(result)) return intervalLines(result);
  const out: string[] = [];
  for (const [pointer, iv] of Object.entries(result.params)) {
    out.push(`${pointer}  ${iv.dim}  legal ${legalWords(iv)}`, ...intervalLines(iv, "    ").map((l) => (l.startsWith("binds") ? `  ${l}` : l)));
  }
  for (const u of result.unbound) out.push(`${u.param}  unbound  ${u.why}`);
  return out;
}

/** The status line: `<VERDICT> constraints.query <dim>   legal <legal>`, or the chase and build for the param form. */
export function queryStatus(target: string, r: CommandResult<unknown>): string {
  const res = r.result as Interval | ParamEnvelope | undefined;
  const head = `${r.verdict.toUpperCase()} constraints.query ${target}`;
  if (res === undefined) return head;
  if (isInterval(res)) return `${head}   legal ${legalWords(res)}`;
  return `${head} build ${shortHash(res.buildHash)}`;
}
