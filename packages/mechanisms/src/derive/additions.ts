// derive() of the D-096 additions whose relation the source computes
// (M06-T05 step 4). They register as candidates, so mech.derive refuses
// them; the package test runs these goldens.

import type { DerivedValue, ProfileLookup } from "@hackbuild/spec";
import { STANDARD_GRAVITY, computed, type InputParam, type Values } from "./common.js";
import { slugMetering } from "./capsule-rotor.js";

/** snap-tongue-relief, PLINTH (originals/plinth/files/plinth.html lines 2927 to 2928; defaults ST.snap line 2553 to 2554). */
export const SNAP_TONGUE_PARAMS: readonly InputParam[] = [
  { key: "lipW", unit: "mm", doc: "tongue thickness in the bend (ST.snap.lipW)", default: 1.5 },
  { key: "d", unit: "mm", doc: "engagement (ST.snap.d)", default: 0.3 },
  { key: "lip", unit: "mm", doc: "lip height (ST.snap.lip)", default: 7 },
  { key: "root", unit: "mm", doc: "root relief (ST.snap.root)", default: 1.4 },
];
export function snapTongueDerive(p: Values): Record<string, DerivedValue> {
  const free = p["lip"]! - p["root"]!;
  return {
    free: computed(free, "mm", "lip - root"),
    strain: computed(((3 * p["lipW"]! * p["d"]!) / (2 * free * free)) * 100, "percent", "3 lipW d / (2 free^2), percent"),
  };
}

/** counterbalance-band, DERRICK (originals/derrick/files/README-DERRICK.md lines 64 to 67): F = M / r. */
export const COUNTERBALANCE_PARAMS: readonly InputParam[] = [
  { key: "moment", unit: "N mm", doc: "gravity moment at full extension (README 234)", default: 234 },
  { key: "r", unit: "mm", doc: "band anchor radius from the shoulder axis (README 47.6)", default: 47.6 },
  { key: "bandGf", unit: "gf", doc: "band pull asked about (README about 500)", default: 500 },
];
export function counterbalanceDerive(p: Values): Record<string, DerivedValue> {
  return {
    bandForNeeded: computed((p["moment"]! / p["r"]! / STANDARD_GRAVITY) * 1000, "gf", "M / r over standard gravity"),
    momentOfBand: computed((p["bandGf"]! / 1000) * STANDARD_GRAVITY * p["r"]!, "N mm", "band gf x g x r"),
  };
}

/** integer-metering-ratio, SLUG (originals/slug/files/slug.scad lines 35 to 36). */
export const METERING_PARAMS: readonly InputParam[] = [
  { key: "gzRot", unit: "count", doc: "rotor teeth (gz_rot)", default: 76 },
  { key: "gzPin", unit: "count", doc: "pinion teeth (gz_pin)", default: 19 },
  { key: "nPock", unit: "count", doc: "pockets (npock)", default: 4 },
];
export function meteringDerive(p: Values, profile: ProfileLookup): Record<string, DerivedValue> {
  const m = slugMetering(p, profile);
  return { ratio: m.ratio, halfStepsPerVend: m.halfStepsPerVend };
}

/** crank-yoke, OGEE16 (params.scad line 152, CRANK_SW = asin(STROKE / (2 CRANK_R))): 2 R sin(SW) = stroke. */
export const CRANK_YOKE_PARAMS: readonly InputParam[] = [
  { key: "R", unit: "mm", doc: "crank radius", default: 6 },
  { key: "stroke", unit: "mm", doc: "bar stroke", default: 9 },
];
export function crankYokeDerive(p: Values): Record<string, DerivedValue> {
  return { sweep: computed((Math.asin(p["stroke"]! / (2 * p["R"]!)) * 180) / Math.PI, "deg", "SW = asin(stroke / (2 R))") };
}
