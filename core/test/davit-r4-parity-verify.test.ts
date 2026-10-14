// M02-T06 step 9: our generator and masks on the R4 STLs reproduce
// verify_sim.py. The 420 poses are the ones verify_sim.py draws from
// default_rng(7) (written by packages/sim/scripts/davit_r4_poses_golden.py); the legacy run
// gives 0 fails and 25 unmasked contacts at the zero pose (computed
// 2026-10-04, designs/davit/legacy/r4/records/davit_r4_verify_sim_run_2026-10-04.txt).
// It runs in core/test because the sweep reads every placement from
// packages/motion through core's binding; sim may not import motion (D-139).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { newCalibrationCache } from "../../packages/sim/src/proxy/masks.js";
import { collide } from "../../packages/sim/src/proxy/collide.js";
import {
  bindKinematics,
  calibrateConfig, davitBodies, davitMeshes, declaredPairs, FULL_SWEEP, gatedPoseSet, loadContacts, PIPES, PRESETS, stageBProxies, sweepPoses, type PipeId,
} from "../../packages/sim/scenes/davit.js";
import type { DavitPose } from "@hackbuild/motion";
import { kinematics } from "./kinematics-binding.js";

bindKinematics(kinematics);

const root = new URL("../../", import.meta.url);
const profile = createProfileLookup(loadProfile());
const c = (id: string): number => profile.constant(id).value;
const golden = JSON.parse(readFileSync(new URL("packages/sim/test/goldens/davit-r4-poses.json", root), "utf8")) as { verifySimSha256: string; order: string[]; poses: Record<PipeId, number[][]> };
const toPose = (t: number[]): DavitPose => ({ pitch: t[0]!, roll: t[1]!, elbow: t[2]!, wrist: t[3]!, grip: t[4]! });
const legacyRun = readFileSync(new URL("designs/davit/legacy/r4/records/davit_r4_verify_sim_run_2026-10-04.txt", root), "utf8");

describe("verify_sim.py parity", () => {
  test("the pose golden was drawn by the verify_sim.py in the repo: 138, 144 and 138 poses, 420 in all", () => {
    expect(golden.verifySimSha256).toBe(createHash("sha256").update(readFileSync(new URL("designs/davit/legacy/r4/verify_sim.py", root))).digest("hex"));
    expect(golden.order).toEqual(["pitch", "roll", "elbow", "wrist", "grip"]);
    expect(PIPES.map((p) => golden.poses[p].length)).toEqual([138, 144, 138]);
    expect(legacyRun).toContain("legal-pose fails: 0");
    expect(legacyRun).toContain("unmasked zero-pose contacts (expect >5): 25");
  });

  const pipes = FULL_SWEEP ? PIPES : (["125in"] as const);
  test(`0 fails over the ${FULL_SWEEP ? "420" : "144 (125in)"} poses with Stage B masks calibrated on the gated set, and more than 5 contacts unmasked at the zero pose`, () => {
    const meshes = davitMeshes("mini");
    const prm = { spacingMm: c("davit.sampleSpacingMm"), cellMm: c("davit.groupCellMm"), erodeMm: c("davit.penetrationMm") };
    const gated = gatedPoseSet();
    const contacts = loadContacts();
    const shared = newCalibrationCache();
    const touchMm = c("davit.touchMm"), marginMm = c("davit.calibMarginMm"), lookMm = c("davit.closestReachMm");
    let total = 0;
    for (const pipe of pipes) {
      const pre = stageBProxies(meshes, "mini", pipe, prm);
      const cal = calibrateConfig("mini", pipe, declaredPairs(contacts, "mini", pipe), pre, gated, touchMm, marginMm, shared);
      const poses = golden.poses[pipe].map(toPose);
      total += poses.length;
      const r = sweepPoses({ model: "mini", pipe, side: "R", poses, proxies: pre.proxies, masks: cal.masks, touchMm, lookMm, cache: new Map(), penetration: { masks: cal.masks, solids: pre.solids, marginMm, near: cal.cache.near } });
      expect(r.realFailCount, `${pipe} ${JSON.stringify(r.realFails.slice(0, 3))}`).toBe(0);
      if (pipe === "125in") {
        const bodies = davitBodies("mini", pipe, { R: PRESETS.HANG, L: PRESETS.HANG }).filter((b) => b.side !== "L");
        const hits = collide(bodies, pre.proxies, new Map(), { touchMm, lookMm: touchMm }).filter((x) => x.hit);
        expect(hits.length).toBeGreaterThan(5);
        expect(hits.length).toBeLessThan(80);
      }
    }
    expect(total).toBe(FULL_SWEEP ? 420 : 144);
  }, 600_000);
});
