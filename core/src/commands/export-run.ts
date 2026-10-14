// export.run kind 3mf (M00-T13 step 9, D-109). ExporterDef.fabrication is
// true for 3mf, so the order is: build, the part checks, the package bytes
// and their checks, then the gate. Any fail returns the findings with exit
// 1 and no prompt. Without an interactive TTY on stdin and stdout the
// result is E_GATE_UNAVAILABLE naming the line a person runs. With one it
// asks once; only y writes. No flag and no environment token approves.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { BuildWarning, CommandInput, CommandOutput, NextCall } from "@hackbuild/spec";
import { TPU_FALLBACK_PRESET } from "@hackbuild/3mf";
import { cmdError, didYouMean } from "../errors.js";
import { countsOf, findingsOf, worst, type CommandOut } from "../result.js";
import type { CoreCtx } from "../registry.js";
import { exportedLine } from "@hackbuild/project";
import { storeBuild } from "../load-build.js";
import { askHost } from "../tty-gate.js";
import { export3mf, fixCalls, mergeWarnings, type Values } from "./build.js";
import { packageCheckIds, reportChecks, reportOrigin, runAllChecks } from "./check-run.js";
import { baseArgs, buildTarget, machineOf } from "./part-build.js";
import { SHEET_EXPORTERS } from "../exporters/index.js";
import { partName } from "../exporters/names.js";
import { runSceneExport, type ExportInput } from "../exporters/scene-export.js";
import { BOARD_EXPORTERS, boardExporter } from "../exporters/board-exporters.js";
import { runBoardExport } from "../exporters/board-export.js";
import { WIRING_EXPORTER, isWiringDesign, runWiringExport } from "../exporters/wiring.js";
import { isBoardDesign } from "../board.js";
import { resolveTarget } from "../load-build.js";
import { loadDesign } from "./build.js";

/**
 * Exporters hbf registers: 3mf and the sheet exporters (M07-T14), the board
 * exporters (M08-T14) and wiring (M08-T13). Each states its own
 * fabrication flag; export.run gates on that flag, never on the id.
 */
export const EXPORT_KINDS: readonly string[] = ["3mf", ...SHEET_EXPORTERS.map((e) => e.id), ...BOARD_EXPORTERS.map((e) => e.id), WIRING_EXPORTER.id];

