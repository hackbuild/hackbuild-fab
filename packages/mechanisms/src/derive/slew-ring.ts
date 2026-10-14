// slew-ring-joint, PINTLE R6 (originals/pintle/files/src/pintle_parts.py,
// lineage pintle.parts/r6): the rotor's thrust flange (r_j, flange_t) runs
// in the stator's journal bore r_jbore = r_j + cl_journal and bears on the
// thrust floor at z_thrust. The floor is cut through by the central bore
// r_bore (stator, lines 328 to 358) and the rotor hangs its pocket boss
// r_rboss below it (rotor, lines 402 to 408), so the bearing annulus runs
// from max(r_bore, r_rboss) to r_j. Parameter defaults are P (lines 19 to
// 69). The R4 README's annulus 12.6 to 17.0 (409.2 mm2) used r_rboss as
// its inner edge; R6 cuts the floor to 12.9 (computed 385.1 mm2). The ring
// and spline section moduli the README states (2694 and 10.9 mm3) are not
// computed by either source, so derive() returns none (M06-T05 step 1).
// The rotor's lead-in chamfer (line 429, cham_out from r_j - 0.6 at
// z_thrust) takes the flange's outer 0.6 mm off the floor, so the face
// that bears is rIn to r_j - leadIn: 322.2 mm2 (computed), which the
// original's meshes give as their contact at z_thrust within the polygon
// tessellation (test/slew-ring.body.test.ts, test/legacy/slew-ring.json).

import type { DerivedValue } from "@hackbuild/spec";
import { computed, type InputParam, type Values } from "./common.js";

export const SLEW_RING_PARAMS: readonly InputParam[] = [
  { key: "rJ", unit: "mm", doc: "rotor journal and thrust flange radius (P.r_j, line 60)", default: 17 },
  { key: "flangeT", unit: "mm", doc: "thrust flange height, the journal length (P.flange_t, line 53)", default: 3 },
  { key: "rBore", unit: "mm", doc: "stator central bore radius (P.r_bore, line 62)", default: 12.9 },
  { key: "rRboss", unit: "mm", doc: "rotor hanging boss radius (P.r_rboss, line 63)", default: 12.6 },
  { key: "clJournal", unit: "mm", doc: "radial running fit (P.cl_journal, line 38)", default: 0.2 },
  { key: "clThrust", unit: "mm", doc: "axial float (P.cl_thrust, line 39)", default: 0.25 },
  { key: "splineD", unit: "mm", doc: "SG90 spline diameter (P.sv_spline_d, line 26)", default: 4.8 },
  { key: "leadIn", unit: "mm", doc: "rotor flange lead-in chamfer at the thrust floor, radial (cham_out r_j - 0.6, line 429)", default: 0.6 },
];

export function slewRingDerive(p: Values): Record<string, DerivedValue> {
  const rIn = Math.max(p["rBore"]!, p["rRboss"]!);
  const rOut = p["rJ"]!;
  return {
    journalBore: computed(rOut + p["clJournal"]!, "mm", "r_jbore = r_j + cl_journal"),
    journalArea: computed(Math.PI * 2 * rOut * p["flangeT"]!, "mm2", "pi D h, the journal face (D = 2 r_j, h = flange_t)"),
    thrustRIn: computed(rIn, "mm", "max(r_bore, r_rboss), where the stator floor and rotor flange both exist"),
    thrustArea: computed(Math.PI * (rOut * rOut - rIn * rIn), "mm2", "pi (r_j^2 - rIn^2), the thrust annulus"),
    thrustContactROut: computed(rOut - p["leadIn"]!, "mm", "r_j - leadIn, where the lead-in chamfer meets the thrust floor"),
    thrustContactArea: computed(Math.PI * ((rOut - p["leadIn"]!) ** 2 - rIn * rIn), "mm2", "pi ((r_j - leadIn)^2 - rIn^2), the floor the flange bears on"),
    splineArea: computed((Math.PI * p["splineD"]! * p["splineD"]!) / 4, "mm2", "pi d^2 / 4"),
    axialFloat: computed(p["clThrust"]!, "mm", "cl_thrust"),
  };
}
