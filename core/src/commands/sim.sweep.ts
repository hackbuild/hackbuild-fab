// sim.sweep (M02-T11 step 4, D-106): one scene swept in its mode, pose,
// rotate, prismatic or insert. Returns clashes, sweptHash, the closest
// approach of every moving body with where it occurs, and the real fails
// of pose mode. The verdict compares measured with what the scene declares
// (sim.run.ts).

import type { CommandInput } from "@hackbuild/spec";
import { runSweep, type SweepRun } from "@hackbuild/sim";
import type { CoreCtx } from "../ctx.js";
import type { CommandOut } from "../result.js";
import { sceneDeps, sceneOf, simResult, type SceneArg } from "./sim.run.js";

export type SimSweepInput = Omit<CommandInput<"sim.sweep">, "build" | "joint"> & SceneArg & {
  /** CLI-only until M10, with --scene: the sweep mode the scene must have. */
  readonly mode?: string;
  readonly joint?: string;
};

export type SimSweepOutput = SweepRun & { readonly lines: readonly string[] };

export async function runSimSweep(i: SimSweepInput, ctx: CoreCtx): Promise<CommandOut<SimSweepOutput>> {
  const id = sceneOf(i);
  const r = await runSweep(id, { ...(i.mode === undefined ? {} : { mode: i.mode }), ...(i.steps === undefined ? {} : { steps: i.steps }) }, sceneDeps(ctx));
  const lines = [
    `mode ${r.mode}  poses ${r.poses} (computed)  swept ${r.sweptHash.slice(0, 12)}`,
    ...r.closest.map((c) => `closest  ${c.line}`),
    ...r.clashes.map((c) => `clash  ${c.body} with ${c.with}${c.mm3 === null ? "" : `  ${c.mm3.toFixed(2)} mm3`}${c.cells === undefined ? "" : `  ${c.cells} cells`} (computed)`),
    ...(r.cases ?? []).map((c) => `case  ${c.id}  hole ${c.hole} board ${c.tb}  ${c.verdict}  ${c.poses} poses  max tilt ${c.maxTiltDeg} deg (computed)`),
    ...(r.realFailCount === undefined ? [] : [`real fails ${r.realFailCount} (computed)`]),
    `declared  ${r.expectation.declared}`,
    `measured  ${r.expectation.measured}`,
    `wall ${r.wallMs.toFixed(0)} ms (measured, this machine)`,
  ];
  return simResult<SimSweepOutput>({ ...r, lines }, r.expectation, ctx);
}
