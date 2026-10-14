// The PAWL trial program, ported from designs/pawl/legacy/final.mjs (sha256
// e4e61a3dc9cc5aa8): each trial builds a fresh world, steps it at the
// world's own timestep, applies the declared push, and records attitude,
// travel and actuator saturation. The program measures; the scene declares
// the fall rule and the expected pass set, and suiteVerdict compares the
// two (D-074, D-153). The legacy text line of every trial is rebuilt so a
// run reads against the legacy records line for line.

import { commandError, didYouMean, type Hash, type Provenance } from "@hackbuild/spec";
import type { TrialResult } from "@hackbuild/spec";
import type { RapierScene, StepObserver } from "../../rapier/scene.js";
import { snapshotHash } from "../../rapier/snapshot.js";
import { withWorld, type WorldParams } from "../../rapier/world.js";
import { attitude, buildPawl, control, defaults, type PawlGait, type PawlModel } from "./core.js";

export interface PawlPush {
  /** Push time, s. */
  readonly t: number;
  /** Impulse on the torso, N s, along world x and z. */
  readonly x?: number;
  readonly z?: number;
}

export interface PawlTrialDef {
  /** The final.mjs label, kept verbatim; it is the trial's id. */
  readonly label: string;
  /** The final.mjs section heading the trial prints under. */
  readonly group: string;
  /** Run length, s. */
  readonly secs: number;
  /** Gait fields set over the model defaults. */
  readonly gait: Readonly<Partial<Pick<PawlGait, "mode" | "hgt" | "imu" | "T" | "S" | "A">>>;
  readonly push?: PawlPush;
}

/**
 * When a trial counts as fallen (final.mjs lines 14 to 17): after afterS, the
 * torso tilt above tiltDeg or the torso height below minTorsoM.
 */
export interface PawlFallRule {
  /** Settling time before the rule applies, s. */
  readonly afterS: number;
  /** Tilt limit, deg; the larger of torso pitch and roll. */
  readonly tiltDeg: number;
  /** Torso origin height floor, m. */
  readonly minTorsoM: number;
  readonly provenance: Provenance;
}

export interface PawlScene {
  readonly id: string;
  readonly world: WorldParams;
  readonly model: PawlModel;
  readonly fall: PawlFallRule;
  readonly trials: readonly PawlTrialDef[];
  readonly trialsProvenance: Provenance;
  /** Seed recorded in TrialResult; the PAWL program draws no random numbers. */
  readonly seed: number;
  /** Declared outcome per trial (D-074): labels that stand and labels that fall. */
  readonly expected: { readonly pass: readonly string[]; readonly fall: readonly string[]; readonly source: string };
  /** "met", or "blocked: <reason>" while the measured set differs and an owner question is open. */
  readonly status: string;
  /** Labels whose wording disagrees with the declared outcome, with the question it raises. */
  readonly labelNotes: readonly { readonly label: string; readonly note: string }[];
}

export interface PawlTrialRow {
  readonly label: string;
  readonly group: string;
  /** No fall by the scene's rule, boolean (measured against the declared rule). */
  readonly ok: boolean;
  /** First time the fall rule held, s; null when it never held. */
  readonly fellS: number | null;
  /** Largest torso tilt after the settling time, deg. */
  readonly tiltDeg: number;
  /** Final torso z and x, mm (travel forward, drift sideways); final torso height, mm. */
  readonly travelMm: number;
  readonly driftMm: number;
  readonly heightMm: number;
  /** Peak actuator saturation after the settling time, ratio of the torque ceiling; and its joint id. */
  readonly peakSat: number;
  readonly peakJoint: string;
  /** sha256 of the final world snapshot. */
  readonly snapshotHash: Hash;
  /** world.step() calls made, count. */
  readonly steps: number;
  /** The trial as final.mjs prints it. */
  readonly line: string;
}

/** final.mjs `s(r)` and `T(n, r)`: the label padded to 26, then the result. */
export function legacyLine(label: string, r: Pick<PawlTrialRow, "ok" | "fellS" | "tiltDeg" | "travelMm" | "driftMm" | "heightMm" | "peakSat" | "peakJoint">): string {
  const head = r.ok ? "PASS" : `FAIL @${(r.fellS ?? 0).toFixed(1)}s`;
  return ` ${label.padEnd(26)} ${head}  tilt ${r.tiltDeg.toFixed(1)}deg  y${r.heightMm.toFixed(0)}  `
    + `travel ${r.travelMm.toFixed(0)}mm  drift ${r.driftMm.toFixed(0)}mm  peak ${(r.peakSat * 100).toFixed(0)}% ${r.peakJoint}`;
}

