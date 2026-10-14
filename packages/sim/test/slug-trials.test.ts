// M02-T08 trials: the seeded SLUG vend protocol. Expected values come from
// outside the code under test: the committed record records/slug-trials.json
// (written by `npm run slug:trials -w packages/sim`), BUILD.md's declared
// 126 of 128 as the scene states it, and a node:crypto rebuild of the
// end-state hash layout. The 30-trial run is in the record only; the
// default run repeats the 8-trial and the 58 mm mouth sets (about 15 s
// measured on an Apple M1).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { TrialResult } from "@hackbuild/spec";
import { capsuleGeometry } from "../src/capsule/geometry.js";
import { capsuleWorld, resetWorld } from "../src/capsule/solver.js";
import {
  applyVariant, endStateHash, missesOf, runSlugTrial, runSlugTrials, slugVerdict, type SlugRun, type SlugTrialRow,
} from "../src/capsule/vend.js";
import { createPrng } from "../src/prng.js";
import { SLUG_MOUTH58 } from "../scenes/slug-mouth58.js";
import { SLUG_SCENE } from "../scenes/slug.js";

const SIM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(SIM, "..", "..");

interface RecordSet { readonly result: TrialResult; readonly rows: readonly SlugTrialRow[] }
const rec = JSON.parse(readFileSync(path.join(SIM, "records", "slug-trials.json"), "utf8")) as {
  readonly exitRow: string;
  readonly machine: { readonly cpu: string; readonly arch: string };
  readonly trials8: RecordSet;
  readonly trials30: RecordSet;
  readonly mouth58: RecordSet & { readonly meanPasses: number; readonly mouth156MeanPasses: number; readonly belowMouth156: boolean };
};
const build = readFileSync(path.join(ROOT, "designs", "slug", "legacy", "BUILD.md"), "utf8").split("\n");

/** Physics outcome of a run: everything but the wall time. */
const outcome = (r: SlugRun): unknown => ({ ...r.result, wallMs: undefined, rows: r.rows });
const mean = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Per-test ceiling for the multi-trial cases, ms; packages/sim has no vitest config of its own. */
const TRIAL_TIMEOUT_MS = 60_000;

const run8 = runSlugTrials(SLUG_SCENE, 8, 1, () => 0);

