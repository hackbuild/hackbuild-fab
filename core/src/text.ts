// The text mirror of a CommandResult (AGENT-SURFACE.md 6.3): status line,
// findings (FAIL, then WARN, then NOTE; passes counted only), errors, next.
// One renderer serves every transport; the CLI is its first user. Every
// printed line passes through oneLine (text/safe.ts), so a string from a
// design cannot carry a control sequence or a line break to the terminal.

import type { ChaseChange, ChaseVerdictChange, CheckResult, CommandError, CommandResult, FitRow, LegalValues, NextCall, ResultTarget, ValidateQuestion } from "@hackbuild/spec";
import { findingLabel } from "@hackbuild/checks";
import { decimalsOf, fixed, fmt } from "./text/fmt.js";
import { queryLines, queryStatus } from "./text/interval-mirror.js";
import { oneLine } from "./text/safe.js";

/** Printed form of legal values, by kind. */
const LEGAL_TEXT: { readonly [K in LegalValues["kind"]]: (l: Extract<LegalValues, { kind: K }>) => string } = {
  interval: (l) => `${l.lo === null ? (l.hi === null ? "any value" : `at most ${fmt(l.hi)}`) : l.hi === null ? `at least ${fmt(l.lo)}` : `${fmt(l.lo)} to ${fmt(l.hi)}`} ${l.unit}, nearest ${fmt(l.nearest)}`,
  set: (l) => `one of ${l.values.join(", ")}${l.unit === undefined ? "" : ` ${l.unit}`}`,
  multipleOf: (l) => `a multiple of ${fmt(l.base)} ${l.unit}, nearest ${fmt(l.nearest[0])} or ${fmt(l.nearest[1])}`,
  boolean: (l) => (l.must ? "true" : "false"),
  exactSet: (l) => `exactly {${l.values.join(", ")}}`,
  none: () => "none",
};

export function legalText(l: LegalValues): string {
  return (LEGAL_TEXT[l.kind] as (x: LegalValues) => string)(l);
}

/** The name a finding prints for its target. */
export function targetLabel(t: ResultTarget): string {
  if (t.level === "pair") return `${targetLabel(t.a)} and ${targetLabel(t.b)}`;
  const rec = t as Readonly<Record<string, unknown>>;
  const key = ({ feature: "feature", net: "net", body: "body", assembly: "assembly", sheet: "sheet", artifact: "artifact", source: "path", page: "path", project: "path", part: "part" } as Readonly<Record<string, string>>)[t.level] ?? "part";
  return String(rec[key] ?? t.level);
}

function measuredText(r: CheckResult): string {
  const unit = r.legal.kind === "interval" || r.legal.kind === "multipleOf" ? ` ${r.legal.unit}` : "";
  const m = r.measured;
  return Array.isArray(m) ? m.join(", ") : typeof m === "number" ? `${fmt(m)}${unit}` : String(m);
}

export function renderFinding(r: CheckResult): string {
  const word = findingLabel(r) ?? r.verdict.toUpperCase();
  const t = r.target;
  const onPart = "part" in t && typeof t.part === "string" && t.level !== "part" ? ` on part ${t.part}` : "";
  const lines = [
    `${word} ${r.id} ${targetLabel(t)}${onPart}`,
    `  measured ${measuredText(r)}`,
    `  legal    ${legalText(r.legal)}`,
    `  because  ${r.constraint}`,
  ];
  if (r.fix !== undefined) {
    lines.push(`  fix      set ${r.fix.param} = ${String(r.fix.set)}   predicts ${String(r.fix.predicts.measured)}, ${r.fix.predicts.verdict}`);
    lines.push(`  param    ${r.fix.param} legal ${fmt(r.fix.paramLegal[0])} to ${fmt(r.fix.paramLegal[1])}`);
  }
  lines.push(`  origin   ${r.origin}`);
  return lines.map(oneLine).join("\n");
}

