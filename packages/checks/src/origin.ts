// Origin records (M04-T02, CHECKS.md section 8, D-066). The seed row's
// CheckOrigin is the single source: project, date, what, numbers, the
// knowledge record id and the evidence path. This module turns it into the
// record a check page shows, renders the numbers with their qualifier, and
// parses the knowledge record id so a test can resolve it to a file and a
// heading under knowledge/. Nothing here reads the filesystem.

import type { CheckOrigin } from "@hackbuild/spec";

/** The five qualifiers every number carries (RULES.md, Language). */
export const QUALIFIERS = ["measured", "computed", "vendor", "inferred", "unknown"] as const;

const QUALIFIER_RE = new RegExp(`\\b(?:${QUALIFIERS.join("|")})\\b`);

/** Where a check came from. Every field is text; numbers keep their qualifier. */
export interface OriginRecord {
  /** Design name as the owner writes it, without the month, for example "OGEE R16-P". */
  readonly design: string;
  /** YYYY-MM or YYYY-MM-DD. */
  readonly date: string;
  /** The failure in one line, from the seed `what`. */
  readonly failure: string;
  /** Numbers quoted from the failure story, each with its qualifier, for example "682 mm3 swept per bar crank (computed, ...)". */
  readonly numbers: readonly string[];
  /** Knowledge record id, knowledge:<path under knowledge/>#<heading slug>, or null while missing (origin-gaps.md). */
  readonly record: string | null;
  /** Absolute evidence path or repo path, or null. */
  readonly evidence: string | null;
  /** Second origins (CheckOrigin.also, CHECKS.md 7.7), each as its own record; empty when none. */
  readonly also: readonly Omit<OriginRecord, "also">[];
}

// Unit tokens a numbers key may end a word with (CHECKS.md section 8: unit in the key suffix).
const UNITS: Readonly<Record<string, string>> = {
  mm3: "mm3", mm2: "mm2", mm: "mm", pct: "percent", deg: "deg", kohm: "kohm", ohm: "ohm",
  v: "V", us: "us", ms: "ms", px: "px", n: "N",
};

/** One numbers entry as text: value, unit, the words of the key, then the qualifier when the value does not carry one. */
export function numberLine(key: string, value: number | string, qualifier: string | undefined): string {
  const words = key.split(/(?=[A-Z])/).map((w) => w.toLowerCase());
  const unitAt = words.findIndex((w) => UNITS[w] !== undefined);
  const unit = unitAt < 0 ? "" : UNITS[words[unitAt]!]!;
  const label = words.filter((_, i) => i !== unitAt).join(" ");
  const text = [String(value), unit, label].filter((s) => s !== "").join(" ");
  const own = typeof value === "string" && QUALIFIER_RE.test(value);
  return own || qualifier === undefined ? text : `${text} (${qualifier})`;
}

/** Every numbers entry as text, in key order of the seed; the `qualifier` key qualifies the others. */
export function numberLines(numbers: CheckOrigin["numbers"]): string[] {
  if (numbers === undefined) return [];
  const q = numbers["qualifier"];
  const qualifier = typeof q === "string" ? q : undefined;
  return Object.entries(numbers).filter(([k]) => k !== "qualifier").map(([k, v]) => numberLine(k, v, qualifier));
}

/** True when a rendered number line names one of the five qualifiers. */
export function isQualified(line: string): boolean {
  return QUALIFIER_RE.test(line);
}

/** The seed origin as the check page shows it. "OGEE R16-P 2026-08" gives design "OGEE R16-P"; the date field wins over the suffix. */
export function originFromSeed(o: CheckOrigin): OriginRecord {
  const one = (x: Omit<CheckOrigin, "also">): Omit<OriginRecord, "also"> => ({
    design: x.project.replace(/\s+20\d{2}-\d{2}(-\d{2})?$/, "").trim(), date: x.date, failure: x.what,
    numbers: numberLines(x.numbers), record: x.knowledge ?? null, evidence: x.evidence ?? null,
  });
  return { ...one(o), also: (o.also ?? []).map(one) };
}

/** A heading as its anchor: lowercase, punctuation other than hyphen dropped, spaces to hyphens. */
export function headingSlug(heading: string): string {
  return heading.trim().toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
}

/** knowledge:<path>#<slug> as its parts; null when the id is not of that form. */
export function parseRecordId(id: string): { readonly path: string; readonly slug: string } | null {
  const m = /^knowledge:([a-z0-9][a-z0-9/_.-]*)#([a-z0-9-]+)$/.exec(id);
  if (m === null || m[1]!.includes("..")) return null;
  return { path: m[1]!, slug: m[2]! };
}

/** Anchors of every markdown heading in a record, for resolving a record id. */
export function headingSlugs(markdown: string): ReadonlySet<string> {
  return new Set(markdown.split("\n").filter((l) => /^#{1,6} /.test(l)).map((l) => headingSlug(l.replace(/^#+/, ""))));
}
