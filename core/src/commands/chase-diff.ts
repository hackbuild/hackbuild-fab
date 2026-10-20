// chase.diff (M10-T04 step 4; group author). Reads the chase in a design
// directory and the one `against` names, a chase.ts path (or the directory
// holding one) or a git ref (HEAD when absent), both as data (D-178).
// packages/chase diffChase migrates both and lists the changes by JSON
// pointer with the migration lines of each side. defHash is the one
// loadDesign computes: a file side with its build module beside it is its
// own design; a file side without one, and a git ref, take the build
// module of the chase directory, the ref with each source as the ref holds
// it. With build true both sides build at their chase defaults and
// verdictChanges lists each check result whose verdict moved, from the
// parity edit comparison (parity.ts verdictPairs). Writes nothing.
//
// A git ref whose build sources differ from the work tree is not built:
// the old build.ts is not on disk, and building the ref's chase with the
// new one would report verdicts no commit ever had. That call is E_STALE
// naming the moved files; without build it diffs as usual.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { diffChase, readChaseSource } from "@hackbuild/chase";
import { sha256Hex, type Chase, type ChaseVerdictChange, type CommandInput, type CommandOutput, type Hash } from "@hackbuild/spec";
import type { CoreCtx } from "../ctx.js";
import { cmdError } from "../errors.js";
import { hashOf } from "../jcs.js";
import type { CommandOut } from "../result.js";
import { buildPart, defParts, loadDesign, resolveParams, workspaceRoot, type Design } from "./build.js";
import { chaseDir } from "./chase-validate.js";
import { verdictPairs } from "./parity.js";

const posix = (p: string): string => p.split(path.sep).join("/");

function git(cwd: string, args: readonly string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return undefined;
  }
}

/** The against side: its chase as read, its defHash, and the design that builds it or why none can. */
interface Side {
  readonly chase: Chase;
  readonly defHash: Hash;
  readonly design: () => Promise<Design>;
  readonly unbuildable?: string;
}

async function fileSide(abs: string, root: string, cwd: string, chaseDirAbs: string): Promise<Side> {
  const file = statSync(abs).isDirectory() ? path.join(abs, "chase.ts") : abs;
  if (!existsSync(file)) {
    throw cmdError({ code: "E_REF", path: "/against", got: posix(path.relative(root, abs)), expected: "a chase.ts, a directory holding one, or a git ref", hint: "name the chase file to compare with, or a commit such as HEAD~1" });
  }
  const chase = readChaseSource(readFileSync(file, "utf8"), posix(path.relative(root, file))).chase;
  const own = path.dirname(file);
  const home = existsSync(path.resolve(own, chase.build.module)) ? own : chaseDirAbs;
  const design = await loadDesign(home, cwd, { chase });
  return { chase, defHash: design.defHash, design: () => Promise.resolve(design) };
}

async function refSide(ref: string, cwd: string, dir: string, current: Design): Promise<Side> {
  const top = git(dir, ["rev-parse", "--show-toplevel"])?.trim();
  if (top === undefined || top === "") {
    throw cmdError({ code: "E_REF", path: "/against", got: ref, expected: "a chase.ts path, or a git ref in the work tree holding the chase", hint: `${posix(dir)} is not in a git work tree; pass --against a chase.ts file` });
  }
  // A leading dash would reach git as an option.
  const sha = ref.startsWith("-") ? undefined : git(top, ["rev-parse", "--verify", "-q", `${ref}^{commit}`])?.trim();
  if (sha === undefined || sha === "") {
    throw cmdError({ code: "E_REF", path: "/against", got: ref, expected: "an existing file or a git ref", hint: "name a chase.ts file or a commit such as HEAD or HEAD~1" });
  }
  const relDir = posix(path.relative(realpathSync(top), realpathSync(dir)));
  const blob = (p: string): string | undefined => git(top, ["show", `${sha}:${path.posix.normalize(`${relDir}/${p}`)}`]);
  const text = blob("chase.ts");
  if (text === undefined) {
    throw cmdError({ code: "E_REF", path: "/against", got: ref, expected: `${relDir}/chase.ts at ${ref}`, hint: `the chase is not in ${ref}; name an older chase.ts file or a commit that holds it` });
  }
  const chase = readChaseSource(text, `${ref}:${relDir}/chase.ts`).chase;
  const now = defParts(current).sources;
  const sources = now.flatMap((s) => {
    const b = blob(s.path);
    return b === undefined ? [] : [{ path: s.path, sha256: sha256Hex(new TextEncoder().encode(b)) }];
  });
  const moved = now.filter((s) => !sources.some((r) => r.path === s.path && r.sha256 === s.sha256)).map((s) => s.path);
  return {
    chase, defHash: hashOf({ chase, sources }),
    design: () => loadDesign(dir, cwd, { chase }),
    ...(moved.length === 0 ? {} : { unbuildable: `${moved.join(", ")} at ${ref} differ from the work tree` }),
  };
}

export async function runChaseDiff(input: CommandInput<"chase.diff">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"chase.diff">>> {
  const root = workspaceRoot(ctx.workspace);
  const dir = chaseDir(root, ctx.cwd, input.chase);
  const current = await loadDesign(dir, ctx.cwd);
  const against = input.against ?? "HEAD";
  const abs = path.resolve(ctx.cwd, against);
  const side = existsSync(abs) ? await fileSide(abs, root, ctx.cwd, dir) : await refSide(against, ctx.cwd, dir, current);
  const d = diffChase(side.chase, current.chase);

  let verdictChanges: ChaseVerdictChange[] | null = null;
  if (input.build === true) {
    if (side.unbuildable !== undefined) {
      throw cmdError({ code: "E_STALE", path: "/against", got: against, expected: "build sources equal to the work tree's", hint: `${side.unbuildable}; check out ${against} to build it, or diff without --build` });
    }
    const before = await side.design();
    const a = await buildPart(before, resolveParams(before.chase, undefined, undefined));
    const b = await buildPart(current, resolveParams(current.chase, undefined, undefined));
    const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
    verdictChanges = (await verdictPairs(a, b)).map(({ before: was, after: r }) => ({
      check: r.id, target: r.target, from: was.verdict, to: r.verdict, measuredFrom: num(was.measured), measuredTo: num(r.measured),
    }));
  }
  return {
    verdict: "pass", stage: "done", inputsHash: ctx.inputsHash,
    findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [], artifacts: [], next: [],
    result: {
      changes: d.changes, migrations: d.migrations,
      defHashBefore: side.defHash, defHashAfter: current.defHash, verdictChanges,
    },
  };
}
