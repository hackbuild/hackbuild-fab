// chase.patch (M10-T05 steps 2 to 4, D-115, D-006; group author). Edits a
// design's chase.ts through anchors and pointers (packages/chase patch.ts),
// or replaces its build.ts whole under an ifDefHash guard, on branch
// hbf/<chase>. The writer checks out the branch, or creates it from HEAD
// once the patch validates, writes, stages the file and appends one line to
// .hbf/patches.jsonl at the repository top with the inverse edits and the
// defHash before and after. It never commits; the owner asks for commits.
//
// Writes go only to designs/<name> in a git work tree. reference/ holds
// committed goldens and test fixtures are not designs, so a chase there is
// refused (chase.patch) or returned unwritten (arch.apply), and a test can
// never move the branch of the checkout it runs in.
//
// Not done here: param edits (spec PatchEdit param), which wait on the
// ParamPointer resolver; they are E_SCHEMA naming the pointer form.

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildPathProblem, patchChaseSource, readChaseSource, type SourceEdit } from "@hackbuild/chase";
import type { Chase, CommandError, CommandInput, CommandOutput, Hash, PatchEdit } from "@hackbuild/spec";
import type { CoreCtx } from "../ctx.js";
import { cmdError } from "../errors.js";
import { hashOf } from "../jcs.js";
import type { CommandOut } from "../result.js";
import { sourceClosure } from "./build.js";
import { chaseSourceErrors } from "./chase-validate.js";

/** One line of .hbf/patches.jsonl. */
export interface PatchLogLine {
  readonly id: string;
  readonly chase: string;
  /** Path relative to the repository top, forward slashes. */
  readonly file: string;
  readonly edits: readonly PatchEdit[];
  /** Edits that restore the previous text, in the order to apply them. */
  readonly inverse: readonly PatchEdit[];
  readonly defHashBefore: Hash;
  readonly defHashAfter: Hash;
  /** The id of the entry this patch undoes (its edits equal that entry's inverse), else null. */
  readonly revert: string | null;
}

export interface PatchWrite {
  readonly edits: number;
  readonly branch: string;
  readonly defHashBefore: Hash;
  readonly defHash: Hash;
  readonly line: PatchLogLine;
}

/** Why a patch was not written: a refusal before any write. */
export interface PatchRefusal {
  readonly errors: readonly CommandError[];
}

const posix = (p: string): string => p.split(path.sep).join("/");

