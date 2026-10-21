// Scene pawl: the PAWL biped and its 17-trial suite (M02-T03). Data only:
// every number is copied from the legacy line it cites, unchanged, and the
// file imports types alone so Node strips it without a build. Lineage rows
// pawl.core/sim-model and pawl.final/sim-trials.

import type { Provenance } from "@hackbuild/spec";
import type { PawlModel } from "../src/programs/pawl/core.js";
import type { PawlScene } from "../src/programs/pawl/suite.js";

const CORE = "fab-knowledge:originals/pawl/files/src/core.mjs (lineage pawl.core/final, sha256 d1869500a5a871ff3f0bed2f55cb0a92367fc4f112d2494222aac44e03d1f9c8)";
const FINAL = "fab-knowledge:originals/pawl/files/src/final.mjs (lineage pawl.final/sim-trials, sha256 e4e61a3dc9cc5aa887243f803b0f65aaf7d139adcb94f5885c4d468cddc3b671)";

const fromCore = (lines: string): Provenance => ({ tier: "inferred", method: "derived", date: "2026-10-06", source: `${CORE} lines ${lines}` });

/**
 * The PAWL model as core.mjs types it. Lengths mm unless named; masses g
 * (from the verified CAD volumes, parts.py); actuator figures are the
 * 15BY-GM12 class estimates of the bench, never measured.
 */
