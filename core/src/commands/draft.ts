// hbf draft (plan v9 3.1, R1-engine-24; group make, CLI only until the
// F4 decision). One turn from an idea to a page: it writes
// .hbf/drafts/<name>/ under the git top of the cwd (the cwd outside a work
// tree) with chase.ts, build.ts and bench.ts, copied from `from` the way
// chase.scaffold copies a source (meta.id set to the name) or the minimal
// single scaffold without one, then bakes it with chase.bake mode draft:
// draft.json carries the sources into the page, checks show as warnings,
// the status strip shows the DRAFT banner and every export carries DRAFT.
// A widget.ts written into the directory later rides along on the next
// bake. Nothing is staged or committed; .hbf/ is gitignored.

import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readChaseSource } from "@hackbuild/chase";
import { CHASE_ID_PATTERN, DRAFTS_DIR, type ChaseKind, type CommandInput, type CommandOutput } from "@hackbuild/spec";
import type { CoreCtx } from "../ctx.js";
import { writeDraftBlock } from "../draft-block.js";
import { cmdError } from "../errors.js";
import { slugOf } from "../exporters/names.js";
import type { CommandOut } from "../result.js";
import { workspaceRoot } from "./build.js";
import { runChaseBake } from "./chase-bake.js";
import { plan, resolveFrom } from "./chase-scaffold.js";
import { tryGit } from "./chase-patch.js";

type Output = CommandOutput<"draft">;

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

const refused = (ctx: CoreCtx, errors: CommandOut<Output>["errors"]): CommandOut<Output> => ({
  verdict: "fail", stage: "input", inputsHash: ctx.inputsHash,
  findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors, artifacts: [], next: [],
  result: { dir: "", files: [], page: { file: "", bytes: 0, hash: "" as Output["page"]["hash"] } },
});

export async function runDraft(input: CommandInput<"draft">, ctx: CoreCtx): Promise<CommandOut<Output>> {
  const goal = input.goal.trim();
  if (goal === "") throw cmdError({ code: "E_SCHEMA", path: "/goal", got: input.goal, expected: "a goal in words", hint: "say what the draft is for, for example hbf draft \"access switch\"" });
  const name = input.name ?? nameOfGoal(goal);
  if (!CHASE_ID_PATTERN.test(name)) {
    throw cmdError({ code: "E_SCHEMA", path: input.name === undefined ? "/goal" : "/name", got: name, expected: "a lowercase slug, letters and digits joined by single hyphens", hint: "name the draft with --name, like access-switch" });
  }
  const root = workspaceRoot(ctx.workspace);
  const found = tryGit(ctx.cwd, ["rev-parse", "--show-toplevel"]);
  const top = found === undefined || found === "" ? realpathSync(ctx.cwd) : realpathSync(found);
  const rel = `${DRAFTS_DIR}/${name}`;
  const dir = path.join(top, ...rel.split("/"));
  if (existsSync(dir) && readdirSync(dir).length > 0) {
    throw cmdError({ code: "E_SCHEMA", path: input.name === undefined ? "/goal" : "/name", got: name, expected: "a name no draft holds", hint: `${rel} exists; pick another --name, or edit that draft and bake it with hbf chase.bake ${rel} --mode draft` });
  }

  let kind: ChaseKind = "single";
  let from: string | undefined;
  if (input.from !== undefined) {
    from = fromForm(input.from, root, top, ctx.cwd);
    const src = resolveFrom(from, root, top, ctx.cwd);
    kind = readChaseSource(readFileSync(path.join(src.dir, "chase.ts"), "utf8"), `${src.label}/chase.ts`).chase.meta.kind;
  }
  const p = await plan(ctx, { kind, name, ...(from === undefined ? {} : { from }) }, root, top, rel);
  if ("errors" in p) return refused(ctx, p.errors);
  ctx.signal.throwIfAborted();

  for (const [f, t] of p.files) {
    const abs = path.join(dir, f);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, t);
  }
  await writeDraftBlock(dir, ctx.cwd, { goal, ...(from === undefined ? {} : { from }) });
  const baked = await runChaseBake({ chase: dir, mode: "draft" }, ctx);
  const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => statSync(path.join(dir, f)).isFile()).map(posix).sort();
  const result: Output = { dir: rel, files, page: baked.result ?? { file: "", bytes: 0, hash: "" as Output["page"]["hash"] } };
  return { ...baked, stage: baked.verdict === "pass" ? "done" : baked.stage, result };
}
