// M02-T11 step 8: commit at command time. The SLUG single-vend scene runs
// through commitAtCommand under three frame schedules (every step drawn,
// 2 frames in 700 ms, no frames) and must end in one state. The control is
// the page's own loop, rebuilt here from designs/slug/legacy/slug.html
// lines 1206 to 1225 (motor advanced by the frame's dt, capped at 0.05 s):
// drawn every step it lands on the committed end state, and starved of
// frames it does not, which is the fault 03-diagnostics.md records as
// "nothing ever latches under headless". Expected values come from that
// loop and from the committed record records/slug-trials.json, never from
// commit.ts.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { capsuleGeometry } from "../src/capsule/geometry.js";
import { capsuleWorld, resetWorld, step } from "../src/capsule/solver.js";
import { applyVariant, driveStep, endStateHash, runSlugTrial, runSlugTrials, type SlugScene } from "../src/capsule/vend.js";
import { commitAtCommand } from "../src/commit.js";
import { createPrng } from "../src/prng.js";
import { SLUG_VEND1 } from "../src/scenes.js";
import { SLUG_SCENE } from "../scenes/slug.js";

const scene: SlugScene = applyVariant(SLUG_SCENE, SLUG_VEND1);
const DT = scene.drive.dt;
/** The page's frame dt cap, s (slug.html line 1210, Math.min((now-last)/1000, 0.05)). */
const PAGE_DT_CAP_S = 0.05;
/** The headless record: two frames in a 700 ms sweep (03-diagnostics.md). */
const STARVED = { frames: 2, windowS: 0.7 };

/** Steps of the vend command when nothing draws: its committed length. */
const commandSteps = (): number => {
  const r = runSlugTrial(scene, scene.seed);
  return r.steps - Math.round(scene.protocol.settleS / DT);
};

/** Frame hooks for the three schedules; each counts what it drew. */
function schedules(steps: number) {
  const every = { name: "every step drawn", drawn: 0, hook: (_s: number) => { every.drawn += 1; } };
  const period = STARVED.windowS / STARVED.frames;
  const starved = {
    name: "2 frames in 700 ms",
    drawn: 0,
    // a frame lands when the sim clock passes the next frame time
    hook: (s: number) => { if (Math.floor((s * DT) / period) > Math.floor(((s - 1) * DT) / period)) starved.drawn += 1; },
  };
  return { every, starved, none: { name: "no frames", drawn: 0 }, steps };
}

/**
 * The page's loop for one vend after a fixed-step settle: each frame
 * advances the motor by rate x min(frame dt, 0.05) and steps the physics
 * by whole DT from the frame's accumulator. frameDts lists the frames.
 */
function pageVend(frameDts: readonly number[]): { endHash: string; delivered: number } {
  const g = capsuleGeometry(scene.geometry);
  const w = capsuleWorld(g, scene.contact);
  const d = scene.drive;
  resetWorld(w, scene.protocol.capsules, createPrng(scene.seed));
  const idle = { steps: 0, target: 0 };
  for (let i = 0; i < Math.round(scene.protocol.settleS / DT); i++) driveStep(w, idle, d);
  const below = w.caps.map((c) => c.p.z < g.zDeckTop);
  let motorSteps = 0;
  const targetSteps = motorSteps + d.stepsRev;
  let acc = 0, rotor = w.rotorDeg, delivered = 0;
  for (const frame of frameDts) {
    const dt = Math.min(frame, PAGE_DT_CAP_S);
    let omega = 0;
    if (targetSteps > motorSteps) {
      const adv = Math.min(d.rate * dt, targetSteps - motorSteps);
      motorSteps += adv;
      const dDeg = adv * (d.rotorDegPerVend / d.stepsRev);
      rotor += dDeg;
      omega = (dDeg * Math.PI / 180) / Math.max(dt, 1e-6);
    }
    w.rotorDeg = rotor;
    acc += dt;
    while (acc >= DT) {
      step(w, DT, omega);
      acc -= DT;
      w.caps.forEach((c, i) => { if (!below[i] && c.p.z < g.zDeckTop) { below[i] = true; delivered += 1; } });
    }
  }
  return { endHash: endStateHash(w), delivered };
}

describe("commit at command time (M02-T11 step 8)", () => {
  const n = commandSteps();
  const s = schedules(n);
  const rows = {
    every: runSlugTrial(scene, scene.seed, s.every.hook),
    starved: runSlugTrial(scene, scene.seed, s.starved.hook),
    none: runSlugTrial(scene, scene.seed),
  };

  test("the three schedules drew what they say: every step, two frames per 700 ms, none", () => {
    expect(s.every.drawn).toBe(n);
    expect(s.starved.drawn).toBe(Math.floor((n * DT) / (STARVED.windowS / STARVED.frames)));
    expect(s.starved.drawn).toBeGreaterThan(0);
    expect(s.starved.drawn).toBeLessThan(n);
  });

  test("one end-state hash and one delivery under all three schedules", () => {
    expect(rows.starved.endHash).toBe(rows.every.endHash);
    expect(rows.none.endHash).toBe(rows.every.endHash);
    expect(rows.starved.delivered).toEqual(rows.every.delivered);
    expect(rows.none.delivered).toEqual(rows.every.delivered);
    expect(rows.every.steps).toBe(rows.none.steps);
  });

  test("the page's loop drawn at every step lands on the committed end state", () => {
    const page = pageVend(Array.from({ length: n }, () => DT));
    expect(page.endHash).toBe(rows.none.endHash);
    expect(page.delivered).toBe(rows.none.delivered[0]);
  });

  test("the page's loop starved of frames does not: the schedule decided its vend", () => {
    const starved = pageVend(Array.from({ length: s.starved.drawn }, () => STARVED.windowS / STARVED.frames));
    const none = pageVend([]);
    expect(starved.endHash).not.toBe(rows.none.endHash);
    expect(none.endHash).not.toBe(rows.none.endHash);
    expect(rows.none.delivered).toEqual([1]);
    expect(none.delivered).toBe(0);
  });

  test("a hook that throws stops the command before its outcome, never alters it", () => {
    expect(() => runSlugTrial(scene, scene.seed, () => { throw new Error("frame"); })).toThrow("frame");
    expect(runSlugTrial(scene, scene.seed).endHash).toBe(rows.none.endHash);
  });

  test("commitAtCommand commits once, steps until done, then holds", () => {
    const log: string[] = [];
    let left = 3;
    const r = commitAtCommand({ commit: () => log.push("commit"), step: () => { log.push("step"); left -= 1; }, busy: () => left > 0, holdSteps: 2 }, (k) => log.push(`frame ${k}`));
    expect(r.steps).toBe(5);
    expect(log).toEqual(["commit", "step", "frame 1", "step", "frame 2", "step", "frame 3", "step", "frame 4", "step", "frame 5"]);
  });

  test("the 8-trial vend run through commitAtCommand still ends on the committed record's hash", () => {
    const rec = JSON.parse(readFileSync(new URL("../records/slug-trials.json", import.meta.url), "utf8")) as { trials8: { result: { snapshotHash: string; passes: number; runs: number } } };
    const r = runSlugTrials(SLUG_SCENE, 8, 1, () => 0);
    expect([r.result.passes, r.result.runs, r.result.snapshotHash]).toEqual([rec.trials8.result.passes, rec.trials8.result.runs, rec.trials8.result.snapshotHash]);
  }, 60_000);
});
