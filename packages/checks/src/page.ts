// The check page (M04-T02 steps 3 to 5, D-050): what hbf://check/<id>
// serves, what `hbf explain <id>` prints and what tools/gen-check-pages.mjs
// writes to docs/reference/checks/<id>.md. One builder feeds all three, so
// the resource, the text and the markdown cannot drift. Every field comes
// from the registered CheckDef (seed row plus module), the references'
// declared `covers` lists and the skip rule; nothing is typed here.

import type { CheckLevel, KernelId, MilestoneId } from "@hackbuild/spec";
import { CHECK_LEVELS, MILESTONE_IDS } from "./loader.js";
import { originFromSeed, type OriginRecord } from "./origin.js";
import type { RegisteredCheck } from "./registry.js";
import { KERNEL_LANDS, TARGET_LANDS, skipReason } from "./skip.js";

/**
 * The milestone the run state is read at: the kernels and target levels
 * that milestone registers (KERNEL_LANDS, TARGET_LANDS). check.run, build,
 * rules-audit and board read their kernel set from it too, so the pages
 * state what those commands do. Kernels that land later (motion and nest
 * at M07, board at M08) are not registered here, and the page index names
 * them. Moving this id moves reference report goldens (coin-inlay
 * report.json moves at M09, measured 2026-10-13), so it moves only with a
 * person's golden acceptance (D-152).
 */
export const PAGE_MILESTONE: MilestoneId = "M05";

/** A reference folder and the ids its README declares in `covers:` (D-105). */
export interface ReferenceCovers {
  /** reference/<area>/<id>, repo relative. */
  readonly path: string;
  readonly covers: readonly string[];
}

/** The ids a reference README declares on its `covers: [...]` line; quotes optional. */
export function coversOf(readme: string): string[] {
  const m = /^covers:\s*\[([^\]]*)\]\s*$/m.exec(readme);
  if (m === null) return [];
  return m[1]!.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter((s) => s !== "");
}

/** What hbf://check/<id> resolves to. */
export interface CheckPage {
  readonly kind: "check";
  readonly id: string;
  readonly uri: string;
  readonly title: string;
  readonly version: string;
  readonly severity: string;
  readonly status: string;
  readonly target: RegisteredCheck["appliesTo"];
  readonly needs: readonly KernelId[];
  readonly legal: {
    readonly kind: string;
    /** ConstraintDef id that backs the legal values, or null when the check module sets them. */
    readonly constraint: string | null;
    readonly derivation: string;
  };
  readonly drivenBy: string;
  readonly origin: OriginRecord;
  /** How to read the version history: a generated page cannot hold the commit that writes it. */
  readonly history: string;
  /** Reference folders whose README covers this id (D-105). */
  readonly references: readonly string[];
  readonly run: {
    readonly at: MilestoneId;
    readonly runs: boolean;
    /** The skip reason when the check does not run at `at`; null when it runs. */
    readonly reason: string | null;
  };
}

const atOrBefore = (m: MilestoneId, at: MilestoneId): boolean => MILESTONE_IDS.indexOf(m) <= MILESTONE_IDS.indexOf(at);

/** Kernels registered by milestone `at`. */
export function kernelsAt(at: MilestoneId): ReadonlySet<KernelId> {
  return new Set((Object.keys(KERNEL_LANDS) as KernelId[]).filter((k) => atOrBefore(KERNEL_LANDS[k], at)));
}

/** Target levels a registered producer emits by milestone `at`. */
export function levelsAt(at: MilestoneId): ReadonlySet<CheckLevel> {
  return new Set(CHECK_LEVELS.filter((l) => {
    const lands = TARGET_LANDS[l];
    return lands === undefined || atOrBefore(lands, at);
  }));
}

function legalOf(def: RegisteredCheck): CheckPage["legal"] {
  const constraint = def.constraint ?? null;
  const derivation = constraint !== null
    ? `from the solver, ConstraintDef ${constraint}`
    : def.legalKind === "none" ? "informational, no legal values" : "set by the check module";
  return { kind: def.legalKind, constraint, derivation };
}

