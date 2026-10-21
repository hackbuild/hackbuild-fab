// M02-T06 Stage A and Stage B sweeps. Stage A runs the legacy proxies and
// legacy masks decoded from davit.html DATA; Stage B generates proxies from
// the STL meshes and calibrates masks for the declared pairs only. Expected
// values come from the legacy page (pair names, mask data) and from
// designs/davit/contacts.json; the sweep itself is the unit under test.
// It runs in core/test because the sweep reads every placement from
// packages/motion through core's binding; sim may not import motion (D-139).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { collide, type PosedBody } from "../../packages/sim/src/proxy/collide.js";
import { decodeProxy, extractData } from "../../packages/sim/src/proxy/decode.js";
import { assertFresh, newCalibrationCache } from "../../packages/sim/src/proxy/masks.js";
import {
  bindKinematics,
  calibrateConfig, davitBodies, davitMeshes, declaredPairs, FULL_SWEEP, gatedPoseSet, loadContacts, PIPES, poseSetHash, PRESETS, SIDES,
  stageA, stageBProxies, sweepPoses, type Model,
} from "../../packages/sim/scenes/davit.js";
import { constOf, IDENTITY } from "@hackbuild/motion";
import { kinematics } from "./kinematics-binding.js";

bindKinematics(kinematics);

const data = extractData(readFileSync(new URL("../../packages/sim/scenes/inputs/davit/r3/DATA.txt", import.meta.url), "utf8"));
const profile = createProfileLookup(loadProfile());
const c = (id: string): number => profile.constant(id).value;
const touchMm = c("davit.touchMm"), lookMm = c("davit.closestReachMm"), marginMm = c("davit.calibMarginMm");
const poses = gatedPoseSet();
const contacts = loadContacts();

describe("the chain constants", () => {
  test("motion's DAVIT chain numbers equal davit.html DATA.const and DATA.constm", () => {
    expect(data.const).toMatchObject(constOf("std"));
    expect(data.constm).toMatchObject(constOf("mini"));
  });
});

describe("the declared pairs and the pose set", () => {
  test("contacts.json holds the 29 DATA pairs by name for each model plus base x mount for each pipe", () => {
    expect(contacts.models.std.pairs.map((p) => `${p.a}|${p.b}`)).toEqual(data.pairs.map((p) => `${p.a}|${p.b}`));
    expect(contacts.models.mini.pairs.map((p) => `${p.a}|${p.b}`)).toEqual(data.pairsMini.map((p) => `${p.a}|${p.b}`));
    for (const pipe of PIPES) expect(declaredPairs(contacts, "std", pipe)).toHaveLength(30);
    expect(contacts.models.std.pairs.filter((p) => p.fit !== "slip").map((p) => `${p.a}|${p.b}:${p.fit}`)).toEqual(["palm|pincap:press"]);
  });

  test("the gated pose set is 4 presets plus 4 x 422 single-joint sweeps, and its hash is pinned", () => {
    expect(poses).toHaveLength(4 + 4 * (121 + 73 + 111 + 73 + 44));
    expect(poseSetHash(poses)).toBe(POSE_SET_HASH);
  });
});

// Written by an independent Python script: the same list as json.dumps with compact separators, sha256, 1692 poses.
const POSE_SET_HASH = "18fc7e6235533fa683c31cfd10834344464eb0e7e03ff88f63d0604d0a4bd11f";

describe("Stage A, legacy proxies and masks", () => {
  test("std: 30 declared pairs per pipe per side, 0 real fails, 0 left-right contacts", () => {
    for (const pipe of PIPES) {
      for (const side of SIDES) {
        const { proxies, masks } = stageA(data, "std", pipe);
        const r = sweepPoses({ model: "std", pipe, side, poses, proxies, masks, touchMm, lookMm, cache: new Map() });
        expect(r.declaredPairs).toBe(30);
        expect(r.realFailCount, JSON.stringify(r.realFails.slice(0, 3))).toBe(0);
        expect(r.leftRightContacts).toBe(0);
        expect(Object.keys(r.closest)).toHaveLength(30);
      }
    }
  }, 60_000);

  test("the sweep has teeth: without masks the designed contacts are real fails, and an arm of the other side is tested", () => {
    const { proxies } = stageA(data, "std", "125in");
    const r = sweepPoses({ model: "std", pipe: "125in", side: "R", poses: poses.slice(0, 4), proxies, masks: new Map(), touchMm, lookMm: touchMm, cache: new Map() });
    expect(new Set(r.realFails.map((f) => f.pair)).size).toBeGreaterThan(5);
    // The legacy skip of arms on different sides is gone: two bodies of different sides at one place touch.
    const a: PosedBody = { n: "crank", k: "crank", side: "R", m: IDENTITY }, b: PosedBody = { n: "crank", k: "crank", side: "L", m: IDENTITY };
    const hits = collide([a, b], proxies, new Map(), { touchMm, lookMm: touchMm });
    expect(hits).toHaveLength(1);
    expect(hits[0]!.sideA).not.toBe(hits[0]!.sideB);
  });

  test("a legacy proxy decodes to the DATA point count and the first point matches its u16 quantization", () => {
    const rec = data.prox.crank!;
    const px = decodeProxy(rec);
    expect(px.n).toBe(rec.n);
    expect(px.groups.length).toBe(rec.g.length * 6);
    expect(davitBodies("std", "125in", { R: PRESETS.HANG, L: PRESETS.HANG })).toHaveLength(3 + 2 * 17);
  });
});

describe("Stage B, generated proxies and masks", () => {
  // The default run covers 125in, the pipe the arm pairs are calibrated at; davit:sweep covers all three.
  test(`std: masks calibrated on the gated set give 0 real fails on both arms, pipes ${FULL_SWEEP ? "1in 125in 15in" : "125in"}`, () => {
    const model: Model = "std";
    const meshes = davitMeshes(model);
    const prm = { spacingMm: c("davit.sampleSpacingMm"), cellMm: c("davit.groupCellMm"), erodeMm: c("davit.penetrationMm") };
    const shared = newCalibrationCache();
    const hash = poseSetHash(poses);
    for (const pipe of FULL_SWEEP ? PIPES : (["125in"] as const)) {
      const pre = stageBProxies(meshes, model, pipe, prm);
      const cal = calibrateConfig(model, pipe, declaredPairs(contacts, model, pipe), pre, poses, touchMm, marginMm, shared);
      // D-049: point pairs under touch in every pose of the set, listed by pair and side; the check in M04 decides the verdict.
      console.log(`constant interference ${model} ${pipe}: ${JSON.stringify(Object.fromEntries(Object.entries(cal.constant).filter(([, n]) => n > 0).sort()))}`);
      for (const m of cal.masks.values()) assertFresh(m, pre.hashes.get(m.a === "base" ? "base" : keyOf(m.a, pipe))!, pre.hashes.get(keyOf(m.b, pipe))!, hash);
      for (const side of SIDES) {
        const r = sweepPoses({ model, pipe, side, poses, proxies: pre.proxies, masks: cal.masks, touchMm, lookMm, cache: new Map(), penetration: { masks: cal.masks, solids: pre.solids, marginMm, near: cal.cache.near } });
        expect(r.realFailCount, JSON.stringify(r.realFails.slice(0, 3))).toBe(0);
        expect(r.leftRightContacts).toBe(0);
      }
    }
  }, 600_000);
});

function keyOf(name: string, pipe: string): string {
  const b = name.split("#")[0]!;
  return b === "mount" ? `mount_${pipe}` : b;
}
