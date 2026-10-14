// CHK-NET-13 run body (M05-T19 step 1, CHECKS.md 9.4, D-067): a printed
// conductor runs at most profile constant conductor.maxSlopeDeg against the
// bed plane in print pose. TCB, CHI 2021 measured vertical printed traces
// at about 7x the resistance of flat ones (measured by others); the 45 deg
// line has no coupon (inferred). The seed severity is warn, so a steep run
// reports warn and never blocks an export.
//
// Measured, per conductor: the steepest segment of its centreline, each
// point placed on its face frame (origin + x u + y (normal x u), geom
// faceBasis and placeOnFace), as the
// angle between the segment and the bed plane, deg (computed). A filled
// region (`path`) lies in its face plane, so its steepest line is the face
// tilt. The extrusion `t` along the face normal is the layer stack the
// region prints in; its resistance is the through row the circuit kernel
// prices (M05-T04), and this check does not read it. A region built from a
// mesh hash has no centreline here and is skipped with that reason.

import type { ConductorFeature, Finding, TargetOf, Vec2, Vec3 } from "@hackbuild/spec";
import { faceBasis, placeOnFace } from "@hackbuild/geom";
import type { RegistryCtx } from "../views.js";
import { featureTarget, fmt, intervalEvidence, skip } from "../defs/common.js";

/** Profile constant holding the slope line, deg. */
export const SLOPE_ROW = "conductor.maxSlopeDeg";

const deg = (rad: number): number => (rad * 180) / Math.PI;

/** Angle of a direction against the bed plane z = 0, deg. */
const slopeOf = (d: Vec3): number => deg(Math.atan2(Math.abs(d[2]), Math.hypot(d[0], d[1])));

/** The steepest segment of a conductor in print pose: its slope, deg, and its midpoint, mm. */
export function steepest(f: ConductorFeature): { readonly deg: number; readonly at: Vec3; readonly segment: number | null } | { readonly reason: string } {
  if ("meshHash" in f.region) return { reason: `conductor ${f.id} is a built mesh region; no centreline or face to read a slope from` };
  const face = f.region.face;
  // a non-unit frame is refused (E_SCHEMA), never normalised: the generator placed the copper on this same basis
  const basis = faceBasis(face, `/features/${f.id}/region/face`);
  const place = (p: Vec2): Vec3 => placeOnFace(basis, p);
  if ("path" in f.region) {
    // The steepest line in a plane makes the plane's tilt with the bed: 90 deg less the normal's angle to z.
    const tilt = deg(Math.acos(Math.min(1, Math.abs(basis.normal[2]))));
    const pts = f.region.path.map(place);
    const at: Vec3 = [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k]!, 0) / Math.max(1, pts.length)) as unknown as Vec3;
    return { deg: tilt, at, segment: null };
  }
  const pts = f.region.centreline.map(place);
  let best = { deg: 0, at: pts[0] ?? face.origin, segment: 0 as number | null };
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const s = slopeOf([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    if (i === 0 || s > best.deg) best = { deg: s, at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], segment: i };
  }
  return best;
}

export function runNet13(t: TargetOf<"feature", "conductor">, ctx: RegistryCtx): readonly Finding[] {
  const f = t.feature as ConductorFeature;
  const target = featureTarget(t.part, f);
  if (t.part.frame.pose !== "print") {
    return [skip(target, "not run", `part ${t.part.id} is built in pose ${t.part.frame.pose}; the slope reads print pose against the bed plane`)];
  }
  const s = steepest(f);
  if ("reason" in s) return [skip(target, "not run", s.reason)];
  const line = ctx.profile.constant(SLOPE_ROW);
  const ev = intervalEvidence(s.deg, 0, line.value, line.unit);
  const what = s.segment === null ? `region in a face tilted ${fmt(s.deg, 2)} deg` : `steepest centreline segment ${s.segment} at ${fmt(s.deg, 2)} deg`;
  return [{
    verdict: ev.inside ? "pass" : "fail",
    target: { ...target, at: s.at } as Finding["target"],
    measured: ev.measured, legal: ev.legal,
    constraint: `conductor slope ${fmt(s.deg, 2)} deg, legal 0 to ${fmt(line.value)}, set by ${SLOPE_ROW} (${line.provenance.tier}): ${what} against the bed in print pose; vertical printed traces read about 7x the resistance (TCB at CHI, measured by others)${ev.inside ? "" : "; lay the run flat on one face or price it by the through row"}`,
    extra: { net: f.net, form: s.segment === null ? "region" : "centreline", ...(s.segment === null ? {} : { segment: s.segment }), row: SLOPE_ROW },
  }];
}
