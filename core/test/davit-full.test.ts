// M02-T06 long sweep, behind `npm run davit:sweep -w core`: both models,
// three pipes, both arms, Stage A and Stage B on the gated set, plus the seeded
// combined set (step 6, informational). Writes packages/sim/records/davit-sweep.json. The
// default test run skips this file and says so.
// It runs in core/test because the sweep reads every placement from
// packages/motion through core's binding; sim may not import motion (D-139).

import { mkdirSync, writeFileSync } from "node:fs";
import { arch, cpus, platform, release } from "node:os";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { newCalibrationCache } from "../../packages/sim/src/proxy/masks.js";
import {
  bindKinematics,
  calibrateConfig, combinedPoseSet, davitMeshes, declaredPairs, FULL_SWEEP, gatedPoseSet, loadContacts, MODELS, PIPES, poseSetHash, SIDES, stageA,
  stageBProxies, sweepPoses, type Model, type PipeId, type Side, type SweepReport,
} from "../../packages/sim/scenes/davit.js";
import { extractData } from "../../packages/sim/src/proxy/decode.js";
import { readFileSync } from "node:fs";
import { kinematics } from "./kinematics-binding.js";

bindKinematics(kinematics);

const profile = createProfileLookup(loadProfile());
const c = (id: string): number => profile.constant(id).value;
const touchMm = c("davit.touchMm"), lookMm = c("davit.closestReachMm"), marginMm = c("davit.calibMarginMm");
const gated = gatedPoseSet();
const SEED = 1, COMBINED = 600;
const combined = combinedPoseSet(SEED, COMBINED);

const brief = (r: SweepReport) => ({
  poses: r.poses, declaredPairs: r.declaredPairs, realFailCount: r.realFailCount, penetratingPoints: r.penetratingPoints, leftRightContacts: r.leftRightContacts,
  realFails: r.realFails.slice(0, 8), closestMm: Object.fromEntries(Object.entries(r.closest).sort().map(([k, v]) => [k, Math.round(v * 1000) / 1000])), wallMs: Math.round(r.wallMs),
});

describe.skipIf(!FULL_SWEEP)("davit:sweep", () => {
  test("both models, three pipes, both arms: records/davit-sweep.json", () => {
    const t0 = performance.now();
    const legacy = extractData(readFileSync(new URL("../../packages/sim/scenes/inputs/davit/r3/DATA.txt", import.meta.url), "utf8"));
    const contacts = loadContacts();
    const prm = { spacingMm: c("davit.sampleSpacingMm"), cellMm: c("davit.groupCellMm"), erodeMm: c("davit.penetrationMm") };
    const out: Record<string, unknown> = {};
    for (const model of MODELS as readonly Model[]) {
      const meshes = davitMeshes(model);
      const shared = newCalibrationCache();
      const perPipe: Record<string, unknown> = {};
      for (const pipe of PIPES as readonly PipeId[]) {
        const a = stageA(legacy, model, pipe);
        const pre = stageBProxies(meshes, model, pipe, prm);
        const tc = performance.now();
        const cal = calibrateConfig(model, pipe, declaredPairs(contacts, model, pipe), pre, gated, touchMm, marginMm, shared);
        const calibMs = Math.round(performance.now() - tc);
        const row: Record<string, unknown> = { calibrationWallMs: calibMs, uniqueRelativePosesNew: cal.uniqueRelativePoses, constantInterference: Object.fromEntries(Object.entries(cal.constant).filter(([, n]) => n > 0).sort()) };
        row.meshHashes = Object.fromEntries([...pre.hashes].sort());
        row.maskKeys = Object.fromEntries([...cal.masks].map(([k, m]) => [k, m.key]).sort());
        for (const side of SIDES as readonly Side[]) {
          const A = sweepPoses({ model, pipe, side, poses: gated, proxies: a.proxies, masks: a.masks, touchMm, lookMm, cache: new Map() });
          const pen = { masks: cal.masks, solids: pre.solids, marginMm, near: cal.cache.near };
          const B = sweepPoses({ model, pipe, side, poses: gated, proxies: pre.proxies, masks: cal.masks, touchMm, lookMm, cache: new Map(), penetration: pen });
          const C = sweepPoses({ model, pipe, side, poses: combined, proxies: pre.proxies, masks: cal.masks, touchMm, lookMm, cache: new Map(), penetration: pen });
          row[side] = { stageA: brief(A), stageB: brief(B), combinedInformational: brief(C) };
          if (model === "std") {
            expect(A.realFailCount, `A ${pipe} ${side}`).toBe(0);
            expect(B.realFailCount, `B ${pipe} ${side}`).toBe(0);
            expect(A.leftRightContacts + B.leftRightContacts).toBe(0);
          }
        }
        perPipe[pipe] = row;
      }
      out[model] = perPipe;
    }
    const record = {
      record: "davit-sweep", card: "M02-T06", date: new Date().toISOString().slice(0, 10),
      qualifier: "every count, distance and wall time below is computed or measured on the named machine; the sim measures and never decides",
      command: "npm run davit:sweep -w core",
      machine: { cpu: cpus()[0]?.model ?? "unknown", cores: cpus().length, os: `${platform()} ${release()} ${arch()}`, node: process.version, note: "shared with other builds while it ran; wall times include contention" },
      totalWallMs: Math.round(performance.now() - t0),
      params: { touchMm, closestReachMm: lookMm, calibMarginMm: marginMm, sampleSpacingMm: prm.spacingMm, groupCellMm: prm.cellMm, penetrationMm: prm.erodeMm },
      poseSets: { gated: { poses: gated.length, hash: poseSetHash(gated) }, combined: { seed: SEED, poses: COMBINED, hash: poseSetHash(combined), gated: false } },
      models: out,
    };
    mkdirSync(new URL("../../packages/sim/records/", import.meta.url), { recursive: true });
    writeFileSync(new URL("../../packages/sim/records/davit-sweep.json", import.meta.url), JSON.stringify(record, null, 1) + "\n");
  }, 7_200_000);
});
