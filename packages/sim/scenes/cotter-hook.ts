// COTTER hook insertion scene (M02-T09). Declares the cases of hook_fit.py
// `verify_all` (line 104, lineage cotter.hook-fit/r5, read from that line
// stored in inputs/cotter-hook), the board of COTTER's first kit read from
// its layout.json (stored there too, inputs/stored-inputs.json), and the sharp-bend refusal case of the M02 records, each
// with the outcome it is expected to measure. Nothing physical is typed
// here: clip, board and search numbers are profile rows (hook.*,
// hookFit.*), and a case's hook dims come from the `design` function the
// caller binds (mech/hook-rule in core; the oracle golden in the test),
// except the sharp case, whose dims are the fixture.

import { readFileSync } from "node:fs";
import { insertSearch, type InsertPose, type InsertSettings, type InsertState } from "../src/sweep/insert.js";
import { CLIP_CONSTANT_IDS, boardSection, clipSection, type ClipConstants, type HookDims } from "../src/programs/cotter/hook.js";

const INPUTS = new URL("inputs/cotter-hook/", import.meta.url);

/** The kit layout the eighth case reads (lineage cotter.kit-layout/2026-09-21, stored as cotter.kit-layout/scene-input). */
export const KIT_LAYOUT = "kit-2026-09-21-layout.json";
/** Line 104 of hook_fit.py, the verify_all loop header (lineage cotter.hook-fit/scene-verify-pairs). */
export const VERIFY_LINE = "hook_fit-verify_all.txt";

/** What the scene needs of a profile lookup. */
export interface ConstantSource {
  constant(id: string): { readonly value: number };
}

/** Hook dims for a hole and board, mm; core binds mech/hook-rule. */
export type HookDesign = (hole: number, tb: number) => HookDims;

export type HookVerdict = "INSERTS" | "TRAPPED";

export interface HookCase {
  readonly id: string;
  /** mm */
  readonly hole: number;
  /** Board thickness, mm. */
  readonly tb: number;
  readonly from: string;
  readonly expect: HookVerdict;
  /** Fixed dims; when absent the case is stated by hole and board and the design gives them. */
  readonly dims?: HookDims;
}

/** The (hole, board) pairs of hook_fit.py verify_all, read from its loop header (line 104) in its order. */
export function verifyPairs(): [number, number][] {
  const line = readFileSync(new URL(VERIFY_LINE, INPUTS), "utf8");
  const loop = /^\s*for hole,tb in \(((?:\([\d.]+,[\d.]+\),?)+)\):\n$/.exec(line);
  if (loop === null) throw new Error("hook_fit.py line 104 is not the verify_all `for hole,tb in (...)` loop");
  return [...loop[1]!.matchAll(/\(([\d.]+),([\d.]+)\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

/** The kit board, state.board.hole and state.board.tb of the layout file. */
export function kitBoard(): { readonly hole: number; readonly tb: number } {
  const layout = JSON.parse(readFileSync(new URL(KIT_LAYOUT, INPUTS), "utf8")) as { state: { board: { hole: number; tb: number } } };
  return { hole: layout.state.board.hole, tb: layout.state.board.tb };
}

/** Scene cotter-hook: the seven verify pairs and the kit board, all expected to insert. */
export function hookCases(): HookCase[] {
  const kit = kitBoard();
  return [
    ...verifyPairs().map(([hole, tb], i): HookCase => ({ id: `verify-${i + 1}`, hole, tb, from: "hook_fit.py verify_all", expect: "INSERTS" })),
    { id: "kit-2026-09-21", hole: kit.hole, tb: kit.tb, from: "kit-2026-09-21 layout.json state.board (lineage cotter.kit-layout/2026-09-21)", expect: "INSERTS" },
  ];
}

/**
 * Scene cotter-hook-sharp: an L-like hook with a bend far under the closed
 * form's (M02-sim.md records: rod 5.40, Rb 6.0, sweep 52 on hole 6.35,
 * board 6.35; ext 3.0 and gap 0.6 are clip_poly's defaults, line 27).
 */
export const SHARP_CASE: HookCase = {
  id: "sharp", hole: 6.35, tb: 6.35, from: "M02-sim.md records: search() with a sharp bend", expect: "TRAPPED",
  dims: { d: 5.4, Rb: 6.0, sweep: 52, ext: 3.0, gap: 0.6 },
};

export function clipConstants(p: ConstantSource): ClipConstants {
  const out = {} as Record<keyof ClipConstants, number>;
  for (const [k, id] of Object.entries(CLIP_CONSTANT_IDS) as [keyof ClipConstants, string][]) out[k] = p.constant(id).value;
  return out;
}

export function insertSettings(p: ConstantSource): InsertSettings {
  const v = (id: string): number => p.constant(id).value;
  return {
    tiltStep: v("hookFit.tiltStep"), xyStep: v("hookFit.xyStep"), budget: v("hookFit.budget"),
    clearX: v("hookFit.clearX"), tiltWeight: v("hookFit.tiltWeight"),
    tilt: [v("hookFit.tilt.lo"), v("hookFit.tilt.hi")], x: [v("hookFit.x.lo"), v("hookFit.x.hi")], y: [v("hookFit.y.lo"), v("hookFit.y.hi")],
  };
}

export interface HookCaseResult {
  readonly id: string;
  readonly hole: number;
  readonly tb: number;
  readonly dims: HookDims;
  /** Measured outcome: INSERTS when the search reached a clearing pose (computed). */
  readonly verdict: HookVerdict;
  readonly expect: HookVerdict;
  readonly stop: "clear" | "exhausted" | "budget" | "seated";
  /** Popped poses, count (computed). */
  readonly poses: number;
  /** deg (computed) */
  readonly maxTiltDeg: number;
  readonly clearing: InsertPose | null;
  readonly clip: { readonly area: number; readonly bounds: readonly number[]; readonly top: number };
  readonly board: { readonly area: number; readonly bounds: readonly number[] };
  readonly path?: readonly InsertState[];
  /** Wall time of the search, ms (measured on the machine that ran it). */
  readonly wallMs: number;
}

/** Build the clip and the inset board for one case and run the insertion search. */
export async function runHookCase(c: HookCase, design: HookDesign, p: ConstantSource, opts: { readonly trace?: boolean } = {}): Promise<HookCaseResult> {
  const dims = c.dims ?? design(c.hole, c.tb);
  const k = clipConstants(p);
  const clip = await clipSection(c.tb, dims, k);
  const board = await boardSection(c.tb, c.hole, k);
  const t0 = performance.now();
  const r = await insertSearch({ moving: clip.polygons, obstacle: board.polygons, settings: insertSettings(p), ...(opts.trace === true ? { trace: true } : {}) });
  const wallMs = performance.now() - t0;
  return {
    id: c.id, hole: c.hole, tb: c.tb, dims,
    verdict: r.reached ? "INSERTS" : "TRAPPED", expect: c.expect, stop: r.stop,
    poses: r.poses, maxTiltDeg: r.maxTiltDeg, clearing: r.clearing,
    clip: { area: clip.area, bounds: clip.bounds, top: clip.info.top },
    board: { area: board.area, bounds: board.bounds },
    ...(r.path === undefined ? {} : { path: r.path }),
    wallMs,
  };
}
