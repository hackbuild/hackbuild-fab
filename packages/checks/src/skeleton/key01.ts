// CHK-KEY-01, flex cone contact gap at least 1.2 and 35 to 50 percent of
// cone height (PIP 2026-09: a pressed cone travels about half its height;
// pip-controller bench/part1.html lines 233 and 238 hold the gap at 35 to
// 50 percent of the cone, never under 1.2 mm; D-241). The band ends and the
// floor are profile constants key.flexGapFracMin, key.flexGapFracMax and
// key.flexGapFloor. The check measures the travel param itself, so its fix
// is the param's nearest legal value (D-064), taken from the legal interval
// the run returns, so the fix and the verdict read the same rows.

import type { CheckCtx, ContactFeature, Finding, ProfileLookup, TargetOf } from "@hackbuild/spec";
import { checkError, fmt, intervalEvidence, missing, passOr, skip } from "./common.js";

/** Profile constant holding the contact gap floor, mm. */
export const KEY01_FLOOR_ID = "key.flexGapFloor";
/** Profile constants holding the band ends, fractions of cone height. */
export const KEY01_FRACTION_IDS = { lo: "key.flexGapFracMin", hi: "key.flexGapFracMax" } as const;

/** The contact gap floor in mm, read from profile; a row in another unit or not positive is E_SCHEMA. */
export function key01Floor(profile: Pick<ProfileLookup, "constant">): number {
  const c = profile.constant(KEY01_FLOOR_ID);
  if (c.unit !== "mm" || !Number.isFinite(c.value) || !(c.value > 0)) {
    throw checkError({
      code: "E_SCHEMA", path: `/constants/${c.id}`, got: `${c.value} ${c.unit}`, expected: "a positive length in mm",
      hint: `set profile constant ${c.id} to a positive length in mm`, record: "verification",
    });
  }
  return c.value;
}

/** The band of the rule as fractions of cone height, read from profile; rows outside 0 to 1, in another unit or out of order are E_SCHEMA. */
export function key01Fractions(profile: Pick<ProfileLookup, "constant">): { readonly lo: number; readonly hi: number } {
  const lo = profile.constant(KEY01_FRACTION_IDS.lo);
  const hi = profile.constant(KEY01_FRACTION_IDS.hi);
  for (const c of [lo, hi]) {
    if (c.unit !== "ratio" || !Number.isFinite(c.value) || !(c.value > 0 && c.value <= 1)) {
      throw checkError({
        code: "E_SCHEMA", path: `/constants/${c.id}`, got: `${c.value} ${c.unit}`, expected: "a ratio above 0 and at most 1",
        hint: `set profile constant ${c.id} to a fraction of cone height`, record: "verification",
      });
    }
  }
  if (!(lo.value < hi.value)) {
    throw checkError({
      code: "E_SCHEMA", path: `/constants/${hi.id}`, got: `${lo.value} to ${hi.value}`, expected: `${hi.id} above ${lo.id}`,
      hint: `set ${lo.id} below ${hi.id}`, record: "verification",
    });
  }
  return { lo: lo.value, hi: hi.value };
}

export function key01Interval(coneH: number, floorMm: number, band: { readonly lo: number; readonly hi: number }): readonly [number, number] {
  return [Math.max(floorMm, band.lo * coneH), band.hi * coneH];
}

export function runKey01(target: TargetOf<"feature", "contact">, ctx: Pick<CheckCtx, "profile">): readonly Finding[] {
  const f: ContactFeature = target.feature;
  // A contact with neither travel nor cone (a BLOCKS stud seated in its
  // socket, a pad pair) is no flex key: the rule does not apply, so the
  // check says so (version 2.1.0, M06-T12 step 6). A contact that states one
  // of the two and not the other is a flex key missing a number.
  if (f.gap === undefined && f.coneH === undefined) {
    return [skip({ level: "feature", part: target.part.id, feature: f.id }, "not a flex key", `contact ${f.id} declares no gap and no coneH; the flex cone gap rule reads a key's travel and cone height`)];
  }
  if (f.gap === undefined || !Number.isFinite(f.gap)) throw missing(`/features/${f.id}/gap`, `contact ${f.id} declares no gap; a flex key carries its travel`);
  if (f.coneH === undefined || !Number.isFinite(f.coneH)) throw missing(`/features/${f.id}/coneH`, `contact ${f.id} declares no coneH; a flex key carries its cone height`);
  const floorMm = key01Floor(ctx.profile);
  const band = key01Fractions(ctx.profile);
  const [lo, hi] = key01Interval(f.coneH, floorMm, band);
  const ev = intervalEvidence(f.gap, lo, hi, "mm");
  return [{
    verdict: passOr(ev.inside),
    target: { level: "feature", part: target.part.id, feature: f.id },
    measured: ev.measured,
    legal: ev.legal,
    // The band prints as the profile rows give it, so every number traces to a read (M04-T05).
    constraint: `${fmt(band.lo)} to ${fmt(band.hi)} of cone height ${fmt(f.coneH)}, floor ${fmt(floorMm)}`,
    extra: { coneMm: f.coneH, percentOfCone: Number(fmt((100 * f.gap) / f.coneH, 1)) },
  }];
}

/**
 * The param that moves the gap. A feature bound through Author.bind names it
 * in drivenBy.gap. Otherwise the metric gated by this check pairs with the
 * contact by order among the gap-carrying contacts and must hold the same
 * value; any doubt returns no pointer, so no fix.
 */
export function key01DrivenBy(target: TargetOf<"feature", "contact">): readonly string[] {
  const bound = target.feature.drivenBy?.["gap"];
  if (bound !== undefined) return [bound];
  const contacts = target.part.features.filter((f): f is ContactFeature => f.kind === "contact" && f.gap !== undefined);
  const metrics = target.part.metrics.filter((m) => m.gate === "CHK-KEY-01");
  const i = contacts.findIndex((c) => c.id === target.feature.id);
  const m = metrics[i];
  if (contacts.length !== metrics.length || m === undefined || m.value !== target.feature.gap) return [];
  return m.drivenBy !== undefined && m.drivenBy.length === 1 ? m.drivenBy : [];
}
