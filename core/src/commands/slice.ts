// slice (build mode, D-667; group make). Wraps tools/slice/slice.mjs, the
// virtual print the reach area wrote, and returns its run record as a
// CommandResult. The driver builds a design target in process with the
// core 3MF writer and checks it first; it never opens the fabrication
// export gate. The G-code stays in a temporary folder and is never sent
// anywhere. Status not run (verdict skip) says why: no driver in the
// workspace, or no slicer executable.

import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CommandInput, CommandOutput, Hash } from "@hackbuild/spec";
import type { CoreCtx } from "../ctx.js";
import { cmdError } from "../errors.js";
import type { CommandOut } from "../result.js";
import { workspaceRoot } from "./build.js";
import { runNode } from "./chase-bake.js";

type Output = CommandOutput<"slice">;

/** Default slicer time limit, seconds (inferred: slice.mjs's own default). */
const DEFAULT_LIMIT_S = 600;

const first = (s: string): string => s.trim().split("\n")[0] ?? "";

const done = (ctx: CoreCtx, verdict: "pass" | "fail" | "skip", result: Output): CommandOut<Output> => ({
  verdict, stage: "done", inputsHash: ctx.inputsHash,
  findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [], artifacts: [], next: [],
  result,
});

export async function runSlice(input: CommandInput<"slice">, ctx: CoreCtx): Promise<CommandOut<Output>> {
  const root = workspaceRoot(ctx.workspace);
  const driver = path.join(root, "tools", "slice", "slice.mjs");
  const notRun = (reason: string): CommandOut<Output> => done(ctx, "skip", { status: "not run", reason, outDir: "", gcode: null, profileChecks: [] });
  if (!existsSync(driver)) return notRun("no tools/slice/slice.mjs in this workspace");
  const target = path.resolve(ctx.cwd, input.target);
  if (!existsSync(target)) {
    throw cmdError({ code: "E_REF", path: "/target", got: input.target, expected: "a .3mf file or a design directory", hint: "name the 3mf or the design directory to slice" });
  }
  const isFile = target.endsWith(".3mf");
  const out = mkdtempSync(path.join(os.tmpdir(), "hbf-slice-"));
  const args = [driver, ...(isFile ? [target] : ["--design", target, ...(input.preset === undefined ? [] : ["--preset", input.preset])]), out,
    "--time-limit", String(input.timeLimitS ?? DEFAULT_LIMIT_S), ...(input.slicer === undefined ? [] : ["--slicer", input.slicer])];
  const r = await runNode(ctx, root, args);
  if (r.code === 3) return notRun(first(r.out) || "the slicer is absent");

  const runFile = path.join(out, "slice-run.json");
  const run = existsSync(runFile)
    ? JSON.parse(readFileSync(runFile, "utf8")) as { status?: string; gcode?: { path: string; bytes: number; sha256: string } | null; profileChecks?: Output["profileChecks"] }
    : undefined;
  const profileChecks = run?.profileChecks ?? [];
  const sliced = run?.status === "sliced" && r.code === 0;
  return done(ctx, sliced ? "pass" : "fail", {
    status: sliced ? "sliced" : "failed",
    reason: sliced ? `${first(r.out)}; virtual print, computed, never a print` : first(r.err) || first(r.out) || `slice.mjs exit ${r.code}`,
    outDir: out,
    gcode: run?.gcode == null ? null : { path: run.gcode.path, bytes: run.gcode.bytes, sha256: run.gcode.sha256 as Hash },
    profileChecks,
  });
}