export function git(top: string, args: readonly string[]): string {
  return execFileSync("git", args, { cwd: top, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function tryGit(top: string, args: readonly string[]): string | undefined {
  try {
    return git(top, args);
  } catch {
    return undefined;
  }
}

/**
 * defHash of a design as loadDesign computes it (D-178): the chase value
 * and the source closure of its build module. A build module that does
 * not resolve contributes no sources.
 */
export function designDefHash(dir: string, chase: Chase): Hash {
  const file = buildPathProblem(chase.build.module) === undefined ? path.resolve(dir, chase.build.module) : undefined;
  const sources = file !== undefined && existsSync(file) && statSync(file).isFile() ? sourceClosure([file], dir) : [];
  return hashOf({ chase, sources });
}

/** The repository top and the design path in it, or why the directory takes no writes. */
export function writeTarget(dir: string): { readonly top: string; readonly rel: string } | { readonly reason: string } {
  const top = tryGit(dir, ["rev-parse", "--show-toplevel"]);
  if (top === undefined || top === "") return { reason: `${dir} is not in a git work tree` };
  const rel = posix(path.relative(realpathSync(top), realpathSync(dir)));
  if (!/^designs\/[^/]+$/.test(rel)) return { reason: `${rel} is not a design directory designs/<name>` };
  return { top: realpathSync(top), rel };
}

const refuse = (e: Omit<CommandError, "record"> & { readonly record?: string }): PatchRefusal => ({ errors: [{ record: "chase-patch/write", ...e }] });

/** git checkout -q args in top; a failure is the refusal naming the branch and git's first line (D-478). */
export function checkoutBranch(top: string, branch: string, args: readonly string[], record = "chase-patch/write"): PatchRefusal | undefined {
  try {
    git(top, ["checkout", "-q", ...args]);
    return undefined;
  } catch (e) {
    const msg = (e as { stderr?: string }).stderr?.split("\n").find((l) => l.trim() !== "") ?? String(e);
    return refuse({ code: "E_REF", path: "/file", got: branch, expected: `a work tree git can switch to ${branch}`, hint: `git could not check out ${branch}: ${msg.trim()}; resolve the work tree and run again`, record });
  }
}

/**
 * Apply edits to the chase.ts or build.ts in dir on branch hbf/<chase>.
 * An edit that cannot apply throws its CommandError; a refusal to write
 * (no work tree, not a design, a branch git cannot check out, an error the
 * patch adds) comes back as PatchRefusal with nothing written.
 */
export async function writeChasePatch(ctx: CoreCtx, dir: string, file: "chase.ts" | "build.ts", edits: readonly PatchEdit[], opts: { readonly addMembers?: boolean } = {}): Promise<PatchWrite | PatchRefusal> {
  const target = writeTarget(dir);
  if ("reason" in target) {
    return refuse({ code: "E_REF", path: "/file", got: dir, expected: "a chase.ts or build.ts under designs/<name> in a git work tree", hint: `${target.reason}; chase.patch writes designs only, copy a reference with chase.scaffold --from` });
  }
  const { top, rel } = target;
  const chaseFile = path.join(dir, "chase.ts");
  const id = readChaseSource(readFileSync(chaseFile, "utf8"), `${rel}/chase.ts`).chase.meta.id;
  const branch = `hbf/${id}`;
  const current = tryGit(top, ["symbolic-ref", "--short", "-q", "HEAD"]);
  const exists = tryGit(top, ["rev-parse", "--verify", "-q", `refs/heads/${branch}`]) !== undefined;
  const checkout = (args: readonly string[]): PatchRefusal | undefined => checkoutBranch(top, branch, args);
  // An existing branch holds the text the edits apply to, so switch first.
  if (exists && current !== branch) {
    const r = checkout([branch]);
    if (r !== undefined) return r;
  }
  const chaseText = readFileSync(chaseFile, "utf8");
  const chaseBefore = readChaseSource(chaseText, `${rel}/chase.ts`).chase;
  const defHashBefore = designDefHash(dir, chaseBefore);
  const filePath = path.join(dir, file);
  let next: string;
  let inverse: (defHashAfter: Hash) => readonly PatchEdit[];
  if (file === "chase.ts") {
    const validate = await chaseSourceErrors(ctx, dir);
    const out = patchChaseSource(chaseText, `${rel}/chase.ts`, edits, { validate, ...(opts.addMembers === true ? { addMembers: true } : {}) });
    if (!out.ok) return { errors: out.errors };
    next = out.plan.source;
    const back: readonly SourceEdit[] = out.plan.inverse;
    inverse = () => back;
  } else {
    const e = edits[0];
    if (edits.length !== 1 || e === undefined || !("replaceWhole" in e)) {
      throw cmdError({ code: "E_SCHEMA", path: "/edits", got: edits.length, expected: "one replaceWhole edit for build.ts", hint: "edit build.ts with one replaceWhole edit and ifDefHash; edit chase.ts with anchors and pointers" });
    }
    if (e.ifDefHash !== defHashBefore) {
      throw cmdError({ code: "E_STALE", path: "/edits/0/ifDefHash", got: e.ifDefHash, expected: defHashBefore, hint: "the design moved since you read it; read build.ts again and pass the defHash it has now" });
    }
    const was = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
    next = e.replaceWhole;
    inverse = (after) => [{ replaceWhole: was, ifDefHash: after }];
  }
  if (!exists) {
    const r = checkout(["-b", branch]);
    if (r !== undefined) return r;
  }
  writeFileSync(filePath, next);
  git(top, ["add", "--", path.relative(top, realpathSync(filePath))]);
  const defHash = designDefHash(dir, readChaseSource(readFileSync(chaseFile, "utf8"), `${rel}/chase.ts`).chase);
  const line = appendLog(top, { chase: id, file: `${rel}/${file}`, edits, inverse: inverse(defHash), defHashBefore, defHashAfter: defHash });
  return { edits: edits.length, branch, defHashBefore, defHash, line };
}

/** Append one entry to .hbf/patches.jsonl; the id counts entries so a repeated patch gets its own. */
function appendLog(top: string, entry: Omit<PatchLogLine, "id" | "revert">): PatchLogLine {
  const dir = path.join(top, ".hbf");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "patches.jsonl");
  const prior = existsSync(file) ? readFileSync(file, "utf8").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l) as PatchLogLine) : [];
  const undone = [...prior].reverse().find((p) => p.chase === entry.chase && p.file === entry.file && JSON.stringify(p.inverse) === JSON.stringify(entry.edits));
  const id = hashOf({ n: prior.length, ...entry }).slice(0, 12);
  const line: PatchLogLine = { id, ...entry, revert: undone?.id ?? null };
  appendFileSync(file, `${JSON.stringify(line)}\n`);
  return line;
}

/** The design directory and file a chase.patch `file` names: a chase.ts, a build.ts, or a directory holding chase.ts. */
function fileOf(cwd: string, file: string): { readonly dir: string; readonly name: "chase.ts" | "build.ts" } {
  const abs = path.resolve(cwd, file);
  if (existsSync(abs) && statSync(abs).isDirectory() && existsSync(path.join(abs, "chase.ts"))) return { dir: abs, name: "chase.ts" };
  const base = path.basename(abs);
  if ((base === "chase.ts" || base === "build.ts") && existsSync(path.join(path.dirname(abs), "chase.ts"))) return { dir: path.dirname(abs), name: base };
  throw cmdError({ code: "E_REF", path: "/file", got: file, expected: "a chase.ts or build.ts beside a chase.ts, or a design directory", hint: "name designs/<name>/chase.ts or designs/<name>/build.ts" });
}

export async function runChasePatch(input: CommandInput<"chase.patch">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"chase.patch">>> {
  const { dir, name } = fileOf(ctx.cwd, input.file);
  if (input.edits.length === 0) throw cmdError({ code: "E_SCHEMA", path: "/edits", got: 0, expected: "at least one edit", hint: "pass an edit: --anchor and --replace, or --pointer and --set" });
  const w = await writeChasePatch(ctx, dir, name, input.edits);
  if ("errors" in w) {
    return {
      verdict: "fail", stage: "input", inputsHash: ctx.inputsHash,
      findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: w.errors, artifacts: [], next: [],
      result: { edits: 0, branch: "", defHashBefore: "" as Hash, defHash: "" as Hash },
    };
  }
  return {
    verdict: "pass", stage: "done", inputsHash: ctx.inputsHash,
    findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [], artifacts: [], next: [],
    result: { edits: w.edits, branch: w.branch, defHashBefore: w.defHashBefore, defHash: w.defHash },
  };
}
