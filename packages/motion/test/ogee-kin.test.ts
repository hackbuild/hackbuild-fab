// M07-T10: the OGEE16 kinematics port against kin.py. Expected values come
// from the legacy Python only: the M07-T01 record
// packages/motion/records/ogee16-kin.json (kin-record.py runs kin.py and
// check_viewer.py lines 47 to 67 unedited), the kin.P scalars in
// packages/sim/test/goldens/ogee-sweep-oracle.json (M02-T07 oracle), the
// audit poses audit_print.py build() placed (packages/sim/scenes/ogee16-poses,
// tools/py/ogee16/export_poses.py), and the figures of the M07 Records
// table typed below from kin.py's printout. The case inputs are typed from
// check_viewer.py lines 47 to 55. The legacy check_viewer.py printed
// MISMATCHES and exited 0 whatever the count; every comparison here fails
// the run (D-153).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { isThrownCommandError } from "@hackbuild/spec";
import { OGEE16_KINEMATICS, ogeeKinematics, readScadParams } from "@hackbuild/motion";

const root = new URL("../../../", import.meta.url);
const read = (p: string): Buffer => readFileSync(new URL(p, root));
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

interface KinRecord {
  inputs: Record<string, string>;
  result: {
    printed: Record<string, number | number[][]>;
    rows: { names: string[]; kinPy: number[][] };
  };
}
const record = JSON.parse(read("packages/motion/records/ogee16-kin.json").toString("utf8")) as KinRecord;
const oracle = JSON.parse(read("packages/sim/test/goldens/ogee-sweep-oracle.json").toString("utf8")) as { kinSha256: string; paramsSha256: string; placement: { params: Record<string, number> } };
const P = readScadParams(read("packages/motion/inputs/ogee16/params.scad").toString("utf8"));
const K = ogeeKinematics(P);

interface Case { zR: number[]; zC: number[]; lp: number; latched: boolean }
/** check_viewer.py lines 47 to 55, in its order. */
function cases(): Case[] {
  const S = P.get("STROKE")!, LP = P.get("LP_SLIDE")!;
  const c = (zR: number[], zC: number[], lp: number, lat: number): Case => ({ zR, zC, lp, latched: lat === 1 });
  return [
    c([0, 0, 0, 0], [0, 0, 0, 0], 0, 0),
    c([S, 0, 0, 0], [0, 0, 0, 0], 0, 0),
    c([0, 0, 0, 0], [S, 0, 0, 0], 0, 0),
    c([S, 0, 0, 0], [S, 0, 0, 0], 0, 0),
    c([S, S, S, S], [S, S, S, S], 0, 0),
    c([0, 0, 0, 0], [0, 0, 0, 0], 0, 1),
    c([0, 0, 0, 0], [0, 0, 0, 0], LP, 1),
    c([S * 0.37, S, 0, S * 0.8], [0, S * 0.55, S, S], 0, 0),
  ];
}

/** The 12 values check_viewer.py compares for one cell, in its column order. */
function row(i: number, j: number, c: Case): number[] {
  const rk = K.link3(i, j, c.zR, c.zC);
  const st = K.pinState(i, j, c.zR, c.zC, c.lp, c.latched);
  return [rk.th, rk.L, rk.ox, rk.oz, rk.cx, rk.cz, st.y, st.z, st.rise, st.cammed ? 1 : 0, K.crankPhi(c.zR[i]!), K.lCrankPhi(c.lp)];
}

describe("the records", () => {
  // ogee-originals.test.ts holds every record input to the originals of record.
  test("the record and the oracle name the params.scad read here, byte for byte", () => {
    const params = sha(read("packages/motion/inputs/ogee16/params.scad"));
    expect(params).toBe(oracle.paramsSha256);
    expect(Object.values(record.inputs)).toContain(params);
    expect(Object.values(record.inputs)).toContain(oracle.kinSha256);
    expect(record.result.rows.kinPy).toHaveLength(128);
  });
});

