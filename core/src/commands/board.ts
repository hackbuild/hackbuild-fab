// part.build and check.run on a board design (M08-T06, M08-T07). The
// direct generator runs, its record and fab zip go to the store, and every
// check that needs the board kernel runs on the board Part and the zip. A
// generator that refused returns its gate lines as one E_KERNEL error and
// stores nothing.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ArtifactBytes, BoardRecord, BuildHash, CommandInput, CommandOutput, NextCall } from "@hackbuild/spec";
import { DIRECT_RECORD, withHash } from "@hackbuild/board";
import { buildLines } from "@hackbuild/project";
import { boardArtifacts, boardCheckVersions, boardPart, buildBoard, fabZip, runBoardChecks, zipHash, type BoardBuilt, type BoardRefused } from "../board.js";
import { cmdError } from "../errors.js";
import { boardViews } from "../board-views.js";
import { countsOf, findingsOf, worst, type CommandOut } from "../result.js";
import type { CoreCtx } from "../registry.js";
import { defParts, loadWorkspace, workspaceRoot, type Design, type Values } from "./build.js";

/** A refused generator as a result: no store write, the gate lines as one E_KERNEL error. */
function refusedOut<T>(r: BoardRefused, ctx: CoreCtx): CommandOut<T> {
  return {
    verdict: "fail", stage: "build", inputsHash: ctx.inputsHash,
    findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, artifacts: [], next: [],
    errors: [{
      code: "E_KERNEL", path: "/build/generator", got: r.lines, expected: "a generator whose gates pass",
      hint: `${r.design.chase.meta.id}: ${r.lines.find((l) => /failed/i.test(l)) ?? r.lines[0] ?? `generator exited ${r.exit}`}`, record: "board-pcb",
    }],
  } as unknown as CommandOut<T>;
}

/**
 * Store the board build: the record with the Part and its graph lines, the
 * fab zip as an artifact. The board build reads its chase, build.ts and
 * params; it reads no profile row (inputs.profileHash is the hash of no
 * rows), registers no feature kind and meshes no body, so the build line
 * links those three, and the report the store writes next is checked
 * against a build the graph holds.
 */
function storeBoard(built: BoardBuilt, ctx: CoreCtx): string {
  const target = built.design.target.split(path.sep).join("/");
  const def = defParts(built.design);
  const uri = ctx.store.putBuild({
    format: "hbf-build-1", buildHash: built.part.buildHash, chase: built.design.chase.meta.id, target: built.design.target,
    values: built.values, inputs: built.inputs, part: built.part, slots: [],
    graph: buildLines({
      target, buildHash: built.part.buildHash, chaseHash: def.chase, buildScriptHash: def.buildScript, paramsHash: built.inputs.paramsHash,
      profile: "data", reads: [], kinds: {}, meshes: {},
    }),
  }, []);
  const zip = fabZip(built.files);
  if (zip !== undefined) ctx.store.putArtifact(zipHash(zip), "zip", zip.bytes);
  return uri;
}

export async function runBoardPartBuild(design: Design, input: CommandInput<"part.build">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"part.build">>> {
  const built = await buildBoard(design, (input.params ?? {}) as Values);
  if ("refused" in built) return refusedOut(built, ctx);
  const uri = storeBoard(built, ctx);
  const results = await runBoardChecks(built, boardArtifacts(built), boardViews(design.ws.root, built.runDir, design.dir));
  ctx.store.putReport(boardCheckVersions(design.ws), results, { chase: design.chase.meta.id, target: design.target, build: built.part.buildHash });
  const verdict = worst(results);
  const next: NextCall[] = verdict === "fail" ? [] : [{ command: "export.run", args: { chase: input.chase, kind: "gerbers" }, why: "every board check passes or skips; a person approves the gerbers at a terminal" }];
  return {
    verdict, stage: verdict === "fail" ? "check" : "done", buildHash: built.part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next,
    result: {
      build: uri as CommandOutput<"part.build">["build"],
      parts: [{ id: built.part.id, bodies: [], volumeMm3: 0, triangles: 0 }],
      metrics: built.part.metrics,
      warnings: [],
      readsInferred: [],
      ir: input.detail === "full" ? built.part : null,
    },
  };
}

export async function runBoardCheckRun(design: Design, input: CommandInput<"check.run">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"check.run">>> {
  const built = await buildBoard(design, {});
  if ("refused" in built) return refusedOut(built, ctx);
  const results = await runBoardChecks(built, boardArtifacts(built), boardViews(design.ws.root, built.runDir, design.dir), input.only);
  const checks = Object.fromEntries(Object.entries(boardCheckVersions(design.ws)).filter(([id]) => input.only === undefined || input.only.includes(id)));
  const report = ctx.store.putReport(checks, results, { chase: design.chase.meta.id, target: design.target, build: built.part.buildHash });
  return {
    verdict: worst(results), stage: "done", buildHash: built.part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [],
    result: { results, report },
  };
}

/** The exporter id a board file is checked as, by its extension; undefined for a file that is not a board export. */
export function boardArtifactKind(file: string): "gerbers" | "kicad" | undefined {
  if (file.endsWith(".zip")) return "gerbers";
  if (file.endsWith(".kicad_pcb")) return "kicad";
  return undefined;
}

/**
 * check.run --artifact on a board export (M08-T07, M08-T08): the record
 * the generator wrote beside it (record.json in the same folder) is the
 * source the artifact is held to; the board checks of artifact level run.
 */
export async function runBoardArtifactCheck(file: string, input: CommandInput<"check.run">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"check.run">>> {
  const abs = path.resolve(ctx.cwd, file);
  const kind = boardArtifactKind(abs)!;
  if (!existsSync(abs)) throw cmdError({ code: "E_REF", path: "/artifact", got: file, hint: `no file at ${file}` });
  const recFile = path.join(path.dirname(abs), DIRECT_RECORD);
  if (!existsSync(recFile)) {
    throw cmdError({ code: "E_REF", path: "/artifact", got: file, expected: `${DIRECT_RECORD} beside the ${kind} file`, hint: `build the board first so ${DIRECT_RECORD} sits beside ${path.basename(abs)}, for example hbf part.build reference/boards/<id>`, record: "board-pcb" });
  }
  const ws = await loadWorkspace(workspaceRoot(ctx.workspace));
  const record = withHash(JSON.parse(readFileSync(recFile, "utf8")) as Omit<BoardRecord, "recordHash">);
  const part = boardPart(record, { id: path.basename(path.dirname(abs)), name: path.basename(abs), machine: "", buildHash: record.recordHash as unknown as BuildHash });
  const artifact: ArtifactBytes = { exporter: kind, name: path.basename(abs), bytes: new Uint8Array(readFileSync(abs)), part };
  const all = await runBoardChecks({ design: { ws } }, [artifact], boardViews(ws.root, path.dirname(abs)), input.only);
  const results = all.filter((r) => r.target.level === "artifact" || input.only !== undefined);
  const checks = Object.fromEntries(Object.entries(boardCheckVersions(ws)).filter(([id]) => input.only === undefined || input.only.includes(id)));
  const report = ctx.store.putReport(checks, results);
  return {
    verdict: worst(results), stage: "done", inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [],
    result: { results, report },
  };
}