export function renderError(e: CommandError): string {
  const parts = [`${e.code}  ${e.hint}`];
  if (e.path !== undefined) parts.push(`path ${e.path}`);
  if (e.got !== undefined) parts.push(`got ${typeof e.got === "string" ? e.got : JSON.stringify(e.got)}`);
  if (e.expected !== undefined) parts.push(`expected ${e.expected}`);
  if (e.didYouMean !== undefined && e.didYouMean.length > 0) parts.push(`did you mean ${e.didYouMean.join(", ")}`);
  if (e.record !== undefined) parts.push(`record ${e.record}`);
  const line = oneLine(parts.join("   "));
  return e.personRuns === undefined ? line : `${line}\n  a person runs  ${oneLine(e.personRuns)}`;
}

const flag = (k: string, v: unknown): string => (typeof v === "string" ? `--${k} ${v}` : `--${k} '${JSON.stringify(v)}'`);

/** `next  hbf <command> <flags>`, one call per line; the target travels positionally. */
export function renderNext(n: NextCall): string {
  const { chase, build, dim, ...rest } = n.args as Readonly<Record<string, unknown>>;
  // A dim-form query travels with its dim as the target and the chase, if any, as a flag.
  const target = dim ?? chase ?? build;
  const named = dim !== undefined && chase !== undefined ? { ...rest, chase } : rest;
  const flags = Object.entries(named).map(([k, v]) => flag(k, v));
  return oneLine(`next  hbf ${[n.command, ...(target === undefined ? [] : [String(target)]), ...flags].join(" ")}`);
}

interface BodyLine {
  readonly id: string; readonly slot: number; readonly material: string; readonly role: string;
  readonly mesh: { readonly hash: string; readonly volumeMm3: number; readonly triangles: number; readonly bbox: readonly (readonly number[])[] };
}

/** Result lines a command prints between the status line and its findings, by command. */
const RESULT_TEXT: Readonly<Record<string, (result: unknown) => string[]>> = {
  "part.inspect": (res) => {
    const r = res as { bodies?: readonly BodyLine[]; warnings?: readonly { code: string; text: string }[] };
    const size = (b: BodyLine): string => {
      const [lo, hi] = b.mesh.bbox;
      return [0, 1, 2].map((i) => fmt((hi?.[i] ?? 0) - (lo?.[i] ?? 0))).join(" x ");
    };
    return [
      ...(r.bodies ?? []).map((b) => `body  ${b.id}  slot ${b.slot}  ${b.material}  ${b.role}  ${fmt(b.mesh.volumeMm3)} mm3 (computed)  ${size(b)} mm  ${b.mesh.triangles} tris  mesh ${b.mesh.hash.slice(0, 12)}`),
      ...(r.warnings ?? []).map((w) => `warn  ${w.code}  ${w.text}`),
    ];
  },
  "export.run": (res) => ((res as { warnings?: readonly { code: string; text: string }[] }).warnings ?? []).map((w) => `warn  ${w.code}  ${w.text}`),
  "constraints.query": (res) => queryLines(res as Parameters<typeof queryLines>[0]),
  "sim.run": (res) => [...((res as { lines?: readonly string[] }).lines ?? [])],
  "sim.sweep": (res) => [...((res as { lines?: readonly string[] }).lines ?? [])],
  "asm.solve": (res) => [...((res as { lines?: readonly string[] }).lines ?? [])],
  "part.probe": (res) => [...((res as { lines?: readonly string[] }).lines ?? [])],
  "circuit.solve": (res) => [...((res as { lines?: readonly string[] }).lines ?? [])],
  "project.graph": (res) => {
    const r = res as { items?: readonly { id: string; hash: string }[]; because?: readonly { id: string; because: readonly string[] }[] };
    const why = new Map((r.because ?? []).map((s) => [s.id, s.because] as const));
    return (r.items ?? []).map((i) => {
      const b = why.get(i.id);
      return b === undefined ? `fresh  ${i.id}  ${i.hash.slice(0, 12)}` : `stale  ${i.id}  because ${b.join(", ")}`;
    });
  },
  "chase.validate": (res) => ((res as { questions?: readonly ValidateQuestion[] }).questions ?? [])
    .map((q) => `question  ${q.id}  ${q.path}  ${q.question}${q.defaultInForce === undefined ? "" : `  default ${q.defaultInForce}`}`),
  "chase.diff": (res) => {
    const r = res as { changes?: readonly ChaseChange[]; verdictChanges?: readonly ChaseVerdictChange[] | null };
    const v = (x: unknown): string => oneLine(JSON.stringify(x) ?? "null");
    return [
      ...(r.changes ?? []).map((c) => `${c.op}  ${c.path}  ${c.op === "added" ? v(c.to) : c.op === "removed" ? v(c.from) : `${v(c.from)} to ${v(c.to)}`}`),
      ...(r.verdictChanges ?? []).map((c) => `verdict  ${c.check}  ${c.from} to ${c.to}  measured ${c.measuredFrom ?? "none"} to ${c.measuredTo ?? "none"} (computed)`),
    ];
  },
  draft: (res) => {
    const r = res as { dir?: string; page?: { file: string; bytes: number }; match?: { from: string; score: number; words: readonly string[]; archetypes: readonly string[] } };
    const m = r.match;
    return [
      ...(m === undefined ? [] : [`from  ${m.from}  score ${m.score.toFixed(3)} (computed)  goal words ${m.words.join(", ") || "none"}${m.archetypes.length === 0 ? "" : `  archetypes ${m.archetypes.join(", ")}`}`]),
      ...(r.page === undefined || r.page.file === "" ? [] : [`page  ${r.page.file}  ${r.page.bytes} bytes (measured)`]),
    ];
  },
  "fits.table": (res) =>((res as { rows?: readonly FitRow[] }).rows ?? []).map((r) => {
    const d = decimalsOf("mm");
    const band = r.band === undefined ? "" : `  band ${fixed(r.band[0], d, "up")} to ${fixed(r.band[1], d, "down")} mm`;
    return `${r.verdict}  ${r.label}  ${r.measured}${band}  ${r.class ?? ""}`;
  }),
};