/** One page from a registered check. */
export function checkPage(def: RegisteredCheck, references: readonly ReferenceCovers[], at: MilestoneId = PAGE_MILESTONE): CheckPage {
  const reason = skipReason({ needs: def.needs, target: def.appliesTo.level, pending: def.pending ?? null }, kernelsAt(at), levelsAt(at));
  return {
    kind: "check",
    id: def.id,
    uri: `hbf://check/${def.id}`,
    title: def.title,
    version: def.version,
    severity: def.severity,
    status: def.status,
    target: def.appliesTo,
    needs: def.needs,
    legal: legalOf(def),
    drivenBy: def.drivenBy === undefined
      ? "none: no param is declared to drive the measured value, so a finding carries no fix (CHECKS.md 2.4)"
      : "declared by the module: the target's param pointers that move the measured value feed fix (CHECKS.md 2.4)",
    origin: originFromSeed(def.seed.origin),
    history: `git log --format='%h %ad %s' --date=short -G '${def.id}' -- packages/checks/seed/checks.seed.json`,
    references: references.filter((r) => r.covers.includes(def.id)).map((r) => r.path).sort(),
    run: { at, runs: reason === null, reason },
  };
}

function targetText(t: CheckPage["target"]): string {
  const parts: string[] = [t.level];
  if (t.kinds !== undefined) parts.push(`kinds ${t.kinds.join(", ")}`);
  if (t.joints !== undefined) parts.push(`joints ${t.joints.join(", ")}`);
  if (t.assertions !== undefined) parts.push(`assertions ${t.assertions.join(", ")}`);
  return parts.join("; ");
}

const runText = (r: CheckPage["run"]): string => (r.runs ? `runs at ${r.at} when its target is present` : `skips at ${r.at}: ${r.reason ?? ""}`);

/** The page as text for `hbf explain <id>`; the first line starts with the id. */
export function renderCheckPage(p: CheckPage): string {
  const o = p.origin;
  return [
    `${p.id} ${p.version}  ${p.title}`,
    `  severity ${p.severity}   status ${p.status}   target ${targetText(p.target)}`,
    `  needs    ${p.needs.length === 0 ? "none" : p.needs.join(", ")}`,
    `  legal    ${p.legal.kind}, ${p.legal.derivation}`,
    `  drivenBy ${p.drivenBy}`,
    `  run      ${runText(p.run)}`,
    `  origin   ${p.uri}   ${o.design} ${o.date}, ${o.failure}`,
    ...o.numbers.map((n) => `  number   ${n}`),
    `  record   ${o.record ?? "missing (docs/reference/checks/origin-gaps.md)"}`,
    `  evidence ${o.evidence ?? "none on record"}`,
    ...o.also.map((a) => `  also     ${a.design} ${a.date}, ${a.failure}${a.evidence === null ? "" : ` (${a.evidence})`}`),
    `  refs     ${p.references.length === 0 ? "none yet" : p.references.join(", ")}`,
    `  history  ${p.history}`,
  ].join("\n");
}

// Markdown table cells: a pipe would split the cell.
const cell = (s: string): string => s.replace(/\|/g, "/");

