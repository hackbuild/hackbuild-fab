// pin-free-balance-beam, STIPPLE R17b's link (originals/stipple/files/
// stipple-r17b.html link() lines 142 to 148; lineage stipple.kin/r17b): the
// link's boss rides the row tooth on RT_FLOOR, its nose the column tooth on
// CT_FLOOR, so dz = (RT_FLOOR + zRow + BOSS_R) - (CT_FLOOR + zCol + NOSE_R),
// span = sqrt(LINK_L^2 - dz^2), tilt atan2(dz, span), and the crown top
// (za + zb)/2 + CROWN_R (seed: crown_top = (z_col + z_row)/2 + crown_r).
// Half select is the row at STROKE and the column at 0; its rise is
// exactly STROKE/2. The defaults are the page's DATA.P (line 117). The same
// link() is ported for the STIPPLE motion program in
// packages/motion/src/kinematics/stipple.ts; mechanisms and motion are both
// tier 1 and may not import each other (M06-T03 card defects).

import type { DerivedValue } from "@hackbuild/spec";
import { computed, type InputParam, type Values } from "./common.js";

export const BALANCE_BEAM_PARAMS: readonly InputParam[] = [
  { key: "zRow", unit: "mm", doc: "row tooth lift; the half select pose lifts the row by STROKE", default: 5 },
  { key: "zCol", unit: "mm", doc: "column tooth lift; 0 at half select", default: 0 },
  { key: "stroke", unit: "mm", doc: "select stroke (DATA.P.STROKE, R17b; R17 is 4.8)", default: 5 },
  { key: "crownR", unit: "mm", doc: "crown radius (DATA.P.CROWN_R)", default: 6 },
  { key: "crownTop", unit: "mm", doc: "crown top at rest (DATA.P.CROWN_TOP)", default: 55 },
  { key: "noseR", unit: "mm", doc: "link nose radius on the column tooth (DATA.P.NOSE_R)", default: 2 },
  { key: "bossR", unit: "mm", doc: "link boss radius in the row tooth (DATA.P.BOSS_R)", default: 1.6 },
  { key: "linkL", unit: "mm", doc: "link length between the contact centres (DATA.P.LINK_L)", default: 12 },
  { key: "rtFloor", unit: "mm", doc: "row tooth slot floor (DATA.P.RT_FLOOR)", default: 47.4 },
  { key: "ctFloor", unit: "mm", doc: "column tooth slot floor (DATA.P.CT_FLOOR)", default: 47 },
  { key: "t", unit: "mm", doc: "link sheet thickness, the extrusion depth of geomOf (DATA.P.T)", default: 1.5 },
];

/** link() of the original, without the x placement: tilt rad, crown top mm. */
export function link(p: Values, zR: number, zC: number): { readonly theta: number; readonly span: number; readonly crown: number } {
  const zb = p["rtFloor"]! + zR + p["bossR"]!;
  const za = p["ctFloor"]! + zC + p["noseR"]!;
  const dz = zb - za;
  const span = Math.sqrt(Math.max(p["linkL"]! * p["linkL"]! - dz * dz, 0));
  return { theta: Math.atan2(dz, span), span, crown: (za + zb) / 2 + p["crownR"]! };
}

export function balanceBeamDerive(p: Values): Record<string, DerivedValue> {
  const now = link(p, p["zRow"]!, p["zCol"]!);
  const half = link(p, p["stroke"]!, 0);
  const full = link(p, p["stroke"]!, p["stroke"]!);
  return {
    crown: computed(now.crown, "mm", "(za + zb)/2 + CROWN_R at the given tooth lifts"),
    rise: computed(now.crown - p["crownTop"]!, "mm", "crown - CROWN_TOP"),
    tilt: computed(now.theta * 180 / Math.PI, "deg", "atan2(dz, sqrt(LINK_L^2 - dz^2))"),
    span: computed(now.span, "mm", "sqrt(LINK_L^2 - dz^2)"),
    halfSelectRise: computed(half.crown - p["crownTop"]!, "mm", "rise with the row at STROKE and the column at 0, exactly STROKE/2"),
    tiltMax: computed(half.theta * 180 / Math.PI, "deg", "the link's tilt at half select"),
    fullSelectRise: computed(full.crown - p["crownTop"]!, "mm", "rise with row and column at STROKE"),
  };
}
