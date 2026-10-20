// chase.scaffold (M10-T05 step 1, D-115, D-006; group author). Starts a
// design at designs/<name> on branch hbf/<name>: without `from` the kind's
// minimal chase, build and bench (packages/chase scaffold); with
// `from: reference:<area>/<id>`, `reference:<meta.id>`, `design:<id>` or
// `draft:<dir>` a copy of that chase, its build closure and its bench,
// with meta.id set to the name and meta.derivedFrom {id, buildHash} from
// the source's expected/build.json golden when it has one. A numeric
// default with a registered constraintDim moves inside the interval the
// solver gives from the profile alone (generate from legal); a dim that
// needs facts only a build gives keeps the source default.
//
// The files are validated as chase.validate does before any write; a
// minimal scaffold must give 0 errors and a copy may add none to its
// source's. Branch handling follows chase.patch (D-478): an existing
// hbf/<name> is checked out first, a new one is created from HEAD once
// the files validate. The files are staged, never committed.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SCAFFOLDS, allFields, benchSource, buildPathProblem, copyEdits, fieldUnit, hasScaffold, isNumeric, legalDefault, patchChaseSource, readChaseSource, retarget,
} from "@hackbuild/chase";
import { solve } from "@hackbuild/constraints";
import { createProfileLookup } from "@hackbuild/profile";
import { CHASE_ID_PATTERN, type Chase, type CommandError, type CommandInput, type CommandOutput, type ConstraintDim, type PatchEdit } from "@hackbuild/spec";
import { designDirs, designsByChaseId } from "../artifact-rebuild.js";
import type { CoreCtx } from "../ctx.js";
import { cmdError, didYouMean } from "../errors.js";
import { fullProfile } from "../load-build.js";
import type { CommandOut } from "../result.js";
import { sourceClosure, workspaceRoot } from "./build.js";
import { checkoutBranch, git, tryGit } from "./chase-patch.js";
import { chaseSourceErrors } from "./chase-validate.js";
import { DEFAULT_MACHINE, constraintRegistry } from "./constraints-query.js";

type Output = CommandOutput<"chase.scaffold">;

const posix = (p: string): string => p.split(path.sep).join("/");

/** A design to copy: its directory, a label for messages and the golden build hash when it has one. */
interface Source {
  readonly dir: string;
  readonly label: string;
  readonly buildHash: string | undefined;
}

const hasChase = (dir: string): boolean => existsSync(path.join(dir, "chase.ts")) && statSync(path.join(dir, "chase.ts")).isFile();

/** buildHash of dir/expected/build.json, the golden parity writes; undefined when there is none. */
function goldenHash(dir: string): string | undefined {
  const f = path.join(dir, "expected", "build.json");
  if (!existsSync(f)) return undefined;
  const h = (JSON.parse(readFileSync(f, "utf8")) as { buildHash?: unknown }).buildHash;
  return typeof h === "string" && h !== "" ? h : undefined;
}

/** The forms `from` takes, for the E_REF didYouMean list. */
function fromForms(root: string): string[] {
  return designDirs(root).map((rel) => (rel.startsWith("reference/") ? `reference:${rel.slice("reference/".length)}` : `design:${rel.slice("designs/".length)}`));
}

/** The source a `from` names, or E_REF with the nearest forms. */
function resolveFrom(from: string, root: string, top: string, cwd: string): Source {
  const miss = (hint: string): never => {
    throw cmdError({ code: "E_REF", path: "/from", got: from, expected: "reference:<area>/<id>, reference:<meta.id>, design:<id> or draft:<dir>", didYouMean: didYouMean(from, fromForms(root)), hint });
  };
  const cut = from.indexOf(":");
  const scheme = cut < 0 ? "" : from.slice(0, cut);
  const id = cut < 0 ? "" : from.slice(cut + 1);
  if (id === "" || id.split("/").includes("..")) return miss("name a reference, design or draft after the scheme");
  if (scheme === "reference") {
    const direct = path.join(root, "reference", id);
    if (id.includes("/") && hasChase(direct)) return { dir: direct, label: `reference/${id}`, buildHash: goldenHash(direct) };
    const hits = designsByChaseId(root, id).filter((r) => r.startsWith("reference/"));
    if (hits.length === 1) return { dir: path.join(root, hits[0]!), label: hits[0]!, buildHash: goldenHash(path.join(root, hits[0]!)) };
    return miss(hits.length > 1 ? `meta.id ${id} names ${hits.join(" and ")}; name reference:<area>/<id>` : `no reference holds ${id}`);
  }
  if (scheme === "design") {
    for (const base of [top, root]) {
      const dir = path.join(base, "designs", id);
      if (hasChase(dir)) return { dir, label: `designs/${id}`, buildHash: goldenHash(dir) };
    }
    const hits = designsByChaseId(root, id).filter((r) => r.startsWith("designs/"));
    if (hits.length === 1) return { dir: path.join(root, hits[0]!), label: hits[0]!, buildHash: goldenHash(path.join(root, hits[0]!)) };
    return miss(`no design under designs/ is ${id}`);
  }
  if (scheme === "draft") {
    // A draft has no golden; adopt stores its last export as one (R1-engine-25).
    for (const dir of [path.resolve(cwd, id), path.join(top, ".hbf", "drafts", id)]) if (hasChase(dir)) return { dir, label: posix(path.relative(top, dir)), buildHash: undefined };
    return miss(`no chase.ts in ${id} or .hbf/drafts/${id}`);
  }
  return miss(`${scheme === "" ? "no scheme" : `unknown scheme ${scheme}`}; start from with reference:, design: or draft:`);
}

