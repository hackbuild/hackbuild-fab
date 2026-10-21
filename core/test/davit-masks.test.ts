// M02-T06 step 7: a Stage B mask is keyed by the mesh hashes of both bodies
// and the pose set hash. Changing one byte of crank.stl, or the pose set,
// makes the crank masks E_STALE naming the pair.
// It runs in core/test because the sweep reads every placement from
// packages/motion through core's binding; sim may not import motion (D-139).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { isThrownCommandError } from "@hackbuild/spec";
import { assertFresh, maskKey } from "../../packages/sim/src/proxy/masks.js";
import { bindKinematics, calibrateConfig, davitMeshes, declaredPairs, gatedPoseSet, loadContacts, meshOfStl, poseSetHash, stageBProxies } from "../../packages/sim/scenes/davit.js";
import { kinematics } from "./kinematics-binding.js";

bindKinematics(kinematics);

const profile = createProfileLookup(loadProfile());
const c = (id: string): number => profile.constant(id).value;
const prm = { spacingMm: c("davit.sampleSpacingMm"), cellMm: c("davit.groupCellMm"), erodeMm: c("davit.penetrationMm") };
// The roll sweep of the HANG preset: enough to calibrate every crank pair's key without the full set.
const poses = gatedPoseSet().filter((_, i) => i === 0 || (i >= 4 + 121 && i < 4 + 121 + 73));
const meshes = davitMeshes("std");
const contacts = loadContacts();
const declared = declaredPairs(contacts, "std", "125in").filter((p) => p.a === "crank" || p.b === "crank");
const pre = stageBProxies(meshes, "std", "125in", prm);
const cal = calibrateConfig("std", "125in", declared, pre, poses, c("davit.touchMm"), c("davit.calibMarginMm"));
const hashOf = (name: string, h: ReadonlyMap<string, string>): string => h.get(name.split("#")[0]!)!;

describe("mask keys", () => {
  test("the crank masks are fresh against the meshes and pose set they were calibrated on", () => {
    expect(declared.map((p) => `${p.a}|${p.b}`).sort()).toEqual(["base|crank", "crank|mic_servo#2", "crank|std_horn#1", "crank|std_servo#0", "crank|upper"]);
    for (const m of cal.masks.values()) {
      expect(m.key).toBe(maskKey(m.hashA, m.hashB, poseSetHash(poses)));
      assertFresh(m, hashOf(m.a, pre.hashes), hashOf(m.b, pre.hashes), poseSetHash(poses));
    }
  });

  test("changing one byte of crank.stl makes every crank mask E_STALE, naming the pair", () => {
    const bytes = new Uint8Array(readFileSync(new URL("../../packages/sim/scenes/inputs/davit/r3/davit_crank.stl", import.meta.url)));
    // Third byte of the x of the first vertex: a binary stl header is 84 bytes, then 12 normal bytes.
    bytes[84 + 12 + 1] = (bytes[84 + 12 + 1]! + 0x40) & 0xff;
    const edited = meshOfStl(bytes, "davit_crank.stl");
    expect(edited.hash).not.toBe(meshes.get("crank")!.hash);
    const hashes = new Map(pre.hashes).set("crank", edited.hash);
    for (const m of cal.masks.values()) {
      let err: unknown;
      try { assertFresh(m, hashOf(m.a, hashes), hashOf(m.b, hashes), poseSetHash(poses)); } catch (e) { err = e; }
      expect(isThrownCommandError(err), `${m.a}|${m.b}`).toBe(true);
      const hbf = (err as { hbf: { code: string; path: string; hint: string } }).hbf;
      expect(hbf.code).toBe("E_STALE");
      expect(hbf.path).toBe(`/masks/${m.a}|${m.b}`);
      expect(hbf.hint).toContain(`${m.a} x ${m.b}`);
      expect(hbf.hint).toContain("a mesh changed");
    }
  });

  test("changing the pose set makes the masks E_STALE", () => {
    const other = poseSetHash(poses.slice(0, -1));
    expect(other).not.toBe(poseSetHash(poses));
    for (const m of cal.masks.values()) {
      expect(() => assertFresh(m, hashOf(m.a, pre.hashes), hashOf(m.b, pre.hashes), other)).toThrow(/stale, the pose set changed/);
    }
  });

  test("a mask whose stored key was edited is stale even when the hashes match", () => {
    const m = [...cal.masks.values()][0]!;
    expect(() => assertFresh({ ...m, key: "0".repeat(64) }, m.hashA, m.hashB, m.poseSetHash)).toThrow(/E_STALE/);
  });

  test("masks never cover an undeclared pair: only the declared crank pairs exist", () => {
    expect([...cal.masks.keys()].sort()).toEqual(declared.map((p) => `${p.a}|${p.b}`).sort());
  });
});