describe("params", () => {
  test("readScadParams reads every scalar kin.load_params reads, equal", () => {
    const want = oracle.placement.params;
    expect([...P.keys()].sort()).toEqual(Object.keys(want).sort());
    for (const [k, v] of Object.entries(want)) expect(P.get(k), k).toBeCloseTo(v, 12);
  });

  test("the reader keeps the last assignment and skips what kin.py cannot evaluate", () => {
    const p = readScadParams("A = 2; B = A*3 + -1; // C = 9;\nA = 5; L = [1, 2]; F = undefined_name + 1; $fa = 2; G = -7 % 3; H = asin(0.5);");
    expect(Object.fromEntries([...p].filter(([k]) => k !== "H"))).toEqual({ A: 5, B: 5, G: 2 });
    expect(p.get("H")).toBeCloseTo(30, 12);
  });

  test("a params set missing a name the kinematics read is E_REF, never a default", () => {
    const short = new Map(P);
    short.delete("CROWN_OFF");
    let code = "";
    try {
      ogeeKinematics(short);
    } catch (e) {
      if (isThrownCommandError(e)) code = `${e.hbf.code} ${e.hbf.path}`;
    }
    expect(code).toBe("E_REF /params/CROWN_OFF");
  });
});

describe("check_viewer cases", () => {
  test("the 8 cases over 16 cells give 128 rows of 12 values equal to kin.py within 1e-9 (computed)", () => {
    const want = record.result.rows;
    const got: number[][] = [];
    for (const c of cases()) for (let i = 0; i < K.N; i += 1) for (let j = 0; j < K.N; j += 1) got.push(row(i, j, c));
    expect(got).toHaveLength(128);
    expect(want.names).toEqual(["theta", "L", "origin.x", "origin.z", "crown.x", "crown.z", "pin.y", "pin.z", "rise", "cammed", "crank phi", "latch phi"]);
    const worst = want.names.map(() => 0);
    let bad = 0;
    got.forEach((r, n) => r.forEach((v, k) => {
      const d = Math.abs(v - want.kinPy[n]![k]!);
      worst[k] = Math.max(worst[k]!, d);
      if (d > 1e-9) bad += 1;
    }));
    expect(bad, `worst per column ${JSON.stringify(Object.fromEntries(want.names.map((c, k) => [c, worst[k]])))}`).toBe(0);
    // Both values of the cammed column occur, so the column is exercised.
    expect(new Set(want.kinPy.map((r) => r[9]))).toEqual(new Set([0, 1]));
  });
});