/** docs/reference/checks/<id>.md. */
export function checkPageMarkdown(p: CheckPage): string {
  const o = p.origin;
  const lines = [
    `# ${p.id} ${p.title}`,
    "",
    "Generated by tools/gen-check-pages.mjs from packages/checks/seed/checks.seed.json and the check modules. Do not edit.",
    "",
    "| field | value |",
    "|---|---|",
    `| uri | \`${p.uri}\` |`,
    `| version | ${p.version} |`,
    `| severity | ${p.severity} |`,
    `| status | ${p.status} |`,
    `| target | ${cell(targetText(p.target))} |`,
    `| needs | ${p.needs.length === 0 ? "none" : p.needs.join(", ")} |`,
    `| legal | ${cell(`${p.legal.kind}, ${p.legal.derivation}`)} |`,
    `| drivenBy | ${cell(p.drivenBy)} |`,
    `| run | ${cell(runText(p.run))} |`,
    "",
    "## Origin",
    "",
    "| field | value |",
    "|---|---|",
    `| design | ${cell(o.design)} |`,
    `| date | ${o.date} |`,
    `| failure | ${cell(o.failure)} |`,
    `| record | ${o.record === null ? "missing, listed in origin-gaps.md" : `\`${o.record}\``} |`,
    `| evidence | ${o.evidence === null ? "none on record" : `\`${o.evidence}\``} |`,
    "",
  ];
  if (o.numbers.length > 0) lines.push("Numbers from the failure story:", "", ...o.numbers.map((n) => `- ${n}`), "");
  if (o.also.length > 0) {
    lines.push("## Second origins", "", "| design | date | failure | evidence |", "|---|---|---|---|",
      ...o.also.map((a) => `| ${cell(a.design)} | ${a.date} | ${cell(a.failure)} | ${a.evidence === null ? "none on record" : `\`${a.evidence}\``} |`), "");
    for (const a of o.also) if (a.numbers.length > 0) lines.push(`Numbers from the ${a.design} failure:`, "", ...a.numbers.map((n) => `- ${n}`), "");
  }
  lines.push(
    "## References",
    "",
    p.references.length === 0 ? "No reference covers this check yet (D-105)." : p.references.map((r) => `- \`${r}\``).join("\n"),
    "",
    "## Version history",
    "",
    "Read it from the seed's git history:",
    "",
    "```",
    p.history,
    "```",
    "",
  );
  return lines.join("\n");
}

/** The index line naming the kernels and target levels that land after `at`, so the run state is read as of `at`. */
function laterKernels(at: MilestoneId): string[] {
  const k = (Object.keys(KERNEL_LANDS) as KernelId[]).filter((x) => !atOrBefore(KERNEL_LANDS[x], at)).map((x) => `${x} (${KERNEL_LANDS[x]})`);
  const l = CHECK_LEVELS.filter((x) => TARGET_LANDS[x] !== undefined && !atOrBefore(TARGET_LANDS[x]!, at)).map((x) => `${x} (${TARGET_LANDS[x]})`);
  if (k.length === 0 && l.length === 0) return [];
  return [
    `The run state is the one check.run registers, read at ${at}. Kernels that land later: ${k.join(", ") || "none"}. Target levels that land later: ${l.join(", ") || "none"}. Their checks skip here until the run state moves with a person's golden acceptance (D-152).`,
    "",
  ];
}

/** docs/reference/checks/INDEX.md: one row per registry id, with the run split counted from the pages. */
export function indexMarkdown(pages: readonly CheckPage[]): string {
  const runs = pages.filter((p) => p.run.runs).length;
  const at = pages[0]?.run.at ?? PAGE_MILESTONE;
  return [
    "# Checks",
    "",
    "Generated by tools/gen-check-pages.mjs. Do not edit.",
    "",
    `${pages.length} registered checks; at ${at} ${runs} run and ${pages.length - runs} skip (computed by the skip rule).`,
    "",
    ...laterKernels(at),
    "| id | version | severity | title | origin | run |",
    "|---|---|---|---|---|---|",
    ...pages.map((p) => `| [${p.id}](${p.id}.md) | ${p.version} | ${p.severity} | ${cell(p.title)} | ${cell(`${p.origin.design} ${p.origin.date}`)} | ${p.run.runs ? "runs" : cell(`skip: ${p.run.reason ?? ""}`)} |`),
    "",
  ].join("\n");
}

/** docs/reference/checks/origin-gaps.md: every check whose knowledge record is missing. */
export function originGapsMarkdown(pages: readonly CheckPage[]): string {
  const gaps = pages.filter((p) => p.origin.record === null);
  return [
    "# Origin gaps",
    "",
    "Generated by tools/gen-check-pages.mjs. Do not edit. Each check below cites its failure in the seed but names no knowledge record yet (CHECKS.md section 8).",
    "",
    gaps.length === 0 ? "No gaps." : "| id | design | date | failure |\n|---|---|---|---|",
    ...gaps.map((p) => `| [${p.id}](${p.id}.md) | ${cell(p.origin.design)} | ${p.origin.date} | ${cell(p.origin.failure)} |`),
    "",
  ].join("\n");
}