export const PAWL_MODEL: PawlModel = {
  provenance: fromCore("4 to 58, 75, 88 to 89, 113 to 182, 185 to 186, 204 to 256"),
  // line 4
  mPerMm: 0.001,
  // lines 5 and 6
  lengths: { ankRoll: 14, ankPitch: 56, knee: 122, hipPitch: 188, hipRoll: 214, seg: 66, xLeg: 23, shoX: 42, shoY: 306 },
  // lines 9 to 13: tau N m, wmax deg/s, rotor 1.6e-8 kg m2 times ratio squared
  actuators: {
    r150: { tauNm: 0.186, wmaxDegS: 120, rotorKgM2: 1.6e-8, ratio: 150 },
    r100: { tauNm: 0.132, wmaxDegS: 180, rotorKgM2: 1.6e-8, ratio: 100 },
    r50: { tauNm: 0.069, wmaxDegS: 360, rotorKgM2: 1.6e-8, ratio: 50 },
  },
  // lines 21 to 43
  joints: [
    { k: "hipRoll", par: "torso", chi: "hipY", atX: "xLeg", atY: { ref: "hipRoll" }, axis: [0, 0, 1], axisSide: [2],
      act: "r150", limDeg: [-20, 35], carrier: "torso", can: [0, 1, 0], mout: [0, 0, 1], moutSide: [], along: 0,
      hint: "+ = leg swings outward (abduction)" },
    { k: "hipPitch", par: "hipY", chi: "thigh", atX: "xLeg", atY: { ref: "hipPitch" }, axis: [-1, 0, 0], axisSide: [],
      act: "r150", limDeg: [-30, 80], carrier: "thigh", can: [0, -1, 0], mout: [1, 0, 0], moutSide: [0], along: 0,
      hint: "+ = thigh swings forward (flexion)" },
    { k: "knee", par: "thigh", chi: "shank", atX: "xLeg", atY: { ref: "knee" }, axis: [1, 0, 0], axisSide: [],
      act: "r150", limDeg: [0, 120], carrier: "shank", can: [0, -1, 0], mout: [1, 0, 0], moutSide: [0], along: 0,
      hint: "+ = heel toward hip. hard stop at 0, no hyperextension" },
    { k: "ankPitch", par: "shank", chi: "ankP", atX: "xLeg", atY: { ref: "ankPitch" }, axis: [-1, 0, 0], axisSide: [],
      act: "r150", limDeg: [-35, 35], carrier: "shank", can: [0, 0.927, 0.375], mout: [1, 0, 0], moutSide: [0], along: 0,
      hint: "+ = toe up (dorsiflexion)" },
    { k: "ankRoll", par: "ankP", chi: "foot", atX: "xLeg", atY: { ref: "ankRoll" }, axis: [0, 0, 1], axisSide: [2],
      act: "r150", limDeg: [-25, 25], carrier: "ankP", can: [0, 1, 0], mout: [0, 0, 1], moutSide: [], along: -16,
      hint: "+ = sole edge tips outward" },
    { k: "shoPitch", par: "torso", chi: "shoY", atX: "shoX", atY: { ref: "shoY" }, axis: [-1, 0, 0], axisSide: [],
      act: "r50", limDeg: [-80, 120], carrier: "torso", can: [0, -1, 0], mout: [1, 0, 0], moutSide: [0], along: 0,
      hint: "+ = arm swings forward" },
    { k: "shoRoll", par: "shoY", chi: "arm", atX: "shoX", atY: { ref: "shoY", plus: -14 }, axis: [0, 0, 1], axisSide: [2],
      act: "r50", limDeg: [-5, 95], carrier: "arm", can: [0, -1, 0], mout: [0, 0, 1], moutSide: [], along: 0,
      hint: "+ = arm lifts away from the body" },
  ],
  // lines 45 to 58: mass g, box mm, origin by name, COM mm, driven actuator
  links: {
    torso: { massG: 150.3, boxMm: [86, 153, 40], orgX: 0, orgY: "hipRoll", comMm: [0, 54, 0] },
    hipY: { massG: 2.8, boxMm: [27, 38, 29], orgX: "xLeg", orgY: "hipRoll", comMm: [0, -11, 0], driven: "r150" },
    thigh: { massG: 24.1, boxMm: [30, 90, 28], orgX: "xLeg", orgY: "hipPitch", comMm: [0, -44, 0], driven: "r150" },
    shank: { massG: 33.0, boxMm: [21, 66, 28], orgX: "xLeg", orgY: "knee", comMm: [0, -43, 0], driven: "r150" },
    ankP: { massG: 22.8, boxMm: [30, 48, 30], orgX: "xLeg", orgY: "ankPitch", comMm: [0, -21, -4], driven: "r150" },
    foot: { massG: 8.2, boxMm: [38, 20, 70], orgX: "xLeg", orgY: "ankRoll", comMm: [0, -9, 5], driven: "r150" },
    shoY: { massG: 8, boxMm: [18, 18, 18], orgX: "shoX", orgY: "shoY", comMm: [0, -8, 0], driven: "r50" },
    arm: { massG: 24, boxMm: [16, 96, 16], orgX: "shoX", orgY: "shoY", comMm: [0, -66, 0], driven: "r50" },
  },
  // line 14 (FOOTSIZE) and lines 143 to 147 (sole plate and ankle block)
  foot: { lenMm: 64, widMm: 36, plateMm: 5, plateYMm: -11.5, heelMm: 26, blockHalfMm: [13, 7, 11], blockYMm: -4 },
  // lines 116 to 121 and 130
  world: {
    groundHalfM: [4, 0.05, 4], groundYM: -0.05, spawnM: 0.004, linearDamping: 0.05, angularDamping: 0.10,
    groups: {
      ground: { member: 0x0001, filter: 0xFFFF }, legL: { member: 0x0002, filter: 0x0005 },
      legR: { member: 0x0004, filter: 0x0003 }, body: { member: 0x0008, filter: 0x0001 },
    },
  },
  // lines 121 to 122 and 143 to 152
  contact: { soleFriction: 1.10, linkFriction: 0.4, restitution: 0 },
  // line 75
  ik: { reachLo: 0.25, reachHi: 0.995 },
  // lines 88 and 89
  stance: { maxM: 0.2125, ankleStopDeg: 35 },
  // line 210
  squat: { ampM: 0.016, periodS: 3.2 },
  // lines 185 to 186 and 236 to 237
  gaitShape: { swayPhase: 0.45, dwellMin: 0.02, armSwingRad: 0.45, shoRollRad: 0.09 },
  // lines 224 to 225, 249 and 174
  servo: { biasClampRad: 0.42, dampingRatio: 1.15, outputKgM2: 1.2e-5 },
  // lines 180 to 182
  gait: {
    mode: "stand", hoist: false, paused: false, T: 2.40, S: 0.038, H: 0.016, A: 0.023, hgt: 0.209, sf: 0.40, dwell: 2.2,
    imu: true, bw: 25, ts: 1.0, mu: 1.10, phase: 0, t: 0, kp: 1.6, kd: 0.08, kr: 1.6, kdr: 0.08,
  },
};

/** final.mjs lines 25 to 37: labels verbatim, run lengths s, pushes N s at 3 s. */
const STAND = "STAND", SQUAT = "SQUAT", PUSH = "PUSH at 3 s", WALK = "WALK 25 s";

