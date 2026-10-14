// M02-T05: the admission flag against the two runtime records. The flag is
// true only when records/granular30-x64.json and -arm64.json both exist,
// each holds 30 trials with a snapshotHash, the hashes for one seed match
// across the files, and both were written by CI (machine.image not "local",
// because T04 is green only when the CI determinism compare has run).

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { simSnapshotsAdmitted } from "../src/admission.js";

const REC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "records");
interface Rec {
  machine: { arch: string; image: string };
  pin: string; runs: number; trialCount: number;
  trialWallMs: { p50: number; p90: number };
  trials: Record<string, { seed: number; snapshotHash: string; steps: number }>;
}
const read = (arch: string): Rec | undefined => {
  const f = path.join(REC, `granular30-${arch}.json`);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Rec) : undefined;
};
const x64 = read("x64");
const arm = read("arm64");

const valid = (r: Rec | undefined): boolean =>
  r !== undefined && Object.keys(r.trials).length === 30 && Object.values(r.trials).every((t) => /^[0-9a-f]{64}$/.test(t.snapshotHash));
const same = (a: Rec, b: Rec): boolean =>
  Object.entries(a.trials).every(([k, t]) => b.trials[k]?.snapshotHash === t.snapshotHash && b.trials[k]?.seed === t.seed);
const fromCi = (r: Rec | undefined): boolean => r !== undefined && r.machine.image !== "local";
const expected = valid(x64) && valid(arm) && fromCi(x64) && fromCi(arm) && same(x64!, arm!);

describe("sim snapshot admission (M02-T05, D-134, D-051)", () => {
  test("the flag equals the condition computed from the records", () => {
    expect(simSnapshotsAdmitted).toBe(expected);
  });

  test("each local record holds 30 trials with a hash, seeds 1 to 30, 3 runs, p50 and p90 present", () => {
    for (const r of [x64, arm]) {
      expect(r, "record file missing").toBeDefined();
      expect(valid(r)).toBe(true);
      expect(r!.pin).toContain("rapier3d-deterministic-compat 0.21.0");
      expect(Object.values(r!.trials).map((t) => t.seed).sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
      expect(r!.runs).toBeGreaterThanOrEqual(3);
      expect(r!.trialWallMs.p90).toBeGreaterThanOrEqual(r!.trialWallMs.p50);
      expect(Object.values(r!.trials).every((t) => t.steps === 2400)).toBe(true);
    }
    expect(x64!.machine.arch).toBe("x64");
    expect(arm!.machine.arch).toBe("arm64");
  });

  test("hashes for one seed match across the two files", () => {
    expect(same(x64!, arm!)).toBe(true);
  });

  test("the condition rejects a missing file, a short file, a differing hash and a local runner", () => {
    const base = structuredClone(x64!);
    const short = structuredClone(base);
    delete short.trials[Object.keys(short.trials)[0]!];
    expect(valid(short)).toBe(false);
    expect(valid(undefined)).toBe(false);
    const moved = structuredClone(base);
    const k = Object.keys(moved.trials)[3]!;
    moved.trials[k]!.snapshotHash = "0".repeat(64);
    expect(same(base, moved)).toBe(false);
    expect(fromCi(base)).toBe(false);
  });
});
