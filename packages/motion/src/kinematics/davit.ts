// The DAVIT arm chain, ported from sim_r4.html chain() (line 210, canonical
// lineage row davit.collide/r4-page; the same function as davit.html line
// 207, copy row davit.collide/r3-page) and checked against assembly.py
// chain() (lineage row davit.assembly/r3). Row-major 4x4 matrices in mm;
// poses in degrees. The right arm hangs on the base; the left arm is the
// same chain premultiplied by a half turn about the pipe.
//
// The chain numbers are the ones davit.html carries in DATA.const (std) and
// DATA.constm (mini); core/test/davit-sweep.test.ts compares them with the
// page. davitPlacements places every body sim sweeps, so sim reads poses
// through the place(pose) binding core makes and never computes one (D-139).

import { IDENTITY, mul, rotX, rotY, rotZ, trans, type Mat4 } from "./mat4.js";

/** Joint angles in degrees: pitch, roll, elbow, wrist, grip. */
export interface DavitPose {
  readonly pitch: number;
  readonly roll: number;
  readonly elbow: number;
  readonly wrist: number;
  readonly grip: number;
}

/** The numbers davit.html carries in DATA.const (std) and DATA.constm (mini). */
export interface DavitConst {
  readonly XF: Readonly<Record<string, number>>;
  readonly BX: number;
  readonly s1_z: number;
  readonly dx: number;
  readonly rface: number;
  readonly wface: number;
  readonly ehx: number;
  readonly base_off: Readonly<Record<string, number>>;
  readonly kinds: readonly string[];
  readonly crank_dz: number;
  readonly elb_dz: number;
  readonly wrist_dx: number;
  readonly palm_dz: number;
  readonly jaw_y: number;
  readonly jaw_z: number;
  readonly jaw_cc: number;
  readonly cap_y: number;
  readonly tip_local: readonly number[];
}

export type DavitModel = "std" | "mini";
export type DavitPipe = "1in" | "125in" | "15in";
export type DavitSide = "R" | "L";

export const LINK_NAMES = ["crank", "upper", "fore", "palm", "jaw_drive", "jaw_idle", "pincap"] as const;
export type LinkName = (typeof LINK_NAMES)[number];

const XF = { "1in": 59.9, "125in": 64.3, "15in": 67.35 };
const OFF = { "1in": 25.05, "125in": 29.45, "15in": 32.5 };
const SHARED = { jaw_y: 14.6, jaw_z: -44, jaw_cc: 16, cap_y: 21.4, tip_local: [-8, 18, -90], base_off: OFF };

export const STD_CONST: DavitConst = {
  ...SHARED, XF, BX: 32, s1_z: 10.4, dx: 12, rface: -60, wface: -96, ehx: 14, kinds: ["STD", "MIC", "STD", "MIC", "MIC"],
  crank_dz: -50, elb_dz: -88, wrist_dx: -3.6, palm_dz: -86,
};
export const MINI_CONST: DavitConst = {
  ...SHARED, XF: { "1in": 48.7, "125in": 53.1, "15in": 56.15 }, BX: 26, s1_z: 5.4, dx: 11.2, rface: -52, wface: -70, ehx: 10,
  kinds: ["MIC", "MIC", "MIC", "MIC", "MIC"], crank_dz: -42, elb_dz: -62, wrist_dx: -2, palm_dz: -60,
};
export const constOf = (m: DavitModel): DavitConst => (m === "std" ? STD_CONST : MINI_CONST);

const D2R = Math.PI / 180;
const lo = (kind: string): string => (kind === "STD" ? "std" : "mic");

/** Link and hardware world matrices for one arm. Hardware index 0 to 9 follows hwNames. */
export interface ArmChain {
  readonly links: Readonly<Record<LinkName, Mat4>>;
  readonly hw: readonly Mat4[];
}

