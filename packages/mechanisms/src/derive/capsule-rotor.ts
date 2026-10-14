// capsule-pocket-rotor, SLUG (originals/slug/files/slug.scad, lineage
// slug.scad/slug-12): the pocket is the only metering element. gz_rot /
// gz_pin = 76/19 = 4 (lines 35 to 36) with npock 4 pockets (line 31), so one
// motor revolution turns the rotor one pocket: one vend. The mouth half
// width fb 78 (line 95) gives 156 mm, 3.07 capsule diameters of cap_d 50.8
// (line 28): spheres arch across 2. The ceiling sits 1.9 mm over the drum
// (z_ceil = z_rot + rot_h + 1.9, line 84): the moving face reaches the
// mouth. Centre distance CD = gm (gz_rot + gz_pin)/2 (line 38) computes
// 118.75; the comment beside it says 106.25. The cage params (lines 20 to
// 68) drive the bodies of src/bodies/slug-cage.ts; the rim, web and slot
// readouts are audit.py's (lines 25, 56, 104), printed to its precision.

import type { DerivedValue, ProfileLookup } from "@hackbuild/spec";
import { computed, type InputParam, type Values } from "./common.js";
import { cageDerived, cageParams, sinDeg } from "../bodies/slug-cage.js";

export const CAPSULE_ROTOR_PARAMS: readonly InputParam[] = [
  { key: "capD", unit: "mm", doc: "capsule diameter (cap_d, line 28)", default: 50.8 },
  { key: "pockD", unit: "mm", doc: "pocket diameter (pock_d, line 29)", default: 62 },
  { key: "nPock", unit: "count", doc: "pockets (npock, line 31)", default: 4 },
  { key: "gm", unit: "mm", doc: "gear module (gm, line 34)", default: 2.5 },
  { key: "gzRot", unit: "count", doc: "rotor teeth (gz_rot, line 35)", default: 76 },
  { key: "gzPin", unit: "count", doc: "pinion teeth (gz_pin, line 36)", default: 19 },
  { key: "fb", unit: "mm", doc: "half the funnel mouth (fb, line 95)", default: 78 },
  { key: "ceilGap", unit: "mm", doc: "ceiling over the drum (z_ceil - z_rot - rot_h, line 84)", default: 1.9 },
  { key: "t", unit: "mm", doc: "ply thickness (t, line 23; the scad says measure your stock)", default: 3 },
  { key: "slop", unit: "mm", doc: "slot widening per side (slop, line 25)", default: 0.15 },
  { key: "pockRc", unit: "mm", doc: "pocket pitch radius (pock_rc, line 30)", default: 47.5 },
  { key: "gpa", unit: "deg", doc: "gear pressure angle (gpa, line 37)", default: 20 },
  { key: "rotH", unit: "mm", doc: "drum height (rot_h, line 46)", default: 54 },
  { key: "rotGearN", unit: "count", doc: "laminated toothed discs (rot_gear_n, line 47)", default: 2 },
  { key: "rotRingZ", unit: "mm", doc: "equator ring height in the drum (rot_ring_z, line 48)", default: 19 },
  { key: "spcR", unit: "mm", doc: "spacer pitch circle (spc_r, line 61)", default: 85 },
  { key: "spcN", unit: "count", doc: "spacers per tier (spc_n, line 62)", default: 6 },
  { key: "spcW", unit: "mm", doc: "spacer tenon and slot width (spc_w, line 63)", default: 18 },
  { key: "spcBody", unit: "mm", doc: "spacer shoulder width (spc_body, line 64)", default: 24 },
  { key: "rotBore", unit: "mm", doc: "axle bore (rot_bore, line 67)", default: 8.4 },
  { key: "tieR", unit: "mm", doc: "inner tie rod radius (tie_r, line 68)", default: 11 },
  { key: "tieR2", unit: "mm", doc: "outer tie rod radius (tie_r2, line 68; params.json and the page say 70)", default: 52 },
  { key: "tieD", unit: "mm", doc: "tie rod hole diameter (tie_d, line 68)", default: 4.5 },
  { key: "fn", unit: "count", doc: "circle points ($fn, line 20)", default: 72 },
];

/** SLUG's metering train (slug.scad lines 31, 35 to 36): gz_rot / gz_pin, motor turns per pocket, half steps per vend. integer-metering-ratio reads the same three. */
export function slugMetering(p: Values, profile: ProfileLookup): Record<"ratio" | "motorRevsPerVend" | "halfStepsPerVend", DerivedValue> {
  const ratio = p["gzRot"]! / p["gzPin"]!;
  const steps = profile.constant("28byj48.halfStepsPerRev");
  const motorRevsPerVend = ratio / p["nPock"]!;
  return {
    ratio: computed(ratio, "ratio", "gz_rot / gz_pin"),
    motorRevsPerVend: computed(motorRevsPerVend, "rev", "ratio / npock, motor turns per pocket"),
    halfStepsPerVend: computed(motorRevsPerVend * steps.value, "half steps", "ratio / npock x 28byj48.halfStepsPerRev", [steps.provenance.tier]),
  };
}

export function capsuleRotorDerive(p: Values, profile: ProfileLookup): Record<string, DerivedValue> {
  const m = slugMetering(p, profile);
  const d = cageDerived(cageParams(p));
  return {
    ratio: m.ratio,
    centreDistance: computed((p["gm"]! * (p["gzRot"]! + p["gzPin"]!)) / 2, "mm", "gm (gz_rot + gz_pin) / 2"),
    motorRevsPerVend: m.motorRevsPerVend,
    halfStepsPerVend: m.halfStepsPerVend,
    mouthOverCapsule: computed((2 * p["fb"]!) / p["capD"]!, "ratio", "2 fb / cap_d; spheres arch under 2"),
    pocketSlop: computed((p["pockD"]! - p["capD"]!) / 2, "mm", "(pock_d - cap_d) / 2 per side"),
    ceilingGap: computed(p["ceilGap"]!, "mm", "the moving face's gap under the mouth; the seed rule is about 2 mm or less"),
    rootR: computed(d.rootR, "mm", "gm gz_rot / 2 - 1.25 gm, the ring and top disc radius"),
    rim: computed(d.rootR - (p["pockRc"]! + p["pockD"]! / 2), "mm", "root r - (pock_rc + pock_d / 2), the rim the spacers sit in"),
    web: computed(2 * p["pockRc"]! * sinDeg(45) - p["pockD"]!, "mm", "2 pock_rc sin 45 - pock_d, the web between adjacent pockets"),
    slotWidth: computed(p["t"]! + 2 * p["slop"]!, "mm", "t + 2 slop, the mortise across the tenon"),
    spacerGapA: computed(d.spcGap1, "mm", "rot_ring_z - rot_gear_n t, toothed pair up to the ring"),
    spacerGapB: computed(d.spcGap2, "mm", "rot_h - t - (rot_ring_z + t), ring up to the top disc"),
  };
}
