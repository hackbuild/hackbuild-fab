// The recorded results of the mechanism canon that are rules (CANONS.md
// 3.2, M06-T03 step 4), each a ConstraintDef core registers at load. A
// rule with an exact legal value (0) states a construction the originals
// proved by failing: a horizontal link at rest, a crown struck from the
// rocker's origin, a separate detent strip, a round journal. Severity per
// D-067 is exported beside each id; the solver answers the interval.

import { qualify, qualifyRow, type Bound, type ConstraintCtx, type ConstraintDef, type ConstraintDim, type Severity } from "@hackbuild/spec";

/** A def whose one dim is legal exactly at 0, with the reason the record gives. */
function exactlyZero(id: string, dim: ConstraintDim, unit: string, step: number, reason: string): ConstraintDef {
  const bound = (side: "lo" | "hi"): Bound => ({ value: 0, side, kernel: "motion", reason, source: id, ...qualify([]) });
  return {
    id, version: "1.0.0", dims: [dim], kernels: ["motion"], units: { [dim]: unit }, steps: { [dim]: step },
    bounds: (d) => (d === dim ? [bound("lo"), bound("hi")] : []),
  };
}

export const RIGID_TWO_PIN_LINK_ID = "mech/rigid-two-pin-link";
export const rigidTwoPinLink = exactlyZero(RIGID_TWO_PIN_LINK_ID, "link.dzAtRest", "mm", 0.01,
  "a rigid link between two vertical sliders forces L^2 = S^2 + dz^2, so it jams unless it lies horizontal at rest (OGEE R7 to R17; mechanisms.seed.yaml line 104)");

export const CROWN_FROM_ROCKER_ORIGIN_ID = "mech/crown-from-rocker-origin";
export const crownFromRockerOrigin = exactlyZero(CROWN_FROM_ROCKER_ORIGIN_ID, "crown.originOffset", "mm", 0.01,
  "a crown arc struck from the rocker's own origin is exact at any tilt; any offset moves the rod with the tilt (mechanisms.seed.yaml line 103)");

export const DETENT_STRIP_SEPARATE_ID = "mech/detent-strip-separate";
export const detentStripSeparate = exactlyZero(DETENT_STRIP_SEPARATE_ID, "detent.fusedLength", "mm", 0.01,
  "a detent beam fused along its length is about 10x too stiff; the strip is a separate flat part (KNURL README; mechanisms.seed.yaml line 90)");

export const PEG_IS_CAM_ID = "mech/peg-is-cam";
export const pegIsCam = exactlyZero(PEG_IS_CAM_ID, "journal.flats", "count", 1,
  "a lasercut square peg acts as a cam; a journal between sheet parts is round stock (mechanisms.seed.yaml line 105; pairs with CHK-ASM-09)");

/** Every exact rule is a construction error when broken. */
export const EXACT_RULE_SEVERITY: Severity = "block";

export const COINCIDENCE_RAMP_ID = "mech/coincidence-ramp";
export const COINCIDENCE_RAMP: ConstraintDim = "latch.rampDeg";

/**
 * Ramp floor of the coincidence latch's foot slot: coincidence.rampMinDeg
 * (40, inferred) against the acrylic3 static friction row, whose angle
 * atan(mu) the reason prints beside it.
 */
export const coincidenceRamp: ConstraintDef = {
  id: COINCIDENCE_RAMP_ID, version: "1.0.0", dims: [COINCIDENCE_RAMP], kernels: ["motion", "profile"],
  units: { [COINCIDENCE_RAMP]: "deg" }, steps: { [COINCIDENCE_RAMP]: 1 },
  bounds(dim, ctx: ConstraintCtx): readonly Bound[] {
    if (dim !== COINCIDENCE_RAMP) return [];
    const floor = ctx.profile.constant("coincidence.rampMinDeg");
    const acrylic = ctx.profile.material("acrylic3");
    const mu = acrylic.frictionStatic?.["acrylic3"];
    const slip = mu === undefined ? "acrylic3 static friction unknown" : `acrylic on acrylic static friction ${mu} (${acrylic.provenance.tier}) slips at ${(Math.atan(mu) * 180 / Math.PI).toFixed(1)} deg`;
    return [{
      value: floor.value, side: "lo", kernel: "profile", source: COINCIDENCE_RAMP_ID,
      reason: `the foot ramp returns the rod by gravity only at ${floor.value} deg or more (coincidence.rampMinDeg, ${floor.provenance.tier}); ${slip}`,
      ...qualifyRow(floor.provenance.tier),
    }];
  },
};
export const COINCIDENCE_RAMP_SEVERITY: Severity = "block";

export const DETENT_BANDS_ID = "mech/detent-bands";
export const DETENT_STRAIN: ConstraintDim = "detent.strain";
export const DETENT_CLICK: ConstraintDim = "detent.clickForce";

/**
 * KNURL's own detent bands (knurl.html lines 1202 to 1204): strain at full
 * lift under 2 percent, click force between 0.4 and 3 N. KNURL raises the
 * strain line at its default level (err) and the click lines as warn.
 */
export const detentBands: ConstraintDef = {
  id: DETENT_BANDS_ID, version: "1.0.0", dims: [DETENT_STRAIN, DETENT_CLICK], kernels: ["profile"],
  units: { [DETENT_STRAIN]: "ratio", [DETENT_CLICK]: "N" }, steps: { [DETENT_STRAIN]: 0.0001, [DETENT_CLICK]: 0.01 },
  bounds(dim, ctx: ConstraintCtx): readonly Bound[] {
    const row = (id: string, side: "lo" | "hi", reason: string): Bound => {
      const c = ctx.profile.constant(id);
      return { value: c.value, side, kernel: "profile", source: DETENT_BANDS_ID, reason: `${reason} (${id}, ${c.provenance.tier})`, ...qualifyRow(c.provenance.tier) };
    };
    if (dim === DETENT_STRAIN) return [row("knurl.pawlStrainMax", "hi", "a detent strip strained over 2 percent at full lift fatigues: thinner strip or longer free length")];
    if (dim === DETENT_CLICK) {
      return [
        row("knurl.clickMinN", "lo", "a click under 0.4 N is faint: thicker strip or shorter free length"),
        row("knurl.clickMaxN", "hi", "a click over 3 N is stiff: thinner strip or longer free length"),
      ];
    }
    return [];
  },
};
export const DETENT_STRAIN_SEVERITY: Severity = "block";
export const DETENT_CLICK_SEVERITY: Severity = "warn";
