// mech/ogee16-latch-servo-window (M01-T10 step 2, plan-deltas R56): the
// x window of the OGEE16 latch servo, from the canonical params.scad
// (lineage ogee16.params/r16p), lines 183 to 186. Both bounds are encoded
// as the source states them, method derived, read from profile constants
// ogee16.latchServoX.lo and .hi. The floor decomposes as column servo 3's
// end 104.4 + SV_SHAFT_OFF 5.5 + SV_L/2 11.4 = 121.3 at zero clearance
// (computed from stated values), so 2.0 mm of it (computed) is a term the
// source never names; the ceiling's terms
// are not in the source at all. Both stay unknown (README); this def adds
// no term. check_servos.py (lineage ogee16.check-servos/r16p) boxes the
// latch body at LSV_X - SV_SHAFT_OFF, the geometry the floor reason names.
// Severity block: a servo body through a column servo or a crank through
// the rail is a clash.

import { qualifyRow, type Bound, type ConstraintDef, type ConstraintDim, type Severity } from "@hackbuild/spec";

export const OGEE16_LATCH_SERVO_ID = "mech/ogee16-latch-servo-window";

/** x of the latch servo shaft, OGEE16 LSV_X, mm. */
export const LATCH_SERVO_X: ConstraintDim = "latchServo.x";

export const OGEE16_LATCH_SEVERITY: Severity = "block";

export const LATCH_LO_ID = "ogee16.latchServoX.lo";
export const LATCH_HI_ID = "ogee16.latchServoX.hi";
export const COL_SERVO3_END_ID = "ogee16.colServo3EndX";
export const RAIL_X1_ID = "ogee16.railX1";

export const ogee16LatchServoWindow: ConstraintDef = {
  id: OGEE16_LATCH_SERVO_ID,
  version: "1.0.0",
  dims: [LATCH_SERVO_X],
  kernels: ["mesh"],
  units: { [LATCH_SERVO_X]: "mm" },
  bounds(dim, ctx): readonly Bound[] {
    if (dim !== LATCH_SERVO_X) return [];
    const lo = ctx.profile.constant(LATCH_LO_ID);
    const hi = ctx.profile.constant(LATCH_HI_ID);
    const end = ctx.profile.constant(COL_SERVO3_END_ID);
    const rail = ctx.profile.constant(RAIL_X1_ID);
    return [
      {
        value: lo.value, side: "lo", kernel: "mesh",
        reason: `printed servo body must clear the last column servo, which ends at x ${end.value.toFixed(1)} (OGEE16 params.scad, ${lo.provenance.tier})`,
        source: LATCH_LO_ID, ...qualifyRow(lo.provenance.tier),
      },
      {
        value: hi.value, side: "hi", kernel: "mesh",
        reason: `laser crank plus keeper washer must clear the +X rail at x ${rail.value.toFixed(0)} (OGEE16 params.scad, ${hi.provenance.tier})`,
        source: LATCH_HI_ID, ...qualifyRow(hi.provenance.tier),
      },
    ];
  },
};
