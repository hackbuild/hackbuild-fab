// M07-T10: DERRICK forward kinematics and static torque against
// arm_build.py. Expected values come from the legacy Python only:
// test/goldens/derrick-fk.json (scripts/derrick_fk_golden.py runs the
// canonical arm_build.py unedited and writes its frames, instances and
// torque_table at the seven POSES, unrounded) and
// arm_ref_regenerated_2026-10-05.json, stored in packages/motion/inputs/derrick (the same
// source rerun on 2026-10-05, rounded the way arm_build.py writes
// arm_ref.json). The shipped arm_ref.json is stale (knowledge/designs/
// derrick.md 1.2); it is read only to show it still differs.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { DERRICK_KINEMATICS, derrickKinematics, type DerrickModel } from "@hackbuild/motion";

const root = new URL("../../../", import.meta.url);
const read = (p: string): Buffer => readFileSync(new URL(p, root));

interface RefPose {
  q: number[];
  tool: number[];
  frames: number[][];
  instances: { name: string; m: number[]; mass: number }[];
  torque: { joint: string; carriedG: number; kgcm: number; gmm: number }[];
}
const golden = JSON.parse(read("packages/motion/test/goldens/derrick-fk.json").toString("utf8")) as { sha256: Record<string, string>; model: DerrickModel; ref: Record<string, RefPose> };
type ArmRef = Record<string, { q: number[]; tool: number[]; torque: number[] }>;
const regenerated = JSON.parse(read("packages/motion/inputs/derrick/arm_ref_regenerated_2026-10-05.json").toString("utf8")) as ArmRef;
const shipped = JSON.parse(read("packages/motion/inputs/derrick/arm_ref.json").toString("utf8")) as ArmRef;
const lineage = JSON.parse(read("lineage.json").toString("utf8")) as { id: string; sha256: string }[];
const K = derrickKinematics(golden.model);
const POSES = ["home", "stow", "reach out", "reach up", "reach down", "twist", "elbow in"];

const worst = (a: readonly number[], b: readonly number[]): number => Math.max(...a.map((v, i) => Math.abs(v - b[i]!)));
const toolOf = (m: readonly number[]): number[] => [m[3]!, m[7]!, m[11]!];

describe("sources", () => {
  test("the golden was written from the canonical arm_build.py (lineage derrick.build/r3)", () => {
    expect(golden.sha256["arm_build.py"]).toBe(lineage.find((r) => r.id === "derrick.build/r3")!.sha256);
    expect(Object.keys(golden.ref)).toEqual(POSES);
    expect(Object.keys(regenerated)).toEqual(POSES);
  });
});

describe("forward kinematics", () => {
  test("the seven poses give the tool, every joint frame and every instance matrix of arm_build.py within 1e-9 (computed)", () => {
    for (const name of POSES) {
      const ref = golden.ref[name]!;
      const p = K.pose(ref.q);
      expect(worst(p.tool, ref.tool), name).toBeLessThan(1e-9);
      p.frames.forEach((f, j) => expect(worst(f, ref.frames[j]!), `${name} J${j + 1}`).toBeLessThan(1e-9));
      expect(p.instances.map((x) => x.name), name).toEqual(ref.instances.map((x) => x.name));
      p.instances.forEach((x, k) => {
        expect(worst(x.m, ref.instances[k]!.m), `${name} ${x.name}`).toBeLessThan(1e-9);
        expect(Math.abs(x.mass - ref.instances[k]!.mass), `${name} ${x.name} mass`).toBeLessThan(1e-12);
      });
    }
  });

  test("the seven poses of the regenerated arm_ref.json give tool positions within 0.0005 mm (computed; the smoke_arm.js tolerance)", () => {
    for (const name of POSES) {
      const want = regenerated[name]!;
      expect(want.q, name).toEqual(golden.ref[name]!.q.map((v) => Math.round(v * 1e6) / 1e6));
      expect(worst(toolOf(K.frames(golden.ref[name]!.q).tool), want.tool), name).toBeLessThanOrEqual(0.0005 + 1e-12);
    }
  });

  test("the shipped arm_ref.json is the stale R1 golden: the home tool is 6.8 mm off in x", () => {
    const home = toolOf(K.frames(golden.ref.home!.q).tool);
    expect(home[0]! - shipped.home!.tool[0]!).toBeCloseTo(6.8, 9);
  });

  test("the mates are the hinge and spar transforms: the hinge turns the axis a quarter turn, a spar keeps it antiparallel", () => {
    const axis = (m: readonly number[]): number[] => [m[2]!, m[6]!, m[10]!];
    expect(axis(K.mates[0]!)).toEqual([1, 0, 0]);
    expect(axis(K.mates[1]!)).toEqual([0, 0, -1]);
    // An asymmetric pose: twist is home with J1 at +45 deg and J5 rolled; J5 rolls about the tool axis, so the
    // tool is the home tool turned +45 deg about z. A mirrored chain would turn it -45 (the ROT_HINGE handedness class).
    const twist = toolOf(K.frames(golden.ref.twist!.q).tool), home = toolOf(K.frames(golden.ref.home!.q).tool);
    const a = golden.ref.twist!.q[0]!;
    expect(a).toBeGreaterThan(0);
    expect(twist[0]!).toBeCloseTo(Math.cos(a) * home[0]! - Math.sin(a) * home[1]!, 9);
    expect(twist[1]!).toBeCloseTo(Math.sin(a) * home[0]! + Math.cos(a) * home[1]!, 9);
    expect(twist[2]!).toBeCloseTo(home[2]!, 9);
  });
});

describe("static torque", () => {
  test("torque_table rows equal arm_build.py within 1e-9 kg cm and 1e-9 g carried (computed)", () => {
    for (const name of POSES) {
      const rows = K.torque(golden.ref[name]!.q);
      expect(rows.map((r) => r.joint)).toEqual(golden.ref[name]!.torque.map((r) => r.joint));
      rows.forEach((r, j) => {
        const w = golden.ref[name]!.torque[j]!;
        expect(Math.abs(r.kgcm - w.kgcm), `${name} ${r.joint}`).toBeLessThan(1e-9);
        expect(Math.abs(r.carriedG - w.carriedG), `${name} ${r.joint} carried`).toBeLessThan(1e-9);
      });
    }
  });

  test("torques of the regenerated arm_ref.json within 0.00005 kg cm at all seven poses (computed; the smoke_arm.js tolerance)", () => {
    for (const name of POSES) {
      const got = K.torque(golden.ref[name]!.q).map((r) => r.kgcm);
      expect(worst(got, regenerated[name]!.torque), name).toBeLessThanOrEqual(0.00005 + 1e-12);
    }
  });

  test("the shoulder at reach out holds 2.46 kg cm, over the 1.8 SG90 stall (knowledge/designs/derrick.md 5.5, computed)", () => {
    expect(K.torque(golden.ref["reach out"]!.q)[1]!.kgcm.toFixed(2)).toBe("2.46");
  });
});

describe("registry entry", () => {
  test("validates five joint angles and refuses four", async () => {
    expect((await DERRICK_KINEMATICS.params["~standard"].validate({ q: [0, 0, 0, 0, 0] })).issues).toBeUndefined();
    expect((await DERRICK_KINEMATICS.params["~standard"].validate({ q: [0, 0, 0, 0] })).issues?.length).toBe(1);
  });
});
