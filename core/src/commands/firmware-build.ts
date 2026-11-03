// firmware.build (build mode, D-667; group make; plan v11.2 section 5 item
// 9): compile a sketch folder with arduino-cli for one board and return the
// images and section sizes as a CommandResult. arduino-cli (GPL-3.0) runs as
// a separate process, found through its registry/runners.json row. The build
// lands in a temporary folder and nothing is uploaded: flashing a board is a
// consequential action that needs a person's confirm (RULES.md safety
// posture), so it is not part of this command.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CommandInput, CommandOutput, Hash } from "@hackbuild/spec";
import type { CoreCtx } from "../ctx.js";
import { cmdError } from "../errors.js";
import type { CommandOut } from "../result.js";
import { loadRunners, probeRunner, runnersFile } from "../runners.js";
import { workspaceRoot } from "./build.js";

type Output = CommandOutput<"firmware.build">;

const IMAGE_EXT = new Set([".uf2", ".bin", ".hex", ".elf"]);

const done = (ctx: CoreCtx, verdict: "pass" | "fail" | "skip", result: Output): CommandOut<Output> => ({
  verdict, stage: "done", inputsHash: ctx.inputsHash,
  findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [], artifacts: [], next: [],
  result,
});

interface CompileJson {
  readonly success?: boolean;
  /** arduino-cli's own refusal, such as a platform that is not installed. */
  readonly error?: string;
  readonly compiler_out?: string;
  readonly compiler_err?: string;
  readonly builder_result?: { readonly executable_sections_size?: readonly { readonly name: string; readonly size: number; readonly max_size: number }[] };
}

export async function runFirmwareBuild(input: CommandInput<"firmware.build">, ctx: CoreCtx): Promise<CommandOut<Output>> {
  const root = workspaceRoot(ctx.workspace);
  const sketch = path.resolve(ctx.cwd, input.sketch);
  const ino = path.join(sketch, `${path.basename(sketch)}.ino`);
  if (!existsSync(ino) || !statSync(ino).isFile()) {
    throw cmdError({ code: "E_REF", path: "/sketch", got: input.sketch, expected: "a folder holding <folder name>.ino", hint: `no ${path.basename(ino)} in ${input.sketch}; name the sketch folder` });
  }
  const notRun = (reason: string, runner = "arduino-cli"): CommandOut<Output> =>
    done(ctx, "skip", { status: "not run", reason, fqbn: input.fqbn, runner, outDir: "", images: [], sections: [], warnings: [] });
  const row = existsSync(runnersFile(root)) ? loadRunners(root).find((r) => r.id === "arduino-cli") : undefined;
  if (row === undefined) return notRun("no arduino-cli row in registry/runners.json");
  const found = probeRunner(row, root);
  if (!found.present || found.at === undefined) return notRun(`arduino-cli not found; install: ${row.install}`);
  const runner = `arduino-cli ${found.version ?? "(version not read)"}`;

  const out = mkdtempSync(path.join(os.tmpdir(), "hbf-firmware-"));
  const r = spawnSync(found.at, ["compile", "--fqbn", input.fqbn, "--output-dir", out, "--format", "json", "--warnings", "default", sketch], { encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
  let j: CompileJson = {};
  try {
    j = JSON.parse(r.stdout ?? "{}") as CompileJson;
  } catch {
    j = {};
  }
  const err = `${j.compiler_err ?? ""}\n${r.stderr ?? ""}`;
  const lines = err.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  const warnings = lines.filter((l) => /warning:/.test(l));
  const firstError = (j.error ?? "").split("\n")[0]?.trim() || lines.find((l) => /error:|Error:|not found|Platform .* is not installed/i.test(l));
  const images = existsSync(out)
    ? readdirSync(out).filter((f) => IMAGE_EXT.has(path.extname(f))).sort().map((f) => {
      const bytes = readFileSync(path.join(out, f));
      return { path: path.join(out, f), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") as Hash };
    })
    : [];
  const built = r.status === 0 && j.success === true && images.length > 0;
  return done(ctx, built ? "pass" : "fail", {
    status: built ? "built" : "failed",
    reason: built ? `compiled for ${input.fqbn} with ${runner}; nothing uploaded` : firstError ?? `arduino-cli exit ${String(r.status)}`,
    fqbn: input.fqbn,
    runner,
    outDir: out,
    images,
    sections: (j.builder_result?.executable_sections_size ?? []).map((s) => ({ name: s.name, size: s.size, maxSize: s.max_size })),
    warnings,
  });
}
