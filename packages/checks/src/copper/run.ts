// A cut-sheet board end to end: evaluate the draft, build the layer
// documents in memory, run the board's gate program in the generator's
// order (gen_keyway.py lines 197 to 287 and 382 to 383; program.ts), and
// hand the documents out only when every gate passes. BOSS exported on
// failure; the KEYWAY family writes nothing unless all gates pass
// (gen_keyway.py lines 290 to 291), and so does this.

import type { Geom } from "@hackbuild/geom";
import type { ProfileLookup, StackDecl } from "@hackbuild/spec";
import { Vinyl, emitLayers, evaluateDraft, stackDecl, type EmittedLayer, type VinylBoard, type VinylDraft, type VinylInputs } from "@hackbuild/copper";
import type { Gate, GateCtx } from "./gate.js";
import { runProgram } from "./program.js";

/** Every gate of the board's program, in order. */
export function vinylGates(ctx: GateCtx, layers: readonly EmittedLayer[]): Gate[] {
  return runProgram(ctx, layers);
}

export interface VinylRun {
  readonly board: VinylBoard;
  readonly gates: readonly Gate[];
  readonly passed: number;
  readonly failed: number;
  /** Every document, built in memory whatever the gates say. */
  readonly layers: readonly EmittedLayer[];
  readonly stack: StackDecl;
}

/** Evaluate, emit in memory and gate one draft. */
export function runVinyl(g: Geom, draft: VinylDraft, inputs: VinylInputs, profile: ProfileLookup): VinylRun {
  const v = new Vinyl(g);
  const board = evaluateDraft(v, draft, inputs, profile);
  const layers = emitLayers(board);
  const gates = vinylGates({ v, board, profile }, layers);
  const passed = gates.filter((x) => x.ok).length;
  return { board, gates, passed, failed: gates.length - passed, layers, stack: stackDecl(board, profile) };
}

export type VinylExport =
  | { readonly written: true; readonly files: readonly { readonly file: string; readonly svg: string }[] }
  | { readonly written: false; readonly failures: readonly string[] };

/** The documents to write, or the failing gate lines and nothing to write. */
export function exportVinyl(run: VinylRun): VinylExport {
  if (run.failed > 0) return { written: false, failures: run.gates.filter((x) => !x.ok).map((x) => x.line) };
  return { written: true, files: run.layers.map((l) => ({ file: l.file, svg: l.svg })) };
}