/** Status lines that replace the counts form, by command: a query has no findings to count. */
const STATUS_TEXT: Readonly<Record<string, (target: string, r: CommandResult<unknown>) => string>> = {
  "constraints.query": queryStatus,
  "chase.diff": (target, r) => {
    const x = r.result as { changes?: readonly unknown[]; verdictChanges?: readonly unknown[] | null } | undefined;
    const vc = x?.verdictChanges;
    return `${r.verdict.toUpperCase()} chase.diff ${target}   ${x?.changes?.length ?? 0} changes  ${vc === null || vc === undefined ? "not built" : `${vc.length} verdict changes`}`;
  },
  "chase.validate": (target, r) => {
    const q = (r.result as { questions?: readonly unknown[] } | undefined)?.questions?.length ?? 0;
    return `${r.verdict.toUpperCase()} chase.validate ${target}   ${r.errors.length} errors  ${q} questions`;
  },
};

export function renderResult(command: string, target: string, r: CommandResult<unknown>): string {
  const hash = r.buildHash === undefined ? "" : ` build ${r.buildHash.slice(0, 6)}..${r.buildHash.slice(-2)}`;
  const head = STATUS_TEXT[command]?.(target, r)
    ?? `${r.verdict.toUpperCase()} ${command} ${target}${hash}   ${r.counts.fail} fail  ${r.counts.warn} warn  ${r.counts.pass} pass  ${r.counts.skip} skip`;
  const body = [
    ...(r.result === undefined ? [] : RESULT_TEXT[command]?.(r.result) ?? []).map(oneLine),
    ...r.findings.map(renderFinding),
    ...r.errors.map(renderError),
    ...r.artifacts.map((a) => oneLine(`wrote ${a.kind} ${a.uri}   ${a.bytes} bytes`)),
    ...r.next.map(renderNext),
  ];
  return [oneLine(head), ...body].join("\n");
}
