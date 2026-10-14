// SLUG vend protocol and multi-trial runner (M02-T08 steps 3 to 6). The
// motor runs in sim time: motorSteps advances by rate x dt per step until
// targetSteps, and the rotor turns DEG_PER_STEP per half step, as the page's
// loop does with its frame time (slug.html lines 1208 to 1222; lineage
// slug.vend-drive/slug-12). A vend command commits the target at the
// command; the physics then reports which capsules cross below the deck
// top. The runner reads no clock for the physics and decides nothing: the
// scene declares the expectation and slugVerdict compares (D-064, D-074).
// Each trial i of a run draws from its own generator, seeded seed + i.

import { canonicalize, commandError, sha256Hex, type Hash, type Provenance, type TrialResult } from "@hackbuild/spec";
import { createPrng } from "../prng.js";
import { capsuleGeometry, inHood, type CapsuleGeometryRows, type ContactRows } from "./geometry.js";
import { capsuleWorld, resetWorld, step, type CapsuleWorld } from "./solver.js";
import { commitAtCommand, type FrameHook } from "../commit.js";

/** The 28BYJ-48 drive as the page runs it. */
export interface DriveRows {
  /** Half steps per output revolution, count (line 224). */
  readonly stepsRev: number;
  /** Rotor turn per vend, deg: one pocket of four (line 226). */
  readonly rotorDegPerVend: number;
  /** Step rate, half steps/s (slider default, line 958). */
  readonly rate: number;
  /** Fixed physics step, s (line 1208). */
  readonly dt: number;
  readonly provenance: Provenance;
}

/** What one trial does, in order (M02-T08 step 4). */
export interface VendProtocol {
  /** Capsules spawned at reset, count. */
  readonly capsules: number;
  /** Sim time before the first coin, s. */
  readonly settleS: number;
  /** Vends per trial, count. */
  readonly vends: number;
  /** Sim time after the motor reaches its target, s; part of the vend's window. */
  readonly afterS: number;
  readonly provenance: Provenance;
}

/** The declared result a run is compared against (D-074). */
export interface SlugExpectation {
  readonly trials: number;
  /** Vends over all trials, count. */
  readonly runs: number;
  readonly passes: number;
  /** Every miss falls on one of these vend numbers (1-based). */
  readonly missVends: readonly number[];
  readonly source: string;
}

export interface SlugScene {
  readonly id: string;
  readonly geometry: CapsuleGeometryRows;
  readonly contact: ContactRows;
  readonly drive: DriveRows;
  readonly protocol: VendProtocol;
  /** Trials and the first seed when a command does not say. Multi-trial by default. */
  readonly trials: number;
  readonly seed: number;
  readonly expected: SlugExpectation | null;
  /** "unverified" until a run reproduces the expectation (D-136). */
  readonly status: string;
}

/** A scene that differs from a base scene in named geometry rows and protocol fields. */
export interface SlugSceneVariant {
  readonly id: string;
  readonly base: string;
  readonly geometry: Partial<Omit<CapsuleGeometryRows, "provenance">> & { readonly provenance: Provenance };
  readonly protocol: Partial<Omit<VendProtocol, "provenance">> & { readonly provenance: Provenance };
  readonly trials: number;
  readonly seed: number;
  readonly status: string;
}

export function applyVariant(base: SlugScene, v: SlugSceneVariant): SlugScene {
  if (v.base !== base.id) throw commandError({ code: "E_REF", path: "/base", got: base.id, expected: v.base, hint: `variant ${v.id} names base scene ${v.base}` });
  return {
    ...base,
    id: v.id,
    geometry: { ...base.geometry, ...v.geometry },
    protocol: { ...base.protocol, ...v.protocol },
    trials: v.trials,
    seed: v.seed,
    expected: null,
    status: v.status,
  };
}

export interface SlugTrialRow {
  readonly seed: number;
  readonly vends: number;
  /** Vends that delivered exactly one capsule, count (computed). */
  readonly passes: number;
  /** Capsules delivered in each vend's window, in vend order, count (computed). */
  readonly delivered: readonly number[];
  readonly misses: readonly { readonly vend: number; readonly delivered: number }[];
  /** Capsules that crossed below the deck top before the first vend, count (computed). */
  readonly beforeFirstVend: number;
  /** Each crossing below the deck top: vend number (0 before the first), capsule index, step from 1 (computed). */
  readonly crossings: readonly { readonly vend: number; readonly capsule: number; readonly step: number }[];
  /** Capsules still above the deck top at the end, and those resting on the hood, count (computed). */
  readonly leftAbove: number;
  readonly onHood: number;
  readonly steps: number;
  /** sha256 over capsule centres rounded to 1e-6 mm at the end of the trial. */
  readonly endHash: Hash;
}

/** Rounding of the end-state hash, 1/mm: centres are hashed as integers of 1e-6 mm. */
export const END_HASH_SCALE = 1e6;

export function endStateHash(w: CapsuleWorld): Hash {
  const at = (v: number): number => Math.round(v * END_HASH_SCALE);
  return sha256Hex(canonicalize({ unit: "1e-6 mm", centres: w.caps.map((c) => [at(c.p.x), at(c.p.y), at(c.p.z)]) })) as Hash;
}

