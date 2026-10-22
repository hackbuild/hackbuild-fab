// The number tracing of core/test/message-numbers.test.ts (M01-T05 step 4,
// M04-T05) that more than one file runs, and check.run over every
// reference, which the message-numbers.shard-<i>-of-<n> files split
// between them (R1-speed-01). The rule each helper enforces is stated in
// message-numbers.test.ts.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import type { CheckResult, CommandResult } from "@hackbuild/spec";
import { hashOf } from "../../src/jcs.js";
import { renderFinding } from "../../src/text.js";
import { DERIVATIONS } from "../../src/text/fmt.js";
import { buildPart, declares3mf, export3mf, loadDesign, resolveParams } from "../../src/commands/build.js";
import { allCheckIds, runAllChecks } from "../../src/commands/check-run.js";
import { isBoardDesign } from "../../src/board.js";
import { ROOT, hbf, json } from "../hbf.js";
import { profileSeen } from "./profile-watch.js";
import { shardOf, slice } from "./shards.js";

// ---- numbers in text ----

/** A decimal number standing alone: not part of an id (CHK-NET-05), a pointer (/keys/0) or a word (ffc5p). */
const NUMBER = /(?<![\w./-])-?\d+(?:\.\d+)?(?![\w/]|\.\d|-\w)/g;

export function numbersIn(s: string): string[] {
  return [...s.matchAll(NUMBER)].map((m) => m[0]);
}

export const decimals = (p: string): number => (p.includes(".") ? p.length - p.indexOf(".") - 1 : 0);

/** Printed decimals per unit, from the card (M01-T05 step 4), typed here apart from core/src/text/fmt.ts; any other unit prints 2. */
export const CARD_DECIMALS: Readonly<Record<string, number>> = { mm: 2, ohm: 0, "ohm cm": 0, percent: 2 };
export const cardDecimals = (unit: string): number => CARD_DECIMALS[unit] ?? 2;

/** v rounded at d decimals per dir, as a number; independent of core/src/text/fmt.ts. */
export function roundAt(v: number, d: number, dir: "up" | "down" | "near"): number {
  const k = 10 ** d;
  const q = v * k;
  const n = Math.abs(q - Math.round(q)) < 1e-6 ? Math.round(q) : dir === "up" ? Math.ceil(q) : dir === "down" ? Math.floor(q) : Math.round(q);
  return n / k;
}

/** Printed equals v at its own precision, rounded per dir (any dir when absent). */
export function prints(p: string, v: number, dir?: "up" | "down"): boolean {
  const d = decimals(p);
  const dirs = dir === undefined ? (["near", "up", "down"] as const) : [dir];
  return dirs.some((x) => Math.abs(roundAt(v, d, x) - Number(p)) < 10 ** -(d + 3));
}

/** Every number in a json value, recursively. */
export function numbersOf(x: unknown, out: number[] = []): number[] {
  if (typeof x === "number" && Number.isFinite(x)) out.push(x);
  else if (Array.isArray(x)) for (const v of x) numbersOf(v, out);
  else if (typeof x === "object" && x !== null) for (const v of Object.values(x)) numbersOf(v, out);
  return out;
}

// ---- M04-T05: numbers in check findings ----

/**
 * A number in a finding: as NUMBER, and also not a code point (U+2012), a
 * hex colour (#1A1A1A) or an exponent in a formula (L^4).
 */