/** davit.html chain() at zero explode; xf is C.XF[pipe]. */
export function davitChain(c: DavitConst, xf: number, p: DavitPose, left: boolean): ArmChain {
  const base = left ? rotZ(Math.PI) : IDENTITY;
  const Tc = mul(mul(base, trans(xf + c.dx, 0, c.s1_z)), rotX(p.pitch * D2R));
  const Tu = mul(mul(Tc, trans(c.BX, 0, c.crank_dz)), rotZ(p.roll * D2R));
  const Tf = mul(mul(Tu, trans(0, 0, c.elb_dz)), rotX(p.elbow * D2R));
  const Tp = mul(mul(Tf, trans(c.wrist_dx, 0, c.palm_dz)), rotZ(p.wrist * D2R));
  const g = p.grip * D2R;
  const Tjd = mul(mul(mul(Tp, trans(0, c.jaw_y, c.jaw_z)), rotY(-g)), rotX(-Math.PI / 2));
  const Tji = mul(mul(mul(Tp, trans(-c.jaw_cc, c.jaw_y, c.jaw_z)), rotY(g)), rotX(-Math.PI / 2));
  const Tcap = mul(mul(Tp, trans(-c.jaw_cc, c.cap_y, c.jaw_z)), rotX(-Math.PI / 2));
  const RYp = rotY(Math.PI / 2), RXp = rotX(Math.PI), RXn = rotX(-Math.PI / 2);
  const hw: Mat4[] = [
    mul(mul(mul(base, trans(xf + 8, 0, c.s1_z)), RYp), rotZ(Math.PI)),
    mul(mul(Tc, trans(8 - c.dx, 0, 0)), RYp),
    mul(mul(mul(Tc, trans(c.BX, 0, c.rface)), RXp), rotZ(Math.PI)),
    mul(mul(Tu, trans(0, 0, -10)), RXp),
    mul(mul(Tu, trans(c.ehx, 0, c.elb_dz)), RYp),
    mul(mul(Tf, trans(c.ehx, 0, 0)), RYp),
    mul(mul(mul(Tf, trans(c.wrist_dx, 0, c.wface)), RXp), rotZ(Math.PI)),
    mul(mul(Tp, trans(0, 0, -10)), RXp),
    mul(mul(mul(Tp, trans(0, 11.4, c.jaw_z)), RXn), rotZ(Math.PI / 2)),
    mul(Tjd, trans(0, 0, -3.2)),
  ];
  return { links: { crank: Tc, upper: Tu, fore: Tf, palm: Tp, jaw_drive: Tjd, jaw_idle: Tji, pincap: Tcap }, hw };
}

/** Body names of the ten hardware pieces, as davit.html hwNames(): servo or horn, kind, index. */
export function hwNames(c: DavitConst): string[] {
  const k = [c.kinds[0]!, c.kinds[0]!, "MIC", "MIC", c.kinds[2]!, c.kinds[2]!, "MIC", "MIC", "MIC", "MIC"];
  return k.map((s, i) => `${lo(s)}${i % 2 === 0 ? "_servo#" : "_horn#"}${i}`);
}

/** One placed body: its name, its arm ("" for the mount) and its world matrix. */
export interface DavitPlaced {
  readonly n: string;
  readonly side: DavitSide | "";
  readonly m: Mat4;
}

/**
 * Every body of one configuration in davit.html order: the mount, both
 * bases, then for each arm its seven links and ten hardware pieces. The
 * right base sits base_off along +x; the left is the same base turned a
 * half turn about the pipe.
 */
export function davitPlacements(model: DavitModel, pipe: DavitPipe, pose: Readonly<Record<DavitSide, DavitPose>>): DavitPlaced[] {
  const c = constOf(model);
  const off = c.base_off[pipe]!;
  const out: DavitPlaced[] = [
    { n: "mount", side: "", m: IDENTITY },
    { n: "base", side: "R", m: trans(off, 0, 0) },
    { n: "base", side: "L", m: mul(trans(-off, 0, 0), rotZ(Math.PI)) },
  ];
  const names = hwNames(c);
  for (const side of ["R", "L"] as const) {
    const arm = davitChain(c, c.XF[pipe]!, pose[side], side === "L");
    for (const link of LINK_NAMES) out.push({ n: link, side, m: arm.links[link] });
    names.forEach((n, i) => out.push({ n, side, m: arm.hw[i]! }));
  }
  return out;
}
