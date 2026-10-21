// chase.bake (M10-T07 step 2, D-129; group make). Bakes a design to one
// offline html page through the M09 baker. tools/bake/from-chase.ts writes
// bake.json, bench.entry.ts and page-build.ts beside chase.ts where they
// are absent; tools/bake/bake.mjs then bakes the manifest, refusing a page
// over its budget (16777216 bytes by default) or one that loads anything
// off the file. Both run as child processes: the baker's vite run must not
// load under core's resolve hook. The page lands in <workspace>/dist (or
// the --out root) under the folder the manifest names, and the result's
// hash is the sha256 of the bytes read back from disk.
//
// A bake is a page, so no ExporterDef.fabrication applies and no gate
// runs; exports made inside the baked bench pass D-109 there. mode draft
// bakes an hbf draft (a directory holding draft.json, R1-engine-24): it
// rewrites draft.json from the files on disk, then tools/bake/draft.ts
// writes the draft's bake.json, bench.entry.ts and page-build.ts, so the
// page carries its sources, shows the banner and marks every export. A
// draft bakes only as a draft and a design never does (E_DRAFT, E_SCHEMA).

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { readChaseSource } from "@hackbuild/chase";
import type { CommandError, CommandInput, CommandOutput, Hash } from "@hackbuild/spec";
import type { CoreCtx } from "../ctx.js";
import { cmdError } from "../errors.js";
import type { CommandOut } from "../result.js";
import { draftOrigin, isDraftDir, writeDraftBlock } from "../draft-block.js";
import { workspaceRoot } from "./build.js";
import { chaseDir } from "./chase-validate.js";

type Output = CommandOutput<"chase.bake">;

const posix = (p: string): string => p.split(path.sep).join("/");

/** How often a running child checks the cancel signal, ms (inferred). */
const POLL_MS = 100;

/** Run node on a script; resolves with exit code, stdout and stderr, kills the child when the signal aborts. */
function node(ctx: CoreCtx, root: string, args: readonly string[]): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...args], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (b: Buffer) => { out += b.toString("utf8"); });
    child.stderr.on("data", (b: Buffer) => { err += b.toString("utf8"); });
    const poll = setInterval(() => { if (ctx.signal.aborted) child.kill("SIGKILL"); }, POLL_MS);
    child.on("error", (e) => { clearInterval(poll); reject(e); });
    child.on("close", (code) => {
      clearInterval(poll);
      if (ctx.signal.aborted) {
        try { ctx.signal.throwIfAborted(); } catch (e) { reject(e); return; }
      }
      resolve({ code: code ?? 1, out, err });
    });
  });
}

/** The record a baker refusal carries: budget, off-file or the catch-all. */
export function bakeRecord(message: string): string {
  if (/legal at most \d+/.test(message)) return "bake/budget";
  if (/off the file|network @import|<script src=>/.test(message)) return "bake/off-file";
  return "bake/refused";
}

const failed = (ctx: CoreCtx, errors: readonly CommandError[]): CommandOut<Output> => ({
  verdict: "fail", stage: "build", inputsHash: ctx.inputsHash,
  findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors, artifacts: [], next: [],
  result: { file: "", bytes: 0, hash: "" as Hash },
});

const lastLine = (s: string): string => s.trim().split("\n").filter((l) => l !== "").at(-1) ?? "";

export async function runChaseBake(input: CommandInput<"chase.bake">, ctx: CoreCtx): Promise<CommandOut<Output>> {
  const root = workspaceRoot(ctx.cwd);
  const dir = chaseDir(root, ctx.cwd, input.chase);
  const draft = isDraftDir(dir);
  if (draft && input.mode !== "draft") {
    throw cmdError({ code: "E_DRAFT", path: "/chase", got: input.chase, expected: "mode draft", hint: `${input.chase} is an hbf draft; bake it with --mode draft, or run hbf adopt to lift it into a design` });
  }
  if (!draft && input.mode === "draft") {
    throw cmdError({ code: "E_SCHEMA", path: "/mode", got: "draft", expected: "page", hint: `${input.chase} holds no draft.json, so it is no hbf draft; bake it without --mode draft, or start a draft with hbf draft --from` });
  }
  // The chase must read as data (D-178) before anything is generated from it; a breach throws E_SCHEMA.
  readChaseSource(readFileSync(path.join(dir, "chase.ts"), "utf8"), posix(path.relative(root, path.join(dir, "chase.ts"))));
  ctx.signal.throwIfAborted();
  if (draft) await writeDraftBlock(dir, ctx.cwd, draftOrigin(dir));
  ctx.signal.throwIfAborted();

  const gen = await node(ctx, root, [path.join(root, draft ? "tools/bake/draft.ts" : "tools/bake/from-chase.ts"), dir]);
  if (gen.code !== 0) {
    return failed(ctx, [{ code: "E_KERNEL", path: "/chase", got: input.chase, record: "bake/manifest", hint: lastLine(gen.err).replace(/^(from-chase|draft): /, "") || "bake.json generation failed" }]);
  }
  const manifest = (JSON.parse(lastLine(gen.out)) as { manifest: string }).manifest;
  ctx.signal.throwIfAborted();

  // A draft's page lands in its own directory (tools/bake/draft.ts sets out "."), a design's under dist.
  const outRoot = path.resolve(ctx.cwd, ctx.cli.out ?? (draft ? dir : path.join(root, "dist")));
  const baked = await node(ctx, root, [path.join(root, "tools/bake/bake.mjs"), manifest, "--out-root", outRoot]);
  if (baked.code !== 0) {
    const why = lastLine(baked.err).replace(/^bake: /, "");
    return failed(ctx, [{ code: "E_KERNEL", path: "/chase", got: posix(path.relative(root, manifest)), record: bakeRecord(why), hint: why || "the baker stopped without a message" }]);
  }

  const m = JSON.parse(readFileSync(manifest, "utf8")) as { id: string; out?: string; shell: string };
  const file = path.join(outRoot, m.out ?? (m.shell === "ui" ? "bench" : "legacy"), `${m.id}.html`);
  const bytes = readFileSync(file);
  const shown = path.relative(root, file);
  return {
    verdict: "pass", stage: "build", inputsHash: ctx.inputsHash,
    findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [], artifacts: [], next: [],
    result: { file: posix(shown.startsWith("..") ? file : shown), bytes: bytes.length, hash: createHash("sha256").update(bytes).digest("hex") as Hash },
  };
}