const FINDING_NUMBER = /(?<![\w./+^#-])-?\d+(?:\.\d+)?(?![\w/]|\.\d|-\w)/g;

/** A citation of a plan step or section (M00-T09 step 4, AGENT-SURFACE.md section 6.3) is an id, never a measurement. */
const CITATION = /\b(?:step|section)\s$/;

/** Printed numbers of s with the word after each, for the unit rule; citations left out. */
export function printedIn(s: string): { readonly p: string; readonly next: string }[] {
  return [...s.matchAll(FINDING_NUMBER)]
    .filter((m) => !CITATION.test(s.slice(0, m.index)))
    .map((m) => ({ p: m[0], next: /^\s*([a-z]+(?: cm)?)/.exec(s.slice(m.index + m[0].length))?.[1] ?? "" }));
}

/**
 * Printed p traces to v. A decimal print equals v at its own precision,
 * rounded near, up (a floor) or down (a ceiling). A whole print equals v,
 * unless the word after it is a unit that prints whole (fmt.ts, ohm), where
 * v rounds to it.
 */
export function tracesTo(p: string, next: string, v: number): boolean {
  const d = decimals(p);
  if (d > 0) return prints(p, v);
  if (Math.abs(v - Number(p)) <= 1e-9 * Math.max(1, Math.abs(v))) return true;
  return cardDecimals(next) === 0 && next in CARD_DECIMALS && Math.round(v) === Number(p);
}

/**
 * The numeric fields of a result the card names (step 2). An extra string
 * is evidence quoted from the target (a config value, a source line), so
 * its numbers are sources here and never scanned.
 */
export function fieldNumbers(r: CheckResult): number[] {
  const fix = r.fix === undefined ? [] : [r.fix.set, r.fix.paramLegal, r.fix.predicts.measured];
  const quoted = Object.values(r.extra ?? {}).flatMap((v) => (typeof v === "string" ? printedIn(v).map((x) => Number(x.p)) : []));
  return [...numbersOf([r.measured, r.legal, fix, Object.values(r.extra ?? {})]), ...quoted];
}

/** Every named derivation of fmt.ts over each ordered pair of fields. */
export function derivedNumbers(fields: readonly number[]): number[] {
  const out: number[] = [];
  for (const f of Object.values(DERIVATIONS)) {
    for (const a of fields) for (const b of fields) if (b !== 0) out.push(f(a, b));
  }
  return out;
}

/** One untraced number: the check, the line it sits in, the number. */
export interface Untraced {
  readonly check: string;
  readonly line: string;
  readonly number: string;
}

export const describeUntraced = (u: Untraced): string => `${u.check}: ${u.number} in "${u.line}" has no source field`;

/** Untraced numbers of one result in its rendered block and its JSON string fields; inputs are the run's profile reads and declared data. */
export function traceFinding(r: CheckResult, inputs: readonly number[]): Untraced[] {
  const fields = fieldNumbers(r);
  const derived = derivedNumbers(fields);
  const withInputs = [...fields, ...inputs];
  const out: Untraced[] = [];
  // A derived value is rounded near at the printed precision, as fmt rounds a reported value.
  const nearAt = (p: string, v: number): boolean => Math.abs(roundAt(v, decimals(p), "near") - Number(p)) < 10 ** -(decimals(p) + 3);
  const scan = (line: string, pool: readonly number[]): void => {
    for (const { p, next } of printedIn(line)) {
      if (!pool.some((v) => tracesTo(p, next, v)) && !derived.some((v) => nearAt(p, v))) out.push({ check: r.id, line: line.trim(), number: p });
    }
  };
  const [, ...body] = renderFinding(r).split("\n");
  for (const line of body) {
    if (line.startsWith("  origin ")) continue;
    scan(line, line.startsWith("  because ") ? withInputs : fields);
  }
  for (const s of [r.constraint, r.waived?.reason]) if (typeof s === "string") scan(`json ${s}`, withInputs);
  return out;
}

/**
 * Numbers a check module types into its constraint by hand, by check id,
 * each with the module line that prints it. They are defects owned by
 * packages/checks (M04-T05 card defects): the fix moves the constant into
 * profile with provenance or into extra, then deletes its row here. The
 * test fails when a row is no longer seen, so this list only shrinks.
 */
export const TYPED_IN_CHECKS: Readonly<Record<string, readonly string[]>> = {
  "CHK-3MF-03": ["127"],
  "CHK-FIT-02": ["0", "2"],
  "CHK-INL-03": ["0.2286", "0.0103", "0.8745"],
  "CHK-LNT-04": ["-1.5"],
  "CHK-PRT-06": ["0.05"],
  "CHK-PRT-07": ["0.20", "0.05"],
  "CHK-PRT-08": ["45", "1.2", "2.4"],
  "CHK-PRT-10": ["0.02", "8"],
  "CHK-PRT-11": ["0.000846"],
};

export const isTyped = (u: Untraced): boolean => (TYPED_IN_CHECKS[u.check] ?? []).includes(u.number);


/** Every reference/<area>/<id> holding a chase.ts. */
export function referenceDirs(): string[] {
  const base = path.join(ROOT, "reference");
  const dirs = (p: string): string[] => readdirSync(p).filter((n) => statSync(path.join(p, n)).isDirectory()).sort();
  return dirs(base).flatMap((area) => dirs(path.join(base, area)).map((id) => `reference/${area}/${id}`)).filter((r) => existsSync(path.join(ROOT, r, "chase.ts")));
}

/** Untraced numbers of check.run's text mirror outside its finding blocks: the status counts, and next and wrote lines against every result field. */
export function traceRunText(text: string, r: CommandResult<{ results: readonly CheckResult[] }>): Untraced[] {
  const out: Untraced[] = [];
  let rest = text;
  for (const f of r.findings as readonly CheckResult[]) {
    const block = renderFinding(f);
    if (!rest.includes(block)) out.push({ check: f.id, line: block.split("\n")[0]!, number: "(block missing from the text)" });
    rest = rest.replace(block, "");
  }
  const [status, ...lines] = rest.split("\n").filter((l) => l.trim() !== "");
  const counts = Object.values(r.counts);
  for (const { p } of printedIn(status!.replace(/ build \S+/, ""))) if (!counts.includes(Number(p))) out.push({ check: "status", line: status!, number: p });
  const all = (r.result?.results ?? []).flatMap(fieldNumbers);
  for (const line of lines) for (const { p, next } of printedIn(line)) if (!all.some((v) => tracesTo(p, next, v))) out.push({ check: "run", line, number: p });
  return out;
}

/** A finding's id and canonical target: the committed report is canonical JSON, a fresh run is not. */
export const keyOf = (r: CheckResult): string => `${r.id} ${hashOf(r.target)}`;

/**
 * check.run over one shard's slice of the references; the shard file's
 * name says which. In process, one check at a time, then on the CLI as
 * JSON and as text: every number traces, and the CLI run and the committed
 * report render as the in-process run does. The typed-number ledger is
 * kept by message-numbers.test.ts over the check fixtures, so a shard
 * collects nothing for it.
 */
export function referenceChecks(file: string): void {
  const { i, n } = shardOf(file);
  describe("message numbers on check.run over every reference", () => {
    for (const ref of slice(referenceDirs(), i, n)) {
      test(ref, async () => {
        // check.run's own path in process, one check at a time, so a constraint traces only to what its own check read.
        const design = await loadDesign(ref, ROOT);
        // A board builds a BoardRecord through its generator, not a Part IR draft; its numbers
        // come from the record, which this trace does not read. Reported as not run (M08).
        if (isBoardDesign(design)) {
          console.info(`not run: ${ref} is a board; message numbers trace Part IR builds only`);
          return;
        }
        const built = await buildPart(design, resolveParams(design.chase, undefined, undefined));
        // A chase that declares no 3mf export (capricate-touch) gets no package, as check.run gives it none.
        const pkg = declares3mf(design) ? await export3mf(built) : undefined;
        const artifacts = pkg === undefined ? [] : [{ exporter: "3mf", name: pkg.name, bytes: pkg.bytes }];
        const inputsOf = new Map<string, number[]>();
        const results: CheckResult[] = [];
        for (const id of allCheckIds(built)) {
          profileSeen.nums.length = 0;
          const checked = await runAllChecks(built, artifacts, [id]);
          inputsOf.set(id, [...profileSeen.nums]);
          results.push(...checked.results);
        }
        expect(results.length, `${ref} gives results`).toBeGreaterThan(0);
        const inputs = (r: CheckResult): number[] => inputsOf.get(r.id) ?? [];
        const { r } = await json("check.run", ref);
        const { out: text } = await hbf(["check.run", ref]);
        const run = r as unknown as CommandResult<{ results: readonly CheckResult[] }>;
        // The committed report is read as well as both runs, so a number typed into any of them is named.
        const golden = JSON.parse(readFileSync(path.join(ROOT, ref, "expected", "report.json"), "utf8")) as { findings: CheckResult[] };
        const untraced = [
          ...results.flatMap((x) => traceFinding(x, inputs(x))),
          ...golden.findings.flatMap((g) => traceFinding(g, inputs(g))),
          ...traceRunText(text, run),
        ];
        expect(untraced.filter((u) => !isTyped(u)).map(describeUntraced)).toEqual([]);
        // Recompute: check.run and the committed report render as the in-process run does, finding for finding.
        // A check may return several results on one target (CHK-PRT-16, one per axis), so each key holds
        // the sorted renders of all its results and the two sides compare as multisets.
        const group = (xs: readonly CheckResult[]): Map<string, string[]> => {
          const m = new Map<string, string[]>();
          for (const x of xs) m.set(keyOf(x), [...(m.get(keyOf(x)) ?? []), renderFinding(x)]);
          for (const v of m.values()) v.sort();
          return m;
        };
        const fresh = group(results);
        const cli = run.result?.results ?? [];
        for (const [k, v] of group(cli)) expect(v, k).toEqual(fresh.get(k) ?? [`missing ${k}`]);
        for (const [k, v] of group(golden.findings)) expect(v, k).toEqual(fresh.get(k) ?? [`missing ${k}`]);
        expect(cli.length).toBeGreaterThan(0);
      }, 180_000);
    }
  });
}
