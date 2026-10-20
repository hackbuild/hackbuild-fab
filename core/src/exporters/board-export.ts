// export.run on a board design (M08-T14 step 4). The order for every
// fabrication kind: build; the provenance gate (E_PROVENANCE, exit 4, one
// error per inferred geometry or connectivity read, no prompt and no stdin
// read); every board check (any fail: exit 1 with the findings, no prompt);
// the TTY gate (no terminal: E_GATE_UNAVAILABLE, exit 3, naming the line a
// person runs); write; then the post-write checks read the written files
// back (CHK-BRD-01 on a gerbers zip, CHK-BRD-05 on a BOM or CPL), and a
// fail deletes what was written and returns exit 1. A gerbers export draws
// gerber-front.png and gerber-back.png from the parsed layers before the
// prompt, names them in it, and writes them beside the zip. A kind with
// fabrication false (kicad) skips the provenance and TTY gates and keeps
// the read-back. dryRun on any kind stops before the write.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sha256Hex, type ArtifactBytes, type ArtifactHash, type CommandInput, type CommandOutput, type Hash, type NextCall } from "@hackbuild/spec";
import { provenanceGate } from "@hackbuild/catalog";
import type { KernelViews } from "@hackbuild/checks";
import { boardArtifacts, boardCheckVersions, buildBoard, fabZip, runBoardChecks } from "../board.js";
import { boardViews } from "../board-views.js";
import { cmdError } from "../errors.js";
import { countsOf, findingsOf, worst, type CommandOut } from "../result.js";
import type { CoreCtx } from "../ctx.js";
import { askHost } from "../tty-gate.js";
import type { Design, Values } from "../commands/build.js";
import type { BoardExporter } from "./board-exporter.js";
import { renderParsed } from "./gerbers.js";

type ExportOut = CommandOut<CommandOutput<"export.run">>;