const quote = (s: string): string => (/^[\w./:@-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`);

/** The command line a person runs at a terminal to answer the gate. */
export function personLine(input: CommandInput<"export.run">, machine: string, out: string | undefined): string {
  const parts = ["npx --no-install hbf export.run", quote(input.chase), "--kind", input.kind, "--machine", machine];
  if (input.preset !== undefined) parts.push("--preset", quote(input.preset));
  if (input.params !== undefined) parts.push("--params", quote(JSON.stringify(input.params)));
  if (out !== undefined) parts.push("--out", quote(out));
  return parts.join(" ");
}

/**
 * The gate note for slots whose preset row the writer inferred
 * (PRESET_INFERRED, param /filaments/<i>/type, slot i + 1): their written
 * values may not reach the slice (PROFILE.md 8.1, D-187). Empty when none.
 */
export function inferredSlotNotes(warnings: readonly BuildWarning[]): string[] {
  const slots = warnings
    .filter((w) => w.code === "PRESET_INFERRED")
    .map((w) => /^\/filaments\/(\d+)\//.exec(w.param ?? "")?.[1])
    .filter((i): i is string => i !== undefined)
    .map((i) => Number(i) + 1);
  const unique = [...new Set(slots)].sort((a, b) => a - b);
  if (unique.length === 0) return [];
  const noun = unique.length === 1 ? "slot" : "slots";
  return [`${noun} ${unique.join(", ")} tpu values inferred from ${TPU_FALLBACK_PRESET}; they may not reach the slice`];
}

export async function runExportRun(wide: ExportInput, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"export.run">>> {
  if (!EXPORT_KINDS.includes(wide.kind)) {
    throw cmdError({ code: "E_REF", path: "/kind", got: wide.kind, didYouMean: didYouMean(wide.kind, EXPORT_KINDS), hint: `name an exporter hbf registers: ${EXPORT_KINDS.join(", ")}` });
  }
  if (wide.scene !== undefined) return runSceneExport(wide, ctx) as Promise<CommandOut<CommandOutput<"export.run">>>;
  if (wide.chase === undefined) {
    throw cmdError({ code: "E_PARAM_MISSING", path: "/chase", expected: "a chase or --scene <id>", hint: "name the design to export, or a nest scene with --scene until M10" });
  }
  const input = wide as CommandInput<"export.run">;
  const board = boardExporter(input.kind);
  if (board !== undefined || input.kind === WIRING_EXPORTER.id) {
    // Board kinds (M08-T14) and wiring (M08-T13): the design names a board chase.
    const design = await loadDesign(resolveTarget(input.chase, ctx.cwd, ctx.workspace, "/chase"), ctx.cwd);
    if (!isBoardDesign(design)) throw cmdError({ code: "E_SCHEMA", path: "/kind", got: input.kind, expected: "a board chase", hint: `${input.chase} is a ${design.chase.meta.kind} chase; ${input.kind} exports boards` });
    if (isWiringDesign(design) !== (input.kind === WIRING_EXPORTER.id)) {
      throw cmdError({ code: "E_SCHEMA", path: "/kind", got: input.kind, expected: isWiringDesign(design) ? "wiring" : "a board kind", hint: `${input.chase} ${isWiringDesign(design) ? "builds a wiring drawing; export it with --kind wiring" : "builds a board; wiring exports come from a wiring design"}` });
    }
    return board === undefined ? runWiringExport(design, input, ctx) : runBoardExport(design, input, ctx, board);
  }
  if (input.kind !== "3mf") {
    throw cmdError({ code: "E_SCHEMA", path: "/kind", got: input.kind, expected: "3mf", hint: `no chase declares sheet items before M10; export a nest scene with --scene <id> --kind ${input.kind}` });
  }
  const params = input.params as Values | undefined;
  const built = await buildTarget(input.chase, ctx, params, input.preset);
  const machine = built.part.machine;
  const row = machineOf(built);
  if (!row.slices) {
    const kinds = SHEET_EXPORTERS.filter((e) => (e.processes as readonly string[]).includes(row.process)).map((e) => e.id);
    throw cmdError({
      code: "E_SCHEMA", path: "/kind", got: input.kind, expected: "a part built for an fdm machine with a slicer preset",
      hint: `${input.chase} builds for ${machine}, a ${row.process} machine with no slicer preset, so it takes no 3mf; ${kinds.length === 0 ? `no exporter writes a single ${row.process} part before M10` : `${kinds.join(", ")} export a nest scene with --scene <id> until M10`}`,
    });
  }
  if (input.machine !== undefined && input.machine !== machine) {
    throw cmdError({ code: "E_REF", path: "/machine", got: input.machine, didYouMean: [machine], hint: `export on ${machine}, the machine the part was built for` });
  }
  const base = baseArgs(params, input.preset);
  const fail = (results: Awaited<ReturnType<typeof runAllChecks>>["results"], stage: "check" | "done", warnings: readonly BuildWarning[]): CommandOut<CommandOutput<"export.run">> => ({
    verdict: "fail", stage, buildHash: built.part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [],
    next: fixCalls("export.run", input.chase, results, { kind: input.kind, ...base }), result: { artifacts: [], warnings },
  });

  const partChecks = await runAllChecks(built, [], undefined);
  storeBuild(ctx.store, built);
  if (worst(partChecks.results) === "fail") return fail(partChecks.results, "check", mergeWarnings(built.part.warnings, partChecks.warnings));
  const pkg = await export3mf(built);
  const pkgChecks = await runAllChecks(built, [{ exporter: "3mf", name: pkg.name, bytes: pkg.bytes, part: built.part }], packageCheckIds(built));
  const results = [...partChecks.results, ...pkgChecks.results];
  // Build, check and writer warnings; PRESET_INFERRED is a warning on a slot, never a check verdict.
  const warnings = mergeWarnings(built.part.warnings, partChecks.warnings, pkgChecks.warnings, pkg.warnings);
  ctx.store.putReport(reportChecks(built), results, reportOrigin(built));
  if (worst(results) === "fail") return fail(results, "check", warnings);

  const counts = countsOf(results);
  // The file a person receives is named per PACKAGES.md 8.2: one part, quantity 1 (names.ts).
  const file = path.resolve(ctx.cwd, ctx.cli.out ?? path.join(built.design.dir, "out", partName(path.basename(built.design.dir), 1, "3mf")));
  const rel = path.relative(ctx.cwd, file);
  const shown = rel === "" || rel.startsWith("..") ? file : rel;
  const evidence = { buildHash: built.part.buildHash, inputsHash: ctx.inputsHash, findings: findingsOf(results), counts };
  if (input.dryRun === true) {
    return { ...evidence, verdict: worst(results), stage: "gate", errors: [], artifacts: [], next: [], result: { artifacts: [], warnings } };
  }
  const answer = await askHost(ctx, {
    kind: input.kind, machine, chase: built.design.chase.meta.id, buildHash: built.part.buildHash,
    fail: counts.fail, warn: counts.warn, path: shown, notes: inferredSlotNotes(warnings),
  });
  if (answer === "unavailable") {
    throw cmdError({
      code: "E_GATE_UNAVAILABLE", path: "/", personRuns: personLine(input, machine, ctx.cli.out),
      hint: "no interactive terminal on stdin and stdout; a person runs the export line at a terminal and answers the prompt",
    });
  }
  if (answer === "declined") {
    throw cmdError({ code: "E_GATE", path: "/", got: "n", hint: "export declined at the prompt; nothing written" });
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, pkg.bytes);
  const uri = ctx.store.putArtifact(pkg.artifactHash, "3mf", pkg.bytes);
  ctx.store.appendGraph([exportedLine(built.graph.target, "3mf", pkg.artifactHash, built.part.buildHash)]);
  const next: NextCall[] = [{ command: "check.run", args: { build: input.chase }, why: `the file at ${shown} carries artifact hash ${pkg.artifactHash.slice(0, 12)}; re-read its findings` }];
  return {
    ...evidence, verdict: worst(results), stage: "done", errors: [],
    artifacts: [{ uri, kind: "3mf", mediaType: "model/3mf", hash: pkg.artifactHash, bytes: pkg.bytes.length }],
    next, result: { artifacts: [uri], warnings },
  };
}
