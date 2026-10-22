// hbf draft (plan v9 3.1, R1-engine-24; group make, CLI only until the
// F4 decision). One turn from an idea to a page: it writes <cwd>/<name>, or
// --dir, the way hbf init places a maker folder, with chase.ts, build.ts and
// bench.ts copied from `from` the way chase.scaffold copies a source (meta.id
// set to the name), then bakes it with chase.bake mode draft: draft.json
// carries the sources into the page, checks show as warnings, the status
// strip shows the DRAFT banner and every export carries DRAFT. A widget.ts
// written into the directory later rides along on the next bake.
//
// Without from, the goal picks the source (R1-score-03): goalMatch scores
// every reference the capabilities index lists against the goal words, and
// a goal under MATCH_MIN is refused with E_REF naming the closest rows, so a
// draft never stands on a scaffold the goal did not ask for.
//
// The bake runs on a copy under <workspace>/.hbf/init/ (gitignored), as hbf
// init does: the baker resolves bare imports from the design folder upward
// and a folder outside the workspace has no node_modules. The baked folder
// is copied out with a package.json pinning the workspace packages, and the
// page hash is read back from there.

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readChaseSource } from "@hackbuild/chase";
import { CHASE_ID_PATTERN, sha256Hex, type ChaseKind, type CommandInput, type CommandOutput, type Hash } from "@hackbuild/spec";
import { archetypes } from "../canon.js";
import type { CoreCtx } from "../ctx.js";
import { writeDraftBlock } from "../draft-block.js";
import { cmdError } from "../errors.js";
import { slugOf } from "../exporters/names.js";
import type { CommandOut } from "../result.js";
import { workspaceRoot } from "./build.js";
import { capabilities } from "./capabilities.js";
import { words } from "./canon-hits.js";
import { runChaseBake } from "./chase-bake.js";
import { plan, resolveFrom } from "./chase-scaffold.js";
import { tryGit } from "./chase-patch.js";
import { INIT_STAGE, makerPackage } from "./init.js";

type Output = CommandOutput<"draft">;
type Match = NonNullable<Output["match"]>;

const posix = (p: string): string => p.split(path.sep).join("/");

/** Longest name a goal gives, characters (inferred: a folder name a person still reads at a glance). */
const NAME_MAX = 40;

/** The name a goal gives: its slug, cut at a hyphen under NAME_MAX. */
export function nameOfGoal(goal: string): string {
  const slug = slugOf(goal);
  if (slug.length <= NAME_MAX) return slug;
  const cut = slug.slice(0, NAME_MAX + 1);
  const at = cut.lastIndexOf("-");
  return at > 0 ? cut.slice(0, at) : slug.slice(0, NAME_MAX);
}

/** chase.scaffold's from form for a bare id: a reference by meta.id, else a design; a form with a scheme stands. */
export function fromForm(from: string, root: string, top: string, cwd: string): string {
  if (from.includes(":")) return from;
  for (const scheme of ["reference", "design"]) {
    try {
      resolveFrom(`${scheme}:${from}`, root, top, cwd);
      return `${scheme}:${from}`;
    } catch {
      // try the next scheme; the reference form gives the E_REF below
    }
  }
  return `reference:${from}`;
}

/** Least score a reference needs to stand for a goal, share of the goal's word weight (inferred: half the goal named). */
export const MATCH_MIN = 0.5;

/** Weight of a goal word found only past a readme's lead paragraph (inferred: the lead says what the reference is). */
const BODY_WEIGHT = 0.5;

interface Candidate {
  readonly from: string;
  /** Path words, the readme title and lead paragraph, and the ids, senses and emits of the archetypes naming it. */
  readonly head: readonly string[];
  readonly body: readonly string[];
  readonly archetypes: readonly string[];
}

/** Title and first paragraph of a readme, then the rest. */
function readmeParts(text: string): { readonly lead: string; readonly rest: string } {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length && (lines[i]!.trim() === "" || lines[i]!.startsWith("#"))) i++;
  while (i < lines.length && lines[i]!.trim() !== "") i++;
  return { lead: lines.slice(0, i).join("\n"), rest: lines.slice(i).join("\n") };
}