/** Vends that did not deliver exactly one capsule, 1-based, with their counts. */
export function missesOf(delivered: readonly number[]): { vend: number; delivered: number }[] {
  return delivered.flatMap((n, i) => (n === 1 ? [] : [{ vend: i + 1, delivered: n }]));
}

/** Motor state in half steps; the page's motorSteps and targetSteps. */
interface Motor {
  steps: number;
  target: number;
}

/** One physics step with the motor driven in sim time (the body of the page loop at frame dt = DT). */
export function driveStep(w: CapsuleWorld, m: Motor, d: DriveRows): void {
  let omega = 0;
  if (m.target > m.steps) {
    const adv = Math.min(d.rate * d.dt, m.target - m.steps);
    m.steps += adv;
    const dDeg = adv * (d.rotorDegPerVend / d.stepsRev);
    w.rotorDeg += dDeg;
    omega = (dDeg * Math.PI / 180) / d.dt;
  }
  step(w, d.dt, omega);
}

/**
 * Runs one trial of the scene's protocol with the given seed. Each vend is
 * one command through commitAtCommand; `frame` sees every vend step and
 * draws only (M02-T11 step 8).
 */
export function runSlugTrial(scene: SlugScene, seed: number, frame?: FrameHook): SlugTrialRow {
  const g = capsuleGeometry(scene.geometry);
  const w = capsuleWorld(g, scene.contact);
  const { drive: d, protocol: pr } = scene;
  resetWorld(w, pr.capsules, createPrng(seed));
  const m: Motor = { steps: 0, target: 0 };
  const below = w.caps.map((c) => c.p.z < g.zDeckTop);
  let steps = 0;
  const crossings: { vend: number; capsule: number; step: number }[] = [];
  let vend = 0;
  const tick = (): number => {
    driveStep(w, m, d);
    steps++;
    let n = 0;
    w.caps.forEach((c, i) => {
      if (!below[i] && c.p.z < g.zDeckTop) { below[i] = true; n++; crossings.push({ vend, capsule: i, step: steps }); }
    });
    return n;
  };
  let beforeFirstVend = 0;
  const settle = Math.round(pr.settleS / d.dt), after = Math.round(pr.afterS / d.dt);
  for (let i = 0; i < settle; i++) beforeFirstVend += tick();
  const delivered: number[] = [];
  for (let v = 0; v < pr.vends; v++) {
    vend = v + 1;
    let n = 0;
    // coin, then vend: the page's btnVend commits the target when pressed (lines 965 to 969)
    commitAtCommand({
      commit: () => { m.target = m.steps + d.stepsRev; },
      step: () => { n += tick(); },
      busy: () => m.target > m.steps,
      holdSteps: after,
    }, frame);
    delivered.push(n);
  }
  const misses = missesOf(delivered);
  return {
    seed,
    vends: pr.vends,
    passes: pr.vends - misses.length,
    delivered,
    misses,
    beforeFirstVend,
    crossings,
    leftAbove: w.caps.filter((c) => c.p.z >= g.zDeckTop).length,
    onHood: w.caps.filter((c) => c.p.z > g.zCeilTop && inHood(g, c.p.x, c.p.y)).length,
    steps,
    endHash: endStateHash(w),
  };
}

export interface SlugRun {
  readonly result: TrialResult;
  readonly rows: readonly SlugTrialRow[];
}

/**
 * Runs n trials, seeds seed to seed + n - 1. runs counts vends (M02-T08
 * acceptance), snapshotHash is the last trial's end hash, wallMs is read
 * from `now` around the run and never reaches the physics.
 */
export function runSlugTrials(scene: SlugScene, n = scene.trials, seed = scene.seed, now: () => number = Date.now): SlugRun {
  if (!Number.isInteger(n) || n < 1) throw commandError({ code: "E_SCHEMA", path: "/trials", got: String(n), expected: "an integer from 1", hint: "multi-trial by default; pass --trials 8" });
  const t0 = now();
  const rows: SlugTrialRow[] = [];
  for (let i = 0; i < n; i++) rows.push(runSlugTrial(scene, seed + i));
  const wallMs = now() - t0;
  const first = rows.find((r) => r.misses.length > 0);
  const miss = first?.misses[0];
  return {
    rows,
    result: {
      runs: rows.reduce((s, r) => s + r.vends, 0),
      passes: rows.reduce((s, r) => s + r.passes, 0),
      worst: first === undefined || miss === undefined ? "none" : `seed ${first.seed} vend ${miss.vend}: ${miss.delivered} delivered`,
      seed,
      snapshotHash: rows[rows.length - 1]!.endHash,
      wallMs,
    },
  };
}

export interface SlugVerdict {
  /** True when runs, passes and every miss position equal the declaration. */
  readonly met: boolean;
  /** The Exit row text (M02-T08 acceptance). */
  readonly line: string;
}

export function slugVerdict(scene: SlugScene, run: SlugRun): SlugVerdict {
  const e = scene.expected;
  const { runs, passes } = run.result;
  const met = e !== null
    && run.rows.length === e.trials
    && runs === e.runs
    && passes === e.passes
    && run.rows.every((r) => r.misses.every((x) => e.missVends.includes(x.vend)));
  return { met, line: met ? `${passes} of ${runs} reproduced` : `unverified, measured ${passes} of ${runs}` };
}
