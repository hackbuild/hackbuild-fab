// aileron-differential, STANCHION's horn solve (originals/stanchion/files/
// stanchion.html solveHorns lines 293 to 314, placeRods 315 to 331;
// lineage stanchion.viewer/v2; stanchion record 5.3). Per side: carry the
// rod socket from the camera carrier into the yaw plate frame through the
// pitch (tilt) and roll joints, take the lateral offset dy to the horn
// plane, reduce the rod to the in-plane radius sqrt(L^2 - dy^2), and meet
// the horn circle by the two-circle construction, keeping the aft root.
// No root, or a horn past 85 deg, is reported, not clamped. The original
// reads the socket through three.js matrices (ROLL.localToWorld,
// YAW.worldToLocal); here the same chain is written out: the pitch group
// sits gimbal_z - yawplate_z above the yaw plate and turns about y, the
// roll group turns about x. The geometry defaults are the page's
// window.DATA P (line 79), from cad.py lines 42 to 60.

import type { DerivedValue } from "@hackbuild/spec";
import { computed, type InputParam, type Values } from "./common.js";

const R = Math.PI / 180;

export const AILERON_PARAMS: readonly InputParam[] = [
  { key: "tilt", unit: "deg", doc: "carrier pitch (the page's tilt slider, -22 to 10)", default: 0 },
  { key: "roll", unit: "deg", doc: "carrier roll (the page's roll slider, -10 to 10)", default: 0 },
  { key: "rodAttX", unit: "mm", doc: "rod socket x on the carrier (P.rod_att_x)", default: -25 },
  { key: "rodY", unit: "mm", doc: "rod socket offset either side (P.rod_y)", default: 30 },
  { key: "rodAttZ", unit: "mm", doc: "rod socket height (P.rod_att_z)", default: 500 },
  { key: "gimbalZ", unit: "mm", doc: "gimbal centre height (P.gimbal_z)", default: 520 },
  { key: "yawplateZ", unit: "mm", doc: "yaw plate height (P.yawplate_z)", default: 432.6 },
  { key: "pitchAxisZ", unit: "mm", doc: "tilt servo axis height (P.pitch_axis_z)", default: 460 },
  { key: "sgAxisX", unit: "mm", doc: "tilt servo axis x (P.sg_axis_x)", default: -10 },
  { key: "sgH", unit: "mm", doc: "SG90 case height (P.sg_h)", default: 22.5 },
  { key: "sgShaftUp", unit: "mm", doc: "SG90 shaft above the case (P.sg_shaft_up)", default: 4 },
  { key: "hornR", unit: "mm", doc: "horn radius (P.sg_horn_r)", default: 15 },
];

/** One side's horn: angle deg and the horn tip in the yaw plate frame, or null when the rod cannot reach. */
export function solveSide(p: Values, sy: 1 | -1): { readonly angle: number; readonly x: number; readonly z: number } | null {
  const pitch = p["tilt"]! * R;
  const roll = p["roll"]! * R;
  const v = [p["rodAttX"]!, sy * p["rodY"]!, p["rodAttZ"]! - p["gimbalZ"]!] as const;
  const u = [v[0], v[1] * Math.cos(roll) - v[2] * Math.sin(roll), v[1] * Math.sin(roll) + v[2] * Math.cos(roll)] as const;
  const l = [u[0] * Math.cos(pitch) + u[2] * Math.sin(pitch), u[1], -u[0] * Math.sin(pitch) + u[2] * Math.cos(pitch) + (p["gimbalZ"]! - p["yawplateZ"]!)] as const;
  const RODL = p["rodAttZ"]! - p["pitchAxisZ"]!;
  const HORN = p["hornR"]!;
  const hy = sy * (1.0 + p["sgH"]! + p["sgShaftUp"]! + 2.0);
  const dy = hy - l[1];
  const rr = RODL * RODL - dy * dy;
  if (rr <= 0) return null;
  const rad = Math.sqrt(rr);
  const cx = p["sgAxisX"]!;
  const cz = p["pitchAxisZ"]! - p["yawplateZ"]!;
  const dx = l[0] - cx;
  const dzz = l[2] - cz;
  const dd = Math.hypot(dx, dzz);
  if (dd > HORN + rad || dd < Math.abs(HORN - rad)) return null;
  const a = (HORN * HORN - rad * rad + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, HORN * HORN - a * a));
  const px = cx + (a * dx) / dd;
  const pz = cz + (a * dzz) / dd;
  const s1 = [px + (h * dzz) / dd, pz - (h * dx) / dd] as const;
  const s2 = [px - (h * dzz) / dd, pz + (h * dx) / dd] as const;
  const pick = s1[0] < s2[0] ? s1 : s2;
  return { angle: Math.atan2(pick[1] - cz, -(pick[0] - cx)) / R, x: pick[0], z: pick[1] };
}

export function aileronDerive(p: Values): Record<string, DerivedValue> {
  const a = solveSide(p, 1);
  const b = solveSide(p, -1);
  const reach = a !== null && b !== null;
  const near = (a !== null && Math.abs(a.angle) > 85) || (b !== null && Math.abs(b.angle) > 85);
  const out: Record<string, DerivedValue> = {
    rodLength: computed(p["rodAttZ"]! - p["pitchAxisZ"]!, "mm", "rod_att_z - pitch_axis_z"),
    reachable: computed(reach ? 1 : 0, "count", "1 when both rods meet their horn circles"),
    nearTravelLimit: computed(near ? 1 : 0, "count", "1 when a horn is past 85 deg (placeRods, line 329)"),
  };
  if (a !== null) out["servoA"] = computed(a.angle, "deg", "horn angle, side +y: atan2(z - cz, -(x - cx)) of the aft two-circle root");
  if (b !== null) out["servoB"] = computed(b.angle, "deg", "horn angle, side -y: atan2(z - cz, -(x - cx)) of the aft two-circle root");
  return out;
}