describe("SLUG seeded trials (M02-T08)", () => {
  test("two runs of seed 1 give one end-state hash, equal to the committed record", () => {
    const again = runSlugTrial(SLUG_SCENE, 1);
    expect(again.endHash).toBe(run8.rows[0]!.endHash);
    expect(again.endHash).toBe(rec.trials8.rows[0]!.endHash);
    expect(again.endHash).toMatch(/^[0-9a-f]{64}$/);
    // a different seed moves the end state
    expect(run8.rows[1]!.endHash).not.toBe(again.endHash);
  }, TRIAL_TIMEOUT_MS);

  test("the 8-trial run equals the committed record: 128 vends, seeds 1 to 8, every delivery count and hash", () => {
    expect(run8.result.runs).toBe(128);
    expect(run8.rows.map((r) => r.seed)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(run8.rows).toEqual(rec.trials8.rows);
    expect({ ...run8.result, wallMs: 0 }).toEqual({ ...rec.trials8.result, wallMs: 0 });
    for (const r of run8.rows) {
      expect(r.delivered).toHaveLength(16);
      expect(r.passes).toBe(r.delivered.filter((n) => n === 1).length);
      expect(r.misses.map((m) => m.vend)).toEqual(r.delivered.flatMap((n, i) => (n === 1 ? [] : [i + 1])));
      // 18 capsules: every one is delivered or still above the deck
      expect(r.delivered.reduce((s, n) => s + n, r.beforeFirstVend) + r.leftAbove).toBe(18);
    }
    const first = run8.rows.find((r) => r.misses.length > 0);
    expect(run8.result.worst).toBe(first === undefined ? "none" : `seed ${first.seed} vend ${first.misses[0]!.vend}: ${first.misses[0]!.delivered} delivered`);
  });

  test("the exit row carries the status the port earned", () => {
    const v = slugVerdict(SLUG_SCENE, run8);
    expect(rec.exitRow).toBe(v.line);
    expect(v.line).toBe(v.met ? "126 of 128 reproduced" : `unverified, measured ${run8.result.passes} of 128`);
    expect(SLUG_SCENE.status).toBe(v.met ? "met" : "unverified");
  });

  test("the declared expectation is BUILD.md line 266 and the verdict compares count and miss positions", () => {
    expect(build[265]).toContain("126 of 128 vends across eight trials delivered exactly one capsule");
    expect(build[266]).toContain("both the first vend of a run");
    expect(SLUG_SCENE.expected).toMatchObject({ trials: 8, runs: 128, passes: 126, missVends: [1] });
    const row = (seed: number, delivered: number[]): SlugTrialRow => {
      const misses = delivered.flatMap((n, i) => (n === 1 ? [] : [{ vend: i + 1, delivered: n }]));
      return { seed, vends: 16, passes: 16 - misses.length, delivered, misses, beforeFirstVend: 0, crossings: [], leftAbove: 0, onHood: 0, steps: 0, endHash: rec.trials8.rows[0]!.endHash };
    };
    const ones = Array<number>(16).fill(1);
    const firstMiss = [0, ...ones.slice(1)];
    const lateMiss = [...ones.slice(0, 15), 0];
    const synth = (rows: SlugTrialRow[]): SlugRun => ({
      rows,
      result: { runs: rows.length * 16, passes: rows.reduce((s, r) => s + r.passes, 0), worst: "x", seed: 1, snapshotHash: rows[0]!.endHash, wallMs: 0 },
    });
    const met = synth([row(1, firstMiss), row(2, firstMiss), ...[3, 4, 5, 6, 7, 8].map((s) => row(s, ones))]);
    expect(slugVerdict(SLUG_SCENE, met)).toEqual({ met: true, line: "126 of 128 reproduced" });
    const wrongPlace = synth([row(1, firstMiss), row(2, lateMiss), ...[3, 4, 5, 6, 7, 8].map((s) => row(s, ones))]);
    expect(slugVerdict(SLUG_SCENE, wrongPlace)).toEqual({ met: false, line: "unverified, measured 126 of 128" });
    const oneMiss = synth([row(1, firstMiss), ...[2, 3, 4, 5, 6, 7, 8].map((s) => row(s, ones))]);
    expect(slugVerdict(SLUG_SCENE, oneMiss).line).toBe("unverified, measured 127 of 128");
    const sevenTrials = synth([row(1, firstMiss), row(2, firstMiss), ...[3, 4, 5, 6, 7].map((s) => row(s, ones)), row(8, ones)].slice(0, 7));
    expect(slugVerdict(SLUG_SCENE, sevenTrials).met).toBe(false);
  });

  test("the 30-trial record holds seeds 1 to 30 and repeats the 8-trial rows", () => {
    expect(rec.trials30.rows.map((r) => r.seed)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(rec.trials30.rows.slice(0, 8)).toEqual(rec.trials8.rows);
    expect(rec.trials30.result.runs).toBe(480);
    expect(rec.trials30.result.passes).toBe(rec.trials30.rows.reduce((s, r) => s + r.passes, 0));
    expect(rec.trials30.result.wallMs).toBeGreaterThan(0);
    expect(rec.machine.cpu.length).toBeGreaterThan(0);
  });

  test("a miss is any vend that does not deliver exactly one capsule", () => {
    expect(missesOf([1, 2, 0, 1, 3])).toEqual([{ vend: 2, delivered: 2 }, { vend: 3, delivered: 0 }, { vend: 5, delivered: 3 }]);
    expect(missesOf([1, 1])).toEqual([]);
  });

  test("without the hood the exit pocket refills: capsules leak before the first coin and a vend hands out two (BUILD.md lines 219 to 221)", () => {
    expect(build.slice(218, 221).join(" ")).toContain("Without the hood, the pocket sitting on the exit is refilled from above");
    const open = { ...SLUG_SCENE, geometry: { ...SLUG_SCENE.geometry, hood: { ...SLUG_SCENE.geometry.hood, r: 0 } }, protocol: { ...SLUG_SCENE.protocol, vends: 4 } };
    const hooded = run8.rows[0]!;
    const bare = runSlugTrial(open, 1);
    expect(hooded.beforeFirstVend).toBe(0);
    expect(hooded.delivered.slice(0, 4)).toEqual([1, 1, 1, 1]);
    expect(bare.beforeFirstVend).toBeGreaterThan(0);
    expect(Math.max(...bare.delivered)).toBeGreaterThan(1);
    expect(bare.misses.length).toBeGreaterThan(0);
    // every crossing is counted once, in the window of the vend it fell in
    expect(bare.crossings.filter((c) => c.vend === 0)).toHaveLength(bare.beforeFirstVend);
    expect([1, 2, 3, 4].map((v) => bare.crossings.filter((c) => c.vend === v).length)).toEqual(bare.delivered);
    expect(new Set(bare.crossings.map((c) => c.capsule)).size).toBe(bare.crossings.length);
  }, TRIAL_TIMEOUT_MS);

  test("the outcome does not depend on the clock the run reads", () => {
    let t = 0;
    const jumpy = (): number => (t += 1e9);
    const a = runSlugTrials(SLUG_SCENE, 1, 3, jumpy);
    const b = runSlugTrials(SLUG_SCENE, 1, 3, () => 0);
    expect(outcome(a)).toEqual(outcome(b));
    expect(a.result.wallMs).toBe(1e9);
  }, TRIAL_TIMEOUT_MS);

  test("the end-state hash is sha256 over JCS of centres in integer 1e-6 mm", () => {
    const w = capsuleWorld(capsuleGeometry(SLUG_SCENE.geometry), SLUG_SCENE.contact);
    resetWorld(w, 3, createPrng(1));
    w.caps[0]!.p.x += 0.0000004;
    const centres = w.caps.map((c) => [c.p.x, c.p.y, c.p.z].map((v) => Math.round(v * 1e6)));
    const text = `{"centres":${JSON.stringify(centres)},"unit":"1e-6 mm"}`;
    expect(endStateHash(w)).toBe(createHash("sha256").update(text).digest("hex"));
    w.caps[0]!.p.x += 0.000001;
    expect(endStateHash(w)).not.toBe(createHash("sha256").update(text).digest("hex"));
  });

  test("58 mm mouth: six trials of 13 vends equal the record; its mean against the 156 mm mouth is recorded", () => {
    const scene = applyVariant(SLUG_SCENE, SLUG_MOUTH58);
    expect(scene.geometry.fb * 2).toBe(58);
    expect(scene.protocol.vends).toBe(13);
    expect(capsuleGeometry(scene.geometry).funPlanes).not.toEqual(capsuleGeometry(SLUG_SCENE.geometry).funPlanes);
    const r = runSlugTrials(scene, scene.trials, scene.seed, () => 0);
    expect(r.rows).toEqual(rec.mouth58.rows);
    const m58 = mean(r.rows.map((x) => x.passes));
    const m156 = mean(run8.rows.slice(0, 6).map((x) => x.delivered.slice(0, 13).filter((n) => n === 1).length));
    expect([m58, m156]).toEqual([rec.mouth58.meanPasses, rec.mouth58.mouth156MeanPasses]);
    // M02-T08 step 7 expects m58 below m156. The canonical page's solver does
    // not arch at 58 mm (card defect, M02-T08); the record states the
    // comparison and this line fails if a change flips it without a re-record.
    expect(m58 < m156).toBe(rec.mouth58.belowMouth156);
  }, TRIAL_TIMEOUT_MS);
});