/** Every reference the capabilities index lists that holds a chase, as a goal candidate. */
function candidates(root: string): Candidate[] {
  const defs = archetypes.entries.map((e) => e.def);
  return capabilities(root).functions.flatMap((f) => f.references)
    .filter((r) => existsSync(path.join(root, r.path, "chase.ts")))
    .map((r) => {
      const rel = r.path.slice("reference/".length);
      const readme = readmeParts(readFileSync(path.join(root, r.path, "README.md"), "utf8"));
      const named = defs.filter((d) => d.reference.includes(rel));
      return {
        from: `reference:${rel}`,
        head: words([rel, readme.lead, ...named.flatMap((d) => [d.id, ...d.senses, ...d.emits])].join(" ")),
        body: words(readme.rest),
        archetypes: named.map((d) => d.id).sort(),
      };
    })
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

/**
 * Every candidate scored against the goal, best first. A goal word weighs
 * ln((N + 1) / (n + 0.5)) over N candidates, n of them holding a word it
 * starts, so a word every readme holds ("mm") weighs little and a word none
 * holds ("teapot") weighs most; a score is the share of the goal's weight a
 * candidate holds, a body-only word at BODY_WEIGHT. Ties fall to the path.
 */
export function goalMatches(goal: string, root: string): Match[] {
  const cs = candidates(root);
  const ws = [...new Set(words(goal))];
  const holds = (ts: readonly string[], w: string): boolean => ts.some((t) => t.startsWith(w));
  const weight = new Map(ws.map((w) => [w, Math.log((cs.length + 1) / (cs.filter((c) => holds(c.head, w) || holds(c.body, w)).length + 0.5))]));
  const total = [...weight.values()].reduce((s, x) => s + x, 0);
  return cs.map((c) => {
    let s = 0;
    const held: string[] = [];
    for (const w of ws) {
      const k = holds(c.head, w) ? 1 : holds(c.body, w) ? BODY_WEIGHT : 0;
      if (k > 0) held.push(w);
      s += k * weight.get(w)!;
    }
    return { from: c.from, score: total > 0 ? Math.round((s / total) * 1000) / 1000 : 0, words: held, archetypes: c.archetypes };
  }).sort((a, b) => b.score - a.score);
}

const row = (m: Match): string => `${m.from.slice("reference:".length)} ${m.score.toFixed(3)}`;

/** The reference a goal stands for, or E_REF naming the closest rows when none reaches MATCH_MIN. */
export function goalMatch(goal: string, root: string): Match {
  const ranked = goalMatches(goal, root);
  const best = ranked[0];
  if (best === undefined || best.score < MATCH_MIN) {
    const close = ranked.slice(0, 3);
    throw cmdError({
      code: "E_REF", path: "/goal", got: goal, expected: `a reference holding at least ${MATCH_MIN} of the goal's word weight (inferred)`,
      didYouMean: close.map((m) => m.from),
      hint: `no reference matches the goal; closest ${close.map(row).join(", ")} (computed). name one with --from, or say the goal in its words`,
    });
  }
  return best;
}

const NONE: Output = { dir: "", files: [], page: { file: "", bytes: 0, hash: "" as Hash } };

const refused = (ctx: CoreCtx, errors: CommandOut<Output>["errors"]): CommandOut<Output> => ({
  verdict: "fail", stage: "input", inputsHash: ctx.inputsHash,
  findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors, artifacts: [], next: [], result: NONE,
});

export async function runDraft(input: CommandInput<"draft">, ctx: CoreCtx): Promise<CommandOut<Output>> {
  const goal = input.goal.trim();
  if (goal === "") throw cmdError({ code: "E_SCHEMA", path: "/goal", got: input.goal, expected: "a goal in words", hint: "say what the draft is for, for example hbf draft \"access switch\"" });
  const name = input.name ?? nameOfGoal(goal);
  if (!CHASE_ID_PATTERN.test(name)) {
    throw cmdError({ code: "E_SCHEMA", path: input.name === undefined ? "/goal" : "/name", got: name, expected: "a lowercase slug, letters and digits joined by single hyphens", hint: "name the draft with --name, like access-switch" });
  }
  const dir = path.resolve(ctx.cwd, input.dir ?? name);
  if (existsSync(dir) && readdirSync(dir).length > 0) {
    throw cmdError({ code: "E_EXISTS", path: input.dir === undefined ? "/name" : "/dir", got: posix(dir), expected: "an absent or empty folder", hint: `${posix(dir)} holds files; pick another --name or --dir, nothing was written` });
  }
  const root = workspaceRoot(ctx.workspace);
  const found = tryGit(ctx.cwd, ["rev-parse", "--show-toplevel"]);
  const top = found === undefined || found === "" ? realpathSync(ctx.cwd) : realpathSync(found);

  const match = input.from === undefined ? goalMatch(goal, root) : undefined;
  const from = match?.from ?? fromForm(input.from!, root, top, ctx.cwd);
  const src = resolveFrom(from, root, top, ctx.cwd);
  const kind: ChaseKind = readChaseSource(readFileSync(path.join(src.dir, "chase.ts"), "utf8"), `${src.label}/chase.ts`).chase.meta.kind;
  const p = await plan(ctx, { kind, name, from }, root, top, name);
  if ("errors" in p) return refused(ctx, p.errors);
  const pkg = makerPackage(name, p.files, root);
  ctx.signal.throwIfAborted();

  mkdirSync(path.join(root, INIT_STAGE), { recursive: true });
  const stage = mkdtempSync(path.join(root, INIT_STAGE, `${name}-`));
  try {
    const design = path.join(stage, name);
    for (const [f, t] of p.files) {
      mkdirSync(path.dirname(path.join(design, f)), { recursive: true });
      writeFileSync(path.join(design, f), t);
    }
    await writeDraftBlock(design, root, { goal, from });
    const baked = await runChaseBake({ chase: design, mode: "draft" }, { ...ctx, cwd: root });
    if (baked.verdict === "fail" || baked.result === undefined) return { ...baked, result: NONE };
    ctx.signal.throwIfAborted();

    writeFileSync(path.join(design, "package.json"), pkg);
    cpSync(design, dir, { recursive: true });
    const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => statSync(path.join(dir, f)).isFile()).map(posix).sort();
    const page = path.join(dir, path.basename(baked.result.file));
    const bytes = readFileSync(page);
    return {
      ...baked, stage: "done",
      result: { dir: posix(dir), files, page: { file: posix(page), bytes: bytes.length, hash: sha256Hex(bytes) as Hash }, ...(match === undefined ? {} : { match }) },
    };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
