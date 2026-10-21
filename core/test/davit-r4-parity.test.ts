// M02-T06 step 10 and 11: R4 parity. Expected values come from the legacy
// run record of sweep.py (stored in packages/sim/fixtures/davit-stored),
// from README_R4.md and from the R3 palm STL; the port under test is the sampled tier 1, the
// exact boolean tier 2 and the Stage B masks.
// It runs in core/test because the sweep reads every placement from
// packages/motion through core's binding; sim may not import motion (D-139).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  bindKinematics,
  calibrateConfig, davitMeshes, intersectionMm3, loadContacts, meshOfStl, PIPES, r4Cases, r4PairPoses, sampledApproach, stageBProxies, sweepPoses,
  type PipeId,
} from "../../packages/sim/scenes/davit.js";
import { kinematics } from "./kinematics-binding.js";

bindKinematics(kinematics);

const root = new URL("../../", import.meta.url);
const read = (p: string): Buffer => readFileSync(new URL(p, root));
const profile = createProfileLookup(loadProfile());
const c = (id: string): number => profile.constant(id).value;
const meshes = davitMeshes("mini");
const contacts = loadContacts();

interface LegacyRow { a: string; b: string; pipe: PipeId; mind: number; inter: number }
const legacyText = read("packages/sim/fixtures/davit-stored/davit_r4_sweep_run_2026-10-04.txt").toString("utf8");
const legacy = JSON.parse(legacyText.slice(legacyText.indexOf("\n{\n") + 1, legacyText.lastIndexOf("\n}") + 2)) as { pairs: number; tier2: number; fails: { a: string; b: string; pipe: PipeId; inter_mm3: number }[]; close: LegacyRow[] };

describe("R4 sweep.py parity, 43 pair sweeps", () => {
  test("the case list is the 43 of the legacy record", () => {
    const cases = r4Cases();
    expect(cases).toHaveLength(legacy.pairs);
    expect(cases).toHaveLength(43);
    expect(cases.filter((x) => x.pipe === "1in")).toHaveLength(6);
  });

  test("0 intersections above 0.5 mm3 except the declared pincap press fit, and the pincap volume is the legacy 3.21 mm3 (computed)", async () => {
    const hornShave = c("davit.hornHubShaveMm");
    const limit = c("davit.interferenceMm3");
    const spacing = c("davit.tier1SpacingMm"), reach = c("davit.tier2ReachMm"), keep = c("davit.tier2Poses");
    const proxies = new Map(PIPES.map((p) => [p, stageBProxies(meshes, "mini", p, { spacingMm: spacing, cellMm: c("davit.groupCellMm"), erodeMm: c("davit.penetrationMm") }).proxies]));
    const fails: { pipe: string; pair: string; mm3: number }[] = [];
    const min = new Map<string, number>();
    for (const cs of r4Cases()) {
      const approach = sampledApproach(cs, proxies.get(cs.pipe)!, reach, keep);
      min.set(`${cs.pipe}|${cs.a}|${cs.b}`, approach[0]?.dist ?? Infinity);
      const poses = r4PairPoses(cs.a, cs.b);
      let worst = 0;
      for (const x of approach) worst = Math.max(worst, await intersectionMm3(cs, poses[x.at]!, meshes, hornShave));
      if (worst > limit) fails.push({ pipe: cs.pipe, pair: `${cs.a}|${cs.b}`, mm3: worst });
    }
    expect(fails.map((f) => `${f.pipe} ${f.pair}`)).toEqual(["125in palm|pincap"]);
    expect(fails[0]!.mm3).toBeGreaterThan(3.21 * 0.9);
    expect(fails[0]!.mm3).toBeLessThan(3.21 * 1.1);
    expect(legacy.fails.map((f) => `${f.pipe} ${f.a}|${f.b}`)).toEqual(["125in palm|pincap"]);
    expect(contacts.models.mini.pairs.find((p) => p.a === "palm" && p.b === "pincap")!.fit).toBe("press");
    // Every pair the legacy sweep found within 1.0 mm is found within 1.0 mm plus half the lattice spacing.
    for (const row of legacy.close) {
      const ours = min.get(`${row.pipe}|${row.a}|${row.b}`)!;
      expect(ours, `${row.pipe} ${row.a} ${row.b}`).toBeLessThanOrEqual(Math.max(row.mind, 1.0) + spacing / 2);
    }
  }, 120_000);
});

describe("R3 grip tab fixture", () => {
  const fx = JSON.parse(readFileSync(new URL("packages/sim/fixtures/davit-r3-grip-tab/fixture.json", root), "utf8")) as {
    palm: { path: string; sha256: string }; palmFixed: { path: string }; readmeVolumeMm3: number; pair: string; pose: { pitch: number; roll: number; elbow: number; wrist: number; grip: number };
  };
  const r3Bytes = read(fx.palm.path);
  const withPalm = (bytes: Uint8Array, name: string) => new Map(meshes).set("palm", meshOfStl(bytes, name));
  const prm = { spacingMm: c("davit.sampleSpacingMm"), cellMm: c("davit.groupCellMm"), erodeMm: c("davit.penetrationMm") };
  const declared = [{ a: "mic_servo#8", b: "palm", fit: "slip" as const }];
  const run = (m: ReturnType<typeof withPalm>) => {
    const pre = stageBProxies(m, "mini", "125in", prm);
    // The pose list holds the zero pose and the grip sweep, enough to calibrate the one declared pair.
    const poses = [fx.pose, ...Array.from({ length: 44 }, (_, i) => ({ ...fx.pose, grip: 3 + i }))];
    const cal = calibrateConfig("mini", "125in", declared, pre, poses, c("davit.touchMm"), c("davit.calibMarginMm"));
    return sweepPoses({ model: "mini", pipe: "125in", side: "R", poses: [fx.pose], proxies: pre.proxies, masks: cal.masks, touchMm: c("davit.touchMm"), lookMm: c("davit.closestReachMm"), penetration: { masks: cal.masks, solids: pre.solids, marginMm: c("davit.calibMarginMm"), near: cal.cache.near } });
  };

  test("the fixture names the R3 palm by sha256", () => {
    expect(createHash("sha256").update(r3Bytes).digest("hex")).toBe(fx.palm.sha256);
  });

  test("the R3 palm and the grip servo interfere by about the README 247 mm3 (computed)", async () => {
    const m = withPalm(r3Bytes, "r3 palm");
    const v = await intersectionMm3({ pipe: "125in", a: "hw8", b: "palm" }, fx.pose, m, c("davit.hornHubShaveMm"));
    expect(v).toBeGreaterThan(fx.readmeVolumeMm3 * 0.9);
    expect(v).toBeLessThan(fx.readmeVolumeMm3 * 1.1);
  }, 60_000);

  test("with Stage B masks the sweep reports the R3 palm as a real fail, and the R4 palm as clean", () => {
    const bad = run(withPalm(r3Bytes, "r3 palm"));
    expect(bad.realFails.filter((f) => f.pair === fx.pair && f.inside === true).length).toBeGreaterThan(0);
    const good = run(meshes);
    // Only the declared pair is under test: the other bodies touch undeclared pairs here.
    expect(good.realFails.filter((f) => f.pair === fx.pair)).toEqual([]);
  }, 60_000);
});