const quote = (s: string): string => (/^[\w./:@-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`);

/** The command line a person runs at a terminal to answer the gate of a board export. */
export function boardPersonLine(input: CommandInput<"export.run">, out: string | undefined): string {
  const parts = ["npx --no-install hbf export.run", quote(input.chase), "--kind", input.kind];
  if (input.dialect !== undefined) parts.push("--dialect", input.dialect);
  if (out !== undefined) parts.push("--out", quote(out));
  return parts.join(" ");
}

/** Where a board export writes: --out as a folder, else .hbf/out/<design> for a design file and <design>/out for a fabrication set. */
export function boardOutFolder(exporter: BoardExporter, design: Design, outDir: string, ctx: Pick<CoreCtx, "cwd" | "cli">): string {
  if (ctx.cli.out !== undefined) return path.resolve(ctx.cwd, ctx.cli.out);
  return exporter.fabrication ? path.join(design.dir, "out") : outDir;
}

/**
 * Run one board exporter on a board design. `views` stands in for the
 * board readers (tests hand in a reparse that fails after the write).
 */
export async function runBoardExport(design: Design, input: CommandInput<"export.run">, ctx: CoreCtx, exporter: BoardExporter, views?: KernelViews): Promise<ExportOut> {
  if (exporter.files === undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/kind", got: exporter.id, expected: "a board kind with a writer", hint: `the ${exporter.id} writer lands with ${exporter.pending ?? "a later card"}; export gerbers, bom, cpl, kicad or wiring`, record: "board-pcb" });
  }
  if (input.dialect !== undefined && exporter.id !== "cpl") {
    throw cmdError({ code: "E_SCHEMA", path: "/dialect", got: input.dialect, expected: "absent", hint: `--dialect applies to kind cpl; ${exporter.id} has one form` });
  }
  const built = await buildBoard(design, (input.params ?? {}) as Values);
  if ("refused" in built) {
    throw cmdError({ code: "E_KERNEL", path: "/build/generator", got: built.lines, hint: `${design.chase.meta.id}: ${built.lines.find((l) => /failed/i.test(l)) ?? built.lines[0] ?? `generator exited ${built.exit}`}`, record: "board-pcb" });
  }
  const evidence0 = { buildHash: built.part.buildHash, inputsHash: ctx.inputsHash };
  const empty = { artifacts: [], warnings: [] } as CommandOutput<"export.run">;

  // provenance before anything a person or a check reads (D-102)
  const gate = provenanceGate(built.record, exporter);
  if (!gate.ok) {
    return { ...evidence0, verdict: "fail", stage: "gate", findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: [...gate.errors], artifacts: [], next: [], result: empty };
  }

  const v = views ?? boardViews(design.ws.root, built.runDir, design.dir);
  const dialect = input.dialect ?? "body-centre";
  const report = (results: Awaited<ReturnType<typeof runBoardChecks>>): void => {
    const ids = new Set(results.map((r) => r.id as string));
    ctx.store.putReport(Object.fromEntries(Object.entries(boardCheckVersions(design.ws)).filter(([id]) => ids.has(id))), results,
      { chase: design.chase.meta.id, target: design.target, build: built.part.buildHash });
  };
  const failOut = (results: Awaited<ReturnType<typeof runBoardChecks>>, stage: "check" | "done"): ExportOut => ({
    ...evidence0, verdict: "fail", stage, findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [], result: empty,
  });

  let pre: Awaited<ReturnType<typeof runBoardChecks>> = [];
  if (exporter.fabrication) {
    pre = await runBoardChecks(built, boardArtifacts(built), v);
    report(pre);
    if (worst(pre) === "fail") return failOut(pre, "check");
    if (exporter.id === "gerbers") {
      const zip = fabZip(built.files);
      if (zip !== undefined) await renderParsed(design.ws.root, zip.bytes, path.join(built.outDir, "render"));
    }
  }
  const files = exporter.files(built, { dialect, root: design.ws.root });
  const folder = boardOutFolder(exporter, design, built.outDir, ctx);
  const rel = (p: string): string => { const r = path.relative(ctx.cwd, p); return r === "" || r.startsWith("..") ? p : r; };

  // dryRun writes nothing for every kind, fabrication or not (spec/commands.ts export.run)
  if (input.dryRun === true) return { ...evidence0, verdict: worst(pre), stage: "gate", findings: findingsOf(pre), counts: countsOf(pre), errors: [], artifacts: [], next: [], result: empty };
  if (exporter.fabrication) {
    const counts = countsOf(pre);
    const pngs = files.filter((f) => f.kind === "png").map((f) => rel(path.join(built.outDir, "render", f.name)));
    const answer = await askHost(ctx, {
      kind: exporter.id, machine: "a pcb fab", chase: design.chase.meta.id, buildHash: built.part.buildHash,
      fail: counts.fail, warn: counts.warn, path: rel(folder),
      notes: [`${files.map((f) => f.name).join(", ")}`, ...(pngs.length === 0 ? [] : [`look at ${pngs.join(" and ")} first: they are drawn from the parsed gerbers, what the fab will image`])],
    });
    if (answer === "unavailable") {
      throw cmdError({
        code: "E_GATE_UNAVAILABLE", path: "/", personRuns: boardPersonLine(input, ctx.cli.out),
        hint: "no interactive terminal on stdin and stdout; a person runs the export line at a terminal and answers the prompt",
      });
    }
    if (answer === "declined") throw cmdError({ code: "E_GATE", path: "/", got: "n", hint: "export declined at the prompt; nothing written" });
  }

  mkdirSync(folder, { recursive: true });
  const written = files.map((f) => {
    const p = path.join(folder, f.name);
    writeFileSync(p, f.bytes);
    return { ...f, path: p };
  });
  // read the written files back and hold them to the record
  const back: ArtifactBytes[] = written.filter((f) => f.kind !== "png").map((f) => ({ exporter: f.kind, name: f.name, bytes: new Uint8Array(readFileSync(f.path)), part: built.part }));
  const post = exporter.postWrite.length === 0 ? [] : await runBoardChecks(built, back, v, exporter.postWrite);
  const postRun = post.filter((r) => r.target.level === "artifact");
  report(postRun);
  const all = [...pre, ...postRun];
  if (worst(postRun) === "fail") {
    for (const f of written) if (existsSync(f.path)) rmSync(f.path);
    return failOut(all, "check");
  }
  const artifacts = written.map((f) => {
    const hash = sha256Hex(f.bytes) as Hash;
    const uri = ctx.store.putArtifact(hash, f.name.split(".").at(-1) ?? exporter.ext, f.bytes);
    return { uri, kind: f.kind, mediaType: f.mediaType, hash: hash as unknown as ArtifactHash, bytes: f.bytes.length };
  });
  const main = written.find((f) => f.kind !== "png") ?? written[0]!;
  const next: NextCall[] = [{ command: "check.run", args: { build: rel(main.path) }, why: `${rel(main.path)} read back to its record; re-read it with --artifact` }];
  return {
    ...evidence0, verdict: worst(all), stage: "done", findings: findingsOf(all), counts: countsOf(all), errors: [], artifacts, next,
    result: { artifacts: artifacts.map((a) => a.uri), warnings: [] },
  };
}
