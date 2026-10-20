// sim.run (M02-T11 step 3, D-106) and what the four M02 sim commands share:
// the transitional --scene argument, the SceneDeps core hands the sim
// scene registry, and the verdict of measured against declared.
//
// Every command takes --build <hbf://build/...> as spec/commands.ts states.
// Legacy designs are not chase documents until M10, so no build declares a
// sim scene yet; --scene <id> resolves a scene registered in
// packages/sim/src/scenes.ts instead. The flag is CLI-only and goes when
// every scene has a chase (M10); the MCP arguments of D-107 do not change.
//
// The sim measures. A scene that declares an expectation gets a verdict:
// pass and exit 0 when measured equals declared, fail and exit 1 when not.
// A scene that declares nothing gets verdict skip and exits 0: there was
// nothing to compare. Every outcome is computed when the command runs.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { CommandInput, ConstraintCtx, Stage, TrialResult, Verdict } from "@hackbuild/spec";
import { HOOK_CONSTANTS, hookRule } from "@hackbuild/mechanisms";
import { createProfileLookup } from "@hackbuild/profile";
import { runTrials, type Expectation, type SceneDeps, type TrialsRun } from "@hackbuild/sim";
import { cmdError } from "../errors.js";
import { sceneKinematics } from "../kinematics.js";
import { fullProfile } from "../load-build.js";
import type { CoreCtx } from "../ctx.js";
import type { CommandOut } from "../result.js";
import { DEFAULT_MACHINE } from "./constraints-query.js";

/** The CLI-only scene argument every M02 sim command takes until M10. */
export interface SceneArg {
  readonly build?: string;
  readonly scene?: string;
}

/** The scene a call names: --scene, or E_REF for a --build no chase can declare yet. */
export function sceneOf(i: SceneArg): string {
  if (i.scene !== undefined && i.build !== undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/scene", got: i.scene, expected: "--build or --scene, not both", hint: "pass one of --build and --scene" });
  }
  if (i.scene !== undefined) return i.scene;
  if (i.build !== undefined) {
    throw cmdError({
      code: "E_REF", path: "/build", got: i.build, expected: "a build whose chase declares a sim scene",
      hint: "no chase declares a sim scene before M10; legacy designs run by --scene <id>, for example --scene ogee16-cranks", record: "viewer-sim",
    });
  }
  throw cmdError({ code: "E_PARAM_MISSING", path: "/build", expected: "--build <hbf://build/...> or --scene <id>", hint: "name what to simulate with --scene <id> until the design has a chase" });
}

const ZERO = { pass: 0, warn: 0, fail: 0, skip: 0 } as const;

/** The SceneDeps of one call: profile rows, scene modules from the workspace, the mech/hook-rule binding and motion's kinematics. */
export function sceneDeps(ctx: CoreCtx): SceneDeps {
  const profile = createProfileLookup(fullProfile());
  const constant = (id: string): { readonly value: number } => profile.constant(id);
  return {
    constant,
    load: (file) => import(pathToFileURL(path.join(ctx.workspace, "packages", "sim", "scenes", file)).href) as Promise<unknown>,
    readText: (p) => readFileSync(path.join(ctx.workspace, p), "utf8"),
    // design_full: rod, bend and sweep from mech/hook-rule; tail and back gap are its profile rows (clip_poly defaults).
    hookDesign: (hole, tb) => {
      const qctx: ConstraintCtx = { profile, machine: DEFAULT_MACHINE, material: "", facts: { hole, tb } };
      const s = hookRule(qctx);
      return { d: s.d, Rb: s.Rb, sweep: s.sweep, ext: constant(HOOK_CONSTANTS.ext).value, gap: constant("hook.gap").value };
    },
    now: () => performance.now(),
    kinematics: sceneKinematics(ctx.workspace),
  };
}

/** skip when nothing is declared, else pass when measured equals declared. */
export function verdictOf(e: Expectation | null): Verdict {
  return e === null ? "skip" : e.met ? "pass" : "fail";
}

/**
 * A finished sim result. The command makes one comparison, measured against
 * declared, and counts it once under its verdict, so the status line agrees
 * with the verdict (a scene that declares nothing counts one skip, as
 * AGENT-SURFACE.md 6.2 counts a harness that compared nothing). findings
 * stays empty: the comparison is no registered check, and its declared and
 * measured lines travel in the result until the M04 checks read these
 * measurements.
 */
export function simResult<T>(result: T, e: Expectation | null, ctx: CoreCtx): CommandOut<T> {
  const verdict = verdictOf(e);
  const stage: Stage = verdict === "fail" ? "check" : "done";
  return { verdict, stage, inputsHash: ctx.inputsHash, result, findings: [], counts: { ...ZERO, [verdict]: 1 }, errors: [], artifacts: [], next: [] };
}

export type SimRunInput = Omit<CommandInput<"sim.run">, "build"> & SceneArg;

export type SimRunOutput = TrialsRun & {
  readonly closest: readonly { readonly a: string; readonly b: string; readonly mm: number }[];
  readonly trials: TrialResult;
  readonly lines: readonly string[];
};

export async function runSimRun(i: SimRunInput, ctx: CoreCtx): Promise<CommandOut<SimRunOutput>> {
  const id = sceneOf(i);
  if (i.program !== undefined) {
    throw cmdError({ code: "E_SCHEMA", path: "/program", got: i.program, expected: "absent", hint: "a scene runs its own program; leave --program out" });
  }
  const r = await runTrials(id, { ...(i.trials === undefined ? {} : { trials: i.trials }), ...(i.seed === undefined ? {} : { seed: i.seed }) }, sceneDeps(ctx));
  const t = r.trials;
  const lines = [
    `trials ${r.rows.length}  runs ${t.runs}  passes ${t.passes} (computed)  worst ${t.worst}  seed ${t.seed}`,
    `${r.hashKind === "snapshot" ? "snapshot" : "end state"} ${t.snapshotHash}`,
    ...r.rows.map((x) => `trial ${x.trial}  ${x.passes} of ${x.runs}  ${x.hash.slice(0, 12)}`),
    r.expectation === null ? `declared  nothing${r.notCompared === undefined ? "" : ` compared: ${r.notCompared}`}` : `declared  ${r.expectation.declared}`,
    ...(r.expectation === null ? [] : [`measured  ${r.expectation.measured}`]),
    `wall ${t.wallMs.toFixed(0)} ms (measured, this machine)`,
  ];
  return simResult<SimRunOutput>({ ...r, closest: [], lines }, r.expectation, ctx);
}