export const PAWL_SCENE: PawlScene = {
  id: "pawl",
  // the T01 world rows (packages/sim/test/fixtures/pawl-world.json); a test holds them equal
  world: {
    gravity: { id: "sim.gravity", value: 9.81, unit: "m/s2", provenance: fromCore("4 (G = 9.81) and 114 (World gravity 0, minus G, 0)") },
    timestep: { id: "sim.timestep", value: 0.0020833333333333333, unit: "s", provenance: fromCore("115 (world.timestep = opt.dt or 1/480)") },
  },
  model: PAWL_MODEL,
  fall: { afterS: 0.6, tiltDeg: 30, minTorsoM: 0.12, provenance: { tier: "inferred", method: "derived", date: "2026-10-06", source: `${FINAL} lines 14 to 17` } },
  trialsProvenance: { tier: "inferred", method: "derived", date: "2026-10-06", source: `${FINAL} lines 25 to 37` },
  trials: [
    { label: "60 s", group: STAND, secs: 60, gait: { mode: "stand" } },
    { label: "hgt 192 (deep)", group: STAND, secs: 20, gait: { mode: "stand", hgt: 0.192 } },
    { label: "hgt 212 (tall)", group: STAND, secs: 20, gait: { mode: "stand", hgt: 0.212 } },
    { label: "open loop (should fail)", group: STAND, secs: 15, gait: { mode: "stand", imu: false } },
    { label: "30 s cycling", group: SQUAT, secs: 30, gait: { mode: "squat" } },
    { label: "z 0.06 N.s", group: PUSH, secs: 12, gait: { mode: "stand" }, push: { t: 3, z: 0.06 } },
    { label: "z 0.12 N.s", group: PUSH, secs: 12, gait: { mode: "stand" }, push: { t: 3, z: 0.12 } },
    { label: "x 0.06 N.s", group: PUSH, secs: 12, gait: { mode: "stand" }, push: { t: 3, x: 0.06 } },
    { label: "x 0.12 N.s", group: PUSH, secs: 12, gait: { mode: "stand" }, push: { t: 3, x: 0.12 } },
    { label: "T3.2 S38 sway23", group: WALK, secs: 25, gait: { mode: "walk", T: 3.2, S: 0.038, A: 0.023 } },
    { label: "T2.8 S38 sway23", group: WALK, secs: 25, gait: { mode: "walk", T: 2.8, S: 0.038, A: 0.023 } },
    { label: "T2.4 S38 sway23", group: WALK, secs: 25, gait: { mode: "walk", T: 2.4, S: 0.038, A: 0.023 } },
    { label: "T2 S38 sway23", group: WALK, secs: 25, gait: { mode: "walk", T: 2.0, S: 0.038, A: 0.023 } },
    { label: "T2.8 S20 sway23", group: WALK, secs: 25, gait: { mode: "walk", T: 2.8, S: 0.020, A: 0.023 } },
    { label: "T2.8 S50 sway23", group: WALK, secs: 25, gait: { mode: "walk", T: 2.8, S: 0.050, A: 0.023 } },
    { label: "T2.8 S38 sway18", group: WALK, secs: 25, gait: { mode: "walk", T: 2.8, S: 0.038, A: 0.018 } },
    { label: "T2.8 S38 sway28", group: WALK, secs: 25, gait: { mode: "walk", T: 2.8, S: 0.038, A: 0.028 } },
  ],
  seed: 1,
  // The legacy record of step 1: packages/sim/records/pawl-legacy-0.14.0-arm64.json and -x64.json,
  // 15 of 17 (computed). The open loop trial is declared by its measured legacy outcome.
  expected: {
    pass: [
      "60 s", "hgt 192 (deep)", "hgt 212 (tall)", "open loop (should fail)", "30 s cycling", "z 0.06 N.s", "x 0.06 N.s",
      "T3.2 S38 sway23", "T2.8 S38 sway23", "T2.4 S38 sway23", "T2 S38 sway23", "T2.8 S20 sway23", "T2.8 S50 sway23",
      "T2.8 S38 sway18", "T2.8 S38 sway28",
    ],
    fall: ["z 0.12 N.s", "x 0.12 N.s"],
    source: "packages/sim/records/pawl-legacy-0.14.0-arm64.json",
  },
  // The port on 0.21.0 passes 9 of 17 (computed, packages/sim/records/pawl-0.21.0-arm64.json);
  // no core.mjs constant is retuned without an owner answer (M02-T03 step 6).
  status: "blocked: rapier 0.14 to 0.21 regression",
  labelNotes: [
    { label: "open loop (should fail)", note: "labelled should fail; stands on 0.14.0 (computed) and is declared pass by that outcome. owner question: is the label or the result right" },
  ],
};
