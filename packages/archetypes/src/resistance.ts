// Resistances at load (D-098, M06-T07 step 3): every declared conductor
// section through ProfileLookup.resistivity() and profile
// sectionResistance, the one home of R = rho L / A (M00-T02). An
// archetype's tier is the lowest tier among the rows it read; one with no
// sections reads none and keeps the lowest rung, inferred (D-083).

import { lowestTier, type ArchetypeDef, type ConductorSection, type ProfileLookup, type Tier } from "@hackbuild/spec";
import { createProfileLookup, loadProfile, sectionResistance } from "@hackbuild/profile";

export interface SectionOhm {
  readonly id: string;
  readonly material: string;
  readonly direction: ConductorSection["direction"];
  /** ohm, or [lo, hi] when the row is a range. */
  readonly ohm: number | readonly [number, number];
  readonly tier: Tier;
  readonly rowId: string;
}

export function resistances(sections: readonly ConductorSection[], profile: ProfileLookup): SectionOhm[] {
  return sections.map((s) => {
    const row = profile.resistivity(s.material, s.direction, "printed");
    const r = sectionResistance(row, s.lengthMm, s.widthMm * s.thicknessMm);
    const k = s.series ?? 1;
    const ohm = typeof r.ohm === "number" ? r.ohm * k : ([r.ohm[0] * k, r.ohm[1] * k] as const);
    return { id: s.id, material: s.material, direction: s.direction, ohm, tier: r.tier, rowId: r.rowId };
  });
}

/** The lowest tier among the rows an archetype's sections read; inferred when it reads none. */
export function archetypeTier(def: Pick<ArchetypeDef, "sections">, profile: ProfileLookup): Tier {
  const tiers = resistances(def.sections ?? [], profile).map((r) => r.tier);
  return lowestTier(tiers) ?? "inferred";
}

/** The shipped profile, read once; the registry computes tiers on it at load. */
let shipped: ProfileLookup | undefined;
export function shippedProfile(): ProfileLookup {
  shipped ??= createProfileLookup(loadProfile());
  return shipped;
}