/** The files of a copy, by path in the design: the build closure inside the source and bench.ts; chase.ts comes back separately. */
function copiedFiles(src: Source, chase: Chase): Map<string, string> {
  const out = new Map<string, string>();
  if (buildPathProblem(chase.build.module) === undefined) {
    const entry = path.resolve(src.dir, chase.build.module);
    if (existsSync(entry) && statSync(entry).isFile()) {
      for (const f of sourceClosure([entry], src.dir)) {
        if (f.path.startsWith("../") || f.path === "chase.ts") continue;
        out.set(f.path, readFileSync(path.join(src.dir, f.path), "utf8"));
      }
    }
  }
  const bench = path.join(src.dir, "bench.ts");
  if (existsSync(bench)) out.set("bench.ts", readFileSync(bench, "utf8"));
  return out;
}

/** Pointer edits that move each numeric default with a registered constraintDim inside the solver's interval. */
function legalDefaultEdits(chase: Chase): PatchEdit[] {
  const reg = constraintRegistry();
  const material = chase.materials[0]?.material ?? "";
  const machine = chase.meta.machines[0] ?? DEFAULT_MACHINE;
  const edits: PatchEdit[] = [];
  for (const [f, pointer] of allFields(chase)) {
    if (!isNumeric(f) || f.constraintDim === undefined || pointer.includes("/readouts/")) continue;
    const dim = f.constraintDim as ConstraintDim;
    if (reg.defsFor(dim).length === 0) continue;
    let legal: readonly [number | null, number | null] | null;
    let unit: string;
    try {
      const profile = createProfileLookup(fullProfile());
      const r = solve(reg, dim, { profile, machine, material, facts: {} });
      legal = r.unsat === null ? r.interval.legal : null;
      unit = r.interval.unit;
    } catch {
      // The dim needs a fact only a build gives (a pitch, a part); the source default stands.
      continue;
    }
    const v = legalDefault(f, legal, unit);
    if (v !== undefined && fieldUnit(f) !== undefined) edits.push({ pointer: `${pointer}/default`, set: v });
  }
  return edits;
}

interface Plan {
  readonly files: ReadonlyMap<string, string>;
}