/** One trial on a fresh world, freed before return; observe, when given, sees the world after every step. */
export function runPawlTrial(scene: PawlScene, trial: PawlTrialDef, observe?: StepObserver): Promise<PawlTrialRow> {
  return withWorld(scene.world, (world, R) => {
    const m = scene.model, rig = buildPawl(R, world, m), torso = rig.bodies.torso!;
    const P = defaults(m);
    Object.assign(P, trial.gait);
    const DT = world.timestep, N = Math.round(trial.secs / DT);
    const rule = scene.fall;
    let mt = 0, fell: number | null = null, peak = 0, pid = "";
    for (let n = 0; n < N; n++) {
      if (P.mode === "walk") P.phase = (P.phase + DT / P.T) % 1;
      P.t += DT;
      control(m, P, rig, DT);
      const push = trial.push;
      if (push && Math.abs(n * DT - push.t) < DT / 2) torso.applyImpulse({ x: push.x || 0, y: 0, z: push.z || 0 }, true);
      world.step();
      observe?.(world, n + 1);
      if (n * DT > rule.afterS) {
        const A = attitude(rig.bodies), t = torso.translation();
        const ti = Math.max(Math.abs(A.pitch), Math.abs(A.roll)) * 180 / Math.PI;
        mt = Math.max(mt, ti);
        for (const j of rig.J) if (j.sat > peak) { peak = j.sat; pid = j.id; }
        if (fell === null && (ti > rule.tiltDeg || t.y < rule.minTorsoM)) fell = n * DT;
      }
    }
    const t = torso.translation();
    const r = { ok: fell === null, fellS: fell, tiltDeg: mt, travelMm: t.z * 1000, driftMm: t.x * 1000, heightMm: t.y * 1000, peakSat: peak, peakJoint: pid };
    return { label: trial.label, group: trial.group, ...r, snapshotHash: snapshotHash(world), steps: N, line: legacyLine(trial.label, r) };
  });
}

/**
 * The suite as a Rapier scene for the snapshot record (M02-T04): one trial
 * per label in declaration order, each at the scene seed. Its world rows are
 * the T01 file, which pawl-suite.test.ts holds equal to scene.world.
 */
export function pawlRapierScene(scene: PawlScene): RapierScene {
  return {
    id: scene.id,
    worldRows: "test/fixtures/pawl-world.json",
    trials: scene.trials.map((t) => ({ trial: t.label, seed: scene.seed })),
    run: async (world, t, observe) => {
      const def = scene.trials.find((d) => d.label === t.trial);
      if (def === undefined) {
        throw commandError({ code: "E_REF", path: `/${scene.id}/trials`, got: t.trial, expected: "a trial label of the scene", didYouMean: didYouMean(t.trial, scene.trials.map((d) => d.label)), hint: `scene ${scene.id} has no trial ${t.trial}` });
      }
      const row = await runPawlTrial({ ...scene, world }, def, observe);
      return { snapshotHash: row.snapshotHash, steps: row.steps };
    },
  };
}

export interface PawlVerdict {
  /** Labels measured standing and declared standing, in trial order. */
  readonly measuredPass: readonly string[];
  readonly declaredPass: readonly string[];
  /** Labels that stand only in the run, and labels that stand only in the declaration. */
  readonly onlyMeasured: readonly string[];
  readonly onlyDeclared: readonly string[];
  /** 0 when the measured set equals the declared set, 1 otherwise (D-153). */
  readonly exitCode: 0 | 1;
}

/** Measured pass set against the scene's declared set. */
export function suiteVerdict(scene: PawlScene, rows: readonly Pick<PawlTrialRow, "label" | "ok">[]): PawlVerdict {
  const measuredPass = rows.filter((r) => r.ok).map((r) => r.label);
  const declared = new Set(scene.expected.pass), measured = new Set(measuredPass);
  const declaredPass = scene.trials.map((t) => t.label).filter((l) => declared.has(l));
  const onlyMeasured = measuredPass.filter((l) => !declared.has(l));
  const onlyDeclared = declaredPass.filter((l) => !measured.has(l));
  const same = onlyMeasured.length === 0 && onlyDeclared.length === 0 && rows.length === scene.trials.length;
  return { measuredPass, declaredPass, onlyMeasured, onlyDeclared, exitCode: same ? 0 : 1 };
}

export interface PawlSuiteResult {
  readonly scene: string;
  readonly status: string;
  readonly rows: readonly PawlTrialRow[];
  readonly verdict: PawlVerdict;
  readonly trials: TrialResult;
}

/** Every trial in declaration order; wallMs is this machine's measurement. */
export async function runPawlSuite(scene: PawlScene, clock: () => number = Date.now): Promise<PawlSuiteResult> {
  const t0 = clock();
  const rows: PawlTrialRow[] = [];
  for (const trial of scene.trials) rows.push(await runPawlTrial(scene, trial));
  const wallMs = clock() - t0;
  let worst = rows[0]!;
  for (const r of rows) if (r.tiltDeg > worst.tiltDeg) worst = r;
  const verdict = suiteVerdict(scene, rows);
  return {
    scene: scene.id, status: scene.status, rows, verdict,
    trials: { runs: rows.length, passes: verdict.measuredPass.length, worst: worst.label, seed: scene.seed, snapshotHash: rows[rows.length - 1]!.snapshotHash, wallMs },
  };
}

/**
 * The whole stdout final.mjs prints for these rows: a heading when the
 * group changes, one line per trial, then the pass count line with its
 * legacy wording, so a run hashes against the legacy records.
 */
export function legacyOutput(rows: readonly Pick<PawlTrialRow, "group" | "line" | "ok">[]): string {
  const out: string[] = [];
  let group = "";
  for (const r of rows) {
    if (r.group !== group) { group = r.group; out.push(group); }
    out.push(r.line);
  }
  const pass = rows.filter((r) => r.ok).length;
  out.push("", `${pass}/${rows.length} pass (the open-loop case is expected to fail)`);
  return `${out.join("\n")}\n`;
}
