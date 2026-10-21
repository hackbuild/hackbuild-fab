// hbf init (plan v9 2 and 6 engine, R1-engine-23; group author, CLI only
// until the F4 decision). Starts a maker folder outside the repository:
// <cwd>/<name> by default, or --dir. It holds chase.ts, build.ts, the rest
// of the build closure and bench.ts, copied from `from` the way
// chase.scaffold copies a source (meta.id set to the name, meta.derivedFrom
// from the source golden when it has one), a package.json that pins
// @hackbuild/kernel and every @hackbuild package the copied files import to
// this workspace, and <name>.html baked by chase.bake. A folder that holds
// files is refused with E_EXISTS, and a source with open chase.validate
// errors is refused with those errors; nothing is written either way.
//
// The bake runs on a copy under <workspace>/.hbf/init/ (gitignored): the
// baker resolves bare and npm: imports from the design folder upward, and
// the maker folder has no node_modules. The page is written into the maker
// folder only after the bake passes, and its hash is read back from there.

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readChaseSource } from "@hackbuild/chase";
import { CHASE_ID_PATTERN, sha256Hex, type ChaseKind, type CommandError, type CommandInput, type CommandOutput, type Hash } from "@hackbuild/spec";
import type { CoreCtx } from "../ctx.js";
import { cmdError } from "../errors.js";
import type { CommandOut } from "../result.js";
import { workspaceRoot } from "./build.js";
import { runChaseBake } from "./chase-bake.js";
import { plan, resolveFrom } from "./chase-scaffold.js";
import { tryGit } from "./chase-patch.js";
import { chaseSourceErrors } from "./chase-validate.js";
import { fromForm } from "./draft.js";

type Output = CommandOutput<"init">;

const posix = (p: string): string => p.split(path.sep).join("/");

/** Where the staging copies live, under the workspace; .hbf/ is gitignored. */
export const INIT_STAGE = ".hbf/init";

const IMPORT = /\bfrom\s+["'](@hackbuild\/[a-z0-9-]+)(?:\/[^"']*)?["']/g;

/**
 * The package.json of a maker folder: @hackbuild/kernel and every
 * @hackbuild package the files import, each pinned to its folder in this
 * workspace as a file: dependency, sorted by name.
 */
export function makerPackage(name: string, files: ReadonlyMap<string, string>, root: string): string {
  const wanted = new Set(["@hackbuild/kernel"]);
  for (const text of files.values()) for (const m of text.matchAll(IMPORT)) wanted.add(m[1]!);
  const dependencies: Record<string, string> = {};
  for (const pkg of [...wanted].sort()) {
    const link = path.join(root, "node_modules", ...pkg.split("/"));
    if (!existsSync(path.join(link, "package.json"))) {
      throw cmdError({ code: "E_REF", path: "/from", got: pkg, expected: "a package of this workspace", hint: `${pkg} is not installed in ${posix(root)}; run npm ci there` });
    }
    dependencies[pkg] = `file:${posix(realpathSync(link))}`;
  }
  return `${JSON.stringify({ name, version: "0.0.0", private: true, type: "module", dependencies }, null, 2)}\n`;
}

const NONE: Output = { dir: "", files: [], page: { file: "", bytes: 0, hash: "" as Hash } };

const refused = (ctx: CoreCtx, errors: readonly CommandError[]): CommandOut<Output> => ({
  verdict: "fail", stage: "input", inputsHash: ctx.inputsHash,
  findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors, artifacts: [], next: [], result: NONE,
});

export async function runInit(input: CommandInput<"init">, ctx: CoreCtx): Promise<CommandOut<Output>> {
  const { name } = input;
  if (!CHASE_ID_PATTERN.test(name)) {
    throw cmdError({ code: "E_SCHEMA", path: "/name", got: name, expected: "a lowercase slug, letters and digits joined by single hyphens", hint: "name the folder like stick; it becomes meta.id and <name>.html" });
  }
  const dir = path.resolve(ctx.cwd, input.dir ?? name);
  if (existsSync(dir) && readdirSync(dir).length > 0) {
    throw cmdError({ code: "E_EXISTS", path: input.dir === undefined ? "/name" : "/dir", got: posix(dir), expected: "an absent or empty folder", hint: `${posix(dir)} holds files; pick another name or --dir, nothing was written` });
  }
  const root = workspaceRoot(ctx.workspace);
  const found = tryGit(ctx.cwd, ["rev-parse", "--show-toplevel"]);
  const top = found === undefined || found === "" ? realpathSync(ctx.cwd) : realpathSync(found);

  let kind: ChaseKind = "single";
  let from: string | undefined;
  if (input.from !== undefined) {
    from = fromForm(input.from, root, top, ctx.cwd);
    const src = resolveFrom(from, root, top, ctx.cwd);
    const text = readFileSync(path.join(src.dir, "chase.ts"), "utf8");
    kind = readChaseSource(text, `${src.label}/chase.ts`).chase.meta.kind;
    const open = (await chaseSourceErrors(ctx, src.dir))(text);
    if (open.length > 0) return refused(ctx, open);
  }
  const p = await plan(ctx, { kind, name, ...(from === undefined ? {} : { from }) }, root, top, name);
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
    const baked = await runChaseBake({ chase: design }, { ...ctx, cwd: root, cli: { ...ctx.cli, out: path.join(stage, "out") } });
    if (baked.verdict !== "pass" || baked.result === undefined) return { ...baked, result: NONE };
    ctx.signal.throwIfAborted();

    const written = [...p.files.keys(), "package.json", `${name}.html`].sort();
    for (const [f, t] of p.files) {
      mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      writeFileSync(path.join(dir, f), t);
    }
    writeFileSync(path.join(dir, "package.json"), pkg);
    const page = path.join(dir, `${name}.html`);
    copyFileSync(path.resolve(root, baked.result.file), page);
    const bytes = readFileSync(page);
    return {
      ...baked, stage: "done",
      result: { dir: posix(dir), files: written, page: { file: posix(page), bytes: bytes.length, hash: sha256Hex(bytes) as Hash } },
    };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