/** The files to write, validated in a scratch directory; a refusal lists the errors. */
async function plan(ctx: CoreCtx, input: CommandInput<"chase.scaffold">, root: string, top: string): Promise<Plan | { readonly errors: readonly CommandError[] }> {
  const { kind, name } = input;
  const target = `designs/${name}`;
  let files: Map<string, string>;
  let chaseFrom: { readonly text: string; readonly label: string; readonly edits: readonly PatchEdit[] } | undefined;
  if (input.from === undefined) {
    if (!hasScaffold(kind)) {
      throw cmdError({
        code: "E_SCHEMA", path: "/kind", got: kind, expected: Object.keys(SCAFFOLDS).join(" or "),
        hint: `no minimal ${kind} scaffold yet (surface and machine wait for release 2); start from one with --from reference:<area>/<id>`,
      });
    }
    files = new Map(Object.entries(SCAFFOLDS[kind](name)));
  } else {
    const src = resolveFrom(input.from, root, top, ctx.cwd);
    const text = readFileSync(path.join(src.dir, "chase.ts"), "utf8");
    const chase = readChaseSource(text, `${src.label}/chase.ts`).chase;
    if (chase.meta.kind !== kind) {
      throw cmdError({ code: "E_SCHEMA", path: "/kind", got: kind, expected: chase.meta.kind, hint: `${src.label} is a ${chase.meta.kind} chase; pass --kind ${chase.meta.kind}` });
    }
    files = new Map([...copiedFiles(src, chase)].map(([f, t]) => [f, retarget(t, `${src.label}/${f}`, `${target}/${f}`)]));
    if (!files.has("bench.ts")) files.set("bench.ts", benchSource(name, chase.params));
    const derivedFrom = src.buildHash === undefined ? undefined : { id: chase.meta.id, buildHash: src.buildHash };
    chaseFrom = { text: retarget(text, `${src.label}/chase.ts`, `${target}/chase.ts`), label: src.label, edits: [...copyEdits(name, derivedFrom), ...legalDefaultEdits(chase)] };
  }
  const scratch = mkdtempSync(path.join(os.tmpdir(), "hbf-scaffold-"));
  try {
    for (const [f, t] of files) {
      if (f === "chase.ts") continue;
      mkdirSync(path.dirname(path.join(scratch, f)), { recursive: true });
      writeFileSync(path.join(scratch, f), t);
    }
    const validate = await chaseSourceErrors(ctx, scratch);
    if (chaseFrom === undefined) {
      const errors = validate(files.get("chase.ts")!);
      return errors.length > 0 ? { errors } : { files };
    }
    const out = patchChaseSource(chaseFrom.text, `${target}/chase.ts`, chaseFrom.edits, { validate, addMembers: true });
    if (!out.ok) return { errors: out.errors };
    files.set("chase.ts", out.plan.source);
    return { files };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const refused = (ctx: CoreCtx, errors: readonly CommandError[]): CommandOut<Output> => ({
  verdict: "fail", stage: "input", inputsHash: ctx.inputsHash,
  findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors, artifacts: [], next: [],
  result: { chaseTs: "", buildTs: "", benchTs: "", files: [] },
});

export async function runChaseScaffold(input: CommandInput<"chase.scaffold">, ctx: CoreCtx): Promise<CommandOut<Output>> {
  const { name } = input;
  if (!CHASE_ID_PATTERN.test(name)) {
    throw cmdError({ code: "E_SCHEMA", path: "/name", got: name, expected: "a lowercase slug, letters and digits joined by single hyphens", hint: "name the design like scratch-pad; it becomes meta.id and designs/<name>" });
  }
  const root = workspaceRoot(ctx.workspace);
  const found = tryGit(ctx.cwd, ["rev-parse", "--show-toplevel"]);
  if (found === undefined || found === "") {
    throw cmdError({ code: "E_REF", path: "/name", got: ctx.cwd, expected: "a directory in a git work tree", hint: "chase.scaffold writes designs/<name> on branch hbf/<name>; run it inside the repository" });
  }
  const top = realpathSync(found);
  const dir = path.join(top, "designs", name);
  const branch = `hbf/${name}`;
  const exists = tryGit(top, ["rev-parse", "--verify", "-q", `refs/heads/${branch}`]) !== undefined;
  if (existsSync(dir) || (exists && tryGit(top, ["cat-file", "-e", `${branch}:designs/${name}`]) !== undefined)) {
    throw cmdError({ code: "E_SCHEMA", path: "/name", got: name, expected: "a name no design holds", hint: `designs/${name} exists; pick another name, or edit it with chase.patch` });
  }
  const record = "chase-scaffold/write";
  if (exists && tryGit(top, ["symbolic-ref", "--short", "-q", "HEAD"]) !== branch) {
    const r = checkoutBranch(top, branch, [branch], record);
    if (r !== undefined) return refused(ctx, r.errors);
  }
  const p = await plan(ctx, input, root, top);
  if ("errors" in p) return refused(ctx, p.errors);
  if (!exists) {
    const r = checkoutBranch(top, branch, ["-b", branch], record);
    if (r !== undefined) return refused(ctx, r.errors);
  }
  const written: string[] = [];
  for (const [f, t] of [...p.files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const abs = path.join(dir, f);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, t);
    written.push(posix(path.relative(top, abs)));
  }
  git(top, ["add", "--", ...written]);
  return {
    verdict: "pass", stage: "done", inputsHash: ctx.inputsHash,
    findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [], artifacts: [], next: [],
    result: { chaseTs: p.files.get("chase.ts")!, buildTs: p.files.get("build.ts") ?? "", benchTs: p.files.get("bench.ts")!, files: written },
  };
}
