// The direct-emit backend adapter (M08-T06 step 6, D-089), the part that
// needs no process or file system: the uv argument list a reference's gated
// Python generator runs with (D-140), and the reading of what it wrote. The
// record is stamped with recordHash (withHash, the one implementation of
// the D-051 hash) and validated (parseBoardRecord). A generator that exits
// non-zero wrote nothing (tools/py/board/direct/record.py StagedOut); its
// gate lines come back as the failure and the caller stores nothing.
//
// Packages compile without Node types, so core spawns uv and reads the
// folder (core/src/board.ts); a baked bench carries the record and the
// written artifacts and never runs Python (ARCHITECTURE.md runtime contexts).

import type { BoardRecord } from "@hackbuild/spec";
import { withHash } from "../record-hash.js";
import { parseBoardRecord } from "../record.zod.js";

/** What a direct generator writes beside the fab set in gates.json. */
export interface DirectGates {
  /** The generator's pass line, kept as the legacy prints it so goldens compare it. */
  readonly line: string;
  /** Least top-copper distance between two nets, mm; boards whose generator runs a DRC. */
  readonly tightest?: number;
  /** The clearance rule the DRC held, mm. */
  readonly rule?: number;
  readonly [key: string]: unknown;
}

export interface DirectFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

/** The files a generator writes beside the fab set; every other file in its folder is the fab set. */
export const DIRECT_RECORD = "record.json";
export const DIRECT_GATES = "gates.json";

export type DirectResult =
  | { readonly ok: true; readonly record: BoardRecord; readonly gates: DirectGates; readonly files: readonly DirectFile[] }
  | { readonly ok: false; readonly exit: number; readonly lines: readonly string[] };

/**
 * argv after the uv binary: `run --project <root>/tools/py <generator> --out <dir> --epoch <s>`.
 * The board package's tests run a generator unconfined with it. core does
 * not: part.build resolves the tools/py interpreter and runs gen.py under
 * its confinement (core/src/board.ts, D-201).
 */
export function directArgs(toolsPy: string, generator: string, outDir: string, epoch: number): string[] {
  return ["run", "--project", toolsPy, generator, "--out", outDir, "--epoch", String(epoch)];
}

/** The gate lines of a failed run: stdout then stderr, blank lines dropped. */
export function directFailure(exit: number, stdout: string, stderr: string): DirectResult {
  const lines = `${stdout}\n${stderr}`.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim() !== "");
  return { ok: false, exit, lines };
}

/** A passing run: the record stamped and validated, the gates and the fab files sorted by name. */
export function directSuccess(recordJson: string, gatesJson: string, files: readonly DirectFile[]): DirectResult {
  const raw = JSON.parse(recordJson) as Omit<BoardRecord, "recordHash">;
  const record = parseBoardRecord(withHash(raw));
  const gates = JSON.parse(gatesJson) as DirectGates;
  const sorted = [...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { ok: true, record, gates, files: sorted };
}

/**
 * What a board chase's build.ts returns: the backend and, for the direct
 * route, the generator beside chase.ts ("./gen.py"). The tscircuit backend
 * joins this union at M08-T10.
 */
export interface BoardDraft {
  readonly backend: "direct";
  /** Path of the generator relative to the design directory, starting "./" and ending ".py". */
  readonly generator: string;
}