describe("kin.py readout", () => {
  const r = K.readout();

  test("each figure equals kin.py's own computation within 1e-9", () => {
    const p = record.result.printed;
    const pairs: [number, unknown][] = [
      [r.cam, p.cam], [r.camAvailable, p.camAvailable], [r.camLift, p.camLift], [r.fullRise, p.fullSelectRise],
      [r.halfRise, p.halfSelectRise], [r.halfSlotUse, p.halfSelectSlotUse], [r.halfCrownX, p.halfSelectCrownX],
      [r.halfMargin, p.halfSelectMargin], [r.fullOvershoot, p.fullSelectOvershoot], [r.restLugTop, p.restLugTop],
    ];
    pairs.forEach(([got, want], k) => expect(Math.abs(got - (want as number)), `figure ${k}`).toBeLessThan(1e-9));
    expect(r.latchMatrix).toEqual(p.latchMatrixRow0Col0);
  });

  test("CAM 0.925, cam lift 0.776, half rise 4.249, margin 0.775, overshoot 1.400 to 3 decimals (computed, M07 Records table)", () => {
    expect(r.cam.toFixed(3)).toBe("0.925");
    expect(r.camAvailable.toFixed(3)).toBe("1.450");
    expect(r.camLift.toFixed(3)).toBe("0.776");
    expect(r.fullRise.toFixed(3)).toBe("9.000");
    expect(r.halfRise.toFixed(3)).toBe("4.249");
    expect(r.halfSlotUse.toFixed(3)).toBe("2.125");
    expect(r.halfMargin.toFixed(3)).toBe("0.775");
    expect(r.fullOvershoot.toFixed(3)).toBe("1.400");
    expect(r.latchMatrix).toEqual([[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  });

});

describe("placements", () => {
  interface PoseFile { sources: Record<string, string>; poses: { label: string; zR: number[]; zC: number[]; lp: number; bodies: { label: string; stl: string; matrix: number[] }[] }[] }
  const files = ["printed-4", "printed-negatives"].map((f) => JSON.parse(read(`packages/sim/scenes/ogee16-poses/${f}.json`).toString("utf8")) as PoseFile);

  test("place() reproduces audit_print.py build() at every audit pose: names, STLs and matrices within 1e-9", () => {
    let poses = 0;
    for (const f of files) {
      expect(f.sources["kin.py"]).toBe(oracle.kinSha256);
      for (const p of f.poses) {
        const got = K.place({ zR: p.zR, zC: p.zC, lp: p.lp });
        expect(got.map((b) => `${b.name}:${b.file}`), p.label).toEqual(p.bodies.map((b) => `${b.label}:${b.stl}`));
        got.forEach((b, k) => b.at.forEach((v, n) => expect(Math.abs(v - p.bodies[k]!.matrix[n]!), `${p.label} ${b.name}[${n}]`).toBeLessThan(1e-9)));
        poses += 1;
      }
    }
    expect(poses).toBe(6);
  });

  test("the audit poses move the moving parts: a link tilts and a rod rises at full select", () => {
    const full = files[0]!.poses.find((p) => p.label === "full select 0,0")!;
    const rest = files[0]!.poses.find((p) => p.label === "rest")!;
    const at = (p: typeof full, n: string): number[] => p.bodies.find((b) => b.label === n)!.matrix;
    expect(at(full, "rod00")[11]! - at(rest, "rod00")[11]!).toBeGreaterThan(8);
    expect(at(full, "link01")[2]).not.toBe(at(rest, "link01")[2]);
  });

  test("crank() carries each drive pin through the stroke: the bar pin rises STROKE, the latch pin moves LP_SLIDE in +y", () => {
    const S = P.get("STROKE")!, R = P.get("CRANK_R")!;
    // printed.scad a_crank_row and a_crank_col (lines 416 to 423) seat the drive pin CRANK_R off the shaft axis, at y CRANK_R and at x CRANK_R; its offset along the shaft does not move its height.
    const pinZ = (m: readonly number[], p: readonly number[]): number => m[8]! * p[0]! + m[9]! * p[1]! + m[10]! * p[2]! + m[11]!;
    const pinY = (m: readonly number[], p: readonly number[]): number => m[4]! * p[0]! + m[5]! * p[1]! + m[6]! * p[2]! + m[7]!;
    for (let k = 0; k <= 24; k += 1) {
      const u = k / 24;
      expect(pinZ(K.crank("row", 2, u), [P.get("RSV_CRK")!, R, 0]) - pinZ(K.crank("row", 2, 0), [P.get("RSV_CRK")!, R, 0])).toBeCloseTo(S * u, 9);
      expect(pinZ(K.crank("col", 1, u), [R, P.get("CSV_CRK")!, 0]) - pinZ(K.crank("col", 1, 0), [R, P.get("CSV_CRK")!, 0])).toBeCloseTo(S * u, 9);
      const pin = [P.get("LSV_X")! + P.get("LCRANK_R")!, P.get("LSV_Y")!, P.get("LSV_SHAFT_Z")!];
      expect(pinY(K.crank("latch", 0, u), pin) - pinY(K.crank("latch", 0, 0), pin)).toBeCloseTo(P.get("LP_SLIDE")! * u, 9);
    }
  });
});

describe("registry entry", () => {
  test("validates a state and refuses one without bar rises", async () => {
    const ok = await OGEE16_KINEMATICS.params["~standard"].validate({ zR: [0, 0, 0, 0], zC: [9, 0, 0, 0], lp: 0 });
    expect(ok.issues).toBeUndefined();
    const bad = await OGEE16_KINEMATICS.params["~standard"].validate({ zC: [9, 0, 0, 0], lp: 0 });
    expect(bad.issues?.length).toBe(1);
  });
});
